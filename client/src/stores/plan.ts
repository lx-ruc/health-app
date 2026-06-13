import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { get, patch, del } from '../api'

export interface Plan {
  id: number
  openid: string
  week_start: string
  category: string
  title: string
  detail?: string
  source: string
  done: number
  created_at: string
}

export function computeNextMonday(): string {
  const d = new Date()
  const day = d.getDay() || 7 // Sunday=7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1 + 7)
  return monday.toISOString().slice(0, 10)
}

export const usePlanStore = defineStore('plan', () => {
  const nextWeekPlans = ref<Plan[]>([])
  const loading = ref(false)
  const weekStart = computed(() => computeNextMonday())

  async function fetchNextWeekPlans() {
    loading.value = true
    try {
      const data = await get('/plans', { week_start: weekStart.value })
      nextWeekPlans.value = (data as Plan[]) || []
    } catch {
      nextWeekPlans.value = []
    } finally {
      loading.value = false
    }
  }

  async function toggleDone(id: number) {
    try {
      await patch(`/plans/${id}`)
      const p = nextWeekPlans.value.find((x) => x.id === id)
      if (p) p.done = p.done ? 0 : 1
    } catch {}
  }

  async function removePlan(id: number) {
    try {
      await del(`/plans/${id}`)
      nextWeekPlans.value = nextWeekPlans.value.filter((x) => x.id !== id)
    } catch {}
  }

  return { nextWeekPlans, loading, weekStart, fetchNextWeekPlans, toggleDone, removePlan }
})
