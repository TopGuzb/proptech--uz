'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Plus, UserCheck, X, Shield, Users } from 'lucide-react'
import Toast from '@/components/Toast'

interface UserProfile {
  id: string
  email: string
  role: string
  created_at: string
}

const ROLES = ['admin', 'manager']

const ROLE_STYLES: Record<string, { bg: string; color: string }> = {
  admin: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
  manager: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'manager' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  async function handleInvite() {
    if (!form.email.trim()) return
    setSaving(true)
    try {
      // In a real app, this would send an invite email
      // For now, create the profile record
      const { error } = await supabase.from('user_profiles').insert({
        email: form.email.trim(),
        role: form.role,
      })
      if (error) throw error
      setToast({ msg: `Invite sent to ${form.email}`, type: 'success' })
      setShowModal(false)
      setForm({ email: '', role: 'manager' })
      loadUsers()
    } catch {
      setToast({ msg: 'Failed to invite user', type: 'error' })
    }
    setSaving(false)
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', userId)
    setToast({ msg: 'Role updated', type: 'success' })
    loadUsers()
  }

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Team
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{users.length} members</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gradient"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
        >
          <Plus size={15} /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Members', value: users.length, icon: <Users size={18} />, color: '#6366f1' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: <Shield size={18} />, color: '#f59e0b' },
          { label: 'Managers', value: users.filter(u => u.role === 'manager').length, icon: <UserCheck size={18} />, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                {s.icon}
              </div>
            </div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-1px' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Member', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 20px', color: '#475569', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <tr key={i}>
                  {[200, 100, 80, 120].map((w, j) => (
                    <td key={j} style={{ padding: '14px 20px' }}><div className="skeleton" style={{ height: 16, width: w }} /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: '#334155', fontSize: 13 }}>
                  No team members yet
                </td>
              </tr>
            ) : users.map((u, i) => (
              <tr
                key={u.id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `hsl(${(i * 60) % 360}, 55%, 35%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                    }}>
                      {u.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{u.email}</span>
                  </div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <select
                    value={u.role}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    style={{
                      appearance: 'none',
                      background: ROLE_STYLES[u.role]?.bg || 'rgba(255,255,255,0.05)',
                      border: 'none',
                      borderRadius: 8,
                      padding: '5px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: ROLE_STYLES[u.role]?.color || '#94a3b8',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {ROLES.map(r => <option key={r} value={r} style={{ background: '#0d1117' }}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 12 }}>
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <button
                    onClick={async () => {
                      await supabase.from('user_profiles').delete().eq('id', u.id)
                      setToast({ msg: 'User removed', type: 'error' })
                      loadUsers()
                    }}
                    style={{
                      padding: '5px 10px', borderRadius: 7,
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                      color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 32, width: 400, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Invite Team Member</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="colleague@company.com" className="input-dark" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="input-dark" style={{ cursor: 'pointer' }}>
                  {ROLES.map(r => <option key={r} value={r} style={{ background: '#0d1117', textTransform: 'capitalize' }}>{r}</option>)}
                </select>
              </div>
              <button onClick={handleInvite} disabled={saving} className="btn-gradient" style={{ padding: '12px', borderRadius: 12, fontWeight: 600, fontSize: 14, fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
                {saving ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

