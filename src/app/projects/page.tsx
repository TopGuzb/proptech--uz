'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Building2, MapPin, Plus, Pencil, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface Project {
  id: string
  name: string
  location: string
  description?: string
  created_at: string
  total?: number
  sold?: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [form, setForm] = useState({ name: '', location: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProjects() }, [])

  async function loadProjects() {
    setLoading(true)
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    if (data) {
      const enriched = await Promise.all(data.map(async (p) => {
        const { count: total } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id)
        const { count: sold } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'sold')
        return { ...p, total: total || 0, sold: sold || 0 }
      }))
      setProjects(enriched)
    }
    setLoading(false)
  }

  function openAdd() {
    setEditTarget(null)
    setForm({ name: '', location: '', description: '' })
    setShowModal(true)
  }

  function openEdit(p: Project) {
    setEditTarget(p)
    setForm({ name: p.name, location: p.location, description: p.description || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    if (editTarget) {
      await supabase.from('projects').update({ name: form.name, location: form.location, description: form.description }).eq('id', editTarget.id)
      setToast({ msg: 'Project updated', type: 'success' })
    } else {
      await supabase.from('projects').insert({ name: form.name, location: form.location, description: form.description })
      setToast({ msg: 'Project created', type: 'success' })
    }
    setSaving(false)
    setShowModal(false)
    loadProjects()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await supabase.from('projects').delete().eq('id', deleteTarget.id)
    setShowDeleteModal(false)
    setDeleteTarget(null)
    setToast({ msg: 'Project deleted', type: 'error' })
    loadProjects()
  }

  const gradients = [
    'linear-gradient(135deg, #6366f1, #818cf8)',
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ec4899, #f472b6)',
    'linear-gradient(135deg, #3b82f6, #60a5fa)',
  ]

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Projects
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{projects.length} active projects</p>
        </div>
        <button onClick={openAdd} className="btn-gradient" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          <Plus size={15} /> New Project
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[0,1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {projects.map((p, i) => {
            const pct = p.total ? Math.round((p.sold! / p.total) * 100) : 0
            return (
              <div
                key={p.id}
                style={{
                  background: '#0d1117',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
                  const actions = e.currentTarget.querySelector('.card-actions') as HTMLElement
                  if (actions) actions.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  const actions = e.currentTarget.querySelector('.card-actions') as HTMLElement
                  if (actions) actions.style.opacity = '0'
                }}
              >
                {/* Top gradient border */}
                <div style={{ height: 3, background: gradients[i % gradients.length] }} />

                {/* Action buttons */}
                <div className="card-actions" style={{
                  position: 'absolute',
                  top: 16,
                  right: 12,
                  display: 'flex',
                  gap: 6,
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  zIndex: 10,
                }}>
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(p) }}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)',
                      color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(p); setShowDeleteModal(true) }}
                    style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)',
                      color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <Link href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '20px 20px 18px' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: gradients[i % gradients.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}>
                      <Building2 size={20} color="white" />
                    </div>

                    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 6, letterSpacing: '-0.2px' }}>
                      {p.name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 12, marginBottom: 16 }}>
                      <MapPin size={11} />
                      {p.location || 'No location'}
                    </div>

                    {/* Progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                        <span>{p.sold} sold of {p.total}</span>
                        <span style={{ color: pct > 70 ? '#10b981' : pct > 30 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: gradients[i % gradients.length],
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 32, width: 440, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
                {editTarget ? 'Edit Project' : 'New Project'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Green City Tower" className="input-dark" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Tashkent, Yunusabad" className="input-dark" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Project description..." className="input-dark" rows={3} style={{ resize: 'none', height: 'auto' }} />
              </div>
              <button onClick={handleSave} disabled={saving} className="btn-gradient" style={{ padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginTop: 8 }}>
                {saving ? 'Saving...' : editTarget ? 'Update Project' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteModal && deleteTarget && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 20,
            padding: 32, width: 380, boxShadow: '0 25px 80px rgba(0,0,0,0.5)', textAlign: 'center',
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={20} color="#f87171" />
            </div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Delete Project?</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
              &quot;{deleteTarget.name}&quot; and all its data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
