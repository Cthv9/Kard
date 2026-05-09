import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useActiveCards, useArchivedCards } from '../../hooks/useCards'
import { useCardStore } from '../../store/useCardStore'
import { usePrivacyStore } from '../../store/usePrivacyStore'

export function SearchModal() {
  const closeSearch = useCardStore((s) => s.closeSearch)
  const selectCard = useCardStore((s) => s.selectCard)
  const { maskAmount } = usePrivacyStore()
  const { data: activeCards = [] } = useActiveCards()
  const { data: archivedCards = [] } = useArchivedCards()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSearch()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [closeSearch])

  const q = query.toLowerCase()
  const allCards = [
    ...activeCards.map((c) => ({ ...c, isArchived: false })),
    ...archivedCards.map((c) => ({ ...c, isArchived: true })),
  ]
  const filtered = q
    ? allCards.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q),
      )
    : allCards

  function handleSelect(id: string, isArchived: boolean) {
    selectCard(id)
    navigate(isArchived ? '/archive' : '/')
    closeSearch()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(10,10,18,0.7)', backdropFilter: 'blur(12px)' }}
      onClick={closeSearch}
    >
      <div
        className="relative m-4 mt-16 rounded-3xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--border)', height: 56 }}
        >
          <Search size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca carta..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--muted)' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              <p className="text-sm">Nessuna carta trovata</p>
            </div>
          ) : (
            <div className="p-2">
              {filtered.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleSelect(card.id, card.isArchived)}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors active:scale-[0.98]"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: card.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
                      {card.name}
                    </p>
                    {card.description && (
                      <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {card.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {maskAmount(card.current_balance, card.currency)}
                    </p>
                    {card.isArchived && (
                      <p className="text-xs" style={{ color: 'var(--muted2)' }}>
                        Archiviata
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
