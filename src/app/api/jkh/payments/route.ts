import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')

  let query = sb.from('jkh_payments').select('*').order('apartment_number')
  if (month) query = query.eq('month', month)

  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Generate bills for all sold apartments for a given month
  if (body.action === 'generate') {
    const month = body.month || new Date().toISOString().slice(0, 7)

    const { data: residents, error: rErr } = await sb
      .from('residents')
      .select('apartment_id, full_name, apartments(number)')

    if (rErr) return Response.json({ error: rErr.message }, { status: 400 })
    if (!residents?.length) return Response.json({ created: 0, message: 'No residents found' })

    let created = 0
    for (const r of residents) {
      const aptNumber = (r.apartments as any)?.number || r.apartment_id

      // Skip if bill already exists for this month
      const { count } = await sb
        .from('jkh_payments')
        .select('*', { count: 'exact', head: true })
        .eq('apartment_number', aptNumber)
        .eq('month', month)

      if (count && count > 0) continue

      const { error } = await sb.from('jkh_payments').insert({
        apartment_number: aptNumber,
        resident_name: r.full_name || '—',
        month,
        electricity: 50,
        water: 30,
        gas: 20,
        maintenance: 25,
        total: 125,
        status: 'unpaid',
      })
      if (!error) created++
    }

    return Response.json({ created, month })
  }

  // Single insert
  const { data, error } = await sb.from('jkh_payments').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await sb
    .from('jkh_payments')
    .update({ status: status || 'paid' })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

