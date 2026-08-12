param(
  [switch]$EnableBrowserAgent,
  [switch]$EnableOutboundCalls,
  [string]$OutboundPhone = "",
  [switch]$CheckOnly
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$localEnvPath = Join-Path $projectRoot ".env.local"
$elevenLabsKeyPath = Join-Path $env:USERPROFILE ".elevenlabs\api_key"

function Import-SelectedLocalValue([string]$Name) {
  if ([Environment]::GetEnvironmentVariable($Name) -or -not (Test-Path -LiteralPath $localEnvPath)) {
    return
  }

  foreach ($line in Get-Content -LiteralPath $localEnvPath) {
    if ($line -match "^$([regex]::Escape($Name))=(.*)$") {
      $value = $Matches[1].Trim().Trim('"').Trim("'")
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        Set-Item -Path "Env:$Name" -Value $value
      }
      return
    }
  }
}

foreach ($name in @(
  "SUPABASE_URL",
  "SUPABASE_EDGE_FUNCTION_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ELEVENLABS_TOOL_SECRET"
)) {
  Import-SelectedLocalValue $name
}

if (-not (Test-Path -LiteralPath $elevenLabsKeyPath)) {
  throw "The authenticated ElevenLabs CLI key was not found. Run 'elevenlabs auth login' first."
}

$elevenLabsApiKey = (Get-Content -Raw -LiteralPath $elevenLabsKeyPath).Trim()
if ([string]::IsNullOrWhiteSpace($elevenLabsApiKey)) {
  throw "The authenticated ElevenLabs CLI key file is empty."
}

$env:ELEVENLABS_API_KEY = $elevenLabsApiKey
foreach ($requiredName in @(
  "ELEVENLABS_AGENT_ID",
  "ELEVENLABS_PHONE_NUMBER_ID",
  "SUPABASE_URL",
  "SUPABASE_EDGE_FUNCTION_URL"
)) {
  Import-SelectedLocalValue $requiredName
  if (-not [Environment]::GetEnvironmentVariable($requiredName)) {
    throw "$requiredName is missing. Add it to .env.local before starting the local demo."
  }
}
$env:LOCAL_BROWSER_AGENT_ENABLED = if ($EnableBrowserAgent) { "true" } else { "false" }
$env:OUTBOUND_CALLS_ENABLED = "false"
$env:OUTBOUND_PHONE_ALLOWLIST = ""

if ($EnableOutboundCalls) {
  if ($OutboundPhone -notmatch '^\+[1-9]\d{7,14}$') {
    throw "OutboundPhone must use E.164 format, for example +14165550123."
  }

  $env:OUTBOUND_CALLS_ENABLED = "true"
  $env:OUTBOUND_PHONE_ALLOWLIST = $OutboundPhone
}

if ($CheckOnly) {
  [pscustomobject]@{
    SupabaseProjectConfigured = [bool]$env:SUPABASE_URL
    HostedPersistenceEndpointConfigured = [bool]$env:SUPABASE_EDGE_FUNCTION_URL
    LocalPersistenceCredentialReady = [bool]($env:ELEVENLABS_TOOL_SECRET -or $env:SUPABASE_SERVICE_ROLE_KEY)
    ElevenLabsCliReady = [bool]$env:ELEVENLABS_API_KEY
    ReachRateAgentConfigured = [bool]$env:ELEVENLABS_AGENT_ID
    PhoneNumberConfigured = [bool]$env:ELEVENLABS_PHONE_NUMBER_ID
    BrowserAgentEnabled = $env:LOCAL_BROWSER_AGENT_ENABLED
    OutboundCallsEnabled = $env:OUTBOUND_CALLS_ENABLED
  }
  exit 0
}

npm run dev
