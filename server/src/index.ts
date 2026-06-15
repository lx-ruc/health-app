import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { initDb } from './db/init.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { habitRoutes } from './routes/habit.js'
import { metricRoutes } from './routes/metric.js'
import { analysisRoutes } from './routes/analysis.js'
import { reportRoutes } from './routes/report.js'

const app = Fastify({ logger: true })

// CORS: 默认仅允许 localhost；生产环境通过 CORS_ORIGINS（逗号分隔）显式配置允许的来源
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

async function corsOriginValidator(origin: string | undefined): Promise<boolean> {
  // 无 Origin 头（同源/非浏览器请求）直接放行
  if (!origin) {
    return true
  }
  // 显式配置了 CORS_ORIGINS 时，仅允许列表中的来源
  if (configuredOrigins.length > 0) {
    return configuredOrigins.includes(origin)
  }
  // 默认仅允许本地开发地址（任意端口）
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

await app.register(cors, { origin: corsOriginValidator })

const db = initDb()

app.decorate('db', db)

app.register(authRoutes, { prefix: '/api/auth' })
app.register(userRoutes, { prefix: '/api/user' })
app.register(habitRoutes, { prefix: '/api/habits' })
app.register(metricRoutes, { prefix: '/api/metrics' })
app.register(analysisRoutes, { prefix: '/api/analysis' })
app.register(reportRoutes, { prefix: '/api/report' })

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
  console.log('Server running on http://localhost:3000')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
