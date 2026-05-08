import { Barcode, Minus, Archive, RotateCcw } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { useArchiveCard, useRestoreCard } from '../../hooks/useCards'
import { usePrivacyStore } from '../../store/usePrivacyStore'
import type { CardWithStats } from '../../types/app'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'

interface CardActionsProps {
  card: CardWithStats
  archived?: boolean
}

export function CardActions({ card, archived = false }: CardActionsProps) {
  const { enterFocusMode, openSpendSheet } = useCardStore()
  const { mutate: archiveCard, isPending: archiving } = useArchiveCard()
  const { mutate: restoreCard, isPending: restoring } = useRestoreCard()
  const { maskAmount } = usePrivacyStore()

  function handleArchive() {
    archiveCard(card.id, {
      onSuccess: () => toast.success(`"${card.name}" archiviata`),
      onError: () => toast.error('Errore durante l\'archiviazione'),
    })
  }

  function handleRestore() {
    restoreCard(card.id, {
      onSuccess: () => toast.success(`"${card.name}" ripristinata`),
      onError: () => toast.error('Errore durante il ripristino'),
    })
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-4 mx-4">
      {/* Card summary */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white font-bold text-lg">{card.name}</div>
          {card.description && (
            <div className="text-white/60 text-xs mt-0.5">{card.description}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-white font-black text-xl">
            {maskAmount(card.current_balance, card.currency)}
          </div>
          <div className="text-white/50 text-xs">
            rimanenti
          </div>
        </div>
      </div>

      {/* Actions */}
      {!archived ? (
        <div className="grid grid-cols-3 gap-2">
          <ActionButton
            icon={<Barcode size={20} />}
            label="Barcode"
            onClick={enterFocusMode}
            primary
          />
          <ActionButton
            icon={<Minus size={20} />}
            label="Spendi"
            onClick={openSpendSheet}
            disabled={card.current_balance <= 0}
          />
          <ActionButton
            icon={<Archive size={20} />}
            label="Archivia"
            onClick={handleArchive}
            loading={archiving}
            variant="danger"
          />
        </div>
      ) : (
        <div className="flex gap-2">
          <ActionButton
            icon={<Barcode size={20} />}
            label="Barcode"
            onClick={enterFocusMode}
            primary
          />
          <ActionButton
            icon={<RotateCcw size={20} />}
            label="Ripristina"
            onClick={handleRestore}
            loading={restoring}
          />
        </div>
      )}
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  primary?: boolean
  variant?: 'default' | 'danger'
  disabled?: boolean
  loading?: boolean
}

function ActionButton({ icon, label, onClick, primary, variant = 'default', disabled, loading }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-40',
        primary
          ? 'bg-white text-indigo-700 shadow-sm'
          : variant === 'danger'
          ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
          : 'bg-white/15 text-white hover:bg-white/25'
      )}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon
      )}
      {label}
    </button>
  )
}
