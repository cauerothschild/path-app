'use client'

import { useRef, useEffect, useCallback } from 'react'

const ITEM_H = 52   // height per item in px
const VISIBLE = 5   // number of visible rows
const PAD = 2       // padding rows above/below center

interface ColumnProps {
  items: string[]
  selected: string
  onSelect: (v: string) => void
  width?: number
}

function ScrollColumn({ items, selected, onSelect, width = 100 }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastIdx = useRef(Math.max(0, items.indexOf(selected)))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll to selected on mount only
  useEffect(() => {
    const idx = Math.max(0, items.indexOf(selected))
    if (ref.current) {
      ref.current.scrollTop = idx * ITEM_H
      lastIdx.current = idx
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!ref.current) return
      const idx = Math.round(ref.current.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(idx, items.length - 1))
      // Snap into position
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })
      if (clamped !== lastIdx.current) {
        lastIdx.current = clamped
        onSelect(items[clamped])
      }
    }, 80)
  }, [items, onSelect])

  const containerH = ITEM_H * VISIBLE

  return (
    <div className="relative overflow-hidden select-none" style={{ width, height: containerH }}>

      {/* Top gradient fade */}
      <div
        className="absolute inset-x-0 top-0 z-10 pointer-events-none"
        style={{
          height: ITEM_H * PAD + ITEM_H * 0.4,
          background: 'linear-gradient(to bottom, #000000 10%, transparent 100%)',
        }}
      />

      {/* Bottom gradient fade */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 pointer-events-none"
        style={{
          height: ITEM_H * PAD + ITEM_H * 0.4,
          background: 'linear-gradient(to top, #000000 10%, transparent 100%)',
        }}
      />

      {/* Center selection band */}
      <div
        className="absolute inset-x-1 z-10 pointer-events-none rounded-xl"
        style={{
          top: ITEM_H * PAD,
          height: ITEM_H,
          background: 'rgba(255,255,255,0.05)',
          border: '0.5px solid rgba(255,255,255,0.10)',
        }}
      />

      {/* Scroll container */}
      <div
        ref={ref}
        className="h-full overflow-y-scroll no-scroll"
        style={{ scrollSnapType: 'y mandatory' }}
        onScroll={handleScroll}
      >
        {/* Top padding */}
        <div style={{ height: ITEM_H * PAD }} />

        {items.map(item => (
          <div
            key={item}
            className="flex items-center justify-center font-light text-ink tabular"
            style={{ height: ITEM_H, scrollSnapAlign: 'start', fontSize: 28 }}
          >
            {item}
          </div>
        ))}

        {/* Bottom padding */}
        <div style={{ height: ITEM_H * PAD }} />
      </div>
    </div>
  )
}

export default function TimeDrumPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [hStr, mStr] = value.split(':')
  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  const setHour = useCallback((h: string) => onChange(`${h}:${mStr}`), [mStr, onChange])
  const setMin  = useCallback((m: string) => onChange(`${hStr}:${m}`), [hStr, onChange])

  return (
    <div className="flex items-center justify-center">
      <ScrollColumn items={hours}   selected={hStr} onSelect={setHour} width={110} />
      <span
        className="text-3xl font-light text-muted/60 pb-1 pointer-events-none"
        style={{ width: 24, textAlign: 'center' }}
      >
        :
      </span>
      <ScrollColumn items={minutes} selected={mStr} onSelect={setMin}  width={110} />
    </div>
  )
}
