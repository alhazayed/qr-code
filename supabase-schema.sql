-- ================================================================
-- QRTrack — Supabase Schema
-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New Query → paste & run
-- ================================================================

-- QR Codes table
create table if not exists qr_codes (
  id              text primary key default gen_random_uuid()::text,
  name            text not null,
  destination_url text not null,
  created_at      timestamptz default now(),
  total_scans     integer default 0,
  last_scanned_at timestamptz
);

-- Scans table
create table if not exists scans (
  id           text primary key default gen_random_uuid()::text,
  qr_code_id   text references qr_codes(id) on delete cascade,
  scanned_at   timestamptz default now(),
  user_agent   text,
  ip           text,
  country      text
);

-- Index for fast lookup by QR code
create index if not exists scans_qr_code_id_idx on scans(qr_code_id);
create index if not exists scans_scanned_at_idx on scans(scanned_at desc);

-- Enable Row Level Security (but allow all for now — add auth later)
alter table qr_codes enable row level security;
alter table scans enable row level security;

-- Public read/write policies (open access — suitable for demo)
-- For production: add user auth and restrict to owner
create policy "Allow all on qr_codes" on qr_codes for all using (true) with check (true);
create policy "Allow all on scans" on scans for all using (true) with check (true);
