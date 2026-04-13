'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Zap } from 'lucide-react'
import Toast from './Toast'

interface Apt { id: string; floor: number; number: string; status: 'available'|'reserved'|'sold'; price: number; size: number; rooms?: number }

const SC = {
  sold:      { bg: '#10b981', light: 'rgba(16,185,129,0.18)', border: 'rgba(16,185,129,0.35)', label: '#34d399' },
  reserved:  { bg: '#f59e0b', light: 'rgba(245,158,11,0.18)',  border: 'rgba(245,158,11,0.35)',  label: '#fbbf24' },
  available: { bg: '#6366f1', light: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',   label: '#818cf8' },
}

interface Popup { apt: Apt; x: number; y: number }

export default function FloorPlan({ building_id }: { building_id: string }) {
  const [apts,  setApts]  = useState<Apt[]>([])
  const [loading, setLoading] = useState(true)
  const [popup,  setPopup]  = useState<Popup | null>(null)
  const [bulk,   setBulk]   = useState(false)
  const [bForm,  setBForm]  = useState({ floors: 10, apartments_per_floor: 4, price: 80000, size_m2: 60, rooms_count: 2 })
  const [bLoading, setBLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast]   = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [result, setResult] = useState<{
    success: boolean
    count: number
    error?: string
    floors?: number
    apartments_per_floor?: number
  } | null>(null)

  const load = async () => {
    if (!building_id) return
    setLoading(true)
    const { data } = await supabase.from('apartments').select('*').eq('building_id', building_id).order('floor', { ascending: false }).order('number')
    setApts(data ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [building_id])

  /* group by floor */
  const floorMap: Record<number, Apt[]> = {}
  apts.forEach(a => { (floorMap[a.floor] ??= []).push(a) })
  const sortedFloors = Object.keys(floorMap).map(Number).sort((a,b) => b-a)

  const total    = apts.length
  const soldCount = apts.filter(a => a.status === 'sold').length
  const resCount  = apts.filter(a => a.status === 'reserved').length
  const avCount   = apts.filter(a => a.status === 'available').length
  const revenue   = apts.filter(a => a.status === 'sold').reduce((s, a) => s + (a.price ?? 0), 0)
  const soldPct   = total ? Math.round((soldCount / total) * 100) : 0

  async function changeStatus(id: string, status: string) {
    await supabase.from('apartments').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setPopup(null); setToast({ msg: `Status → ${status}`, type: 'success' }); load()
  }

  async function generate() {
    setBLoading(true)
    setResult(null)
    setProgress(0)

    // Animate progress while waiting for API
    let fakeProgress = 0
    const ticker = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + Math.random() * 12, 90)
      setProgress(Math.round(fakeProgress))
    }, 300)

    try {
      const r = await fetch('/api/bulk-generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_id, ...bForm }),
      })
      const d = await r.json()
      
      clearInterval(ticker)
      if (!r.ok) {
        setProgress(0)
        setResult({
          success: false,
          count: 0,
          error: d.error || 'Unknown error occurred'
        })
      } else {
        setProgress(100)
        setResult({
          success: d.success || true,
          count: d.count || 0,
          floors: d.floors,
          apartments_per_floor: d.apartments_per_floor,
          error: d.error
        })
        setToast({ msg: `Created ${d.count || 0} apartments`, type: 'success' })
        load()
      }
    } catch (error) {
      clearInterval(ticker)
      setProgress(0)
      setResult({
        success: false,
        count: 0,
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setBLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50 }} />)}
    </div>
  )

  return (
    <div>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { l: 'Total', v: total, c: '#818cf8' },
          { l: 'Sold', v: `${soldCount} (${soldPct}%)`, c: '#34d399' },
          { l: 'Reserved', v: resCount, c: '#fbbf24' },
          { l: 'Available', v: avCount, c: '#818cf8' },
          { l: 'Revenue', v: `$${(revenue/1000).toFixed(0)}K`, c: '#f472b6' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '6px 12px', fontSize: 11.5 }}>
            <span style={{ color: '#475569' }}>{s.l}: </span>
            <span style={{ color: s.c, fontWeight: 700 }}>{s.v}</span>
          </div>
        ))}
        {/* Overall progress */}
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
            <div style={{ height: '100%', width: `${soldPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, transition: 'width 0.6s' }} />
          </div>
        </div>
        <button onClick={() => setBulk(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, fontSize: 12 }}>
          <Zap size={12} /> Bulk Generate
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 11 }}>
        {Object.entries(SC).map(([s, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c.bg }} />
            <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Floor rows */}
      {sortedFloors.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#334155', fontSize: 13, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 14 }}>
          No apartments yet. Use Bulk Generate.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {sortedFloors.map(floor => {
            const row = floorMap[floor]
            const rowSold = row.filter(a => a.status === 'sold').length
            return (
              <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Floor label */}
                <div style={{ width: 72, flexShrink: 0, fontSize: 10.5, color: '#475569', fontWeight: 600, textAlign: 'right' }}>
                  <div>Этаж {floor}</div>
                  <div style={{ color: '#334155', fontWeight: 400 }}>{rowSold}/{row.length}</div>
                </div>
                {/* Apartments */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {row.map(apt => {
                    const c = SC[apt.status] ?? SC.available
                    return (
                      <div key={apt.id} onClick={e => setPopup({ apt, x: e.clientX, y: e.clientY })}
                        style={{
                          width: 60, height: 44, borderRadius: 8, cursor: 'pointer',
                          background: c.light, border: `1px solid ${c.border}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9.5, fontWeight: 700, color: c.label,
                          transition: 'transform 0.12s, opacity 0.12s',
                          userSelect: 'none',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.09)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                      >
                        <div>{apt.number}</div>
                        <div style={{ fontSize: 8, opacity: 0.75 }}>{apt.rooms ? `${apt.rooms}к` : ''} {apt.size ? `${apt.size}м²` : ''}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Apartment popup */}
      {popup && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={() => setPopup(null)} />
          <div style={{
            position: 'fixed',
            left: Math.min(popup.x + 10, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 260),
            top:  Math.min(popup.y + 10, (typeof window !== 'undefined' ? window.innerHeight : 800) - 280),
            zIndex: 70,
            width: 240, background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '18px 20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'scaleIn 0.15s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>Apt #{popup.apt.number}</span>
              <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={13} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>
              <div>Floor: <span style={{ color: '#e2e8f0' }}>{popup.apt.floor}</span></div>
              <div>Size: <span style={{ color: '#e2e8f0' }}>{popup.apt.size} m²</span></div>
              <div>Rooms: <span style={{ color: '#e2e8f0' }}>{popup.apt.rooms ?? '—'}</span></div>
              <div>Price: <span style={{ color: '#10b981', fontWeight: 700 }}>${Number(popup.apt.price).toLocaleString()}</span></div>
              <div>Status: <span style={{ color: SC[popup.apt.status]?.label ?? '#818cf8', fontWeight: 600, textTransform: 'capitalize' }}>{popup.apt.status}</span></div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Change Status</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['available','reserved','sold'] as const).map(s => (
                <button key={s} onClick={() => changeStatus(popup.apt.id, s)} style={{
                  flex: 1, padding: '6px 4px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  background: popup.apt.status === s ? SC[s].light : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${popup.apt.status === s ? SC[s].border : 'rgba(255,255,255,0.08)'}`,
                  color: popup.apt.status === s ? SC[s].label : '#64748b',
                  textTransform: 'capitalize', fontFamily: 'DM Sans, sans-serif',
                  transition: 'all 0.12s',
                }}>{s}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bulk generate modal */}
      {bulk && (
        <div className="modal-bg" onClick={() => setBulk(false)}>
          <div className="modal-box" style={{ width: 380, padding: '28px 32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Bulk Generator</h3>
              <button onClick={() => setBulk(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {[
                { k: 'floors',               l: 'Floors',                min: 1,  max: 50 },
                { k: 'apartments_per_floor', l: 'Apartments per Floor',  min: 1,  max: 20 },
                { k: 'rooms_count',         l: 'Rooms per Apartment',   min: 1,  max: 10 },
                { k: 'price',               l: 'Base Price ($)',         min: 0,  max: 9999999 },
                { k: 'size_m2',             l: 'Size (m²)',              min: 10, max: 500 },
              ].map(({k,l,min,max}) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{l}</label>
                  <input type="number" min={min} max={max} className="input" value={bForm[k as keyof typeof bForm]}
                    onChange={e => setBForm(f => ({ ...f, [k]: Number(e.target.value) }))} />
                </div>
              ))}
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 9, padding: '10px 12px', fontSize: 12, color: '#818cf8' }}>
                Will create <strong>{bForm.floors * bForm.apartments_per_floor}</strong> apartments across <strong>{bForm.floors}</strong> floors
              </div>
              <button onClick={generate} disabled={bLoading} className="btn-primary" style={{ padding: '12px', borderRadius: 11, fontSize: 14, marginTop: 2 }}>
                {bLoading ? `Generating… ${progress}%` : `Generate ${bForm.floors * bForm.apartments_per_floor} Apartments`}
              </button>

              {/* Progress bar */}
              {bLoading && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 5 }}>
                    <span>Creating apartments…</span>
                    <span>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Success/Error State Display */}
              {result && result.success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                  <p style={{ color: '#34d399', fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>
                    {result.count} apartments created!
                  </p>
                  <p style={{ color: '#64748b', fontSize: 12 }}>
                    {result.floors} floors × {result.apartments_per_floor} apartments
                  </p>
                  <button
                    onClick={() => {
                      setBulk(false)
                      setResult(null)
                    }}
                    className="btn-primary" 
                    style={{ marginTop: 12, padding: '8px 16px', fontSize: 12 }}>
                    Close
                  </button>
                </div>
              )}

              {result && !result.success && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center" style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>❌</div>
                  <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: 4 }}>Creation Failed</p>
                  <p style={{ color: '#64748b', fontSize: 12, wordBreak: 'break-word' }}>{result.error}</p>
                  <button
                    onClick={() => setResult(null)}
                    className="btn-secondary" 
                    style={{ marginTop: 12, padding: '8px 16px', fontSize: 12 }}>
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
