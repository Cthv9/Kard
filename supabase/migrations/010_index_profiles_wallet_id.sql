-- Index profiles.wallet_id so RLS policies that filter members of a wallet
-- can resolve in O(log n) instead of scanning the whole profiles table.
-- The "members can read wallet profiles" policy in 001_initial_schema.sql
-- and the my_wallet_id() helper both depend on this predicate.

CREATE INDEX IF NOT EXISTS profiles_wallet_id_idx ON profiles(wallet_id);
