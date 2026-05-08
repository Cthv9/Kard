import { useState } from 'react'
import { Header } from '../components/layout/Header'
import { FocusMode } from '../components/barcode/FocusMode'
import { CardActions } from '../components/cards/CardActions'
import { TransactionList } from '../components/transactions/TransactionList'
import { useArchivedCards } from '../hooks/useCards'
import { useCardStore } from '../store/useCardStore'
import { CardTile } from '../components/cards/CardTile'
import { usePrivacyStore } from '../store/usePrivacyStore'
import { Archive } from 'lucide-react'

export function ArchivePage() {
  const { data: cards = [], isLoading } = useArchivedCards()
  const { selectCard, selectedCardId, isFocusMode } = useCardStore()
  const { maskAmount } = usePrivacyStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const selectedCard = cards.find((c) => c.id === selectedCardId)

  function handleExpand(id: string) {
    const next = expandedId === id ? null : id
    setExpandedId(next)
    selectCard(next)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0826] to-[#1a0f3d] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0826] to-[#1a0f3d] pb-24">
      <Header />

      <main className="px-4 pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Archive size={16} className="text-white/60" />
          <h2 className="text-white/80 text-sm font-semibold">
            Archivio — {cards.length} {cards.length === 1 ? 'carta' : 'carte'}
          </h2>
        </div>

        {cards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-white/50 text-sm">Nessuna carta archiviata</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const isExpanded = expandedId === card.id
              return (
                <div key={card.id} className="space-y-2">
                  <div
                    onClick={() => handleExpand(card.id)}
                    className="flex items-center gap-3 bg-white/5 hover:bg-white/8 rounded-2xl px-4 py-3 cursor-pointer transition-colors"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 font-medium text-sm truncate">{card.name}</p>
                      {card.description && (
                        <p className="text-white/40 text-xs truncate">{card.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/60 font-semibold text-sm">
                        {maskAmount(card.current_balance, card.currency)}
                      </p>
                      <p className="text-white/30 text-xs">
                        archiviata
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
                      <CardActions card={card} archived />
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
    </div>
  )
}
