import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

/* ── simple in-memory rate limiter ── */
const rateMap = new Map<string, { n: number; reset: number }>()
function allow(ip: string) {
  const now = Date.now()
  const e = rateMap.get(ip)
  if (!e || now > e.reset) { rateMap.set(ip, { n: 1, reset: now + 60_000 }); return true }
  if (e.n >= 10) return false
  e.n++; return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'local'
  if (!allow(ip)) return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429 })

  const { message, history = [] } = await req.json()
  if (!message?.trim()) return new Response(JSON.stringify({ error: 'Empty message' }), { status: 400 })

  /* ── fetch context ── */
  const [
    { count: total },
    { count: sold },
    { count: available },
    { data: soldApts },
    { data: clients },
    { data: projects },
  ] = await Promise.all([
    sb.from('apartments').select('*', { count: 'exact', head: true }),
    sb.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    sb.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    sb.from('apartments').select('price').eq('status', 'sold'),
    sb.from('clients').select('full_name,status,budget_usd,created_at').order('created_at', { ascending: false }).limit(20),
    sb.from('projects').select('id,name,location'),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count: thisMonth } = await sb.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold').gte('updated_at', monthStart)

  const ctx = {
    apartments: { total, sold, available, revenue: soldApts?.reduce((s, a) => s + (a.price ?? 0), 0) ?? 0, this_month_sold: thisMonth },
    clients: clients ?? [],
    projects: projects ?? [],
    date: now.toISOString().split('T')[0],
  }

  /* ── stream from Claude ── */
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are PropTech UZ, an intelligent assistant for a real estate CRM in Uzbekistan.
You have access to live business data below. Answer questions about sales, clients, apartments
and projects in RUSSIAN language. Be concise, use exact numbers from the data. Today: ${ctx.date}

DATA:
${JSON.stringify(ctx, null, 2)}`,
    messages: [
      ...history.slice(-8).map((h: { role: string; content: string }) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message.slice(0, 2000) },
    ],
  })

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta: { text: chunk.delta.text } })}\n\n`))
          }
        }
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) { controller.error(err) }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}

