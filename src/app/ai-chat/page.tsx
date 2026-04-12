'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabase'
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from 'lucide-react'

/* ─── types ─── */
interface Msg { id: string; role: 'user' | 'assistant'; content: string; created_at: string }
interface Session { id: string; title: string; created_at: string }

const PROMPTS = [
  'Сколько квартир продано в этом месяце?',
  'Покажи клиентов с бюджетом выше $100,000',
  'Какие квартиры зарезервированы?',
  'Кто из менеджеров продал больше всего?',
  'Дай прогноз — когда проект распродастся?',
]

/* ─── Typing indicator ─── */
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} className="animate-blink" style={{
          width: 6, height: 6, borderRadius: '50%', background: '#6366f1',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </div>
  )
}

export default function AiChatPage() {
  const [sessions, setSessions]         = useState<Session[]>([])
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [msgs, setMsgs]                 = useState<Msg[]>([])
  const [input, setInput]               = useState('')
  const [streaming, setStreaming]       = useState(false)
  const [streamText, setStreamText]     = useState('')
  const [typing, setTyping]             = useState(false)
  const endRef    = useRef<HTMLDivElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)

  /* auto-scroll */
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, streamText, typing])

  /* auto-resize textarea */
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [input])

  const loadSessions = useCallback(async () => {
    const { data } = await supabase.from('chat_sessions').select('*').order('created_at', { ascending: false }).limit(30)
    setSessions(data ?? [])
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function selectSession(id: string) {
    setActiveId(id)
    setStreamText('')
    const { data } = await supabase.from('chat_messages').select('*').eq('session_id', id).order('created_at')
    setMsgs(data ?? [])
  }

  async function newChat() {
    const { data } = await supabase.from('chat_sessions').insert({ title: 'New Chat' }).select().single()
    if (data) {
      setSessions(s => [data, ...s])
      setActiveId(data.id)
      setMsgs([])
      setStreamText('')
      textRef.current?.focus()
    }
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await supabase.from('chat_sessions').delete().eq('id', id)
    await supabase.from('chat_messages').delete().eq('session_id', id)
    setSessions(s => s.filter(x => x.id !== id))
    if (activeId === id) { setActiveId(null); setMsgs([]) }
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || streaming) return
    setInput('')

    /* ensure session */
    let sid = activeId
    if (!sid) {
      const { data } = await supabase.from('chat_sessions').insert({ title: msg.slice(0, 50) }).select().single()
      if (!data) return
      sid = data.id
      setActiveId(sid)
      setSessions(s => [data, ...s])
    }

    /* add user msg to UI */
    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: msg, created_at: new Date().toISOString() }
    setMsgs(prev => [...prev, userMsg])
    setTyping(true)
    setStreaming(true)
    setStreamText('')

    /* save user msg */
    await supabase.from('chat_messages').insert({ session_id: sid, role: 'user', content: msg })

    let full = ''
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: msgs.slice(-10).map(m => ({ role: m.role, content: m.content })) }),
      })
      if (!res.body) throw new Error('no body')
      setTyping(false)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ') || line.slice(6) === '[DONE]') continue
          try {
            const d = JSON.parse(line.slice(6))
            full += d.delta?.text ?? d.text ?? ''
            setStreamText(full)
          } catch { /* skip bad chunk */ }
        }
      }

      const aMsg: Msg = { id: `a-${Date.now()}`, role: 'assistant', content: full, created_at: new Date().toISOString() }
      setMsgs(prev => [...prev, aMsg])
      setStreamText('')

      await supabase.from('chat_messages').insert({ session_id: sid, role: 'assistant', content: full })

      /* update session title on first exchange */
      if (msgs.length === 0) {
        await supabase.from('chat_sessions').update({ title: msg.slice(0, 50) }).eq('id', sid)
        loadSessions()
      }
    } catch {
      setTyping(false)
      const errMsg: Msg = { id: `a-${Date.now()}`, role: 'assistant', content: 'Извините, произошла ошибка. Попробуйте ещё раз.', created_at: new Date().toISOString() }
      setMsgs(prev => [...prev, errMsg])
      setStreamText('')
    }
    setStreaming(false)
    textRef.current?.focus()
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <AppShell>
      {/* Full-height layout flush with AppShell padding */}
      <div style={{
        display: 'flex', height: 'calc(100vh - 64px)',
        margin: '-32px',
        background: '#080b14',
        borderRadius: 0,
        overflow: 'hidden',
      }}>

        {/* ── Sessions sidebar ── */}
        <div style={{
          width: 260, flexShrink: 0,
          background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '18px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Sparkles size={14} color="#818cf8" />
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Chat</span>
            </div>
            <button onClick={newChat} className="btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, fontSize: 12 }}>
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
            {sessions.length === 0 && (
              <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '24px 8px' }}>No chats yet</div>
            )}
            {sessions.map(s => (
              <div key={s.id} onClick={() => selectSession(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '8px 9px', borderRadius: 8, marginBottom: 1,
                  cursor: 'pointer',
                  background: activeId === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: `1px solid ${activeId === s.id ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                  transition: 'all 0.12s',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (activeId !== s.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement | null
                  if (btn) btn.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  if (activeId !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement | null
                  if (btn) btn.style.opacity = '0'
                }}
              >
                <MessageSquare size={12} color={activeId === s.id ? '#818cf8' : '#475569'} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: activeId === s.id ? '#e2e8f0' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.title}
                </span>
                <button className="del-btn" onClick={e => deleteSession(e, s.id)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main chat ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px' }}>
            {/* Empty state */}
            {msgs.length === 0 && !typing && !streamText && (
              <div style={{ maxWidth: 580, margin: '48px auto', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20, margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 28px rgba(99,102,241,0.3)',
                }}>
                  <Sparkles size={28} color="white" />
                </div>
                <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 8, letterSpacing: '-0.3px' }}>
                  Proppio AI Assistant
                </h2>
                <p style={{ color: '#475569', fontSize: 14, marginBottom: 28, lineHeight: 1.65 }}>
                  Ask me anything about your sales data, clients, and apartments.<br />I answer in Russian.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PROMPTS.map((p, i) => (
                    <button key={i} onClick={() => send(p)}
                      style={{
                        padding: '11px 16px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                        color: '#94a3b8', fontSize: 13, fontFamily: 'DM Sans, sans-serif',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'; (e.currentTarget as HTMLElement).style.color = '#e2e8f0' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {msgs.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.2s ease' }}>
                  {m.role === 'assistant' && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: 10, marginTop: 2,
                    }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 800, color: 'white' }}>P</span>
                    </div>
                  )}
                  <div style={{ maxWidth: '74%' }}>
                    <div style={{
                      padding: '11px 15px',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      background: m.role === 'user'
                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                        : 'rgba(255,255,255,0.04)',
                      border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      borderLeft: m.role === 'assistant' ? '3px solid #6366f1' : undefined,
                      color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {m.content}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#334155', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left', padding: '0 4px' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing / streaming */}
              {(typing || streamText) && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'fadeUp 0.2s ease' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 10, marginTop: 2,
                  }}>
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 800, color: 'white' }}>P</span>
                  </div>
                  <div style={{
                    maxWidth: '74%', padding: '11px 15px',
                    borderRadius: '4px 16px 16px 16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderLeft: '3px solid #6366f1',
                    color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  }}>
                    {typing && !streamText ? <TypingDots /> : streamText}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* ── Input ── */}
          <div style={{ padding: '14px 40px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(8px)' }}>
            <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '10px 14px',
                transition: 'border-color 0.2s',
              }}
                onFocusCapture={e => (e.currentTarget as HTMLElement).style.borderColor = '#6366f1'}
                onBlurCapture={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <textarea
                  ref={textRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Задайте вопрос о вашей недвижимости…"
                  rows={1}
                  disabled={streaming}
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    color: '#e2e8f0', fontSize: 13.5, resize: 'none', lineHeight: 1.55,
                    fontFamily: 'DM Sans, sans-serif', minHeight: 22, maxHeight: 120,
                    overflow: 'hidden',
                  }}
                />
              </div>
              <button onClick={() => send()} disabled={!input.trim() || streaming} className="btn-primary"
                style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Send size={16} />
              </button>
            </div>
            <div style={{ maxWidth: 780, margin: '6px auto 0', fontSize: 10.5, color: '#1e293b', textAlign: 'center' }}>
              Powered by Claude AI · Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
