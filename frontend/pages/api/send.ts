import type { NextApiRequest, NextApiResponse } from 'next'

const BOT = process.env.BOT_SERVER_URL || 'http://localhost:4000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { groupId, message } = req.body as { groupId?: string; message?: string }

  if (!groupId || !message) {
    return res.status(400).json({ error: 'groupId et message requis' })
  }

  try {
    const response = await fetch(`${BOT}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, message }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await response.json()
    res.status(response.ok ? 200 : response.status).json(data)
  } catch (err: unknown) {
    const message2 = err instanceof Error ? err.message : 'Unknown error'
    res.status(503).json({ error: 'Bot server inaccessible', detail: message2 })
  }
}
