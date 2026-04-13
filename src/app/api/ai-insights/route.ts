import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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

  const [
    { count: total }, { count: sold }, { count: available },
    { data: soldApts }, { data: clients }, { count: projects },
  ] = await Promise.all([
    sb.from('apartments').select('*', { count: 'exact', head: true }),
    sb.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    sb.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    sb.from('apartments').select('price').eq('status', 'sold'),
    sb.from('clients').select('status,budget').limit(200),
    sb.from('projects').select('*', { count: 'exact', head: true }),
  ])

  const revenue = soldApts?.reduce((s, a) => s + (a.price ?? 0), 0) ?? 0
  const avgBudget = clients?.filter(c => c.budget).reduce((s, c, _, arr) => s + (c.budget / arr.length), 0) ?? 0

  const data = {
    total_apartments: total ?? 0, sold: sold ?? 0, available: available ?? 0,
    sold_pct: total ? Math.round(((sold ?? 0) / total) * 100) : 0,
    revenue, avg_client_budget: Math.round(avgBudget),
    clients: clients?.length ?? 0, projects: projects ?? 0,
    clients_by_status: Object.fromEntries(
      ['new','contacted','viewing','reserved','bought'].map(s => [s, clients?.filter(c => c.status === s).length ?? 0])
    ),
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 700,
    system: 'Return ONLY a valid JSON array of 3 objects. Each object: { "icon": "emoji", "title": "short title in Russian", "description": "2-3 sentence insight in Russian" }. No markdown, no extra text.',
    messages: [{ role: 'user', content: `Analyze this real estate data and give 3 actionable insights:\n${JSON.stringify(data, null, 2)}` }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '[]'
  const match = raw.match(/\[[\s\S]*\]/)
  const insights = match ? JSON.parse(match[0]) : [{ icon: '📊', title: 'Анализ данных', description: 'Нет данных для анализа.' }]

  return NextResponse.json({ insights })
}

