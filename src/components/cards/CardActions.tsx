import { Barcode, Minus, Archive, RotateCcw, Pencil } from 'lucide-react'
import { useCardStore } from '../../store/useCardStore'
import { useArchiveCard, useRestoreCard } from '../../hooks/useCards'
import type { CardWithStats } from '../../types/app'
import { useTranslation } from '../../hooks/useTranslation'
import { toast } from 'sonner'

interface CardActionsProps {
  card: CardWithStats
  archived?: boolean
}

export function CardActions({ card, archived = false }: CardActionsProps) {
  const { enterFocusMode, openSpendSheet, openEditCard } = useCardStore()
  const { mutate: archiveCard, isPending: archiving } = useArchiveCard()
  const { mutate: restoreCard, isPending: restoring } = useRestoreCard()
  const t = useTranslation()

  function handleArchive() {
    archiveCard(card.id, {
      onSuccess: () => toast.success(t.actions.archiveSuccess(card.name)),
      onError: () => toast.error(t.actions.archiveError),
    })
  }

  function handleRestore() {
    restoreCard(card.id, {
      onSuccess: () => toast.success(t.actions.restoreSuccess(card.name)),
      onError: () => toast.error(t.actions.restoreError),
    })
  }

  const btnBase: React.CSSProperties = {
    flex: 1,
    height: 52,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'all 0.2s cubic-bezier(.34,1.56,.64,1)',
  }

  if (!archived) {
    return (
      <div style={{ display: 'flex', gap: 10, padding: '20px 24px 0' }}>
        {/* Barcode — PRIMARY */}
        <button
          onClick={enterFocusMode}
          style={{
            ...btnBase,
            background: 'var(--accent)',
            color: '#0a0a12',
            fontWeight: 600,
            borderColor: 'transparent',
          }}
          className="active:scale-95"
        >
          <Barcode size={17} strokeWidth={2} />
          {t.actions.barcode}
        </button>

        {/* Spend — only for balance cards */}
        {card.initial_balance > 0 && (
          <button
            onClick={openSpendSheet}
            disabled={card.current_balance <= 0}
            style={{
              ...btnBase,
              background: 'var(--surface2)',
              color: 'var(--text)',
              borderColor: 'var(--border)',
            }}
            className="active:scale-95 disabled:opacity-40"
          >
            <Minus size={17} strokeWidth={2} />
            {t.actions.spend}
          </button>
        )}

        {/* Edit */}
        <button
          onClick={() => openEditCard(card)}
          style={{
            ...btnBase,
            background: 'var(--surface2)',
            color: 'var(--text)',
            borderColor: 'var(--border)',
          }}
          className="active:scale-95"
        >
          <Pencil size={17} strokeWidth={2} />
          {t.actions.edit}
        </button>

        {/* Archive — DANGER */}
        <button
          onClick={handleArchive}
          disabled={archiving}
          style={{
            ...btnBase,
            background: 'rgba(255,95,109,0.08)',
            color: 'var(--danger)',
            borderColor: 'rgba(255,95,109,0.2)',
          }}
          className="active:scale-95 disabled:opacity-40"
        >
          {archiving ? (
            <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--danger)', borderTopColor: 'transparent' }} />
          ) : (
            <Archive size={17} strokeWidth={2} />
          )}
          {t.actions.archive}
        </button>
      </div>
    )
  }

  /* Archived card: Barcode + Edit + Restore */
  return (
    <div style={{ display: 'flex', gap: 10, padding: '20px 24px 0' }}>
      <button
        onClick={enterFocusMode}
        style={{
          ...btnBase,
          background: 'var(--accent)',
          color: '#0a0a12',
          fontWeight: 600,
          borderColor: 'transparent',
        }}
        className="active:scale-95"
      >
        <Barcode size={17} strokeWidth={2} />
        {t.actions.barcode}
      </button>

      <button
        onClick={() => openEditCard(card)}
        style={{
          ...btnBase,
          background: 'var(--surface2)',
          color: 'var(--text)',
          borderColor: 'var(--border)',
        }}
        className="active:scale-95"
      >
        <Pencil size={17} strokeWidth={2} />
        {t.actions.edit}
      </button>

      <button
        onClick={handleRestore}
        disabled={restoring}
        style={{
          ...btnBase,
          background: 'rgba(124,109,250,0.12)',
          color: 'var(--accent2)',
          borderColor: 'rgba(124,109,250,0.2)',
        }}
        className="active:scale-95 disabled:opacity-40"
      >
        {restoring ? (
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent2)', borderTopColor: 'transparent' }} />
        ) : (
          <RotateCcw size={17} strokeWidth={2} />
        )}
        {t.actions.restore}
      </button>
    </div>
  )
}
