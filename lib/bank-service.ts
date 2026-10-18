import { Prisma } from "@prisma/client";
import {
  CountryCode,
  CreditAccountSubtype,
  Products,
  type Transaction,
  type RemovedTransaction,
} from "plaid";
import { prisma } from "./prisma";
import {
  plaidClient,
  plaidEnvironment,
  encryptBankToken,
  decryptBankToken,
} from "./plaid-client";
import { matchBankCredit } from "./bank-matching";
import { createUsageInTransaction, UsageError } from "./usage-service";
import { cents, usageDate } from "./accounting";

type Owner = { id: string; timezone: string };
export class BankError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function connectionLock(tx: Prisma.TransactionClient, id: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"bank:" + id}, 0))`;
}
function appUrl() {
  const url = new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://mxpoints.vercel.app",
  );
  if (
    url.protocol !== "https:" &&
    !(plaidEnvironment() === "sandbox" && url.hostname === "localhost")
  )
    throw new BankError("A secure application URL is required.");
  return url.origin;
}

export async function createBankLink(owner: Owner) {
  const recent = await prisma.bankLinkSession.count({
    where: {
      userId: owner.id,
      createdAt: { gt: new Date(Date.now() - 3600000) },
    },
  });
  if (recent >= 10)
    throw new BankError(
      "Please wait before starting another bank connection.",
      429,
    );
  const response = await plaidClient().linkTokenCreate({
    user: { client_user_id: owner.id },
    client_name: "MaxPoints",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
    redirect_uri: appUrl() + "/bank-link",
    account_filters: {
      credit: { account_subtypes: [CreditAccountSubtype.CreditCard] },
    },
    transactions: { days_requested: 90 },
  });
  const session = await prisma.bankLinkSession.create({
    data: {
      userId: owner.id,
      encryptedToken: encryptBankToken(response.data.link_token),
      expiresAt: new Date(response.data.expiration),
    },
  });
  return { sessionId: session.id, token: response.data.link_token };
}

export async function exchangeBankLink(
  owner: Owner,
  sessionId: string,
  publicToken: string,
) {
  return prisma.$transaction(
    async (tx) => {
      await connectionLock(tx, owner.id + ":link");
      const session = await tx.bankLinkSession.findFirst({
        where: {
          id: sessionId,
          userId: owner.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!session)
        throw new BankError("This connection session expired. Start again.");
      const client = plaidClient();
      const exchanged = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });
      const access = exchanged.data.access_token;
      let saved = false;
      try {
        const { data } = await client.accountsGet({ access_token: access });
        if (!data.item.institution_id)
          throw new BankError("The bank could not be verified.");
        const institution = (
          await client.institutionsGetById({
            institution_id: data.item.institution_id,
            country_codes: [CountryCode.Us],
          })
        ).data.institution;
        if (!/american express|chase/i.test(institution.name))
          throw new BankError(
            "Choose American Express or Chase for these cards.",
          );
        const existing = await tx.bankConnection.findFirst({
          where: {
            userId: owner.id,
            institutionId: institution.institution_id,
            disabledAt: null,
          },
        });
        if (existing)
          throw new BankError(
            "This bank is already connected. Use its existing connection.",
          );
        const accounts = data.accounts.filter(
          (account) =>
            account.type === "credit" && account.subtype === "credit card",
        );
        if (!accounts.length)
          throw new BankError("No supported credit card accounts were shared.");
        await tx.bankConnection.create({
          data: {
            userId: owner.id,
            itemId: exchanged.data.item_id,
            institutionId: institution.institution_id,
            name: institution.name,
            environment: plaidEnvironment(),
            encryptedToken: encryptBankToken(access),
            accounts: {
              create: accounts.map((account) => ({
                accountId: account.account_id,
                name: account.official_name || account.name,
                mask: account.mask,
              })),
            },
          },
        });
        await tx.bankLinkSession.update({
          where: { id: session.id },
          data: { usedAt: new Date(), encryptedToken: "" },
        });
        saved = true;
        return { ok: true };
      } finally {
        const retained = await tx.bankConnection.findUnique({ where: { itemId: exchanged.data.item_id } });
        if (!saved && !retained)
          await client
            .itemRemove({ access_token: access })
            .catch(() => undefined);
      }
    },
    { timeout: 60000 },
  );
}

export async function mapBankAccount(
  owner: Owner,
  id: string,
  cardId: string | null,
) {
  return prisma.$transaction(
    async (tx) => {
      const account = await tx.bankAccount.findFirst({
        where: { id, connection: { userId: owner.id, disabledAt: null } },
        include: { connection: true },
      });
      if (!account) throw new BankError("Account not found.", 404);
      await connectionLock(tx, account.connectionId);
      if (account.cardId === cardId) return;
      if (
        await tx.bankTransaction.count({
          where: { accountId: id, usageId: { not: null } },
        })
      )
        throw new BankError(
          "This account has approved usage. Disconnect before changing its card assignment.",
        );
      if (cardId) {
        const card = await tx.card.findFirst({
          where: {
            id: cardId,
            userCards: { some: { userId: owner.id, isActive: true } },
          },
        });
        if (!card) throw new BankError("Card not found.", 404);
        const amex = /american express/i.test(account.connection.name);
        if (
          amex !== /american express|amex/i.test(card.issuer + " " + card.name)
        )
          throw new BankError("The selected card belongs to a different bank.");
        if (
          await tx.bankAccount.count({
            where: {
              cardId,
              id: { not: id },
              connection: { userId: owner.id, disabledAt: null },
            },
          })
        )
          throw new BankError(
            "That card is already assigned to another bank account.",
          );
      }
      await tx.bankAccount.update({ where: { id }, data: { cardId } });
      await tx.bankTransaction.updateMany({
        where: { accountId: id, usageId: null },
        data: { status: "unmatched", candidatePerkIds: [] },
      });
      await tx.bankConnection.update({
        where: { id: account.connectionId },
        data: { cursor: null },
      });
    },
    { timeout: 15000 },
  );
}

export async function syncBankConnection(
  owner: Owner,
  id: string,
  client = plaidClient(),
) {
  const connection = await prisma.bankConnection.findFirst({
    where: { id, userId: owner.id, disabledAt: null },
    include: { accounts: true },
  });
  if (!connection?.encryptedToken)
    throw new BankError("Connection not found.", 404);
  if (connection.environment !== plaidEnvironment())
    throw new BankError(
      "This connection belongs to a different Plaid environment.",
    );
  if (!connection.accounts.some((account) => account.cardId))
    return { suggestions: 0 };
  const access = decryptBankToken(connection.encryptedToken);
  let added: Transaction[] = [],
    removed: RemovedTransaction[] = [],
    cursor = connection.cursor || undefined;
  try {
    // Discard the entire staged update if Plaid changes a paginated batch.
    for (let attempt = 0; ; attempt++) {
      added = [];
      removed = [];
      cursor = connection.cursor || undefined;
      try {
        for (let page = 0; ; page++) {
          if (page >= 25)
            throw new BankError("Too much history for one sync. Please retry.");
          const { data } = await client.transactionsSync({
            access_token: access,
            cursor,
            count: 500,
          });
          added.push(...data.added, ...data.modified);
          removed.push(...data.removed);
          cursor = data.next_cursor;
          if (!data.has_more) break;
        }
        break;
      } catch (error) {
        const code = (
          error as { response?: { data?: { error_code?: string } } }
        ).response?.data?.error_code;
        if (
          code !== "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" ||
          attempt >= 2
        )
          throw error;
      }
    }
    return await prisma.$transaction(
      async (tx) => {
        await connectionLock(tx, id);
        const fresh = await tx.bankConnection.findUniqueOrThrow({
          where: { id },
        });
        if (fresh.disabledAt || fresh.cursor !== connection.cursor)
          throw new BankError(
            "Another sync finished first. Refresh and retry.",
            409,
          );
        const accounts = await tx.bankAccount.findMany({
          where: { connectionId: id },
        });
        const perks = await tx.perk.findMany({
          where: {
            cardId: {
              in: accounts.flatMap((a) => (a.cardId ? [a.cardId] : [])),
            },
            card: { userCards: { some: { userId: owner.id, isActive: true } } },
          },
        });
        let suggestions = 0;
        const latest = new Map(
          added.map((transaction) => [transaction.transaction_id, transaction]),
        );
        for (const transaction of latest.values()) {
          const account = accounts.find(
            (account) => account.accountId === transaction.account_id,
          );
          if (!account?.cardId) continue;
          const description =
            transaction.original_description || transaction.name;
          const values = {
            description,
            amountCents: cents(transaction.amount),
            date: transaction.date,
            pending: transaction.pending,
            currency: transaction.iso_currency_code,
            removed: false,
          };
          const candidates = matchBankCredit(
            values,
            perks.filter((perk) => perk.cardId === account.cardId),
          );
          const previous = await tx.bankTransaction.findUnique({
            where: { transactionId: transaction.transaction_id },
          });
          if (previous && previous.connectionId !== id)
            throw new BankError("Transaction ownership mismatch.");
          if (!previous && !candidates.length) continue;
          const changed =
            previous &&
            (previous.description !== description ||
              previous.amountCents !== values.amountCents ||
              previous.date !== values.date ||
              previous.pending !== values.pending ||
              previous.removed ||
              previous.accountId !== account.id);
          const status = previous?.usageId
            ? changed || !candidates.length
              ? "review"
              : previous.status
            : changed || !previous || previous.status === "unmatched"
              ? candidates.length
                ? "pending"
                : "unmatched"
              : previous.status;
          await tx.bankTransaction.upsert({
            where: { transactionId: transaction.transaction_id },
            create: {
              ...values,
              connectionId: id,
              accountId: account.id,
              transactionId: transaction.transaction_id,
              candidatePerkIds: candidates,
              status,
            },
            update: {
              ...values,
              accountId: account.id,
              candidatePerkIds: candidates,
              status,
            },
          });
          if (status === "pending") suggestions++;
        }
        for (const transaction of removed) {
          const previous = await tx.bankTransaction.findFirst({
            where: {
              transactionId: transaction.transaction_id,
              connectionId: id,
            },
          });
          if (previous)
            await tx.bankTransaction.update({
              where: { id: previous.id },
              data: {
                removed: true,
                status: previous.usageId ? "review" : "removed",
              },
            });
        }
        await tx.bankConnection.update({
          where: { id },
          data: { cursor, lastSyncedAt: new Date(), lastError: null },
        });
        return { suggestions };
      },
      { timeout: 60000 },
    );
  } catch (error) {
    await prisma.bankConnection.updateMany({
      where: { id, userId: owner.id, disabledAt: null },
      data: {
        lastError:
          "Sync could not finish. Try again; reconnect if your bank requires authorization.",
      },
    });
    throw error;
  }
}

export async function approveBankCredit(
  owner: Owner,
  id: string,
  perkId: string,
  date: string,
  amount: number,
  acknowledgeDuplicate = false,
) {
  return prisma.$transaction(
    async (tx) => {
      const initial = await tx.bankTransaction.findFirst({
        where: { id, connection: { userId: owner.id } },
      });
      if (!initial) throw new BankError("Suggestion not found.", 404);
      await connectionLock(tx, initial.connectionId);
      const entry = await tx.bankTransaction.findUniqueOrThrow({
        where: { id },
        include: { account: true, connection: true },
      });
      if (entry.status === "approved")
        return { ok: true, usageId: entry.usageId };
      if (
        entry.status !== "pending" ||
        entry.removed ||
        entry.pending ||
        entry.connection.disabledAt ||
        entry.amountCents >= 0
      )
        throw new BankError(
          "This suggestion is no longer available. Refresh the list.",
        );
      if (
        !entry.candidatePerkIds.includes(perkId) ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        cents(amount) > -entry.amountCents
      )
        throw new BankError(
          "Choose a proposed benefit and an amount within the posted credit.",
        );
      const perk = await tx.perk.findFirst({
        where: { id: perkId, cardId: entry.account.cardId || "" },
      });
      if (!perk)
        throw new BankError(
          "The card assignment changed. Refresh before approving.",
        );
      const normalizedDate = usageDate(date, owner.timezone);
      if (!acknowledgeDuplicate) {
        const similar = await tx.usage.findFirst({
          where: {
            userId: owner.id,
            perkId,
            deletedAt: null,
            amount,
            date: {
              gte: new Date(+normalizedDate - 31 * 86400000),
              lte: new Date(+normalizedDate + 31 * 86400000),
            },
          },
        });
        if (similar)
          throw new BankError(
            "A matching amount is already recorded near this date. Check history, then confirm only if this is a different use.",
            409,
          );
      }
      const usage = await createUsageInTransaction(tx, owner, {
        perkId,
        amount,
        date,
        notes: `Approved bank credit: ${entry.description}. Posted ${entry.date}.`,
        idempotencyKey: `plaid:${entry.id}`,
      });
      await tx.bankTransaction.update({
        where: { id },
        data: { status: "approved", usageId: usage.id },
      });
      return { ok: true, usageId: usage.id };
    },
    { timeout: 15000 },
  );
}

export async function disconnectBank(owner: Owner, id: string) {
  return prisma.$transaction(
    async (tx) => {
      await connectionLock(tx, id);
      const connection = await tx.bankConnection.findFirst({
        where: { id, userId: owner.id },
      });
      if (!connection) throw new BankError("Connection not found.", 404);
      if (!connection.disabledAt && connection.encryptedToken) {
        if (connection.environment !== plaidEnvironment())
          throw new BankError(
            "Switch to this connection's environment before disconnecting.",
          );
        await plaidClient().itemRemove({
          access_token: decryptBankToken(connection.encryptedToken),
        });
      }
      await tx.bankConnection.update({
        where: { id },
        data: { encryptedToken: null, disabledAt: new Date(), lastError: null },
      });
      await tx.bankTransaction.updateMany({
        where: { connectionId: id, status: "pending" },
        data: { status: "dismissed" },
      });
      return { ok: true };
    },
    { timeout: 30000 },
  );
}

export { UsageError };
