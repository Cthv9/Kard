import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Top-level boundary so a crash in any component (e.g. JsBarcode RangeError
// on a corrupted card.code, parseFloat on a poisoned amount) does not freeze
// the entire PWA on a blank screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // Surfacing via console is enough for now — we deliberately avoid
    // sending to an external service, since the page could contain
    // unencrypted card data that we don't want leaking through telemetry.
    console.error('Kard top-level error:', error)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg)' }}
      >
        <div className="w-full max-w-sm text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'rgba(251,191,36,0.12)' }}
          >
            <AlertTriangle size={32} style={{ color: '#fbbf24' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
            Qualcosa è andato storto
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            L'app ha incontrato un errore inatteso. Ricarica la pagina per riprovare.
          </p>
          <button
            onClick={this.handleReload}
            className="font-bold px-6 py-3 rounded-2xl text-sm transition-colors active:scale-95"
            style={{ background: 'var(--accent)', color: '#0a0a12' }}
          >
            Ricarica
          </button>
        </div>
      </div>
    )
  }
}
