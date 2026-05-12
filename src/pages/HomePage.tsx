import { lazy, Suspense, useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { CardDeck } from '../components/cards/CardDeck'
import { CardActions } from '../components/cards/CardActions'
import { AddCardForm } from '../components/cards/AddCardForm'
import { FocusMode } from '../components/barcode/FocusMode'
import { SpendSheet } from '../components/transactions/SpendSheet'
import { TransactionList } from '../components/transactions/TransactionList'
import { useActiveCards, useRealtimeCards } from '../hooks/useCards'
import { useCardStore } from '../store/useCardStore'
import { useBackButton } from '../hooks/useBackButton'

// CardScanner pulls in @zxing/browser + @zxing/library (~1 MB minified) for
// camera decoding. Loading it eagerly inflates the first-paint bundle even
// though the scanner is only opened from a button tap. Lazy-loading defers
// the network/parse cost until the user actually clicks "Scansiona".
const CardScanner = lazy(() =>
  import('../components/cards/CardScanner').then((m) => ({ default: m.CardScanner }))
)

export function HomePage() {
  const { data: cards = [], isLoading } = useActiveCards()
  const {
    selectedCardId, selectCard,
    isFocusMode, isSpendSheetOpen, isAddCardOpen, isScannerOpen, editingCard,
  } = useCardStore()
  useRealtimeCards()
  useBackButton()

  useEffect(() => {
    if (cards.length > 0 && (!selectedCardId || !cards.find((c) => c.id === selectedCardId))) {
      selectCard(cards[0].id)
    }
  }, [cards, selectedCardId, selectCard])

  const selectedCard = cards.find((c) => c.id === selectedCardId)

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: 'var(--bg)', paddingBottom: 120 }}
    >
      {/* Ambient orbs */}
      <div className="ambient" />

      {/* Page content (above ambient) */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Header cardCount={cards.length} />

        {/* Section label */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 24px 16px' }}
        >
          <span
            className="text-[12px] font-semibold uppercase"
            style={{ letterSpacing: '1.5px', color: 'var(--muted)' }}
          >
            Le tue carte
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              color: 'var(--muted2)',
            }}
          >
            Scorri per scegliere
          </span>
        </div>

        {/* Carousel */}
        <CardDeck cards={cards} />

        {/* Quick actions */}
        {selectedCard && <CardActions card={selectedCard} />}

        {/* Divider */}
        <div
          style={{
            margin: '28px 24px 0',
            height: 1,
            background: 'var(--border)',
          }}
        />

        {/* Transactions section */}
        {selectedCard && (
          <div style={{ padding: '22px 24px 0' }}>
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 16 }}
            >
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                Attività — {selectedCard.name}
              </span>
              <span
                className="text-[12px] font-medium cursor-pointer"
                style={{ color: 'var(--accent2)' }}
              >
                Vedi tutto
              </span>
            </div>
            <TransactionList cardId={selectedCard.id} />
          </div>
        )}
      </div>

      {/* Overlays */}
      {selectedCard && isFocusMode && <FocusMode card={selectedCard} />}
      {selectedCard && isSpendSheetOpen && <SpendSheet card={selectedCard} />}
      {(isAddCardOpen || editingCard) && <AddCardForm />}
      {isScannerOpen && (
        <Suspense fallback={<ScannerFallback />}>
          <CardScanner />
        </Suspense>
      )}
    </div>
  )
}

// Lightweight black overlay shown for the few hundred ms it takes to fetch
// the scanner chunk on first use. Matches the scanner's full-screen layout
// so the transition is not jarring.
function ScannerFallback() {
  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <div
        className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
