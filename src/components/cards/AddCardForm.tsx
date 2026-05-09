import { useEffect, useState } from 'react'
import { X, Camera } from 'lucide-react'
import { useAddCard } from '../../hooks/useCards'
import { useCardStore } from '../../store/useCardStore'
import { CARD_COLORS } from '../../types/app'
import { BarcodeDisplay } from '../barcode/BarcodeDisplay'
import { toast } from 'sonner'

export function AddCardForm() {
  const { closeAddCard, openScanner, scannedCode, clearScannedCode } = useCardStore()
  const { mutate: addCard, isPending } = useAddCard()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [code, setCode] = useState(scannedCode?.code ?? '')
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode' | 'text'>(
    scannedCode?.codeType ?? 'barcode'
  )

  // Consume scannedCode from store on mount (set before form opened via scanner)
  useEffect(() => {
    if (scannedCode) clearScannedCode()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [initialBalance, setInitialBalance] = useState('')
  const [currency, setCurrency] = useState('EUR')
  const [color, setColor] = useState<string>(CARD_COLORS[0])
  const [cardNumber, setCardNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  // Validate barcode value for CODE128
  const barcodeValid = code.length > 0 && /^[\x20-\x7E]+$/.test(code)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const balance = parseFloat(initialBalance)
    if (isNaN(balance) || balance < 0) {
      toast.error('Saldo non valido')
      return
    }

    addCard(
      {
        name,
        description: description || null,
        code,
        code_type: codeType,
        initial_balance: balance,
        currency,
        color,
        card_number: cardNumber || null,
        expiry_date: expiryDate || null,
      },
      {
        onSuccess: () => {
          toast.success(`"${name}" aggiunta!`)
          closeAddCard()
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-md bg-[#1a1040] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#1a1040] px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/10">
          <h2 className="text-white font-bold text-lg">Nuova carta</h2>
          <button
            onClick={closeAddCard}
            className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <Field label="Nome carta *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="es. Carrefour 50€"
              className="input-dark"
            />
          </Field>

          {/* Description */}
          <Field label="Descrizione">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. Buono regalo ricevuto"
              className="input-dark"
            />
          </Field>

          {/* Balance + Currency */}
          <div className="flex gap-3">
            <Field label="Saldo iniziale *" className="flex-1">
              <input
                type="number"
                inputMode="decimal"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="50.00"
                className="input-dark"
              />
            </Field>
            <Field label="Valuta" className="w-24">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-dark"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
          </div>

          {/* Code type */}
          <Field label="Tipo codice">
            <div className="flex gap-2">
              {(['barcode', 'qrcode', 'text'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCodeType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    codeType === t
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {t === 'barcode' ? '▮▯▮▯' : t === 'qrcode' ? 'QR' : 'Testo'}
                </button>
              ))}
            </div>
          </Field>

          {/* Code value */}
          <Field label="Codice *">
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                required
                placeholder="Inserisci il valore del codice"
                className="input-dark font-mono flex-1"
              />
              <button
                type="button"
                onClick={() => { closeAddCard(); openScanner() }}
                title="Scansiona con fotocamera"
                className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl px-3 border border-white/20 transition-colors"
              >
                <Camera size={18} />
              </button>
            </div>
          </Field>

          {/* Live barcode preview */}
          {codeType === 'barcode' && code.length > 0 && (
            <div className="bg-white rounded-2xl p-4 flex items-center justify-center">
              {barcodeValid ? (
                <BarcodeDisplay value={code} height={60} displayValue />
              ) : (
                <p className="text-red-500 text-xs text-center">
                  Codice non valido per CODE128 (solo caratteri ASCII stampabili)
                </p>
              )}
            </div>
          )}

          {/* Card number (optional) */}
          <Field label="Numero carta (opzionale)">
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="es. •••• 1234"
              className="input-dark"
            />
          </Field>

          {/* Expiry (optional) */}
          <Field label="Scadenza (opzionale)">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input-dark"
            />
          </Field>

          {/* Color picker */}
          <Field label="Colore carta">
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-transform active:scale-90"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? '3px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </Field>

          {/* Preview */}
          <div className="rounded-2xl overflow-hidden">
            <div
              className="h-16 rounded-2xl flex items-center px-4"
              style={{ backgroundColor: color }}
            >
              <span className="text-white font-bold text-sm truncate">
                {name || 'Nome carta'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-sm transition-all active:scale-95 disabled:opacity-60"
          >
            {isPending ? 'Salvataggio...' : 'Aggiungi carta'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children, className }: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-white/70 text-xs font-medium mb-1.5">{label}</label>
      {children}
    </div>
  )
}
