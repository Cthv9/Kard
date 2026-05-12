import { memo, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn, darken } from '../../lib/utils'
import type { CardWithStats } from '../../types/app'

interface CardTileProps {
  card: CardWithStats
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}

/* Mask the card number: show only last 4 digits */
function maskCode(code: string): string {
  const digits = code.replace(/\D/g, '')
  if (digits.length >= 4) return `•••• •••• ${digits.slice(-4)}`
  return '•••• ••••'
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`

function CardTileImpl({ card, isSelected, onClick, style, className }: CardTileProps) {
  // Memoize gradient stops on color so re-renders driven by sibling cards
  // (carousel scroll, selection change) don't recompute the darken math.
  const { mid, end } = useMemo(
    () => ({ mid: darken(card.color, 0.2), end: darken(card.color, 0.42) }),
    [card.color]
  )

  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${card.color} 0%, ${mid} 50%, ${end} 100%)`,
        height: 200,
        borderRadius: 22,
        ...style,
      }}
      className={cn(
        'card-fan-item relative cursor-pointer select-none overflow-hidden',
        'flex flex-col justify-between',
        'transition-transform duration-300',
        isSelected && 'active-card',
        className
      )}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: NOISE_SVG,
          opacity: 0.4,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Decorative orbs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 130, height: 130,
          bottom: -40, left: -20,
          background: 'rgba(255,255,255,0.12)',
          filter: 'blur(2px)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 90, height: 90,
          top: -20, right: 20,
          background: 'rgba(255,255,255,0.12)',
          filter: 'blur(2px)',
        }}
      />

      {/* Selected ring */}
      {isSelected && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: 22,
            boxShadow: 'inset 0 0 0 2.5px rgba(255,255,255,0.5)',
          }}
        />
      )}

      {/* Decryption-failure badge: warns that the wallet key did not unlock this card */}
      {card.decryptionFailed && (
        <div
          className="absolute flex items-center gap-1 px-2 py-1 rounded-full"
          style={{
            top: 12,
            right: 12,
            background: 'rgba(0,0,0,0.55)',
            color: '#fbbf24',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 0.4,
            backdropFilter: 'blur(4px)',
          }}
          title="Impossibile decifrare questa carta con la chiave attuale"
        >
          <AlertTriangle size={12} strokeWidth={2.5} />
          KEY
        </div>
      )}

      {/* Content */}
      <div className="relative flex flex-col justify-between h-full p-[22px_24px]">
        {/* Top: name + number */}
        <div>
          <div
            className="font-bold text-[18px] tracking-tight"
            style={{
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-0.3px',
            }}
          >
            {card.name}
          </div>
          <div
            className="mt-1 text-[12px]"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '2px',
            }}
          >
            {maskCode(card.code)}
          </div>
        </div>

        {/* Bottom: type + chip */}
        <div className="flex items-end justify-between">
          <div
            className="text-[10px] font-semibold uppercase"
            style={{
              letterSpacing: '1.5px',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {card.description ?? 'Fidelity'}
          </div>

          {/* Chip icon */}
          <div
            className="flex items-center justify-center"
            style={{
              width: 32, height: 24,
              borderRadius: 5,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <div
              style={{
                width: 20, height: 15,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(255,220,100,0.6), rgba(255,180,0,0.4))',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                padding: 3,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 1 }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap in memo so the deck does not re-render every tile on each scroll tick
// or selection change. The shallow prop check is exact: card is a reference
// from the query cache and onClick comes from a memoized useCallback in
// CardDeck (see P2.5).
export const CardTile = memo(CardTileImpl)
