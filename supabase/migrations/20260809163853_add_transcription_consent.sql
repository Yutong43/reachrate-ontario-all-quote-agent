alter table public.voice_handoffs
  add column if not exists consent_to_transcribe boolean;

comment on column public.voice_handoffs.consent_to_transcribe is
  'Affirmative permission to retain a structured transcript-derived summary; call recording remains disabled.';
