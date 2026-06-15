import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'
import { toChinaDateStr, toChinaDateStrDaysAgo } from '../utils/date.js'

export async function habitRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { date, start, end } = req.query as { date?: string; start?: string; end?: string }
    const db = (app as any).db

    if (date) {
      const habit = db.prepare('SELECT * FROM habits WHERE openid = ? AND date = ?').get(openid, date)
      return habit || null
    }

    const startDate = start || toChinaDateStrDaysAgo(30)
    const endDate = end || toChinaDateStr()
    const habits = db.prepare(
      'SELECT * FROM habits WHERE openid = ? AND date BETWEEN ? AND ? ORDER BY date DESC'
    ).all(openid, startDate, endDate)
    return habits
  })

  app.post('/', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const body = req.body as {
      date: string
      sleepTime?: string
      wakeTime?: string
      napDuration?: number
      workType?: string
      breakfast?: string
      lunch?: string
      dinner?: string
      exerciseType?: string
      exerciseDuration?: number
      steps?: number
    }

    const db = (app as any).db
    db.prepare(`
      INSERT INTO habits (openid, date, sleep_time, wake_time, nap_duration, work_type, breakfast, lunch, dinner, exercise_type, exercise_duration, steps)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(openid, date) DO UPDATE SET
        sleep_time = excluded.sleep_time,
        wake_time = excluded.wake_time,
        nap_duration = excluded.nap_duration,
        work_type = excluded.work_type,
        breakfast = excluded.breakfast,
        lunch = excluded.lunch,
        dinner = excluded.dinner,
        exercise_type = excluded.exercise_type,
        exercise_duration = excluded.exercise_duration,
        steps = excluded.steps,
        updated_at = datetime('now')
    `).run(
      openid, body.date, body.sleepTime || null, body.wakeTime || null,
      body.napDuration || 0, body.workType || null, body.breakfast || null,
      body.lunch || null, body.dinner || null, body.exerciseType || null,
      body.exerciseDuration || 0, body.steps || 0,
    )

    return { success: true }
  })
}
