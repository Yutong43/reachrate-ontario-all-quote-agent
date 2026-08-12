# ElevenLabs agent setup

This folder contains a redacted, reproducible configuration for the ReachRate
voice rehearsal. It is intentionally separate from the web-quote lane: the
call goes only to the operator's own allowlisted number, and every returned
value is persisted with `is_simulation=true` and excluded from official price
rankings.

The call path is:

`ReachRate UI -> ElevenLabs outbound-call API -> telephony resource -> operator's private number -> ElevenLabs webhook tool -> Supabase Edge Function -> redacted result polling in ReachRate`

Vercel is not required for this path. The webhook tool calls the HTTPS
Supabase Edge Function directly.

Generated `agents.json` and `tools.json` files are gitignored. Agent, tool,
project and secret IDs are blank or placeholder-only in the public repository.

## Recreate or attach the resources

1. Install ElevenLabs CLI `0.5.2` and run `elevenlabs auth login`. The API key
   is stored by the CLI outside this repository.
2. Import or connect a Twilio number in ElevenLabs. Put the resulting
   `phnum_...` resource ID in the root `.env.local` as
   `ELEVENLABS_PHONE_NUMBER_ID`; do not commit Twilio credentials.
3. Create a dedicated agent with the consent-first configuration in
   `agent_configs/ReachRate-Quote-Handoff.json`. Put its `agent_...` ID in `.env.local` as
   `ELEVENLABS_AGENT_ID`.
4. Replace `YOUR_PROJECT_REF` in
   `tool_configs/record_quote_outcome.json` with the deployed Supabase project
   reference before creating the webhook tool.
5. Generate a random `ELEVENLABS_TOOL_SECRET` of at least 32 characters. Store
   the plaintext only as an ElevenLabs Secret and store only its SHA-256 hash
   in Supabase table `integration_secret_hashes` under the name
   `reachrate_tool`. Never commit either the plaintext or a service-role key.
6. Create or update the webhook tool, attach its `tool_...` ID to the agent's
   `tool_ids`, review the disclosure/consent prompt, and push the agent config.

The CLI sequence for a new account is:

```powershell
elevenlabs auth login
Set-Location tools\elevenlabs-agent-config
elevenlabs tools add record_quote_outcome `
  --type webhook `
  --config-path tool_configs\record_quote_outcome.json
# Copy the newly created tool ID into the private working copy of tool_ids.
elevenlabs agents add "ReachRate Quote Handoff" `
  --from-file agent_configs\ReachRate-Quote-Handoff.json
```

These `add` commands create billable remote resources immediately. Review the
configs first. Keep the generated `agents.json` and `tools.json` private because
they contain resource IDs; `.gitignore` excludes them from the repository.

## Supervised demo

Keep `OUTBOUND_CALLS_ENABLED=false` by default. For a short rehearsal window,
start ReachRate from the repository root with:

```powershell
.\scripts\start-local-demo.ps1 `
  -EnableOutboundCalls `
  -OutboundPhone "+1XXXXXXXXXX"
```

The destination must be the participant's own E.164 number. The script sets a
single-process allowlist, and closing the process returns the gate to disabled.
Do not place insurer calls with this synthetic Demo Carrier flow.
