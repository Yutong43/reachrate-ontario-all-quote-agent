import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

const [
  registry,
  submissionRegistry,
  canonicalProfile,
  demoReport,
  agentConfig,
  voiceToolConfig,
  migration,
  edgeAuthMigration,
  consentMigration,
  edgeFunction,
  marketCatalogSource,
  onlineRouteAudit,
  onlineRouteAuditSource,
  extensionManifest,
  extensionRoutesSource,
  extensionContentScriptSource,
  quoteWorkspaceSource,
  agentSearchSource,
  demoFlowSource,
  handoffDialogsSource,
  extensionReadmeSource,
  readmeSource,
] =
  await Promise.all([
    readJson("data/market-registry.json"),
    readJson("data/submission-market-registry.json"),
    readJson("data/canonical-test-profile.json"),
    readJson("data/demo-run-report.json"),
    readJson(
      "tools/elevenlabs-agent-config/agent_configs/ReachRate-Quote-Handoff.json",
    ),
    readJson(
      "tools/elevenlabs-agent-config/tool_configs/record_quote_outcome.json",
    ),
    readFile(
      new URL(
        "supabase/migrations/20260809152116_init_quote_operator.sql",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "supabase/migrations/20260809161708_add_edge_persistence_auth.sql",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "supabase/migrations/20260809163853_add_transcription_consent.sql",
        root,
      ),
      "utf8",
    ),
    readFile(
      new URL("supabase/functions/quote-persistence/index.ts", root),
      "utf8",
    ),
    readFile(new URL("lib/market-catalog.ts", root), "utf8"),
    readJson("data/online-route-audit.json"),
    readFile(new URL("data/online-route-audit.json", root)),
    readJson("browser-extension/manifest.json"),
    readFile(new URL("browser-extension/routes.js", root), "utf8"),
    readFile(new URL("browser-extension/content-script.js", root), "utf8"),
    readFile(new URL("components/quote-workspace.tsx", root), "utf8"),
    readFile(new URL("components/agent-search.tsx", root), "utf8"),
    readFile(new URL("lib/demo-flow.ts", root), "utf8"),
    readFile(new URL("components/handoff-dialogs.tsx", root), "utf8"),
    readFile(new URL("browser-extension/README.md", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);

const requiredRegistryFields = [
  "registry_id",
  "last_verified_at",
  "legal_underwriter",
  "insurer_group",
  "brand_or_program",
  "distribution_type",
  "product_scope",
  "requirements",
  "source_citation",
  "distinct_rate_source_id",
];

assert.ok(Array.isArray(registry) && registry.length === 24);
for (const [index, route] of registry.entries()) {
  for (const field of requiredRegistryFields) {
    assert.ok(field in route, `Route ${index} is missing ${field}`);
  }
  assert.match(route.last_verified_at, /^\d{4}-\d{2}-\d{2}$/);
}

assert.equal(
  new Set(registry.map((route) => route.registry_id)).size,
  registry.length,
  "registry_id values must be unique",
);

const briefStatusEnum = new Set([
  "quoted_comparable",
  "quoted_non_comparable",
  "estimate_only",
  "callback_required",
  "manual_handoff",
  "ineligible",
  "affinity_restricted",
  "specialty_only",
  "duplicate_rate_source",
  "not_currently_writing",
  "blocked",
  "unreachable",
  "unresolved",
]);
const briefDistributionTypes = new Set([
  "direct",
  "agent",
  "broker",
  "aggregator",
  "affinity",
  "MGA_program",
  "mutual",
  "residual",
]);
const briefProductScopes = new Set([
  "standard_PPA",
  "nonstandard_PPA",
  "high_net_worth",
  "collector",
  "commercial_specialty",
  "unknown",
]);

assert.equal(submissionRegistry.schema_version, "1.0");
assert.match(
  submissionRegistry.snapshot_as_of,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
);
assert.equal(submissionRegistry.counts.consumer_journeys, 24);
assert.equal(submissionRegistry.counts.insurer_groups, 32);
assert.equal(submissionRegistry.counts.legal_entities, 60);
assert.equal(submissionRegistry.counts.route_level_rate_source_keys, 24);
assert.equal(submissionRegistry.counts.resolved_rate_source_identities, 7);
assert.equal(submissionRegistry.counts.provisional_rate_source_identities, 16);
assert.equal(submissionRegistry.counts.unresolved_rate_source_identities, 1);
assert.equal(submissionRegistry.consumer_journeys.length, 24);
assert.equal(submissionRegistry.insurer_groups.length, 32);
assert.equal(submissionRegistry.legal_entities.length, 60);
assert.deepEqual(
  submissionRegistry.consumer_journeys.map((route) => route.registry_id),
  registry.map((route) => route.registry_id),
  "The submission registry must contain every executable consumer journey",
);
assert.equal(
  new Set(submissionRegistry.consumer_journeys.map((route) => route.registry_id)).size,
  24,
  "Submission consumer registry IDs must be unique",
);
assert.equal(
  new Set(
    submissionRegistry.consumer_journeys.map(
      (route) => route.distinct_rate_source_id,
    ),
  ).size,
  24,
  "Unresolved intermediary routes need route-level provisional rate-source IDs",
);
assert.equal(
  new Set(submissionRegistry.insurer_groups.map((group) => group.registry_id)).size,
  32,
  "Submission insurer-group registry IDs must be unique",
);
assert.equal(
  new Set(submissionRegistry.legal_entities.map((entity) => entity.registry_id)).size,
  60,
  "Submission legal-entity registry IDs must be unique",
);
for (const route of submissionRegistry.consumer_journeys) {
  for (const field of [
    "registry_id",
    "legal_underwriter",
    "insurer_group",
    "brand_or_program",
    "distribution_type",
    "product_scope",
    "channels",
    "distinct_rate_source_id",
    "rate_source_identity_status",
    "requirements",
    "automation_notes",
    "status",
    "source_url",
    "last_verified_at",
    "evidence_artifact",
  ]) {
    assert.ok(field in route, `${route.registry_id} is missing ${field}`);
  }
  assert.ok(
    briefDistributionTypes.has(route.distribution_type),
    `${route.registry_id} has an invalid distribution_type`,
  );
  assert.ok(
    briefProductScopes.has(route.product_scope),
    `${route.registry_id} has an invalid product_scope`,
  );
  assert.ok(
    briefStatusEnum.has(route.status),
    `${route.registry_id} has a status outside the brief's enum`,
  );
  assert.ok(Array.isArray(route.channels) && route.channels.length > 0);
  assert.ok(route.distinct_rate_source_id);
  assert.ok(
    ["resolved", "provisional_pending_result", "unresolved"].includes(
      route.rate_source_identity_status,
    ),
  );
  assert.match(route.last_verified_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
}
for (const record of [
  ...submissionRegistry.insurer_groups,
  ...submissionRegistry.legal_entities,
]) {
  assert.equal(record.reference_only, true);
  assert.ok(briefStatusEnum.has(record.status));
  assert.ok(record.source_url);
  assert.match(record.last_verified_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
}

assert.equal(canonicalProfile.scenario_id, "clean-planned-toyota-corolla");
assert.equal(canonicalProfile.profile.vehicleYear, "2025");
assert.equal(canonicalProfile.profile.vehicleMake, "Toyota");
assert.equal(canonicalProfile.profile.vehicleModel, "Corolla LE");
assert.equal(canonicalProfile.profile.vehicleCondition, "new");
assert.equal(canonicalProfile.profile.vehicleRelationship, "planned");
assert.equal(canonicalProfile.profile.annualKilometres, "5000");
assert.equal(canonicalProfile.profile.commuteKilometres, "2");
assert.equal(canonicalProfile.profile.hasVin, false);
assert.equal(canonicalProfile.profile.gender, "male");
assert.equal(canonicalProfile.profile.firstName, "Demo");
assert.equal(canonicalProfile.profile.lastName, "Participant");
assert.equal(canonicalProfile.profile.postalCode, "M2N 0C1");
assert.equal(canonicalProfile.profile.firstLicensedYear, "2017");
assert.equal(canonicalProfile.profile.licensingHistory, "transferred");
assert.equal(canonicalProfile.profile.licenceOrigin, "");
assert.equal(canonicalProfile.profile.g1LicenceDate, "");
assert.equal(canonicalProfile.profile.g2LicenceDate, "");
assert.equal(canonicalProfile.profile.gLicenceDate, "");
assert.equal(canonicalProfile.profile.streetAddress, "");
assert.equal(canonicalProfile.profile.contactEmail, "");
assert.equal(canonicalProfile.profile.contactPhone, "");
assert.equal(canonicalProfile.profile.claimsLastSixYears, "0");
assert.equal(canonicalProfile.profile.convictionsLastThreeYears, "0");

const groupSection = marketCatalogSource.split("export const insurerGroupReferences")[1] ?? "";
const groupCount = [...groupSection.matchAll(/\{ id: "[^"]+", group: "/g)].length;
const legalEntityLists = [...groupSection.matchAll(/legalEntities:\s*\[([^\]]*)\]/g)];
const legalEntityCount = legalEntityLists.reduce(
  (total, match) => total + [...match[1].matchAll(/"([^"]+)"/g)].length,
  0,
);
const adapterBlock = marketCatalogSource.match(
  /export const browserAdapterRouteIds = \[([\s\S]*?)\] as const;/,
);
const browserAdapterCount = adapterBlock
  ? [...adapterBlock[1].matchAll(/"([^"]+)"/g)].length
  : 0;

assert.equal(groupCount, 32, "Appendix A must retain 32 regulatory groups");
assert.equal(legalEntityCount, 60, "Appendix A must retain 60 legal entities");
assert.equal(browserAdapterCount, 19, "The UI must match the implemented extension adapters");
assert.equal(onlineRouteAudit.route_count, 24);
assert.match(onlineRouteAudit.artifact_generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
assert.equal(onlineRouteAudit.routes.length, 24);
assert.equal(onlineRouteAudit.confirmed_price_count, 0);
assert.equal(onlineRouteAudit.verified_online_quote_entrances, 19);
assert.equal(onlineRouteAudit.usable_online_entrances_for_this_profile, 17);
assert.equal(onlineRouteAudit.deep_attempt_count, 17);
assert.equal(onlineRouteAudit.exact_human_checkpoint_count, 16);
assert.equal(
  onlineRouteAudit.routes.filter((route) => route.price_returned === true).length,
  0,
  "No official price may be claimed before a source-backed premium is captured",
);
assert.equal(
  new Set(onlineRouteAudit.routes.map((route) => route.route_id)).size,
  24,
  "Every audited route ID must be unique",
);
assert.equal(extensionManifest.manifest_version, 3);
assert.equal(extensionManifest.version, "0.5.2");
assert.ok(extensionManifest.permissions.includes("tabs"));
assert.ok(extensionManifest.permissions.includes("storage"));
assert.equal(extensionManifest.host_permissions.some((host) => host.includes("mychoice.ca")), false);
assert.ok(extensionContentScriptSource.includes("Enter result manually"));
assert.ok(extensionContentScriptSource.includes("manualEntry: true"));
assert.ok(extensionContentScriptSource.includes("focusReachRate"));
assert.ok(extensionContentScriptSource.includes("labelledCompanyMatch"));
assert.ok(extensionContentScriptSource.includes("Returned insurer required"));
assert.ok(extensionContentScriptSource.includes("quoteResultContext"));
assert.ok(extensionContentScriptSource.includes("REACHRATE_AUTOFILL"));
assert.ok(extensionRoutesSource.includes("myaviva.avivainsurance.ca/avivaquoter/bol/auto/vehicle"));
assert.ok(
  quoteWorkspaceSource.includes("The premium was added to the result card"),
  "A detected or manually entered candidate must return directly to the visible result card",
);
assert.ok(
  quoteWorkspaceSource.includes("Capture the returned insurer / legal underwriter"),
  "Intermediary quote entrances must not enter comparison without the returned carrier",
);
for (const routeId of [
  "allstate",
  "aviva",
  "squareone",
  "rates",
  "td",
  "caa",
  "desjardins",
  "belairdirect",
  "sonnet",
  "lowestrates",
  "cooperators",
  "rbc",
  "thepersonal",
  "surex",
  "thinkinsure",
  "onlia",
  "pcinsurance",
  "inova",
  "insurancehotline",
]) {
  assert.ok(extensionRoutesSource.includes(`${routeId}: {`), `Extension route ${routeId} is missing`);
}
assert.ok(demoFlowSource.includes('name: "Demo Carrier 1"'));
assert.ok(demoFlowSource.includes('name: "Demo Carrier 2"'));
assert.ok(demoFlowSource.includes('demoScenario: "spoken_price"'));
assert.ok(demoFlowSource.includes('demoScenario: "human_handoff"'));
assert.ok(demoFlowSource.includes("buildSubmissionAuditRoutes"));
assert.ok(demoFlowSource.includes('reference: "Q022763742"'));
assert.equal(
  demoFlowSource.includes('id: "demo-phone-'),
  false,
  "A real market route must not be duplicated as a second prebuilt phone card",
);
assert.ok(agentSearchSource.includes('aria-label="Phone demo lane"'));
assert.ok(agentSearchSource.includes("Move to phone demo"));
assert.ok(agentSearchSource.includes("Return to web quote"));
assert.ok(quoteWorkspaceSource.includes('preferredLane: "phone"'));
assert.equal(
  /\+1\d{10}/.test(quoteWorkspaceSource),
  false,
  "The participant's private phone number must never appear in client source",
);
assert.equal(
  handoffDialogsSource.includes("ending 5678"),
  false,
  "The submitted callback UI must not expose private phone digits",
);
assert.equal(demoReport.profile.sensitive_fields_in_report, false);
assert.equal(demoReport.schema_version, "1.0");
assert.match(demoReport.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
assert.ok(Array.isArray(demoReport.comparison.coverage_difference_summary));
assert.ok(Array.isArray(demoReport.gaps) && demoReport.gaps.length > 0);
assert.ok(Array.isArray(demoReport.errors));
assert.equal(demoReport.metrics.confirmed_price_count, 0);
const normalizedMarketOutcomes = demoReport.coverage_ledger.filter(
  (outcome) => !outcome.is_simulation,
);
const canonicalOnlineRouteAuditSource = onlineRouteAuditSource
  .toString("utf8")
  .replaceAll("\r\n", "\n");
const onlineRouteAuditHash = `sha256:${createHash("sha256")
  .update(canonicalOnlineRouteAuditSource, "utf8")
  .digest("hex")}`;
assert.ok(normalizedMarketOutcomes.length >= 2, "At least two normalized market outcomes are required");
for (const outcome of normalizedMarketOutcomes) {
  for (const field of [
    "registry_id",
    "brand_or_program",
    "legal_underwriter",
    "distinct_rate_source_id",
    "status",
    "result_type",
    "premium",
    "coverage",
    "coverage_differences",
    "next_action",
    "captured_at",
    "source_url",
    "evidence_artifact",
    "evidence_note",
    "redaction_checked",
  ]) {
    assert.ok(field in outcome, `${outcome.registry_id} is missing normalized field ${field}`);
  }
  assert.match(outcome.captured_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(outcome.redaction_checked, true);
  assert.equal(outcome.excluded_from_rankings, true);
  if (outcome.evidence_artifact.startsWith("data/online-route-audit.json")) {
    assert.equal(
      outcome.evidence_hash,
      onlineRouteAuditHash,
      `${outcome.registry_id} has a stale evidence hash`,
    );
  }
}
assert.ok(
  normalizedMarketOutcomes.some((outcome) => ["manual_handoff", "blocked", "unreachable"].includes(outcome.status)),
  "The run report must retain an evidence-backed no-quote or handoff outcome",
);
for (const row of demoReport.coverage_ledger.filter(
  (outcome) => outcome.is_simulation,
)) {
  assert.equal(row.excluded_from_rankings, true);
  assert.equal(row.status, "manual_handoff");
  assert.equal(row.premium.monthly, null);
  assert.equal(row.premium.annual, null);
}
assert.equal(
  demoReport.coverage_ledger.some((outcome) => outcome.status === "quoted"),
  false,
  "Historical rehearsal artifacts must not contain a fake quoted outcome",
);

assert.deepEqual(
  agentConfig.conversation_config.agent.prompt.tool_ids,
  [],
  "Public source must require the reproducer to attach their own webhook tool",
);
assert.equal(
  agentConfig.conversation_config.agent.prompt.built_in_tools?.end_call?.params?.system_tool_type,
  "end_call",
  "The dedicated voice agent must be able to end completed or declined calls",
);
assert.equal(
  voiceToolConfig.api_schema.url,
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/quote-persistence",
);
assert.equal(
  voiceToolConfig.api_schema.request_headers["x-elevenlabs-tool-secret"].secret_id,
  "YOUR_ELEVENLABS_SECRET_ID",
);
assert.equal(
  voiceToolConfig.api_schema.request_body_schema.properties.isSimulation
    .constant_value,
  true,
);
assert.equal(
  voiceToolConfig.api_schema.request_body_schema.properties.registryId
    .dynamic_variable,
  "demo_registry_id",
  "Each synthetic carrier must persist under its own demo registry ID",
);
assert.equal(
  voiceToolConfig.api_schema.request_body_schema.properties.outcomeStatus
    .enum.includes("manual_handoff"),
  true,
);
assert.equal(
  voiceToolConfig.api_schema.request_body_schema.properties.outcomeStatus
    .enum.includes("unreachable"),
  true,
);
assert.ok(
  agentConfig.conversation_config.agent.prompt.prompt.includes("numeric premiumAmount"),
  "The voice agent must persist a clearly spoken numeric synthetic premium",
);
assert.equal(
  "x-vercel-protection-bypass" in voiceToolConfig.api_schema.request_headers,
  false,
);
assert.equal(agentConfig.platform_settings.privacy.record_voice, false);
assert.equal(agentConfig.platform_settings.call_limits.agent_concurrency_limit, 1);
assert.equal(
  demoReport.coverage_ledger.find(
    (outcome) => outcome.registry_id === "voice_simulation_demo_agent_1",
  )?.consent_confirmed,
  true,
);

for (const heading of [
  "## Architecture and safety note",
  "## Known limitations",
  "## Pre-existing materials and third-party licences",
]) {
  assert.ok(readmeSource.includes(heading), `${heading} is missing from README`);
}
assert.ok(readmeSource.includes("ReachRate was built from scratch for this hackathon."));
assert.equal(
  readmeSource.includes("C:\\Users\\livey"),
  false,
  "README setup instructions must not depend on the participant's local path",
);
assert.equal(
  /[A-Za-z]:\\Users\\[^\\\s`]+/.test(`${readmeSource}\n${extensionReadmeSource}`),
  false,
  "Public setup instructions must not expose a participant-specific Windows path",
);

for (const table of [
  "quote_runs",
  "route_attempts",
  "quote_outcomes",
  "evidence_records",
  "voice_handoffs",
  "deletion_log",
]) {
  assert.ok(
    migration.includes(`alter table public.${table} enable row level security`),
    `${table} must enable RLS`,
  );
  assert.ok(
    migration.includes(`revoke all on table public.${table} from anon, authenticated`),
    `${table} must revoke browser roles`,
  );
}

assert.ok(edgeAuthMigration.includes("integration_secret_hashes"));
assert.ok(edgeAuthMigration.includes("enable row level security"));
assert.ok(consentMigration.includes("consent_to_transcribe"));
assert.ok(edgeFunction.includes('Deno.env.get("SUPABASE_SECRET_KEYS")'));
assert.ok(edgeFunction.includes('verify_jwt') === false);
assert.ok(edgeFunction.includes("integration_secret_hashes"));
assert.ok(edgeFunction.includes("consent_to_transcribe"));
assert.ok(edgeFunction.includes("directVoiceToolEnvelope"));
assert.ok(edgeFunction.includes('action === "list_public_demo_outcomes"'));
assert.ok(edgeFunction.includes('.eq("source_channel", "phone")'));
assert.ok(edgeFunction.includes('.eq("is_simulation", true)'));
const publicDemoReadBlock = edgeFunction
  .split('if (action === "list_public_demo_outcomes")')[1]
  ?.split('phase = "authorize"')[0] ?? "";
assert.equal(
  publicDemoReadBlock.includes("provider_conversation_id"),
  false,
  "The public demo read must not expose provider conversation IDs",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      routes: registry.length,
      submissionRegistryGroups: submissionRegistry.insurer_groups.length,
      submissionRegistryLegalEntities: submissionRegistry.legal_entities.length,
      canonicalScenario: canonicalProfile.scenario_id,
      regulatoryGroups: groupCount,
      legalEntities: legalEntityCount,
      browserAdapters: browserAdapterCount,
      onlineRouteAuditRows: onlineRouteAudit.routes.length,
      confirmedOnlinePrices: onlineRouteAudit.confirmed_price_count,
      syntheticPhoneDemoCards: 2,
      applicationRegistryRateSourceIds: new Set(
        registry.map((route) => route.distinct_rate_source_id),
      ).size,
      submissionRegistryRouteLevelKeys: new Set(
        submissionRegistry.consumer_journeys.map(
          (route) => route.distinct_rate_source_id,
        ),
      ).size,
      submissionRegistryResolvedRateSources:
        submissionRegistry.counts.resolved_rate_source_identities,
      demoRows: demoReport.coverage_ledger.length,
      evidenceHashVerified: true,
      elevenLabsTemplateRedacted: true,
      rlsTablesChecked: 6,
      edgePersistenceChecked: true,
    },
    null,
    2,
  ),
);
