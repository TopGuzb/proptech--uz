import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    }

    console.log('API KEY exists:', !!process.env.ANTHROPIC_API_KEY)
    console.log('Message received:', message)

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    // Fetch live data context
    const [apts, clients, salesData] = await Promise.all([
      sb.from('apartments').select('status, price'),
      sb.from('clients').select('status, budget_usd'),
      sb.from('sales').select('price'),
    ])

    const sold      = apts.data?.filter(a => a.status === 'sold').length      || 0
    const available = apts.data?.filter(a => a.status === 'available').length  || 0
    const reserved  = apts.data?.filter(a => a.status === 'reserved').length   || 0
    const revenue   = salesData.data?.reduce((s, r) => s + (r.price || 0), 0) || 0

    const systemPrompt = `Ты AI-ассистент CRM системы PropTech UZ.
Отвечай ТОЛЬКО на русском языке. Будь краток и конкретен.

ДАННЫЕ ПРЯМО СЕЙЧАС:
- Всего квартир: ${apts.data?.length || 0}
- Продано: ${sold}
- Свободно: ${available}
- Зарезервировано: ${reserved}
- Всего клиентов: ${clients.data?.length || 0}
- Выручка: $${revenue.toLocaleString()}

Отвечай на вопросы о продажах, квартирах и клиентах.`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...(history || []).slice(-8).map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message.slice(0, 2000) },
      ],
    })

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text
        : 'Ошибка получения ответа'

    return NextResponse.json({ response: text })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('AI Chat error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
