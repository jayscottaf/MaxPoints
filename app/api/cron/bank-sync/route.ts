import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getOwner } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { plaidConfigured } from "@/lib/plaid-client";
import { syncBankConnection } from "@/lib/bank-service";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ""}`);
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  if (
    !process.env.CRON_SECRET ||
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!plaidConfigured()) return NextResponse.json({ skipped: true });
  const owner = await getOwner();
  const connections = await prisma.bankConnection.findMany({
    where: { userId: owner.id, disabledAt: null },
  });
  let synced = 0,
    failed = 0;
  for (const connection of connections) {
    try {
      await syncBankConnection(owner, connection.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return NextResponse.json(
    { synced, failed },
    { status: failed ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
