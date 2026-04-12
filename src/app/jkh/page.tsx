'use client'

import { useEffect, useState, useMemo } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Home, Plus, X } from 'lucide-react'

interface JkhRequest {
  id: string
  apartment_number: string
  resident_name: string
  category: string
  title: string
  description: string
  status: 'new' | 'in_progress' | 'done'
  priority: 'high' | 'medium' | 'low'
  created_at: string
}

interface JkhPayment {
  id: string
  apartment_number: string
  resident_name: string
  month: string
  electricity: number
  water: number
  gas: number
  maintenance: number
  total: number
  status: 'paid' | 'unpaid'
}

const CATEGORIES = [
  { id: 'water',    icon: '💧', label: 'Water' },
  { id: 'electric', icon: '⚡', label: 'Electric' },
  { id: 'repair',   icon: '🔧', label: 'Repair' },
  { id: 'cleaning', icon: '🧹', label: 'Cleaning' },
  { id: 'security', icon: '🔒', label: 'Security' },
]

const STATUS_REQ = {
  new:         { label: 'New',         color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  done:        { label: 'Done',        color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const PRIORITY = {
  high:   { label: 'High',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  low:    { label: 'Low',    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
}

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']

const MOCK_REQUESTS: JkhRequest[] = [
  { id: '1', apartment_number: '1-1', resident_name: 'Akbar Toshmatov',  category: 'water',    title: 'Water leak in bathroom',  description: 'Pipe under sink is leaking',         status: 'new',         priority: 'high',   created_at: '2026-04-10T10:00:00Z' },
  { id: '2', apartment_number: '1-2', resident_name: 'Malika Yusupova',  category: 'electric', title: 'Power socket broken',     description: 'Socket in living room not working',   status: 'in_progress', priority: 'medium', created_at: '2026-04-09T14:00:00Z' },
  { id: '3', apartment_number: '2-1', resident_name: 'Bobur Karimov',    category: 'repair',   title: 'Door lock broken',        description: 'Cannot lock front door',              status: 'done',        priority: 'high',   created_at: '2026-04-08T09:00:00Z' },
  { id: '4', apartment_number: '2-2', resident_name: 'Zulfiya Rahimova', category: 'cleaning', title: 'Hallway cleaning needed', description: 'Common area needs cleaning',          status: 'new',         priority: 'low',    created_at: '2026-04-07T16:00:00Z' },
  { id: '5', apartment_number: '3-1', resident_name: 'Sherzod Nazarov',  category: 'security', title: 'CCTV camera offline',     description: 'Camera at entrance not recording',    status: 'in_progress', priority: 'medium', created_at: '2026-04-06T11:00:00Z' },
]

const MOCK_PAYMENTS: JkhPayment[] = [
  { id: '1', apartment_number: '1-1', resident_name: 'Akbar Toshmatov',  month: '2026-04', electricity: 45, water: 18, gas: 22, maintenance: 30, total: 115, status: 'paid' },
  { id: '2', apartment_number: '1-2', resident_name: 'Malika Yusupova',  month: '2026-04', electricity: 38, water: 15, gas: 20, maintenance: 30, total: 103, status: 'unpaid' },
  { id: '3', apartment_number: '2-1', resident_name: 'Bobur Karimov',    month: '2026-04', electricity: 52, water: 21, gas: 25, maintenance: 30, total: 128, status: 'paid' },
  { id: '4', apartment_number: '2-2', resident_name: 'Zulfiya Rahimova', month: '2026-04', electricity: 41, water: 17, gas: 19, maintenance: 30, total: 107, status: 'unpaid' },
  { id: '5', apartment_number: '3-1', resident_name: 'Sherzod Nazarov',  month: '2026-04', electricity: 35, water: 14, gas: 18, maintenance: 30, total: 97,  status: 'paid' },
]

export default function JkhPage() {
  const [tab, setTab]           = useState<'requests' | 'payments'>('requests')
  const [requests, setRequests] = useState<JkhRequest[]>(MOCK_REQUESTS)
  const [payments, setPayments] = useState<JkhPayment[]>(MOCK_PAYMENTS)
  const [reqFilter, setReqFilter] = useState('all')
  const [payMonth, setPayMonth] = useState('2026-04')
  const [addModal, setAddModal] = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [form, setForm]         = useState({ apartment_number: '', resident_name: '', category: 'repair', title: '', description: '', priority: 'medium' })

  useEffect(() => {
    loadRequests()
    loadPayments()
  }, [])

  async function loadRequests() {
    const { data, error } = await supabase.from('jkh_requests').select('*').order('created_at', { ascending: false })
    if (!error && data && data.length > 0) setRequests(data as JkhRequest[])
  }

  async function loadPayments() {
    const { data, error } = await supabase.from('jkh_payments').select('*').order('apartment_number')
    if (!error && data && data.length > 0) setPayments(data as JkhPayment[])
  }

  async function addRequest() {
    if (!form.title || !form.apartment_number) return
    const optimistic: JkhRequest = {
      id: Date.now().toString(),
      apartment_number: form.apartment_number,
      resident_name: form.resident_name,
      category: form.category,
      title: form.title,
      description: form.description,
      status: 'new',
      priority: form.priority as JkhRequest['priority'],
      created_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('jkh_requests').insert({
      apartment_number: form.apartment_number,
      resident_name: form.resident_name,
      category: form.category,
      title: form.title,
      description: form.description,
      status: 'new',
      priority: form.priority,
    }).select().single()
    setRequests(prev => [error ? optimistic : (data as JkhRequest), ...prev])
    setAddModal(false)
    setForm({ apartment_number: '', resident_name: '', category: 'repair', title: '', description: '', priority: 'medium' })
    setToast({ msg: 'Request created', type: 'success' })
  }

  async function changeReqStatus(reqId: string, status: string) {
    await supabase.from('jkh_requests').update({ status }).eq('id', reqId)
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: status as JkhRequest['status'] } : r))
    setToast({ msg: `→ ${STATUS_REQ[status as keyof typeof STATUS_REQ]?.label}`, type: 'success' })
  }

  async function markPaid(payId: string) {
    await supabase.from('jkh_payments').update({ status: 'paid' }).eq('id', payId)
    setPayments(prev => prev.map(p => p.id === payId ? { ...p, status: 'paid' as const } : p))
    setToast({ msg: 'Payment marked as paid', type: 'success' })
  }

  async function generateBills() {
    const { data: apts } = await supabase.from('apartments').select('number, client_id').eq('status', 'sold')
    if (!apts?.length) { setToast({ msg: 'No sold apartments found', type: 'info' }); return }
    let count = 0
    for (const a of apts) {
      const bill: Omit<JkhPayment, 'id'> = {
        apartment_number: a.number,
        resident_name: '—',
        month: payMonth,
        electricity: 40,
        water: 16,
        gas: 20,
        maintenance: 30,
        total: 106,
        status: 'unpaid',
      }
      const { data, error } = await supabase.from('jkh_payments').insert(bill).select().single()
      if (!error && data) {
        setPayments(prev => [...prev, data as JkhPayment])
        count++
      }
    }
    setToast({ msg: `Generated ${count} bills for ${payMonth}`, type: 'success' })
  }

  const filteredReqs = useMemo(
    () => reqFilter === 'all' ? requests : requests.filter(r => r.status === reqFilter),
    [requests, reqFilter]
  )
  const filteredPays  = useMemo(() => payments.filter(p => p.month === payMonth), [payments, payMonth])
  const totalCollected = filteredPays.filter(p => p.status === 'paid').reduce((s, p) => s + p.total, 0)
  const totalPending   = filteredPays.filter(p => p.status === 'unpaid').reduce((s, p) => s + p.total, 0)

  const stats = {
    residents: [...new Set(payments.map(p => p.apartment_number))].length,
    openReqs:  requests.filter(r => r.status !== 'done').length,
    paid:      filteredPays.filter(p => p.status === 'paid').length,
    unpaid:    filteredPays.filter(p => p.status === 'unpaid').length,
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home size={18} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.4px' }}>ЖКХ Management</h1>
              <p style={{ color: '#64748b', fontSize: 13 }}>Housing & Utilities</p>
            </div>
          </div>
          {tab === 'requests' ? (
            <button onClick={() => setAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, fontSize: 13 }}>
              <Plus size={14} /> New Request
            </button>
          ) : (
            <button onClick={generateBills} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, fontSize: 13, fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              <Plus size={14} /> Generate Bills
            </button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { l: 'Total Residents', v: stats.residents, c: '#818cf8' },
            { l: 'Open Requests',   v: stats.openReqs,  c: '#f59e0b' },
            { l: 'Paid Bills',      v: stats.paid,      c: '#10b981' },
            { l: 'Unpaid Bills',    v: stats.unpaid,    c: '#ef4444' },
          ].map(s => (
            <div key={s.l} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 28, fontWeight: 800, color: s.c, letterSpacing: '-1px' }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['requests', 'payments'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', borderRadius: '9px 9px 0 0', fontSize: 13, fontWeight: 600,
              background: tab === t ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: 'none', borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t ? '#818cf8' : '#64748b', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.12s',
            }}>
              {t === 'requests' ? '📋 Requests' : '💳 Payments'}
              <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7, background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 8 }}>
                {t === 'requests' ? requests.length : filteredPays.length}
              </span>
            </button>
          ))}
        </div>

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {['all', 'new', 'in_progress', 'done'].map(s => (
                <button key={s} onClick={() => setReqFilter(s)} style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: reqFilter === s ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${reqFilter === s ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: reqFilter === s ? '#818cf8' : '#64748b', fontFamily: 'DM Sans, sans-serif',
                }}>
                  {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s[0].toUpperCase() + s.slice(1)}
                  <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>
                    ({s === 'all' ? requests.length : requests.filter(r => r.status === s).length})
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredReqs.map(req => {
                const cat = CATEGORIES.find(c => c.id === req.category)
                const st  = STATUS_REQ[req.status]
                const pr  = PRIORITY[req.priority]
                return (
                  <div key={req.id} className="card" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{cat?.icon || '📋'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexWrap: 'wrap' }}>
                          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>{req.title}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: st?.bg, color: st?.color }}>{st?.label}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: pr?.bg, color: pr?.color }}>{pr?.label}</span>
                        </div>
                        {req.description && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 7 }}>{req.description}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#475569' }}>
                          <span>🏠 {req.apartment_number}</span>
                          {req.resident_name && <span>👤 {req.resident_name}</span>}
                          <span>📅 {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {req.status !== 'done' && (
                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                          {req.status === 'new' && (
                            <button onClick={() => changeReqStatus(req.id, 'in_progress')} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                              Start
                            </button>
                          )}
                          <button onClick={() => changeReqStatus(req.id, 'done')} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                            ✓ Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredReqs.length === 0 && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#334155' }}>No requests found</div>
              )}
            </div>
          </>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {MONTHS.map(m => (
                <button key={m} onClick={() => setPayMonth(m)} style={{
                  padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: payMonth === m ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${payMonth === m ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: payMonth === m ? '#818cf8' : '#64748b', fontFamily: 'DM Sans, sans-serif',
                }}>{m}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Collected</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#10b981' }}>${totalCollected.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Total Pending</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#ef4444' }}>${totalPending.toLocaleString()}</div>
              </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>{['Apartment','Resident','Electricity','Water','Gas','Maintenance','Total','Status',''].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filteredPays.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#334155' }}>No payments for this month</td></tr>
                    ) : filteredPays.map(p => (
                      <tr key={p.id}>
                        <td style={{ color: '#e2e8f0', fontWeight: 500 }}>#{p.apartment_number}</td>
                        <td style={{ color: '#94a3b8' }}>{p.resident_name}</td>
                        <td style={{ color: '#818cf8' }}>${p.electricity}</td>
                        <td style={{ color: '#60a5fa' }}>${p.water}</td>
                        <td style={{ color: '#f59e0b' }}>${p.gas}</td>
                        <td style={{ color: '#a78bfa' }}>${p.maintenance}</td>
                        <td style={{ color: '#e2e8f0', fontWeight: 700 }}>${p.total}</td>
                        <td>
                          <span style={{ padding: '3px 9px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: p.status === 'paid' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: p.status === 'paid' ? '#10b981' : '#f87171' }}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          {p.status === 'unpaid' && (
                            <button onClick={() => markPaid(p.id)} style={{ padding: '4px 9px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Request Modal */}
      {addModal && (
        <div className="modal-bg" onClick={() => setAddModal(false)}>
          <div className="modal-box" style={{ width: 460, padding: '28px 32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>New Request</h3>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[{ k: 'apartment_number', l: 'Apt Number', ph: '1-1' }, { k: 'resident_name', l: 'Resident', ph: 'Full name' }].map(({ k, l, ph }) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</label>
                    <input className="input" placeholder={ph} value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))} title={c.label} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 18, cursor: 'pointer', background: form.category === c.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.category === c.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                      {c.icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title *</label>
                <input className="input" placeholder="Brief issue title…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</label>
                <textarea className="input" placeholder="Details…" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'none', height: 'auto' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</label>
                <div style={{ display: 'flex', gap: 7 }}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', background: form.priority === p ? PRIORITY[p].bg : 'rgba(255,255,255,0.04)', border: `1px solid ${form.priority === p ? PRIORITY[p].color + '40' : 'rgba(255,255,255,0.08)'}`, color: form.priority === p ? PRIORITY[p].color : '#64748b' }}>
                      {PRIORITY[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addRequest} className="btn-primary" style={{ padding: '12px', borderRadius: 11, fontSize: 14, marginTop: 2 }}>
                Create Request
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
