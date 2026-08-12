import {
  executableRoutes,
  insurerGroupReferences,
  routeCanReturnPrice,
  routeIsProfileSuitable,
  type AutomationMode,
  type ResultSemantics,
  type RouteRole,
} from "@/lib/market-catalog";
import canonicalTestProfile from "@/data/canonical-test-profile.json";
import { routeAuditById } from "@/lib/route-audit";

export type WorkspaceStage = "profile" | "plan" | "search" | "compare";

export type SearchScope = "recommended" | "explore" | "all";

export type ProfileStepId =
  | "driver"
  | "vehicle"
  | "history"
  | "coverage"
  | "review";

export type DriverProfile = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "x";
  postalCode: string;
  streetAddress: string;
  contactEmail: string;
  contactPhone: string;
  licenceClass: "G" | "G2" | "G1";
  licensingHistory: "ontario_graduated" | "transferred";
  licenceOrigin: string;
  ontarioLicenceIssueDate: string;
  firstLicensedYear: string;
  g1LicenceDate: string;
  g2LicenceDate: string;
  gLicenceDate: string;
  maritalStatus: "single" | "married" | "common_law";
  employmentStatus: "employed" | "student" | "retired" | "other";
  vehicleRelationship: "planned" | "owned";
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleCondition: "new" | "used";
  vehicleOwnership: "owned" | "financed" | "leased";
  annualKilometres: string;
  primaryUse: "personal" | "business";
  commuteKilometres: string;
  overnightParking: "private_garage" | "driveway" | "street" | "other";
  winterTires: boolean;
  hasVin: boolean;
  claimsLastSixYears: "0" | "1" | "2+";
  convictionsLastThreeYears: "0" | "1" | "2+";
  suspensionsLastSixYears: "0" | "1+";
  continuousInsuranceYears: "0" | "1-2" | "3-5" | "5+";
  policyStartDate: string;
  liabilityLimit: "1000000" | "2000000";
  collisionCoverage: boolean;
  comprehensiveCoverage: boolean;
  deductible: "500" | "1000" | "2000";
  opcf44r: boolean;
  telematics: boolean;
};

export type RouteTier = 1 | 2 | 3;

export type AgentRouteStatus =
  | "queued"
  | "navigating"
  | "filling"
  | "waiting_human"
  | "quoted_comparable"
  | "quoted_non_comparable"
  | "estimate_only"
  | "manual_handoff"
  | "callback_ready"
  | "callback_queued"
  | "demo_complete"
  | "rejected"
  | "unreachable"
  | "vin_required"
  | "terms_restricted"
  | "discovery_only"
  | "not_applicable"
  | "access_blocked"
  | "blocked";

export type QuoteCoverage = {
  liability: number | null;
  deductible: number | null;
  collision: boolean | null;
  comprehensive: boolean | null;
  opcf44r: boolean | null;
  telematics: boolean | null;
};

export type RouteQuote = {
  monthlyPremium: number;
  annualPremium: number;
  sourceBrand: string;
  legalUnderwriter: string;
  insurerGroup: string | null;
  intermediary: string | null;
  resultType: "quote" | "estimate";
  reference: string;
  sourceUrl: string;
  capturedAt: string;
  coverage: QuoteCoverage;
  evidence: string;
  isLiveEvidence: true;
};

export type ExtractedQuoteCandidate = {
  premiumAmount: number;
  premiumPeriod: "monthly" | "annual";
  sourceBrand: string;
  legalUnderwriter: string;
  intermediary: string | null;
  resultType: "quote" | "estimate";
  reference: string;
  sourceUrl: string;
  evidence: string;
};

export type DemoPhoneOutcome = {
  id: string;
  registryId: string;
  routeLabel: string;
  premiumAmount: number | null;
  premiumPeriod: "monthly" | "annual" | null;
  annualPremium: number | null;
  coverageSummary: string;
  evidenceNote: string;
  capturedAt: string;
  outcomeStatus: string;
  blocker: string | null;
};

export type NormalizedAuditOutcome = {
  capturedAt: string;
  reference: string | null;
  evidenceArtifact: string;
  evidenceHash: string;
  confidence: "low" | "medium" | "high";
  nextAction: string;
  requestedCoverage: QuoteCoverage;
  returnedCoverage: QuoteCoverage;
  coverageDifferences: string[];
};

export type AgentRoute = {
  id: string;
  registryId: string;
  name: string;
  role: RouteRole;
  channel: "aggregator" | "direct" | "broker" | "phone" | "research";
  insurerGroup: string | null;
  legalUnderwriter: string | null;
  resultSemantics: ResultSemantics;
  automationMode: AutomationMode;
  logoDomain: string;
  tier: RouteTier;
  status: AgentRouteStatus;
  summary: string;
  evidenceNote: string;
  blocker: string | null;
  quote: RouteQuote | null;
  officialUrl: string | null;
  sourceUrl: string;
  fieldsPlanned: number;
  fieldsCompleted: number;
  demoPremiumAmount?: number | null;
  demoPremiumPeriod?: "monthly" | "annual" | null;
  auditStatus?: string;
  checkpointKind?: string | null;
  auditTestDepth?: string;
  userActionRequired?: string;
  publicPhone?: string | null;
  engineFamily?: string | null;
  deduplicatesWith?: string[];
  priceReturned?: boolean | null;
  isSimulation?: boolean;
  isBrandedPhoneRehearsal?: boolean;
  preferredLane?: "web" | "phone";
  demoScenario?: "spoken_price" | "human_handoff";
  normalizedAuditOutcome?: NormalizedAuditOutcome;
};

export type AgentEvent = {
  id: string;
  at: string;
  routeId: string | null;
  tone: "neutral" | "active" | "success" | "warning";
  message: string;
};

export const profileSteps: Array<{
  id: ProfileStepId;
  label: string;
  note: string;
}> = [
  { id: "driver", label: "About you", note: "Driver details" },
  { id: "vehicle", label: "Your vehicle", note: "Car and usage" },
  { id: "history", label: "Driving history", note: "Claims and convictions" },
  { id: "coverage", label: "Coverage", note: "Comparison baseline" },
  { id: "review", label: "Review", note: "Consent and route plan" },
];

export const cleanDemoProfile = canonicalTestProfile.profile as DriverProfile;

export const cleanDemoScenario = {
  id: canonicalTestProfile.scenario_id,
  label: canonicalTestProfile.label,
  purpose: canonicalTestProfile.purpose,
};

export const emptyProfile: DriverProfile = {
  ...cleanDemoProfile,
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  postalCode: "",
  streetAddress: "",
  contactEmail: "",
  contactPhone: "",
  licenceOrigin: "",
  ontarioLicenceIssueDate: "",
  firstLicensedYear: "",
  g1LicenceDate: "",
  g2LicenceDate: "",
  gLicenceDate: "",
};

function channelForRole(role: RouteRole): AgentRoute["channel"] {
  if (role === "comparison_platform") return "aggregator";
  if (role === "licensed_broker") return "broker";
  if (role === "market_locator" || role === "residual") return "research";
  return "direct";
}

function tierForMode(mode: AutomationMode): RouteTier {
  if (mode === "browser") return 1;
  if (mode === "human_checkpoint" || mode === "terms_restricted") return 2;
  return 3;
}

const recommendedRouteIds = [
  "aviva",
  "rates",
  "td",
  "caa",
  "cooperators",
  "allstate",
];

export function routeIdsForSearchScope(scope: SearchScope) {
  if (scope === "recommended") return [...recommendedRouteIds];

  const ordered = executableRoutes.slice().sort((a, b) => a.priority - b.priority);
  if (scope === "explore") {
    return ordered
      .filter(routeIsProfileSuitable)
      .map((route) => route.id);
  }

  return ordered.filter(routeCanReturnPrice).map((route) => route.id);
}

export const defaultRouteIds = routeIdsForSearchScope("recommended");

export function createAgentRoute(routeId: string): AgentRoute | null {
  const route = executableRoutes.find((item) => item.id === routeId);
  if (route) {
    const audit = routeAuditById.get(route.id);
    return {
      id: route.id,
      registryId: route.registryId,
      name: route.name,
      role: route.role,
      channel: channelForRole(route.role),
      insurerGroup: route.insurerGroup,
      legalUnderwriter: route.legalUnderwriter,
      resultSemantics: route.resultSemantics,
      automationMode: route.automationMode,
      logoDomain: route.logoDomain,
      tier: tierForMode(route.automationMode),
      status: "queued",
      summary: route.summary,
      evidenceNote: route.evidenceNote,
      blocker: null,
      quote: null,
      officialUrl: route.officialUrl,
      sourceUrl: route.sourceUrl,
      fieldsPlanned: route.fieldsPlanned,
      fieldsCompleted: 0,
      auditStatus: audit?.audit_status,
      checkpointKind: audit?.checkpoint_kind,
      auditTestDepth: audit?.test_depth,
      userActionRequired: audit?.user_action_required,
      publicPhone: audit?.public_phone,
      engineFamily: audit?.engine_family,
      deduplicatesWith: audit?.deduplicates_with,
      priceReturned: audit?.price_returned,
    };
  }

  if (!routeId.startsWith("group:")) return null;
  const group = insurerGroupReferences.find((item) => item.id === routeId.slice(6));
  if (!group) return null;

  return {
    id: routeId,
    registryId: `research_${group.id}_on`,
    name: `${group.group} market research`,
    role: "market_locator",
    channel: "research",
    insurerGroup: group.group,
    legalUnderwriter: group.legalEntities.length === 1 ? group.legalEntities[0] : null,
    resultSemantics: "discovery",
    automationMode: "discovery",
    logoDomain: group.logoDomain,
    tier: 3,
    status: "queued",
    summary: group.validationNote,
    evidenceNote: "Official group website and Appendix A seed entry; no public direct quote is assumed.",
    blocker: null,
    quote: null,
    officialUrl: group.officialUrl,
    sourceUrl: group.officialUrl,
    fieldsPlanned: 3,
    fieldsCompleted: 0,
  };
}

export function buildAgentRoutes(routeIds: string[]) {
  return routeIds
    .map(createAgentRoute)
    .filter((route): route is AgentRoute => route != null);
}

export function buildDemoPhoneRoutes(): AgentRoute[] {
  return [
    {
      id: "demo-agent-1",
      registryId: "voice_simulation_demo_agent_1",
      name: "Demo Carrier 1",
      role: "licensed_broker",
      channel: "phone",
      insurerGroup: null,
      legalUnderwriter: null,
      resultSemantics: "discovery",
      automationMode: "callback",
      logoDomain: "",
      tier: 3,
      status: "callback_ready",
      summary: "Private-number voice rehearsal: answer the call, consent, then state a made-up premium so structured capture can be demonstrated.",
      evidenceNote: "Synthetic demo company. It is not an insurer, broker, market source or quote.",
      blocker: "Ready for a supervised call to the participant's own allowlisted number.",
      quote: null,
      officialUrl: null,
      sourceUrl: "",
      fieldsPlanned: 0,
      fieldsCompleted: 0,
      isSimulation: true,
      demoScenario: "spoken_price",
    },
    {
      id: "demo-agent-2",
      registryId: "voice_simulation_demo_agent_2",
      name: "Demo Carrier 2",
      role: "licensed_broker",
      channel: "phone",
      insurerGroup: null,
      legalUnderwriter: null,
      resultSemantics: "discovery",
      automationMode: "callback",
      logoDomain: "",
      tier: 3,
      status: "callback_ready",
      summary: "Private-number human-handoff rehearsal: decline AI help and ask for a real person so the workflow records an explicit handoff with no premium.",
      evidenceNote: "Synthetic demo company. It is not an insurer, broker, market source or quote.",
      blocker: "Ready for a supervised human-request call to the participant's own allowlisted number.",
      quote: null,
      officialUrl: null,
      sourceUrl: "",
      fieldsPlanned: 0,
      fieldsCompleted: 0,
      isSimulation: true,
      demoScenario: "human_handoff",
    },
  ];
}

const auditedAt = "2026-08-11T20:24:39Z";
const auditArtifact = "data/online-route-audit.json";
const auditHash = "sha256:ea8612cdc46a4aca2634cbb088d1ac20e0d10b5af338b810ef5b7911761fa9c3";
const requestedAuditCoverage: QuoteCoverage = {
  liability: 2_000_000,
  deductible: 1_000,
  collision: true,
  comprehensive: true,
  opcf44r: true,
  telematics: false,
};
const noReturnedCoverage: QuoteCoverage = {
  liability: null,
  deductible: null,
  collision: null,
  comprehensive: null,
  opcf44r: null,
  telematics: null,
};

export function buildSubmissionAuditRoutes(): AgentRoute[] {
  return buildAgentRoutes(["aviva", "sonnet", "mychoice"]).map((route) => {
    if (route.id === "aviva") {
      return {
        ...route,
        status: "manual_handoff",
        fieldsCompleted: 29,
        blocker: "The official journey reached an applicant-controlled assumptions declaration. No premium or policy coverage was returned.",
        normalizedAuditOutcome: {
          capturedAt: auditedAt,
          reference: "Q022763742",
          evidenceArtifact: `${auditArtifact}#route_id=aviva`,
          evidenceHash: auditHash,
          confidence: "low",
          nextAction: "Personally review and truthfully accept or reject the declaration, then resume the same tab.",
          requestedCoverage: requestedAuditCoverage,
          returnedCoverage: noReturnedCoverage,
          coverageDifferences: ["Requested benchmark coverage was not returned before the declaration checkpoint."],
        },
      };
    }

    if (route.id === "sonnet") {
      return {
        ...route,
        status: "vin_required",
        blocker: "The no-VIN profile cannot enter the official quote path, which also requires the participant's own valid driver's licence number.",
        normalizedAuditOutcome: {
          capturedAt: auditedAt,
          reference: null,
          evidenceArtifact: `${auditArtifact}#route_id=sonnet`,
          evidenceHash: auditHash,
          confidence: "low",
          nextAction: "Stop without fabricating identifiers; retry only with a real VIN and the participant's own valid licence.",
          requestedCoverage: requestedAuditCoverage,
          returnedCoverage: noReturnedCoverage,
          coverageDifferences: [
            "No policy coverage was returned because the current planned vehicle has no VIN.",
            "The official route also requires the participant's own driver's licence number.",
          ],
        },
      };
    }

    return {
      ...route,
      status: "terms_restricted",
      blocker: "The current public terms restrict automated-device access, so ReachRate did not send profile data to this intermediary route.",
      normalizedAuditOutcome: {
        capturedAt: auditedAt,
        reference: null,
        evidenceArtifact: `${auditArtifact}#route_id=mychoice`,
        evidenceHash: auditHash,
        confidence: "low",
        nextAction: "Keep as a permitted manual/reference path and normalize any returned insurer separately.",
        requestedCoverage: requestedAuditCoverage,
        returnedCoverage: noReturnedCoverage,
        coverageDifferences: ["No coverage or returned insurer was collected because automated access was not attempted."],
      },
    };
  });
}

export const initialAgentRoutes = buildAgentRoutes(defaultRouteIds);

export const tierCopy: Record<
  RouteTier,
  { eyebrow: string; title: string; description: string }
> = {
  1: {
    eyebrow: "Tier 1 · browser execution",
    title: "Official online quote routes",
    description: "The Agent opens the official journey, maps only approved profile fields and stops at a new credential, declaration or access control.",
  },
  2: {
    eyebrow: "Tier 2 · human checkpoint",
    title: "Credentials, eligibility or destination terms",
    description: "These routes need a VIN, licence consent, membership, CAPTCHA or permission that the Agent cannot invent or bypass.",
  },
  3: {
    eyebrow: "Tier 3 · broker and discovery",
    title: "Voice, intermediary or market-map handoff",
    description: "The route preserves context and records a callback, broker result, exact eligibility answer or evidence-backed discovery status.",
  },
};
