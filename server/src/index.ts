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
import { planRoutes } from './routes/plan.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

const db = initDb()

app.decorate('db', db)

app.register(authRoutes, { prefix: '/api/auth' })
app.register(userRoutes, { prefix: '/api/user' })
app.register(habitRoutes, { prefix: '/api/habits' })
app.register(metricRoutes, { prefix: '/api/metrics' })
app.register(analysisRoutes, { prefix: '/api/analysis' })
app.register(reportRoutes, { prefix: '/api/report' })
app.register(planRoutes, { prefix: '/api/plans' })

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
  console.log('Server running on http://localhost:3000')
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
