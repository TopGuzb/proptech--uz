'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import FloorPlan from '@/components/FloorPlan'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Building2, Plus, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Project { id: string; name: string; location: string }
interface Building { id: string; name: string; project_id: string; _total?: number; _sold?: number }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject]     = useState<Project | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [activeBld, setActiveBld] = useState<string | null>(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [bName, setBName]         = useState('')
  const [toast, setToast]         = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)

  const load = async () => {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single()
    setProject(proj)
    const { data: blds } = await supabase.from('buildings').select('*').eq('project_id', id).order('created_at')
    if (blds) {
      const enriched = await Promise.all(blds.map(async b => {
        const [{ count: t }, { count: s }] = await Promise.all([
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('building_id', b.id),
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('building_id', b.id).eq('status', 'sold'),
        ])
        return { ...b, _total: t ?? 0, _sold: s ?? 0 }
      }))
      setBuildings(enriched)
      if (!activeBld && enriched.length > 0) setActiveBld(enriched[0].id)
    }
  }
  useEffect(() => { if (id) load() }, [id])

  async function addBuilding() {
    if (!bName.trim()) return
    const { data, error } = await supabase
      .from('buildings')
      .insert({ project_id: id, name: bName, floors_count: 1 })
      .select()
      .single()
    if (error) {
      console.error('Building insert error:', error)
      console.error('Error details:', JSON.stringify(error))
      setToast({ msg: error.message, type: 'error' })
      return
    }
    if (data) { setActiveBld(data.id); setBName(''); setShowAdd(false); setToast({ msg: 'Building added', type: 'success' }); load() }
  }

  if (!project) return <AppShell><div style={{ color: '#64748b', padding: 48, textAlign: 'center' }}>Loading…</div></AppShell>

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={13} /> Back to Projects
      </Link>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.4px', marginBottom: 3 }}>{project.name}</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>{project.location}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/projects/${id}/bulk-generator`)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
          ⚡ Bulk Generator
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Buildings list */}
        <div style={{ width: 210, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Buildings</span>
            <button onClick={() => setShowAdd(true)} style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
          </div>
          {buildings.map(b => {
            const pct = b._total ? Math.round((b._sold! / b._total) * 100) : 0
            const active = activeBld === b.id
            return (
              <div key={b.id} onClick={() => setActiveBld(b.id)} style={{
                padding: '11px 13px', borderRadius: 11, marginBottom: 5, cursor: 'pointer',
                background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.12s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                  <Building2 size={12} color={active ? '#818cf8' : '#64748b'} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: active ? '#e2e8f0' : '#94a3b8' }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#475569', marginBottom: 5 }}>{b._total} units · {pct}% sold</div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius: 3 }} />
                </div>
              </div>
            )
          })}
          {buildings.length === 0 && <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No buildings</div>}
        </div>

        {/* Floor plan */}
        <div className="card" style={{ flex: 1, padding: 22 }}>
          {activeBld ? (
            <>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
                {buildings.find(b => b.id === activeBld)?.name} — Floor Plan
              </h3>
              <FloorPlan building_id={activeBld} />
            </>
          ) : (
            <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: 48 }}>Select a building to view its floor plan</div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="modal-bg" onClick={() => setShowAdd(false)}>
          <div className="modal-box" style={{ width: 340, padding: '26px 30px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Add Building</h3>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</label>
            <input className="input" placeholder="Block A" value={bName} onChange={e => setBName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBuilding()} style={{ marginBottom: 14 }} autoFocus />
            <button onClick={addBuilding} className="btn-primary" style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14 }}>Add Building</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
