'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'

interface Project { id: string; name: string }
interface Building { id: string; name: string; project_id: string }

export default function BulkGeneratorPage() {
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([])

  const [projectId, setProjectId] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [floors, setFloors] = useState('5')
  const [aptsPerFloor, setAptsPerFloor] = useState('4')
  const [rooms, setRooms] = useState('2')
  const [size, setSize] = useState('65')
  const [price, setPrice] = useState('80000')

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [count, setCount] = useState(0)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.from('projects').select('id, name').then(({ data }) => {
      if (data) setProjects(data)
    })
    supabase.from('buildings').select('id, name, project_id').then(({ data }) => {
      if (data) setBuildings(data)
    })
  }, [])

  useEffect(() => {
    if (projectId) {
      setFilteredBuildings(buildings.filter(b => b.project_id === projectId))
      setBuildingId('')
    }
  }, [projectId, buildings])

  const total = Number(floors) * Number(aptsPerFloor)

  async function generate() {
    if (!buildingId || !projectId) {
      setErr('Выберите проект и здание')
      return
    }
    setLoading(true)
    setDone(false)
    setErr('')
    setProgress(0)
    setCount(0)

    try {
      const floorIds: string[] = []
      for (let f = 1; f <= Number(floors); f++) {
        const { data, error } = await supabase
          .from('floors')
          .insert({ building_id: buildingId, floor_number: f })
          .select('id')
          .single()
        if (error) throw new Error('Ошибка этажа: ' + error.message)
        floorIds.push(data.id)
      }

      const apts: any[] = []
      for (let f = 0; f < floorIds.length; f++) {
        for (let a = 1; a <= Number(aptsPerFloor); a++) {
          apts.push({
            floor_id: floorIds[f],
            building_id: buildingId,
            project_id: projectId,
            number: `${f + 1}${String(a).padStart(2, '0')}`,
            rooms_count: Number(rooms),
            size_m2: Number(size),
            price: Number(price),
            status: 'available'
          })
        }
      }

      let inserted = 0
      const BATCH = 20
      for (let i = 0; i < apts.length; i += BATCH) {
        const { error } = await supabase
          .from('apartments')
          .insert(apts.slice(i, i + BATCH))
        if (error) throw new Error('Ошибка вставки: ' + error.message)
        inserted += Math.min(BATCH, apts.length - i)
        setProgress(Math.round((inserted / apts.length) * 100))
      }

      setCount(inserted)
      setDone(true)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold text-white mb-1">⚡ Bulk Generator</h1>
        <p className="text-gray-400 mb-8">Создай сотни квартир за секунды</p>

        {done && (
          <div className="rounded-2xl bg-green-500/10 border border-green-500/40 p-8 text-center mb-6">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-green-400 text-3xl font-bold mb-1">{count} квартир создано!</p>
            <p className="text-gray-400 mb-6">{floors} этажей × {aptsPerFloor} квартир</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { setDone(false); setProgress(0) }}
                className="px-5 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm">
                Создать ещё
              </button>
              <button onClick={() => router.push('/projects')}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
                Смотреть проект →
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/40 p-4 mb-6">
            <p className="text-red-400 font-bold">❌ Ошибка</p>
            <p className="text-red-300 text-sm mt-1">{err}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-4 mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>⏳ Создаём квартиры...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div className="bg-indigo-500 h-3 rounded-full transition-all"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {!done && (
          <div className="rounded-2xl bg-[#161b22] border border-[#30363d] p-6 space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Проект</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full rounded-xl bg-[#0d1117] border border-[#30363d] text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                <option value="">— выберите проект —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Здание</label>
              <select value={buildingId} onChange={e => setBuildingId(e.target.value)}
                disabled={!projectId}
                className="w-full rounded-xl bg-[#0d1117] border border-[#30363d] text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-40">
                <option value="">— выберите здание —</option>
                {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ['Этажей', floors, setFloors],
                ['Квартир/этаж', aptsPerFloor, setAptsPerFloor],
                ['Комнат', rooms, setRooms],
                ['Площадь (м²)', size, setSize],
              ].map(([label, val, set]: any) => (
                <div key={label}>
                  <label className="text-sm text-gray-400 mb-1 block">{label}</label>
                  <input type="number" value={val} onChange={e => set(e.target.value)}
                    className="w-full rounded-xl bg-[#0d1117] border border-[#30363d] text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Цена ($)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full rounded-xl bg-[#0d1117] border border-[#30363d] text-white px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>

            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 text-center">
              <span className="text-indigo-400 font-bold text-lg">{total}</span>
              <span className="text-gray-400 text-sm ml-2">квартир будет создано</span>
            </div>

            <button type="button" onClick={generate}
              disabled={loading || !buildingId}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors">
              {loading ? `Создаём... ${progress}%` : `⚡ Создать ${total} квартир`}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
