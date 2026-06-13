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

    sending.value = true
    messages.value.push({ role: 'assistant', content: '' })
    const assistantIdx = messages.value.length - 1

    try {
      const fullContent = await streamChat(messages.value.slice(0, -1))
      messages.value[assistantIdx].content = fullContent
      setChatHistory(messages.value)
      return fullContent
    } catch {
      messages.value[assistantIdx].content = '分析失败，请重试。'
      setChatHistory(messages.value)
      return ''
    } finally {
      sending.value = false
    }
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
    const res = await fetch(`${API_BASE}/analysis/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages: allMessages.slice(-20) }),
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

    // Final pass in case the marker arrived in the last chunk without an update trigger
    updateAssistantContent(fullContent)
    return getDisplayContent(fullContent)
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
    loadHistory,
    clearHistory,
    sendMessage,
    generateFirstAnalysis,
    addToPlan,
  }
})
