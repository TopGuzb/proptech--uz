import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const building_id         = String(body.building_id || '').slice(0, 100)
  const floors              = Math.min(Math.max(parseInt(body.floors) || 10, 1), 50)
  const apartments_per_floor = Math.min(Math.max(parseInt(body.apartments_per_floor) || 4, 1), 20)
  const price               = Math.max(parseFloat(body.price) || 80_000, 0)
  const size_m2             = Math.max(parseFloat(body.size_m2 || body.size) || 60, 1)

  if (!building_id) return NextResponse.json({ error: 'building_id required' }, { status: 400 })

  let created = 0

  for (let f = 1; f <= floors; f++) {
    /* create or find floor */
    const { data: floorRow } = await sb.from('floors')
      .upsert({ building_id, floor_number: f, name: `Этаж ${f}` }, { onConflict: 'building_id,floor_number' })
      .select('id').single()

    const floorId = floorRow?.id
    if (!floorId) continue

    const apts = Array.from({ length: apartments_per_floor }, (_, a) => ({
      building_id,
      floor_id: floorId,
      floor: f,
      number: `${String(f).padStart(2,'0')}${String(a + 1).padStart(2,'0')}`,
      status: 'available',
      price: Math.round(price * (1 + (f - 1) * 0.005)),
      size: size_m2,
      rooms: size_m2 > 80 ? 3 : size_m2 > 55 ? 2 : 1,
    }))

    const { data: inserted } = await sb.from('apartments').insert(apts).select('id')
    created += inserted?.length ?? 0
  }

  return NextResponse.json({ created })
}
