import type { NextApiRequest, NextApiResponse } from 'next'

const BOT = process.env.BOT_SERVER_URL || 'http://localhost:4000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${BOT}/api/status`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`Bot server error: ${response.status}`)
    const data = await response.json()
    res.status(200).json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(503).json({
      ready: false,
      error: 'Bot server inaccessible',
      detail: message,
    })
  }
}
