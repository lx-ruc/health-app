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
        return reply.status(422).send({ error: 'OCR 识别失败，请上传更清晰的图片' })
      }
      const analysis = await analyzeReport(ocrText)

      const db = (app as any).db
      db.prepare(
        'INSERT INTO reports (openid, image_base64, ocr_text, analysis_result) VALUES (?, ?, ?, ?)'
      ).run(openid, image.slice(0, 100), ocrText, analysis)

      return { ocrText, analysis }
    } catch (err: any) {
      const isUpstream4xx =
        axios.isAxiosError(err) && err.response && err.response.status >= 400 && err.response.status < 500
      if (isUpstream4xx) {
        return reply.status(422).send({
          error: 'OCR 识别失败，请上传更清晰的图片',
          detail: `upstream ${err.response.status}`,
        })
      }
      return reply.status(500).send({ error: 'AI 分析失败', detail: err.message })
    }
  })
}
