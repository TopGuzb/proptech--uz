'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, Building2, X, Link2 } from 'lucide-react'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  budget?: number
  status: string
  ai_score?: number
  notes?: string
  created_at: string
}

const PIPELINE_STEPS = ['new', 'contacted', 'viewing', 'reserved', 'bought']

const STEP_LABELS: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  viewing: 'Viewing',
  reserved: 'Reserved',
  bought: 'Bought',
}

const STEP_ICONS = ['🆕', '📞', '👁️', '📋', '✅']

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [apartments, setApartments] = useState<Array<{ id: string; number: string; project?: string; price: number; status: string }>>([])
  const [allApartments, setAllApartments] = useState<Array<{ id: string; number: string; price: number }>>([])
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [selectedApt, setSelectedApt] = useState('')
  const [aiEmailData, setAiEmailData] = useState<{ subject: string; body: string } | null>(null)
  const [aiEmailLoading, setAiEmailLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => { if (id) loadData() }, [id])

  async function loadData() {
    const { data: c } = await supabase.from('clients').select('*').eq('id', id).single()
    setClient(c)

    if (c?.apartment_id) {
      const { data: apt } = await supabase.from('apartments').select('*, projects(name)').eq('id', c.apartment_id).single()
      if (apt) setApartments([{ id: apt.id, number: apt.number, project: apt.projects?.name, price: apt.price, status: apt.status }])
    }
  }

  async function updateStatus(step: string) {
    if (!client || updatingStatus) return
    setUpdatingStatus(true)
    await supabase.from('clients').update({ status: step }).eq('id', id)
    setClient(c => c ? { ...c, status: step } : null)
    setToast({ msg: `Status updated to ${STEP_LABELS[step]}`, type: 'success' })
    setUpdatingStatus(false)
  }

  async function loadAvailableApartments() {
    const { data } = await supabase.from('apartments').select('id, number, price').eq('status', 'available').limit(20)
    setAllApartments(data || [])
    setShowLinkModal(true)
  }

  async function handleLinkApartment() {
    if (!selectedApt) return
    await supabase.from('clients').update({ apartment_id: selectedApt }).eq('id', id)
    setShowLinkModal(false)
    setToast({ msg: 'Apartment linked', type: 'success' })
    loadData()
  }

  async function generateEmail() {
    setAiEmailLoading(true)
    try {
      const res = await fetch('/api/ai-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      })
      const data = await res.json()
      setAiEmailData(data)
    } catch {
      setToast({ msg: 'Failed to generate email', type: 'error' })
    }
    setAiEmailLoading(false)
  }

  if (!client) return (
    <AppShell>
      <div style={{ color: '#64748b', textAlign: 'center', padding: 48 }}>Loading...</div>
    </AppShell>
  )

  const currentStep = PIPELINE_STEPS.indexOf(client.status)
  const scoreColor = (score?: number) => {
    if (!score) return '#475569'
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <Link href="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Clients
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, maxWidth: 1100 }}>
        {/* Left */}
        <div>
          {/* Client header */}
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `hsl(${client.name.charCodeAt(0) * 3 % 360}, 55%, 40%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {client.name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.3px', marginBottom: 4 }}>
                  {client.name}
                </h1>
                <div style={{ color: '#64748b', fontSize: 13 }}>{client.email}</div>
                {client.phone && <div style={{ color: '#64748b', fontSize: 13 }}>{client.phone}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {client.ai_score !== undefined && (
                  <div style={{
                    padding: '6px 12px', borderRadius: 10,
                    background: `${scoreColor(client.ai_score)}20`,
                    border: `1px solid ${scoreColor(client.ai_score)}40`,
                    fontSize: 12, fontWeight: 700, color: scoreColor(client.ai_score),
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    AI Score: {client.ai_score}
                  </div>
                )}
                {client.budget && (
                  <div style={{ padding: '6px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 12, fontWeight: 600, color: '#10b981' }}>
                    Budget: ${Number(client.budget).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sales Pipeline */}
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 20,
          }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>
              Sales Pipeline
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {PIPELINE_STEPS.map((step, i) => {
                const isActive = client.status === step
                const isPast = currentStep > i
                const isNext = currentStep + 1 === i
                return (
                  <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE_STEPS.length - 1 ? 1 : 'none' }}>
                    <div
                      onClick={() => updateStatus(step)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        cursor: updatingStatus ? 'not-allowed' : 'pointer',
                        opacity: updatingStatus ? 0.7 : 1,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={e => { if (!updatingStatus) (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: isActive ? 'linear-gradient(135deg, #6366f1, #818cf8)' : isPast ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `2px solid ${isActive ? '#6366f1' : isPast ? '#10b981' : isNext ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16,
                        boxShadow: isActive ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                        transition: 'all 0.2s ease',
                      }}>
                        {isPast ? '✓' : STEP_ICONS[i]}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: isActive ? '#818cf8' : isPast ? '#10b981' : '#475569', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {STEP_LABELS[step]}
                      </div>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: isPast ? '#10b981' : 'rgba(255,255,255,0.06)', margin: '0 4px', marginTop: '-14px', transition: 'background 0.3s ease' }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Email */}
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>AI Email Generator</h3>
              <button
                onClick={generateEmail}
                disabled={aiEmailLoading}
                className="btn-gradient"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Mail size={13} />
                {aiEmailLoading ? 'Generating...' : 'Generate Email'}
              </button>
            </div>

            {aiEmailData ? (
              <div style={{ animation: 'fadeInUp 0.3s ease' }}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
                  <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px 14px', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                    {aiEmailData.subject}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '14px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {aiEmailData.body}
                  </div>
                </div>
              </div>
            ) : aiEmailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 40 }} />
                <div className="skeleton" style={{ height: 120 }} />
              </div>
            ) : (
              <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                Generate a personalized AI email for this client
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Linked Apartment */}
          <div style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Apartment</h3>
              <button
                onClick={loadAvailableApartments}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
              >
                <Link2 size={11} /> Link
              </button>
            </div>
            {apartments.length > 0 ? (
              apartments.map(apt => (
                <div key={apt.id} style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Building2 size={14} color="#818cf8" />
                    <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Apt #{apt.number}</span>
                  </div>
                  {apt.project && <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{apt.project}</div>}
                  <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>${Number(apt.price).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textTransform: 'capitalize' }}>{apt.status}</div>
                </div>
              ))
            ) : (
              <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>No apartment linked</div>
            )}
          </div>

          {/* Quick stats */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20 }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Status', value: client.status, accent: true },
                { label: 'Added', value: new Date(client.created_at).toLocaleDateString() },
                { label: 'Phone', value: client.phone || '—' },
                { label: 'Budget', value: client.budget ? `$${Number(client.budget).toLocaleString()}` : '—' },
              ].map(({ label, value, accent }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>{label}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: accent ? '#818cf8' : '#94a3b8',
                    textTransform: accent ? 'capitalize' : 'none',
                  }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Link Apartment Modal */}
      {showLinkModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 28, width: 380, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Link Apartment</h3>
              <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select Apartment</label>
            <select value={selectedApt} onChange={e => setSelectedApt(e.target.value)} className="input-dark" style={{ cursor: 'pointer', marginBottom: 16 }}>
              <option value="">— Choose apartment —</option>
              {allApartments.map(a => (
                <option key={a.id} value={a.id} style={{ background: '#0d1117' }}>
                  #{a.number} — ${Number(a.price).toLocaleString()}
                </option>
              ))}
            </select>
            <button onClick={handleLinkApartment} disabled={!selectedApt} className="btn-gradient" style={{ width: '100%', padding: '11px', borderRadius: 10, fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif", opacity: selectedApt ? 1 : 0.5 }}>
              Link Apartment
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
