import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getChatHistory, setChatHistory } from '../utils/storage'
import { post } from '../api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(getChatHistory<ChatMessage>() || [])
  const sending = ref(false)

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

    sending.value = true
    try {
      const res = await post<{ content: string }>('/analysis/chat', {
        messages: messages.value.slice(-20),
      })
      messages.value.push({ role: 'assistant', content: res.content })
      setChatHistory(messages.value)
      return res.content
    } finally {
      sending.value = false
    }
  }

  async function generateFirstAnalysis(): Promise<string> {
    clearHistory()
    return sendMessage('请根据我的健康画像和最近的习惯数据，给我一个综合分析报告，指出需要注意的问题和改善建议。')
  }

  return { messages, sending, loadHistory, clearHistory, sendMessage, generateFirstAnalysis }
})
