-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── WALLETS ───────────────────────────────────────────────────────────────────
-- A wallet is the shared "family group" that owns cards.
CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_by  UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- One profile per Supabase auth user, linked to exactly one wallet.
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id    UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Back-fill the wallet FK now that profiles exists
ALTER TABLE wallets
  ADD CONSTRAINT wallets_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- ── CARDS ─────────────────────────────────────────────────────────────────────
CREATE TABLE cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  code            TEXT NOT NULL,
  code_type       TEXT NOT NULL DEFAULT 'barcode'
                    CHECK (code_type IN ('barcode','qrcode','text')),
  initial_balance NUMERIC(10,2) NOT NULL CHECK (initial_balance >= 0),
  current_balance NUMERIC(10,2) NOT NULL CHECK (current_balance >= 0),
  currency        TEXT NOT NULL DEFAULT 'EUR',
  color           TEXT NOT NULL DEFAULT '#6366f1',
  card_number     TEXT,
  expiry_date     DATE,
  is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at     TIMESTAMPTZ,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX cards_wallet_active_idx ON cards (wallet_id, is_archived, sort_order);

-- ── TRANSACTIONS ──────────────────────────────────────────────────────────────
-- Append-only ledger — never updated or deleted.
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id       UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount        NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  balance_after NUMERIC(10,2) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_card_idx ON transactions (card_id, created_at DESC);
CREATE INDEX transactions_user_idx ON transactions (user_id, created_at DESC);

-- ── LOGIN EVENTS ──────────────────────────────────────────────────────────────
-- Records each login for security alerts (new device detection).
CREATE TABLE login_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  is_new     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIGGERS ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────
ALTER TABLE wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

-- Helper function: returns the caller's wallet_id
CREATE OR REPLACE FUNCTION my_wallet_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT wallet_id FROM profiles WHERE id = auth.uid()
$$;

-- wallets: members can read their own wallet
CREATE POLICY "members can read own wallet"
  ON wallets FOR SELECT
  USING (id = my_wallet_id());

CREATE POLICY "members can update own wallet"
  ON wallets FOR UPDATE
  USING (created_by = auth.uid());

-- profiles: members can read all profiles in their wallet
CREATE POLICY "members can read wallet profiles"
  ON profiles FOR SELECT
  USING (wallet_id = my_wallet_id());

CREATE POLICY "users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- cards: wallet members only
CREATE POLICY "members can select cards"
  ON cards FOR SELECT
  USING (wallet_id = my_wallet_id());

CREATE POLICY "members can insert cards"
  ON cards FOR INSERT
  WITH CHECK (wallet_id = my_wallet_id());

CREATE POLICY "members can update cards"
  ON cards FOR UPDATE
  USING (wallet_id = my_wallet_id());

CREATE POLICY "members can delete cards"
  ON cards FOR DELETE
  USING (wallet_id = my_wallet_id());

-- transactions: wallet members only (via card)
CREATE POLICY "members can select transactions"
  ON transactions FOR SELECT
  USING (
    card_id IN (SELECT id FROM cards WHERE wallet_id = my_wallet_id())
  );

CREATE POLICY "members can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    card_id IN (SELECT id FROM cards WHERE wallet_id = my_wallet_id())
    AND user_id = auth.uid()
  );

-- login_events: own user only
CREATE POLICY "users can read own login events"
  ON login_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users can insert own login events"
  ON login_events FOR INSERT
  WITH CHECK (user_id = auth.uid());
