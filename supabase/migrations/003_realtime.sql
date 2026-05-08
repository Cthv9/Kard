-- Enable Supabase Realtime on the tables that need live sync
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
