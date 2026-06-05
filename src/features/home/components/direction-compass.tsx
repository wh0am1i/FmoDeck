import { useTranslation } from 'react-i18next'

export function DirectionCompass({
  bearingDeg,
  distanceKm,
  cardinalKey
}: {
  bearingDeg: number
  distanceKm: number
  cardinalKey: string
}) {
  const { t } = useTranslation()
  const dist = distanceKm < 1 ? t('home.compass.distanceLt1') : `${Math.round(distanceKm)} km`
  const cardinal = t(`home.compass.${cardinalKey}`)

  return (
    <div data-testid="direction-compass" className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 100 100"
        className="h-24 w-24"
        role="img"
        aria-label={`${cardinal} ${dist}`}
      >
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          className="stroke-primary/25"
          strokeWidth="1.5"
        />
        <text x="50" y="15" textAnchor="middle" className="fill-muted-foreground text-[9px]">
          N
        </text>
        <text x="89" y="53" textAnchor="middle" className="fill-muted-foreground text-[9px]">
          E
        </text>
        <text x="50" y="93" textAnchor="middle" className="fill-muted-foreground text-[9px]">
          S
        </text>
        <text x="11" y="53" textAnchor="middle" className="fill-muted-foreground text-[9px]">
          W
        </text>
        <g
          data-testid="compass-needle"
          transform={`rotate(${bearingDeg} 50 50)`}
          style={{ filter: 'drop-shadow(0 0 4px var(--primary))' }}
        >
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            className="stroke-primary"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <polygon points="50,12 45,22 55,22" className="fill-primary" />
        </g>
        <circle cx="50" cy="50" r="3" className="fill-primary" />
      </svg>
      <div className="hud-mono text-center text-xs">
        <span className="text-primary tabular-nums">{dist}</span>
        <span className="text-muted-foreground"> · {cardinal}</span>
      </div>
    </div>
  )
}
