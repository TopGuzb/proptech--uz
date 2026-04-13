'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Building2, MapPin, Plus, Pencil, Trash2, X } from 'lucide-react'
import Link from 'next/link'

interface Project { id: string; name: string; location: string; created_at: string; _total?: number; _sold?: number }

const GRAD = [
  'linear-gradient(135deg,#6366f1,#818cf8)',
  'linear-gradient(135deg,#10b981,#34d399)',
  'linear-gradient(135deg,#f59e0b,#fbbf24)',
  'linear-gradient(135deg,#ec4899,#f472b6)',
  'linear-gradient(135deg,#3b82f6,#60a5fa)',
  'linear-gradient(135deg,#8b5cf6,#a78bfa)',
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'add'|'edit'|'delete'|null>(null)
  const [target,   setTarget]   = useState<Project | null>(null)
  const [form,     setForm]     = useState({ name: '', location: '' })
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) {
      const enriched = await Promise.all(data.map(async p => {
        const [{ count: t }, { count: s }] = await Promise.all([
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id),
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'sold'),
        ])
        return { ...p, _total: t ?? 0, _sold: s ?? 0 }
      }))
      setProjects(enriched)
    }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openAdd()           { setTarget(null); setForm({ name:'', location:'' }); setModal('add') }
  function openEdit(p: Project){ setTarget(p);    setForm({ name: p.name, location: p.location ?? '' }); setModal('edit') }
  function openDel(p: Project) { setTarget(p); setModal('delete') }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    if (modal === 'edit' && target) {
      const { error } = await supabase
        .from('projects')
        .update({ name: form.name, location: form.location })
        .eq('id', target.id)
      if (error) {
        console.error('Project update error:', error)
        console.error('Error details:', JSON.stringify(error))
        setToast({ msg: error.message, type: 'error' })
        setSaving(false); return
      }
      setToast({ msg: 'Project updated', type: 'success' })
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name: form.name, location: form.location })
        .select()
        .single()
      if (error) {
        console.error('Project insert error:', error)
        console.error('Error details:', JSON.stringify(error))
        setToast({ msg: error.message, type: 'error' })
        setSaving(false); return
      }
      console.log('Project created:', data)
      setToast({ msg: 'Project created', type: 'success' })
    }
    setSaving(false); setModal(null); load()
  }

  async function del() {
    if (!target) return
    const { error } = await supabase.from('projects').delete().eq('id', target.id)
    if (error) {
      console.error('Project delete error:', error)
      console.error('Error details:', JSON.stringify(error))
      setToast({ msg: error.message, type: 'error' })
      return
    }
    setToast({ msg: 'Deleted', type: 'error' }); setModal(null); load()
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 23, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.4px', marginBottom: 3 }}>Projects</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>{projects.length} active projects</p>
        </div>
        <button onClick={openAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 11, fontSize: 13 }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 196, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {projects.map((p, i) => {
            const pct = p._total ? Math.round((p._sold! / p._total) * 100) : 0
            return (
              <div key={p.id} className="card card-hover" style={{ overflow: 'hidden', position: 'relative' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.35)'; const acts = e.currentTarget.querySelector('.card-acts') as HTMLElement | null; if (acts) acts.style.opacity = '1' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; const acts = e.currentTarget.querySelector('.card-acts') as HTMLElement | null; if (acts) acts.style.opacity = '0' }}
              >
                {/* gradient top bar */}
                <div style={{ height: 4, background: GRAD[i % GRAD.length] }} />

                {/* hover actions */}
                <div className="card-acts" style={{ position: 'absolute', top: 14, right: 12, display: 'flex', gap: 5, opacity: 0, transition: 'opacity 0.15s', zIndex: 2 }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={12} /></button>
                  <button onClick={e => { e.stopPropagation(); openDel(p) }} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                </div>

                <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none', display: 'block', padding: '18px 18px 16px' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: GRAD[i % GRAD.length], display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Building2 size={19} color="white" />
                  </div>
                  <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 5, letterSpacing: '-0.2px' }}>{p.name}</h3>
                  {p.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12, marginBottom: 14 }}>
                      <MapPin size={11} /> {p.location}
                    </div>
                  )}
                  {/* progress */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 5 }}>
                      <span>{p._sold} of {p._total} sold</span>
                      <span style={{ color: pct > 70 ? '#10b981' : pct > 30 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: GRAD[i % GRAD.length], borderRadius: 4, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-bg" onClick={() => setModal(null)}>
          <div className="modal-box" style={{ width: 440, padding: '32px 36px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>{modal === 'edit' ? 'Edit Project' : 'New Project'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={17} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[{k:'name',l:'Project Name *',ph:'Green City Tower'},{k:'location',l:'Location',ph:'Tashkent, Yunusabad'}].map(({k,l,ph}) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</label>
                  <input className="input" placeholder={ph} value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <button onClick={save} disabled={saving} className="btn-primary" style={{ padding: '12px', borderRadius: 12, fontSize: 14, marginTop: 4 }}>
                {saving ? 'Saving…' : modal === 'edit' ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {modal === 'delete' && target && (
        <div className="modal-bg">
          <div className="modal-box" style={{ width: 360, padding: '32px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Trash2 size={20} color="#f87171" /></div>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Delete Project?</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 22 }}>"{target.name}" and all its data will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setModal(null)} className="btn-ghost" style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)' }}>Cancel</button>
              <button onClick={del} style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

