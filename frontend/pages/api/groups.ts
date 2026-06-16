import type { NextApiRequest, NextApiResponse } from 'next'

const BOT = process.env.BOT_SERVER_URL || 'http://localhost:4000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${BOT}/api/groups`, {
        signal: AbortSignal.timeout(8000),
      })
      const data = await response.json()
      res.status(200).json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(503).json({ error: 'Bot server inaccessible', detail: message, groups: [] })
    }
    return
  }

  if (req.method === 'POST') {
    try {
      const response = await fetch(`${BOT}/api/groups/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(8000),
      })
      const data = await response.json()
      res.status(200).json(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      res.status(503).json({ error: 'Bot server inaccessible', detail: message })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
