import type { NextApiRequest, NextApiResponse } from 'next'

const BOT = process.env.BOT_SERVER_URL || 'http://localhost:4000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || 'GET'

  try {
    const response = await fetch(`${BOT}/api/scheduled`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method !== 'GET' ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(8000),
    })
    const data = await response.json()
    res.status(response.ok ? 200 : response.status).json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(503).json({ error: 'Bot server inaccessible', detail: message, items: [] })
  }
}
