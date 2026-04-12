'use client'

import { useEffect, useState } from 'react'
import ResidentShell from '@/components/ResidentShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Zap, Droplets, Flame, Wrench, X, CheckCircle2, Clock, AlertCircle, Bell } from 'lucide-react'

interface Resident {
  id: string; full_name: string; email: string; phone?: string
  move_in_date?: string; apartment_id?: string
}
interface Apartment {
  id: string; number: string; floor_id?: string; size_m2?: number; rooms_count?: number
  buildings?: { name: string }; projects?: { name: string }
}
interface Bill {
  id: string; month: string; electricity: number; water: number; gas: number
  maintenance: number; total: number; status: string
}
interface JkhRequest {
  id: string; title: string; description?: string; category: string
  status: string; priority: string; created_at: string
}

const CATEGORIES = ['water', 'electric', 'repair', 'cleaning', 'security']
const CAT_EMOJI: Record<string, string> = { water: '🚿', electric: '⚡', repair: '🔧', cleaning: '🧹', security: '🔐', other: '📋' }
const PRIORITY_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new:         { label: 'New',         color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  icon: <AlertCircle size={11} /> },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={11} />       },
  done:        { label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircle2 size={11} /> },
}

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  return document.cookie.split(';').reduce((acc, c) => {
    const [k, v] = c.trim().split('=')
    return k === name ? decodeURIComponent(v || '') : acc
  }, '')
}

export default function ResidentDashboard() {
  const [resident, setResident]   = useState<Resident | null>(null)
  const [apt, setApt]             = useState<Apartment | null>(null)
  const [bills, setBills]         = useState<Bill[]>([])
  const [requests, setRequests]   = useState<JkhRequest[]>([])
  const [toast, setToast]         = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [reqModal, setReqModal]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]           = useState({ category: 'repair', title: '', description: '', priority: 'medium' })

  const curMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    const id = getCookie('proppio-resident-id')
    if (!id) return
    loadData(id)
  }, [])

  async function loadData(id: string) {
    const { data: r } = await supabase.from('residents').select('*').eq('id', id).maybeSingle()
    if (!r) return
    setResident(r)

    if (r.apartment_id) {
      const { data: a } = await supabase
        .from('apartments')
        .select('id, number, size_m2, rooms_count, buildings(name), projects(name)')
        .eq('id', r.apartment_id)
        .maybeSingle()
      setApt((a as unknown as Apartment) ?? null)

      const { data: b } = await supabase
        .from('jkh_payments')
        .select('*')
        .eq('apartment_number', (a as any)?.number)
        .order('month', { ascending: false })
        .limit(6)
      setBills(b ?? [])
    }

    const { data: req } = await supabase
      .from('jkh_requests')
      .select('*')
      .eq('resident_id', id)
      .order('created_at', { ascending: false })
      .limit(20)
    setRequests(req ?? [])
  }

  async function submitRequest() {
    if (!form.title || !resident) return
    setSubmitting(true)
    const { error } = await supabase.from('jkh_requests').insert({
      apartment_number: apt?.number || '',
      resident_name: resident.full_name,
      resident_id: resident.id,
      apartment_id: apt?.id,
      category: form.category,
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: 'new',
    })
    setSubmitting(false)
    if (error) { setToast({ msg: error.message, type: 'error' }); return }
    setToast({ msg: 'Request submitted successfully', type: 'success' })
    setReqModal(false)
    setForm({ category: 'repair', title: '', description: '', priority: 'medium' })
    if (resident) loadData(resident.id)
  }

  const currentBill = bills.find(b => b.month === curMonth)
  const floor = apt?.floor_id ? '—' : '—'

  return (
    <ResidentShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>
          Welcome back{resident?.full_name ? `, ${resident.full_name.split(' ')[0]}` : ''} 👋
        </h1>
        <p style={{ color: '#475569', fontSize: 13.5 }}>
          {curMonth} · Resident Dashboard
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>

        {/* ── Section 1: Apartment Card ─────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.12) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 18, padding: 22,
          boxShadow: '0 8px 32px rgba(99,102,241,0.12)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🏠 My Apartment</h2>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '3px 10px' }}>
              Owner ✓
            </span>
          </div>

          {apt ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#e2e8f0', fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>
                #{apt.number}
              </div>
              <div style={{ fontSize: 12.5, color: '#a78bfa', fontWeight: 500 }}>
                {(apt.buildings as any)?.name || 'Building —'}
                {(apt.projects as any)?.name ? ` · ${(apt.projects as any).name}` : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 4 }}>
                {[
                  { l: 'Size',      v: apt.size_m2 ? `${apt.size_m2} m²` : '—' },
                  { l: 'Rooms',     v: apt.rooms_count ? `${apt.rooms_count} rooms` : '—' },
                  { l: 'Move-in',   v: resident?.move_in_date ? new Date(resident.move_in_date).toLocaleDateString() : '—' },
                  { l: 'Status',    v: 'Owner' },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9.5, color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Apartment details loading…
            </div>
          )}
        </div>

        {/* ── Section 2: Current Bills ──────────────────────────────── */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>💳 Current Bills</h2>
            <span style={{ fontSize: 11, color: '#64748b' }}>{curMonth}</span>
          </div>

          {currentBill ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {[
                  { icon: <Zap size={13} color="#f59e0b" />,     label: 'Electricity', key: 'electricity' as const },
                  { icon: <Droplets size={13} color="#3b82f6" />, label: 'Water',       key: 'water' as const       },
                  { icon: <Flame size={13} color="#ef4444" />,    label: 'Gas',         key: 'gas' as const         },
                  { icon: <Wrench size={13} color="#10b981" />,   label: 'Maintenance', key: 'maintenance' as const },
                ].map(({ icon, label, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {icon}
                    </div>
                    <span style={{ flex: 1, fontSize: 12.5, color: '#94a3b8' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>${currentBill[key]}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 12 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: '#818cf8', fontFamily: 'Sora, sans-serif' }}>${currentBill.total}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  color: currentBill.status === 'paid' ? '#10b981' : '#ef4444',
                  background: currentBill.status === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${currentBill.status === 'paid' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                  {currentBill.status === 'paid' ? '✓ Paid' : '● Unpaid'}
                </span>
                <button
                  onClick={() => setToast({ msg: 'Online payments coming soon!', type: 'info' })}
                  style={{
                    padding: '7px 16px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none', color: 'white', cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}>
                  Pay Now
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              No bills for {curMonth} yet
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: My Requests ────────────────────────────────── */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🔧 My Requests</h2>
          <button onClick={() => setReqModal(true)} style={{
            padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            color: '#818cf8', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}>
            + Submit New
          </button>
        </div>

        {requests.length === 0 ? (
          <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
            No requests submitted yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(req => {
              const st = STATUS_CFG[req.status] || STATUS_CFG.new
              return (
                <div key={req.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>{CAT_EMOJI[req.category] || '📋'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{req.title}</div>
                    {req.description && <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>{req.description}</div>}
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {new Date(req.created_at).toLocaleDateString()} ·{' '}
                      <span style={{ color: PRIORITY_COLORS[req.priority], fontWeight: 600 }}>{req.priority}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 8, color: st.color, background: st.bg, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                    {st.icon}{st.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Section 4: Notifications ──────────────────────────────── */}
      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
          <Bell size={15} style={{ display: 'inline', marginRight: 6 }} />Notifications
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '💡', text: 'Electricity maintenance scheduled for April 20, 2026 — 2 hrs outage expected', time: '2 days ago', color: '#f59e0b' },
            { icon: '🏗️', text: 'Building entrance renovation completed. New access cards available at reception', time: '5 days ago', color: '#818cf8' },
            { icon: '💧', text: 'Water pressure may be reduced April 15–16 due to pipe inspection', time: '1 week ago', color: '#3b82f6' },
          ].map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '11px 13px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>{n.text}</div>
                <div style={{ fontSize: 10.5, color: '#334155', marginTop: 4 }}>{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Submit Request Modal ──────────────────────────────────── */}
      {reqModal && (
        <div className="modal-bg" onClick={() => setReqModal(false)}>
          <div className="modal-box" style={{ width: 480, padding: '26px 28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Submit New Request</h3>
              <button onClick={() => setReqModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CAT_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief description of the issue" className="input" required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="More details…" className="input" rows={3} style={{ resize: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Priority</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['low', 'medium', 'high'].map(p => (
                    <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: form.priority === p ? `${PRIORITY_COLORS[p]}18` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${form.priority === p ? PRIORITY_COLORS[p] : 'rgba(255,255,255,0.08)'}`,
                        color: form.priority === p ? PRIORITY_COLORS[p] : '#64748b',
                        transition: 'all 0.15s', textTransform: 'capitalize',
                        fontFamily: 'DM Sans, sans-serif',
                      }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={submitRequest} disabled={submitting || !form.title} className="btn-primary" style={{ padding: '11px', borderRadius: 10, fontSize: 14, marginTop: 4 }}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ResidentShell>
  )
}
