'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Mail, X, ChevronDown } from 'lucide-react'
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
  created_at: string
  apartment_number?: string
}

const STATUSES = ['All', 'new', 'contacted', 'viewing', 'reserved', 'bought']

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  new: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  contacted: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
  viewing: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  reserved: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
  bought: { bg: 'rgba(16,185,129,0.15)', color: '#34d399' },
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filtered, setFiltered] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [aiEmailLoading, setAiEmailLoading] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', budget: '', status: 'new' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadClients() }, [])

  useEffect(() => {
    let list = clients
    if (activeStatus !== 'All') list = list.filter(c => c.status === activeStatus)
    if (search) list = list.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    setFiltered(list)
  }, [clients, activeStatus, search])

  async function loadClients() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('clients').insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      budget: form.budget ? Number(form.budget) : null,
      status: form.status,
    })
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', email: '', phone: '', budget: '', status: 'new' })
    setToast({ msg: 'Client added', type: 'success' })
    loadClients()
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>, clientId: string) {
    e.stopPropagation()
    await supabase.from('clients').update({ status: e.target.value }).eq('id', clientId)
    setToast({ msg: 'Status updated', type: 'success' })
    loadClients()
  }

  async function handleAiEmail(e: React.MouseEvent, client: Client) {
    e.stopPropagation()
    setAiEmailLoading(client.id)
    try {
      const res = await fetch('/api/ai-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      })
      const data = await res.json()
      // Open in new window
      const w = window.open('', '_blank', 'width=600,height=500')
      w?.document.write(`
        <html><head><title>AI Email</title><style>
          body{font-family:sans-serif;padding:20px;background:#080b14;color:#e2e8f0;}
          h2{color:#818cf8;} .subject{background:#0d1117;padding:12px;border-radius:8px;margin:12px 0;border:1px solid rgba(255,255,255,0.1);}
          .body{background:#0d1117;padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);white-space:pre-wrap;line-height:1.6;}
        </style></head>
        <body><h2>AI Generated Email</h2><div class="subject"><strong>Subject:</strong> ${data.subject}</div><div class="body">${data.body}</div></body>
        </html>
      `)
    } catch {
      setToast({ msg: 'Failed to generate email', type: 'error' })
    }
    setAiEmailLoading(null)
  }

  const scoreColor = (score?: number) => {
    if (!score) return '#475569'
    if (score >= 80) return '#10b981'
    if (score >= 50) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>Clients</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{clients.length} total clients</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-gradient" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          <Plus size={15} /> New Client
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Status pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: activeStatus === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeStatus === s ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: activeStatus === s ? '#818cf8' : '#64748b',
                textTransform: 'capitalize',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="input-dark"
            style={{ paddingLeft: 32, width: 220 }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Client', 'Phone', 'Budget', 'Apartment', 'Status', 'AI Score', 'Date', 'Actions'].map(h => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  color: '#475569',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(8).fill(0).map((_, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div className="skeleton" style={{ height: 16, width: j === 0 ? 140 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#334155', fontSize: 13 }}>
                  No clients found
                </td>
              </tr>
            ) : filtered.map((c, i) => (
              <tr
                key={c.id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => window.location.href = `/clients/${c.id}`}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `hsl(${(i * 47) % 360}, 55%, 40%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.name}</div>
                      <div style={{ color: '#475569', fontSize: 11 }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 16px', color: c.budget ? '#10b981' : '#475569', fontWeight: c.budget ? 600 : 400 }}>
                  {c.budget ? `$${Number(c.budget).toLocaleString()}` : '—'}
                </td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{c.apartment_number || '—'}</td>
                <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <select
                      value={c.status}
                      onChange={e => handleStatusChange(e, c.id)}
                      style={{
                        appearance: 'none',
                        background: STATUS_STYLES[c.status]?.bg || 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '4px 20px 4px 8px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: STATUS_STYLES[c.status]?.color || '#94a3b8',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={10} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', color: STATUS_STYLES[c.status]?.color, pointerEvents: 'none' }} />
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {c.ai_score !== undefined ? (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: scoreColor(c.ai_score),
                      background: `${scoreColor(c.ai_score)}20`,
                      padding: '3px 8px',
                      borderRadius: 6,
                    }}>
                      {c.ai_score}
                    </span>
                  ) : <span style={{ color: '#334155', fontSize: 12 }}>—</span>}
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => handleAiEmail(e, c)}
                    disabled={aiEmailLoading === c.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 8,
                      background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                      color: '#818cf8', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <Mail size={11} />
                    {aiEmailLoading === c.id ? '...' : 'AI Email'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Client Modal */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 32, width: 460, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>New Client</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'John Doe', type: 'text', full: true },
                { key: 'email', label: 'Email', placeholder: 'john@email.com', type: 'email' },
                { key: 'phone', label: 'Phone', placeholder: '+998 90 123 45 67', type: 'text' },
                { key: 'budget', label: 'Budget ($)', placeholder: '100000', type: 'number' },
              ].map(({ key, label, placeholder, type, full }) => (
                <div key={key} style={{ gridColumn: full ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-dark"
                  />
                </div>
              ))}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="input-dark"
                  style={{ cursor: 'pointer' }}
                >
                  {STATUSES.slice(1).map(s => <option key={s} value={s} style={{ background: '#0d1117', textTransform: 'capitalize' }}>{s}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleCreate} disabled={saving} className="btn-gradient" style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 14, marginTop: 20, fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
