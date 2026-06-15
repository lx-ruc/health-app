import type { MetricItem } from './constants'

const TOKEN_KEY = 'health_token'
const USER_PROFILE_KEY = 'health_user_profile'
const HABIT_CACHE_KEY = 'health_habit_cache'
const METRIC_CONFIG_KEY = 'health_metric_config'
const CHAT_HISTORY_KEY = 'health_chat_history'
const ONBOARDING_STEP_KEY = 'health_onboarding_step'

export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function removeToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

export function getUserProfile<T = any>(): T | null {
  const data = uni.getStorageSync(USER_PROFILE_KEY)
  return data || null
}

export function setUserProfile(profile: any) {
  uni.setStorageSync(USER_PROFILE_KEY, profile)
}

export function getHabitCache<T = any>(): T | null {
  const data = uni.getStorageSync(HABIT_CACHE_KEY)
  return data || null
}

export function setHabitCache(data: any) {
  uni.setStorageSync(HABIT_CACHE_KEY, data)
}

/**
 * 读取本地缓存的指标配置。
 * 兼容旧版 string[] 格式：若发现元素是 string，视为脏缓存返回空数组
 * （后端 normalizeMetrics 会兜底，但本地缓存避免类型错乱）。
 */
export function getMetricConfig(): MetricItem[] {
  const data = uni.getStorageSync(METRIC_CONFIG_KEY)
  if (!Array.isArray(data)) return []
  if (data.length > 0 && typeof data[0] === 'string') return []
  return data as MetricItem[]
}

export function setMetricConfig(metrics: MetricItem[]) {
  uni.setStorageSync(METRIC_CONFIG_KEY, metrics)
}

export function getChatHistory<T = any>(): T[] {
  return uni.getStorageSync(CHAT_HISTORY_KEY) || []
}

export function setChatHistory(messages: any[]) {
  uni.setStorageSync(CHAT_HISTORY_KEY, messages)
}

export function getOnboardingStep(): number {
  return uni.getStorageSync(ONBOARDING_STEP_KEY) || 0
}

export function setOnboardingStep(step: number) {
  uni.setStorageSync(ONBOARDING_STEP_KEY, step)
}

export function hasCompletedOnboarding(): boolean {
  return !!uni.getStorageSync(USER_PROFILE_KEY)
}
