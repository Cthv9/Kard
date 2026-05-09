import { useRef, useEffect, useCallback } from 'react'
import { Plus, ScanLine } from 'lucide-react'
import { CardTile } from './CardTile'
import { useCardStore } from '../../store/useCardStore'
import type { CardWithStats } from '../../types/app'

interface CardDeckProps {
  cards: CardWithStats[]
}

const GAP = 14
const H_PADDING = 24

export function CardDeck({ cards }: CardDeckProps) {
  const { selectedCardId, selectCard, openAddCard, openScanner } = useCardStore()
  const carouselRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isScrollingByCode = useRef(false)

  const selectedIndex = cards.findIndex((c) => c.id === selectedCardId)
  const effectiveIndex = selectedIndex === -1 ? 0 : selectedIndex

  /* Scroll carousel to a given index */
  const scrollTo = useCallback((idx: number, smooth = true) => {
    const el = carouselRef.current
    if (!el) return
    const cardWidth = el.offsetWidth - H_PADDING * 2
    isScrollingByCode.current = true
    el.scrollTo({ left: idx * (cardWidth + GAP), behavior: smooth ? 'smooth' : 'instant' })
    setTimeout(() => { isScrollingByCode.current = false }, 500)
  }, [])

  /* When selected card changes externally (e.g. dot click → selectCard), sync scroll */
  useEffect(() => {
    scrollTo(effectiveIndex, true)
  }, [effectiveIndex, scrollTo])

  /* Detect active card from scroll position */
  function handleScroll() {
    if (isScrollingByCode.current) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      const el = carouselRef.current
      if (!el) return
      const cardWidth = el.offsetWidth - H_PADDING * 2
      const idx = Math.round(el.scrollLeft / (cardWidth + GAP))
      const clamped = Math.max(0, Math.min(cards.length - 1, idx))
      if (cards[clamped] && cards[clamped].id !== selectedCardId) {
        selectCard(cards[clamped].id)
      }
    }, 60)
  }

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
          <div
            key={card.id}
            style={{
              flex: `0 0 calc(100% - ${H_PADDING * 2}px)`,
              minWidth: `calc(100% - ${H_PADDING * 2}px)`,
              scrollSnapAlign: 'start',
            }}
          >
            <CardTile
              card={card}
              isSelected={index === effectiveIndex}
              onClick={() => {
                selectCard(card.id)
                scrollTo(index)
              }}
            />
          </div>
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
