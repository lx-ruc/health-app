import axios from 'axios'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPT = `你是一位专业的健康顾问AI。你的职责是：
1. 分析用户的生活习惯与健康状况之间的关联
2. 指出可能引发或加重疾病的习惯
3. 给出具体、可执行的改善建议
4. 回答用户关于饮食、运动、作息的健康问题

注意事项：
- 建议要具体可执行，不要笼统
- 如果用户有多种疾病，综合分析习惯对不同疾病的影响
- 饮食建议要具体到食材和做法
- 你不是医生，如遇严重问题建议就医`

export async function chat(userContext: string, messages: Message[]): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\n${userContext}`,
  }

  const recentMessages = messages.slice(-20)

  const res = await axios.post(
    `${DEEPSEEK_BASE_URL}/v1/chat/completions`,
    {
      model: 'deepseek-chat',
      messages: [systemMessage, ...recentMessages],
      max_tokens: 2048,
      temperature: 0.7,
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

export async function analyzeReport(ocrText: string): Promise<string> {
  const res = await axios.post(
    `${DEEPSEEK_BASE_URL}/v1/chat/completions`,
    {
      model: 'deepseek-chat',
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
