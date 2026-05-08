import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CreditCard } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { BarcodeDisplay, QRDisplay } from './BarcodeDisplay'
import type { CardWithStats } from '../../types/app'

interface FocusModeProps {
  card: CardWithStats
}

export function FocusMode({ card }: FocusModeProps) {
  const { isFocusMode, exitFocusMode, openSpendSheet } = useCardStore()
  const [codeView, setCodeView] = useState<'barcode' | 'qrcode' | 'text'>(card.code_type)

  // Restore codeView when card changes
  useEffect(() => {
    setCodeView(card.code_type)
  }, [card.code_type])

  // Screen Wake Lock — prevents dimming at checkout
  useEffect(() => {
    if (!isFocusMode) return
    let wakeLock: WakeLockSentinel | null = null

    async function requestLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // graceful degradation — no crash if unsupported
      }
    }
    requestLock()

    return () => { void wakeLock?.release() }
  }, [isFocusMode])

  // Lock body scroll and attempt fullscreen for maximum brightness
  useEffect(() => {
    if (!isFocusMode) return
    document.body.style.overflow = 'hidden'

    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})

    return () => {
      document.body.style.overflow = ''
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [isFocusMode])

  if (!isFocusMode) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-white"
      style={{ touchAction: 'none' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: card.color }}
          >
            <CreditCard size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">{card.name}</span>
        </div>
        <button
          onClick={exitFocusMode}
          className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          aria-label="Chiudi"
        >
          <X size={20} />
        </button>
      </div>

      {/* Code display area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {codeView === 'barcode' && (
          <div className="w-full max-w-sm">
            <BarcodeDisplay
              value={card.code}
              height={140}
              width={3}
              displayValue
              className="w-full"
            />
          </div>
        )}
        {codeView === 'qrcode' && (
          <QRDisplay value={card.code} size={220} className="flex justify-center" />
        )}
        {codeView === 'text' && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Codice</p>
            <p className="text-gray-900 font-mono text-2xl font-bold tracking-widest break-all">
              {card.code}
            </p>
          </div>
        )}

        {/* Code value text */}
        {codeView !== 'text' && (
          <p className="text-gray-400 font-mono text-sm text-center">{card.code}</p>
        )}
      </div>

      {/* Toggle type (if applicable) */}
      <div className="px-5 pb-4 space-y-3">
        {card.code_type !== 'text' && (
          <div className="flex bg-gray-100 rounded-2xl p-1">
            {(['barcode', 'qrcode'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCodeView(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  codeView === t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                {t === 'barcode' ? 'Codice a barre' : 'QR Code'}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => { exitFocusMode(); openSpendSheet() }}
          disabled={card.current_balance <= 0}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Registra spesa
        </button>
      </div>
    </div>,
    document.body
  )
}
