import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json()

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const [apts, clients, salesData] = await Promise.all([
      supabase.from('apartments').select('status, price'),
      supabase.from('clients').select('status, budget_usd'),
      supabase.from('sales').select('price')
    ])

    const sold      = apts.data?.filter((a: { status: string }) => a.status === 'sold').length ?? 0
    const available = apts.data?.filter((a: { status: string }) => a.status === 'available').length ?? 0
    const reserved  = apts.data?.filter((a: { status: string }) => a.status === 'reserved').length ?? 0
    const revenue   = salesData.data?.reduce((s: number, r: { price: number | null }) => s + (r.price ?? 0), 0) ?? 0

    const systemPrompt = `Ты AI-ассистент CRM системы PropTech UZ.
Отвечай ТОЛЬКО на русском языке. Будь краток и конкретен.

РЕАЛЬНЫЕ ДАННЫЕ:
- Всего квартир: ${apts.data?.length ?? 0}
- Продано: ${sold}
- Свободно: ${available}
- Зарезервировано: ${reserved}
- Клиентов: ${clients.data?.length ?? 0}
- Выручка: $${revenue.toLocaleString()}`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...(history ?? []),
        { role: 'user', content: message }
      ]
    })

    const text = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Ошибка'

    return NextResponse.json({ response: text })

  } catch (err: any) {
    console.error('Chat error:', err.message)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
