import { useEffect, useRef } from 'react'
import { useCardStore } from '../store/useCardStore'

/**
 * Intercepts the browser/Android hardware back button when an overlay is open.
 * Strategy: push a dummy history entry whenever any overlay opens, then on
 * popstate close the topmost overlay instead of navigating away.
 *
 * NOTE: `selectedCardId` is intentionally NOT treated as an "overlay" — a card
 * is always auto-selected on the home page, so including it would push a
 * history entry on every card change and pollute the back-button stack.
 */
export function useBackButton() {
  const {
    isFocusMode, exitFocusMode,
    isScannerOpen, closeScanner,
    isSpendSheetOpen, closeSpendSheet,
    isAddCardOpen, closeAddCard,
    isSearchOpen, closeSearch,
    editingCard, closeEditCard,
  } = useCardStore()

  const anyOpen =
    isFocusMode || isScannerOpen || isSpendSheetOpen ||
    isAddCardOpen || isSearchOpen || !!editingCard

  // Refs keep the popstate handler reading fresh state without re-registering
  // it on every overlay change. Without this, React 18 batching could leave
  // the handler with stale values when two overlays swap in the same tick
  // (e.g. closeScanner + openAddCard), causing the back button to attempt
  // closing the already-gone overlay.
  const stateRef = useRef({ isFocusMode, isScannerOpen, isSpendSheetOpen, isAddCardOpen, isSearchOpen, editingCard })
  const actionsRef = useRef({ exitFocusMode, closeScanner, closeSpendSheet, closeAddCard, closeEditCard, closeSearch })

  useEffect(() => {
    stateRef.current = { isFocusMode, isScannerOpen, isSpendSheetOpen, isAddCardOpen, isSearchOpen, editingCard }
    actionsRef.current = { exitFocusMode, closeScanner, closeSpendSheet, closeAddCard, closeEditCard, closeSearch }
  })

  useEffect(() => {
    if (!anyOpen) return

    // Push a dummy entry so the next back action fires popstate instead of exit
    history.pushState({ kardOverlay: true }, '')

    function handler(event: PopStateEvent) {
      // Only intercept our own entries
      if (!(event.state as Record<string, unknown> | null)?.kardOverlay) return

      const s = stateRef.current
      const a = actionsRef.current
      if (s.isFocusMode) { a.exitFocusMode(); return }
      if (s.isScannerOpen) { a.closeScanner(); return }
      if (s.isSpendSheetOpen) { a.closeSpendSheet(); return }
      if (s.isAddCardOpen) { a.closeAddCard(); return }
      if (s.editingCard) { a.closeEditCard(); return }
      if (s.isSearchOpen) { a.closeSearch(); return }
    }

    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [anyOpen])
}
