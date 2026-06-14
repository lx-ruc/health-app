import type Database from 'better-sqlite3'
import { getAccessToken, invalidateAccessToken } from './wechat-token.js'

interface WxSendResponse {
  errcode?: number
  errmsg?: string
}

export interface SendResult {
  ok: boolean
  userUnsubscribed?: boolean
  error?: string
}

export async function sendSubscribeMessage(
  db: Database.Database,
  openid: string,
  templateId: string,
  data: Record<string, { value: any }>,
  page = 'pages/index/index',
): Promise<SendResult> {
  if (!templateId) {
    return { ok: false, error: 'template id not configured' }
  }

  const token = await getAccessToken(db)
  const body = {
    touser: openid,
    template_id: templateId,
    page,
    data,
    miniprogram_state: 'formal',
  }

  const r1 = await trySend(token, body)
  if (r1.ok) return r1

  // access_token 无效 → 强制刷新重试一次
  if (r1.errcode === 40001 || r1.errcode === 40014 || r1.errcode === 42001) {
    invalidateAccessToken()
    const newToken = await getAccessToken(db)
    const r2 = await trySend(newToken, body)
    return r2
  }

  return r1
}

async function trySend(token: string, body: any): Promise<SendResult & { errcode?: number }> {
  try {
    const res = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    const data = (await res.json()) as WxSendResponse
    if (data.errcode === 0 || data.errcode === undefined) {
      return { ok: true }
    }
    // 43101: 用户拒绝接受 / 取消订阅
    if (data.errcode === 43101) {
      return { ok: false, userUnsubscribed: true, errcode: data.errcode, error: data.errmsg }
    }
    return { ok: false, errcode: data.errcode, error: `${data.errmsg} (errcode=${data.errcode})` }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
