import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { verifyToken } from './auth.js'
import { ocrImage } from '../services/ocr.js'
import { analyzeReport } from '../services/ai.js'

export async function reportRoutes(app: FastifyInstance) {
  app.post('/analyze', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

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
      db.prepare(
        'INSERT INTO reports (openid, image_base64, ocr_text, analysis_result) VALUES (?, ?, ?, ?)'
      ).run(openid, image.slice(0, 100), ocrText, analysis)

      return { ocrText, analysis }
    } catch (err: any) {
      // Upstream OCR rejecting bad/unrecognizable image → 422 client-side
      if (axios.isAxiosError(err) && err.response && err.response.status >= 400 && err.response.status < 500) {
        return reply.status(422).send({
          error: 'OCR failed, please upload a clearer image',
          detail: `upstream ${err.response.status}`,
        })
      }
      return reply.status(500).send({ error: 'analysis failed', detail: err.message })
    }
  })
}
