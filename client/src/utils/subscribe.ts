import { post } from '../api'

export type ReminderType = 'daily_habit' | 'weekly_metric'

interface SubscribeResult {
  accepted: number
  rejected: number
  remaining: number
}

/**
 * 触发微信订阅消息授权弹窗。每个 accept 给后端 +1。
 * H5 模式下 uni.requestSubscribeMessage 不存在，直接返回 accepted=0。
 */
export async function requestReminderAuth(
  type: ReminderType,
  templateIds: string[],
): Promise<SubscribeResult> {
  if (templateIds.length === 0) {
    return { accepted: 0, rejected: 0, remaining: 0 }
  }

  // H5 / 非微信环境：uni.requestSubscribeMessage 不存在
  if (typeof (uni as any).requestSubscribeMessage !== 'function') {
    uni.showToast({ title: '请在微信中打开', icon: 'none' })
    return { accepted: 0, rejected: 0, remaining: 0 }
  }

  return new Promise<SubscribeResult>((resolve) => {
    ;(uni as any).requestSubscribeMessage({
      tmplIds: templateIds,
      success: async (res: Record<string, string>) => {
        let accepted = 0
        let rejected = 0
        for (const [, status] of Object.entries(res)) {
          if (status === 'accept') accepted++
          else rejected++
        }
        let remaining = 0
        if (accepted > 0) {
          try {
            const r = await post<{ remaining: number }>('/reminder-config/subscribe-increment', {
              type,
              count: accepted,
            })
            remaining = r.remaining
          } catch {}
        }
        resolve({ accepted, rejected, remaining })
      },
      fail: () => resolve({ accepted: 0, rejected: templateIds.length, remaining: 0 }),
    })
  })
}
