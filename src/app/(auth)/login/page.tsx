'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Role = 'developer' | 'jkh_manager' | 'resident'

const ROLES: { id: Role; emoji: string; title: string; sub: string; color: string; glow: string; border: string }[] = [
  { id: 'developer',   emoji: '🏗️', title: 'Developer',    sub: 'застройщик',              color: '#6366f1', glow: 'rgba(99,102,241,0.25)',  border: 'rgba(99,102,241,0.5)'  },
  { id: 'jkh_manager', emoji: '🏢', title: 'ЖКХ Manager',  sub: 'управляющая компания',    color: '#10b981', glow: 'rgba(16,185,129,0.2)',   border: 'rgba(16,185,129,0.45)' },
  { id: 'resident',    emoji: '🏠', title: 'Resident',      sub: 'жилец',                   color: '#f59e0b', glow: 'rgba(245,158,11,0.2)',   border: 'rgba(245,158,11,0.45)' },
]

export default function LoginPage() {
  const [role, setRole]         = useState<Role>('developer')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const activeRole = ROLES.find(r => r.id === role)!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // ── Resident login ──────────────────────────────────────────────
      if (role === 'resident') {
        const { data, error: dbErr } = await supabase
          .from('residents')
          .select('id, full_name, apartment_id')
          .eq('email', email)
          .maybeSingle()

        if (dbErr) { setError('Could not verify resident account'); setLoading(false); return }
        if (!data)  { setError('No resident found with that email. Use the email from your purchase.'); setLoading(false); return }

        document.cookie = `proptech-uz-role=resident; path=/; max-age=86400`
        document.cookie = `proptech-uz-resident-id=${data.id}; path=/; max-age=86400`
        document.cookie = `proptech-uz-resident-email=${encodeURIComponent(email)}; path=/; max-age=86400`
        setTimeout(() => { window.location.replace('/resident/dashboard') }, 300)
        return
      }

      // ── Supabase auth for Developer / JKH Manager ───────────────────
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) { setError(authErr.message); setLoading(false); return }

      if (data.user) {
        const cookieRole = role === 'jkh_manager' ? 'jkh_manager' : 'admin'
        try {
          await supabase.from('user_profiles').upsert(
            { id: data.user.id, email: data.user.email, role: cookieRole, full_name: cookieRole === 'admin' ? 'Admin' : 'JKH Manager' },
            { onConflict: 'id' }
          )
        } catch { /* non-critical */ }

        document.cookie = `proptech-uz-role=${cookieRole}; path=/; max-age=86400`

        const redirect = role === 'jkh_manager' ? '/jkh/dashboard' : '/dashboard'
        setTimeout(() => { window.location.replace(redirect) }, 500)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080b14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Orb 1 */}
      <div className="animate-orb1" style={{
        position: 'absolute', top: '-180px', left: '-120px',
        width: 560, height: 560, borderRadius: '50%',
        background: `radial-gradient(circle, ${activeRole.glow} 0%, transparent 65%)`,
        pointerEvents: 'none', transition: 'background 0.5s',
      }} />
      {/* Orb 2 */}
      <div className="animate-orb2" style={{
        position: 'absolute', bottom: '-160px', right: '-80px',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      {/* Card */}
      <div className="animate-fade-up" style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: 460, margin: '0 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '40px 40px 32px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, marginBottom: 12,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
          }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: 'white' }}>P</span>
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 4 }}>
            PropTech UZ
          </h1>
          <p style={{ color: '#64748b', fontSize: 12.5 }}>AI-Powered Real Estate Platform</p>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' }}>
            Sign in as
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ROLES.map(r => {
              const active = role === r.id
              return (
                <button key={r.id} type="button" onClick={() => { setRole(r.id); setError('') }}
                  style={{
                    padding: '11px 6px', borderRadius: 12, cursor: 'pointer',
                    background: active ? `${r.color}15` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${active ? r.border : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: active ? `0 0 18px ${r.glow}` : 'none',
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <span style={{ fontSize: 20 }}>{r.emoji}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: active ? r.color : '#64748b', transition: 'color 0.2s' }}>
                    {r.title}
                  </span>
                  <span style={{ fontSize: 9.5, color: active ? `${r.color}cc` : '#334155', transition: 'color 0.2s' }}>
                    {r.sub}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 22 }} />

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={role === 'resident' ? 'your@email.com' : 'you@company.com'}
              className="input" autoComplete="email" required
            />
            {role === 'resident' && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>💡</span> Use the email from your apartment purchase
              </div>
            )}
          </div>

          {/* Password — hidden for resident */}
          {role !== 'resident' && (
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" className="input"
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password" required
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
          {role === 'resident' && <div style={{ marginBottom: 22 }} />}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
              color: '#fca5a5', marginBottom: 16, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '13px',
              borderRadius: 12, fontSize: 14.5, fontWeight: 700,
              background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}cc)`,
              border: 'none', color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading ? 0.75 : 1,
              boxShadow: `0 6px 22px ${activeRole.glow}`,
              transition: 'all 0.2s',
              fontFamily: 'DM Sans, sans-serif',
            }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : `Sign in as ${activeRole.title}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 11.5, marginTop: 24 }}>
          © 2026 PropTech UZ. All rights reserved.
        </p>
      </div>
    </div>
  )
}
