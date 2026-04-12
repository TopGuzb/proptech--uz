import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const building_id = String(body.building_id || '').slice(0, 100)
    const floors = Math.min(Math.max(parseInt(body.floors) || 10, 1), 50)
    const apartments_per_floor = Math.min(Math.max(parseInt(body.apartments_per_floor) || 4, 1), 20)
    const price = Math.max(parseFloat(body.price) || 80000, 0)
    const size = Math.max(parseFloat(body.size) || 60, 1)

    if (!building_id) {
      return NextResponse.json({ error: 'building_id required' }, { status: 400 })
    }

    const apartments = []

    for (let floor = 1; floor <= floors; floor++) {
      for (let apt = 1; apt <= apartments_per_floor; apt++) {
        const aptNumber = String(floor).padStart(2, '0') + String(apt).padStart(2, '0')
        // Vary price slightly per floor (higher floors = higher price)
        const floorMultiplier = 1 + (floor - 1) * 0.005
        apartments.push({
          building_id,
          floor,
          number: aptNumber,
          status: 'available',
          price: Math.round(price * floorMultiplier),
          size,
          rooms: size > 80 ? 3 : size > 55 ? 2 : 1,
        })
      }
    }

    // Insert in batches of 100
    let created = 0
    for (let i = 0; i < apartments.length; i += 100) {
      const batch = apartments.slice(i, i + 100)
      const { data, error } = await supabase.from('apartments').insert(batch).select('id')
      if (error) throw error
      created += data?.length || 0
    }

    return NextResponse.json({ created })
  } catch (err) {
    console.error('Bulk generate error:', err)
    return NextResponse.json({ error: 'Failed to generate apartments' }, { status: 500 })
  }
}
