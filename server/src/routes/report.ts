import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'
import { ocrImage } from '../services/ocr.js'
import { analyzeReport } from '../services/ai.js'
import { rateLimit } from '../utils/rateLimiter.js'

const AI_RATE_LIMIT = { max: 10, windowMs: 60_000 }

export async function reportRoutes(app: FastifyInstance) {
  app.post('/analyze', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const rl = rateLimit(`ai:report:${openid}`, AI_RATE_LIMIT)
    if (!rl.allowed) {
      return reply
        .status(429)
        .header('Retry-After', Math.ceil(rl.retryAfterMs / 1000))
        .send({ error: '请求过于频繁，请稍后再试' })
    }

    const { image } = req.body as { image: string }
    if (!image) {
      return reply.status(400).send({ error: 'image is required (base64)' })
    }

    try {
      const ocrText = await ocrImage(image)
      if (!ocrText) {
        return reply.status(422).send({ error: 'OCR failed, please upload a clearer image' })
      }

      const analysis = await analyzeReport(ocrText)

      const db = (app as any).db
      const result = db.prepare(
        'INSERT INTO reports (openid, image_base64, ocr_text, analysis_result) VALUES (?, ?, ?, ?)'
      ).run(openid, image, ocrText, analysis)

      return { id: Number(result.lastInsertRowid), ocrText, analysis }
    } catch (err: any) {
      return reply.status(500).send({ error: 'analysis failed', detail: err.message })
    }
  })

  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return reply.status(400).send({ error: 'invalid id' })
    }

    const db = (app as any).db
    const report = db
      .prepare('SELECT ocr_text, analysis_result FROM reports WHERE id = ? AND openid = ?')
      .get(id, openid) as { ocr_text: string; analysis_result: string } | undefined

    if (!report) {
      return reply.status(404).send({ error: 'report not found' })
    }

    return { ocrText: report.ocr_text, analysis: report.analysis_result }
  })
}
