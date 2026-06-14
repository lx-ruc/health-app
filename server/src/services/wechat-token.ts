import type Database from 'better-sqlite3'

const WX_APPID = process.env.WX_APPID || ''
const WX_SECRET = process.env.WX_SECRET || ''
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

let memoryToken: string | null = null
let memoryExpiresAt = 0
let inflight: Promise<string> | null = null

interface TokenRow {
  token: string
  expires_at: string
}

export async function getAccessToken(db: Database.Database): Promise<string> {
  const now = Date.now()
  if (memoryToken && memoryExpiresAt - now > TOKEN_REFRESH_MARGIN_MS) {
    return memoryToken
  }

  if (inflight) return inflight

  inflight = (async () => {
    try {
      const cached = db
        .prepare('SELECT token, expires_at FROM wechat_access_token WHERE appid = ?')
        .get(WX_APPID) as TokenRow | undefined

      if (cached) {
        const expiresAtMs = +new Date(cached.expires_at + 'Z')
        if (expiresAtMs - now > TOKEN_REFRESH_MARGIN_MS) {
          memoryToken = cached.token
          memoryExpiresAt = expiresAtMs
          return cached.token
        }
      }

      const fresh = await fetchFreshToken()
      memoryToken = fresh.token
      memoryExpiresAt = fresh.expiresAt

      const expiresAtIso = new Date(fresh.expiresAt).toISOString().slice(0, 19).replace('T', ' ')
      db.prepare(
        `INSERT INTO wechat_access_token (appid, token, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(appid) DO UPDATE SET token = excluded.token, expires_at = excluded.expires_at`,
      ).run(WX_APPID, fresh.token, expiresAtIso)

      return fresh.token
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function invalidateAccessToken(): void {
  memoryToken = null
  memoryExpiresAt = 0
}

interface WxTokenResponse {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

async function fetchFreshToken(): Promise<{ token: string; expiresAt: number }> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_SECRET}`
  const res = await fetch(url)
  const data = (await res.json()) as WxTokenResponse
  if (!data.access_token) {
    throw new Error(`wechat token fetch failed: ${data.errcode} ${data.errmsg}`)
  }
  return {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
  }
}
