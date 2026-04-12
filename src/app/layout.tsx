import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Proppio AI — Real Estate CRM',
  description: 'AI-Powered Real Estate Platform for Uzbekistan',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: '100vh', background: '#080b14' }}>
        {children}
      </body>
    </html>
  )
}
