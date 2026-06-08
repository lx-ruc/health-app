import { FastifyInstance } from 'fastify'
import { verifyToken } from './auth.js'

export async function userRoutes(app: FastifyInstance) {
  app.get('/profile', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const db = (app as any).db
    const user = db.prepare('SELECT * FROM users WHERE openid = ?').get(openid)
    if (!user) return reply.status(404).send({ error: 'user not found' })

    return {
      gender: user.gender,
      ageRange: user.age_range,
      heightRange: user.height_range,
      weightRange: user.weight_range,
      occupation: user.occupation,
      diseases: JSON.parse(user.diseases || '[]'),
    }
  })

  app.put('/profile', async (req, reply) => {
    const openid = verifyToken(req.headers.authorization)
    if (!openid) return reply.status(401).send({ error: 'unauthorized' })

    const body = req.body as {
      gender?: string
      ageRange?: string
      heightRange?: string
      weightRange?: string
      occupation?: string
      diseases?: string[]
    }

    const db = (app as any).db
    db.prepare(`
      UPDATE users SET
        gender = ?, age_range = ?, height_range = ?, weight_range = ?,
        occupation = ?, diseases = ?, updated_at = datetime('now')
      WHERE openid = ?
    `).run(
      body.gender || null,
      body.ageRange || null,
      body.heightRange || null,
      body.weightRange || null,
      body.occupation || null,
      JSON.stringify(body.diseases || []),
      openid,
    )

    return { success: true }
  })
}
