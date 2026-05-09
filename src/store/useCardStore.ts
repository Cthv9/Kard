import { create } from 'zustand'
import type { CardWithStats } from '../types/app'

interface ScannedCode {
  code: string
  codeType: 'barcode' | 'qrcode'
}

interface CardStoreState {
  selectedCardId: string | null
  isFocusMode: boolean
  isSpendSheetOpen: boolean
  isAddCardOpen: boolean
  isScannerOpen: boolean
  scannedCode: ScannedCode | null
  editingCard: CardWithStats | null

  selectCard: (id: string | null) => void
  enterFocusMode: () => void
  exitFocusMode: () => void
  openSpendSheet: () => void
  closeSpendSheet: () => void
  openAddCard: () => void
  closeAddCard: () => void
  openScanner: () => void
  closeScanner: () => void
  setScannedCode: (data: ScannedCode) => void
  clearScannedCode: () => void
  openEditCard: (card: CardWithStats) => void
  closeEditCard: () => void
}

export const useCardStore = create<CardStoreState>((set) => ({
  selectedCardId: null,
  isFocusMode: false,
  isSpendSheetOpen: false,
  isAddCardOpen: false,
  isScannerOpen: false,
  scannedCode: null,
  editingCard: null,

  selectCard: (id) => set({ selectedCardId: id }),
  enterFocusMode: () => set({ isFocusMode: true }),
  exitFocusMode: () => set({ isFocusMode: false }),
  openSpendSheet: () => set({ isSpendSheetOpen: true }),
  closeSpendSheet: () => set({ isSpendSheetOpen: false }),
  openAddCard: () => set({ isAddCardOpen: true, editingCard: null }),
  closeAddCard: () => set({ isAddCardOpen: false }),
  openScanner: () => set({ isScannerOpen: true }),
  closeScanner: () => set({ isScannerOpen: false }),
  setScannedCode: (data) => set({ scannedCode: data }),
  clearScannedCode: () => set({ scannedCode: null }),
  openEditCard: (card) => set({ editingCard: card, isAddCardOpen: true }),
  closeEditCard: () => set({ editingCard: null, isAddCardOpen: false }),
}))
