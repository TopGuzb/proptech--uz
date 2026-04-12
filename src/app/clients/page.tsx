'use client'

import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Mail, X, ChevronDown } from 'lucide-react'

interface Client {
  id: string; full_name: string; email: string; phone?: string; budget_usd?: number
  status: string; ai_score?: number; created_at: string; apartment_id?: string; notes?: string
}

const STATUSES = ['all','new','contacted','viewing','reserved','bought'] as const
const STATUS_LABELS: Record<string, string> = { all:'All', new:'New', contacted:'Contacted', viewing:'Viewing', reserved:'Reserved', bought:'Bought' }

export default function ClientsPage() {
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter,  setFilter]    = useState<string>('all')
  const [search,  setSearch]    = useState('')
  const [modal,   setModal]     = useState(false)
  const [form,    setForm]      = useState({ full_name:'', email:'', phone:'', budget_usd:'', notes:'', status:'new' })
  const [saving,  setSaving]    = useState(false)
  const [aiLoading, setAiLoading] = useState<string|null>(null)
  const [toast,   setToast]     = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const shown = useMemo(() => {
    let list = clients
    if (filter !== 'all') list = list.filter(c => c.status === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q))
    }
    return list
  }, [clients, filter, search])

  const counts = useMemo(() =>
    Object.fromEntries(STATUSES.map(s => [s, s === 'all' ? clients.length : clients.filter(c => c.status === s).length]))
  , [clients])

  async function create() {
    if (!form.full_name.trim()) return
    setSaving(true)
    const { error } = await supabase.from('clients').insert({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      budget_usd: form.budget_usd ? Number(form.budget_usd) : null,
      status: 'new',
      notes: form.notes,
    })
    if (error) { setToast({ msg: error.message, type: 'error' }); setSaving(false); return }
    setSaving(false); setModal(false); setForm({ full_name:'', email:'', phone:'', budget_usd:'', notes:'', status:'new' })
    setToast({ msg: 'Client created', type: 'success' }); load()
  }

  async function changeStatus(id: string, status: string, e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    await supabase.from('clients').update({ status }).eq('id', id)
    setToast({ msg: 'Status updated', type: 'info' }); load()
  }

  async function aiEmail(e: React.MouseEvent, c: Client) {
    e.stopPropagation()
    setAiLoading(c.id)
    const r = await fetch('/api/ai-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName: c.full_name, budget: c.budget_usd, status: c.status }) })
    const d = await r.json()
    const w = window.open('', '_blank', 'width=620,height=520')
    w?.document.write(`<html><head><style>body{font-family:sans-serif;background:#080b14;color:#e2e8f0;padding:24px;} h2{color:#818cf8;} .s{background:#0d1117;padding:12px;border-radius:8px;margin:10px 0;border:1px solid rgba(255,255,255,0.1);} .b{background:#0d1117;padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);white-space:pre-wrap;line-height:1.7;}</style></head><body><h2>AI Email — ${c.full_name}</h2><div class="s"><b>Subject:</b> ${d.subject}</div><div class="b">${d.body}</div></body></html>`)
    setAiLoading(null)
  }

  const scoreColor = (s?: number) => !s ? '#475569' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 23, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.4px', marginBottom: 3 }}>Clients</h1>
          <p style={{ color: '#64748b', fontSize: 13 }}>{clients.length} total</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 11, fontSize: 13 }}>
          <Plus size={14} /> New Client
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '6px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: filter === s ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${filter === s ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: filter === s ? '#818cf8' : '#64748b',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
            }}>
              {STATUS_LABELS[s]} <span style={{ marginLeft: 3, fontSize: 10, opacity: 0.7 }}>({counts[s]})</span>
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input className="input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ paddingLeft: 30, width: 210 }} />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>{['Client','Phone','Budget','Apt','AI Score','Status','Date',''].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? Array(6).fill(0).map((_,i) => (
                <tr key={i}>
                  {[200,90,90,70,70,90,80,60].map((w,j) => <td key={j}><div className="skeleton" style={{ height: 14, width: w }} /></td>)}
                </tr>
              )) : shown.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#334155' }}>No clients found</td></tr>
              ) : shown.map((c, i) => (
                <tr key={c.id}
                  onClick={() => window.location.href = `/clients/${c.id}`}
                  style={{ borderLeft: '3px solid transparent', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderLeftColor = '#6366f1'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent'}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ width: 31, height: 31, borderRadius: '50%', background: `hsl(${(i*53)%360},50%,36%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: '#e2e8f0', fontWeight: 500, fontSize: 13 }}>{c.full_name}</div>
                        <div style={{ color: '#475569', fontSize: 11 }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td style={{ color: c.budget_usd ? '#10b981' : '#475569', fontWeight: c.budget_usd ? 600 : 400 }}>
                    {c.budget_usd ? `$${Number(c.budget_usd).toLocaleString()}` : '—'}
                  </td>
                  <td>{c.apartment_id ? '🔗 Linked' : '—'}</td>
                  <td>
                    {c.ai_score != null
                      ? <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(c.ai_score), background: `${scoreColor(c.ai_score)}18`, padding: '3px 8px', borderRadius: 6 }}>{c.ai_score}</span>
                      : <span style={{ color: '#334155', fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select value={c.status} onChange={e => changeStatus(c.id, e.target.value, e)} style={{
                        appearance: 'none', background: 'transparent',
                        border: 'none', padding: '3px 18px 3px 0',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        color: { new:'#818cf8',contacted:'#60a5fa',viewing:'#fbbf24',reserved:'#f87171',bought:'#34d399' }[c.status] ?? '#94a3b8',
                      }}>
                        {STATUSES.slice(1).map(s => <option key={s} value={s} style={{ background: '#0d1117' }}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <ChevronDown size={9} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#475569' }} />
                    </div>
                  </td>
                  <td style={{ fontSize: 11 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <button onClick={e => aiEmail(e, c)} disabled={aiLoading === c.id} style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 7,
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)',
                      color: '#818cf8', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                    }}>
                      <Mail size={10} /> {aiLoading === c.id ? '…' : 'Email'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Client modal */}
      {modal && (
        <div className="modal-bg" onClick={() => setModal(false)}>
          <div className="modal-box" style={{ width: 460, padding: '32px 36px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>New Client</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
              {[{k:'full_name',l:'Full Name *',ph:'Akbar Toshmatov',t:'text',full:true},{k:'email',l:'Email',ph:'akbar@mail.com',t:'email'},{k:'phone',l:'Phone',ph:'+998 90 123 45 67',t:'text'},{k:'budget_usd',l:'Budget ($)',ph:'95000',t:'number'},{k:'notes',l:'Notes',ph:'Interested in 3-room…',t:'text',full:true}].map(({k,l,ph,t,full}) => (
                <div key={k} style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{l}</label>
                  <input type={t} className="input" placeholder={ph} value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</label>
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ cursor: 'pointer' }}>
                  {STATUSES.slice(1).map(s => <option key={s} value={s} style={{ background: '#0d1117' }}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <button onClick={create} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, marginTop: 18 }}>
              {saving ? 'Creating…' : 'Create Client'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
