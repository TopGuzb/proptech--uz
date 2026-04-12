'use client'

import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { Check, Zap, Building2, Globe } from 'lucide-react'

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: 49,
    icon: <Zap size={20} />,
    color: '#6366f1',
    description: 'Perfect for small agencies',
    features: [
      'Up to 100 apartments',
      '50 clients',
      '1 project',
      'Basic AI insights',
      'Email support',
      'Mobile app',
    ],
    notIncluded: ['AI Chat assistant', 'Advanced analytics', 'Custom branding', 'API access'],
  },
  {
    name: 'Professional',
    monthlyPrice: 99,
    icon: <Building2 size={20} />,
    color: '#10b981',
    description: 'For growing real estate teams',
    popular: true,
    features: [
      'Unlimited apartments',
      '500 clients',
      '10 projects',
      'Full AI suite (chat + insights)',
      'AI email generator',
      'Priority support',
      'Advanced analytics',
      'Team members (5)',
    ],
    notIncluded: ['Custom branding', 'API access'],
  },
  {
    name: 'Enterprise',
    monthlyPrice: 199,
    icon: <Globe size={20} />,
    color: '#f59e0b',
    description: 'For large real estate companies',
    features: [
      'Unlimited everything',
      'Unlimited clients',
      'Unlimited projects',
      'Full AI suite',
      'Custom branding',
      'Dedicated support',
      'API access',
      'Unlimited team members',
      'Custom integrations',
      'SLA guarantee',
    ],
    notIncluded: [],
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <AppShell>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px', marginBottom: 10 }}>
            Simple, transparent pricing
          </h1>
          <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>
            Choose the plan that fits your team. Upgrade or downgrade any time.
          </p>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 40,
            padding: '6px 8px',
          }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '7px 18px',
                borderRadius: 30,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: !annual ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'transparent',
                color: !annual ? 'white' : '#64748b',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '7px 18px',
                borderRadius: 30,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                background: annual ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'transparent',
                color: annual ? 'white' : '#64748b',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Annual
              <span style={{
                background: 'rgba(16,185,129,0.2)',
                color: '#10b981',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 10,
              }}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {PLANS.map((plan, i) => {
            const price = annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice
            return (
              <div
                key={i}
                style={{
                  background: plan.popular ? 'rgba(99,102,241,0.05)' : '#0d1117',
                  border: `1px solid ${plan.popular ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 20,
                  padding: 28,
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${plan.color}20`
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                  ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 16px',
                    borderRadius: 20,
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                {/* Icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `${plan.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: plan.color,
                  }}>
                    {plan.icon}
                  </div>
                  <div>
                    <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{plan.name}</h3>
                    <p style={{ fontSize: 11, color: '#64748b' }}>{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 42, fontWeight: 800, color: plan.color, letterSpacing: '-2px' }}>
                      ${price}
                    </span>
                    <span style={{ color: '#475569', fontSize: 13 }}>/mo</span>
                  </div>
                  {annual && (
                    <div style={{ fontSize: 11, color: '#10b981', marginTop: 2 }}>
                      ${price * 12}/year · Save ${(plan.monthlyPrice - price) * 12}/year
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    marginBottom: 24,
                    transition: 'all 0.15s ease',
                    background: plan.popular ? `linear-gradient(135deg, #6366f1, #818cf8)` : 'transparent',
                    border: plan.popular ? 'none' : `1px solid ${plan.color}40`,
                    color: plan.popular ? 'white' : plan.color,
                  }}
                  onMouseEnter={e => {
                    if (!plan.popular) {
                      ;(e.currentTarget as HTMLElement).style.background = `${plan.color}15`
                    }
                  }}
                  onMouseLeave={e => {
                    if (!plan.popular) {
                      ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                    }
                  }}
                >
                  {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>

                {/* Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: `${plan.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={10} color={plan.color} strokeWidth={3} />
                      </div>
                      <span style={{ color: '#94a3b8' }}>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.35 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#475569' }}>✕</span>
                      </div>
                      <span style={{ color: '#475569', textDecoration: 'line-through' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 32, color: '#334155', fontSize: 12 }}>
          All plans include a 14-day free trial · No credit card required · Cancel anytime
        </div>
      </div>
    </AppShell>
  )
}
