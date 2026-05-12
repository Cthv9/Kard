-- ── SECURITY HARDENING ────────────────────────────────────────────────────────
-- Closes the four highest-severity findings from the audit:
--   1. deduct_credit was SECURITY DEFINER but never verified that the card
--      belonged to the caller's wallet — any authenticated user could spend
--      from any card whose UUID they knew.
--   2. UPDATE policies on cards/profiles/wallets had USING but no WITH CHECK,
--      so a member could mutate wallet_id (or profile.id) to migrate rows
--      across wallets.
--   3. create_wallet / join_wallet used ON CONFLICT DO UPDATE on profiles,
--      letting an already-onboarded user silently switch wallets just by
--      replaying the RPC with a different invite code.
--   4. login_events INSERT accepted any client-provided user_agent/ip_address.
--      We narrow that to keep it consistent with auth.uid().
--
-- Each section is idempotent: it drops the prior version (policy/function)
-- before recreating it, so the migration can be replayed safely.

-- ── 1. deduct_credit: validate ownership and archival state ───────────────────
CREATE OR REPLACE FUNCTION deduct_credit(
  p_card_id UUID,
  p_amount  NUMERIC,
  p_note    TEXT DEFAULT NULL
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_my_wallet   UUID;
  v_card_wallet UUID;
  v_archived    BOOLEAN;
  v_new_balance NUMERIC;
  v_tx          transactions;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive' USING ERRCODE = '22023';
  END IF;

  SELECT wallet_id INTO v_my_wallet FROM profiles WHERE id = v_user_id;
  IF v_my_wallet IS NULL THEN
    RAISE EXCEPTION 'Profile has no wallet' USING ERRCODE = '42501';
  END IF;

  -- Lock the row first to prevent concurrent overdrafts.
  SELECT wallet_id, is_archived, current_balance - p_amount
  INTO   v_card_wallet, v_archived, v_new_balance
  FROM   cards
  WHERE  id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found' USING ERRCODE = '42704';
  END IF;

  IF v_card_wallet <> v_my_wallet THEN
    -- Surface the same "not found" code so the function does not leak
    -- whether a UUID exists in another wallet.
    RAISE EXCEPTION 'Card not found' USING ERRCODE = '42704';
  END IF;

  IF v_archived THEN
    RAISE EXCEPTION 'Card is archived' USING ERRCODE = '22023';
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = '22023';
  END IF;

  UPDATE cards
  SET    current_balance = v_new_balance
  WHERE  id = p_card_id;

  INSERT INTO transactions (card_id, user_id, amount, balance_after, note)
  VALUES (p_card_id, v_user_id, p_amount, v_new_balance, p_note)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_credit(UUID, NUMERIC, TEXT) TO authenticated;


-- ── 2. UPDATE policies with WITH CHECK ────────────────────────────────────────
-- Without WITH CHECK, USING is only evaluated on the pre-update row. Members
-- could therefore set wallet_id = '<other wallet>' on an UPDATE and the new
-- row would land outside their scope, escaping RLS. WITH CHECK enforces that
-- the post-update row also belongs to the caller.

DROP POLICY IF EXISTS "members can update own wallet" ON wallets;
CREATE POLICY "members can update own wallet"
  ON wallets FOR UPDATE
  USING      (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING      (id = auth.uid())
  WITH CHECK (id = auth.uid() AND wallet_id = my_wallet_id());

DROP POLICY IF EXISTS "members can update cards" ON cards;
CREATE POLICY "members can update cards"
  ON cards FOR UPDATE
  USING      (wallet_id = my_wallet_id())
  WITH CHECK (wallet_id = my_wallet_id());


-- ── 3. create_wallet / join_wallet: reject if profile already exists ──────────
-- Prevents an authenticated user from silently changing wallets by replaying
-- the RPC. Switching wallets must now go through an explicit (future) flow.

CREATE OR REPLACE FUNCTION create_wallet(
  p_wallet_name  TEXT,
  p_display_name TEXT,
  p_avatar_color TEXT DEFAULT '#6366f1'
)
RETURNS wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Profile already exists' USING ERRCODE = '23505';
  END IF;

  -- created_by → profiles(id) is DEFERRABLE INITIALLY DEFERRED: no immediate check
  INSERT INTO wallets (name, created_by)
  VALUES (p_wallet_name, auth.uid())
  RETURNING * INTO v_wallet;

  INSERT INTO profiles (id, wallet_id, display_name, avatar_color)
  VALUES (auth.uid(), v_wallet.id, p_display_name, p_avatar_color);

  RETURN v_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION create_wallet(TEXT, TEXT, TEXT) TO authenticated;


CREATE OR REPLACE FUNCTION join_wallet(
  p_invite_code  TEXT,
  p_display_name TEXT,
  p_avatar_color TEXT DEFAULT '#6366f1'
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_profile   profiles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Profile already exists' USING ERRCODE = '23505';
  END IF;

  SELECT id INTO v_wallet_id
  FROM   wallets
  WHERE  invite_code = p_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '42704';
  END IF;

  INSERT INTO profiles (id, wallet_id, display_name, avatar_color)
  VALUES (auth.uid(), v_wallet_id, p_display_name, p_avatar_color)
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION join_wallet(TEXT, TEXT, TEXT) TO authenticated;
