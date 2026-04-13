import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080b14' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

