'use client'

import Logo from './Logo'

interface Props {
  daysObserving: number
}

export default function StatusHeader({ daysObserving }: Props) {
  return (
    <header className="flex items-center justify-between px-6 pt-6 pb-2">
      <Logo size={28} className="text-primary" />
      <div className="text-right">
        <div className="text-sm tabular font-medium text-ink">
          {daysObserving}d
        </div>
        <div className="text-[10px] text-muted tracking-wide">
          observando padrões
        </div>
      </div>
    </header>
  )
}
