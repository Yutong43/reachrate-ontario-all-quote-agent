create table if not exists public.quote_runs (
  id text primary key,
  mode text not null check (mode in ('live', 'discovery')),
  profile_alias text not null,
  vehicle_summary jsonb not null default '{}'::jsonb,
  benchmark_coverage jsonb not null default '{}'::jsonb,
  status text not null default 'planned'
    check (status in ('planned', 'running', 'complete', 'deleted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.route_attempts (
  id text primary key,
  run_id text not null references public.quote_runs(id) on delete cascade,
  registry_id text not null,
  route_channel text not null
    check (route_channel in ('web', 'phone', 'broker', 'research')),
  status text not null,
  started_at timestamptz,
  ended_at timestamptz,
  exact_blocker text,
  evidence_note text,
  evidence_hash text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quote_outcomes (
  id text primary key,
  run_id text not null,
  registry_id text not null,
  market_name text not null,
  status text not null check (
    status in (
      'quoted',
      'estimate_only',
      'callback_required',
      'manual_handoff',
      'ineligible',
      'affinity_restricted',
      'specialty_only',
      'duplicate_rate_source',
      'not_currently_writing',
      'access_blocked',
      'unreachable',
      'vin_required',
      'unresolved'
    )
  ),
  source_channel text not null
    check (source_channel in ('web', 'phone', 'broker', 'research')),
  premium_amount numeric check (premium_amount is null or premium_amount >= 0),
  premium_period text check (
    premium_period is null or premium_period in ('monthly', 'annual')
  ),
  annual_premium numeric check (annual_premium is null or annual_premium >= 0),
  coverage_summary text not null default '',
  quote_reference text,
  blocker text,
  evidence_note text not null,
  captured_at timestamptz not null default timezone('utc', now()),
  is_simulation boolean not null default false,
  consent_confirmed boolean not null default false,
  provider_conversation_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.evidence_records (
  id text primary key,
  run_id text not null,
  registry_id text not null,
  outcome_id text references public.quote_outcomes(id) on delete set null,
  evidence_type text not null
    check (evidence_type in ('redacted_screenshot', 'source_url', 'call_outcome', 'reference_id', 'structured_note')),
  source_url text,
  redacted_artifact_path text,
  sha256 text,
  captured_at timestamptz not null default timezone('utc', now()),
  contains_sensitive_data boolean not null default false,
  redaction_checked boolean not null default false
);

create table if not exists public.voice_handoffs (
  id text primary key,
  run_id text not null,
  route_label text not null,
  masked_destination text not null,
  provider_conversation_id text,
  provider_call_sid text,
  status text not null default 'queued',
  is_simulation boolean not null default true,
  consent_to_continue boolean,
  consent_to_record boolean,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.deletion_log (
  id bigint generated always as identity primary key,
  run_id text not null,
  deletion_scope text not null,
  deleted_at timestamptz not null default timezone('utc', now()),
  result text not null
);

create index if not exists route_attempts_run_id_idx
  on public.route_attempts (run_id, created_at desc);

create index if not exists quote_outcomes_run_id_idx
  on public.quote_outcomes (run_id, captured_at desc);

create index if not exists quote_outcomes_registry_id_idx
  on public.quote_outcomes (registry_id);

create index if not exists voice_handoffs_run_id_idx
  on public.voice_handoffs (run_id, created_at desc);

alter table public.quote_runs enable row level security;
alter table public.route_attempts enable row level security;
alter table public.quote_outcomes enable row level security;
alter table public.evidence_records enable row level security;
alter table public.voice_handoffs enable row level security;
alter table public.deletion_log enable row level security;

revoke all on table public.quote_runs from anon, authenticated;
revoke all on table public.route_attempts from anon, authenticated;
revoke all on table public.quote_outcomes from anon, authenticated;
revoke all on table public.evidence_records from anon, authenticated;
revoke all on table public.voice_handoffs from anon, authenticated;
revoke all on table public.deletion_log from anon, authenticated;

grant all on table public.quote_runs to service_role;
grant all on table public.route_attempts to service_role;
grant all on table public.quote_outcomes to service_role;
grant all on table public.evidence_records to service_role;
grant all on table public.voice_handoffs to service_role;
grant all on table public.deletion_log to service_role;
grant usage, select on sequence public.deletion_log_id_seq to service_role;
