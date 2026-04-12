'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Building2, X, Link2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string; full_name: string; email: string; phone?: string; budget_usd?: number
  status: string; ai_score?: number; notes?: string; created_at: string
}
interface Apt {
  id: string; number: string; price: number; status: string
  size_m2: number; rooms_count?: number
  buildings?: { name: string }
  projects?: { name: string }
}

const PIPELINE = ['new','contacted','viewing','reserved','bought'] as const
const STEP_META: Record<string, { label: string; icon: string }> = {
  new:       { label: 'New Lead',  icon: '🆕' },
  contacted: { label: 'Contacted', icon: '📞' },
  viewing:   { label: 'Viewing',   icon: '👁️' },
  reserved:  { label: 'Reserved',  icon: '📋' },
  bought:    { label: 'Bought',    icon: '✅' },
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient]       = useState<Client | null>(null)
  const [apt,    setApt]          = useState<Apt | null>(null)
  const [allApts, setAllApts]     = useState<Apt[]>([])
  const [linkModal, setLinkModal]   = useState(false)
  const [saleModal, setSaleModal]   = useState<{ name: string; email: string; aptNumber: string } | null>(null)
  const [selApt, setSelApt]         = useState('')
  const [emailData, setEmailData]   = useState<{ subject: string; body: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [updating, setUpdating]   = useState(false)
  const [toast, setToast]         = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)

  const load = async () => {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    setClient(c)
    // Apartment linked via client_id on apartments table
    const { data: a } = await supabase
      .from('apartments')
      .select('id, number, price, status, size_m2, rooms_count, buildings(name), projects(name)')
      .eq('client_id', id)
      .maybeSingle()
    setApt((a as unknown as Apt) ?? null)
  }
  useEffect(() => { if (id) load() }, [id])

  async function setStatus(step: string) {
    if (!client || updating) return
    setUpdating(true)
    await supabase.from('clients').update({ status: step }).eq('id', id)
    setClient(c => c ? { ...c, status: step } : null)

    // When bought: mark apartment sold + create sales record + create resident + generate first bill
    if (step === 'bought' && apt) {
      await supabase.from('apartments').update({ status: 'sold' }).eq('id', apt.id)

      await supabase.from('sales').insert({
        apartment_id: apt.id,
        client_id: id,
        price: apt.price,
      })

      const { data: newResident } = await supabase.from('residents').insert({
        apartment_id: apt.id,
        client_id: id,
        full_name: client.full_name,
        phone: client.phone || null,
        email: client.email || null,
        move_in_date: new Date().toISOString(),
        is_owner: true,
      }).select().single()

      // Auto-generate first month utility bill
      if (newResident) {
        const month = new Date().toISOString().slice(0, 7)
        await supabase.from('jkh_payments').insert({
          apartment_number: apt.number,
          resident_name: client.full_name,
          resident_id: newResident.id,
          month,
          electricity: 50,
          water: 30,
          gas: 20,
          maintenance: 25,
          total: 125,
          status: 'unpaid',
        })
      }

      setSaleModal({ name: client.full_name, email: client.email || '', aptNumber: apt.number })
      load()
      setUpdating(false)
      return
    }

    setToast({ msg: `→ ${STEP_META[step].label}`, type: 'success' })
    setUpdating(false)
  }

  async function openLink() {
    const { data } = await supabase
      .from('apartments')
      .select('id, number, price, status, size_m2, rooms_count, buildings(name), projects(name)')
      .eq('status', 'available')
      .is('client_id', null)
      .limit(50)
    setAllApts((data as unknown as Apt[]) ?? [])
    setLinkModal(true)
  }

  async function linkApt() {
    if (!selApt) return
    const { error } = await supabase
      .from('apartments')
      .update({ client_id: id, status: 'reserved' })
      .eq('id', selApt)
    if (error) { setToast({ msg: error.message, type: 'error' }); return }
    setLinkModal(false)
    setToast({ msg: 'Apartment linked successfully', type: 'success' })
    load()
  }

  async function unlinkApt() {
    if (!apt) return
    await supabase
      .from('apartments')
      .update({ client_id: null, status: 'available' })
      .eq('id', apt.id)
    setApt(null)
    setToast({ msg: 'Apartment unlinked', type: 'info' })
  }

  async function genEmail() {
    setEmailLoading(true)
    const r = await fetch('/api/ai-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: client?.full_name, budget: client?.budget_usd, status: client?.status, notes: client?.notes }),
    })
    const d = await r.json()
    setEmailData(d)
    setEmailLoading(false)
  }

  if (!client) return <AppShell><div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>Loading…</div></AppShell>

  const stepIdx  = PIPELINE.indexOf(client.status as typeof PIPELINE[number])
  const scoreColor = (s?: number) => !s ? '#475569' : s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 18 }}>
        <ArrowLeft size={13} /> Back to Clients
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 1060 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Profile */}
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

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Linked apartment */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#e2e8f0' }}>🏠 Apartment</h3>
              {!apt && (
                <button onClick={openLink} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
                  <Link2 size={10} /> Link
                </button>
              )}
            </div>
            {apt ? (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Building2 size={13} color="#818cf8" />
                  <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Apt #{apt.number}</span>
                </div>
                {(apt.buildings as any)?.name && (
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                    {(apt.buildings as any).name}
                    {(apt.projects as any)?.name ? ` · ${(apt.projects as any).name}` : ''}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700, marginBottom: 4 }}>${Number(apt.price).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                  {apt.size_m2}m²{apt.rooms_count ? ` · ${apt.rooms_count} rooms` : ''} ·{' '}
                  <span style={{ color: apt.status === 'sold' ? '#10b981' : apt.status === 'reserved' ? '#f59e0b' : '#818cf8', textTransform: 'capitalize', fontWeight: 600 }}>{apt.status}</span>
                </div>
                <button onClick={unlinkApt} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  Unlink
                </button>
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
                { l: 'Status', v: client.status, accent: true },
                { l: 'Budget', v: client.budget_usd ? `$${Number(client.budget_usd).toLocaleString()}` : '—' },
                { l: 'Phone',  v: client.phone || '—' },
                { l: 'Added',  v: new Date(client.created_at).toLocaleDateString() },
              ].map(({ l, v, accent }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: accent ? '#818cf8' : '#94a3b8', textTransform: accent ? 'capitalize' : 'none' }}>{v}</span>
                </div>
              ))}
              {client.notes && (
                <div>
                  <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>{client.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🎉 Sale Complete Modal */}
      {saleModal && (
        <div className="modal-bg" onClick={() => setSaleModal(null)}>
          <div className="modal-box" style={{ width: 440, padding: '32px 36px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
              Sale Complete!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>
              <strong style={{ color: '#e2e8f0' }}>{saleModal.name}</strong> has been moved to the ЖКХ system as a resident.
            </p>
            <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: '14px 18px', marginBottom: 22, textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Portal access</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#86efac' }}>{saleModal.email || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Apartment</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>#{saleModal.aptNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>First bill</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>$125 generated ✓</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setSaleModal(null)} style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#64748b', fontFamily: 'DM Sans, sans-serif',
              }}>
                Close
              </button>
              <Link href="/jkh" onClick={() => setSaleModal(null)} style={{
                flex: 1, padding: '11px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none', color: 'white', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                View in ЖКХ <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Link apartment modal */}
      {linkModal && (
        <div className="modal-bg" onClick={() => setLinkModal(false)}>
          <div className="modal-box" style={{ width: 500, padding: '26px 30px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>🏠 Link Apartment</h3>
              <button onClick={() => setLinkModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allApts.length === 0 ? (
                <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>No available apartments</div>
              ) : allApts.map(a => (
                <div key={a.id} onClick={() => setSelApt(a.id)} style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: selApt === a.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selApt === a.id ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.12s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Apt #{a.number}</div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                        {(a.buildings as any)?.name || '—'}
                        {(a.projects as any)?.name ? ` · ${(a.projects as any).name}` : ''}
                        {a.size_m2 ? ` · ${a.size_m2}m²` : ''}
                        {a.rooms_count ? ` · ${a.rooms_count}R` : ''}
                      </div>
                    </div>
                    <div style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>${Number(a.price).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={linkApt} disabled={!selApt} className="btn-primary" style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 14 }}>
              Link Apartment
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
