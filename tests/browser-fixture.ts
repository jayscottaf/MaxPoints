// Local-only authenticated UI fixture. Never expose this proxy beyond loopback.
import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { createServer, request } from 'node:http'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { digest, newToken } from '../lib/auth-policy'

loadEnvConfig(process.cwd())
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.create({ data: { email: `browser-${randomUUID()}@example.invalid` } })
  const card = await prisma.card.create({ data: { name: 'Browser Test Platinum', issuer: 'Test Issuer', annualFee: 100, perks: { create: { name: 'Test Dining Credit', periodType: 'annual', maxValue: 100 } }, userCards: { create: { userId: user.id, last4: '1234' } } }, include: { perks: true } })
  const token = newToken()
  await prisma.session.create({ data: { tokenHash: digest(token), userId: user.id, expiresAt: new Date(Date.now() + 3600000) } })
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', '3104', '--hostname', '127.0.0.1'], { env: { ...process.env, OWNER_EMAIL: user.email, OWNER_USER_ID: user.id }, stdio: ['ignore', 'inherit', 'inherit'] })
  const server = createServer((req, res) => {
    const upstream = request({ hostname: '127.0.0.1', port: 3104, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost:3104', origin: 'http://localhost:3104', cookie: `maxpoints_session=${token}` } }, response => {
      const headers = { ...response.headers }
      delete headers['set-cookie']
      res.writeHead(response.statusCode || 502, headers)
      response.pipe(res)
    })
    upstream.on('error', () => { res.writeHead(502); res.end('Fixture starting. Retry.') })
    req.pipe(upstream)
  })
  server.listen(3105, '127.0.0.1', () => console.log('Disposable UI fixture: http://127.0.0.1:3105'))
  let stopping = false
  const cleanup = async () => {
    if (stopping) return
    stopping = true
    server.close()
    child.kill('SIGTERM')
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: user.id } }), prisma.usage.deleteMany({ where: { userId: user.id } }),
      prisma.userCard.deleteMany({ where: { userId: user.id } }), prisma.perk.deleteMany({ where: { cardId: card.id } }),
      prisma.card.delete({ where: { id: card.id } }), prisma.user.delete({ where: { id: user.id } }),
    ])
    await prisma.$disconnect()
    console.log('Disposable fixture removed.')
    process.exit(0)
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  child.on('exit', cleanup)
}
main().catch(error => { console.error(error); process.exit(1) })
