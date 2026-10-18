import test from "node:test";
import assert from "node:assert/strict";
import { matchBankCredit } from "../lib/bank-matching";
import { encryptBankToken, decryptBankToken } from "../lib/plaid-client";
const perks = [
  {
    id: "q3",
    name: "Resy Dining Credit Q3",
    periodType: "quarterly",
    maxValue: 100,
    startDate: "2026-07-01",
    endDate: "2026-09-30",
  },
  {
    id: "q4",
    name: "Resy Dining Credit Q4",
    periodType: "quarterly",
    maxValue: 100,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
  },
];
const credit = {
  description: "AMEX RESY DINING CREDIT",
  amountCents: -4500,
  date: "2026-10-10",
  pending: false,
  currency: "USD",
};
test("statement-credit matching proposes the current or recently ended purchase period", () => {
  assert.deepEqual(matchBankCredit(credit, perks), ["q3", "q4"]);
  assert.deepEqual(matchBankCredit({ ...credit, date: "2026-12-10" }, perks), [
    "q4",
  ]);
  assert.deepEqual(
    matchBankCredit(
      credit,
      perks.map((p) => ({ ...p, retired: true })),
    ),
    [],
  );
  assert.deepEqual(
    matchBankCredit(
      credit,
      perks.map((p) => ({ ...p, requiresConfirmation: true })),
    ),
    [],
  );
});
test("purchases, payments, refunds, pending credits and foreign currency do not become usage suggestions", () => {
  for (const overrides of [
    { amountCents: 4500 },
    { pending: true },
    { removed: true },
    { currency: "EUR" },
    { description: "RESY RESTAURANT" },
    { description: "RESY REFUND CREDIT" },
    { description: "AUTOPAY PAYMENT CREDIT RESY" },
  ])
    assert.deepEqual(matchBankCredit({ ...credit, ...overrides }, perks), []);
});
test("bank tokens use authenticated encryption and never survive tampering", () => {
  const previous = process.env.PLAID_TOKEN_ENCRYPTION_KEY;
  process.env.PLAID_TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  try {
    const encrypted = encryptBankToken("access-production-fixture");
    assert.notEqual(encrypted, encryptBankToken("access-production-fixture"));
    assert.equal(decryptBankToken(encrypted), "access-production-fixture");
    const bytes = Buffer.from(encrypted, "base64");
    bytes[15] ^= 1;
    assert.throws(() => decryptBankToken(bytes.toString("base64")));
    process.env.PLAID_TOKEN_ENCRYPTION_KEY = "b".repeat(64);
    assert.throws(() => decryptBankToken(encrypted));
  } finally {
    if (previous === undefined) delete process.env.PLAID_TOKEN_ENCRYPTION_KEY;
    else process.env.PLAID_TOKEN_ENCRYPTION_KEY = previous;
  }
});
