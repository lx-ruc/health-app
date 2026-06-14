import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { verifyToken } from './auth.js'
import { ocrImage } from '../services/ocr.js'
import { analyzeReportStream } from '../services/ai.js'

export async function reportRoutes(app: FastifyInstance) {
  app.post('/analyze', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { image } = req.body as { image: string }
    if (!image) {
      return reply.status(400).send({ error: 'image is required (base64)' })
    }

    // 接管响应，SSE 流式输出：OCR → AI token 流
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const send = (data: any) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      }
    }

    try {
      send({ step: 'ocr_start' })
      const ocrText = await ocrImage(image)
      if (!ocrText) {
        send({ step: 'error', error: 'OCR 识别失败，请上传更清晰的图片' })
        reply.raw.end()
        return
      }
      send({ step: 'ocr_done', ocrText })

      send({ step: 'ai_start' })
      const analysis = await analyzeReportStream(ocrText, (token, full) => {
        send({ step: 'ai_token', token, content: full })
      })
      send({ step: 'ai_done', analysis })

      const db = (app as any).db
      db.prepare(
        'INSERT INTO reports (openid, image_base64, ocr_text, analysis_result) VALUES (?, ?, ?, ?)'
      ).run(openid, image.slice(0, 100), ocrText, analysis)

      send({ step: 'done', ocrText, analysis })
      reply.raw.end()
    } catch (err: any) {
      const isUpstream4xx =
        axios.isAxiosError(err) && err.response && err.response.status >= 400 && err.response.status < 500
      send({
        step: 'error',
        error: isUpstream4xx ? 'OCR 识别失败，请上传更清晰的图片' : 'AI 分析失败',
        detail: err.message,
      })
      if (!reply.raw.writableEnded) reply.raw.end()
    }
  })
}
