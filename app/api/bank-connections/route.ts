import { NextResponse } from "next/server";
import { z } from "zod";
import { withOwner, getOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { plaidConfigured, plaidEnvironment } from "@/lib/plaid-client";
import {
  approveBankCredit,
  createBankLink,
  exchangeBankLink,
  mapBankAccount,
  syncBankConnection,
  disconnectBank,
  BankError,
  UsageError,
  setRepeatApproval,
  undoBankApproval,
} from "@/lib/bank-service";
export const runtime = "nodejs";
export const maxDuration = 120;

export const GET = withOwner(async () => {
  const owner = await getOwner();
  const [connections, suggestions, cards, repeatRules] = await Promise.all([
    prisma.bankConnection.findMany({
      where: { userId: owner.id, disabledAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        environment: true,
        lastSyncedAt: true,
        lastError: true,
        accounts: {
          select: { id: true, name: true, mask: true, cardId: true },
        },
      },
    }),
    prisma.bankTransaction.findMany({
      where: {
        connection: { userId: owner.id },
        status: { in: ["pending", "review", "approved", "dismissed", "undone"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        description: true,
        date: true,
        amountCents: true,
        status: true,
        candidatePerkIds: true,
        usageId: true,
        repeatEnabledAt: true,
        autoApproved: true,
        account: { select: { name: true, mask: true, cardId: true } },
      },
    }),
    prisma.card.findMany({
      where: { userCards: { some: { userId: owner.id, isActive: true } } },
      select: {
        id: true,
        name: true,
        issuer: true,
        perks: { select: { id: true, name: true, periodType: true } },
      },
    }),
    prisma.bankTransaction.findMany({
      where: { connection: { userId: owner.id, disabledAt: null }, repeatEnabledAt: { not: null } },
      select: { id: true, description: true, amountCents: true },
      orderBy: { repeatEnabledAt: 'desc' },
    }),
  ]);
  return NextResponse.json({
    configured: plaidConfigured(),
    environment: plaidEnvironment(),
    connections,
    suggestions,
    cards,
    repeatRules,
  });
});

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("link") }).strict(),
  z
    .object({
      action: z.literal("exchange"),
      sessionId: z.string().min(1).max(200),
      publicToken: z.string().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      action: z.literal("map"),
      id: z.string(),
      cardId: z.string().nullable(),
    })
    .strict(),
  z.object({ action: z.literal("sync"), id: z.string(), rescan: z.boolean().optional() }).strict(),
  z.object({ action: z.literal("disconnect"), id: z.string() }).strict(),
  z.object({ action: z.literal("repeat"), id: z.string(), enabled: z.boolean() }).strict(),
  z.object({ action: z.literal("undo"), id: z.string() }).strict(),
  z
    .object({
      action: z.literal("dismiss"),
      id: z.string(),
      dismissed: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      id: z.string(),
      perkId: z.string(),
      date: z.string(),
      amount: z.number(),
      acknowledgeDuplicate: z.boolean().optional(),
    })
    .strict(),
]);
export const POST = withOwner(async (request) => {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid bank connection request." },
      { status: 400 },
    );
  const owner = await getOwner(),
    data = parsed.data;
  try {
    if (
      ["link", "exchange", "sync", "disconnect"].includes(data.action) &&
      !plaidConfigured()
    )
      throw new BankError("Plaid setup is not complete yet.", 503);
    switch (data.action) {
      case "repeat":
        return NextResponse.json(await setRepeatApproval(owner, data.id, data.enabled));
      case "undo":
        return NextResponse.json(await undoBankApproval(owner, data.id));
      case "link":
        return NextResponse.json(await createBankLink(owner));
      case "exchange":
        return NextResponse.json(
          await exchangeBankLink(owner, data.sessionId, data.publicToken),
        );
      case "map":
        await mapBankAccount(owner, data.id, data.cardId);
        break;
      case "sync":
        return NextResponse.json(await syncBankConnection(owner, data.id, undefined, data.rescan));
      case "disconnect":
        return NextResponse.json(await disconnectBank(owner, data.id));
      case "approve":
        return NextResponse.json(
          await approveBankCredit(
            owner,
            data.id,
            data.perkId,
            data.date,
            data.amount,
            data.acknowledgeDuplicate,
          ),
        );
      case "dismiss": {
        const result = await prisma.bankTransaction.updateMany({
          where: {
            id: data.id,
            connection: { userId: owner.id, disabledAt: null },
            status: data.dismissed ? "pending" : "dismissed",
            removed: false,
            usageId: null,
          },
          data: { status: data.dismissed ? "dismissed" : "pending" },
        });
        if (!result.count)
          throw new BankError("This suggestion is no longer available.", 409);
        break;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BankError || error instanceof UsageError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    console.error("Bank operation failed:", data.action);
    return NextResponse.json(
      {
        error:
          "The bank connection could not finish. Please retry or check your Plaid setup.",
      },
      { status: 503 },
    );
  }
});
