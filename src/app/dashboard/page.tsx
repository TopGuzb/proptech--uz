'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppShell from '@/components/AppShell'
import { Bell, TrendingUp, Building2, DollarSign, CheckCircle, Sparkles, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface Metrics {
  totalApartments: number
  sold: number
  available: number
  revenue: number
}

interface Client {
  id: string
  name: string
  apartment_id: string
  status: string
  created_at: string
  price?: number
  project_name?: string
  apartment_number?: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        color: '#e2e8f0',
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>
            {p.name}: {p.name === 'revenue' ? `$${Number(p.value).toLocaleString()}` : p.value}
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({ totalApartments: 0, sold: 0, available: 0, revenue: 0 })
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [notifications, setNotifications] = useState<Client[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [revenueData, setRevenueData] = useState<Array<{ month: string; revenue: number }>>([])
  const [projectData, setProjectData] = useState<Array<{ name: string; sold: number; available: number }>>([])
  const [insights, setInsights] = useState<string[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 12 && h < 17) setGreeting('Good afternoon')
    else if (h >= 17) setGreeting('Good evening')
    loadData()
  }, [])

  async function loadData() {
    // Metrics
    const { count: totalCount } = await supabase.from('apartments').select('*', { count: 'exact', head: true })
    const { count: soldCount } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'sold')
    const { count: availCount } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('status', 'available')
    const { data: soldApts } = await supabase.from('apartments').select('price').eq('status', 'sold')
    const revenue = soldApts?.reduce((sum, a) => sum + (a.price || 0), 0) || 0

    setMetrics({
      totalApartments: totalCount || 0,
      sold: soldCount || 0,
      available: availCount || 0,
      revenue,
    })

    // Recent clients
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .in('status', ['reserved', 'bought'])
      .order('created_at', { ascending: false })
      .limit(10)
    setRecentClients(clients || [])
    setNotifications((clients || []).slice(0, 5))

    // Revenue trend (last 6 months)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
      const { data: monthApts } = await supabase.from('apartments').select('price').eq('status', 'sold').gte('updated_at', start).lte('updated_at', end)
      months.push({
        month: MONTH_NAMES[d.getMonth()],
        revenue: monthApts?.reduce((s, a) => s + (a.price || 0), 0) || 0,
      })
    }
    setRevenueData(months)

    // Projects data
    const { data: projects } = await supabase.from('projects').select('id, name')
    if (projects) {
      const pData = await Promise.all(projects.slice(0, 5).map(async (p) => {
        const { count: s } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'sold')
        const { count: av } = await supabase.from('apartments').select('*', { count: 'exact', head: true }).eq('project_id', p.id).eq('status', 'available')
        return { name: p.name?.slice(0, 10) || 'Project', sold: s || 0, available: av || 0 }
      }))
      setProjectData(pData)
    }
  }

  async function loadInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch('/api/ai-insights', { method: 'POST' })
      const data = await res.json()
      setInsights(data.insights || [])
    } catch {
      setInsights(['Не удалось загрузить аналитику. Попробуйте позже.'])
    }
    setInsightsLoading(false)
  }

  const metricCards = [
    {
      label: 'Total Apartments',
      value: metrics.totalApartments.toLocaleString(),
      icon: <Building2 size={20} />,
      color: '#6366f1',
      glow: 'rgba(99,102,241,0.3)',
      change: '+12%',
    },
    {
      label: 'Sold',
      value: metrics.sold.toLocaleString(),
      icon: <CheckCircle size={20} />,
      color: '#10b981',
      glow: 'rgba(16,185,129,0.3)',
      change: '+8%',
    },
    {
      label: 'Available',
      value: metrics.available.toLocaleString(),
      icon: <TrendingUp size={20} />,
      color: '#f59e0b',
      glow: 'rgba(245,158,11,0.3)',
      change: '-3%',
    },
    {
      label: 'Revenue',
      value: `$${(metrics.revenue / 1000).toFixed(0)}K`,
      icon: <DollarSign size={20} />,
      color: '#ec4899',
      glow: 'rgba(236,72,153,0.3)',
      change: '+24%',
    },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: '#e2e8f0',
              letterSpacing: '-0.5px',
              marginBottom: 4,
            }}>
              {greeting} 👋
            </h1>
            <p style={{ color: '#64748b', fontSize: 14 }}>Overview — All Projects</p>
          </div>
          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
                color: '#94a3b8',
              }}
            >
              <Bell size={16} />
              {notifications.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#6366f1',
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifs && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 280,
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                zIndex: 100,
                overflow: 'hidden',
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Recent Activity
                </div>
                {notifications.map((n, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                    <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{n.name}</div>
                    <div style={{ color: '#64748b', marginTop: 2 }}>Status: {n.status} · {new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {metricCards.map((card, i) => (
            <div
              key={i}
              className="metric-card"
              style={{
                background: '#0d1117',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '20px',
                animationDelay: `${i * 0.08}s`,
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${card.glow}`
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: `${card.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}>
                  {card.icon}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: card.change.startsWith('+') ? '#10b981' : '#f59e0b',
                  background: card.change.startsWith('+') ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  padding: '3px 8px',
                  borderRadius: 6,
                }}>
                  {card.change}
                </span>
              </div>
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 30,
                fontWeight: 800,
                color: '#e2e8f0',
                letterSpacing: '-1px',
                marginBottom: 4,
              }}>
                {card.value}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          {/* Revenue Trend */}
          <div style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24,
          }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>
              Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Units by Project */}
          <div style={{
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: 24,
          }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>
              Units by Project
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="sold" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights */}
        <div style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#818cf8" />
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>
                AI Insights
              </h3>
            </div>
            <button
              onClick={loadInsights}
              disabled={insightsLoading}
              className="btn-gradient"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <RefreshCw size={13} style={{ animation: insightsLoading ? 'spin-slow 1s linear infinite' : 'none' }} />
              Analyse with AI
            </button>
          </div>

          {insightsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {[0,1,2].map(i => (
                <div key={i} className="skeleton" style={{ height: 90 }} />
              ))}
            </div>
          ) : insights.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {insights.map((insight, i) => (
                <div key={i} style={{
                  padding: 16,
                  borderRadius: 12,
                  border: '1px solid rgba(99,102,241,0.2)',
                  background: 'rgba(99,102,241,0.05)',
                  fontSize: 13,
                  color: '#cbd5e1',
                  lineHeight: 1.6,
                  animationDelay: `${i * 0.1}s`,
                }} className="animate-fade-in-up">
                  <span style={{ fontSize: 16, marginRight: 8 }}>{['📊', '🏠', '💡'][i] || '✨'}</span>
                  {insight}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#334155', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
              Click &quot;Analyse with AI&quot; to generate insights about your real estate portfolio
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: '#0d1117',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 16,
          padding: 24,
        }}>
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 20 }}>
            Recent Transactions
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Client', 'Apartment', 'Project', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      color: '#475569',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#334155', fontSize: 13 }}>
                      No recent transactions
                    </td>
                  </tr>
                ) : recentClients.map((c, i) => (
                  <tr key={c.id} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: `hsl(${(i * 60) % 360}, 60%, 40%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'white',
                        }}>
                          {c.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ color: '#e2e8f0' }}>{c.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{c.apartment_number || '—'}</td>
                    <td style={{ padding: '12px', color: '#94a3b8' }}>{c.project_name || '—'}</td>
                    <td style={{ padding: '12px', color: '#10b981', fontWeight: 600 }}>
                      {c.price ? `$${Number(c.price).toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="status-badge" style={{
                        background: c.status === 'bought' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: c.status === 'bought' ? '#10b981' : '#f59e0b',
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#64748b' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
