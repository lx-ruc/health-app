import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'
import { chat } from '../services/ai.js'
import { rateLimit } from '../utils/rateLimiter.js'

const AI_RATE_LIMIT = { max: 10, windowMs: 60_000 }

export async function analysisRoutes(app: FastifyInstance) {
  app.post('/chat', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const rl = rateLimit(`ai:chat:${openid}`, AI_RATE_LIMIT)
    if (!rl.allowed) {
      return reply
        .status(429)
        .header('Retry-After', Math.ceil(rl.retryAfterMs / 1000))
        .send({ error: '请求过于频繁，请稍后再试' })
    }

    const { messages } = req.body as { messages: { role: 'system' | 'user' | 'assistant'; content: string }[] }
    if (!messages?.length) {
      return reply.status(400).send({ error: 'messages are required' })
    }

    const db = (app as any).db
    const user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid)
    const habits = db.prepare(
      'SELECT * FROM habits WHERE openid = ? ORDER BY date DESC LIMIT 7'
    ).all(openid)
    const records = db.prepare(
      'SELECT * FROM metric_records WHERE openid = ? ORDER BY recorded_at DESC LIMIT 50'
    ).all(openid)

    const userContext = buildUserContext(user, habits, records)

    try {
      const reply_content = await chat(userContext, messages)
      return { content: reply_content }
    } catch (err: any) {
      return reply.status(500).send({ error: 'AI service error', detail: err.message })
    }
  })
}

function buildUserContext(user: any, habits: any[], records: any[]): string {
  let ctx = '用户健康画像：\n'

  if (user) {
    ctx += `性别: ${user.gender || '未填写'}, 年龄段: ${user.age_range || '未填写'}, `
    ctx += `身高: ${user.height_range || '未填写'}, 体重: ${user.weight_range || '未填写'}, `
    ctx += `职业: ${user.occupation || '未填写'}\n`
    const diseases = JSON.parse(user.diseases || '[]')
    if (diseases.length) ctx += `已知病史: ${diseases.join('、')}\n`
  }

  if (habits.length) {
    ctx += '\n最近7天习惯记录：\n'
    for (const h of habits) {
      ctx += `${h.date}: 睡眠${h.sleep_time || '?'}~${h.wake_time || '?'}, `
      ctx += `午休${h.nap_duration}分钟, 工作: ${h.work_type || '?'}, `
      ctx += `运动: ${h.exercise_type || '无'}${h.exercise_duration ? h.exercise_duration + '分钟' : ''}, `
      ctx += `步数: ${h.steps}\n`
      if (h.breakfast) ctx += `  早餐: ${h.breakfast}\n`
      if (h.lunch) ctx += `  午餐: ${h.lunch}\n`
      if (h.dinner) ctx += `  晚餐: ${h.dinner}\n`
    }
  }

  if (records.length) {
    ctx += '\n最近指标记录：\n'
    const byMetric: Record<string, any[]> = {}
    for (const r of records) {
      if (!byMetric[r.metric_key]) byMetric[r.metric_key] = []
      byMetric[r.metric_key].push(r)
    }
    for (const [key, vals] of Object.entries(byMetric)) {
      ctx += `${key}: ${vals.map((v) => `${v.value}(${v.recorded_at?.slice(5, 16)})`).join(', ')}\n`
    }
  }

  return ctx
}
