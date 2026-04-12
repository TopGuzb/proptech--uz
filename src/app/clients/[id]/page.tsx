'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Building2, X, Link2 } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; full_name: string; email: string; phone?: string; budget_usd?: number; status: string; ai_score?: number; notes?: string; created_at: string; apartment_id?: string }
interface Apt    { id: string; number: string; price: number; status: string; size: number }

const PIPELINE = ['new','contacted','viewing','reserved','bought'] as const
const STEP_META: Record<string, { label: string; icon: string }> = {
  new:       { label: 'New Lead',   icon: '🆕' },
  contacted: { label: 'Contacted',  icon: '📞' },
  viewing:   { label: 'Viewing',    icon: '👁️' },
  reserved:  { label: 'Reserved',   icon: '📋' },
  bought:    { label: 'Bought',     icon: '✅' },
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient]     = useState<Client | null>(null)
  const [apt, setApt]           = useState<Apt | null>(null)
  const [allApts, setAllApts]   = useState<Apt[]>([])
  const [linkModal, setLinkModal] = useState(false)
  const [selApt, setSelApt]     = useState('')
  const [emailData, setEmailData] = useState<{ subject: string; body: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [toast, setToast]       = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)

  const load = async () => {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    setClient(c)
    if (c?.apartment_id) {
      const { data: a } = await supabase.from('apartments').select('id,number,price,status,size').eq('id', c.apartment_id).single()
      setApt(a)
    } else {
      setApt(null)
    }
  }
  useEffect(() => { if (id) load() }, [id])

  async function setStatus(step: string) {
    if (!client || updating) return
    setUpdating(true)
    await supabase.from('clients').update({ status: step }).eq('id', id)
    setClient(c => c ? { ...c, status: step } : null)
    setToast({ msg: `→ ${STEP_META[step].label}`, type: 'success' })
    setUpdating(false)
  }

  async function openLink() {
    const { data } = await supabase.from('apartments').select('id,number,price,status,size').eq('status', 'available').limit(30)
    setAllApts(data ?? [])
    setLinkModal(true)
  }

  async function linkApt() {
    await supabase.from('clients').update({ apartment_id: selApt }).eq('id', id)
    setLinkModal(false); setToast({ msg: 'Apartment linked', type: 'success' }); load()
  }

  async function genEmail() {
    setEmailLoading(true)
    const r = await fetch('/api/ai-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientName: client?.full_name, budget: client?.budget_usd, status: client?.status, notes: client?.notes }) })
    const d = await r.json()
    setEmailData(d)
    setEmailLoading(false)
  }

  if (!client) return <AppShell><div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>Loading…</div></AppShell>

  const stepIdx = PIPELINE.indexOf(client.status as typeof PIPELINE[number])
  const scoreColor = (s?: number) => !s ? '#475569' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 18 }}>
        <ArrowLeft size={13} /> Back to Clients
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 1060 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Profile card */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `hsl(${client.full_name.charCodeAt(0)*4%360},50%,38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {client.full_name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 20, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px', marginBottom: 3 }}>{client.full_name}</h1>
                <div style={{ color: '#64748b', fontSize: 13 }}>{client.email}</div>
                {client.phone && <div style={{ color: '#64748b', fontSize: 13 }}>{client.phone}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {client.ai_score != null && <div style={{ padding: '6px 12px', borderRadius: 9, background: `${scoreColor(client.ai_score)}18`, border: `1px solid ${scoreColor(client.ai_score)}30`, fontSize: 12, fontWeight: 700, color: scoreColor(client.ai_score) }}>AI {client.ai_score}</div>}
                {client.budget_usd && <div style={{ padding: '6px 12px', borderRadius: 9, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', fontSize: 12, fontWeight: 600, color: '#10b981' }}>${Number(client.budget_usd).toLocaleString()}</div>}
              </div>
            </div>
          </div>

          {/* Pipeline */}
          <div className="card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>Sales Pipeline</h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {PIPELINE.map((step, i) => {
                const active = client.status === step
                const past   = stepIdx > i
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE.length - 1 ? 1 : 'none' }}>
                    <div onClick={() => setStatus(step)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: updating ? 'not-allowed' : 'pointer', transition: 'transform 0.15s', opacity: updating ? 0.7 : 1 }}
                      onMouseEnter={e => { if (!updating) (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', fontSize: 17,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : past ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${active ? '#6366f1' : past ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                        boxShadow: active ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.2s',
                      }}>
                        {past ? '✓' : STEP_META[step].icon}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: active ? '#818cf8' : past ? '#10b981' : '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {STEP_META[step].label}
                      </div>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: past ? '#10b981' : 'rgba(255,255,255,0.06)', margin: '0 6px', marginTop: '-16px', transition: 'background 0.3s' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Email */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Email Generator</h3>
              <button onClick={genEmail} disabled={emailLoading} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12 }}>
                <Mail size={12} /> {emailLoading ? 'Generating…' : 'Generate'}
              </button>
            </div>
            {emailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 38 }} />
                <div className="skeleton" style={{ height: 110 }} />
              </div>
            ) : emailData ? (
              <div style={{ animation: 'fadeUp 0.25s ease' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Subject</div>
                  <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px 13px', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{emailData.subject}</div>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Body</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '13px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{emailData.body}</div>
              </div>
            ) : (
              <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>Click Generate to create a personalized email</div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Linked apartment */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>Apartment</h3>
              <button onClick={openLink} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                <Link2 size={10} /> Link
              </button>
            </div>
            {apt ? (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Building2 size={13} color="#818cf8" />
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Apt #{apt.number}</span>
                </div>
                <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>${Number(apt.price).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{apt.size} m² · {apt.status}</div>
              </div>
            ) : (
              <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '14px 0' }}>No apartment linked</div>
            )}
          </div>

          {/* Details */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 13 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { l: 'Status',  v: client.status, accent: true },
                { l: 'Budget',  v: client.budget_usd ? `$${Number(client.budget_usd).toLocaleString()}` : '—' },
                { l: 'Phone',   v: client.phone || '—' },
                { l: 'Added',   v: new Date(client.created_at).toLocaleDateString() },
              ].map(({ l, v, accent }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: accent ? '#818cf8' : '#94a3b8', textTransform: accent ? 'capitalize' : 'none' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Link apartment modal */}
      {linkModal && (
        <div className="modal-bg" onClick={() => setLinkModal(false)}>
          <div className="modal-box" style={{ width: 360, padding: '26px 30px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Link Apartment</h3>
              <button onClick={() => setLinkModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Select Apartment</label>
            <select className="input" value={selApt} onChange={e => setSelApt(e.target.value)} style={{ cursor: 'pointer', marginBottom: 14 }}>
              <option value="">— Choose —</option>
              {allApts.map(a => <option key={a.id} value={a.id} style={{ background: '#0d1117' }}>#{a.number} · ${Number(a.price).toLocaleString()} · {a.size}m²</option>)}
            </select>
            <button onClick={linkApt} disabled={!selApt} className="btn-primary" style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14 }}>Link Apartment</button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
