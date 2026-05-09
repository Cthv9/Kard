-- Fix create_wallet: insert wallet FIRST (created_by FK is DEFERRABLE),
-- then profile with the real wallet_id (non-deferrable FK succeeds immediately).
CREATE OR REPLACE FUNCTION create_wallet(
  p_wallet_name  TEXT,
  p_display_name TEXT,
  p_avatar_color TEXT DEFAULT '#6366f1'
)
RETURNS wallets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet wallets;
BEGIN
  -- created_by → profiles(id) is DEFERRABLE INITIALLY DEFERRED: no immediate check
  INSERT INTO wallets (name, created_by)
  VALUES (p_wallet_name, auth.uid())
  RETURNING * INTO v_wallet;

  -- wallet_id → wallets(id) is non-deferrable, but v_wallet.id exists already
  INSERT INTO profiles (id, wallet_id, display_name, avatar_color)
  VALUES (auth.uid(), v_wallet.id, p_display_name, p_avatar_color)
  ON CONFLICT (id) DO UPDATE
    SET wallet_id    = v_wallet.id,
        display_name = p_display_name,
        avatar_color = p_avatar_color;

  RETURN v_wallet;
END;
$$;
