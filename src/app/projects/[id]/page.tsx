'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import FloorPlan from '@/components/FloorPlan'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface Project {
  id: string
  name: string
  location: string
}

interface Building {
  id: string
  name: string
  floors?: number
  project_id: string
  total?: number
  sold?: number
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [activeBuilding, setActiveBuilding] = useState<string | null>(null)
  const [showAddBuilding, setShowAddBuilding] = useState(false)
  const [buildingName, setBuildingName] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => { if (id) loadData() }, [id])

  async function loadData() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)

    const { data: bldgs } = await supabase.from('buildings').select('*').eq('project_id', id).order('created_at')
    if (bldgs) {
      const enriched = await Promise.all(bldgs.map(async (b) => {
        const { count: total } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('building_id', b.id)
        const { count: sold } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('building_id', b.id).eq('status', 'sold')
        return { ...b, total: total || 0, sold: sold || 0 }
      }))
      setBuildings(enriched)
      if (!activeBuilding && enriched.length > 0) setActiveBuilding(enriched[0].id)
    }
  }

  async function addBuilding() {
    if (!buildingName.trim()) return
    const { data } = await supabase.from('buildings').insert({ name: buildingName, project_id: id }).select().single()
    if (data) {
      setToast({ msg: 'Building added', type: 'success' })
      setBuildingName('')
      setShowAddBuilding(false)
      setActiveBuilding(data.id)
      loadData()
    }
  }

  if (!project) return (
    <AppShell>
      <div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>Loading...</div>
    </AppShell>
  )

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back to Projects
        </Link>
        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>
          {project.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: 14 }}>{project.location}</p>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Buildings list */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Buildings</span>
            <button
              onClick={() => setShowAddBuilding(true)}
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Plus size={12} />
            </button>
          </div>
          {buildings.map(b => {
            const pct = b.total ? Math.round((b.sold! / b.total) * 100) : 0
            const isActive = activeBuilding === b.id
            return (
              <div
                key={b.id}
                onClick={() => setActiveBuilding(b.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: isActive ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Building2 size={13} color={isActive ? '#818cf8' : '#64748b'} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#e2e8f0' : '#94a3b8' }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 5 }}>
                  {b.total} units · {pct}% sold
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
          {buildings.length === 0 && (
            <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No buildings yet</div>
          )}
        </div>

        {/* Floor plan */}
        <div style={{ flex: 1, background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
          {activeBuilding ? (
            <>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
                {buildings.find(b => b.id === activeBuilding)?.name} — Floor Plan
              </h3>
              <FloorPlan building_id={activeBuilding} />
            </>
          ) : (
            <div style={{ color: '#334155', fontSize: 14, textAlign: 'center', padding: 48 }}>
              Select a building to view its floor plan
            </div>
          )}
        </div>
      </div>

      {/* Add Building Modal */}
      {showAddBuilding && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowAddBuilding(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 28, width: 360, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Add Building</h3>
              <button onClick={() => setShowAddBuilding(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Building Name</label>
            <input value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="Block A" className="input-dark" style={{ marginBottom: 16 }} onKeyDown={e => e.key === 'Enter' && addBuilding()} />
            <button onClick={addBuilding} className="btn-gradient" style={{ width: '100%', padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
              Add Building
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
