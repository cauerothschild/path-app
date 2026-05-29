interface Props {
  size?: number
  className?: string
  /** Mostra a marca completa (onda + "Path"). Se false, só o ícone da onda. */
  withWordmark?: boolean
}

/**
 * Path do desenho da onda — 4 elevações (pequena · alta · média · pequena)
 * com dips entre elas, terminações arredondadas. Reproduz a splash art.
 * viewBox de referência: 200 × 60, centerline y ≈ 38.
 */
const WAVE_D =
  'M 10 46 ' +
  'C 14 46 18 34 24 34 ' +     // sobe ao 1º bump pequeno
  'C 30 34 34 46 40 52 ' +     // desce ao 1º vale
  'C 46 58 54 58 60 52 ' +     // base subindo
  'C 68 44 72 16 82 8 ' +      // PICO ALTO central
  'C 92 0 100 22 108 38 ' +    // desce o outro lado
  'C 114 50 122 56 128 50 ' +  // vale 2
  'C 134 44 138 30 146 30 ' +  // sobe ao pico médio
  'C 154 30 158 42 164 50 ' +  // desce
  'C 168 56 174 58 178 52 ' +  // vale 3
  'C 182 46 186 36 192 36 ' +  // sobe ao bump direito
  'C 196 36 198 42 200 46'     // termina arredondado

const WAVE_VB = '0 0 200 60'

export default function Logo({
  size = 24,
  className = '',
  withWordmark = false,
}: Props) {
  if (withWordmark) {
    // Lockup: onda + "Path" lado-a-lado (proporção ≈ 4.4 : 1)
    const w = size * 4.4
    const h = size
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 264 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Path"
      >
        <path
          d={WAVE_D}
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <text
          x="206"
          y="44"
          fill="currentColor"
          fontFamily="Inter, system-ui, sans-serif"
          fontSize="32"
          fontWeight="600"
          letterSpacing="-0.5"
          textAnchor="middle"
        >
          Path
        </text>
      </svg>
    )
  }

  // Ícone-only: só a onda
  const w = size * 3.3
  const h = size
  return (
    <svg
      width={w}
      height={h}
      viewBox={WAVE_VB}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Path"
    >
      <path
        d={WAVE_D}
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
