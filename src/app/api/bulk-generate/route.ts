import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { building_id, floors, apartments_per_floor, price, size_m2, rooms_count } = await request.json()

    if (!building_id) return Response.json({ error: 'building_id required' }, { status: 400 })

    console.log('Bulk generation request:', { building_id, floors, apartments_per_floor, price, size_m2, rooms_count })

    // Get project_id from building
    const { data: building, error: buildingErr } = await supabase
      .from('buildings')
      .select('project_id')
      .eq('id', building_id)
      .single()

    if (buildingErr || !building) {
      console.error('Building fetch error:', buildingErr)
      return Response.json({ error: 'Building not found', details: buildingErr?.message }, { status: 404 })
    }

    const project_id = building.project_id
    console.log('Found project_id:', project_id)

    // Create floors and get their IDs
    const floorIds: Record<number, string> = {}
    
    for (let f = 1; f <= floors; f++) {
      // Check if floor already exists
      const { data: existingFloor } = await supabase
        .from('floors')
        .select('id')
        .eq('building_id', building_id)
        .eq('floor_number', f)
        .single()

      if (existingFloor) {
        floorIds[f] = existingFloor.id
        console.log(`Floor ${f} already exists, using ID: ${existingFloor.id}`)
      } else {
        // Create new floor
        const { data: floor, error: floorErr } = await supabase
          .from('floors')
          .insert({
            building_id,
            floor_number: f
          })
          .select('id')
          .single()

        if (floorErr || !floor) {
          console.error(`Floor ${f} insert error:`, floorErr)
          return Response.json({ error: `Failed to create floor ${f}`, details: floorErr?.message }, { status: 500 })
        }

        floorIds[f] = floor.id
        console.log(`Created floor ${f} with ID: ${floor.id}`)
      }
    }

    // Prepare all apartments
    const apartments = []
    for (let floor = 1; floor <= floors; floor++) {
      for (let apt = 1; apt <= apartments_per_floor; apt++) {
        const aptNumber = `${floor}${apt.toString().padStart(2, '0')}`
        apartments.push({
          floor_id: floorIds[floor],
          building_id,
          project_id,
          number: aptNumber,
          rooms_count: rooms_count || (apt <= 1 ? 1 : apt <= 2 ? 2 : apt <= 3 ? 3 : 4),
          size_m2: size_m2 || 65,
          price: price || 80000,
          status: 'available'
        })
      }
    }

    console.log('Prepared apartments sample:', apartments[0])
    console.log('Total apartments to insert:', apartments.length)

    // Insert apartments in batches of 50
    const batchSize = 50
    let totalInserted = 0
    let insertError = null

    for (let i = 0; i < apartments.length; i += batchSize) {
      const batch = apartments.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('apartments')
        .insert(batch)
        .select()

      if (error) {
        console.error('Batch insert error:', error)
        insertError = error
        break
      }

      totalInserted += batch.length
      console.log(`Batch ${Math.floor(i/batchSize) + 1}: Inserted ${batch.length} apartments`)
    }

    if (insertError) {
      return Response.json({ 
        success: false, 
        count: 0, 
        error: insertError.message,
        details: 'Batch insert failed'
      }, { status: 500 })
    }

    console.log('Bulk generation completed successfully:', { totalInserted, floors, apartments_per_floor })

    return Response.json({ 
      success: true, 
      count: totalInserted,
      floors,
      apartments_per_floor
    })

  } catch (error) {
    console.error('Bulk generation error:', error)
    return Response.json({ 
      success: false, 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
