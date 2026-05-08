import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { CardTile } from './CardTile'
import { useCardStore } from '../../store/useCardStore'
import type { CardWithStats } from '../../types/app'

interface CardDeckProps {
  cards: CardWithStats[]
}

export function CardDeck({ cards }: CardDeckProps) {
  const { selectedCardId, selectCard, openAddCard } = useCardStore()
  const touchStartX = useRef<number | null>(null)

  const selectedIndex = cards.findIndex((c) => c.id === selectedCardId)
  const effectiveIndex = selectedIndex === -1 ? 0 : selectedIndex

  // Fan spread: cards fan out around the selected card
  // The selected card is lifted; others fan left/right behind it
  function getCardTransform(index: number): React.CSSProperties {
    const n = cards.length
    if (n === 0) return {}

    const isSel = index === effectiveIndex
    const offset = index - effectiveIndex

    if (isSel) {
      return {
        transform: 'rotate(0deg) translateY(-16px) scale(1.05)',
        zIndex: 20,
        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.4))',
      }
    }

    // Fan behind: each card slightly rotated and offset
    const maxAngle = Math.min(12, 60 / n)
    const rotation = offset * maxAngle
    const translateX = offset * 18
    const translateY = Math.abs(offset) * 6
    const zIdx = 20 - Math.abs(offset)

    return {
      transform: `rotate(${rotation}deg) translateX(${translateX}px) translateY(${translateY}px)`,
      zIndex: zIdx,
      filter: `brightness(${1 - Math.abs(offset) * 0.08})`,
      opacity: Math.max(0.4, 1 - Math.abs(offset) * 0.15),
    }
  }

  function handleSwipe(direction: 'left' | 'right') {
    if (cards.length === 0) return
    const next =
      direction === 'right'
        ? (effectiveIndex + 1) % cards.length
        : (effectiveIndex - 1 + cards.length) % cards.length
    selectCard(cards[next].id)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) handleSwipe(dx < 0 ? 'left' : 'right')
    touchStartX.current = null
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 gap-4">
        <p className="text-white/50 text-sm">Nessuna carta attiva</p>
        <button
          onClick={openAddCard}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
        >
          <Plus size={16} />
          Aggiungi carta
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Deck area */}
      <div
        className="relative h-48 w-72 flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="absolute"
            style={getCardTransform(index)}
          >
            <CardTile
              card={card}
              isSelected={index === effectiveIndex}
              onClick={() => {
                if (index === effectiveIndex) return
                selectCard(card.id)
              }}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5">
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => selectCard(card.id)}
            className="transition-all"
            style={{
              width: i === effectiveIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === effectiveIndex ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
        <button
          onClick={openAddCard}
          className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center ml-1 transition-all active:scale-90"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
