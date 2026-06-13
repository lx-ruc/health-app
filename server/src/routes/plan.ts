import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'

export async function planRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { week_start } = req.query as { week_start?: string }
    const db = (app as any).db

    const weekStart = week_start || computeNextMonday()
    const plans = db
      .prepare('SELECT * FROM plans WHERE openid = ? AND week_start = ? ORDER BY id DESC')
      .all(openid, weekStart)
    return plans
  })

  app.post('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const body = req.body as {
      week_start?: string
      items: { category: string; title: string; detail?: string }[]
    }
    if (!body.items?.length) {
      return reply.status(400).send({ error: 'items required' })
    }

    const db = (app as any).db
    const weekStart = body.week_start || computeNextMonday()
    const insert = db.prepare(
      `INSERT INTO plans (openid, week_start, category, title, detail, source)
       VALUES (?, ?, ?, ?, ?, 'ai')
       ON CONFLICT(openid, week_start, title) DO NOTHING`,
    )
    const tx = db.transaction((items: typeof body.items) => {
      let inserted = 0
      for (const it of items) {
        const r = insert.run(openid, weekStart, it.category, it.title, it.detail || null)
        if (r.changes > 0) inserted++
      }
      return inserted
    })
    const inserted = tx(body.items)
    return { success: true, inserted, total: body.items.length }
  })

  app.patch<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    const existing = db.prepare('SELECT done FROM plans WHERE id = ? AND openid = ?').get(req.params.id, openid)
    if (!existing) return reply.status(404).send({ error: 'not found' })

    db.prepare('UPDATE plans SET done = ? WHERE id = ?').run(existing.done ? 0 : 1, req.params.id)
    return { success: true }
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    db.prepare('DELETE FROM plans WHERE id = ? AND openid = ?').run(req.params.id, openid)
    return { success: true }
  })
}

function computeNextMonday(): string {
  const d = new Date()
  const day = d.getDay() || 7 // Sunday=7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1 + 7)
  return monday.toISOString().slice(0, 10)
}
