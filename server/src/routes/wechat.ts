import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { verifyToken } from './auth.js'

interface WeRunBody {
  encryptedData: string
  iv: string
}

interface WeRunStep {
  timestamp: number
  step: number
}

function decryptWeRun(encryptedData: string, iv: string, sessionKey: string): WeRunStep[] {
  const key = Buffer.from(sessionKey, 'base64')
  const ivBuf = Buffer.from(iv, 'base64')
  const encrypted = Buffer.from(encryptedData, 'base64')
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, ivBuf)
  decipher.setAutoPadding(true)
  const decoded = Buffer.concat([decipher.update(encrypted), decipher.final()])
  const json = JSON.parse(decoded.toString('utf8'))
  return json.stepInfoList || []
}

function tsToDateStr(tsSec: number): string {
  const dt = new Date(tsSec * 1000 + 8 * 3600 * 1000)
  return dt.toISOString().slice(0, 10)
}

export async function wechatRoutes(app: FastifyInstance) {
  app.post<{ Body: WeRunBody }>('/werun', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { encryptedData, iv } = req.body || {}
    if (!encryptedData || !iv) {
      return reply.status(400).send({ error: 'encryptedData and iv required' })
    }

    const db = (app as any).db
    const user = db
      .prepare('SELECT session_key FROM users WHERE openid = ?')
      .get(openid) as { session_key: string | null }

    if (!user?.session_key) {
      return reply.status(440).send({ error: 'session_key missing', code: 'NEED_RELOGIN' })
    }

    let steps: WeRunStep[]
    try {
      steps = decryptWeRun(encryptedData, iv, user.session_key)
    } catch {
      return reply.status(440).send({ error: 'session_key invalid', code: 'NEED_RELOGIN' })
    }

    const deleteForDate = db.prepare(
      `DELETE FROM metric_records WHERE openid = ? AND metric_key = 'steps' AND date(recorded_at) = date(?)`,
    )
    const insert = db.prepare(
      `INSERT INTO metric_records (openid, metric_key, value, recorded_at) VALUES (?, 'steps', ?, ?)`,
    )

    const tx = db.transaction((items: WeRunStep[]) => {
      let written = 0
      for (const it of items) {
        const dateStr = tsToDateStr(it.timestamp)
        deleteForDate.run(openid, dateStr)
        insert.run(openid, it.step, `${dateStr} 12:00:00`)
        written++
      }
      return written
    })

    const written = tx(steps)
    return { success: true, written, total: steps.length }
  })
}
