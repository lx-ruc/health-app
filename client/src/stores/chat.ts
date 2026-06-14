import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getChatHistory, setChatHistory } from '../utils/storage'
import { getToken } from '../utils/storage'
import { API_BASE } from '../utils/constants'
import { post } from '../api'
import { computeNextMonday } from './plan'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Suggestion {
  category: string
  title: string
  detail?: string
}

const SUGGESTIONS_MARKER = '[[SUGGESTIONS]]'

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(getChatHistory<ChatMessage>() || [])
  const sending = ref(false)
  const currentSuggestions = ref<Suggestion[]>([])
  const suggestionsConsumed = ref(false)
  const lastError = ref(false)
  const lastUserMessage = ref<string | null>(null)

  function loadHistory() {
    messages.value = getChatHistory<ChatMessage>() || []
  }

  function clearHistory() {
    messages.value = []
    setChatHistory([])
  }

  async function sendMessage(userContent: string): Promise<string> {
    messages.value.push({ role: 'user', content: userContent })
    setChatHistory(messages.value)

    // Reset suggestion state for the new round
    currentSuggestions.value = []
    suggestionsConsumed.value = false
    lastUserMessage.value = userContent
    lastError.value = false

    sending.value = true
    messages.value.push({ role: 'assistant', content: '' })
    const assistantIdx = messages.value.length - 1

    try {
      const fullContent = await streamChat(messages.value.slice(0, -1))
      messages.value[assistantIdx].content = fullContent
      setChatHistory(messages.value)
      // 只有真正抛异常才算失败；fullContent 为空可能只是 AI 只返回了建议没前导文本
      return fullContent
    } catch (e: any) {
      // mp-weixin 失败时 errMsg 形如 "request:fail error:102"，把完整信息透出来方便定位
      const reason = e?.errMsg || e?.message || `errCode=${e?.errCode ?? '未知'}`
      messages.value[assistantIdx].content = `分析失败：${reason}\n\n常见原因：\n• 开发者工具未勾选「详情→本地设置→不校验合法域名」\n• 真机访问 localhost（需走真实域名 + HTTPS）`
      setChatHistory(messages.value)
      lastError.value = true
      return ''
    } finally {
      sending.value = false
    }
  }

  /** Retry the last user message: pop the failed assistant reply + resend. */
  async function retryLast(): Promise<string> {
    if (!lastUserMessage.value) return ''
    // 移除最后一条 assistant（错误占位）
    if (messages.value.length && messages.value[messages.value.length - 1].role === 'assistant') {
      messages.value.pop()
    }
    // 同时移除原 user 消息，sendMessage 会重新 push
    if (messages.value.length && messages.value[messages.value.length - 1].role === 'user') {
      messages.value.pop()
    }
    return sendMessage(lastUserMessage.value)
  }

  async function generateFirstAnalysis(): Promise<string> {
    clearHistory()
    return sendMessage('请根据我的健康画像和最近的习惯数据，给我一个综合分析报告，指出需要注意的问题和改善建议。')
  }

  /** Add selected suggestions to next week's plan. Returns inserted count. */
  async function addToPlan(indices: number[]): Promise<number> {
    const items = indices
      .filter((i) => currentSuggestions.value[i])
      .map((i) => currentSuggestions.value[i])
    if (!items.length) return 0
    try {
      const res = await post<{ inserted: number }>('/plans', {
        week_start: computeNextMonday(),
        items,
      })
      suggestionsConsumed.value = true
      return res?.inserted ?? 0
    } catch {
      return 0
    }
  }

  async function streamChat(allMessages: ChatMessage[]): Promise<string> {
    const token = getToken()
    const body = JSON.stringify({ messages: allMessages.slice(-20) })

    // #ifdef MP-WEIXIN
    return streamChatMpWeixin(token, body)
    // #endif
    // #ifndef MP-WEIXIN
    return streamChatFetch(token, body)
    // #endif
  }

  async function streamChatFetch(token: string, body: string): Promise<string> {
    const res = await fetch(`${API_BASE}/analysis/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let lineBuffer = ''
    let done = false

    while (!done) {
      const { done: streamDone, value } = await reader.read()
      if (streamDone) break

      lineBuffer += decoder.decode(value, { stream: true })
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          done = true
          break
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.content) {
            fullContent += parsed.content
            updateAssistantContent(fullContent)
          }
        } catch {}
      }
    }
    updateAssistantContent(fullContent)
    return getDisplayContent(fullContent)
  }

  function streamChatMpWeixin(token: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let fullContent = ''
      let lineBuffer = ''
      const task: any = uni.request({
        url: `${API_BASE}/analysis/chat`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        data: body,
        enableChunked: true,
        responseType: 'arraybuffer',
        success: () => {
          updateAssistantContent(fullContent)
          resolve(getDisplayContent(fullContent))
        },
        fail: (err: any) => reject(err),
      })

      task.onChunkReceived?.((res: any) => {
        if (!res?.data) return
        const text = arrayBufferToUtf8(res.data as ArrayBuffer)
        lineBuffer += text
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const parsed = JSON.parse(payload)
            if (parsed.content) {
              fullContent += parsed.content
              updateAssistantContent(fullContent)
            }
          } catch {}
        }
      })
    })
  }

  function arrayBufferToUtf8(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf)
    let result = ''
    let i = 0
    while (i < bytes.length) {
      const b1 = bytes[i++]
      if (b1 < 0x80) {
        result += String.fromCharCode(b1)
      } else if (b1 < 0xe0) {
        const b2 = bytes[i++]
        result += String.fromCharCode(((b1 & 0x1f) << 6) | (b2 & 0x3f))
      } else if (b1 < 0xf0) {
        const b2 = bytes[i++]
        const b3 = bytes[i++]
        result += String.fromCharCode(((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f))
      } else {
        const b2 = bytes[i++]
        const b3 = bytes[i++]
        const b4 = bytes[i++]
        const cp = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f)
        const off = cp - 0x10000
        result += String.fromCharCode(0xd800 + (off >> 10), 0xdc00 + (off & 0x3ff))
      }
    }
    return result
  }

  /** Strip the [[SUGGESTIONS]] marker + JSON tail from content shown to the user,
   *  and parse the JSON into currentSuggestions. */
  function updateAssistantContent(fullContent: string) {
    const markerIdx = fullContent.indexOf(SUGGESTIONS_MARKER)
    if (markerIdx === -1) {
      setCurrentAssistant(fullContent)
      return
    }
    setCurrentAssistant(fullContent.slice(0, markerIdx).trimEnd())

    const jsonTail = fullContent.slice(markerIdx + SUGGESTIONS_MARKER.length).trim()
    if (!jsonTail) return
    try {
      const parsed = JSON.parse(jsonTail)
      if (Array.isArray(parsed?.suggestions)) {
        currentSuggestions.value = parsed.suggestions.filter(
          (s: any) => s && typeof s.category === 'string' && typeof s.title === 'string',
        )
      }
    } catch {
      // Malformed JSON — silently ignore, user just won't see the panel
    }
  }

  function setCurrentAssistant(text: string) {
    const last = messages.value[messages.value.length - 1]
    if (last && last.role === 'assistant') {
      last.content = text
    }
  }

  function getDisplayContent(fullContent: string): string {
    const idx = fullContent.indexOf(SUGGESTIONS_MARKER)
    return idx === -1 ? fullContent : fullContent.slice(0, idx).trimEnd()
  }

  return {
    messages,
    sending,
    currentSuggestions,
    suggestionsConsumed,
    lastError,
    lastUserMessage,
    loadHistory,
    clearHistory,
    sendMessage,
    retryLast,
    generateFirstAnalysis,
    addToPlan,
  }
})
