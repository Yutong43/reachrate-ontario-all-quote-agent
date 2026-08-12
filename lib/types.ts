export type DistributionType =
  | "direct"
  | "exclusive_agent"
  | "broker"
  | "aggregator"
  | "affinity"
  | "MGA_program"
  | "mutual"
  | "residual";

export type ProductScope =
  | "standard_PPA"
  | "nonstandard_PPA"
  | "high_net_worth"
  | "collector"
  | "affinity"
  | "commercial_specialty"
  | "unknown";

export type RouteStatus =
  | "ready"
  | "needs_live_verification"
  | "membership_restricted"
  | "human_required"
  | "terms_restricted"
  | "discovery_only";

export type OutcomeStatus =
  | "quoted"
  | "quoted_comparable"
  | "quoted_non_comparable"
  | "estimate_only"
  | "callback_required"
  | "manual_handoff"
  | "ineligible"
  | "affinity_restricted"
  | "specialty_only"
  | "duplicate_rate_source"
  | "not_currently_writing"
  | "blocked"
  | "access_blocked"
  | "unreachable"
  | "vin_required"
  | "unresolved";

export type MarketRequirements = {
  requires_licence: boolean | "unknown";
  requires_VIN: boolean | "at_bind" | "unknown";
  requires_membership: boolean | "unknown";
  requires_human: boolean | "unknown";
  supports_without_VIN: boolean | "unknown";
};

export type MarketRecord = {
  registry_id: string;
  last_verified_at: string;
  legal_underwriter: string;
  insurer_group: string;
  brand_or_program: string;
  distribution_type: DistributionType;
  product_scope: ProductScope;
  quote_url: string | null;
  public_phone_route: string | null;
  known_panel_source: string | null;
  licensed_intermediary: string | null;
  requirements: MarketRequirements;
  terms_or_automation_notes: string;
  status: RouteStatus;
  evidence_url: string | null;
  source_citation: string;
  distinct_rate_source_id: string;
  official_url?: string;
  logo_domain?: string;
  route_role?:
    | "direct_insurer"
    | "direct_distributor"
    | "exclusive_agent"
    | "licensed_broker"
    | "comparison_platform"
    | "affinity"
    | "specialty"
    | "residual"
    | "market_locator";
  result_semantics?: "quote" | "estimate" | "returned_insurer_required" | "discovery";
  auto_run_priority?: number | null;
  auto_run_default?: boolean;
};

export type NormalizedOutcome = {
  id: string;
  runId: string;
  registryId: string;
  marketName: string;
  status: OutcomeStatus;
  sourceChannel: "web" | "phone" | "broker" | "research";
  premiumAmount: number | null;
  premiumPeriod: "monthly" | "annual" | null;
  annualPremium: number | null;
  coverageSummary: string;
  quoteReference: string | null;
  blocker: string | null;
  evidenceNote: string;
  capturedAt: string;
  isSimulation: boolean;
  sourceBrand?: string;
  legalUnderwriter?: string | null;
  insurerGroup?: string | null;
  intermediary?: string | null;
  distinctRateSourceId?: string | null;
  evidenceUrl?: string | null;
  resultKind?: "quote" | "estimate" | "blocker" | "handoff";
};
