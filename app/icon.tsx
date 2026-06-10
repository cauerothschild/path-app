import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  const S = 512
  const stroke = 14
  const r = (S - stroke - 160) / 2
  const cx = S / 2
  const circumference = 2 * Math.PI * r

  return new ImageResponse(
    (
      <div
        style={{
          width: S,
          height: S,
          background: '#020f0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress — full ring */}
          <circle
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke="#B8FFCF"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </svg>
      </div>
    ),
    { width: S, height: S },
  )
}
