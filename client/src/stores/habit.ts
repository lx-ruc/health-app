import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getHabitCache, setHabitCache } from '../utils/storage'
import { get, post } from '../api'
import { toChinaDateStr } from '../utils/date'

export const useHabitStore = defineStore('habit', () => {
  const todayHabit = ref<any>(null)
  const history = ref<any[]>([])
  const loading = ref(false)

  function setCache(data: any) {
    todayHabit.value = data
    setHabitCache(data)
  }

  async function fetchToday() {
    const today = toChinaDateStr()
    try {
      const data = await get('/habits', { date: today })
      todayHabit.value = data
    } catch {}
  }

  async function fetchHistory(start?: string, end?: string) {
    loading.value = true
    try {
      const data = await get('/habits', { start, end })
      history.value = data || []
    } finally {
      loading.value = false
    }
  }

  async function saveHabit(data: any) {
    const today = toChinaDateStr()
    await post('/habits', { date: today, ...data })
    await fetchToday()
  }

  return { todayHabit, history, loading, setCache, fetchToday, fetchHistory, saveHabit }
})
