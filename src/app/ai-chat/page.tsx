'use client'

import { useEffect, useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Send, Sparkles, Plus, MessageSquare, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface ChatSession {
  id: string
  title: string
  created_at: string
}

const SUGGESTED_PROMPTS = [
  'Сколько квартир продано в этом месяце?',
  'Покажи клиентов с бюджетом выше $100,000',
  'Какие квартиры зарезервированы но не оплачены?',
  'Дай отчёт по проекту Green City',
  'Кто из менеджеров продал больше всего?',
]

export default function AiChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  async function loadSessions() {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setSessions(data || [])
  }

  async function loadMessages(sessionId: string) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function createSession() {
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ title: 'New Chat' })
      .select()
      .single()
    if (data) {
      setSessions(s => [data, ...s])
      setActiveSession(data.id)
      setMessages([])
    }
  }

  async function selectSession(id: string) {
    setActiveSession(id)
    await loadMessages(id)
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    await supabase.from('chat_sessions').delete().eq('id', id)
    await supabase.from('chat_messages').delete().eq('session_id', id)
    setSessions(s => s.filter(s => s.id !== id))
    if (activeSession === id) {
      setActiveSession(null)
      setMessages([])
    }
  }

  async function sendMessage(content?: string) {
    const msg = content || input.trim()
    if (!msg || streaming) return

    let sessionId = activeSession

    // Create session if none
    if (!sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .insert({ title: msg.slice(0, 40) })
        .select()
        .single()
      if (data) {
        sessionId = data.id
        setActiveSession(data.id)
        setSessions(s => [data, ...s])
      }
    }

    setInput('')
    setStreaming(true)
    setStreamContent('')

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    // Save user message
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: msg,
    })

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: sessionId }),
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const text = parsed.delta?.text || parsed.text || ''
              fullContent += text
              setStreamContent(fullContent)
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamContent('')

      // Save assistant message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: fullContent,
      })

      // Update session title if first message
      if (messages.length === 0) {
        await supabase.from('chat_sessions').update({ title: msg.slice(0, 50) }).eq('id', sessionId)
        loadSessions()
      }
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте ещё раз.',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMsg])
      setStreamContent('')
    }

    setStreaming(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <AppShell>
      <div style={{ display: 'flex', height: 'calc(100vh - 64px)', gap: 0, marginTop: -32, marginLeft: -32, marginRight: -32, marginBottom: -32 }}>
        {/* Sessions sidebar */}
        <div style={{
          width: 260,
          background: '#0d1117',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={15} color="#818cf8" />
                <span style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Assistant</span>
              </div>
            </div>
            <button
              onClick={createSession}
              className="btn-gradient"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {sessions.length === 0 ? (
              <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '24px 8px' }}>
                No chats yet
              </div>
            ) : sessions.map(s => (
              <div
                key={s.id}
                onClick={() => selectSession(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  marginBottom: 2,
                  cursor: 'pointer',
                  background: activeSession === s.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: `1px solid ${activeSession === s.id ? 'rgba(99,102,241,0.2)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (activeSession !== s.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                  const trash = e.currentTarget.querySelector('.trash-btn') as HTMLElement
                  if (trash) trash.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  if (activeSession !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent'
                  const trash = e.currentTarget.querySelector('.trash-btn') as HTMLElement
                  if (trash) trash.style.opacity = '0'
                }}
              >
                <MessageSquare size={12} color={activeSession === s.id ? '#818cf8' : '#475569'} style={{ flexShrink: 0 }} />
                <span style={{
                  fontSize: 12,
                  color: activeSession === s.id ? '#e2e8f0' : '#64748b',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {s.title}
                </span>
                <button
                  className="trash-btn"
                  onClick={e => deleteSession(e, s.id)}
                  style={{
                    background: 'none', border: 'none', color: '#475569',
                    cursor: 'pointer', padding: 2, opacity: 0, transition: 'opacity 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080b14' }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {messages.length === 0 && !streaming ? (
              <div style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
                }}>
                  <Sparkles size={28} color="white" />
                </div>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 8, letterSpacing: '-0.3px' }}>
                  Proppio AI Assistant
                </h2>
                <p style={{ color: '#475569', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                  Ask me anything about your real estate portfolio,<br />clients, sales, and analytics.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      style={{
                        padding: '11px 16px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: '#94a3b8',
                        fontSize: 13,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onMouseEnter={e => {
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.2)'
                        ;(e.currentTarget as HTMLElement).style.color = '#e2e8f0'
                      }}
                      onMouseLeave={e => {
                        ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
                        ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'
                        ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    animation: 'fadeInUp 0.2s ease',
                  }}>
                    {msg.role === 'assistant' && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: 10, marginTop: 2,
                      }}>
                        <Sparkles size={13} color="white" />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg, #6366f1, #818cf8)'
                        : 'rgba(255,255,255,0.04)',
                      border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      color: '#e2e8f0',
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Streaming message */}
                {streaming && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'fadeInUp 0.2s ease' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: 10, marginTop: 2,
                    }}>
                      <Sparkles size={13} color="white" />
                    </div>
                    <div style={{
                      maxWidth: '75%',
                      padding: '12px 16px',
                      borderRadius: '4px 16px 16px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#e2e8f0',
                      fontSize: 13.5,
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {streamContent || (
                        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 0.8s ease infinite' }} />
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 0.8s ease 0.2s infinite' }} />
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 0.8s ease 0.4s infinite' }} />
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div style={{
            padding: '16px 32px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(13,17,23,0.8)',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              maxWidth: 800,
              margin: '0 auto',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}>
              <div style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '12px 14px',
                transition: 'border-color 0.2s ease',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Задайте вопрос о вашей недвижимости..."
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#e2e8f0',
                    fontSize: 13.5,
                    resize: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                    lineHeight: 1.5,
                    minHeight: 20,
                    maxHeight: 120,
                  }}
                  rows={1}
                  disabled={streaming}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className="btn-gradient"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  opacity: !input.trim() || streaming ? 0.5 : 1,
                  cursor: !input.trim() || streaming ? 'not-allowed' : 'pointer',
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <div style={{ maxWidth: 800, margin: '8px auto 0', fontSize: 11, color: '#334155', textAlign: 'center' }}>
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
