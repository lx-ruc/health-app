import { FastifyInstance } from 'fastify'
import axios from 'axios'
import { verifyToken } from './auth.js'
import { ocrImage } from '../services/ocr.js'
import { analyzeReportStream } from '../services/ai.js'

export async function reportRoutes(app: FastifyInstance) {
  // 第 1 步：OCR，普通 JSON POST（request body 大，不适合 SSE）
  app.post('/ocr', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { image } = req.body as { image: string }
    if (!image) return reply.status(400).send({ error: 'image is required (base64)' })

    try {
      const ocrText = await ocrImage(image)
      if (!ocrText) {
        return reply.status(422).send({ error: 'OCR 识别失败，请上传更清晰的图片' })
      }
      return { ocrText }
    } catch (err: any) {
      const isUpstream4xx =
        axios.isAxiosError(err) && err.response && err.response.status >= 400 && err.response.status < 500
      if (isUpstream4xx) {
        return reply.status(422).send({ error: 'OCR 识别失败，请上传更清晰的图片', detail: `upstream ${err.response.status}` })
      }
      return reply.status(500).send({ error: 'OCR 调用失败', detail: err.message })
    }
  })

  // 第 2 步：AI 分析，SSE 流式（request body 小，只有 ocrText）
  app.post('/analyze-stream', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const { ocrText } = req.body as { ocrText: string }
    if (!ocrText) return reply.status(400).send({ error: 'ocrText is required' })

    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })

    const send = (data: any) => {
      if (!reply.raw.writableEnded) reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      send({ step: 'ai_start' })
      const analysis = await analyzeReportStream(ocrText, (_token, full) => {
        send({ step: 'ai_token', content: full })
      })
      send({ step: 'ai_done', analysis })

      // 持久化（image_base64 暂用空串，OCR 已完成）
      const db = (app as any).db
      db.prepare(
        'INSERT INTO reports (openid, image_base64, ocr_text, analysis_result) VALUES (?, ?, ?, ?)'
      ).run(openid, '', ocrText, analysis)

      send({ step: 'done', analysis })
      reply.raw.end()
    } catch (err: any) {
      send({ step: 'error', error: 'AI 分析失败', detail: err.message })
      if (!reply.raw.writableEnded) reply.raw.end()
    }
  })
}
