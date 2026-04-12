'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Users, DollarSign, TrendingUp, CheckCircle } from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string
  status: string
  budget?: number
  created_at: string
}

export default function SellerDashboardPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    loadData()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    // In a real setup, clients would have an assigned_to field
    // For now, fetch all clients as a demonstration
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    setClients(data || [])
    setLoading(false)
  }

  const soldCount = clients.filter(c => c.status === 'bought').length
  const reservedCount = clients.filter(c => c.status === 'reserved').length
  const revenue = clients.filter(c => c.status === 'bought').reduce((s, c) => s + (c.budget || 0), 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthClients = clients.filter(c => new Date(c.created_at) >= monthStart).length

  const stats = [
    { label: 'Total Clients', value: clients.length, icon: <Users size={18} />, color: '#6366f1' },
    { label: 'Sold This Month', value: soldCount, icon: <CheckCircle size={18} />, color: '#10b981' },
    { label: 'Reserved', value: reservedCount, icon: <TrendingUp size={18} />, color: '#f59e0b' },
    { label: 'Est. Revenue', value: `$${(revenue / 1000).toFixed(0)}K`, icon: <DollarSign size={18} />, color: '#ec4899', isStr: true },
  ]

  const STATUS_COLORS: Record<string, string> = {
    new: '#818cf8',
    contacted: '#60a5fa',
    viewing: '#fbbf24',
    reserved: '#f87171',
    bought: '#34d399',
  }

  return (
    <AppShell>
      <div style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>
            My Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{userEmail}</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {stats.map((s, i) => (
            <div
              key={i}
              className="metric-card"
              style={{
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '18px 20px',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${s.color}30`}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, marginBottom: 12 }}>
                {s.icon}
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 26, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px' }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Pipeline summary */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Pipeline Overview</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['new', 'contacted', 'viewing', 'reserved', 'bought'].map(status => {
              const count = clients.filter(c => c.status === status).length
              const pct = clients.length ? Math.round((count / clients.length) * 100) : 0
              return (
                <div key={status} style={{
                  flex: 1, minWidth: 100,
                  background: `${STATUS_COLORS[status]}10`,
                  border: `1px solid ${STATUS_COLORS[status]}30`,
                  borderRadius: 12, padding: '14px 16px', textAlign: 'center',
                }}>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: STATUS_COLORS[status] }}>{count}</div>
                  <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize', marginTop: 2 }}>{status}</div>
                  <div style={{ fontSize: 10, color: '#334155', marginTop: 2 }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent clients */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Recent Clients</h3>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}
            </div>
          ) : clients.slice(0, 8).map((c, i) => (
            <div
              key={c.id}
              onClick={() => window.location.href = `/clients/${c.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.paddingLeft = '6px'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.paddingLeft = '0'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: `hsl(${(i * 47) % 360}, 55%, 38%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>
                {c.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                <div style={{ color: '#475569', fontSize: 11 }}>{c.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {c.budget && <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>${Number(c.budget).toLocaleString()}</span>}
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  textTransform: 'capitalize',
                  background: `${STATUS_COLORS[c.status] || '#64748b'}20`,
                  color: STATUS_COLORS[c.status] || '#64748b',
                }}>
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
