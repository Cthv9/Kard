import { useState } from 'react'
import { Header } from '../components/layout/Header'
import { FocusMode } from '../components/barcode/FocusMode'
import { CardActions } from '../components/cards/CardActions'
import { TransactionList } from '../components/transactions/TransactionList'
import { AddCardForm } from '../components/cards/AddCardForm'
import { SpendSheet } from '../components/transactions/SpendSheet'
import { useArchivedCards } from '../hooks/useCards'
import { useCardStore } from '../store/useCardStore'
import { CardTile } from '../components/cards/CardTile'
import { useMaskAmount } from '../store/usePrivacyStore'
import { useTranslation } from '../hooks/useTranslation'
import { useBackButton } from '../hooks/useBackButton'
import { Archive } from 'lucide-react'

export function ArchivePage() {
  const { data: cards = [], isLoading } = useArchivedCards()
  const {
    isFocusMode, isSpendSheetOpen, isAddCardOpen, editingCard,
  } = useCardStore()
  const maskAmount = useMaskAmount()
  const t = useTranslation()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  useBackButton()

  // Drive the focus / spend / edit overlays from the LOCAL expandedId so
  // browsing the archive doesn't mutate the home page's selectedCardId
  // (which would briefly blank out HomePage on navigate-back).
  const selectedCard = cards.find((c) => c.id === expandedId)

  function handleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--page-bg)' }}>
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--page-bg)' }}>
      <Header />

      <main className="px-4 pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Archive size={16} style={{ color: 'var(--muted)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {t.archive.title} — {t.archive.cards(cards.length)}
          </h2>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.archive.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const isExpanded = expandedId === card.id
              return (
                <div key={card.id} className="space-y-2">
                  <div
                    onClick={() => handleExpand(card.id)}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      borderRadius: 16,
                    }}
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                        {card.name}
                      </p>
                      {card.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {card.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {maskAmount(card.current_balance, card.currency)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
                        {t.archive.archived}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 pl-2">
                      <div className="flex justify-center">
                        <CardTile
                          card={card}
                          isSelected={false}
                          onClick={() => {}}
                          className="opacity-70"
                        />
                      </div>
                      <CardActions
                        card={card}
                        archived
                        onRestoreSuccess={() => setExpandedId(null)}
                      />
                      <TransactionList cardId={card.id} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {selectedCard && isFocusMode && <FocusMode card={selectedCard} />}
      {selectedCard && isSpendSheetOpen && <SpendSheet card={selectedCard} />}
      {(isAddCardOpen || editingCard) && <AddCardForm />}
    </div>
  )
}
