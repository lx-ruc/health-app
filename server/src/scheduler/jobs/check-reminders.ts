import type { FastifyInstance } from 'fastify'
import { sendSubscribeMessage } from '../../services/subscribe-message.js'

const WX_TPL_DAILY_HABIT = process.env.WX_TPL_DAILY_HABIT || ''
const WX_TPL_WEEKLY_METRIC = process.env.WX_TPL_WEEKLY_METRIC || ''

interface ReminderRow {
  id: number
  openid: string
  type: 'daily_habit' | 'weekly_metric'
  time: string
  days_of_week: string | null
  subscribe_remaining: number
}

/**
 * 每分钟跑一次：找出 time 匹配当前 HH:MM、enabled=1、subscribe_remaining>0 的配置，
 * 按类型（daily 或 weekly 的 day_of_week 匹配）发推送并扣减剩余次数。
 */
export async function checkAndSendReminders(app: FastifyInstance): Promise<void> {
  const db = (app as any).db
  const now = new Date()
  // 服务器时区假定 Asia/Shanghai；如部署其他时区需保证容器 TZ 一致
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${hh}:${mm}`
  const currentDay = now.getDay() // 0=周日, 1=周一...

  const rows = db
    .prepare(
      `SELECT * FROM reminder_configs
       WHERE time = ? AND enabled = 1 AND subscribe_remaining > 0`,
    )
    .all(currentTime) as ReminderRow[]

  for (const row of rows) {
    if (row.type === 'weekly_metric') {
      const days = (row.days_of_week || '').split(',').filter(Boolean).map((d) => Number(d))
      if (!days.includes(currentDay)) continue
    }
    await dispatch(app, row)
  }
}

async function dispatch(app: FastifyInstance, row: ReminderRow): Promise<void> {
  const db = (app as any).db
  const tplId = row.type === 'daily_habit' ? WX_TPL_DAILY_HABIT : WX_TPL_WEEKLY_METRIC
  const data = buildTemplateData(row)
  const today = new Date().toISOString().slice(0, 10)

  const result = await sendSubscribeMessage(db, row.openid, tplId, data)

  if (result.ok) {
    db.prepare(
      `UPDATE reminder_configs SET subscribe_remaining = MAX(0, subscribe_remaining - 1), updated_at = datetime('now') WHERE id = ?`,
    ).run(row.id)
    app.log.info({ openid: row.openid, type: row.type }, `reminder sent @ ${today} ${row.time}`)
    return
  }

  if (result.userUnsubscribed) {
    db.prepare(
      `UPDATE reminder_configs SET subscribe_remaining = 0, enabled = 0, updated_at = datetime('now') WHERE id = ?`,
    ).run(row.id)
    app.log.warn({ openid: row.openid }, 'user unsubscribed, disabling reminder')
    return
  }

  app.log.warn({ openid: row.openid, err: result.error }, 'reminder send failed')
}

function buildTemplateData(row: ReminderRow): Record<string, { value: any }> {
  const today = new Date().toISOString().slice(0, 10)
  if (row.type === 'daily_habit') {
    return {
      date: { value: today },
      content: { value: '今天的生活习惯记得打卡哦～' },
    }
  }
  return {
    weekday: { value: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()] },
    metrics: { value: '本周该记录体重、血压等指标啦' },
  }
}
