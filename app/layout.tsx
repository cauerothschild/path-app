import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Path',
  description: 'Sistema inteligente de performance pessoal.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Path',
    statusBarStyle: 'black-translucent',
    startupImage: '/logo-symbol.png',
  },
  icons: {
    icon: '/logo-symbol.png',
    apple: [
      { url: '/logo-symbol.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#020f0a',
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
