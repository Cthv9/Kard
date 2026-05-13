import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { BarcodeDisplay, QRDisplay } from './BarcodeDisplay'
import type { CardWithStats } from '../../types/app'

interface FocusModeProps {
  card: CardWithStats
}

export function FocusMode({ card }: FocusModeProps) {
  const { isFocusMode, exitFocusMode, openSpendSheet } = useCardStore()
  // codeView is local UI state (user can toggle between barcode/QR), but it
  // must reset when the underlying card switches. The "store previous prop in
  // state + sync during render" pattern is the React 19-recommended way to
  // do this without a side-effecting useEffect.
  const [codeView, setCodeView] = useState<'barcode' | 'qrcode' | 'text'>(card.code_type)
  const [lastCardType, setLastCardType] = useState(card.code_type)
  if (lastCardType !== card.code_type) {
    setLastCardType(card.code_type)
    setCodeView(card.code_type)
  }

  /* Screen Wake Lock */
  useEffect(() => {
    if (!isFocusMode) return
    let wakeLock: WakeLockSentinel | null = null
    async function requestLock() {
      try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
      } catch { /* graceful degradation */ }
    }
    requestLock()
    return () => { void wakeLock?.release() }
  }, [isFocusMode])

  /* Body scroll lock */
  useEffect(() => {
    if (!isFocusMode) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isFocusMode])

  if (!isFocusMode) return null

  return createPortal(
    <>
      {/* Overlay — z-index above bottom nav (30) */}
      <div
        onClick={exitFocusMode}
        className="overlay-fade"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 40,
        }}
      />

      {/* Sheet */}
      <div
        className="sheet-open"
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          width: '100%',
          maxWidth: 420,
          maxHeight: 'calc(100dvh - 40px)',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: '16px 28px calc(32px + env(safe-area-inset-bottom, 0px))',
          zIndex: 41,
          borderTop: '1px solid var(--border)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40, height: 4,
            background: 'var(--muted2)',
            borderRadius: 2,
            margin: '0 auto 24px',
          }}
        />

        {/* Card name label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            marginBottom: 6,
          }}
        >
          {card.name}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text)',
            marginBottom: 28,
          }}
        >
          Scansiona il barcode
        </div>

        {/* Barcode area — white background. When the wallet key did not decrypt
            this card we never feed ciphertext to JsBarcode; instead we surface
            a clear warning so the user knows the device is missing the key. */}
        {card.decryptionFailed ? (
          <div
            style={{
              background: 'rgba(251, 191, 36, 0.08)',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              borderRadius: 16,
              padding: '20px 18px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#fbbf24',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <AlertTriangle size={18} />
              Carta non decifrabile
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
              Questo dispositivo non ha la chiave del wallet che ha creato la carta.
              Chiedi un nuovo invito a un membro che la vede correttamente.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '24px 20px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {codeView === 'barcode' && (
              <BarcodeDisplay value={card.code} height={80} width={2} displayValue={false} className="w-full" />
            )}
            {codeView === 'qrcode' && (
              <QRDisplay value={card.code} size={180} className="flex justify-center" />
            )}
            {codeView === 'text' && (
              <p className="font-mono text-2xl font-bold tracking-widest break-all text-gray-900 text-center">
                {card.code}
              </p>
            )}

            {/* Numeric code */}
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 16,
                letterSpacing: 4,
                color: '#111',
                fontWeight: 500,
              }}
            >
              {card.code}
            </div>
          </div>
        )}

        {/* Toggle barcode / QR (only when code_type is not text and we have a usable code) */}
        {card.code_type !== 'text' && !card.decryptionFailed && (
          <div
            style={{
              display: 'flex',
              background: 'var(--surface2)',
              borderRadius: 12,
              padding: 4,
              marginBottom: 12,
            }}
          >
            {(['barcode', 'qrcode'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setCodeView(t)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  background: codeView === t ? 'var(--surface)' : 'transparent',
                  color: codeView === t ? 'var(--text)' : 'var(--muted)',
                  boxShadow: codeView === t ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                {t === 'barcode' ? 'Codice a barre' : 'QR Code'}
              </button>
            ))}
          </div>
        )}

        {/* Spend button (balance cards only) */}
        {card.initial_balance > 0 && (
          <button
            onClick={() => { exitFocusMode(); openSpendSheet() }}
            disabled={card.current_balance <= 0}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 16,
              background: 'var(--accent2)',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              border: 'none',
              marginBottom: 8,
              opacity: card.current_balance <= 0 ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
            className="active:scale-95"
          >
            Registra spesa
          </button>
        )}

        {/* Close button */}
        <button
          onClick={exitFocusMode}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 16,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: 15,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          className="active:scale-95"
        >
          Chiudi
        </button>
      </div>
    </>,
    document.body
  )
}
