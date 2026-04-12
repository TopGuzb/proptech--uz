'use client'

import { useEffect, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import {
  Building2, DollarSign, TrendingUp, CheckCircle2,
  Bell, RefreshCw, Sparkles, X,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

/* ── types ── */
interface Metric { total: number; sold: number; available: number; revenue: number }
interface Client { id: string; name: string; status: string; created_at: string; budget?: number }
interface Insight { icon: string; title: string; description: string }

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ── custom tooltip ── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? `$${Number(p.value).toLocaleString()}` : p.value}
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [metrics, setMetrics]     = useState<Metric | null>(null)
  const [clients, setClients]     = useState<Client[]>([])
  const [revData, setRevData]     = useState<{ month: string; Revenue: number }[]>([])
  const [projData, setProjData]   = useState<{ name: string; Sold: number; Available: number }[]>([])
  const [insights, setInsights]   = useState<Insight[]>([])
  const [insLoading, setInsLoading] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [userName, setUserName]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)

    // User name
    const { data: ud } = await supabase.auth.getUser()
    const name = ud.user?.user_metadata?.full_name || ud.user?.email?.split('@')[0] || 'there'
    setUserName(name)

    // Metrics
    const [
      { count: total },
      { count: sold },
      { count: available },
      { data: soldApts },
    ] = await Promise.all([
      supabase.from('apartments').select('*', { count: 'exact', head: true }),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available'),
      supabase.from('apartments').select('price').eq('status', 'sold'),
    ])
    const revenue = soldApts?.reduce((s, a) => s + (a.price || 0), 0) ?? 0
    setMetrics({ total: total ?? 0, sold: sold ?? 0, available: available ?? 0, revenue })

    // Recent clients (reserved/bought)
    const { data: cls } = await supabase.from('clients')
      .select('id, name, status, created_at, budget')
      .in('status', ['reserved', 'bought'])
      .order('created_at', { ascending: false })
      .limit(10)
    setClients(cls ?? [])

    // Revenue trend – last 6 months
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const { data: ma } = await supabase.from('apartments').select('price').eq('status', 'sold').gte('updated_at', from).lte('updated_at', to)
      trend.push({ month: MONTH_ABBR[d.getMonth()], Revenue: ma?.reduce((s, a) => s + (a.price || 0), 0) ?? 0 })
    }
    setRevData(trend)

    // Units by project
    const { data: projects } = await supabase.from('projects').select('id, name').limit(6)
    if (projects) {
      const pd = await Promise.all(projects.map(async p => {
        const [{ count: s }, { count: av }] = await Promise.all([
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'sold'),
          supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'available'),
        ])
        return { name: (p.name ?? 'Project').slice(0, 10), Sold: s ?? 0, Available: av ?? 0 }
      }))
      setProjData(pd)
    }

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadInsights() {
    setInsLoading(true)
    try {
      const r = await fetch('/api/ai-insights', { method: 'POST' })
      const d = await r.json()
      setInsights(d.insights ?? [])
    } catch { setToast({ msg: 'Failed to load insights', type: 'error' }) }
    setInsLoading(false)
  }

  const CARDS = [
    { label: 'Total Units',  value: metrics?.total ?? 0,   fmt: 'n', icon: <Building2 size={19} />,    color: '#6366f1', glow: '#6366f120' },
    { label: 'Sold',         value: metrics?.sold ?? 0,    fmt: 'n', icon: <CheckCircle2 size={19} />, color: '#10b981', glow: '#10b98120' },
    { label: 'Available',    value: metrics?.available ?? 0, fmt: 'n', icon: <TrendingUp size={19} />,  color: '#f59e0b', glow: '#f59e0b20' },
    { label: 'Revenue',      value: metrics?.revenue ?? 0, fmt: '$', icon: <DollarSign size={19} />,   color: '#ec4899', glow: '#ec489920' },
  ]

  const STATUS_CLS: Record<string, string> = { reserved: 'badge-reserved', bought: 'badge-bought' }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 3 }}>
            {greeting()} {userName ? `, ${userName}` : ''} 👋
          </h1>
          <p style={{ color: '#64748b', fontSize: 13.5 }}>Overview — All Projects</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Refresh */}
          <button onClick={() => { load(); setToast({ msg: 'Data refreshed', type: 'info' }) }}
            className="btn-ghost" style={{ padding: '8px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={15} style={{ color: '#64748b' }} />
          </button>
          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setNotifOpen(o => !o)} className="btn-ghost"
              style={{ padding: '8px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Bell size={15} style={{ color: '#64748b' }} />
              {clients.length > 0 && (
                <span style={{
                  position: 'absolute', top: 5, right: 5, width: 7, height: 7,
                  borderRadius: '50%', background: '#6366f1',
                }} />
              )}
            </button>
            {notifOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 44, width: 300, zIndex: 200,
                background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                animation: 'fadeIn 0.15s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>Recent Clients</span>
                  <button onClick={() => setNotifOpen(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={13} /></button>
                </div>
                {clients.slice(0, 5).map(c => (
                  <div key={c.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.name}</div>
                    <div style={{ color: '#475569', marginTop: 2 }}>{c.status} · {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
                {clients.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#334155', fontSize: 12 }}>No recent activity</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {CARDS.map((c, i) => (
          <div key={i} className="card card-hover" style={{ padding: 20, cursor: 'default',
            animationDelay: `${i * 0.07}s` }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 36px ${c.glow}`}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: c.glow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                {c.icon}
              </div>
              {!loading && metrics && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>+{Math.floor(Math.random()*20)+1}%</span>
              )}
            </div>
            {loading
              ? <><div className="skeleton" style={{ height: 32, width: '60%', marginBottom: 6 }} /><div className="skeleton" style={{ height: 13, width: '80%' }} /></>
              : <>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-1px', lineHeight: 1 }}>
                    {c.fmt === '$'
                      ? `$${(c.value / 1000).toFixed(0)}K`
                      : c.value.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 5 }}>{c.label}</div>
                </>
            }
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Revenue trend */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 18 }}>Revenue Trend</h3>
          {loading
            ? <div className="skeleton" style={{ height: 180 }} />
            : <ResponsiveContainer width="100%" height={180}>
                <LineChart data={revData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
          }
        </div>
        {/* Units by project */}
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 13.5, fontWeight: 700, color: '#e2e8f0', marginBottom: 18 }}>Units by Project</h3>
          {loading
            ? <div className="skeleton" style={{ height: 180 }} />
            : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={projData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  <Bar dataKey="Sold"      fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="Available" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* ── AI Insights ── */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Sparkles size={17} color="#818cf8" />
            <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Insights by Claude</h3>
          </div>
          <button onClick={loadInsights} disabled={insLoading} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 12 }}>
            {insLoading
              ? <><RefreshCw size={12} className="animate-spin" /> Analysing…</>
              : <><Sparkles size={12} /> Analyse with AI</>
            }
          </button>
        </div>

        {insLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 96 }} />)}
          </div>
        ) : insights.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {insights.map((ins, i) => (
              <div key={i} className="animate-fade-up" style={{
                padding: '16px 18px', borderRadius: 12,
                background: 'rgba(99,102,241,0.05)',
                borderLeft: '3px solid #6366f1',
                border: '1px solid rgba(99,102,241,0.15)',
                borderLeftWidth: 3,
                animationDelay: `${i * 0.08}s`,
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{ins.icon || '✨'}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{ins.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.55 }}>{ins.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#334155', fontSize: 13 }}>
            Click &quot;Analyse with AI&quot; to get insights about your portfolio
          </div>
        )}
      </div>

      {/* ── Recent Transactions ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Recent Transactions</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {['Client','Status','Budget','Date'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      {[180,80,100,90].map((w,j) => (
                        <td key={j}><div className="skeleton" style={{ height: 14, width: w }} /></td>
                      ))}
                    </tr>
                  ))
                : clients.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#334155' }}>No recent transactions</td></tr>
                  : clients.map((c, i) => (
                      <tr key={c.id} onClick={() => window.location.href = `/clients/${c.id}`}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: '50%',
                              background: `hsl(${(i*53)%360},50%,38%)`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
                            }}>{c.name?.[0]?.toUpperCase()}</div>
                            <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{c.name}</span>
                          </div>
                        </td>
                        <td><span className={`badge ${STATUS_CLS[c.status] || 'badge-new'}`}>{c.status}</span></td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{c.budget ? `$${Number(c.budget).toLocaleString()}` : '—'}</td>
                        <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
