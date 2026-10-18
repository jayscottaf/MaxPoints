import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import type { Transaction } from "plaid";
loadEnvConfig(process.cwd());

test(
  "bank sync is staged, review-only, idempotent, owner-scoped and retains changed-credit history",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const { prisma } = await import("../lib/prisma");
    const { syncBankConnection, approveBankCredit, mapBankAccount } =
      await import("../lib/bank-service");
    const { encryptBankToken } = await import("../lib/plaid-client");
    const { calendarDate } = await import("../lib/accounting");
    const oldKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY,
      oldEnv = process.env.PLAID_ENV;
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    process.env.PLAID_ENV = "sandbox";
    const user = await prisma.user.create({
      data: { email: `bank-${randomUUID()}@example.invalid` },
    });
    const owner = { id: user.id, timezone: "America/New_York" };
    const card = await prisma.card.create({
      data: {
        name: "Bank Test",
        issuer: "American Express",
        annualFee: 0,
        userCards: { create: { userId: owner.id } },
        perks: {
          create: {
            name: "Resy Dining Credit",
            maxValue: 100,
            periodType: "annual",
          },
        },
      },
      include: { perks: true },
    });
    const connection = await prisma.bankConnection.create({
      data: {
        userId: owner.id,
        itemId: randomUUID(),
        institutionId: "test",
        name: "American Express",
        environment: "sandbox",
        encryptedToken: encryptBankToken("fixture-token"),
        accounts: {
          create: {
            accountId: randomUUID(),
            name: "Test account",
            cardId: card.id,
          },
        },
      },
      include: { accounts: true },
    });
    const account = connection.accounts[0];
    const transaction = {
      transaction_id: randomUUID(),
      account_id: account.accountId,
      name: "RESY BENEFIT CREDIT",
      amount: -40,
      date: calendarDate(),
      iso_currency_code: "USD",
      pending: false,
    } as Transaction;
    const response = (
      added: Transaction[],
      next_cursor: string,
      removed: { transaction_id: string }[] = [],
      has_more = false,
    ) => ({ data: { added, modified: [], removed, next_cursor, has_more } });
    const client = (send: (input: { cursor?: string }) => unknown) =>
      ({ transactionsSync: send }) as unknown as Parameters<
        typeof syncBankConnection
      >[2];
    try {
      let calls = 0;
      const seen: (string | undefined)[] = [];
      await syncBankConnection(
        owner,
        connection.id,
        client(async (input) => {
          seen.push(input.cursor);
          calls++;
          if (calls === 1) return response([transaction], "partial", [], true);
          if (calls === 2)
            throw {
              response: {
                data: {
                  error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION",
                },
              },
            };
          return response([transaction], "done");
        }),
      );
      assert.deepEqual(seen, [undefined, "partial", undefined]);
      assert.equal(
        await prisma.usage.count({ where: { userId: owner.id } }),
        0,
      );
      const suggestion = await prisma.bankTransaction.findUniqueOrThrow({
        where: { transactionId: transaction.transaction_id },
      });
      assert.equal(suggestion.status, "pending");
      assert.deepEqual(suggestion.candidatePerkIds, [card.perks[0].id]);
      await assert.rejects(
        approveBankCredit(
          { ...owner, id: "different-owner" },
          suggestion.id,
          card.perks[0].id,
          transaction.date,
          40,
        ),
        /not found/,
      );
      await assert.rejects(
        approveBankCredit(
          owner,
          suggestion.id,
          card.perks[0].id,
          transaction.date,
          41,
        ),
        /within the posted credit/,
      );
      await Promise.all([
        approveBankCredit(
          owner,
          suggestion.id,
          card.perks[0].id,
          transaction.date,
          40,
        ),
        approveBankCredit(
          owner,
          suggestion.id,
          card.perks[0].id,
          transaction.date,
          40,
        ),
      ]);
      assert.equal(
        await prisma.usage.count({ where: { userId: owner.id } }),
        1,
      );
      await assert.rejects(
        mapBankAccount(owner, account.id, null),
        /approved usage/,
      );
      await syncBankConnection(
        owner,
        connection.id,
        client(async () => response([transaction], "duplicate")),
      );
      assert.equal(
        await prisma.bankTransaction.count({
          where: { connectionId: connection.id },
        }),
        1,
      );
      assert.equal(
        await prisma.usage.count({ where: { userId: owner.id } }),
        1,
      );
      await syncBankConnection(
        owner,
        connection.id,
        client(async () =>
          response([{ ...transaction, amount: -30 }], "changed"),
        ),
      );
      assert.equal(
        (
          await prisma.bankTransaction.findUniqueOrThrow({
            where: { id: suggestion.id },
          })
        ).status,
        "review",
      );
      assert.equal(
        (await prisma.usage.findFirstOrThrow({ where: { userId: owner.id } }))
          .amount,
        40,
      );
      await syncBankConnection(
        owner,
        connection.id,
        client(async () =>
          response([], "removed", [
            { transaction_id: transaction.transaction_id },
          ]),
        ),
      );
      assert.equal(
        (
          await prisma.bankTransaction.findUniqueOrThrow({
            where: { id: suggestion.id },
          })
        ).removed,
        true,
      );
      assert.equal(
        (await prisma.usage.findFirstOrThrow({ where: { userId: owner.id } }))
          .amount,
        40,
      );
      await assert.rejects(
        syncBankConnection(
          owner,
          connection.id,
          client(async () => {
            throw new Error("offline");
          }),
        ),
      );
      assert.equal(
        (
          await prisma.bankConnection.findUniqueOrThrow({
            where: { id: connection.id },
          })
        ).cursor,
        "removed",
      );
    } finally {
      await prisma.bankTransaction.deleteMany({
        where: { connectionId: connection.id },
      });
      await prisma.bankAccount.deleteMany({
        where: { connectionId: connection.id },
      });
      await prisma.bankConnection.delete({ where: { id: connection.id } });
      await prisma.usage.deleteMany({ where: { userId: owner.id } });
      await prisma.userCard.deleteMany({ where: { userId: owner.id } });
      await prisma.perk.deleteMany({ where: { cardId: card.id } });
      await prisma.card.delete({ where: { id: card.id } });
      await prisma.user.delete({ where: { id: owner.id } });
      await prisma.$disconnect();
      if (oldKey === undefined) delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
      else process.env.PLAID_TOKEN_ENCRYPTION_KEY = oldKey;
      if (oldEnv === undefined) delete process.env.PLAID_ENV;
      else process.env.PLAID_ENV = oldEnv;
    }
  },
);
