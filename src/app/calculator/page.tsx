'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Calculator } from 'lucide-react'

function useAnimatedNumber(target: number, duration = 380) {
  const [value, setValue] = useState(target)
  useEffect(() => {
    const start = value; const startTime = Date.now()
    const raf = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(start + (target - start) * ease))
      if (p < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [target])
  return value
}

const TERMS = [12, 24, 36, 48, 60]

function RangeRow({ label, value, min, max, step, fmt, color, onChange }: {
  label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; color: string; onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
        <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.09) ${pct}%)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#1e293b', marginTop: 3 }}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
    </div>
  )
}

export default function CalculatorPage() {
  const [price,    setPrice]    = useState(150_000)
  const [downPct,  setDownPct]  = useState(20)
  const [term,     setTerm]     = useState(36)
  const [rate,     setRate]     = useState(0)

  const down      = Math.round(price * downPct / 100)
  const loan      = price - down
  const mr        = rate / 100 / 12
  const monthly   = mr > 0 ? Math.round(loan * mr / (1 - Math.pow(1 + mr, -term))) : Math.round(loan / term)
  const total     = monthly * term
  const interest  = total - loan

  const animMonthly  = useAnimatedNumber(monthly)
  const animLoan     = useAnimatedNumber(loan)
  const animTotal    = useAnimatedNumber(total)
  const animInterest = useAnimatedNumber(interest)
  const animDown     = useAnimatedNumber(down)

  /* payment schedule */
  const schedule = Array.from({ length: Math.min(term, 12) }, (_, i) => {
    const remain = loan - (loan / term) * i
    const int    = mr > 0 ? remain * mr : 0
    const principal = mr > 0 ? monthly - int : monthly
    return { month: i + 1, payment: monthly, principal: Math.round(principal), interest: Math.round(int), balance: Math.max(0, Math.round(remain - principal)) }
  })

  return (
    <AppShell>
      <div style={{ maxWidth: 960 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.4px' }}>Mortgage Calculator</h1>
            <p style={{ color: '#64748b', fontSize: 13 }}>Calculate monthly payments instantly</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
          {/* Inputs */}
          <div className="card" style={{ padding: 26 }}>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 22 }}>Loan Parameters</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <RangeRow label="Property Price"   value={price}   min={10_000} max={2_000_000} step={5_000} fmt={v => `$${v.toLocaleString()}`} color="#6366f1" onChange={setPrice} />
              <RangeRow label="Down Payment"     value={downPct} min={10}     max={50}        step={5}     fmt={v => `${v}%`}                   color="#10b981" onChange={setDownPct} />
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Loan Term</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TERMS.map(t => (
                    <button key={t} onClick={() => setTerm(t)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                      background: term === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${term === t ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                      color: term === t ? 'white' : '#64748b',
                    }}>{t}mo</button>
                  ))}
                </div>
              </div>
              <RangeRow label="Interest Rate (% per year)" value={rate} min={0} max={30} step={0.5} fmt={v => `${v}%`} color="#f59e0b" onChange={setRate} />
            </div>
          </div>

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Hero */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '26px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Monthly Payment</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 52, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-3px', lineHeight: 1 }}>
                ${animMonthly.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 7 }}>for {term} months</div>
            </div>

            {/* Result cards 2×2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { l: 'Down Payment',  v: animDown,     c: '#10b981' },
                { l: 'Loan Amount',   v: animLoan,     c: '#818cf8' },
                { l: 'Total Payment', v: animTotal,    c: '#f59e0b' },
                { l: 'Total Interest',v: animInterest, c: '#ec4899' },
              ].map((r, i) => (
                <div key={i} className="card" style={{ padding: '15px 18px', transition: 'transform 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'}
                >
                  <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: r.c, letterSpacing: '-0.5px' }}>
                    ${r.v.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{r.l}</div>
                </div>
              ))}
            </div>

            {/* Breakdown bar */}
            <div className="card" style={{ padding: '15px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Breakdown</div>
              <div style={{ height: 6, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                <div style={{ width: `${total ? (loan / total) * 100 : 100}%`, background: 'linear-gradient(90deg,#6366f1,#818cf8)', transition: 'width 0.4s' }} />
                {interest > 0 && <div style={{ flex: 1, background: 'linear-gradient(90deg,#ec4899,#f472b6)' }} />}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
                {[{l:'Principal',c:'#818cf8',v:loan},{l:'Interest',c:'#f472b6',v:interest}].map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: x.c }} />
                    <span style={{ color: '#64748b' }}>{x.l}: <span style={{ color: '#e2e8f0', fontWeight: 600 }}>${x.v.toLocaleString()}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment schedule */}
        {schedule.length > 0 && (
          <div className="card" style={{ marginTop: 22, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                Payment Schedule {term > 12 ? '(first 12 months)' : ''}
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>{['Month','Payment','Principal','Interest','Balance'].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {schedule.map(r => (
                    <tr key={r.month}>
                      <td style={{ color: '#e2e8f0', fontWeight: 500 }}>#{r.month}</td>
                      <td style={{ color: '#818cf8', fontWeight: 600 }}>${r.payment.toLocaleString()}</td>
                      <td style={{ color: '#10b981' }}>${r.principal.toLocaleString()}</td>
                      <td style={{ color: '#f59e0b' }}>${r.interest.toLocaleString()}</td>
                      <td>${r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
