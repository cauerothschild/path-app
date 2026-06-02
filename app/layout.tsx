import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Path',
  description: 'Sistema inteligente de performance pessoal.',
  icons: {
    icon: '/logo-symbol.png',
    apple: '/logo-symbol.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a1614',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-ink overscroll-none">
        <div className="phone">{children}</div>
      </body>
    </html>
  )
}
