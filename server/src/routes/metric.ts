import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'

/** 指标项：预设指标的 key 与 METRIC_OPTIONS 对齐；自定义指标 key 形如 custom_xxx */
export interface MetricItem {
  key: string
  label: string
  unit: string
}

/**
 * 预设指标白名单（与前端 METRIC_OPTIONS 同步）。
 * 仅用于把旧版 string[] 格式归一化为 MetricItem[]，不参与强校验。
 */
const PRESET_METRICS: Record<string, MetricItem> = {
  weight: { key: 'weight', label: '体重', unit: 'kg' },
  systolic: { key: 'systolic', label: '收缩压', unit: 'mmHg' },
  diastolic: { key: 'diastolic', label: '舒张压', unit: 'mmHg' },
  fastingGlucose: { key: 'fastingGlucose', label: '空腹血糖', unit: 'mmol/L' },
  postprandialGlucose: { key: 'postprandialGlucose', label: '餐后血糖', unit: 'mmol/L' },
  steps: { key: 'steps', label: '每日步数', unit: '步' },
  exerciseDuration: { key: 'exerciseDuration', label: '运动时长', unit: '分钟' },
  heartRate: { key: 'heartRate', label: '心率', unit: '次/分' },
}

/**
 * 把任意 metrics 数组归一化为 MetricItem[]。
 * - 旧版存储格式为 string[]（每个元素是预设 key）：映射到预设 label/unit，找不到则兜底用 key 作为 label。
 * - 新版已是 MetricItem[]：原样返回（浅拷贝避免外部修改）。
 * 这是存量兼容的核心防线：前端旧缓存或 DB 旧数据都会被安全转换。
 */
function normalizeMetrics(raw: unknown): MetricItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    if (typeof item === 'string') {
      return PRESET_METRICS[item] ?? { key: item, label: item, unit: '' }
    }
    if (item && typeof item === 'object') {
      const m = item as Record<string, unknown>
      const key = typeof m.key === 'string' ? m.key : ''
      const label = typeof m.label === 'string' ? m.label : key
      const unit = typeof m.unit === 'string' ? m.unit : ''
      return { key, label, unit }
    }
    return { key: '', label: '', unit: '' }
  })
}

export async function metricRoutes(app: FastifyInstance) {
  app.get('/config', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    const row = db.prepare('SELECT metrics FROM metric_configs WHERE openid = ?').get(openid)
    const parsed = row ? JSON.parse(row.metrics) : []
    return { metrics: normalizeMetrics(parsed) }
  })

  app.put('/config', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { metrics } = req.body as { metrics: unknown }
    if (!Array.isArray(metrics)) {
      return reply.status(400).send({ error: 'metrics 必须是数组' })
    }

    const normalized = normalizeMetrics(metrics)
    // 校验：key/label 非空，且 key 在数组内唯一
    const seen = new Set<string>()
    for (const m of normalized) {
      if (!m.key || !m.label) {
        return reply.status(400).send({ error: '每个指标必须有 key 与 label' })
      }
      if (seen.has(m.key)) {
        return reply.status(400).send({ error: `指标 key 重复：${m.key}` })
      }
      seen.add(m.key)
    }

    const db = (app as any).db
    db.prepare(`
      INSERT INTO metric_configs (openid, metrics) VALUES (?, ?)
      ON CONFLICT(openid) DO UPDATE SET metrics = excluded.metrics, updated_at = datetime('now')
    `).run(openid, JSON.stringify(normalized))

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

    query += ' AND recorded_at >= datetime("now", ?) ORDER BY recorded_at DESC'
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
