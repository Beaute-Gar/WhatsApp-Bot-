import type { NextApiRequest, NextApiResponse } from 'next'

const BOT = process.env.BOT_SERVER_URL || 'http://localhost:4000'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { number } = req.body as { number?: string }

  if (!number) {
    return res.status(400).json({ error: 'Numéro requis' })
  }

  const clean = number.replace(/[^0-9]/g, '')
  if (clean.length < 9) {
    return res.status(400).json({ error: 'Numéro invalide' })
  }

  try {
    const response = await fetch(`${BOT}/api/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: clean }),
      signal: AbortSignal.timeout(10000),
    })
    const data = await response.json()
    res.status(response.ok ? 200 : response.status).json(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(503).json({
      error: 'Bot server inaccessible',
      detail: message,
    })
  }
}
