'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Zap } from 'lucide-react'
import Toast from './Toast'

interface Apartment {
  id: string
  floor: number
  number: string
  status: 'available' | 'reserved' | 'sold'
  price: number
  size: number
  rooms?: number
}

interface BulkForm {
  floors: number
  apartments_per_floor: number
  price: number
  size: number
}

interface ApartmentPopup {
  apt: Apartment
  x: number
  y: number
}

const STATUS_COLORS = {
  sold: { bg: '#10b981', light: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  reserved: { bg: '#f59e0b', light: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  available: { bg: '#6366f1', light: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)' },
}

export default function FloorPlan({ building_id }: { building_id: string }) {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState<ApartmentPopup | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkForm, setBulkForm] = useState<BulkForm>({ floors: 10, apartments_per_floor: 4, price: 80000, size: 60 })
  const [bulkLoading, setBulkLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  useEffect(() => {
    if (building_id) loadApartments()
  }, [building_id])

  async function loadApartments() {
    setLoading(true)
    const { data } = await supabase.from('apartments').select('*').eq('building_id', building_id).order('floor', { ascending: false })
    setApartments(data || [])
    setLoading(false)
  }

  // Group by floor
  const floors: Record<number, Apartment[]> = {}
  apartments.forEach(apt => {
    if (!floors[apt.floor]) floors[apt.floor] = []
    floors[apt.floor].push(apt)
  })
  const sortedFloors = Object.keys(floors).map(Number).sort((a, b) => b - a)

  const total = apartments.length
  const sold = apartments.filter(a => a.status === 'sold').length
  const reserved = apartments.filter(a => a.status === 'reserved').length
  const available = apartments.filter(a => a.status === 'available').length
  const revenue = apartments.filter(a => a.status === 'sold').reduce((s, a) => s + (a.price || 0), 0)
  const soldPct = total ? Math.round((sold / total) * 100) : 0

  async function handleStatusChange(aptId: string, status: string) {
    await supabase.from('apartments').update({ status, updated_at: new Date().toISOString() }).eq('id', aptId)
    setPopup(null)
    setToast({ msg: `Status updated to ${status}`, type: 'success' })
    loadApartments()
  }

  async function handleBulkGenerate() {
    setBulkLoading(true)
    try {
      const res = await fetch('/api/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ building_id, ...bulkForm }),
      })
      const data = await res.json()
      setToast({ msg: `Created ${data.created} apartments`, type: 'success' })
      setShowBulk(false)
      loadApartments()
    } catch {
      setToast({ msg: 'Failed to generate', type: 'error' })
    }
    setBulkLoading(false)
  }

  if (loading) return (
    <div style={{ padding: 20 }}>
      {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 50, marginBottom: 8 }} />)}
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: total, color: '#6366f1' },
          { label: 'Sold', value: `${sold} (${soldPct}%)`, color: '#10b981' },
          { label: 'Reserved', value: reserved, color: '#f59e0b' },
          { label: 'Available', value: available, color: '#6366f1' },
          { label: 'Revenue', value: `$${(revenue/1000).toFixed(0)}K`, color: '#ec4899' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 12,
          }}>
            <span style={{ color: '#64748b' }}>{s.label}: </span>
            <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}

        <button
          onClick={() => setShowBulk(true)}
          className="btn-gradient"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            marginLeft: 'auto',
          }}
        >
          <Zap size={13} />
          Bulk Generator
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 11 }}>
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: colors.bg }} />
            <span style={{ color: '#64748b', textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
      </div>

      {/* Floor plan */}
      {sortedFloors.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#334155',
          fontSize: 14,
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: 16,
        }}>
          No apartments yet. Use Bulk Generator to create them.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sortedFloors.map(floor => (
            <div key={floor} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40,
                fontSize: 11,
                color: '#475569',
                fontWeight: 600,
                textAlign: 'right',
                flexShrink: 0,
              }}>
                F{floor}
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                {floors[floor].map(apt => {
                  const colors = STATUS_COLORS[apt.status] || STATUS_COLORS.available
                  return (
                    <div
                      key={apt.id}
                      onClick={e => setPopup({ apt, x: e.clientX, y: e.clientY })}
                      style={{
                        width: 54,
                        height: 42,
                        borderRadius: 8,
                        background: colors.light,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: 600,
                        color: colors.bg,
                        transition: 'transform 0.15s ease, opacity 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
                    >
                      <div>{apt.number || `${floor}0${apt.id.slice(-1)}`}</div>
                      <div style={{ fontSize: 8, opacity: 0.7 }}>{apt.rooms ? `${apt.rooms}R` : apt.size ? `${apt.size}m²` : ''}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Apartment popup */}
      {popup && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setPopup(null)}
          />
          <div style={{
            position: 'fixed',
            left: Math.min(popup.x, window.innerWidth - 260),
            top: Math.min(popup.y, window.innerHeight - 280),
            zIndex: 100,
            background: '#0d1117',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: 20,
            width: 240,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.15s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>
                Apt #{popup.apt.number}
              </span>
              <button onClick={() => setPopup(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              <div>Floor: <span style={{ color: '#e2e8f0' }}>{popup.apt.floor}</span></div>
              <div>Size: <span style={{ color: '#e2e8f0' }}>{popup.apt.size} m²</span></div>
              <div>Price: <span style={{ color: '#10b981', fontWeight: 600 }}>${Number(popup.apt.price).toLocaleString()}</span></div>
              <div>Status: <span style={{ color: STATUS_COLORS[popup.apt.status]?.bg || '#6366f1', textTransform: 'capitalize', fontWeight: 600 }}>{popup.apt.status}</span></div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Change Status</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['available', 'reserved', 'sold'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(popup.apt.id, s)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: popup.apt.status === s ? STATUS_COLORS[s].light : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${popup.apt.status === s ? STATUS_COLORS[s].border : 'rgba(255,255,255,0.08)'}`,
                    color: popup.apt.status === s ? STATUS_COLORS[s].bg : '#64748b',
                    textTransform: 'capitalize',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bulk Generator Modal */}
      {showBulk && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowBulk(false)}>
          <div className="modal-content" style={{
            background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
            padding: 32, width: 400, boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 17, fontWeight: 700, color: '#e2e8f0' }}>Bulk Generator</h3>
              <button onClick={() => setShowBulk(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'floors', label: 'Number of Floors', min: 1, max: 50 },
                { key: 'apartments_per_floor', label: 'Apartments per Floor', min: 1, max: 20 },
                { key: 'price', label: 'Default Price ($)', min: 0, max: 9999999 },
                { key: 'size', label: 'Default Size (m²)', min: 10, max: 500 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={bulkForm[key as keyof BulkForm]}
                    onChange={e => setBulkForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                    className="input-dark"
                  />
                </div>
              ))}
              <div style={{ fontSize: 12, color: '#64748b', background: 'rgba(99,102,241,0.08)', padding: '10px 12px', borderRadius: 8, marginTop: 4 }}>
                Will create <strong style={{ color: '#818cf8' }}>{bulkForm.floors * bulkForm.apartments_per_floor}</strong> apartments across <strong style={{ color: '#818cf8' }}>{bulkForm.floors}</strong> floors
              </div>
              <button
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
                className="btn-gradient"
                style={{ padding: '12px', borderRadius: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 14, marginTop: 4 }}
              >
                {bulkLoading ? 'Generating...' : `Generate ${bulkForm.floors * bulkForm.apartments_per_floor} Apartments`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
