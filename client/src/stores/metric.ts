import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMetricConfig, setMetricConfig } from '../utils/storage'
import { get, put, post } from '../api'
import type { MetricItem } from '../utils/constants'

export const useMetricStore = defineStore('metric', () => {
  const selectedMetrics = ref<MetricItem[]>(getMetricConfig())
  const records = ref<any[]>([])
  const loading = ref(false)

  async function fetchConfig() {
    try {
      const data = await get<{ metrics: MetricItem[] }>('/metrics/config')
      selectedMetrics.value = data.metrics || []
      setMetricConfig(selectedMetrics.value)
    } catch {}
  }

  async function saveConfig(metrics: MetricItem[]) {
    await put('/metrics/config', { metrics })
    selectedMetrics.value = metrics
    setMetricConfig(metrics)
  }

  async function fetchRecords(metricKey?: string, days?: number) {
    loading.value = true
    try {
      // 仅传已定义的参数：undefined 会被 uni.request 序列化成字符串 "undefined"，
      // 导致服务端按 metric_key='undefined' 过滤、记录恒为空
      const params: Record<string, string | number> = {}
      if (metricKey) params.metricKey = metricKey
      if (days) params.days = days
      const data = await get('/metrics/records', params)
      records.value = data || []
    } finally {
      loading.value = false
    }
  }

  async function addRecord(metricKey: string, value: number) {
    await post('/metrics/records', { metricKey, value })
  }

  return { selectedMetrics, records, loading, fetchConfig, saveConfig, fetchRecords, addRecord }
})
