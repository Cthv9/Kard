# Kard — Portafoglio Digitale Condiviso

App web mobile-first per la gestione condivisa di carte prepagate e voucher con codici a barre. Permette a più persone (es. una famiglia) di condividere lo stesso "tesoretto" di carte con aggiornamenti in tempo reale.

## Funzionalità

- **Vista Mazzo Poker** — le carte si dispongono a ventaglio con animazioni CSS, come carte da gioco in mano
- **Barcode Focus Mode** — overlay full-screen bianco con Screen Wake Lock per leggibilità alla cassa
- **Sync in tempo reale** — ogni spesa appare su tutti i dispositivi connessi in meno di 1 secondo
- **Privacy Mode** — oscura tutti i saldi con un tap (icona occhio nell'header)
- **Tracciabilità** — storico completo con nome utente, importo, data e nota
- **Archivio** — carte esaurite archiviate, dati mai persi
- **Statistiche** — credito totale rimanente e ripartizione spese per utente

## Stack Tecnico

| Layer | Tecnologia |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite |
| Stili | Tailwind CSS |
| Backend | Supabase (PostgreSQL + Realtime + Auth) |
| State | Zustand + TanStack Query |
| Barcode | JsBarcode (rendering locale, nessun dato inviato a terzi) |
| Architettura | MVVM — hooks come ViewModel |
| Hosting | GitHub Pages (deploy automatico via Actions) |

## Deploy su GitHub Pages

### 1. Abilita GitHub Pages

Nel repository → **Settings → Pages → Source → GitHub Actions**

### 2. Crea un progetto Supabase

Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto.
Nel SQL editor, esegui in ordine i file in `supabase/migrations/`:

```
001_initial_schema.sql   — tabelle, RLS, trigger
002_deduct_rpc.sql       — RPC atomica per scalare credito
003_realtime.sql         — abilita Realtime
004_join_wallet_rpc.sql  — RPC per creare/unirsi a un wallet
```

### 3. Aggiungi i secret a GitHub Actions

**Settings → Secrets and variables → Actions → New repository secret**

| Nome | Dove trovarlo |
|------|---------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |

> La `anon key` è sicura lato client — la sicurezza è garantita dalle RLS policy, non dal segreto della chiave.

### 4. Esegui il workflow

**Actions → Deploy to GitHub Pages → Run workflow**

Il sito sarà disponibile su: `https://<tuo-username>.github.io/Kard/`

---

> **Nota:** Senza i secret Supabase il sito mostrerà una schermata "App non configurata". Aggiungi i secret al passo 3 e rilancia il workflow per ottenere la build funzionante.

## Sviluppo locale

```bash
cp .env.example .env.local
# modifica .env.local con le tue credenziali Supabase

npm install
npm run dev
```

## Sicurezza

- **RLS** rigorosa su tutte le tabelle: ogni utente vede solo i dati del proprio wallet
- **CSP** meta tag in `index.html`: blocca script e fetch verso domini non autorizzati
- **Privacy Mode**: saldi oscurati (`€ ••••`) con toggle in-app
- **`.env.local`** sempre nel `.gitignore` — nessuna chiave committata
- **Barcode**: rendering 100% client-side, nessun codice inviato a servizi esterni

## Struttura Progetto

```
src/
├── components/
│   ├── auth/          # Login, registrazione, onboarding wallet
│   ├── barcode/       # BarcodeDisplay, FocusMode
│   ├── cards/         # CardDeck (fan), CardTile, AddCardForm, CardActions
│   ├── layout/        # Header, BottomNav
│   └── transactions/  # SpendSheet, TransactionList
├── hooks/             # ViewModel: useCards, useTransactions, useStats, useAuth
├── lib/               # supabase client, queryClient, utils
├── pages/             # HomePage, StatsPage, ArchivePage
├── store/             # Zustand: useCardStore, usePrivacyStore, useAuthStore
└── types/             # database.ts (schema), app.ts (tipi UI)
supabase/
└── migrations/        # SQL da applicare al progetto Supabase
dist/
└── ...                # Build generata dal workflow GitHub Actions
```
