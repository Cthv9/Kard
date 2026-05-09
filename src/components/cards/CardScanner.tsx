import { useEffect, useRef, useState } from 'react'
import { X, Check, AlertCircle } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat } from '@zxing/library'
import { useCardStore } from '../../store/useCardStore'

export function CardScanner() {
  const { closeScanner, setScannedCode, openAddCard } = useCardStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const foundRef = useRef(false)
  const [status, setStatus] = useState<'scanning' | 'success' | 'error'>('scanning')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!videoRef.current) return

    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, controls) => {
        if (!stopRef.current) stopRef.current = () => controls.stop()

        if (result && !foundRef.current) {
          foundRef.current = true
          controls.stop()

          const code = result.getText()
          const codeType =
            result.getBarcodeFormat() === BarcodeFormat.QR_CODE ? 'qrcode' : 'barcode'

          setStatus('success')
          setTimeout(() => {
            setScannedCode({ code, codeType })
            closeScanner()
            openAddCard()
          }, 700)
        }
      })
      .catch((err: Error) => {
        setErrorMsg(err.message || 'Impossibile accedere alla fotocamera')
        setStatus('error')
      })

    return () => {
      stopRef.current?.()
    }
  }, [closeScanner, openAddCard, setScannedCode])

  function handleClose() {
    stopRef.current?.()
    closeScanner()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        playsInline
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <X size={22} />
        </button>
        <span className="text-white font-semibold text-sm">Scansiona tessera</span>
        <div className="w-10" />
      </div>

      {/* Overlay with scan frame */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* Dark corners around the frame */}
        <div className="absolute inset-0 bg-black/50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 10% 25%, 10% 65%, 90% 65%, 90% 25%, 10% 25%)' }} />

        {status === 'scanning' && (
          <>
            {/* Scan frame */}
            <div className="relative w-72 h-44">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-indigo-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-indigo-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-indigo-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-indigo-400 rounded-br-xl" />
              {/* Animated scan line */}
              <div className="scanner-line absolute left-3 right-3 h-0.5 bg-indigo-400 rounded-full shadow-[0_0_8px_2px_rgba(99,102,241,0.7)]" />
            </div>
            <p className="mt-8 text-white/80 text-sm text-center px-10 max-w-xs">
              Inquadra il codice a barre o QR della tessera fisica
            </p>
          </>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.5)]">
              <Check size={40} className="text-white" strokeWidth={3} />
            </div>
            <p className="text-white font-semibold text-lg">Codice rilevato!</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 px-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <p className="text-white font-semibold text-center">Fotocamera non disponibile</p>
            <p className="text-white/60 text-center text-sm">{errorMsg}</p>
            <button
              onClick={handleClose}
              className="mt-2 bg-white/10 text-white px-8 py-3 rounded-2xl font-semibold"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      {status === 'scanning' && (
        <div className="absolute bottom-0 left-0 right-0 pb-12 flex justify-center bg-gradient-to-t from-black/60 to-transparent pt-8">
          <p className="text-white/50 text-xs">Supporta codici a barre e QR code</p>
        </div>
      )}
    </div>
  )
}
