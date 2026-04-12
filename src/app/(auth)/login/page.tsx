'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Upsert user profile
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          role: 'admin',
          updated_at: new Date().toISOString(),
        })

        // Set role cookie
        document.cookie = `proppio-role=admin; path=/; max-age=86400`

        router.push('/dashboard')
      }
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080b14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Animated orbs */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        top: '-200px',
        right: '-100px',
        animation: 'orb-float-1 12s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        bottom: '-150px',
        left: '-100px',
        animation: 'orb-float-2 15s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
        top: '40%',
        left: '20%',
        animation: 'orb-float-3 10s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: 420,
        padding: '0 24px',
        zIndex: 10,
      }}>
        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          animation: 'fadeInUp 0.5s ease both',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              marginBottom: 16,
              boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: '#e2e8f0',
              letterSpacing: '-0.5px',
              marginBottom: 6,
            }}>Proppio AI</h1>
            <p style={{ color: '#64748b', fontSize: 13, letterSpacing: '0.02em' }}>
              AI-Powered Real Estate Platform
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="input-dark"
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-dark"
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#f87171',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin-slow 1s linear infinite' }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 24 }}>
          © 2026 Proppio AI. All rights reserved.
        </p>
      </div>
    </div>
  )
}
