'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Users, ClipboardList, DollarSign, TrendingUp, ChevronDown, ChevronUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface JkhRequest {
  id: string; title: string; description?: string; category: string
  status: string; priority: string; resident_name: string
  apartment_number: string; created_at: string
}
interface JkhPayment {
  id: string; resident_name: string; apartment_number: string
  month: string; total: number; status: string; created_at?: string
}

const CAT_EMOJI: Record<string, string> = { water: '🚿', electric: '⚡', repair: '🔧', cleaning: '🧹', security: '🔐', other: '📋' }
const PRIORITY_COLORS: Record<string, string> = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function JkhDashboardPage() {
  const [requests, setRequests]   = useState<JkhRequest[]>([])
  const [payments, setPayments]   = useState<JkhPayment[]>([])
  const [residents, setResidents] = useState(0)
  const [filter, setFilter]       = useState<'all'|'today'|'urgent'>('all')
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [loading, setLoading]     = useState(true)

  const curMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: reqs }, { data: pays }, { count }] = await Promise.all([
      supabase.from('jkh_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('jkh_payments').select('*').eq('month', curMonth).order('created_at', { ascending: false }).limit(20),
      supabase.from('residents').select('*', { count: 'exact', head: true }),
    ])
    setRequests(reqs ?? [])
    setPayments(pays ?? [])
    setResidents(count ?? 0)
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('jkh_requests').update({ status }).eq('id', id)
    if (error) { setToast({ msg: error.message, type: 'error' }); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setToast({ msg: `Status → ${status.replace('_', ' ')}`, type: 'success' })
  }

  async function markPaid(id: string) {
    const { error } = await supabase.from('jkh_payments').update({ status: 'paid' }).eq('id', id)
    if (error) { setToast({ msg: error.message, type: 'error' }); return }
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid' } : p))
    setToast({ msg: 'Marked as paid', type: 'success' })
  }

  const filteredReqs = requests
    .filter(r => {
      if (filter === 'all') return r.status !== 'done'
      if (filter === 'urgent') return r.priority === 'high' && r.status !== 'done'
      if (filter === 'today') {
        const d = new Date(r.created_at)
        const now = new Date()
        return d.toDateString() === now.toDateString() && r.status !== 'done'
      }
      return true
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])

  const paidCount    = payments.filter(p => p.status === 'paid').length
  const unpaidCount  = payments.filter(p => p.status !== 'paid').length
  const openReqs     = requests.filter(r => r.status !== 'done').length
  const collRate     = payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0

  const stats = [
    { icon: <Users size={16} />,       label: 'Total Residents', value: residents, color: '#818cf8', bg: 'rgba(99,102,241,0.12)'  },
    { icon: <ClipboardList size={16} />, label: 'Open Requests', value: openReqs,  color: openReqs > 5 ? '#ef4444' : '#f59e0b', bg: openReqs > 5 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' },
    { icon: <DollarSign size={16} />,  label: `Paid ${curMonth}`, value: paidCount,   color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { icon: <TrendingUp size={16} />,  label: 'Collection Rate', value: `${collRate}%`, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  ]

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 3 }}>ЖКХ Dashboard</h1>
        <p style={{ color: '#475569', fontSize: 13 }}>{curMonth} · Housing Management</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
              <span style={{ fontSize: 11.5, color: '#475569' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, fontFamily: 'Sora, sans-serif', lineHeight: 1 }}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 18 }}>

        {/* ── Left: Requests Queue ─────────────────────────────── */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Requests Queue</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'today', 'urgent'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    padding: '5px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: filter === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${filter === f ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    color: filter === f ? '#818cf8' : '#64748b',
                    textTransform: 'capitalize', fontFamily: 'DM Sans, sans-serif',
                  }}>
                  {f === 'urgent' ? '🔴 Urgent' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredReqs.length === 0 ? (
            <div style={{ color: '#334155', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
              {filter === 'all' ? 'No open requests' : `No ${filter} requests`}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredReqs.map(req => {
                const isOpen = expanded === req.id
                return (
                  <div key={req.id} style={{
                    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 11, overflow: 'hidden',
                    borderLeft: `3px solid ${PRIORITY_COLORS[req.priority]}`,
                  }}>
                    <div style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10 }}
                      onClick={() => setExpanded(isOpen ? null : req.id)}>
                      <span style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>{CAT_EMOJI[req.category] || '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{req.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          {req.resident_name} · Apt #{req.apartment_number} · {timeAgo(req.created_at)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, color: PRIORITY_COLORS[req.priority], background: `${PRIORITY_COLORS[req.priority]}15`, textTransform: 'capitalize' }}>
                          {req.priority}
                        </span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </span>
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', background: 'rgba(0,0,0,0.15)' }}>
                        {req.description && (
                          <div style={{ fontSize: 12.5, color: '#94a3b8', marginBottom: 12, lineHeight: 1.5 }}>{req.description}</div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          {req.status !== 'in_progress' && req.status !== 'done' && (
                            <button onClick={() => updateStatus(req.id, 'in_progress')} style={{
                              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                              color: '#f59e0b', fontFamily: 'DM Sans, sans-serif',
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                              <Clock size={11} /> Accept
                            </button>
                          )}
                          {req.status !== 'done' && (
                            <button onClick={() => updateStatus(req.id, 'done')} style={{
                              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                              color: '#10b981', fontFamily: 'DM Sans, sans-serif',
                              display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                              <CheckCircle2 size={11} /> Complete
                            </button>
                          )}
                          {req.status === 'done' && (
                            <span style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: Recent Payments ───────────────────────────── */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>
            Recent Payments · {curMonth}
          </h2>

          {payments.length === 0 ? (
            <div style={{ color: '#334155', textAlign: 'center', padding: '32px 0', fontSize: 13 }}>No bills generated yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {payments.map(pay => (
                <div key={pay.id} style={{
                  padding: '10px 12px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${pay.resident_name.charCodeAt(0) * 5 % 360},45%,32%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'white',
                  }}>
                    {pay.resident_name[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pay.resident_name}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>Apt #{pay.apartment_number}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>${pay.total}</div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, marginTop: 2,
                      color: pay.status === 'paid' ? '#10b981' : '#ef4444',
                    }}>
                      {pay.status === 'paid' ? '✓ Paid' : '● Unpaid'}
                    </div>
                  </div>
                  {pay.status !== 'paid' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                      <button onClick={() => markPaid(pay.id)} style={{
                        padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)',
                        color: '#10b981', fontFamily: 'DM Sans, sans-serif',
                      }}>
                        Paid
                      </button>
                      <button onClick={() => setToast({ msg: `Reminder sent to ${pay.resident_name}`, type: 'info' })} style={{
                        padding: '4px 9px', borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                        color: '#f59e0b', fontFamily: 'DM Sans, sans-serif',
                      }}>
                        Remind
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

