// Local-only authenticated UI fixture. Never expose this proxy beyond loopback.
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { createServer, request } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { digest, newToken } from "../lib/auth-policy";

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.create({
    data: { email: `browser-${randomUUID()}@example.invalid` },
  });
  const card = await prisma.card.create({
    data: {
      name: "Browser Test Platinum",
      issuer: "Test Issuer",
      annualFee: 100,
      perks: {
        create: {
          name: "Test Dining Credit",
          periodType: "annual",
          maxValue: 100,
        },
      },
      userCards: { create: { userId: user.id, last4: "1234" } },
    },
    include: { perks: true },
  });
  const cardIds = [card.id];
  if (process.env.TERMS_FIXTURE === '1') {
    await prisma.perk.createMany({ data: [
      { cardId: card.id, name: 'Retired test credit', maxValue: 50, periodType: 'annual', retired: true },
      { cardId: card.id, name: 'Anniversary test credit', maxValue: 300, periodType: 'anniversary' },
      { cardId: card.id, name: 'Booking test credit', maxValue: 100, perUseLimit: 100, periodType: 'per-booking' },
      { cardId: card.id, name: 'The Edit test credit', maxValue: 500, perUseLimit: 250, periodType: 'annual' },
    ] });
  }
  if (process.env.DESIGN_FIXTURE === "1") {
    await prisma.card.update({
      where: { id: card.id },
      data: {
        name: "Amex Platinum",
        issuer: "American Express",
        annualFee: 895,
      },
    });
    for (const [name, issuer, annualFee, last4] of [
      ["Amex Hilton Aspire", "American Express", 550, "1003"],
      ["Chase Sapphire Reserve", "Chase", 795, "8294"],
    ] as const) {
      const extra = await prisma.card.create({
        data: {
          name,
          issuer,
          annualFee,
          userCards: { create: { userId: user.id, last4 } },
        },
      });
      cardIds.push(extra.id);
    }
    for (const [index, cardId] of cardIds.entries()) {
      const names =
        index === 0
          ? [
              "Digital Entertainment Credit",
              "Hotel Credit",
              "Lululemon Credit Q3",
              "Uber Cash",
              "Walmart+ Membership",
            ]
          : index === 1
            ? [
                "Flight Credit",
                "Hilton Resort Credit",
                "Free Night Award",
                "CLEAR Plus",
                "Dining Credit",
              ]
            : [
                "DoorDash Credits",
                "The Edit Hotel Credit",
                "Dining Credit",
                "Annual Travel Credit",
                "Apple TV",
              ];
      for (const [i, name] of names.entries()) {
        const perk = await prisma.perk.create({
          data: {
            cardId,
            name,
            maxValue: i === 1 ? 600 : i === 3 ? 300 : 150,
            periodValue: i === 1 ? 300 : i === 3 ? null : 12.5,
            periodType:
              i === 1 ? "semi-annual" : i === 3 ? "annual" : "monthly",
            category: [
              "entertainment",
              "travel",
              "shopping",
              "travel",
              "dining",
            ][i],
            enrollmentRequired: i === 1,
          },
        });
        if (i === 1 || i === 3)
          await prisma.usage.create({
            data: {
              userId: user.id,
              perkId: perk.id,
              amount: i === 1 ? 300 : 150,
              date: new Date(),
              needsReview: index === 2 && i === 3,
            },
          });
      }
    }
  }
  const token = newToken();
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "suggestion",
      title: "Test usage suggestion",
      message:
        "Disposable review item: used $10 of a dining credit. No usage was written by automation.",
      metadata: { kind: "usage" },
    },
  });
  await prisma.session.create({
    data: {
      tokenHash: digest(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--port",
      "3104",
      "--hostname",
      "127.0.0.1",
    ],
    {
      env: { ...process.env, OWNER_EMAIL: user.email, OWNER_USER_ID: user.id },
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  const server = createServer((req, res) => {
    const upstream = request(
      {
        hostname: "127.0.0.1",
        port: 3104,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          host: "localhost:3104",
          origin: "http://localhost:3104",
          cookie: `maxpoints_session=${token}`,
        },
      },
      (response) => {
        const headers = { ...response.headers };
        delete headers["set-cookie"];
        res.writeHead(response.statusCode || 502, headers);
        response.pipe(res);
      },
    );
    upstream.on("error", () => {
      res.writeHead(502);
      res.end("Fixture starting. Retry.");
    });
    req.pipe(upstream);
  });
  server.listen(3105, "127.0.0.1", () =>
    console.log("Disposable UI fixture: http://127.0.0.1:3105"),
  );
  let stopping = false;
  const cleanup = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    child.kill("SIGTERM");
    await prisma.$transaction([
      prisma.perkRevision.deleteMany({ where: { userId: user.id } }),
      prisma.emailDelivery.deleteMany({ where: { userId: user.id } }),
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.usage.deleteMany({ where: { userId: user.id } }),
      prisma.userCard.deleteMany({ where: { userId: user.id } }),
      prisma.perk.deleteMany({ where: { cardId: { in: cardIds } } }),
      prisma.card.deleteMany({ where: { id: { in: cardIds } } }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);
    await prisma.$disconnect();
    console.log("Disposable fixture removed.");
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  child.on("exit", cleanup);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
