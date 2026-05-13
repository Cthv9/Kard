-- ── WALLET STATS RPC ──────────────────────────────────────────────────────────
-- Aggregates the figures the Stats page needs into a single round-trip,
-- replacing the three SELECTs (cards, transactions limit(2000), profiles)
-- that the client was joining in JS. Doing the math in Postgres scales:
-- 10k transactions stay in the DB instead of streaming to the device.
--
-- Returns a JSON object with the exact shape the UI expects:
--   {
--     totalRemaining:    number,
--     totalInitial:      number,
--     activeCardCount:   number,
--     archivedCardCount: number,
--     userSpending: [
--       { profile: { id, display_name, avatar_color }, totalSpent, transactionCount }
--     ]
--   }

CREATE OR REPLACE FUNCTION wallet_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_result    jsonb;
BEGIN
  v_wallet_id := my_wallet_id();
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Profile has no wallet' USING ERRCODE = '42501';
  END IF;

  WITH
    wallet_cards AS (
      SELECT id, initial_balance, current_balance, is_archived
      FROM   cards
      WHERE  wallet_id = v_wallet_id
    ),
    totals AS (
      SELECT
        COALESCE(SUM(current_balance) FILTER (WHERE NOT is_archived), 0)::numeric AS total_remaining,
        COALESCE(SUM(initial_balance) FILTER (WHERE NOT is_archived), 0)::numeric AS total_initial,
        COUNT(*) FILTER (WHERE NOT is_archived) AS active_count,
        COUNT(*) FILTER (WHERE is_archived)     AS archived_count
      FROM wallet_cards
    ),
    user_spending AS (
      SELECT
        p.id, p.display_name, p.avatar_color,
        COALESCE(SUM(t.amount), 0)::numeric AS total_spent,
        COUNT(t.id)::bigint                 AS transaction_count
      FROM   profiles p
      LEFT JOIN transactions t
        ON t.user_id = p.id
       AND t.card_id IN (SELECT id FROM wallet_cards)
      WHERE  p.wallet_id = v_wallet_id
      GROUP BY p.id, p.display_name, p.avatar_color
    )
  SELECT jsonb_build_object(
    'totalRemaining',    t.total_remaining,
    'totalInitial',      t.total_initial,
    'activeCardCount',   t.active_count,
    'archivedCardCount', t.archived_count,
    'userSpending', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'profile', jsonb_build_object(
            'id',            us.id,
            'display_name',  us.display_name,
            'avatar_color',  us.avatar_color
          ),
          'totalSpent',        us.total_spent,
          'transactionCount',  us.transaction_count
        )
        ORDER BY us.total_spent DESC
      ) FROM user_spending us),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM totals t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION wallet_stats() TO authenticated;
