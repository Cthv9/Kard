-- Atomic credit deduction via a stored procedure.
-- Acquires a row lock on the card, checks balance, updates it,
-- and inserts the transaction record — all in one database transaction.
CREATE OR REPLACE FUNCTION deduct_credit(
  p_card_id UUID,
  p_amount   NUMERIC,
  p_note     TEXT DEFAULT NULL
)
RETURNS transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance NUMERIC;
  v_tx          transactions;
  v_user_id     UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the row to prevent concurrent overdrafts
  SELECT current_balance - p_amount
  INTO   v_new_balance
  FROM   cards
  WHERE  id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
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

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION deduct_credit(UUID, NUMERIC, TEXT) TO authenticated;
