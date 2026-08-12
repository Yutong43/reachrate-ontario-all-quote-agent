import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const auditPath = new URL("data/online-route-audit.json", root);
const registryPath = new URL("data/market-registry.json", root);

const routeToRegistry = {
  mychoice: "aggregator_mychoice_on",
  allstate: "direct_allstate_on",
  aviva: "direct_aviva_on",
  belairdirect: "direct_belairdirect_on",
  caa: "direct_caa_on",
  cooperators: "direct_cooperators_on",
  desjardins: "direct_desjardins_on",
  rbc: "direct_rbc_on",
  sonnet: "direct_sonnet_on",
  squareone: "direct_squareone_on",
  td: "direct_td_on",
  thepersonal: "affinity_personal_on",
  rates: "aggregator_rates_on",
  lowestrates: "aggregator_lowestrates_on",
  surex: "broker_surex_on",
  thinkinsure: "broker_thinkinsure_on",
  onlia: "broker_onlia_on",
  facility: "residual_facility_on",
  hagerty: "collector_hagerty_on",
  mutuals: "mutual_locator_on",
  pcinsurance: "broker_pcinsurance_on",
  inova: "broker_inova_on",
  insurancehotline: "aggregator_insurancehotline_on",
  scoop: "broker_scoop_on",
};

const [audit, registry] = await Promise.all([
  readFile(auditPath, "utf8").then(JSON.parse),
  readFile(registryPath, "utf8").then(JSON.parse),
]);

const auditByRegistryId = new Map(
  audit.routes.map((route) => [routeToRegistry[route.route_id], route]),
);

const synced = registry.map((record) => {
  const route = auditByRegistryId.get(record.registry_id);
  if (!route) return record;
  return {
    ...record,
    last_verified_at: audit.audited_at,
    quote_url: route.official_url,
    public_phone_route: route.public_phone ?? record.public_phone_route ?? null,
    terms_or_automation_notes: `${route.test_depth} Next action: ${route.user_action_required}`,
    status: route.audit_status,
    evidence_url: route.official_url,
    source_citation: `Official route and supervised browser verification, ${audit.audited_at}.`,
  };
});

await writeFile(registryPath, `${JSON.stringify(synced, null, 2)}\n`, "utf8");
console.log(`Synced ${auditByRegistryId.size} route-audit records into market-registry.json.`);
