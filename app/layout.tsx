import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Path',
  description: 'Sistema inteligente de performance pessoal.',
}

export const viewport: Viewport = {
  themeColor: '#0a1614',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-bg text-ink">
        <div className="phone">{children}</div>
      </body>
    </html>
  )
}
