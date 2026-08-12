export type RouteRole =
  | "direct_insurer"
  | "direct_distributor"
  | "exclusive_agent"
  | "licensed_broker"
  | "comparison_platform"
  | "affinity"
  | "specialty"
  | "market_locator"
  | "residual";

export type ResultSemantics =
  | "quote"
  | "estimate"
  | "returned_insurer_required"
  | "discovery";

export type AutomationMode =
  | "browser"
  | "human_checkpoint"
  | "callback"
  | "terms_restricted"
  | "discovery";

export type MarketAccessClass =
  | "direct_online"
  | "broker_panel"
  | "mutual_local"
  | "high_net_worth"
  | "residual"
  | "commercial_specialty";

export type ExecutableRouteDefinition = {
  id: string;
  registryId: string;
  name: string;
  role: RouteRole;
  insurerGroup: string | null;
  legalUnderwriter: string | null;
  officialUrl: string;
  sourceUrl: string;
  logoDomain: string;
  resultSemantics: ResultSemantics;
  automationMode: AutomationMode;
  defaultSelected: boolean;
  priority: number;
  supportsWithoutVin: boolean | "unknown";
  requiresLicenceNumber: boolean | "unknown";
  fieldsPlanned: number;
  summary: string;
  evidenceNote: string;
};

export const routeRoleLabels: Record<RouteRole, string> = {
  direct_insurer: "Insurance company · direct quote",
  direct_distributor: "Distributor / agency · insurer underwrites",
  exclusive_agent: "Insurance agent · insurer underwrites",
  licensed_broker: "Licensed broker · compares represented insurers",
  comparison_platform: "Comparison platform · returns partner insurer",
  affinity: "Affinity program · eligibility required",
  specialty: "Specialty program · limited eligibility",
  market_locator: "Locator only · choose a specific insurer next",
  residual: "Residual market · licensed intermediary required",
};

export function routeCanReturnPrice(route: ExecutableRouteDefinition) {
  return route.resultSemantics !== "discovery" && route.automationMode !== "terms_restricted";
}

export function routeIsProfileSuitable(route: ExecutableRouteDefinition) {
  return routeCanReturnPrice(route) && route.supportsWithoutVin !== false;
}

export const executableRoutes: ExecutableRouteDefinition[] = [
  {
    id: "allstate",
    registryId: "direct_allstate_on",
    name: "Allstate",
    role: "direct_insurer",
    insurerGroup: "Allstate",
    legalUnderwriter: "Allstate Insurance Company of Canada",
    officialUrl: "https://www.allstate.ca/car-insurance/ontario",
    sourceUrl: "https://www.allstate.ca/car-insurance/ontario",
    logoDomain: "allstate.ca",
    resultSemantics: "quote",
    automationMode: "browser",
    defaultSelected: false,
    priority: 1,
    supportsWithoutVin: true,
    requiresLicenceNumber: false,
    fieldsPlanned: 30,
    summary: "Quick Quote accepts the no-VIN profile, but the latest supervised submission returned an official HTTP/2 loading error before the questionnaire.",
    evidenceNote: "The extension starts on Allstate's current Quick Quote intake and records either the live network failure or a later declaration checkpoint; it never claims a price from either.",
  },
  {
    id: "aviva",
    registryId: "direct_aviva_on",
    name: "Aviva Direct",
    role: "direct_distributor",
    insurerGroup: "Aviva",
    legalUnderwriter: "S&Y Insurance Company",
    officialUrl: "https://myaviva.avivainsurance.ca/avivaquoter/bol/auto/vehicle?lang=en",
    sourceUrl: "https://www.aviva.ca/en/direct/",
    logoDomain: "aviva.ca",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 2,
    supportsWithoutVin: true,
    requiresLicenceNumber: false,
    fieldsPlanned: 32,
    summary: "Opens the official Aviva Auto Insurance quote form at the postal-code and vehicle-details step. ReachRate can fill reviewed fields, but the participant must handle any declaration or out-of-province licence validation.",
    evidenceNote: "The participant must personally review declarations and any driving-history validation. Official disclosure identifies S&Y Insurance Company as the Ontario underwriter.",
  },
  {
    id: "squareone",
    registryId: "direct_squareone_on",
    name: "Square One",
    role: "direct_distributor",
    insurerGroup: "Zurich",
    legalUnderwriter: "Zurich Insurance Company Ltd (Canadian Branch)",
    officialUrl: "https://www.squareone.ca/car",
    sourceUrl: "https://www.squareone.ca/car",
    logoDomain: "squareone.ca",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 3,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 31,
    summary: "Five-minute online quote sold by Square One and underwritten by Zurich. The live form requires a full residential/garaging address before vehicle questions.",
    evidenceNote: "The participant must select the real official address suggestion; Square One and Zurich remain separate identities.",
  },
  {
    id: "rates",
    registryId: "aggregator_rates_on",
    name: "Rates.ca",
    role: "comparison_platform",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://rates.ca/insurance-quotes/auto/ontario",
    sourceUrl: "https://rates.ca/insurance-quotes/auto/ontario",
    logoDomain: "rates.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 4,
    supportsWithoutVin: true,
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 35,
    summary: "The full web intake reaches a final email, phone and quote-follow-up consent gate. Rates.ca is never shown as the underwriter.",
    evidenceNote: "The participant chooses contact consent; every returned insurer is normalized separately and deduplicated against the shared RATESDOTCA engine.",
  },
  {
    id: "td",
    registryId: "direct_td_on",
    name: "TD Insurance",
    role: "direct_distributor",
    insurerGroup: "TD",
    legalUnderwriter: null,
    officialUrl: "https://www.tdinsurance.com/products-services/auto-car-insurance",
    sourceUrl: "https://www.tdinsurance.com/products-services/auto-car-insurance/coverage",
    logoDomain: "tdinsurance.com",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 5,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 34,
    summary: "The supervised form reached the full residential-address step after vehicle, coverage and driver questions. Gender X routes to TD phone support.",
    evidenceNote: "The tested path disclosed TD General Insurance Company; retain the legal entity shown on any eventual result.",
  },
  {
    id: "caa",
    registryId: "direct_caa_on",
    name: "CAA Insurance",
    role: "direct_insurer",
    insurerGroup: "CAA",
    legalUnderwriter: "CAA Insurance Company",
    officialUrl: "https://www.caasco.com/insurance/auto",
    sourceUrl: "https://www.caasco.com/insurance/auto",
    logoDomain: "caasco.com",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 6,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: true,
    fieldsPlanned: 34,
    summary: "The first live page requires full address, effective date, risk declarations and privacy/terms acceptance. Membership remains optional.",
    evidenceNote: "The participant must personally accept terms and supply any later licence lookup; membership affects discounts, not basic eligibility.",
  },
  {
    id: "desjardins",
    registryId: "direct_desjardins_on",
    name: "Desjardins Insurance",
    role: "exclusive_agent",
    insurerGroup: "Desjardins",
    legalUnderwriter: null,
    officialUrl: "https://www.desjardins.com/en/insurance/auto.html",
    sourceUrl: "https://www.desjardins.com/en/insurance/auto.html",
    logoDomain: "desjardins.com",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 7,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 34,
    summary: "The Ontario quote application exposed only a reCAPTCHA/access shell in the supervised browser, so it is a human-verification route.",
    evidenceNote: "No CAPTCHA is bypassed. The returned Certas legal entity must still be recorded from evidence.",
  },
  {
    id: "belairdirect",
    registryId: "direct_belairdirect_on",
    name: "belairdirect",
    role: "direct_insurer",
    insurerGroup: "Intact",
    legalUnderwriter: "Belair Insurance Company Inc.",
    officialUrl: "https://www.belairdirect.com/en/car-insurance/online-quote.html",
    sourceUrl: "https://www.belairdirect.com/en/car-insurance.html",
    logoDomain: "belairdirect.com",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 8,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 34,
    summary: "Direct Intact-group brand. Stop at any Human Verification page and retain the exact blocker.",
    evidenceNote: "Belair Insurance Company Inc. is the legal entity in the regulatory seed.",
  },
  {
    id: "sonnet",
    registryId: "direct_sonnet_on",
    name: "Sonnet",
    role: "direct_insurer",
    insurerGroup: "Definity",
    legalUnderwriter: "Sonnet Insurance Company",
    officialUrl: "https://www.sonnet.ca/auto-insurance",
    sourceUrl: "https://www.sonnet.ca/faqs/quoting/how-do-you-get-car-insurance-in-canada",
    logoDomain: "sonnet.ca",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 9,
    supportsWithoutVin: false,
    requiresLicenceNumber: true,
    fieldsPlanned: 30,
    summary: "Fully online direct insurer, but its official quote checklist requires both a VIN and driver's licence number.",
    evidenceNote: "A no-VIN planned-vehicle profile must stop as an evidence-backed credential blocker.",
  },
  {
    id: "lowestrates",
    registryId: "aggregator_lowestrates_on",
    name: "LowestRates.ca",
    role: "comparison_platform",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.lowestrates.ca/insurance/auto/ontario",
    sourceUrl: "https://www.lowestrates.ca/insurance/auto",
    logoDomain: "lowestrates.ca",
    resultSemantics: "estimate",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 10,
    supportsWithoutVin: true,
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 35,
    summary: "The full 2025 Corolla flow reached the final email, phone and follow-up-consent gate; no premium appears before that user choice.",
    evidenceNote: "The shared RATESDOTCA engine must be deduplicated against Rates.ca and InsuranceHotline; any displayed number remains an estimate.",
  },
  {
    id: "cooperators",
    registryId: "direct_cooperators_on",
    name: "Co-operators",
    role: "exclusive_agent",
    insurerGroup: "Co-op",
    legalUnderwriter: "Co-operators General Insurance Company",
    officialUrl: "https://quoting.cooperators.ca/quote/IRAuto_CG?lang=en",
    sourceUrl: "https://www.cooperators.ca/en/insurance/auto",
    logoDomain: "cooperators.ca",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 11,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 32,
    summary: "The current IRAuto form requires vehicle year, full address, start date and an explicit privacy-collection agreement on its first page.",
    evidenceNote: "The participant supplies the address and consent. CUMIS or COSECO are not counted unless returned evidence proves a distinct program.",
  },
  {
    id: "rbc",
    registryId: "direct_rbc_on",
    name: "RBC Insurance",
    role: "affinity",
    insurerGroup: "Aviva",
    legalUnderwriter: null,
    officialUrl: "https://www1.myrbcsso.rbcinsurance.com/ada/quoter?productType=auto&campaignID=E4APPON&lang=EN",
    sourceUrl: "https://www.rbcinsurance.com/en-ca/auto-car-insurance/",
    logoDomain: "rbcinsurance.com",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 12,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 32,
    summary: "Aviva-distributed affinity route. Count separately only when evidence proves a distinct program or rate source.",
    evidenceNote: "The returned Aviva legal entity and program identity must be captured from the quote.",
  },
  {
    id: "thepersonal",
    registryId: "affinity_personal_on",
    name: "The Personal",
    role: "affinity",
    insurerGroup: "Desjardins",
    legalUnderwriter: "The Personal Insurance Company",
    officialUrl: "https://www.thepersonal.com/insurance/auto-insurance.html",
    sourceUrl: "https://www.thepersonal.com/insurance/auto-insurance.html",
    logoDomain: "thepersonal.com",
    resultSemantics: "quote",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 13,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 32,
    summary: "Group-affinity route. A valid employer, professional or alumni relationship may be required.",
    evidenceNote: "Eligibility and the legal entity must be retained with the result.",
  },
  {
    id: "surex",
    registryId: "broker_surex_on",
    name: "Surex",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.surex.com/insurance/auto-car",
    sourceUrl: "https://www.surex.com/insurance/auto-car",
    logoDomain: "surex.com",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 14,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 24,
    summary: "A live quote ID and vehicle page were reached, but the route requires the full parking/garaging address before continuing.",
    evidenceNote: "The extension can prefill approved fields; the participant selects the real address. Surex is never the underwriter.",
  },
  {
    id: "thinkinsure",
    registryId: "broker_thinkinsure_on",
    name: "ThinkInsure",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.thinkinsure.ca/car-insurance/",
    sourceUrl: "https://www.thinkinsure.ca/car-insurance/",
    logoDomain: "thinkinsure.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 15,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 24,
    summary: "The live intake requires policy date, legal name, email, phone and reCAPTCHA before vehicle questions.",
    evidenceNote: "The participant controls contact and CAPTCHA. ThinkInsure never replaces the returned legal underwriter.",
  },
  {
    id: "onlia",
    registryId: "broker_onlia_on",
    name: "Onlia",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.onlia.ca/car-insurance",
    sourceUrl: "https://www.onlia.ca/faq-getting-auto-insurance",
    logoDomain: "onlia.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 16,
    supportsWithoutVin: true,
    requiresLicenceNumber: true,
    fieldsPlanned: 34,
    summary: "The first live page requires legal name, full address, policy date, Ontario licence number and terms acceptance. Planned vehicles are supported.",
    evidenceNote: "Official record lookup and terms remain human checkpoints; capture the returned carrier rather than the Onlia brand.",
  },
  {
    id: "pcinsurance",
    registryId: "broker_pcinsurance_on",
    name: "PC Insurance",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://quote.pcinsurance.ca/pci/quoter",
    sourceUrl: "https://www.pcinsurance.ca/en/location/ontario/auto-insurance/",
    logoDomain: "pcinsurance.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: true,
    priority: 17,
    supportsWithoutVin: true,
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 34,
    summary: "The supervised route reached reference Q022764054 and an ownership/registration declaration that conflicts with the planned-vehicle profile.",
    evidenceNote: "Do not attest falsely. PC Insurance is the distributor; the tested route disclosed Aviva General Insurance Company.",
  },
  {
    id: "inova",
    registryId: "broker_inova_on",
    name: "Inova",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://offers.inovainc.ca/",
    sourceUrl: "https://www.inovainc.ca/ontario/car-insurance/",
    logoDomain: "inovainc.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 18,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 34,
    summary: "The current auto form requires email, phone and a disclosure-attestation checkbox before the quote starts; licence is optional at this step.",
    evidenceNote: "The participant controls contact and disclosure. Results must preserve the returned carrier, not Inova's partner logos.",
  },
  {
    id: "insurancehotline",
    registryId: "aggregator_insurancehotline_on",
    name: "InsuranceHotline.com",
    role: "comparison_platform",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.insurancehotline.com/car-insurance-quotes",
    sourceUrl: "https://www.insurancehotline.com/car-insurance-quotes",
    logoDomain: "insurancehotline.com",
    resultSemantics: "estimate",
    automationMode: "human_checkpoint",
    defaultSelected: false,
    priority: 19,
    supportsWithoutVin: true,
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 35,
    summary: "The live route uses the same RATESDOTCA Vehicle / Driver / Discount engine as LowestRates and ends at the same contact-consent gate.",
    evidenceNote: "Do not submit duplicate lead forms or count the brand as a distinct rate source; normalize returned insurers once.",
  },
  {
    id: "mychoice",
    registryId: "aggregator_mychoice_on",
    name: "MyChoice",
    role: "comparison_platform",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://www.mychoice.ca/insurance/car/",
    sourceUrl: "https://www.mychoice.ca/terms-of-use/",
    logoDomain: "mychoice.ca",
    resultSemantics: "returned_insurer_required",
    automationMode: "terms_restricted",
    defaultSelected: false,
    priority: 20,
    supportsWithoutVin: true,
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 0,
    summary: "Comparison and referral platform—not an insurer. Its public terms prohibit robot or automated-device access.",
    evidenceNote: "Kept in the market map and available for a permitted manual/reference handoff, but excluded from Auto Run.",
  },
  {
    id: "scoop",
    registryId: "broker_scoop_on",
    name: "Scoop Insurance",
    role: "licensed_broker",
    insurerGroup: null,
    legalUnderwriter: null,
    officialUrl: "https://scoopinsurance.ca/",
    sourceUrl: "https://scoopinsurance.ca/",
    logoDomain: "scoopinsurance.ca",
    resultSemantics: "discovery",
    automationMode: "discovery",
    defaultSelected: false,
    priority: 21,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 0,
    summary: "The previously cited auto-quote page is no longer available. Keep Scoop as a stale Rates.ca Group route until a current quote entrance is verified.",
    evidenceNote: "No price-capable Scoop journey is claimed from a missing page or footer logo.",
  },
  {
    id: "mutuals",
    registryId: "mutual_locator_on",
    name: "Ontario Mutuals locator",
    role: "market_locator",
    insurerGroup: "FMRe / Ontario Mutuals",
    legalUnderwriter: null,
    officialUrl: "https://www.ontariomutuals.ca/find-a-mutual/",
    sourceUrl: "https://www.ontariomutuals.ca/find-a-mutual/",
    logoDomain: "ontariomutuals.ca",
    resultSemantics: "discovery",
    automationMode: "discovery",
    defaultSelected: false,
    priority: 22,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: "unknown",
    fieldsPlanned: 6,
    summary: "Locator route for territory-specific mutual insurers; a specific mutual must be identified before a rate can count.",
    evidenceNote: "The locator is discovery evidence, not itself an insurance quote.",
  },
  {
    id: "hagerty",
    registryId: "collector_hagerty_on",
    name: "Hagerty collector program",
    role: "specialty",
    insurerGroup: "Aviva",
    legalUnderwriter: null,
    officialUrl: "https://www.hagerty.ca/insurance/classic-car-insurance",
    sourceUrl: "https://www.hagerty.ca/insurance/classic-car-insurance",
    logoDomain: "hagerty.ca",
    resultSemantics: "discovery",
    automationMode: "discovery",
    defaultSelected: false,
    priority: 23,
    supportsWithoutVin: false,
    requiresLicenceNumber: true,
    fieldsPlanned: 0,
    summary: "Collector-vehicle specialty route. It is not applicable to the standard 2025 Toyota Corolla daily-driver test profile.",
    evidenceNote: "Do not use a collector program to pad ordinary personal-auto market completion.",
  },
  {
    id: "facility",
    registryId: "residual_facility_on",
    name: "Facility Association",
    role: "residual",
    insurerGroup: "FA",
    legalUnderwriter: "Facility Association",
    officialUrl: "https://facilityassociation.com/",
    sourceUrl: "https://facilityassociation.com/",
    logoDomain: "facilityassociation.com",
    resultSemantics: "discovery",
    automationMode: "callback",
    defaultSelected: false,
    priority: 24,
    supportsWithoutVin: "unknown",
    requiresLicenceNumber: true,
    fieldsPlanned: 10,
    summary: "Residual market of last resort, accessed through a licensed intermediary rather than a normal direct quote form.",
    evidenceNote: "Never present Facility Association as a mainstream direct-to-consumer quote route.",
  },
];

// The legacy standalone Playwright worker remains as a local fallback. The
// extension is the primary supervised browser lane because it preserves the
// user's real Chrome/Brave tab and can pause/resume around human checkpoints.
export const standaloneWorkerRouteIds = [
  "allstate",
  "aviva",
  "squareone",
  "rates",
  "td",
  "desjardins",
  "lowestrates",
] as const;

export const browserAdapterRouteIds = [
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
] as const;

export function hasBrowserAdapter(routeId: string) {
  return browserAdapterRouteIds.some((id) => id === routeId);
}

export function hasStandaloneWorkerAdapter(routeId: string) {
  return standaloneWorkerRouteIds.some((id) => id === routeId);
}

export type InsurerGroupReference = {
  id: string;
  group: string;
  legalEntities: string[];
  officialUrl: string;
  logoDomain: string;
  routeIds: string[];
  accessClass: MarketAccessClass;
  accessSummary: string;
  currentMarketNote?: string;
  validationNote: string;
};

export const insurerGroupReferences: InsurerGroupReference[] = [
  { id: "aig", group: "AIG", legalEntities: ["AIG Insurance Company of Canada"], officialUrl: "https://www.aig.ca/", logoDomain: "aig.ca", routeIds: [], accessClass: "commercial_specialty", accessSummary: "No normal Ontario personal-auto shopping path. Treat as out of scope for this clean PPA profile.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "allstate", group: "Allstate", legalEntities: ["Allstate Insurance Company of Canada", "Esurance Insurance Company of Canada", "Pafco Insurance Company", "Pembridge Insurance Company"], officialUrl: "https://www.allstate.ca/", logoDomain: "allstate.ca", routeIds: ["allstate", "rates", "lowestrates", "surex"], accessClass: "direct_online", accessSummary: "Direct web quote is possible; Pafco and Pembridge are broker-panel candidates. A returned premium is not guaranteed.", validationNote: "Allstate direct; Pafco and Pembridge are broker-distributed." },
  { id: "aviva", group: "Aviva", legalEntities: ["Aviva General Insurance Company", "Aviva Insurance Company of Canada", "S&Y Insurance Company", "Scottish & York Insurance Co. Limited", "Traders General Insurance Company"], officialUrl: "https://www.aviva.ca/", logoDomain: "aviva.ca", routeIds: ["aviva", "rates", "rbc", "surex", "thinkinsure"], accessClass: "direct_online", accessSummary: "Aviva Direct can quote online without a VIN at the quote stage; RBC and broker programs are separate rate sources.", validationNote: "Direct, RBC, broker and program routes require deduplication." },
  { id: "beneva", group: "Beneva", legalEntities: ["Unica Insurance Inc."], officialUrl: "https://www.beneva.ca/", logoDomain: "beneva.ca", routeIds: ["rates", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Unica is broker-distributed in Ontario. A broker panel or advisor must return the actual carrier and premium.", validationNote: "Broker route." },
  { id: "caa", group: "CAA", legalEntities: ["CAA Insurance Company", "Echelon Insurance"], officialUrl: "https://www.caainsurancecompany.ca/", logoDomain: "caainsurancecompany.ca", routeIds: ["caa", "rates", "lowestrates", "surex", "thinkinsure"], accessClass: "direct_online", accessSummary: "CAA has an online quote path but its checklist includes a driver licence number; Echelon is a broker/non-standard path.", validationNote: "CAA direct; Echelon broker/non-standard." },
  { id: "chubb", group: "Chubb", legalEntities: ["Chubb Insurance Company of Canada"], officialUrl: "https://www.chubb.com/ca-en/", logoDomain: "chubb.com", routeIds: [], accessClass: "high_net_worth", accessSummary: "Personal auto exists, but quoting is through an appointed broker and is aimed at high-net-worth households.", validationNote: "High-net-worth or specialty broker." },
  { id: "coop", group: "Co-op", legalEntities: ["COSECO Insurance Company", "CUMIS General Insurance Company", "Co-operators General Insurance Company", "The Sovereign General Insurance Company"], officialUrl: "https://www.cooperators.ca/", logoDomain: "cooperators.ca", routeIds: ["cooperators"], accessClass: "direct_online", accessSummary: "Co-operators advertises online quote and purchase. Affinity entities still require returned-program validation.", validationNote: "Co-operators web/agent; affinity and specialty entities need validation." },
  { id: "commonwell", group: "Commonwell", legalEntities: ["The Commonwell Mutual Insurance Group"], officialUrl: "https://thecommonwell.ca/", logoDomain: "thecommonwell.ca", routeIds: ["mutuals", "thinkinsure"], accessClass: "mutual_local", accessSummary: "Use a local broker/agent or a panel that explicitly returns Commonwell; there is no central consumer quote engine to assume.", validationNote: "Mutual and broker/agent route." },
  { id: "continental", group: "Continental", legalEntities: ["Continental Casualty Company"], officialUrl: "https://www.cnacanada.ca/", logoDomain: "cnacanada.ca", routeIds: [], accessClass: "commercial_specialty", accessSummary: "CNA's public Canadian auto product is commercial auto, not a standard personal-auto quote path.", validationNote: "CNA specialty/commercial route; validate personal-auto relevance." },
  { id: "definity", group: "Definity", legalEntities: ["Definity Insurance Company", "Sonnet Insurance Company"], officialUrl: "https://www.definityfinancial.com/", logoDomain: "definityfinancial.com", routeIds: ["sonnet", "rates", "lowestrates", "surex"], accessClass: "direct_online", accessSummary: "Sonnet is direct online but requires both VIN and driver licence number. Broker businesses may surface through comparison panels.", currentMarketNote: "Definity completed its acquisition of Travelers Canada's personal insurance business on January 2, 2026.", validationNote: "Economical/Definity broker programs and Sonnet direct." },
  { id: "desjardins", group: "Desjardins", legalEntities: ["Certas Direct Insurance Company", "Certas Home and Auto Insurance Company", "The Personal Insurance Company"], officialUrl: "https://www.desjardins.com/en/insurance/auto.html", logoDomain: "desjardins.com", routeIds: ["desjardins", "thepersonal"], accessClass: "direct_online", accessSummary: "Desjardins offers an online quote; The Personal is an affinity route that needs an eligible employer or organization.", validationNote: "Desjardins web/agent; The Personal is affinity-restricted." },
  { id: "economical", group: "Economical", legalEntities: ["Economical Mutual Insurance Company"], officialUrl: "https://www.economical.com/en/", logoDomain: "economical.com", routeIds: ["rates", "lowestrates", "surex", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Broker-distributed. A comparison form can test the market, but the returned legal entity and final broker verification must be recorded.", validationNote: "Broker route; map the current legal entity/program." },
  { id: "fa", group: "FA", legalEntities: ["Facility Association"], officialUrl: "https://facilityassociation.com/", logoDomain: "facilityassociation.com", routeIds: ["facility"], accessClass: "residual", accessSummary: "Not a normal shopping quote. A licensed broker uses the residual market only when ordinary insurers will not place the risk.", validationNote: "Residual market through a licensed intermediary." },
  { id: "fmre", group: "FMRe", legalEntities: ["Farm Mutual Reinsurance Plan Inc. (on behalf of Ontario Mutuals)"], officialUrl: "https://www.farmmutualre.com/", logoDomain: "farmmutualre.com", routeIds: ["mutuals"], accessClass: "mutual_local", accessSummary: "The Ontario Mutuals locator identifies a territory-specific mutual; the locator itself does not return a premium.", validationNote: "Use the Ontario Mutuals locator and identify the specific mutual." },
  { id: "gore", group: "Gore", legalEntities: ["Gore Mutual Insurance Company"], officialUrl: "https://www.goremutual.ca/", logoDomain: "goremutual.ca", routeIds: ["rates", "lowestrates", "surex", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Broker-distributed personal auto. A panel may return Gore, but it cannot be forced for every profile.", currentMarketNote: "Gore merged with Beneva on January 1, 2026; its legal name is now Gore Insurance Company while the seed retains the prior name.", validationNote: "Broker route." },
  { id: "hartford", group: "Hartford", legalEntities: ["Hartford Fire Insurance Company"], officialUrl: "https://www.thehartford.com/", logoDomain: "thehartford.com", routeIds: [], accessClass: "commercial_specialty", accessSummary: "No verified standard Ontario personal-auto route. Do not count its commercial programs as a missing consumer quote.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "heartland", group: "Heartland", legalEntities: ["Heartland Farm Mutual Inc."], officialUrl: "https://www.heartlandmutualinsurance.com/", logoDomain: "heartlandmutualinsurance.com", routeIds: ["mutuals"], accessClass: "mutual_local", accessSummary: "Territory and appetite must be checked with a local mutual agent or broker before a quote can exist.", validationNote: "Mutual/local agent or broker." },
  { id: "intact", group: "Intact", legalEntities: ["Belair Insurance Company Inc.", "The Guarantee Company of North America", "Intact Insurance Company", "Jevco Insurance Company", "Novex Insurance Company", "Royal & SunAlliance Insurance Company of Canada", "Unifund Assurance Company", "Western Assurance Company"], officialUrl: "https://www.intact.ca/on/en/personal-insurance/vehicle/car.html", logoDomain: "intact.ca", routeIds: ["belairdirect", "rates", "surex", "thinkinsure"], accessClass: "direct_online", accessSummary: "belairdirect is the direct web route; Intact and Jevco are broker routes, and Jevco commonly handles non-standard risk.", validationNote: "belairdirect is direct; Intact and Jevco are broker routes." },
  { id: "liberty", group: "Liberty", legalEntities: ["Liberty Mutual Insurance Company"], officialUrl: "https://www.libertymutualcanada.com/", logoDomain: "libertymutualcanada.com", routeIds: [], accessClass: "commercial_specialty", accessSummary: "Liberty Mutual Canada's public auto appetite is commercial and generally excludes stand-alone small auto accounts.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "northbridge", group: "Northbridge", legalEntities: ["Federated Insurance Company of Canada", "Northbridge General Insurance Corporation", "Verassure Insurance Company", "Zenith Insurance Company"], officialUrl: "https://www.northbridgeinsurance.ca/", logoDomain: "northbridgeinsurance.ca", routeIds: ["rates", "lowestrates", "surex"], accessClass: "broker_panel", accessSummary: "Northbridge/Zenith are broker-panel candidates. A returned quote must identify the exact underwriting entity.", validationNote: "Northbridge and Zenith broker routes; validate product scope." },
  { id: "optimum", group: "Optimum", legalEntities: ["Optimum Insurance Company Inc."], officialUrl: "https://www.optimum-general.com/", logoDomain: "optimum-general.com", routeIds: ["rates", "surex"], accessClass: "broker_panel", accessSummary: "Private auto is available in Ontario exclusively through selected independent brokers.", validationNote: "Broker route." },
  { id: "pure", group: "PURE", legalEntities: ["PURE Insurance"], officialUrl: "https://www.pureinsurance.com/", logoDomain: "pureinsurance.com", routeIds: [], accessClass: "high_net_worth", accessSummary: "High-net-worth placement through a specialist broker; not a normal mass-market web quote.", validationNote: "High-net-worth broker." },
  { id: "peel", group: "Peel", legalEntities: ["Peel Mutual Insurance Company"], officialUrl: "https://www.peelmutual.com/", logoDomain: "peelmutual.com", routeIds: ["rates", "mutuals"], accessClass: "mutual_local", accessSummary: "Peel provides auto through local agents and brokers; a panel may surface it but cannot guarantee it.", validationNote: "Mutual/local agent or broker." },
  { id: "portage", group: "Portage", legalEntities: ["The Portage la Prairie Mutual Insurance Company"], officialUrl: "https://www.portagemutual.com/", logoDomain: "portagemutual.com", routeIds: ["rates", "surex"], accessClass: "broker_panel", accessSummary: "Ontario personal auto is broker-distributed. The broker must confirm appetite and return the actual premium.", validationNote: "Broker route." },
  { id: "sgi", group: "SGI", legalEntities: ["Coachman Insurance Company", "SGI CANADA Insurance Services Ltd."], officialUrl: "https://sgicanada.ca/", logoDomain: "sgicanada.ca", routeIds: ["rates", "lowestrates", "surex", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Broker route. Coachman is mainly non-standard, so a clean profile may not receive it even when the panel is queried.", validationNote: "Broker route; Coachman is commonly non-standard." },
  { id: "sompo", group: "Sompo", legalEntities: ["Endurance Specialty Insurance Ltd.", "Sompo Japan Insurance Inc."], officialUrl: "https://www.sompo-intl.com/locations/canada/", logoDomain: "sompo-intl.com", routeIds: [], accessClass: "commercial_specialty", accessSummary: "No verified standard Ontario personal-auto path. Preserve as regulatory research, not a consumer quote target.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "td", group: "TD", legalEntities: ["Primmum Insurance Company", "Security National Insurance Company", "TD General Insurance Company"], officialUrl: "https://www.tdinsurance.com/products-services/auto-car-insurance", logoDomain: "tdinsurance.com", routeIds: ["td"], accessClass: "direct_online", accessSummary: "Online quote and eligible online purchase are available; some profiles are redirected to a licensed advisor.", validationNote: "TD online, phone and affinity routes; capture the returned legal entity." },
  { id: "tokio", group: "Tokio", legalEntities: ["Tokio Marine and Nichido Fire Insurance Company Limited"], officialUrl: "https://www.tokiomarine.com/ca/en/", logoDomain: "tokiomarine.com", routeIds: [], accessClass: "commercial_specialty", accessSummary: "No verified standard Ontario personal-auto shopping route. Track only if a licensed specialty broker proves relevance.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "travelers", group: "Travelers", legalEntities: ["The Dominion of Canada General Insurance Company"], officialUrl: "https://www.travelerscanada.ca/", logoDomain: "travelerscanada.ca", routeIds: ["rates", "lowestrates", "surex", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Broker-distributed personal auto can still surface as a rate source, but current ownership must be deduplicated against Definity.", currentMarketNote: "Definity acquired Travelers Canada's personal insurance business and The Dominion of Canada General Insurance Company on January 2, 2026.", validationNote: "Broker route; retain the seed row and normalize the current owner separately." },
  { id: "wawanesa", group: "Wawanesa", legalEntities: ["The Wawanesa Mutual Insurance Company"], officialUrl: "https://www.wawanesa.com/canada/", logoDomain: "wawanesa.com", routeIds: ["rates", "surex", "thinkinsure"], accessClass: "broker_panel", accessSummary: "Ontario quote requests go through an insurance broker; Wawanesa does not provide a direct consumer quote engine.", validationNote: "Broker route." },
  { id: "xl", group: "XL", legalEntities: ["XL Specialty Insurance Company"], officialUrl: "https://axaxl.com/", logoDomain: "axaxl.com", routeIds: [], accessClass: "commercial_specialty", accessSummary: "No verified standard Ontario personal-auto path. Keep for seed completeness and specialty research only.", validationNote: "Specialty/commercial broker; validate personal-auto relevance." },
  { id: "zurich", group: "Zurich", legalEntities: ["Zurich Insurance Company"], officialUrl: "https://www.zurichcanada.com/", logoDomain: "zurichcanada.com", routeIds: ["squareone"], accessClass: "direct_online", accessSummary: "Square One offers the consumer web quote; Zurich is the underwriter and should not be shown as a separate direct storefront.", validationNote: "Square One distributes Ontario car insurance underwritten by Zurich." },
];

export function getExecutableRoute(routeId: string) {
  return executableRoutes.find((route) => route.id === routeId);
}

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}
