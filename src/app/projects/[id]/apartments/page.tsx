'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import AppShell from '@/components/AppShell'
import { LoadingSpinner, EmptyState, StatCard } from '@/components/ui'
import type { Apartment } from '@/types'

type ApartmentWithFloor = Apartment & { floors: { floor_number: number } }
type BuildingRow = { id: string; name: string }

export default function ApartmentsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const supabase = createClient()

  const [buildings, setBuildings] = useState<BuildingRow[]>([])
  const [selectedBuilding, setSelectedBuilding] = useState('')
  const [apartments, setApartments] = useState<ApartmentWithFloor[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    supabase
      .from('buildings')
      .select('id, name')
      .eq('project_id', projectId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBuildings(data)
          setSelectedBuilding(data[0].id)
        }
      })
  }, [projectId])

  useEffect(() => {
    if (!selectedBuilding) return
    setLoading(true)
    supabase
      .from('apartments')
      .select('*, floors(floor_number)')
      .eq('building_id', selectedBuilding)
      .order('number')
      .then(({ data }) => {
        if (data) setApartments(data as ApartmentWithFloor[])
        setLoading(false)
      })
  }, [selectedBuilding])

  const filtered = filter === 'all'
    ? apartments
    : apartments.filter(a => a.status === filter)

  // Group by floor
  const byFloor = filtered.reduce((acc, apt) => {
    const floorNum = apt.floors?.floor_number ?? 0
    if (!acc[floorNum]) acc[floorNum] = []
    acc[floorNum].push(apt)
    return acc
  }, {} as Record<number, ApartmentWithFloor[]>)

  const floorNums = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => b - a) // top floor first

  const statusColor = {
    available: 'bg-green-500/20 border-green-500/50 text-green-400',
    reserved:  'bg-amber-500/20 border-amber-500/50 text-amber-400',
    sold:      'bg-red-500/20 border-red-500/50 text-red-400',
  }
  const statusLabel = {
    available: 'Свободна',
    reserved:  'Резерв',
    sold:      'Продана',
  }

  const stats = {
    total:     apartments.length,
    available: apartments.filter(a => a.status === 'available').length,
    reserved:  apartments.filter(a => a.status === 'reserved').length,
    sold:      apartments.filter(a => a.status === 'sold').length,
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('apartments').update({ status }).eq('id', id)
    setApartments(prev =>
      prev.map(a => a.id === id ? { ...a, status: status as ApartmentWithFloor['status'] } : a)
    )
  }

  return (
    <AppShell>
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1">
              ← Назад
            </button>
            <h1 className="text-2xl font-bold text-white">
              🏢 Квартиры
            </h1>
          </div>
          <button
            onClick={() => router.push(`/projects/${projectId}/bulk-generator`)}
            className="px-4 py-2 rounded-xl bg-indigo-600
                       hover:bg-indigo-700 text-white text-sm font-medium">
            ⚡ Bulk Generator
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard label="Всего"    value={stats.total}     color="indigo" />
          <StatCard label="Свободно" value={stats.available} color="green"  icon="🟢" />
          <StatCard label="Резерв"   value={stats.reserved}  color="amber"  icon="🟡" />
          <StatCard label="Продано"  value={stats.sold}      color="red"    icon="🔴" />
        </div>

        {/* Building selector + filter */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {buildings.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBuilding(b.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${selectedBuilding === b.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-[#161b22] border border-[#30363d] text-gray-400 hover:text-white'}`}>
              {b.name}
            </button>
          ))}

          <div className="ml-auto flex gap-2">
            {['all','available','reserved','sold'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                  ${filter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#161b22] border border-[#30363d] text-gray-400'}`}>
                {s === 'all' ? 'Все' : statusLabel[s as keyof typeof statusLabel]}
              </button>
            ))}
          </div>
        </div>

        {/* Floor Plan */}
        {loading ? (
          <LoadingSpinner />
        ) : apartments.length === 0 ? (
          <EmptyState
            icon="🏗️"
            title="Квартир пока нет"
            description="Создай квартиры через Bulk Generator — это займёт несколько секунд."
            action={{
              label: '⚡ Открыть Bulk Generator',
              onClick: () => router.push(`/projects/${projectId}/bulk-generator`),
            }}
          />
        ) : (
          <div className="space-y-3">
            {floorNums.map(floorNum => (
              <div key={floorNum}
                className="rounded-2xl bg-[#161b22] border border-[#30363d] p-4">
                <p className="text-gray-400 text-xs font-medium mb-3">
                  ЭТАЖ {floorNum}
                </p>
                <div className="flex flex-wrap gap-2">
                  {byFloor[floorNum].map(apt => (
                    <div
                      key={apt.id}
                      className={`relative group rounded-xl border p-3 min-w-[110px]
                                  cursor-pointer transition-all hover:scale-105
                                  ${statusColor[apt.status]}`}>
                      <p className="font-bold text-sm">№{apt.number}</p>
                      <p className="text-xs opacity-75 mt-0.5">
                        {apt.rooms_count}к · {apt.size_m2}м²
                      </p>
                      <p className="text-xs font-medium mt-0.5">
                        ${apt.price.toLocaleString()}
                      </p>
                      <p className="text-xs opacity-60 mt-0.5">
                        {statusLabel[apt.status]}
                      </p>

                      {/* Status change on hover */}
                      <div className="absolute inset-0 rounded-xl bg-black/80
                                      opacity-0 group-hover:opacity-100
                                      transition-opacity flex flex-col
                                      items-center justify-center gap-1 p-1">
                        {['available','reserved','sold'].map(st => (
                          <button
                            key={st}
                            onClick={() => updateStatus(apt.id, st)}
                            className={`w-full text-xs py-0.5 rounded-md
                                        font-medium transition-colors
                              ${st === 'available' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                st === 'reserved'  ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                                                     'bg-red-600 hover:bg-red-700 text-white'}`}>
                            {statusLabel[st as keyof typeof statusLabel]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
