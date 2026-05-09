import { useEffect } from 'react'
import { useCardStore } from '../store/useCardStore'

/**
 * Intercepts the browser/Android hardware back button when an overlay is open.
 * Strategy: push a dummy history entry whenever any overlay opens, then on
 * popstate close the topmost overlay instead of navigating away.
 */
export function useBackButton() {
  const {
    isFocusMode, exitFocusMode,
    isScannerOpen, closeScanner,
    isSpendSheetOpen, closeSpendSheet,
    isAddCardOpen, closeAddCard,
    selectedCardId, selectCard,
    editingCard, closeEditCard,
  } = useCardStore()

  const anyOpen =
    isFocusMode || isScannerOpen || isSpendSheetOpen ||
    isAddCardOpen || !!editingCard || !!selectedCardId

  useEffect(() => {
    if (!anyOpen) return

    // Push a dummy entry so the next back action fires popstate instead of exit
    history.pushState({ kardOverlay: true }, '')

    function handler(event: PopStateEvent) {
      // Only intercept our own entries
      if (!(event.state as Record<string, unknown> | null)?.kardOverlay) return

      if (isFocusMode) { exitFocusMode(); return }
      if (isScannerOpen) { closeScanner(); return }
      if (isSpendSheetOpen) { closeSpendSheet(); return }
      if (isAddCardOpen) { closeAddCard(); return }
      if (editingCard) { closeEditCard(); return }
      if (selectedCardId) { selectCard(null); return }
    }

    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [anyOpen]) // eslint-disable-line react-hooks/exhaustive-deps
}
