import 'dotenv/config'
import Fastify, { FastifyError } from 'fastify'
import cors from '@fastify/cors'
import { initDb } from './db/init.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/user.js'
import { habitRoutes } from './routes/habit.js'
import { metricRoutes } from './routes/metric.js'
import { analysisRoutes } from './routes/analysis.js'
import { reportRoutes } from './routes/report.js'

const app = Fastify({ logger: true })

// 兜底：捕获路由/钩子之外抛出的异常，避免直接崩溃进程
// （Node 15+ 默认会把 unhandledRejection 当作致命错误终止进程）
process.on('uncaughtException', (err) => {
  app.log.error({ err }, 'uncaughtException')
})
process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'unhandledRejection')
})

// 全局错误处理：路由/钩子中未捕获的异常统一在此返回，避免泄露内部细节
app.setErrorHandler((err: FastifyError, request, reply) => {
  const statusCode =
    err.statusCode && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500
  request.log.error({ err }, 'request error')
  // 5xx 对外只返回通用提示，不泄露堆栈/内部信息
  if (statusCode >= 500) {
    return reply.status(statusCode).send({ error: '内部服务器错误' })
  }
  return reply.status(statusCode).send({ error: err.message })
})

// 统一 404 响应格式
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({ error: 'not found', path: request.url })
})

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
