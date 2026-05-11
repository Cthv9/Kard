-- Change expiry_date from DATE to TEXT so encrypted blobs (base64) can be stored.
-- Existing DATE values are cast to their ISO-8601 text representation (e.g. "2027-12-31").
ALTER TABLE cards ALTER COLUMN expiry_date TYPE TEXT USING expiry_date::TEXT;
