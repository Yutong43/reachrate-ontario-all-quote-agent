# ReachRate Quote Copilot

This unpacked Manifest V3 extension is the supervised browser lane for
ReachRate. It keeps automation in the user's visible Chrome or Brave session,
fills only the reviewed profile, and returns checkpoint or price-candidate
events to local ReachRate at `http://127.0.0.1:3000` or
`http://localhost:3000`.

## Install once

1. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
2. Turn on **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `browser-extension` folder inside your cloned ReachRate repository.

5. Reload the local ReachRate page. The Search Scope screen should show
   **Extension connected · v0.5.2**.

After any extension-code update, click **Reload** on this extension in
`chrome://extensions` or `brave://extensions`, then refresh ReachRate and the
official quote tab.

## Demo operation

1. Load a saved profile in ReachRate, complete any missing truthful personal
   fields, and approve the search scope.
2. Start a route from ReachRate. The extension opens an allowlisted official quote site in a visible tab.
3. It fills mapped fields and safely clicks ordinary `Next` / `Continue` controls.
4. At a declaration, identity/licence lookup, CAPTCHA, full-address request, contact consent, or purchase step, it displays **Agent paused — your click is required**.
5. Complete only the named checkpoint, then click **Resume after my click** in the overlay (or resume from ReachRate).
6. If a premium is detected, the extension sends the candidate directly to the matching ReachRate result card while preserving the official source page as evidence.
7. If detection fails, expand **Enter result manually** in the overlay, type the company and visible monthly/annual premium from the official page, and send it directly to the matching result card.

Allstate starts directly on its current Quick Quote intake. The public Ontario
landing page opens that intake in a second tab, so this keeps the supervised
session attached to the form that needs to be filled.

## Popup controls

- **Autofill this quote** sends the active ReachRate profile to the supported
  official quote tab.
- **Manually update a visible price** accepts a company, returned legal
  underwriter, CAD amount and monthly or annual period. It sends the candidate
  to the active ReachRate route for confirmation.
- **Open local ReachRate** focuses an existing local app tab or opens one.

The active profile and route are obtained from the local ReachRate tab. The
extension does not contain a built-in demo profile or a seeded premium.

## Configuration and secret boundary

The extension has no `.env` file and requires no API key. It does not read the
root `.env.local`. Active route state is stored in `chrome.storage.session` and
is scoped to the browser session. Allowed domains and permissions are declared
in `manifest.json`; adding a new destination requires reviewing and editing the
manifest and its adapter in `routes.js`.

Optional Supabase, ElevenLabs and telephony settings belong to the ReachRate
server, not this extension. The repository root `.env.example` contains safe
placeholders for those settings. Redacted agent, webhook and payload examples
are in `tools/elevenlabs-agent-config/`. Never place a key, phone number,
licence number, VIN or insurer login in extension source.

## Deliberate boundaries

- No CAPTCHA bypass or anti-bot evasion.
- No fabricated VIN, driver's licence number, address, email, phone or declaration.
- No purchase, bind or payment click.
- MyChoice is not included in extension host permissions because its public Terms of Use restrict automated access.
- Extension extraction is a candidate, not a saved quote, until the participant confirms the official evidence.
- The extension does not store Supabase keys, telephony keys or insurer credentials.
