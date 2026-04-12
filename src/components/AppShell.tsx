'use client'

import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080b14' }}>
      <Sidebar />
      <main style={{
        marginLeft: 220,
        flex: 1,
        padding: '32px',
        overflowY: 'auto',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
