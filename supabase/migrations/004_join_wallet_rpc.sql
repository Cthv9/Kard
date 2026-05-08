-- Allows a new user to join an existing wallet by invite code.
-- Called during onboarding after signup.
CREATE OR REPLACE FUNCTION join_wallet(
  p_invite_code TEXT,
  p_display_name TEXT,
  p_avatar_color TEXT DEFAULT '#6366f1'
)
RETURNS profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_profile   profiles;
BEGIN
  SELECT id INTO v_wallet_id
  FROM   wallets
  WHERE  invite_code = p_invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO profiles (id, wallet_id, display_name, avatar_color)
  VALUES (auth.uid(), v_wallet_id, p_display_name, p_avatar_color)
  ON CONFLICT (id) DO UPDATE
    SET wallet_id    = v_wallet_id,
        display_name = p_display_name,
        avatar_color = p_avatar_color
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Creates a new wallet and owner profile in one call.
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
  -- Insert profile first (needed for wallet FK)
  INSERT INTO profiles (id, wallet_id, display_name, avatar_color)
  VALUES (auth.uid(), uuid_generate_v4(), p_display_name, p_avatar_color)
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet with this user as owner
  INSERT INTO wallets (name, created_by)
  VALUES (p_wallet_name, auth.uid())
  RETURNING * INTO v_wallet;

  -- Link profile to new wallet
  UPDATE profiles SET wallet_id = v_wallet.id WHERE id = auth.uid();

  RETURN v_wallet;
END;
$$;

GRANT EXECUTE ON FUNCTION join_wallet(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_wallet(TEXT, TEXT, TEXT) TO authenticated;
