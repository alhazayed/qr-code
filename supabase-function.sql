-- ================================================================
-- Add this function to your Supabase SQL Editor AFTER the schema
-- It atomically increments total_scans and updates last_scanned_at
-- ================================================================

create or replace function increment_scan(code_id text)
returns void
language plpgsql
as $$
begin
  update qr_codes
  set
    total_scans     = total_scans + 1,
    last_scanned_at = now()
  where id = code_id;
end;
$$;
