import { useEffect } from 'react'
import { Header } from '../components/layout/Header'
import { CardDeck } from '../components/cards/CardDeck'
import { CardActions } from '../components/cards/CardActions'
import { AddCardForm } from '../components/cards/AddCardForm'
import { FocusMode } from '../components/barcode/FocusMode'
import { SpendSheet } from '../components/transactions/SpendSheet'
import { TransactionList } from '../components/transactions/TransactionList'
import { useActiveCards, useRealtimeCards } from '../hooks/useCards'
import { useCardStore } from '../store/useCardStore'

export function HomePage() {
  const { data: cards = [], isLoading } = useActiveCards()
  const { selectedCardId, selectCard, isFocusMode, isSpendSheetOpen, isAddCardOpen } = useCardStore()
  useRealtimeCards()

  // Auto-select first card
  useEffect(() => {
    if (cards.length > 0 && !selectedCardId) {
      selectCard(cards[0].id)
    }
  }, [cards, selectedCardId, selectCard])

  const selectedCard = cards.find((c) => c.id === selectedCardId)

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

      <main className="px-0 pt-2">
        {/* Card fan deck */}
        <CardDeck cards={cards} />

        {/* Selected card actions */}
        {selectedCard && (
          <div className="mt-4 space-y-3">
            <CardActions card={selectedCard} />
            <TransactionList cardId={selectedCard.id} />
          </div>
        )}
      </main>

      {/* Overlays */}
      {selectedCard && isFocusMode && <FocusMode card={selectedCard} />}
      {selectedCard && isSpendSheetOpen && <SpendSheet card={selectedCard} />}
      {isAddCardOpen && <AddCardForm />}
    </div>
  )
}
