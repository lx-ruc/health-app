import axios from 'axios'
import {
  CHAT_SYSTEM_PROMPT,
  REPORT_ANALYSIS_SYSTEM_PROMPT,
  REPORT_ANALYSIS_USER_PREFIX,
} from '../config/ai.js'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(userContext: string, messages: Message[]): Promise<string> {
  const systemMessage: Message = {
    role: 'system',
    content: `${CHAT_SYSTEM_PROMPT}\n\n${userContext}`,
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
          content: REPORT_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `${REPORT_ANALYSIS_USER_PREFIX}\n\n${ocrText}`,
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
