-- ── INVITE CODE HARDENING + LOGIN_EVENTS LOCKDOWN ─────────────────────────────
-- Two residual security fixes from the audit (P5):
--   #7  invite_code era 8 hex chars derivati da md5(random()::text). random()
--       non è crittograficamente sicuro e 32 bit di entropia rendono il codice
--       brute-forceabile (~4·10⁹ combinazioni) su un endpoint pubblico senza
--       rate limit. Passiamo a 12 hex chars derivati da uuid_generate_v4()
--       (48 bit di entropia, sorgente cryptographically secure).
--   #20 login_events accettava INSERT con user_agent/ip_address forniti dal
--       client, falsificabili. Nessun consumer attuale; revochiamo l'INSERT
--       policy. Quando servirà il tracking, andrà esposto via RPC che legge
--       gli header dalla request, non accetta payload utente.
--
-- Idempotente: la modifica del default vale solo per le RIGHE FUTURE; gli
-- invite_code già emessi (8 char) restano validi per compatibilità.

ALTER TABLE wallets
  ALTER COLUMN invite_code
  SET DEFAULT substr(replace(uuid_generate_v4()::text, '-', ''), 1, 12);

DROP POLICY IF EXISTS "users can insert own login events" ON login_events;
