import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const rateLimitMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  try {
    const body = await req.json()

    // Sanitize inputs
    const name = String(body.name || '').replace(/<[^>]*>/g, '').slice(0, 200)
    const email = String(body.email || '').replace(/<[^>]*>/g, '').slice(0, 200)
    const status = String(body.status || 'new').replace(/<[^>]*>/g, '').slice(0, 50)
    const budget = body.budget ? Number(body.budget) : null

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are a professional real estate sales manager.
Write personalized sales emails in Russian.
Return ONLY a JSON object with "subject" and "body" fields.
No markdown, no extra text, just valid JSON.`,
      messages: [{
        role: 'user',
        content: `Write a personalized follow-up email for this real estate client:
Name: ${name}
Email: ${email}
Status: ${status}
Budget: ${budget ? `$${budget.toLocaleString()}` : 'Not specified'}

The email should be warm, professional, and encourage the next step in the sales process.
Return format: {"subject": "...", "body": "..."}`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const match = text.match(/\{[\s\S]*\}/)
    const result = match ? JSON.parse(match[0]) : { subject: 'Follow-up', body: 'Could not generate email.' }

    return NextResponse.json(result)
  } catch (err) {
    console.error('AI email error:', err)
    return NextResponse.json({ error: 'Failed to generate email' }, { status: 500 })
  }
}
