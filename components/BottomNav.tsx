'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-8.5Z"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.15 : 0}
        />
      </svg>
    ),
  },
  {
    href: '/insights',
    label: 'Insights',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3v18M12 3a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4M12 3a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4M3 12h18"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          fill={active ? 'currentColor' : 'none'}
          fillOpacity={active ? 0.15 : 0}
        />
        <path
          d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
          stroke="currentColor"
          strokeWidth={active ? 2 : 1.6}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center justify-around py-3 pb-5">
        {NAV.map(item => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1 transition ${
                active ? 'text-primary' : 'text-muted'
              }`}
            >
              {item.icon(!!active)}
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
