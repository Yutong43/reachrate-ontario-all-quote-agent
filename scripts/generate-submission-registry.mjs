import { readFile, writeFile } from "node:fs/promises";

import {
  executableRoutes,
  insurerGroupReferences,
} from "../lib/market-catalog.ts";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

const [routeRegistry, routeAudit, runReport] = await Promise.all([
  readJson("data/market-registry.json"),
  readJson("data/online-route-audit.json"),
  readJson("data/demo-run-report.json"),
]);

const auditByRouteId = new Map(
  routeAudit.routes.map((route) => [route.route_id, route]),
);
const routeIdByRegistryId = new Map(
  executableRoutes.map((route) => [route.registryId, route.id]),
);

const statusByAuditStatus = {
  terms_restricted: "blocked",
  transient_network_error: "unreachable",
  checkpoint_reached: "manual_handoff",
  access_checkpoint_reached: "blocked",
  engine_verified: "unresolved",
  profile_blocked: "ineligible",
  intermediary_required: "manual_handoff",
  not_applicable: "specialty_only",
  discovery_only: "unresolved",
  duplicate_engine_verified: "unresolved",
  route_unavailable: "unresolved",
};

const groupStatusByAccessClass = {
  direct_online: "unresolved",
  broker_panel: "manual_handoff",
  mutual_local: "manual_handoff",
  high_net_worth: "specialty_only",
  residual: "manual_handoff",
  commercial_specialty: "specialty_only",
};

const groupChannelByAccessClass = {
  direct_online: "web",
  broker_panel: "broker",
  mutual_local: "local_agent",
  high_net_worth: "broker",
  residual: "licensed_intermediary",
  commercial_specialty: "specialty_broker",
};

function normalizedStatus(route) {
  if (route.registry_id === "affinity_personal_on") {
    return "affinity_restricted";
  }
  return statusByAuditStatus[route.status] ?? "unresolved";
}

function normalizedDistributionType(distributionType) {
  return distributionType === "exclusive_agent" ? "agent" : distributionType;
}

function normalizedProductScope(productScope) {
  return productScope === "affinity" ? "standard_PPA" : productScope;
}

function channelsForRoute(route) {
  const channels = [];
  if (route.quote_url) channels.push("web");
  if (route.public_phone_route) channels.push("phone");
  if (["broker", "residual", "MGA_program"].includes(route.distribution_type)) {
    channels.push("licensed_intermediary");
  }
  if (route.distribution_type === "mutual") channels.push("local_agent");
  return [...new Set(channels)];
}

function distinctRateSourceId(route) {
  if (route.distinct_rate_source_id !== "returned_underwriter_required") {
    return route.distinct_rate_source_id;
  }
  return `${route.registry_id}_returned_underwriter_required`;
}

function rateSourceIdentityStatus(route) {
  if (route.registry_id === "broker_scoop_on") return "unresolved";
  if (
    /(returned|verify|required)/.test(route.distinct_rate_source_id) ||
    /must be captured|specific mutual|or returned/i.test(route.legal_underwriter)
  ) {
    return "provisional_pending_result";
  }
  return "resolved";
}

const consumerJourneys = routeRegistry.map((route) => {
  const routeId = routeIdByRegistryId.get(route.registry_id);
  const audit = routeId ? auditByRouteId.get(routeId) : undefined;

  return {
    registry_id: route.registry_id,
    brand_or_program: route.brand_or_program,
    legal_underwriter: route.legal_underwriter,
    insurer_group: route.insurer_group,
    licensed_intermediary: route.licensed_intermediary,
    distribution_type: normalizedDistributionType(route.distribution_type),
    product_scope: normalizedProductScope(route.product_scope),
    channels: channelsForRoute(route),
    distinct_rate_source_id: distinctRateSourceId(route),
    rate_source_identity_status: rateSourceIdentityStatus(route),
    quote_url: route.quote_url,
    public_phone_route: route.public_phone_route,
    requirements: route.requirements,
    automation_notes: route.terms_or_automation_notes,
    status: normalizedStatus(route),
    audit_status: route.status,
    status_reason: audit?.test_depth ?? route.terms_or_automation_notes,
    next_action: audit?.user_action_required ?? null,
    source_url: route.evidence_url ?? route.quote_url,
    source_citation: route.source_citation,
    last_verified_at: routeAudit.artifact_generated_at,
    evidence_artifact: routeId
      ? `data/online-route-audit.json#route_id=${routeId}`
      : null,
  };
});

const insurerGroups = insurerGroupReferences.map((group) => ({
  registry_id: `regulatory_group_${group.id}`,
  insurer_group: group.group,
  legal_entities: group.legalEntities,
  consumer_route_ids: group.routeIds,
  access_class: group.accessClass,
  channel: groupChannelByAccessClass[group.accessClass],
  status: groupStatusByAccessClass[group.accessClass],
  distinct_rate_source_id: null,
  source_url: group.officialUrl,
  last_verified_at: "2026-08-06T00:00:00Z",
  access_summary: group.accessSummary,
  validation_note: group.validationNote,
  current_market_note: group.currentMarketNote ?? null,
  reference_only: true,
}));

const legalEntities = insurerGroupReferences.flatMap((group) =>
  group.legalEntities.map((legalUnderwriter, index) => ({
    registry_id: `regulatory_entity_${group.id}_${String(index + 1).padStart(2, "0")}`,
    legal_underwriter: legalUnderwriter,
    insurer_group: group.group,
    consumer_route_ids: group.routeIds,
    access_class: group.accessClass,
    channel: groupChannelByAccessClass[group.accessClass],
    status: groupStatusByAccessClass[group.accessClass],
    distinct_rate_source_id: null,
    source_url: group.officialUrl,
    last_verified_at: "2026-08-06T00:00:00Z",
    validation_note: group.validationNote,
    reference_only: true,
  })),
);

const artifact = {
  schema_version: "1.0",
  snapshot_as_of: runReport.generated_at,
  source_audit_generated_at: routeAudit.artifact_generated_at,
  scope_note:
    "Consumer journeys are executable shopping paths. Insurer groups and legal entities are separate regulatory reference layers and do not each represent a distinct consumer quote.",
  counts: {
    consumer_journeys: consumerJourneys.length,
    insurer_groups: insurerGroups.length,
    legal_entities: legalEntities.length,
    route_level_rate_source_keys: new Set(
      consumerJourneys.map((route) => route.distinct_rate_source_id),
    ).size,
    resolved_rate_source_identities: consumerJourneys.filter(
      (route) => route.rate_source_identity_status === "resolved",
    ).length,
    provisional_rate_source_identities: consumerJourneys.filter(
      (route) => route.rate_source_identity_status === "provisional_pending_result",
    ).length,
    unresolved_rate_source_identities: consumerJourneys.filter(
      (route) => route.rate_source_identity_status === "unresolved",
    ).length,
  },
  consumer_journeys: consumerJourneys,
  insurer_groups: insurerGroups,
  legal_entities: legalEntities,
};

await writeFile(
  new URL("data/submission-market-registry.json", root),
  `${JSON.stringify(artifact, null, 2)}\n`,
);

console.log(JSON.stringify(artifact.counts, null, 2));
