import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'

export async function metricRoutes(app: FastifyInstance) {
  app.get('/config', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    const row = db.prepare('SELECT metrics FROM metric_configs WHERE openid = ?').get(openid)
    return { metrics: row ? JSON.parse(row.metrics) : [] }
  })

  app.put('/config', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { metrics } = req.body as { metrics: string[] }
    const db = (app as any).db
    db.prepare(`
      INSERT INTO metric_configs (openid, metrics) VALUES (?, ?)
      ON CONFLICT(openid) DO UPDATE SET metrics = excluded.metrics, updated_at = datetime('now')
    `).run(openid, JSON.stringify(metrics))

    return { success: true }
  })

  app.get('/records', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { metricKey, days } = req.query as { metricKey?: string; days?: string }
    const db = (app as any).db
    const dayCount = parseInt(days || '30')

    let query = 'SELECT * FROM metric_records WHERE openid = ?'
    const params: any[] = [openid]

    if (metricKey) {
      query += ' AND metric_key = ?'
      params.push(metricKey)
    }

    query += " AND recorded_at >= datetime('now', ?) ORDER BY recorded_at DESC"
    params.push(`-${dayCount} days`)

    return db.prepare(query).all(...params)
  })

  app.post('/records', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { metricKey, value } = req.body as { metricKey: string; value: number }
    const db = (app as any).db
    db.prepare('INSERT INTO metric_records (openid, metric_key, value) VALUES (?, ?, ?)').run(openid, metricKey, value)

    return { success: true }
  })
}
