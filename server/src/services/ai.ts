import axios from 'axios'
import { FastifyReply } from 'fastify'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const API_BASE_URL = 'https://api.deepseek.com/v1'
const CHAT_MODEL = 'deepseek-chat'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `你是健康顾问AI。分析用户习惯与健康的关联，给出具体可执行的建议。饮食建议要具体到食材。你不是医生，严重问题建议就医。

回复主体完成后，必须在最后一行单独输出建议标记，然后跟一个 JSON：
[[SUGGESTIONS]]
{"suggestions":[{"category":"睡眠|饮食|运动|工作|其他","title":"不超过15字的具体行动","detail":"不超过50字，含本周数据依据和执行方法"}]}
给出 3-5 条最关键的建议。category 必须是这 5 个之一。JSON 必须严格合法，不要包裹代码块标记（不要用 \`\`\`）。`

export async function chatStream(
  userContext: string,
  messages: Message[],
  reply: FastifyReply,
): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n${userContext}`,
  }
  const recentMessages = messages.slice(-20)

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  let fullContent = ''

  const response = await axios.post(
    `${API_BASE_URL}/chat/completions`,
    {
      model: CHAT_MODEL,
      messages: [systemMessage, ...recentMessages],
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
      responseType: 'stream',
    },
  )

  return new Promise<string>((resolve, reject) => {
    // SSE lines can be split across TCP chunks — buffer until newline
    let lineBuffer = ''

    response.data.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      // Keep the last (possibly incomplete) segment for the next chunk
      lineBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          reply.raw.write('data: [DONE]\n\n')
          reply.raw.end()
          resolve(fullContent)
          return
        }
        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            reply.raw.write(`data: ${JSON.stringify({ content: delta })}\n\n`)
          }
        } catch {}
      }
    })

    response.data.on('end', () => {
      reply.raw.write('data: [DONE]\n\n')
      reply.raw.end()
      resolve(fullContent)
    })

    response.data.on('error', (err: Error) => {
      reply.raw.end()
      reject(err)
    })
  })
}

export async function analyzeReport(ocrText: string): Promise<string> {
  const res = await axios.post(
    `${API_BASE_URL}/chat/completions`,
    {
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个体检报告分析助手。分析OCR识别出的体检报告文字，提取所有异常指标，对每个异常指标给出：指标名称、实际值、参考范围、偏离程度、可能的健康影响、建议。用JSON格式返回：{"abnormal":[{"name":"","value":"","reference":"","deviation":"","impact":"","suggestion":""}]}',
        },
        {
          role: 'user',
          content: `以下是OCR识别的体检报告内容，请分析异常指标：\n\n${ocrText}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    },
  )

  return res.data.choices[0].message.content
}

/**
 * 流式版体检报告分析。
 * AI 先输出自然语言分析（流式可见），最后输出 [[ANALYSIS_JSON]] 标记 + JSON。
 * onToken(token, fullContent) 每收到一个 token 调用一次（fullContent 是累计全文）。
 * 返回值是剥离了自然语言部分、只保留 JSON 的字符串。
 */
const REPORT_ANALYSIS_MARKER = '[[ANALYSIS_JSON]]'

export async function analyzeReportStream(
  ocrText: string,
  onToken: (token: string, fullContent: string) => void,
): Promise<string> {
  const response = await axios.post(
    `${API_BASE_URL}/chat/completions`,
    {
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个体检报告分析助手。先用自然语言分析 OCR 识别出的体检报告，
指出异常指标、偏离程度、可能的健康影响，并给出具体可执行的建议（饮食要具体到食材，运动要具体到类型和时长）。
分析语言要专业但通俗，让普通用户能看懂。

分析主体完成后，必须在最后一行单独输出标记 ${REPORT_ANALYSIS_MARKER}，然后跟一个 JSON：
{"abnormal":[{"name":"","value":"","reference":"","deviation":"","impact":"","suggestion":""}]}
JSON 必须严格合法，不要包裹代码块标记（不要用 \`\`\`）。`,
        },
        {
          role: 'user',
          content: `以下是 OCR 识别的体检报告内容，请分析：\n\n${ocrText}`,
        },
      ],
      max_tokens: 3000,
      temperature: 0.4,
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
      responseType: 'stream',
    },
  )

  return new Promise<string>((resolve, reject) => {
    let fullContent = ''
    let lineBuffer = ''

    response.data.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          resolve(extractJson(fullContent))
          return
        }
        try {
          const parsed = JSON.parse(payload)
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) {
            fullContent += delta
            onToken(delta, fullContent)
          }
        } catch {}
      }
    })

    response.data.on('end', () => resolve(extractJson(fullContent)))
    response.data.on('error', (err: Error) => reject(err))
  })
}

function extractJson(full: string): string {
  const idx = full.indexOf(REPORT_ANALYSIS_MARKER)
  if (idx === -1) return full
  return full.slice(idx + REPORT_ANALYSIS_MARKER.length).trim()
}
