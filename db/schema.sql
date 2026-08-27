-- AI Cost Tracking — core schema
--
-- Portable PostgreSQL DDL. Runs unmodified on Supabase (Postgres 15+) and on
-- a standalone PostgreSQL instance — no Supabase-specific extensions, the
-- `auth` schema, or RLS policies are required by this file. Normalizes the
-- shape implied by src/mocks/db.ts:
--   - cost_uploads.uploaded_by is a real FK (uploaded_by_id -> users.id)
--     instead of an embedded {id, name} object.
--   - cost_uploads carries storage_provider/storage_bucket/storage_path
--     instead of a hardcoded URL, so an uploaded cost sheet can live in
--     Supabase Storage today and Azure Blob Storage later without any
--     schema change — only the storage adapter used by the app changes.
--
-- Tables only. No seed/demo data is inserted by this file.

create table departments (
  id   bigserial primary key,
  name text not null unique
);

create table vendors (
  id        bigserial primary key,
  name      text not null unique,
  is_active boolean not null default true
);

create table users (
  id            bigserial primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('viewer', 'ai_cost_manager', 'ai_tool_admin')),
  department_id bigint not null references departments (id),
  manager_id    bigint references users (id),
  created_at    timestamptz not null default now()
);

create index users_department_id_idx on users (department_id);
create index users_manager_id_idx on users (manager_id);

create table cost_uploads (
  id               bigserial primary key,
  vendor_id        bigint not null references vendors (id),
  cost_month       date not null,
  version          integer not null default 1,
  status           text not null check (status in ('success', 'failed')),
  file_name        text not null,
  file_hash        text not null,
  -- Where the uploaded CSV actually lives. 'supabase' today, 'azure_blob'
  -- later; storage_bucket/storage_path are provider-agnostic identifiers
  -- (bucket name + object key for Supabase, container + blob name for
  -- Azure) resolved by the storage adapter, not embedded as a full URL.
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase', 'azure_blob')),
  storage_bucket   text not null,
  storage_path     text not null,
  uploaded_by_id   bigint not null references users (id),
  uploaded_at      timestamptz not null default now(),
  record_count     integer not null default 0,
  -- Why this re-upload replaced the prior version. Required from v2 onward
  -- (a v1 upload has nothing to explain itself against); optional on v1.
  reason           text,
  unique (vendor_id, cost_month, version),
  constraint cost_uploads_reason_required_on_reupload check (version = 1 or reason is not null)
);

create index cost_uploads_vendor_id_idx on cost_uploads (vendor_id);
create index cost_uploads_cost_month_idx on cost_uploads (cost_month);

create table cost_records (
  id         bigserial primary key,
  upload_id  bigint not null references cost_uploads (id),
  user_id    bigint not null references users (id),
  vendor_id  bigint not null references vendors (id),
  cost_month date not null,
  -- Original cost-sheet currency. Defaults to USD so the common case needs
  -- no extra ingest work; ISO 4217-shaped, not validated against a lookup.
  currency             text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  -- Rate applied at ingest to convert amount_original -> amount_usd.
  -- Resolved from a rate source at ingest time, not read from the CSV;
  -- stored as a snapshot so historical records don't shift if rates move.
  exchange_rate_to_usd numeric(18, 8) not null default 1 check (exchange_rate_to_usd > 0),
  -- Raw amount from the cost sheet, in `currency`. Kept alongside amount_usd
  -- as the audit trail — amount_usd is derived from this, not the other
  -- way around.
  amount_original      numeric(12, 2) not null check (amount_original >= 0),
  amount_usd           numeric(12, 2) not null check (amount_usd >= 0),
  is_deleted           boolean not null default false,
  deleted_at           timestamptz
);

create index cost_records_upload_id_idx on cost_records (upload_id);
create index cost_records_user_id_idx on cost_records (user_id);
create index cost_records_vendor_id_idx on cost_records (vendor_id);
create index cost_records_cost_month_idx on cost_records (cost_month);
