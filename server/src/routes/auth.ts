import { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'

const envSecret = process.env.JWT_SECRET
if (!envSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required. Set a strong random value in server/.env (see .env.example).'
  )
}
const JWT_SECRET: string = envSecret
const JWT_EXPIRES_IN = '7d'
const WX_APPID = process.env.WX_APPID || ''
const WX_SECRET = process.env.WX_SECRET || ''

// 本地开发降级：非生产环境且未配置微信凭证时，跳过 code2Session，
// 所有登录请求映射到同一个本地开发用户，避免 touristappid 下登录永远 401。
const DEV_OPENID = 'dev-local-openid'
const devLoginEnabled = process.env.NODE_ENV !== 'production' && (!WX_APPID || !WX_SECRET)

interface WxSessionResponse {
  openid?: string
  errcode?: number
  errmsg?: string
}

interface WxLoginBody {
  code: string
}

async function wxCodeToOpenid(code: string): Promise<WxSessionResponse> {
  const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`
  const res = await fetch(wxUrl)
  return res.json() as Promise<WxSessionResponse>
}

export async function authRoutes(app: FastifyInstance) {
  if (devLoginEnabled) {
    app.log.warn('DEV login bypass active (WX_APPID/WX_SECRET missing): all clients sign in as the local dev user')
  }

  app.post<{ Body: WxLoginBody }>('/login', async (req, reply) => {
    const { code } = req.body

    if (!code) {
      return reply.status(400).send({ error: 'code is required' })
    }

    const data = devLoginEnabled
      ? { openid: DEV_OPENID }
      : await wxCodeToOpenid(code)

    if (!data.openid) {
      return reply.status(401).send({ error: 'wx login failed', detail: data })
    }

    const openid = data.openid

    const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    const db = (app as any).db
    const existing = db.prepare('SELECT openid FROM users WHERE openid = ?').get(openid)
    if (!existing) {
      db.prepare('INSERT INTO users (openid) VALUES (?)').run(openid)
    }

    return { token }
  })

  app.post('/refresh', async (req, reply) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'no token' })
    }

    try {
      const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { openid: string }
      const token = jwt.sign({ openid: decoded.openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
      return { token }
    } catch {
      return reply.status(401).send({ error: 'invalid token' })
    }
  })
}

export function verifyToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { openid: string }
    return decoded.openid
  } catch {
    return null
  }
}
