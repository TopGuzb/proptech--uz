import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await sb
    .from('jkh_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { apartment_number, resident_name, category, title, description, priority } = body

  if (!title || !apartment_number) {
    return Response.json({ error: 'title and apartment_number are required' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('jkh_requests')
    .insert({
      apartment_number,
      resident_name: resident_name || '',
      category: category || 'repair',
      title,
      description: description || '',
      status: 'new',
      priority: priority || 'medium',
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  if (!id || !status) return Response.json({ error: 'id and status required' }, { status: 400 })

  const { data, error } = await sb
    .from('jkh_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}
