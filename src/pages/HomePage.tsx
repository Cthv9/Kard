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
  const { data: cards = [], isPending, isError, isFetching, refetch } = useActiveCards()
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

  if (isPending) {
    return <HomePageSkeleton />
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-6">
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            Impossibile caricare le carte.{'\n'}Controlla la connessione e riprova.
          </p>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="font-semibold px-6 py-3 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#0a0a12' }}
          >
            {isFetching ? 'Caricamento…' : 'Riprova'}
          </button>
        </div>
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
            <div style={{ marginBottom: 16 }}>
              <span className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                Attività — {selectedCard.name}
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

// Shown while card data is loading (query enabled but no data yet).
// Mirrors the page layout so there's no layout shift when cards arrive.
function HomePageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', paddingBottom: 120 }}>
      <div className="ambient" />
      <div className="relative" style={{ zIndex: 1 }}>
        {/* Header placeholder */}
        <div style={{ padding: '16px 24px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="rounded-xl animate-pulse" style={{ width: 80, height: 20, background: 'var(--panel)' }} />
          <div className="rounded-full animate-pulse" style={{ width: 36, height: 36, background: 'var(--panel)' }} />
        </div>

        {/* Section label placeholder */}
        <div style={{ padding: '12px 24px 16px' }}>
          <div className="rounded animate-pulse" style={{ width: 90, height: 12, background: 'var(--panel)' }} />
        </div>

        {/* Card placeholder */}
        <div style={{ padding: '0 24px' }}>
          <div
            className="rounded-3xl animate-pulse"
            style={{ width: '100%', maxWidth: 340, height: 200, background: 'var(--panel)', margin: '0 auto' }}
          />
        </div>

        {/* Action buttons placeholder */}
        <div style={{ display: 'flex', gap: 12, padding: '24px 24px 0', justifyContent: 'center' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{ width: 72, height: 72, background: 'var(--panel)' }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ margin: '28px 24px 0', height: 1, background: 'var(--border)' }} />

        {/* Transaction skeleton rows */}
        <div style={{ padding: '22px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="rounded-full animate-pulse" style={{ width: 40, height: 40, background: 'var(--panel)', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="rounded animate-pulse" style={{ width: '60%', height: 12, background: 'var(--panel)' }} />
                <div className="rounded animate-pulse" style={{ width: '40%', height: 10, background: 'var(--panel)' }} />
              </div>
              <div className="rounded animate-pulse" style={{ width: 50, height: 14, background: 'var(--panel)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
