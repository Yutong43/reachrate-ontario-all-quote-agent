# ReachRate — Ontario All-Quote Agent

ReachRate is a personal-use, evidence-first operator for Ontario private-passenger auto-insurance quote routes.

> One profile. Many official routes. Evidence for every result.

## What the product does

1. Builds one canonical driver, vehicle and coverage profile. A planned purchase can use year, make and model without inventing a VIN.
2. Creates an approved market plan. The default route pass prioritizes Aviva Direct, Rates.ca, TD Insurance, CAA Insurance, Co-operators and Allstate; it does not promise that any route will clear its human checkpoint.
3. Opens supported official quote journeys in the participant's visible Chrome/Brave tab and maps approved non-verifying fields through the ReachRate Quote Copilot extension.
4. Stops for CAPTCHA, identity/licence lookup, declarations, consent, purchase or destination restrictions. Session-only address/contact values require a separate one-route approval before the extension may prefill them.
5. Normalizes only evidence-backed results as `quoted_comparable`, `quoted_non_comparable`, `estimate_only`, a human handoff or an exact blocker.
6. Compares prices only when the returned coverage matches the benchmark. Every unquoted route remains visible in the ledger.

There are no seeded premiums or pre-canned market-quote cards. A price enters the comparison only through the evidence gate, with an official result URL, legal underwriter, coverage and a redacted evidence note. If the official page exposes no quote reference, ReachRate generates an explicitly local timestamped page-capture ID.

## Market identity model

The app keeps these identities separate:

- legal underwriter;
- insurer group;
- consumer brand or program;
- distributor, broker or comparison platform;
- distinct rate source.

The Registry preserves the brief's 32 insurer groups and 60 legal entities as a searchable reference table. The audited inventory separately tracks 24 consumer-facing journeys: 19 price-capable web/broker/comparison entrances and 5 reference-only or inapplicable paths. These are routes, not 24 insurers or 24 guaranteed distinct prices.

MyChoice is treated correctly as a comparison/referral platform, not an insurer. Its public Terms of Use prohibit robots, spiders and automatic-device access, so it is retained as a reference/manual route and excluded from Auto Run. Rates.ca and LowestRates.ca likewise never become the legal underwriter; each returned carrier must be captured separately.

## Current verified route audit

On 2026-08-11, 17 online journeys were pushed beyond their marketing entrance to a concrete form, declaration, access barrier or duplicate-engine finding. The clean planned-vehicle test returned **zero confirmed premiums** because every viable route encountered at least one applicant-controlled requirement:

- full residential/garaging address: TD, CAA, Co-operators, Square One and Surex;
- contact details plus disclosure/follow-up consent: Rates.ca, LowestRates.ca, InsuranceHotline, ThinkInsure and Inova;
- declaration or profile truth conflict: Aviva Direct and PC Insurance;
- licence/VIN, terms or access control: Onlia, Sonnet, belairdirect and Desjardins;
- transient official network failure: Allstate.

RBC and PC use the Aviva BOL engine family; Rates.ca, LowestRates.ca and InsuranceHotline use the RATESDOTCA engine family. Shared implementation does not automatically mean a duplicate premium, but repeated lead forms and returned carriers must be deduplicated. The exact tested depth, next action, public phone and engine family are recorded in `data/online-route-audit.json` and shown in the Registry UI.

## Stack

- Next.js 16, React 19, TypeScript and Tailwind CSS
- Manifest V3 Chrome/Brave extension for visible-tab autofill, checkpoint pause/resume and price-candidate return
- Playwright Core as a seven-route localhost fallback worker
- Supabase Postgres for server-only outcome and handoff persistence
- ElevenLabs Agents and Twilio-compatible telephony for the private voice rehearsal
- Zod for API validation

Vercel is not required to show or judge the UI. The ElevenLabs webhook writes directly to the authenticated Supabase Edge Function. Use Vercel, another host or an HTTPS tunnel only if the web UI itself must be shared remotely.

## Run locally

```powershell
git clone https://github.com/Yutong43/reachrate-ontario-all-quote-agent.git
Set-Location reachrate-ontario-all-quote-agent
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Truthful direct-entry scenes are available for presentation and QA. They never inject prices:

- `http://localhost:3000/?scene=plan`
- `http://localhost:3000/?scene=search`
- `http://localhost:3000/?scene=compare`
- `http://localhost:3000/?scene=callback`

## Browser extension

`browser-extension/` contains the complete ReachRate Quote Copilot extension.
It keeps the browser agent visible and supervised, maps the active ReachRate
profile into supported official quote forms, pauses for human-only decisions,
and returns a detected or manually entered price to the matching ReachRate card.

### Install

1. Open `chrome://extensions` or `brave://extensions`.
2. Enable **Developer mode** and choose **Load unpacked**.
3. Select the repository's `browser-extension` folder (for example, `<repository-folder>\browser-extension`).
4. Reload ReachRate and confirm the Search Scope screen says **Extension connected · v0.5.2**.
5. After changing extension files, return to the extensions page, click **Reload**
   on ReachRate Quote Copilot, and refresh both ReachRate and the quote tab.

### Use

1. Start ReachRate, load or complete a profile, approve a search scope and open
   one of the supported official quote routes.
2. On the official quote tab, open ReachRate Quote Copilot. The popup shows the
   active profile and route. Click **Autofill this quote**.
3. The extension fills mapped, non-verifying fields and ordinary navigation
   controls. It stops before declarations, CAPTCHA, identity or licence checks,
   full-address selection, contact consent, purchase, bind or payment.
4. Complete the named checkpoint yourself, then click **Resume after my click**
   in the page overlay or resume the route from ReachRate.
5. A visible premium candidate returns to the matching ReachRate result card.
   If detection fails, choose **Manually update a visible price** in the popup,
   enter the displayed company, underwriter, amount and period, then send it to
   ReachRate for review.

The extension supports 19 allowlisted quote-site entrances listed in
`browser-extension/manifest.json`. MyChoice is deliberately excluded from host
permissions because its public terms restrict automated access.

### Configuration and keys

The extension itself has no API key file and needs no Supabase, ElevenLabs,
Twilio or insurer credentials. It exchanges the approved profile and route
events with local ReachRate and keeps active route state in
`chrome.storage.session`, which is temporary browser-session storage.

Optional persistence and voice features are configured only on the Next.js
server through the root [`.env.example`](.env.example). Copy it to the ignored
`.env.local` and replace placeholders with resources you create. Additional
redacted ElevenLabs examples are under `tools/elevenlabs-agent-config/`:

- `agents.example.json`
- `tools.example.json`
- `agent_configs/ReachRate-Quote-Handoff.json`
- `tool_configs/record_quote_outcome.json`
- `tool_configs/record_quote_outcome.payload.example.json`

None of these files contains a working secret, private phone number or
account-bound resource ID.

## Optional local browser worker

The localhost fallback worker can be enabled independently of the extension:

```powershell
$env:LOCAL_BROWSER_AGENT_ENABLED="true"
npm run dev
```

The fallback worker supports official starts for Allstate, Aviva Direct, Square One, Rates.ca, TD Insurance, Desjardins and LowestRates.ca. It returns only a mapped-field handoff, human checkpoint, access blocker or unresolved status. It never claims a premium itself.

To enable the optional voice rehearsal, configure an ElevenLabs agent,
telephony resource and Supabase project in the ignored `.env.local`, then run:

```powershell
.\scripts\start-local-demo.ps1 -EnableBrowserAgent
```

For the private-number voice rehearsal only:

```powershell
.\scripts\start-local-demo.ps1 -EnableBrowserAgent -EnableOutboundCalls -OutboundPhone "+1XXXXXXXXXX"
```

The destination must already be in `OUTBOUND_PHONE_ALLOWLIST`, and `OUTBOUND_CALLS_ENABLED` should return to `false` after the supervised window.

## Environment variables and secret boundary

Copy `.env.example` to `.env.local`; only `.env.example` is committed. No
variable is prefixed with `NEXT_PUBLIC_`, so keys are not bundled into the
browser. The extension contains no Supabase, ElevenLabs or Twilio credential.

| Variable | Used by | Required for | Safe to commit? |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Next.js server / Edge Function | Hosted outcome persistence | Project URL only; use a placeholder in source |
| `SUPABASE_EDGE_FUNCTION_URL` | Next.js server | Preferred persistence bridge | Project URL only; use a placeholder in source |
| `SUPABASE_SERVICE_ROLE_KEY` | Next.js server fallback | Optional direct database access | **No** |
| `ELEVENLABS_API_KEY` | Next.js server / CLI | Starting a voice-agent call | **No** |
| `ELEVENLABS_AGENT_ID` | Next.js server | Select the dedicated agent | Resource ID; keep in `.env.local` for portability |
| `ELEVENLABS_PHONE_NUMBER_ID` | Next.js server | Select the telephony resource | Resource ID; keep in `.env.local` for portability |
| `ELEVENLABS_TOOL_SECRET` | Next.js server / ElevenLabs Secret | Authenticate persistence writes | **No** |
| `OUTBOUND_CALLS_ENABLED` | Next.js server | Explicit call safety gate | Commit only the default `false` |
| `OUTBOUND_PHONE_ALLOWLIST` | Next.js server | One or more allowlisted E.164 destinations | **No** |
| `LOCAL_BROWSER_AGENT_ENABLED` | Next.js server | Optional localhost fallback worker | Commit only the default `false` |

Do not add the participant's phone, email, date of birth, full address, licence
number, VIN, call audio or transcript to source control. Run the secret/PII
checks described under **Data artifacts** before publishing.

## Deploy with your own resources

Hosted persistence and voice features require a Supabase project, ElevenLabs
agent, webhook tool and telephony resource. No deployment step can place a call
until those resources are configured and the two outbound safety variables are
explicitly enabled.

1. Clone the repository, run `npm install`, copy `.env.example` to the ignored
   `.env.local`, and create a new Supabase project.
2. Link that project, review and apply the SQL migrations, then deploy
   `quote-persistence` as shown below.
3. Generate a random webhook secret. Store its plaintext in ElevenLabs Secrets;
   store only its SHA-256 digest in the Supabase
   `integration_secret_hashes` row named `reachrate_tool`.
4. Replace `YOUR_PROJECT_REF` and `YOUR_ELEVENLABS_SECRET_ID` only in a private
   working copy of the voice tool configuration. Create the webhook tool and a
   dedicated ElevenLabs agent, attach that tool,
   and put the new resource IDs in `.env.local`.
5. Connect a Twilio or ElevenLabs phone resource and allowlist
   only the supervised E.164 destination. Keep outbound calls disabled
   except during a supervised test.

The browser-only product, market registry and redacted artifacts run without
any hosted credential.

## Supabase

ReachRate uses isolated, deny-by-default tables in a Supabase project. All ReachRate public-schema tables have RLS enabled, with `anon` and `authenticated` privileges revoked. The browser never receives a service-role key.

To reproduce the backend in a new Supabase project, install dependencies, log
in to the CLI, create a project, and use its project reference:

```powershell
npx supabase --version
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --linked --dry-run
npx supabase db push --linked --yes
npx supabase functions deploy quote-persistence --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

The migrations enable RLS on every public table, revoke `anon` and
`authenticated`, and grant access only to the server role. Hosted Edge
Functions receive `SUPABASE_URL` and a secret/admin key from Supabase; never
copy that key into the browser. Generate a random tool secret, store its
plaintext in ElevenLabs Secrets, and insert only its SHA-256 digest into
`integration_secret_hashes` as `reachrate_tool`. The server can persist either
through a server-only Supabase client or the authenticated `quote-persistence`
Edge Function. Verified market results retain source identity, result
semantics, evidence URL and distinct-rate-source ID.

For the full voice resource setup and Supabase webhook linkage, see
[`tools/elevenlabs-agent-config/README.md`](tools/elevenlabs-agent-config/README.md).

## Voice rehearsal boundary

The ElevenLabs demo calls only the participant's own allowlisted number. The agent:

1. discloses that it is automated and not a licensed broker or insurer employee;
2. asks permission to continue;
3. separately asks permission to retain a structured, non-audio summary;
4. can extract a role-played amount or blocker;
5. persists it with `is_simulation=true` as handoff evidence, never as a market quote.

The UI exposes two synthetic companies: **Demo Carrier 1** demonstrates a consented spoken demo amount such as “200 per month” or “220 pounds per month” being normalized to a numeric CAD demo result, and **Demo Carrier 2** demonstrates declining AI assistance and requesting a real person with no premium saved. Neither uses a real insurer logo or name. Simulation records are excluded from official comparison, ranking and market-completion metrics. A real insurer or broker call requires separate supervised authorization and evidence.

## Safety rules

- Never fabricate a licence number, VIN, identity, consent, carrier or underwriter.
- Never bypass CAPTCHA or an access restriction.
- Never automate a destination whose terms prohibit it.
- Never retain a transcript without affirmative consent.
- Never expose Supabase admin or ElevenLabs credentials to the client.
- Stop after saving an evidence-backed result; never bind, pay or provide coverage advice.
- Redact sensitive fields before saving or submitting evidence.

## Architecture and safety note

The extension fills only user-approved fields and pauses for declarations,
CAPTCHA, identity checks, addresses, licence or VIN details and contact consent.
Secrets remain server-side. Supabase stores redacted structured outcomes, and an
authenticated deletion endpoint removes a selected run. The voice rehearsal
calls only an allowlisted private number and never enters official rankings.

## Known limitations

Official sites can change and may require human declarations, CAPTCHA, identity,
address, licence, VIN, membership or a licensed intermediary. Broker and
comparison routes cannot be ranked until the returned underwriter, coverage and
premium are verified. Supabase, ElevenLabs and telephony are optional external
integrations that each reproducer configures independently.

## Pre-existing materials and third-party licences

ReachRate was built from scratch for this hackathon. It uses Next.js, React,
TypeScript, Tailwind CSS, Lucide, Zod, Playwright Core and Supabase packages
under their published open-source licences. Supabase, ElevenLabs and Twilio are
external services governed by their respective terms. The organizer-provided
challenge brief supplied the market seed. No credentials or copied application
source are included.

## Data artifacts

- Complete machine-readable submission registry: [`data/submission-market-registry.json`](data/submission-market-registry.json) — 24 consumer journeys, 32 insurer groups and 60 legal entities
- Application route registry: [`data/market-registry.json`](data/market-registry.json) or `GET /api/registry`
- Current online-route audit: [`data/online-route-audit.json`](data/online-route-audit.json)
- Redacted run report: [`data/demo-run-report.json`](data/demo-run-report.json)
- Unpacked visible-browser extension: [`browser-extension/`](browser-extension/)

Run the complete local submission check before committing:

```powershell
npm run check:submission
```

The submission repository is public for direct judge access. Public source
visibility does not enable outbound calls or publish a hosted insurance
service: both browser automation and phone rehearsal remain local,
credential-gated and participant-supervised.
