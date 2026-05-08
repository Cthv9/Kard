import { create } from 'zustand'

interface CardStoreState {
  selectedCardId: string | null
  isFocusMode: boolean
  isSpendSheetOpen: boolean
  isAddCardOpen: boolean

  selectCard: (id: string | null) => void
  enterFocusMode: () => void
  exitFocusMode: () => void
  openSpendSheet: () => void
  closeSpendSheet: () => void
  openAddCard: () => void
  closeAddCard: () => void
}

export const useCardStore = create<CardStoreState>((set) => ({
  selectedCardId: null,
  isFocusMode: false,
  isSpendSheetOpen: false,
  isAddCardOpen: false,

  selectCard: (id) => set({ selectedCardId: id }),
  enterFocusMode: () => set({ isFocusMode: true }),
  exitFocusMode: () => set({ isFocusMode: false }),
  openSpendSheet: () => set({ isSpendSheetOpen: true }),
  closeSpendSheet: () => set({ isSpendSheetOpen: false }),
  openAddCard: () => set({ isAddCardOpen: true }),
  closeAddCard: () => set({ isAddCardOpen: false }),
}))
