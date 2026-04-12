import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const { building_id, floors, apartments_per_floor, price, size_m2 } = await request.json()

  if (!building_id) return Response.json({ error: 'building_id required' }, { status: 400 })

  let created = 0

  for (let f = 1; f <= floors; f++) {
    const { data: floor, error: floorErr } = await supabase
      .from('floors')
      .insert({ building_id, floor_number: f })
      .select()
      .single()

    if (floorErr || !floor) {
      console.error(`Floor ${f} insert error:`, floorErr)
      continue
    }

    for (let a = 1; a <= apartments_per_floor; a++) {
      const rooms_count = a <= 1 ? 1 : a <= 2 ? 2 : a <= 3 ? 3 : 4

      const { error: aptErr } = await supabase
        .from('apartments')
        .insert({
          floor_id: floor.id,
          building_id,
          number: `${f}0${a}`,
          rooms_count,
          size_m2: size_m2 || 60,
          price: price || 80000,
          status: 'available',
        })

      if (aptErr) {
        console.error(`Apt ${f}0${a} insert error:`, aptErr)
      } else {
        created++
      }
    }
  }

  return Response.json({ created, success: true })
}
