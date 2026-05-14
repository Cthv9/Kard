import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { Plus, ScanLine } from 'lucide-react'
import { CardTile } from './CardTile'
import { useCardStore } from '../../store/useCardStore'
import type { CardWithStats } from '../../types/app'

const GAP = 14
const H_PADDING = 24

interface CardDeckSlotProps {
  card: CardWithStats
  index: number
  isSelected: boolean
  onSelect: (id: string, index: number) => void
}

// Stable per-tile slot. The inner useCallback captures id+index so the onClick
// reference is stable across re-renders of the parent — required for the
// React.memo on CardTile to actually skip work when only sibling tiles change.
const CardDeckSlot = memo(function CardDeckSlot({ card, index, isSelected, onSelect }: CardDeckSlotProps) {
  const handleClick = useCallback(() => onSelect(card.id, index), [card.id, index, onSelect])
  return (
    <div
      style={{
        flex: `0 0 calc(100% - ${H_PADDING * 2}px)`,
        minWidth: `calc(100% - ${H_PADDING * 2}px)`,
        scrollSnapAlign: 'start',
      }}
    >
      <CardTile card={card} isSelected={isSelected} onClick={handleClick} />
    </div>
  )
})

interface CardDeckProps {
  cards: CardWithStats[]
}

export function CardDeck({ cards }: CardDeckProps) {
  const { selectedCardId, selectCard, openAddCard, openScanner } = useCardStore()
  const carouselRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollToTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const programmaticScrollCount = useRef(0)
  // Measured once and re-measured only on viewport resize, instead of reading
  // offsetWidth on every scroll event (which forces a layout reflow).
  const [cardWidth, setCardWidth] = useState(0)

  const selectedIndex = cards.findIndex((c) => c.id === selectedCardId)
  const effectiveIndex = selectedIndex === -1 ? 0 : selectedIndex

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    setCardWidth(el.offsetWidth - H_PADDING * 2)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setCardWidth(w - H_PADDING * 2)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Clear any pending timers on unmount so they don't fire on a stale ref or
  // an unmounted component (minor leak + warning suppression).
  useEffect(() => {
    const scrollToTimers = scrollToTimersRef.current
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
      scrollToTimers.forEach(clearTimeout)
      scrollToTimers.clear()
    }
  }, [])

  /* Scroll carousel to a given index. Counter-based guard handles rapid
     successive scrollTo calls — boolean+setTimeout race-conditioned. */
  const scrollTo = useCallback((idx: number, smooth = true) => {
    const el = carouselRef.current
    if (!el || cardWidth === 0) return
    programmaticScrollCount.current += 1
    el.scrollTo({ left: idx * (cardWidth + GAP), behavior: smooth ? 'smooth' : 'instant' })
    const id = setTimeout(() => {
      scrollToTimersRef.current.delete(id)
      programmaticScrollCount.current = Math.max(0, programmaticScrollCount.current - 1)
    }, 500)
    scrollToTimersRef.current.add(id)
  }, [cardWidth])

  /* When selected card changes externally (e.g. dot click → selectCard), sync scroll */
  useEffect(() => {
    scrollTo(effectiveIndex, true)
  }, [effectiveIndex, scrollTo])

  /* Detect active card from scroll position */
  const handleScroll = useCallback(() => {
    if (programmaticScrollCount.current > 0) return
    if (cardWidth === 0) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      const el = carouselRef.current
      if (!el) return
      const idx = Math.round(el.scrollLeft / (cardWidth + GAP))
      const clamped = Math.max(0, Math.min(cards.length - 1, idx))
      if (cards[clamped] && cards[clamped].id !== selectedCardId) {
        selectCard(cards[clamped].id)
      }
    }, 60)
  }, [cardWidth, cards, selectedCardId, selectCard])

  // Stable per-card click handler so React.memo(CardTile) is not invalidated
  // every render by a new arrow function.
  const handleTileClick = useCallback((id: string, index: number) => {
    selectCard(id)
    scrollTo(index)
  }, [selectCard, scrollTo])

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 px-6">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Nessuna carta attiva</p>
        <button
          onClick={openScanner}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--accent)', color: '#0a0a12' }}
        >
          <ScanLine size={16} />
          Scansiona tessera
        </button>
        <button
          onClick={openAddCard}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          <Plus size={16} />
          Inserisci manualmente
        </button>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Carousel */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: GAP,
          paddingLeft: H_PADDING,
          paddingRight: H_PADDING,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollPaddingLeft: H_PADDING,
        }}
        className="[&::-webkit-scrollbar]:hidden"
      >
        {cards.map((card, index) => (
          <CardDeckSlot
            key={card.id}
            card={card}
            index={index}
            isSelected={index === effectiveIndex}
            onSelect={handleTileClick}
          />
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pt-3.5">
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => selectCard(card.id)}
            className="transition-all"
            style={{
              width: i === effectiveIndex ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: i === effectiveIndex ? 'var(--text)' : 'var(--muted2)',
            }}
          />
        ))}
        <button
          onClick={openScanner}
          className="flex items-center justify-center ml-1 transition-all active:scale-90 rounded-full"
          style={{
            width: 24, height: 24,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          title="Scansiona tessera"
        >
          <ScanLine size={11} />
        </button>
        <button
          onClick={openAddCard}
          className="flex items-center justify-center ml-0.5 transition-all active:scale-90 rounded-full"
          style={{
            width: 24, height: 24,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
          title="Aggiungi carta"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}
