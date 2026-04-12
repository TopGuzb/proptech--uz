import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Simple rate limiting
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
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 })
  }

  try {
    const { message } = await req.json()
    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Message required' }), { status: 400 })
    }

    // Sanitize input
    const sanitized = message.replace(/<[^>]*>/g, '').slice(0, 2000)

    // Fetch context data from Supabase
    const [
      { count: totalApts },
      { count: soldApts },
      { count: availApts },
      { data: soldData },
      { data: recentClients },
      { data: projects },
    ] = await Promise.all([
      supabase.from('apartments').select('*', { count: 'exact', head: true }),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('apartments').select('price').eq('status', 'sold'),
      supabase.from('clients').select('name, status, budget, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('projects').select('id, name, location'),
    ])

    const revenue = soldData?.reduce((s, a) => s + (a.price || 0), 0) || 0
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { count: thisMonthSales } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold').gte('updated_at', monthStart)

    const contextData = {
      apartments: {
        total: totalApts || 0,
        sold: soldApts || 0,
        available: availApts || 0,
        revenue,
        this_month_sales: thisMonthSales || 0,
      },
      recent_clients: recentClients || [],
      projects: projects || [],
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `You are Proppio AI assistant for a real estate CRM system.
You have access to real-time data about the real estate portfolio.

Current data:
${JSON.stringify(contextData, null, 2)}

Instructions:
- Answer questions about real estate data in Russian
- Be concise, specific, and helpful
- Use exact numbers from the data provided
- Format responses clearly with line breaks when listing data
- If asked something not in the data, say you don't have that information`,
      messages: [{ role: 'user', content: sanitized }],
    })

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const data = JSON.stringify({ delta: { text: chunk.delta.text } })
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
            }
          }
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('AI chat error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
