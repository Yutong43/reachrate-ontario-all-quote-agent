alter table public.quote_outcomes
  drop constraint if exists quote_outcomes_status_check;

alter table public.quote_outcomes
  add constraint quote_outcomes_status_check check (
    status in (
      'quoted',
      'quoted_comparable',
      'quoted_non_comparable',
      'estimate_only',
      'callback_required',
      'manual_handoff',
      'ineligible',
      'affinity_restricted',
      'specialty_only',
      'duplicate_rate_source',
      'not_currently_writing',
      'blocked',
      'access_blocked',
      'unreachable',
      'vin_required',
      'unresolved'
    )
  );

alter table public.quote_outcomes
  add column if not exists source_brand text,
  add column if not exists legal_underwriter text,
  add column if not exists insurer_group text,
  add column if not exists intermediary text,
  add column if not exists distinct_rate_source_id text,
  add column if not exists evidence_url text,
  add column if not exists result_kind text;

alter table public.quote_outcomes
  drop constraint if exists quote_outcomes_result_kind_check;

alter table public.quote_outcomes
  add constraint quote_outcomes_result_kind_check check (
    result_kind is null or result_kind in ('quote', 'estimate', 'blocker', 'handoff')
  );

alter table public.quote_outcomes
  drop constraint if exists quote_outcomes_simulation_not_quote_check;

alter table public.quote_outcomes
  add constraint quote_outcomes_simulation_not_quote_check check (
    not is_simulation
    or (
      status not in ('quoted', 'quoted_comparable', 'quoted_non_comparable')
      and result_kind is distinct from 'quote'
    )
  );
