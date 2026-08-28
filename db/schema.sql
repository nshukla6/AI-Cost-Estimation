-- AI Cost Tracking — core schema
--
-- Portable PostgreSQL DDL — no Supabase-specific extensions, the `auth`
-- schema, or RLS policies required. Everything lives in the default
-- `public` schema.
--
-- Restructured from the original numeric-id design (see git history) to
-- match an externally-sourced users/departments shape — `users` and
-- `departments` are natural-keyed (email, department_id) as if synced from
-- an HR/IdP system, not created by this app. `vendors` likewise uses a
-- natural `code` key instead of a surrogate id. Auth and role assignment
-- are split out of `users` into their own tables (`user_auth`, `user_roles`)
-- rather than columns on it, since `users` itself is treated as read-mostly
-- reference data, not something this app's own signup/role-assignment flow
-- writes to directly.
--
-- IMPORTANT: this file is the target design. It has NOT been applied to
-- the live Supabase project, and the deployed Edge Function
-- (supabase/functions/api/) still queries the previous numeric-id schema.
-- Applying this as-is would break login and every route immediately —
-- cutting over requires rewriting those queries first (see
-- docs/BACKEND_MIGRATION.md), plus a real data migration for the users/
-- cost_uploads/cost_records rows already sitting in the live database.
--
-- Tables only. No seed/demo data is inserted by this file.

create table vendors (
  code      text primary key,
  name      text not null unique,
  is_active boolean not null default true
);

create table departments (
  department_id        text primary key,
  department_name      text not null,
  level                text,
  parent_id            text references departments (department_id),
  department_full_name text
);

create index departments_parent_id_idx on departments (parent_id);

-- Directory-shaped: mirrors fields you'd expect from an HR/IdP sync
-- (user_principal_name, atlassian_id, license flags) rather than an
-- app-owned signup table. No password or role column here on purpose —
-- see user_auth and user_roles below.
create table users (
  email                text primary key,
  name                 text,
  user_principal_name  text,
  title                text,
  employee_id          text,
  manager_email        text references users (email),
  country              text,
  work_location        text,
  atlassian_id         text,
  status               text,
  jsm_license          boolean default false,
  jsw_license          boolean default false,
  confluence_license   boolean default false,
  department           text,
  department_id        text references departments (department_id),
  is_manager           boolean default false
);

create index users_department_id_idx on users (department_id);
create index users_manager_email_idx on users (manager_email);

create table roles (
  role_code   text primary key,
  role_name   text not null,
  description text
);

create table permissions (
  permission_code text primary key,
  permission_name text not null,
  description     text
);

create table role_permissions (
  role_permission_id uuid not null default gen_random_uuid() primary key,
  role_code           text not null references roles (role_code),
  permission_code      text not null references permissions (permission_code),
  unique (role_code, permission_code)
);

-- A user can hold more than one role at once — deliberately no
-- unique(user_email) here. Whatever resolves a user's effective
-- permissions must union across every role they hold.
create table user_roles (
  user_role_id uuid not null default gen_random_uuid() primary key,
  user_email    text not null references users (email),
  role_code     text not null references roles (role_code),
  unique (user_email, role_code)
);

create index user_roles_user_email_idx on user_roles (user_email);
create index user_roles_role_code_idx on user_roles (role_code);

-- Split from `users` since that table is directory-sourced, not
-- app-managed. `user_name` is informational only — email is still the
-- login identifier the API accepts and checks password_hash against.
create table user_auth (
  user_email    text primary key references users (email),
  user_name     text,
  password_hash text not null
);

create table cost_uploads (
  id                bigserial primary key,
  vendor            text not null references vendors (code),
  cost_month        date not null,
  version           integer not null default 1,
  status            text not null check (status in ('success', 'failed')),
  file_name         text not null,
  file_hash         text not null,
  storage_bucket    text not null,
  storage_path      text not null,
  uploaded_by_email text not null references users (email),
  uploaded_at       timestamptz not null default now(),
  record_count      integer not null default 0,
  -- Why this re-upload replaced the prior version. Required from v2 onward
  -- (a v1 upload has nothing to explain itself against); optional on v1.
  reason            text,
  unique (vendor, cost_month, version),
  constraint cost_uploads_reason_required_on_reupload check (version = 1 or reason is not null)
);

create index cost_uploads_vendor_idx on cost_uploads (vendor);
create index cost_uploads_cost_month_idx on cost_uploads (cost_month);

create table cost_records (
  id         bigserial primary key,
  upload_id  bigint not null references cost_uploads (id),
  user_email text not null references users (email),
  vendor     text not null references vendors (code),
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
  deleted_at           timestamptz,
  -- Kept as-is, no defined semantics yet — not used by any query today.
  usage                bigint
);

create index cost_records_upload_id_idx on cost_records (upload_id);
create index cost_records_user_email_idx on cost_records (user_email);
create index cost_records_vendor_idx on cost_records (vendor);
create index cost_records_cost_month_idx on cost_records (cost_month);
