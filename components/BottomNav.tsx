'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M3 12l9-9 9 9v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8z" strokeWidth="1.5" />
      <path d="M9 22v-6h6v6" strokeWidth="1.5" />
    </svg>
  )
}

function IconCheckIn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="1.5" />
      <path d="M9 12l2 2 4-4" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconInsights() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" strokeWidth="1.5" />
      <rect x="14" y="3" width="7" height="7" strokeWidth="1.5" />
      <rect x="14" y="14" width="7" height="7" strokeWidth="1.5" />
      <rect x="3" y="14" width="7" height="7" strokeWidth="1.5" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="8" r="4" strokeWidth="1.5" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeWidth="1.5" />
    </svg>
  )
}

const NAV = [
  { href: '/dashboard', label: 'Home', Icon: IconHome },
  { href: '/check-in', label: 'Check-In', Icon: IconCheckIn },
  { href: '/insights', label: 'Insights', Icon: IconInsights },
  { href: '/profile', label: 'Perfil', Icon: IconProfile },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-bg/90 backdrop-blur-xl">
      {/* Hairline top */}
      <div className="hairline" />
      <div
        className="flex items-center justify-around py-3 px-2"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-1.5 px-3 py-1.5 transition duration-300 ease-premium ${
                active ? 'text-primary' : 'text-subtle hover:text-ink2'
              }`}
            >
              <Icon />
              <span className={`text-[10px] font-medium tracking-[0.14em] uppercase transition ${
                active ? 'text-ink' : 'text-muted'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
