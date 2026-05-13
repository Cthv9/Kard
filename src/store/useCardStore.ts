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
  isSearchOpen: boolean
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
  openSearch: () => void
  closeSearch: () => void
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
  isSearchOpen: false,
  scannedCode: null,
  editingCard: null,

  selectCard: (id) => set({ selectedCardId: id }),
  enterFocusMode: () => set({ isFocusMode: true }),
  exitFocusMode: () => set({ isFocusMode: false }),
  openSpendSheet: () => set({ isSpendSheetOpen: true }),
  closeSpendSheet: () => set({ isSpendSheetOpen: false }),
  openAddCard: () => set({ isAddCardOpen: true, editingCard: null }),
  // Clearing scannedCode here means the form always reads a fresh value the
  // next time it opens, removing the need for a mount-time useEffect inside
  // AddCardForm with empty deps (#30).
  closeAddCard: () => set({ isAddCardOpen: false, scannedCode: null }),
  openScanner: () => set({ isScannerOpen: true }),
  closeScanner: () => set({ isScannerOpen: false }),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  setScannedCode: (data) => set({ scannedCode: data }),
  clearScannedCode: () => set({ scannedCode: null }),
  openEditCard: (card) => set({ editingCard: card, isAddCardOpen: true }),
  closeEditCard: () => set({ editingCard: null, isAddCardOpen: false, scannedCode: null }),
}))
