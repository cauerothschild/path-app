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
  const n = items.length
  // Triple the list so there's always room to scroll in both directions
  const looped = [...items, ...items, ...items]

  const ref        = useRef<HTMLDivElement>(null)
  const lastReal   = useRef(Math.max(0, items.indexOf(selected)))
  const snapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jumpTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isJumping  = useRef(false)

  // Initialize to middle copy so we can scroll up OR down
  useEffect(() => {
    const realIdx = Math.max(0, items.indexOf(selected))
    if (ref.current) {
      ref.current.scrollTop = (n + realIdx) * ITEM_H
      lastReal.current = realIdx
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = useCallback(() => {
    if (isJumping.current) return

    // Cancel any pending jump if the user is still scrolling
    if (jumpTimer.current) { clearTimeout(jumpTimer.current); jumpTimer.current = null }
    if (snapTimer.current) clearTimeout(snapTimer.current)

    snapTimer.current = setTimeout(() => {
      if (!ref.current) return

      const rawIdx = Math.round(ref.current.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(rawIdx, looped.length - 1))

      // Snap to nearest item
      ref.current.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' })

      const realIdx = ((clamped % n) + n) % n

      if (realIdx !== lastReal.current) {
        lastReal.current = realIdx
        onSelect(items[realIdx])
      }

      // After smooth scroll settles, silently jump back to the middle copy
      jumpTimer.current = setTimeout(() => {
        if (!ref.current) return
        const target = n + lastReal.current
        if (Math.round(ref.current.scrollTop / ITEM_H) !== target) {
          isJumping.current = true
          ref.current.scrollTop = target * ITEM_H
          requestAnimationFrame(() => { isJumping.current = false })
        }
      }, 350)
    }, 80)
  }, [n, looped.length, items, onSelect])

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

      {/* Scroll container – no CSS snap, handled entirely in JS */}
      <div
        ref={ref}
        className="h-full overflow-y-scroll no-scroll"
        onScroll={handleScroll}
      >
        {/* Top padding */}
        <div style={{ height: ITEM_H * PAD }} />

        {looped.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-center font-light text-ink tabular"
            style={{ height: ITEM_H, fontSize: 28 }}
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
  mode = 'time',
}: {
  value: string
  onChange: (v: string) => void
  mode?: 'time' | 'window'
}) {
  const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  // ── time mode parsing (HH:MM) ────────────────────────────────────────────
  const timeParts = value.includes(':') ? value.split(':') : ['12', '00']
  const hStr = timeParts[0] ?? '12'
  const mStr = timeParts[1] ?? '00'

  // ── window mode parsing ("06h - 09h") ────────────────────────────────────
  const rangeMatch = value.match(/^(\d{1,2})h?\s*[-–]\s*(\d{1,2})h?$/)
  const startH = (rangeMatch ? rangeMatch[1] : '06').padStart(2, '0')
  const endH   = (rangeMatch ? rangeMatch[2] : '09').padStart(2, '0')

  const setHour  = useCallback((h: string) => onChange(`${h}:${mStr}`),           [mStr,   onChange])
  const setMin   = useCallback((m: string) => onChange(`${hStr}:${m}`),           [hStr,   onChange])
  const setStart = useCallback((h: string) => onChange(`${h}h - ${endH}h`),       [endH,   onChange])
  const setEnd   = useCallback((h: string) => onChange(`${startH}h - ${h}h`),     [startH, onChange])

  if (mode === 'window') {
    return (
      <div className="flex items-center justify-center">
        <ScrollColumn items={hours} selected={startH} onSelect={setStart} width={110} />
        <span
          className="text-2xl font-light text-muted/60 pointer-events-none"
          style={{ width: 36, textAlign: 'center' }}
        >
          –
        </span>
        <ScrollColumn items={hours} selected={endH} onSelect={setEnd} width={110} />
      </div>
    )
  }

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
