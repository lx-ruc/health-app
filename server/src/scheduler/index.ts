import type { FastifyInstance } from 'fastify'
import cron from 'node-cron'
import { checkAndSendReminders } from './jobs/check-reminders.js'

export async function startScheduler(app: FastifyInstance): Promise<void> {
  // 每分钟扫描匹配的提醒配置
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendReminders(app)
    } catch (e) {
      app.log.error({ err: e }, 'reminder scheduler error')
    }
  })

  app.log.info('Reminder scheduler started (every minute)')
}
