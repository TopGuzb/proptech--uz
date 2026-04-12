import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const [
      { count: total },
      { count: sold },
      { count: available },
      { data: soldData },
      { data: clients },
      { data: projects },
    ] = await Promise.all([
      supabase.from('apartments').select('*', { count: 'exact', head: true }),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('apartments').select('price').eq('status', 'sold'),
      supabase.from('clients').select('status, budget').limit(100),
      supabase.from('projects').select('name'),
    ])

    const revenue = soldData?.reduce((s, a) => s + (a.price || 0), 0) || 0
    const soldPct = total ? Math.round(((sold || 0) / total) * 100) : 0
    const avgBudget = clients?.filter(c => c.budget).reduce((s, c, _, arr) => s + c.budget / arr.length, 0) || 0

    const data = {
      total_apartments: total || 0,
      sold: sold || 0,
      available: available || 0,
      sold_percentage: soldPct,
      total_revenue: revenue,
      client_count: clients?.length || 0,
      average_client_budget: Math.round(avgBudget),
      project_count: projects?.length || 0,
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: 'You are a real estate analytics AI. Return ONLY a JSON array of exactly 3 insight strings in Russian. No markdown, no extra text, just the JSON array.',
      messages: [{
        role: 'user',
        content: `Analyze this real estate data and return 3 actionable insights in Russian as a JSON array:
${JSON.stringify(data, null, 2)}

Return format: ["Insight 1", "Insight 2", "Insight 3"]`,
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\[[\s\S]*\]/)
    const insights = match ? JSON.parse(match[0]) : ['Данных недостаточно для анализа.']

    return NextResponse.json({ insights })
  } catch (err) {
    console.error('AI insights error:', err)
    return NextResponse.json({ insights: ['Не удалось загрузить аналитику.'] }, { status: 500 })
  }
}
