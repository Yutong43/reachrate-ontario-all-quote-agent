create table if not exists public.integration_secret_hashes (
  secret_name text primary key,
  secret_sha256 text not null
    check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  active boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.integration_secret_hashes enable row level security;

revoke all on table public.integration_secret_hashes from public, anon, authenticated;
grant all on table public.integration_secret_hashes to service_role;

comment on table public.integration_secret_hashes is
  'One-way hashes used to authenticate tightly scoped server-to-server integrations.';
