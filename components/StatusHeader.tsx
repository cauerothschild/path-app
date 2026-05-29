'use client'

import { useEffect, useState } from 'react'
import Logo from './Logo'

interface Props {
  daysObserving: number
  /** Texto à direita. Default: "WED 06:42" estilo mock. Use "rightLabel" custom para outras telas. */
  rightLabel?: string
}

const DAY_ABBR = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function fmtClock() {
  const d = new Date()
  const day = DAY_ABBR[d.getDay()]
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day} ${hh}:${mm}`
}

export default function StatusHeader({ daysObserving, rightLabel }: Props) {
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(fmtClock())
    const t = setInterval(() => setNow(fmtClock()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="meta-row px-6 pt-6 pb-3">
      <div className="flex items-center gap-2 text-ink">
        <Logo size={12} className="text-primary" />
        <span className="tracking-[0.25em] text-[11px] font-medium">PATH</span>
      </div>
      <div className="tabular text-muted">
        {rightLabel ?? now}
      </div>
    </header>
  )
}
