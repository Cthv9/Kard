import { Calendar, AlertTriangle } from 'lucide-react'
import { cn, isLightColor } from '../../lib/utils'
import { usePrivacyStore } from '../../store/usePrivacyStore'
import type { CardWithStats } from '../../types/app'
import { format } from 'date-fns'

interface CardTileProps {
  card: CardWithStats
  isSelected: boolean
  onClick: () => void
  style?: React.CSSProperties
  className?: string
}

export function CardTile({ card, isSelected, onClick, style, className }: CardTileProps) {
  const { maskAmount } = usePrivacyStore()
  const textColor = isLightColor(card.color) ? 'text-gray-900' : 'text-white'
  const subtextColor = isLightColor(card.color) ? 'text-gray-600' : 'text-white/70'

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: card.color,
        ...style,
      }}
      className={cn(
        'card-fan-item relative cursor-pointer select-none',
        'w-64 h-40 rounded-3xl p-5 shadow-xl',
        'flex flex-col justify-between overflow-hidden',
        isSelected && 'ring-4 ring-white/60 ring-offset-2 ring-offset-transparent',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ backgroundColor: isLightColor(card.color) ? '#000' : '#fff' }}
        />
        <div
          className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10"
          style={{ backgroundColor: isLightColor(card.color) ? '#000' : '#fff' }}
        />
      </div>

      {/* Top row: name + status */}
      <div className="relative flex items-start justify-between gap-2">
        <h3 className={cn('font-bold text-sm leading-tight line-clamp-2', textColor)}>
          {card.name}
        </h3>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {card.isExpired && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <AlertTriangle size={8} />
              Scad.
            </span>
          )}
          {card.isLow && !card.isExpired && (
            <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Basso
            </span>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="relative">
        <div className={cn('text-2xl font-black tracking-tight', textColor)}>
          {maskAmount(card.current_balance, card.currency)}
        </div>
        <div className={cn('text-xs mt-0.5', subtextColor)}>
          di {maskAmount(card.initial_balance, card.currency)}
        </div>
      </div>

      {/* Bottom: progress bar + expiry */}
      <div className="relative space-y-1.5">
        <div className={cn('h-1 rounded-full overflow-hidden', isLightColor(card.color) ? 'bg-black/20' : 'bg-white/20')}>
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              card.usedPercent > 80
                ? 'bg-red-400'
                : card.usedPercent > 50
                ? 'bg-amber-300'
                : isLightColor(card.color)
                ? 'bg-gray-800'
                : 'bg-white'
            )}
            style={{ width: `${Math.max(2, 100 - card.usedPercent)}%` }}
          />
        </div>
        {card.expiry_date && (
          <div className={cn('flex items-center gap-1 text-[10px]', subtextColor)}>
            <Calendar size={9} />
            <span>{format(new Date(card.expiry_date), 'MM/yyyy')}</span>
          </div>
        )}
      </div>
    </div>
  )
}
