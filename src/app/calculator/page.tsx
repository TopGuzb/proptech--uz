'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Calculator, DollarSign, Percent, Clock } from 'lucide-react'

const TERM_OPTIONS = [12, 24, 36, 48, 60]

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const start = display
    const end = value
    const duration = 400
    const startTime = performance.now()

    function update(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (progress < 1) requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }, [value])

  return (
    <span>{prefix}{display.toLocaleString()}{suffix}</span>
  )
}

export default function CalculatorPage() {
  const [price, setPrice] = useState(150000)
  const [downPct, setDownPct] = useState(20)
  const [term, setTerm] = useState(36)
  const [rate, setRate] = useState(0)

  const downPayment = Math.round(price * downPct / 100)
  const loanAmount = price - downPayment
  const monthlyRate = rate / 100 / 12
  const monthlyPayment = monthlyRate > 0
    ? Math.round(loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -term)))
    : Math.round(loanAmount / term)
  const totalPayment = monthlyPayment * term
  const totalInterest = totalPayment - loanAmount

  const results = [
    { label: 'Monthly Payment', value: monthlyPayment, prefix: '$', color: '#6366f1', icon: <DollarSign size={18} /> },
    { label: 'Loan Amount', value: loanAmount, prefix: '$', color: '#10b981', icon: <DollarSign size={18} /> },
    { label: 'Total Payment', value: totalPayment, prefix: '$', color: '#f59e0b', icon: <DollarSign size={18} /> },
    { label: 'Total Interest', value: totalInterest, prefix: '$', color: '#ec4899', icon: <Percent size={18} /> },
  ]

  return (
    <AppShell>
      <div style={{ maxWidth: 900 }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={18} color="white" />
            </div>
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.5px' }}>
              Mortgage Calculator
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, marginLeft: 46 }}>Calculate monthly payments and loan details</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Inputs */}
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28 }}>
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 24 }}>
              Loan Parameters
            </h2>

            {/* Property Price */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Property Price
                </label>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
                  ${price.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min={10000}
                max={2000000}
                step={5000}
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                style={{
                  width: '100%',
                  appearance: 'none',
                  height: 4,
                  borderRadius: 4,
                  background: `linear-gradient(to right, #6366f1 ${((price - 10000) / (2000000 - 10000)) * 100}%, rgba(255,255,255,0.1) 0%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 4 }}>
                <span>$10K</span><span>$2M</span>
              </div>
            </div>

            {/* Down Payment */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Down Payment
                </label>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                  {downPct}% <span style={{ fontSize: 12, color: '#64748b' }}>(${downPayment.toLocaleString()})</span>
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={downPct}
                onChange={e => setDownPct(Number(e.target.value))}
                style={{
                  width: '100%',
                  appearance: 'none',
                  height: 4,
                  borderRadius: 4,
                  background: `linear-gradient(to right, #10b981 ${((downPct - 10) / 40) * 100}%, rgba(255,255,255,0.1) 0%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 4 }}>
                <span>10%</span><span>50%</span>
              </div>
            </div>

            {/* Loan Term */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Loan Term
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {TERM_OPTIONS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTerm(t)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: term === t ? 'linear-gradient(135deg, #6366f1, #818cf8)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${term === t ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      color: term === t ? 'white' : '#64748b',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {t}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Annual Interest Rate
                </label>
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 700, color: '#f59e0b' }}>
                  {rate}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                style={{
                  width: '100%',
                  appearance: 'none',
                  height: 4,
                  borderRadius: 4,
                  background: `linear-gradient(to right, #f59e0b ${(rate / 30) * 100}%, rgba(255,255,255,0.1) 0%)`,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#334155', marginTop: 4 }}>
                <span>0%</span><span>30%</span>
              </div>
            </div>
          </div>

          {/* Results */}
          <div>
            {/* Main result */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.08))',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 16,
              padding: 28,
              textAlign: 'center',
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Monthly Payment
              </div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 48, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-2px' }}>
                $<AnimatedNumber value={monthlyPayment} />
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                for {term} months
              </div>
            </div>

            {/* Detail cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {results.slice(1).map((r, i) => (
                <div key={i} style={{
                  background: '#0d1117',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  padding: '18px 20px',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: r.color }}>
                      {r.icon}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: r.color, letterSpacing: '-0.5px' }}>
                    $<AnimatedNumber value={r.value} />
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontWeight: 500 }}>{r.label}</div>
                </div>
              ))}
            </div>

            {/* Payment breakdown bar */}
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payment Breakdown
              </div>
              <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                <div style={{
                  width: `${loanAmount ? (loanAmount / totalPayment) * 100 : 100}%`,
                  background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                  transition: 'width 0.4s ease',
                }} />
                {totalInterest > 0 && (
                  <div style={{
                    flex: 1,
                    background: 'linear-gradient(90deg, #ec4899, #f472b6)',
                    transition: 'width 0.4s ease',
                  }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1' }} />
                  <span style={{ color: '#64748b' }}>Principal: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${loanAmount.toLocaleString()}</span></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: '#ec4899' }} />
                  <span style={{ color: '#64748b' }}>Interest: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${totalInterest.toLocaleString()}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
