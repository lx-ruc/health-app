import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'

interface ReminderConfig {
  id?: number
  openid: string
  type: 'daily_habit' | 'weekly_metric'
  time: string
  days_of_week?: string | null
  enabled: number
  subscribe_remaining: number
}

export async function reminderConfigRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    const rows = db
      .prepare('SELECT * FROM reminder_configs WHERE openid = ?')
      .all(openid) as ReminderConfig[]
    return rows
  })

  app.put('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const body = req.body as Partial<ReminderConfig>
    if (!body.type || !body.time) {
      return reply.status(400).send({ error: 'type and time required' })
    }
    if (body.type !== 'daily_habit' && body.type !== 'weekly_metric') {
      return reply.status(400).send({ error: 'invalid type' })
    }

    const db = (app as any).db
    const existing = db
      .prepare('SELECT id FROM reminder_configs WHERE openid = ? AND type = ?')
      .get(openid, body.type)

    if (existing) {
      db.prepare(
        `UPDATE reminder_configs
         SET time = ?, days_of_week = ?, enabled = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(body.time, body.days_of_week ?? null, body.enabled ?? 1, existing.id)
      return { success: true, id: existing.id }
    }

    const r = db
      .prepare(
        `INSERT INTO reminder_configs (openid, type, time, days_of_week, enabled)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(openid, body.type, body.time, body.days_of_week ?? null, body.enabled ?? 1)
    return { success: true, id: r.lastInsertRowid }
  })

  app.post<{ Body: { type: string; count?: number } }>('/subscribe-increment', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { type, count = 1 } = req.body || {}
    if (type !== 'daily_habit' && type !== 'weekly_metric') {
      return reply.status(400).send({ error: 'invalid type' })
    }

    const db = (app as any).db
    // 若该类型还没配置，自动创建一条默认配置（21:00 / 周一），便于授权后立即可用
    const existing = db
      .prepare('SELECT id, subscribe_remaining FROM reminder_configs WHERE openid = ? AND type = ?')
      .get(openid, type) as { id: number; subscribe_remaining: number } | undefined

    if (existing) {
      db.prepare(
        `UPDATE reminder_configs SET subscribe_remaining = subscribe_remaining + ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(count, existing.id)
      return { success: true, remaining: existing.subscribe_remaining + count }
    }

    const defaultTime = type === 'daily_habit' ? '21:00' : '08:00'
    const defaultDays = type === 'weekly_metric' ? '1' : null
    const r = db
      .prepare(
        `INSERT INTO reminder_configs (openid, type, time, days_of_week, enabled, subscribe_remaining)
         VALUES (?, ?, ?, ?, 1, ?)`,
      )
      .run(openid, type, defaultTime, defaultDays, count)
    return { success: true, id: r.lastInsertRowid, remaining: count }
  })
}
