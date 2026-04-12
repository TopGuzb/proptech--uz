import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type  = searchParams.get('type') || 'requests'
  const month = searchParams.get('month')

  if (type === 'requests') {
    const { data, error } = await sb
      .from('jkh_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ data })
  }

  if (type === 'payments') {
    let query = sb.from('jkh_payments').select('*').order('apartment_number')
    if (month) query = query.eq('month', month)
    const { data, error } = await query
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ data })
  }

  return Response.json({ error: 'Invalid type. Use ?type=requests or ?type=payments' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, table, data, id, updates } = body

  if (!['jkh_requests', 'jkh_payments'].includes(table)) {
    return Response.json({ error: 'Invalid table' }, { status: 400 })
  }

  if (action === 'insert') {
    const { data: result, error } = await sb.from(table).insert(data).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ data: result })
  }

  if (action === 'update') {
    const { data: result, error } = await sb.from(table).update(updates).eq('id', id).select().single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ data: result })
  }

  return Response.json({ error: 'Invalid action. Use insert or update' }, { status: 400 })
}
