'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr || !data.user) {
      setError(authErr?.message || 'Invalid credentials. Please try again.')
      setLoading(false)
      return
    }

    // Upsert profile
    await supabase.from('user_profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || email.split('@')[0],
      role: 'admin',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    // Set role cookie for middleware
    document.cookie = `proppio-role=admin; path=/; max-age=${60 * 60 * 24 * 7}`
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080b14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Orb 1 – top-left indigo */}
      <div className="animate-orb1" style={{
        position: 'absolute', top: '-180px', left: '-120px',
        width: 560, height: 560, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Orb 2 – bottom-right cyan */}
      <div className="animate-orb2" style={{
        position: 'absolute', bottom: '-160px', right: '-80px',
        width: 480, height: 480, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)',
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
        width: '100%', maxWidth: 420, margin: '0 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '44px 40px 36px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 14,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(99,102,241,0.35)',
          }}>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 24, fontWeight: 800, color: 'white' }}>P</span>
          </div>
          <h1 style={{
            fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 800,
            color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 5,
          }}>Proppio AI</h1>
          <p style={{ color: '#64748b', fontSize: 13, letterSpacing: '0.01em' }}>
            AI-Powered Real Estate Platform
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 600,
              color: '#94a3b8', marginBottom: 7,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com" className="input"
              autoComplete="email" required
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block', fontSize: 11.5, fontWeight: 600,
              color: '#94a3b8', marginBottom: 7,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" className="input"
                style={{ paddingRight: 44 }}
                autoComplete="current-password" required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
              color: '#fca5a5', marginBottom: 18, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary"
            style={{
              width: '100%', padding: '13px',
              borderRadius: 12, fontSize: 15,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 12, marginTop: 28 }}>
          © 2026 Proppio AI. All rights reserved.
        </p>
      </div>
    </div>
  )
}
