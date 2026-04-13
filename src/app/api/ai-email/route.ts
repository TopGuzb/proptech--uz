import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const rateMap = new Map<string, { n: number; reset: number }>()
function allow(ip: string) {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.reset) { rateMap.set(ip, { n: 1, reset: now + 60_000 }); return true }
  if (e.n >= 10) return false; e.n++; return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local'
  if (!allow(ip)) return NextResponse.json({ error: 'Rate limit' }, { status: 429 })

  const body = await req.json()
  const name    = String(body.clientName || body.name || '').replace(/<[^>]*>/g, '').slice(0, 200)
  const budget  = Number(body.budget) || 0
  const status  = String(body.status || 'new').replace(/<[^>]*>/g, '').slice(0, 50)
  const notes   = String(body.notes || '').replace(/<[^>]*>/g, '').slice(0, 500)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 600,
    system: 'You are a professional real estate sales manager in Uzbekistan. Write personalized emails in Russian. Return ONLY valid JSON: { "subject": "...", "body": "..." }',
    messages: [{
      role: 'user',
      content: `Write a follow-up sales email for:
Name: ${name}
Status: ${status}
Budget: ${budget ? `$${budget.toLocaleString()}` : 'not specified'}
Notes: ${notes || 'none'}

Tone: warm, professional, action-oriented. JSON only.`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const match = raw.match(/\{[\s\S]*\}/)
  const result = match ? JSON.parse(match[0]) : { subject: 'Уважаемый клиент', body: 'Не удалось сгенерировать письмо.' }

  return NextResponse.json(result)
}

