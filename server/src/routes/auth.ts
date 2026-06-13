import { FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'health-app-secret-change-me'
const JWT_EXPIRES_IN = '7d'
const WX_APPID = process.env.WX_APPID || ''
const WX_SECRET = process.env.WX_SECRET || ''

interface WxLoginBody {
  code: string
}

export async function authRoutes(app: FastifyInstance) {
  // Dev login — skip WeChat, sign JWT directly (only for H5 testing)
  app.post<{ Body: { openid: string } }>('/dev-login', async (req, reply) => {
    const openid = req.body?.openid || 'test_auto_user'
    const token = jwt.sign({ openid }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
    const db = (app as any).db
    const existing = db.prepare('SELECT openid FROM users WHERE openid = ?').get(openid)
    if (!existing) {
      db.prepare('INSERT INTO users (openid) VALUES (?)').run(openid)
    }
    return { token }
  })

  app.post<{ Body: WxLoginBody }>('/login', async (req, reply) => {
    const { code } = req.body

    if (!code) {
      return reply.status(400).send({ error: 'code is required' })
    }

    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`

    const res = await fetch(wxUrl)
    const data = await res.json() as { openid?: string; errcode?: number; errmsg?: string }

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
