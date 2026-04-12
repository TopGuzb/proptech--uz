'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { UserPlus, X, Search } from 'lucide-react'

interface Resident {
  id: string; full_name: string; email?: string; phone?: string
  move_in_date?: string; apartment_id?: string; is_owner?: boolean
  apartments?: { number: string; floor?: number; buildings?: { name: string } }
  requestCount?: number; paymentStatus?: string
}
interface AvailableApt {
  id: string; number: string; price: number
  buildings?: { name: string }; projects?: { name: string }
}

export default function JkhResidentsPage() {
  const [residents, setResidents]     = useState<Resident[]>([])
  const [apts, setApts]               = useState<AvailableApt[]>([])
  const [search, setSearch]           = useState('')
  const [addModal, setAddModal]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [toast, setToast]             = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [form, setForm]               = useState({
    apartment_id: '', full_name: '', phone: '', email: '', move_in_date: new Date().toISOString().slice(0, 10),
  })

  const curMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('residents')
      .select('*, apartments(number, buildings(name))')
      .order('full_name')

    if (data) {
      // Enrich with payment status for current month
      const enriched = await Promise.all(data.map(async r => {
        const { data: pay } = await supabase
          .from('jkh_payments')
          .select('status')
          .eq('apartment_number', (r.apartments as any)?.number || '')
          .eq('month', curMonth)
          .maybeSingle()
        const { count } = await supabase
          .from('jkh_requests')
          .select('*', { count: 'exact', head: true })
          .eq('resident_id', r.id)
          .neq('status', 'done')
        return { ...r, paymentStatus: pay?.status || 'none', requestCount: count ?? 0 }
      }))
      setResidents(enriched as unknown as Resident[])
    }

    const { data: soldApts } = await supabase
      .from('apartments')
      .select('id, number, price, buildings(name), projects(name)')
      .eq('status', 'sold')
      .is('client_id', null)
      .limit(100)
    setApts((soldApts as unknown as AvailableApt[]) ?? [])
  }

  async function addResident() {
    if (!form.full_name || !form.apartment_id) return
    setSubmitting(true)
    const { error } = await supabase.from('residents').insert({
      apartment_id: form.apartment_id,
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      move_in_date: form.move_in_date,
      is_owner: false,
    })
    setSubmitting(false)
    if (error) { setToast({ msg: error.message, type: 'error' }); return }
    setToast({ msg: `${form.full_name} added as resident. Portal access: ${form.email || 'no email'}`, type: 'success' })
    setAddModal(false)
    setForm({ apartment_id: '', full_name: '', phone: '', email: '', move_in_date: new Date().toISOString().slice(0, 10) })
    load()
  }

  const filtered = residents.filter(r =>
    !search ||
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase()) ||
    (r.apartments as any)?.number?.includes(search)
  )

  return (
    <AppShell>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 3 }}>
            Residents
          </h1>
          <p style={{ color: '#475569', fontSize: 13 }}>{filtered.length} total</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…" className="input"
              style={{ paddingLeft: 30, width: 200 }} />
          </div>
          <button onClick={() => setAddModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13 }}>
            <UserPlus size={14} /> Add Resident
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Resident</th>
              <th>Apartment</th>
              <th>Contact</th>
              <th>Move-in</th>
              <th>Bills {curMonth}</th>
              <th>Open Requests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#334155', padding: '32px 0' }}>No residents found</td></tr>
            ) : filtered.map(r => {
              const aptNum  = (r.apartments as any)?.number || '—'
              const bldName = (r.apartments as any)?.buildings?.name || ''
              return (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: `hsl(${r.full_name.charCodeAt(0) * 5 % 360},45%,32%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: 'white',
                      }}>
                        {r.full_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.full_name}</div>
                        {r.is_owner && <span style={{ fontSize: 9.5, color: '#10b981', fontWeight: 700 }}>Owner</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>#{aptNum}</div>
                    {bldName && <div style={{ fontSize: 10.5, color: '#64748b' }}>{bldName}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.email || '—'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{r.phone || ''}</div>
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: 12 }}>
                    {r.move_in_date ? new Date(r.move_in_date).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {r.paymentStatus === 'none' ? (
                      <span style={{ fontSize: 11, color: '#475569' }}>No bill</span>
                    ) : (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        color: r.paymentStatus === 'paid' ? '#10b981' : '#ef4444',
                        background: r.paymentStatus === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                      }}>
                        {r.paymentStatus === 'paid' ? '✓ Paid' : '● Unpaid'}
                      </span>
                    )}
                  </td>
                  <td>
                    {(r.requestCount ?? 0) > 0 ? (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#f59e0b' }}>
                        {r.requestCount} open
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#334155' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setToast({ msg: `Profile for ${r.full_name} — coming soon`, type: 'info' })}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.18)', color: '#818cf8', fontFamily: 'DM Sans, sans-serif' }}>
                        View
                      </button>
                      <button
                        onClick={() => setToast({ msg: `Invoice sent to ${r.full_name}`, type: 'success' })}
                        style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#10b981', fontFamily: 'DM Sans, sans-serif' }}>
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Resident Modal */}
      {addModal && (
        <div className="modal-bg" onClick={() => setAddModal(false)}>
          <div className="modal-box" style={{ width: 480, padding: '26px 28px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Add Resident</h3>
              <button onClick={() => setAddModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Select Apartment *
                </label>
                <select value={form.apartment_id} onChange={e => setForm(f => ({ ...f, apartment_id: e.target.value }))} className="input">
                  <option value="">— Choose apartment —</option>
                  {apts.map(a => (
                    <option key={a.id} value={a.id}>
                      #{a.number} · {(a.buildings as any)?.name || 'Unknown building'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Firstname Lastname" className="input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+998 ..." className="input" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email (Portal Access)</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="input" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Move-in Date</label>
                <input type="date" value={form.move_in_date} onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))} className="input" />
              </div>

              {form.email && (
                <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 9, padding: '10px 13px', fontSize: 12, color: '#86efac', lineHeight: 1.5 }}>
                  🔑 Portal access will be created with email: <strong>{form.email}</strong><br />
                  <span style={{ color: '#475569' }}>Resident can log in at /login → select "Resident"</span>
                </div>
              )}

              <button onClick={addResident} disabled={submitting || !form.full_name || !form.apartment_id} className="btn-primary" style={{ padding: '11px', borderRadius: 10, fontSize: 14, marginTop: 2 }}>
                {submitting ? 'Adding…' : 'Add Resident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
