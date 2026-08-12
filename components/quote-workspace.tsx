"use client";

import {
  Bot,
  CarFront,
  Check,
  FileCheck2,
  Library,
  LockKeyhole,
  Route,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentSearch } from "@/components/agent-search";
import { CallbackDialog, CheckpointDialog } from "@/components/handoff-dialogs";
import { MarketPlan } from "@/components/market-plan";
import { ProfileIntake } from "@/components/profile-intake";
import { QuoteComparison } from "@/components/quote-comparison";
import { ResultCaptureDialog } from "@/components/result-capture-dialog";
import {
  buildAgentRoutes,
  buildDemoPhoneRoutes,
  buildSubmissionAuditRoutes,
  cleanDemoProfile,
  defaultRouteIds,
  emptyProfile,
  routeIdsForSearchScope,
  type AgentEvent,
  type AgentRoute,
  type AgentRouteStatus,
  type DemoPhoneOutcome,
  type DriverProfile,
  type ExtractedQuoteCandidate,
  type ProfileStepId,
  type RouteQuote,
  type SearchScope,
  type WorkspaceStage,
} from "@/lib/demo-flow";
import { executableRoutes, hasBrowserAdapter, hasStandaloneWorkerAdapter, routeCanReturnPrice } from "@/lib/market-catalog";
import { mapStoredSyntheticOutcomeToUiStatus } from "@/lib/voice-result-classifier";
type RegistryStats = { routes: number; direct: number; brokerOrAggregator: number; humanRequired: number };

type LocalBrowserJob = {
  id: string;
  status: "starting" | "running" | "complete" | "error";
  events: Array<{ id: string; at: string; tone: AgentEvent["tone"]; message: string }>;
  result: {
    status: "manual_handoff" | "waiting_human" | "access_blocked" | "blocked" | "unresolved";
    completedFields: string[];
    blocker: string | null;
  } | null;
  error: string | null;
};

type ExtensionRouteStatus =
  | "navigating"
  | "filling"
  | "waiting_human"
  | "price_candidate"
  | "manual_handoff"
  | "access_blocked"
  | "blocked";

type ExtensionMessage = {
  source: "reachrate-extension";
  type: "READY" | "DISCONNECTED" | "ROUTE_EVENT";
  version?: string;
  message?: string;
  runId?: string;
  routeId?: string;
  event?: {
    status: ExtensionRouteStatus;
    message: string;
    blocker?: string;
    completedFields?: string[];
    candidate?: ExtractedQuoteCandidate;
  };
};

type SavedOutcome = {
  id: string;
  registry_id: string;
  market_name: string;
  status: string;
  source_channel: "web" | "phone" | "broker" | "research";
  premium_amount: number | null;
  premium_period: "monthly" | "annual" | null;
  annual_premium: number | null;
  coverage_summary: string;
  evidence_note: string;
  captured_at: string;
  is_simulation: boolean;
  blocker?: string | null;
};

type VoiceStatusPayload = {
  providerStatus?: string;
  terminal?: boolean;
  message?: string | null;
  error?: string;
  outcome?: {
    id: string;
    registryId: string;
    outcomeStatus: string;
    premiumAmount: number | null;
    premiumPeriod: "monthly" | "annual" | null;
    annualPremium: number | null;
    coverageSummary: string;
    blocker: string | null;
    evidenceNote: string;
    capturedAt: string;
  } | null;
};

const capturedStatusesForWorkspace: AgentRouteStatus[] = ["quoted_comparable", "quoted_non_comparable", "estimate_only"];

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function eventTime() {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date());
}

function profileCoverageSummary(profile: DriverProfile) {
  return [
    `$${Number(profile.liabilityLimit).toLocaleString("en-CA")} liability`,
    `$${Number(profile.deductible).toLocaleString("en-CA")} deductible`,
    profile.collisionCoverage ? "collision included" : "no collision",
    profile.comprehensiveCoverage ? "comprehensive included" : "no comprehensive",
    profile.opcf44r ? "OPCF 44R included" : "OPCF 44R not confirmed",
    profile.telematics ? "telematics enabled" : "no telematics",
  ].join(" · ");
}

function preflightRoute(route: AgentRoute, profile: DriverProfile): Partial<AgentRoute> | null {
  if (route.automationMode === "terms_restricted") {
    return {
      status: "terms_restricted",
      fieldsCompleted: 0,
      blocker: "The destination's public terms prohibit robot or automatic-device access. ReachRate records the route but does not automate it.",
    };
  }
  if (!profile.hasVin && route.id === "sonnet") {
    return {
      status: "vin_required",
      fieldsCompleted: 0,
      blocker: "Sonnet's official quote checklist requires a VIN and driver's licence number. No credential was fabricated.",
    };
  }
  if (route.automationMode === "callback") {
    return {
      status: "callback_ready",
      fieldsCompleted: Math.min(route.fieldsPlanned, 8),
      blocker: "A licensed representative, broker panel or residual-market intermediary is required to finish this route.",
    };
  }
  if (route.automationMode === "discovery") {
    return {
      status: "discovery_only",
      fieldsCompleted: route.fieldsPlanned,
      blocker: "Official market reference captured. A specific applicable insurer or program must be identified before a premium can count.",
    };
  }
  if (route.automationMode === "human_checkpoint" && !hasBrowserAdapter(route.id)) {
    return {
      status: "waiting_human",
      fieldsCompleted: Math.min(route.fieldsPlanned, 10),
      blocker: route.id === "caa"
        ? "CAA's official checklist includes the applicant's own driver's licence number. Confirm identity and consent before continuing."
        : "This route requires live verification of a credential, membership or access checkpoint before the Agent can continue.",
    };
  }
  return null;
}

export function QuoteWorkspace({
  registryStats,
  initialScene = "profile",
}: {
  registryStats: RegistryStats;
  initialScene?: WorkspaceStage | "callback";
}) {
  const presentationMode = initialScene !== "profile";
  const comparisonSnapshotMode = initialScene === "compare";
  const initialStage: WorkspaceStage = initialScene === "callback" ? "search" : initialScene;
  const [stage, setStage] = useState<WorkspaceStage>(initialStage);
  const [profileStep, setProfileStep] = useState<ProfileStepId>("driver");
  const [profile, setProfile] = useState<DriverProfile>(() => presentationMode ? { ...cleanDemoProfile } : { ...emptyProfile });
  const [profileLoaded, setProfileLoaded] = useState(presentationMode);
  const [accurateConfirmed, setAccurateConfirmed] = useState(presentationMode);
  const [searchAuthorized, setSearchAuthorized] = useState(presentationMode);
  const [searchScope, setSearchScope] = useState<SearchScope>("recommended");
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([...defaultRouteIds]);
  const [routes, setRoutes] = useState<AgentRoute[]>(() => {
    if (comparisonSnapshotMode) return [...buildSubmissionAuditRoutes(), ...buildDemoPhoneRoutes()];
    const marketRoutes = buildAgentRoutes(defaultRouteIds);
    return presentationMode ? [...marketRoutes, ...buildDemoPhoneRoutes()] : marketRoutes;
  });
  const [events, setEvents] = useState<AgentEvent[]>(() => presentationMode ? [{ id: "truthful-scene", at: "Ready", routeId: null, tone: "success", message: comparisonSnapshotMode ? "Redacted 2026-08-11 audit snapshot loaded: three exact outcomes, zero pre-canned premiums." : "Truthful preview loaded with no pre-canned premiums." }] : []);
  const [runState, setRunState] = useState<"idle" | "running" | "paused" | "complete">(presentationMode ? "paused" : "idle");
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [checkpointRouteId, setCheckpointRouteId] = useState<string | null>(null);
  const [captureRouteId, setCaptureRouteId] = useState<string | null>(null);
  const [callbackRouteId, setCallbackRouteId] = useState<string | null>(initialScene === "callback" ? "demo-agent-1" : null);
  const [activeCallbackRouteId, setActiveCallbackRouteId] = useState<string | null>(null);
  const [callbackProfileAccurate, setCallbackProfileAccurate] = useState(false);
  const [representationAuthorized, setRepresentationAuthorized] = useState(false);
  const [simulationAcknowledged, setSimulationAcknowledged] = useState(false);
  const [callState, setCallState] = useState<"idle" | "calling" | "queued" | "connected" | "complete" | "error">("idle");
  const [callMessage, setCallMessage] = useState("");
  const [refreshingCallback, setRefreshingCallback] = useState(false);
  const [phoneDemoOutcomes, setPhoneDemoOutcomes] = useState<DemoPhoneOutcome[]>([]);
  const [extensionReady, setExtensionReady] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [extensionCandidates, setExtensionCandidates] = useState<Record<string, ExtractedQuoteCandidate>>({});
  const executionEpoch = useRef(0);
  const extensionRouteResolvers = useRef(new Map<string, { finish: () => void; acknowledge: () => void }>());
  const callbackQueuedAt = useRef<number | null>(null);
  const activeConversationId = useRef<string | null>(null);
  const callbackStatusFailures = useRef(0);
  const callbackBaselineOutcomeIds = useRef(new Set<string>());
  const [runId] = useState(() => `run-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`);

  const checkpointRoute = useMemo(() => routes.find((route) => route.id === checkpointRouteId) ?? null, [checkpointRouteId, routes]);
  const captureRoute = useMemo(() => routes.find((route) => route.id === captureRouteId) ?? null, [captureRouteId, routes]);
  const callbackRoute = useMemo(() => routes.find((route) => route.id === callbackRouteId) ?? null, [callbackRouteId, routes]);
  const attempted = routes.some((route) => !route.isSimulation && route.status !== "queued");

  const patchRoute = useCallback((routeId: string, patch: Partial<AgentRoute>) => {
    setRoutes((current) => current.map((route) => route.id === routeId ? { ...route, ...patch } : route));
  }, []);

  const addEvent = useCallback((routeId: string | null, message: string, tone: AgentEvent["tone"] = "neutral") => {
    setEvents((current) => [...current, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: eventTime(), routeId, tone, message }]);
  }, []);

  useEffect(() => {
    function finishExtensionRoute(routeId: string) {
      extensionRouteResolvers.current.get(routeId)?.finish();
    }

    function handleExtensionMessage(event: MessageEvent<ExtensionMessage>) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message || message.source !== "reachrate-extension") return;
      if (message.type === "READY") {
        setExtensionReady(true);
        setExtensionVersion(message.version ?? null);
        return;
      }
      if (message.type === "DISCONNECTED") {
        setExtensionReady(false);
        setExtensionVersion(null);
        return;
      }
      if (message.type !== "ROUTE_EVENT" || message.runId !== runId || !message.routeId || !message.event) return;

      const routeId = message.routeId;
      const routeEvent = message.event;
      extensionRouteResolvers.current.get(routeId)?.acknowledge();
      const fieldsCompleted = routeEvent.completedFields?.length ?? 0;
      if (routeEvent.status === "navigating") {
        patchRoute(routeId, { status: "navigating", fieldsCompleted });
        addEvent(routeId, `[Extension] ${routeEvent.message}`, "active");
        return;
      }
      if (routeEvent.status === "filling") {
        patchRoute(routeId, { status: "filling", fieldsCompleted });
        addEvent(routeId, `[Extension] ${routeEvent.message}`, "active");
        return;
      }
      if (routeEvent.status === "price_candidate") {
        if (!routeEvent.candidate) {
          patchRoute(routeId, { status: "blocked", fieldsCompleted, blocker: "The extension reported a price candidate without structured evidence." });
          addEvent(routeId, "[Extension] A malformed price candidate was rejected.", "warning");
          finishExtensionRoute(routeId);
          return;
        }
        const candidate = routeEvent.candidate as ExtractedQuoteCandidate;
        const activeRoute = routes.find((item) => item.id === routeId);
        const resolvedUnderwriter = (candidate.legalUnderwriter || activeRoute?.legalUnderwriter || "").trim();
        const returnedCarrierRequired = Boolean(activeRoute && !activeRoute.legalUnderwriter);
        const entryNames = [activeRoute?.name, candidate.intermediary]
          .filter((value): value is string => Boolean(value))
          .map((value) => value.trim().toLocaleLowerCase("en-CA"));
        if (
          !activeRoute ||
          !resolvedUnderwriter ||
          (returnedCarrierRequired && entryNames.includes(resolvedUnderwriter.toLocaleLowerCase("en-CA")))
        ) {
          const blocker = "This route is an agent, broker, program or comparison entrance. Capture the returned insurer / legal underwriter before the premium can be saved or ranked.";
          setExtensionCandidates((current) => ({ ...current, [routeId]: candidate }));
          patchRoute(routeId, { status: "waiting_human", fieldsCompleted, blocker, quote: null });
          addEvent(routeId, `[Extension] ${blocker}`, "warning");
          setActiveRouteId((current) => current === routeId ? null : current);
          setRunState("complete");
          finishExtensionRoute(routeId);
          return;
        }
        const monthlyPremium = candidate.premiumPeriod === "monthly" ? candidate.premiumAmount : candidate.premiumAmount / 12;
        const annualPremium = candidate.premiumPeriod === "annual" ? candidate.premiumAmount : candidate.premiumAmount * 12;
        const normalizedQuote: RouteQuote = {
          monthlyPremium,
          annualPremium,
          sourceBrand: candidate.sourceBrand,
          legalUnderwriter: resolvedUnderwriter,
          insurerGroup: activeRoute?.insurerGroup ?? null,
          intermediary: candidate.intermediary,
          resultType: candidate.resultType,
          reference: candidate.reference || `extension-capture-${new Date().toISOString()}`,
          sourceUrl: candidate.sourceUrl,
          capturedAt: new Date().toISOString(),
          coverage: {
            liability: Number(profile.liabilityLimit),
            deductible: Number(profile.deductible),
            collision: profile.collisionCoverage,
            comprehensive: profile.comprehensiveCoverage,
            opcf44r: profile.opcf44r,
            telematics: profile.telematics,
          },
          evidence: candidate.evidence,
          isLiveEvidence: true,
        };
        const normalizedStatus: AgentRouteStatus = candidate.resultType === "estimate" ? "estimate_only" : "quoted_comparable";
        patchRoute(routeId, { status: normalizedStatus, quote: normalizedQuote, fieldsCompleted, blocker: null });
        setExtensionCandidates((current) => ({ ...current, [routeId]: candidate }));
        addEvent(routeId, `[Extension] ${routeEvent.message} The premium was added to the result card.`, "success");
        setActiveRouteId((current) => current === routeId ? null : current);
        setRunState("complete");
        void fetch("/api/outcomes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId,
            registryId: activeRoute?.registryId ?? routeId,
            marketName: normalizedQuote.sourceBrand,
            status: normalizedStatus,
            sourceChannel: activeRoute?.channel === "broker" ? "broker" : "web",
            premiumAmount: normalizedQuote.monthlyPremium,
            premiumPeriod: "monthly",
            coverageSummary: profileCoverageSummary(profile),
            quoteReference: normalizedQuote.reference,
            blocker: null,
            evidenceNote: normalizedQuote.evidence,
            evidenceUrl: normalizedQuote.sourceUrl,
            legalUnderwriter: normalizedQuote.legalUnderwriter,
            insurerGroup: normalizedQuote.insurerGroup,
            intermediary: normalizedQuote.intermediary,
            distinctRateSourceId: activeRoute?.registryId ?? routeId,
            resultKind: normalizedQuote.resultType,
            isSimulation: false,
          }),
        }).catch(() => addEvent(routeId, "The price remains in this browser run, but backend persistence was unavailable.", "warning"));
        finishExtensionRoute(routeId);
        return;
      }

      if (
        routeEvent.status === "access_blocked" &&
        /net::ERR_ABORTED/i.test(`${routeEvent.message} ${routeEvent.blocker ?? ""}`)
      ) {
        patchRoute(routeId, { status: "navigating", fieldsCompleted, blocker: null });
        addEvent(routeId, `[Extension] ${routeId} continued through a normal redirect.`, "active");
        return;
      }

      const statusMap: Record<Exclude<ExtensionRouteStatus, "navigating" | "filling" | "price_candidate">, AgentRouteStatus> = {
        waiting_human: "waiting_human",
        manual_handoff: "manual_handoff",
        access_blocked: "access_blocked",
        blocked: "blocked",
      };
      patchRoute(routeId, {
        status: statusMap[routeEvent.status],
        fieldsCompleted,
        blocker: routeEvent.blocker ?? routeEvent.message,
      });
      addEvent(routeId, `[Extension] ${routeEvent.message}`, routeEvent.status === "manual_handoff" ? "warning" : "warning");
      setActiveRouteId((current) => current === routeId ? null : current);
      setRunState("complete");
      finishExtensionRoute(routeId);
    }

    const pingExtension = () => {
      window.postMessage({ source: "reachrate-app", type: "PING" }, window.location.origin);
    };
    window.addEventListener("message", handleExtensionMessage as EventListener);
    pingExtension();
    const retry = window.setTimeout(pingExtension, 1000);
    const heartbeat = window.setInterval(pingExtension, 5000);
    return () => {
      window.clearTimeout(retry);
      window.clearInterval(heartbeat);
      window.removeEventListener("message", handleExtensionMessage as EventListener);
    };
  }, [addEvent, patchRoute, profile, routes, runId]);

  function updateProfile<K extends keyof DriverProfile>(key: K, value: DriverProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function loadCleanProfile() {
    setProfile({ ...cleanDemoProfile });
    setProfileLoaded(true);
    setAccurateConfirmed(false);
    setSearchAuthorized(false);
    setProfileStep("review");
  }

  function clearProfile() {
    executionEpoch.current += 1;
    setProfile({ ...emptyProfile });
    setProfileLoaded(false);
    setAccurateConfirmed(false);
    setSearchAuthorized(false);
    setProfileStep("driver");
    setSearchScope("recommended");
    setSelectedRouteIds([...defaultRouteIds]);
    setRoutes(buildAgentRoutes(defaultRouteIds));
    setEvents([]);
    setPhoneDemoOutcomes([]);
    setExtensionCandidates({});
    setRunState("idle");
    setActiveRouteId(null);
  }

  function editProfile() {
    executionEpoch.current += 1;
    setActiveRouteId(null);
    setRunState((current) => current === "running" ? "paused" : current);
    setStage("profile");
    setProfileStep("driver");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openPlan() {
    executionEpoch.current += 1;
    setActiveRouteId(null);
    setStage("plan");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseSearchScope(scope: SearchScope) {
    setSearchScope(scope);
    setSelectedRouteIds(routeIdsForSearchScope(scope));
  }

  function toggleSelectedRoute(routeId: string) {
    setSelectedRouteIds((current) => current.includes(routeId)
      ? current.filter((id) => id !== routeId)
      : [...current, routeId]);
  }

  async function executeBrowserRoute(route: AgentRoute, epoch: number) {
    if (executionEpoch.current !== epoch) return;
    setActiveRouteId(route.id);
    patchRoute(route.id, { status: "navigating", fieldsCompleted: 0, blocker: null });
    addEvent(route.id, `Opening the official ${route.name} journey in a supervised visible browser.`, "active");

    if (extensionReady && hasBrowserAdapter(route.id)) {
      try {
        await new Promise<void>((resolve) => {
          let settled = false;
          let acknowledged = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            extensionRouteResolvers.current.delete(route.id);
            window.clearTimeout(acknowledgementTimeoutId);
            window.clearTimeout(boundedTimeoutId);
            resolve();
          };
          const acknowledge = () => {
            if (acknowledged) return;
            acknowledged = true;
            window.clearTimeout(acknowledgementTimeoutId);
          };
          const acknowledgementTimeoutId = window.setTimeout(() => {
            patchRoute(route.id, {
              status: "manual_handoff",
              blocker: "The extension did not acknowledge this route. Refresh the ReachRate tab once after reloading the extension, then retry.",
            });
            addEvent(route.id, `${route.name} stopped because the extension route context was not connected. Retry is available.`, "warning");
            finish();
          }, 8_000);
          const boundedTimeoutId = window.setTimeout(() => {
            patchRoute(route.id, {
              status: "manual_handoff",
              blocker: "The extension route remained open beyond the bounded demo window. Review its visible tab, then reconnect and retry if needed.",
            });
            addEvent(route.id, `${route.name} remains open for supervised review.`, "warning");
            finish();
          }, 120_000);
          extensionRouteResolvers.current.set(route.id, { finish, acknowledge });
          window.postMessage({
            source: "reachrate-app",
            type: "RUN_ROUTE",
            runId,
            routeId: route.id,
            profile,
            profileMode: "personal_live",
          }, window.location.origin);
        });
      } finally {
        if (executionEpoch.current === epoch) setActiveRouteId(null);
      }
      return;
    }

    if (!hasStandaloneWorkerAdapter(route.id)) {
      patchRoute(route.id, {
        status: "manual_handoff",
        blocker: "Install the ReachRate Quote Copilot extension to operate this visible route; no price was claimed.",
      });
      addEvent(route.id, `${route.name} needs the local browser extension for supervised autofill.`, "warning");
      setActiveRouteId(null);
      return;
    }

    try {
      const response = await fetch("/api/agent/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: route.id,
          profile,
          consentToOpenVisibleBrowser: true,
          profileMode: "personal_live",
          holdMs: 4_000,
        }),
      });
      const payload = await response.json() as { error?: string; job?: LocalBrowserJob };

      if (executionEpoch.current !== epoch) return;
      if (response.status === 503) {
        patchRoute(route.id, {
          status: "manual_handoff",
          blocker: "The localhost visible-browser worker is disabled. Enable LOCAL_BROWSER_AGENT_ENABLED=true for a supervised live attempt; no result was claimed.",
        });
        addEvent(route.id, `${route.name} was not attempted because the local browser worker is disabled.`, "warning");
        return;
      }
      if (!response.ok || !payload.job) {
        patchRoute(route.id, { status: "blocked", blocker: payload.error ?? "The visible browser job could not start." });
        addEvent(route.id, payload.error ?? `${route.name} browser job could not start.`, "warning");
        return;
      }

      const seen = new Set<string>();
      let job = payload.job;
      for (let attempt = 0; attempt < 90; attempt += 1) {
        if (executionEpoch.current !== epoch) return;
        for (const event of job.events) {
          if (seen.has(event.id)) continue;
          seen.add(event.id);
          addEvent(route.id, `[Visible browser] ${event.message}`, event.tone);
        }
        if (job.result) {
          const statusMap: Record<NonNullable<LocalBrowserJob["result"]>["status"], AgentRouteStatus> = {
            manual_handoff: "manual_handoff",
            waiting_human: "waiting_human",
            access_blocked: "access_blocked",
            blocked: "blocked",
            unresolved: "blocked",
          };
          patchRoute(route.id, {
            status: statusMap[job.result.status],
            fieldsCompleted: job.result.completedFields.length,
            blocker: job.result.blocker,
          });
        }
        if (job.status === "complete") return;
        if (job.status === "error") {
          patchRoute(route.id, { status: "blocked", blocker: job.error ?? "The browser worker ended unexpectedly." });
          return;
        }
        await wait(650);
        const statusResponse = await fetch(`/api/agent/jobs?jobId=${encodeURIComponent(job.id)}`, { cache: "no-store" });
        const statusPayload = await statusResponse.json() as { error?: string; job?: LocalBrowserJob };
        if (!statusResponse.ok || !statusPayload.job) throw new Error(statusPayload.error ?? "Unable to read browser job status.");
        job = statusPayload.job;
      }
      patchRoute(route.id, { status: "blocked", blocker: "Bounded browser attempt expired without a terminal result." });
    } catch (error) {
      patchRoute(route.id, { status: "blocked", blocker: error instanceof Error ? error.message : "Visible browser attempt failed." });
      addEvent(route.id, error instanceof Error ? error.message : "Visible browser attempt failed.", "warning");
    } finally {
      if (executionEpoch.current === epoch) setActiveRouteId(null);
    }
  }

  function startAgentSearch() {
    if (!accurateConfirmed || !searchAuthorized || selectedRouteIds.length === 0) return;
    const epoch = executionEpoch.current + 1;
    executionEpoch.current = epoch;
    const priceCapableIds = selectedRouteIds.filter((routeId) => {
      const route = executableRoutes.find((item) => item.id === routeId);
      return route ? routeCanReturnPrice(route) : false;
    });
    const planned = buildAgentRoutes(priceCapableIds);
    setRoutes([...planned, ...buildDemoPhoneRoutes()]);
    setEvents([]);
    setRunState("complete");
    setActiveRouteId(null);
    setStage("search");
    setCheckpointRouteId(null);
    setCaptureRouteId(null);
    setCallbackRouteId(null);
    setPhoneDemoOutcomes([]);
    setExtensionCandidates({});
    window.scrollTo({ top: 0, behavior: "smooth" });
    addEvent(null, `Canonical profile locked for ${profile.vehicleYear} ${profile.vehicleMake} ${profile.vehicleModel}; ${planned.length} routes are ready. Open a quote form when you are ready to demonstrate it.`, "success");
  }

  function runSingleRoute(routeId: string) {
    const route = routes.find((item) => item.id === routeId);
    if (!route) return;
    if (activeRouteId === routeId) {
      executionEpoch.current += 1;
      extensionRouteResolvers.current.get(routeId)?.finish();
      setActiveRouteId(null);
      setRunState("complete");
      patchRoute(routeId, {
        status: "manual_handoff",
        blocker: "The pending browser attempt was stopped. Reconnect and retry when the quote page is ready.",
      });
      addEvent(routeId, `${route.name} pending browser attempt was stopped; Retry is available.`, "warning");
      return;
    }
    if (activeRouteId) return;
    if (hasBrowserAdapter(route.id) && !extensionReady) {
      const blocker = "ReachRate Quote Copilot is not connected. Reload the extension if needed, refresh this ReachRate tab once, then retry.";
      patchRoute(route.id, { status: "manual_handoff", blocker });
      addEvent(route.id, blocker, "warning");
      return;
    }
    const preflight = preflightRoute(route, profile);
    if (preflight) {
      patchRoute(route.id, preflight);
      addEvent(route.id, preflight.blocker ?? `${route.name} preflight completed.`, "warning");
      return;
    }
    const epoch = executionEpoch.current + 1;
    executionEpoch.current = epoch;
    setRunState("running");
    void executeBrowserRoute(route, epoch).finally(() => {
      if (executionEpoch.current === epoch) setRunState("complete");
    });
  }

  function moveRouteToLane(routeId: string, lane: "web" | "phone") {
    const route = routes.find((item) => item.id === routeId);
    if (!route || route.isSimulation || capturedStatusesForWorkspace.includes(route.status)) return;
    if (lane === "phone") {
      patchRoute(routeId, {
        preferredLane: "phone",
        status: "callback_ready",
        blocker: route.publicPhone
          ? `Official public line: ${route.publicPhone}. Demo destination: participant's configured private number.`
          : "No verified public line is stored for this route. The private-number rehearsal is still available.",
        isBrandedPhoneRehearsal: true,
        demoScenario: "spoken_price",
      });
      addEvent(routeId, `${route.name} moved from the web queue to the private phone rehearsal lane.`, "active");
      return;
    }
    patchRoute(routeId, {
      preferredLane: "web",
      status: "queued",
      blocker: null,
      isBrandedPhoneRehearsal: false,
      demoScenario: undefined,
    });
    addEvent(routeId, `${route.name} returned to the supervised web queue.`, "neutral");
  }

  function resumeCheckpoint(permissions: { address: boolean; contact: boolean }) {
    if (!checkpointRoute) return;
    const routeId = checkpointRoute.id;
    setCheckpointRouteId(null);
    if (extensionReady && hasBrowserAdapter(routeId)) {
      patchRoute(routeId, { status: "filling", blocker: null });
      setActiveRouteId(routeId);
      setRunState("running");
      window.postMessage({ source: "reachrate-app", type: "RESUME_ROUTE", runId, routeId, sensitiveAutofill: permissions }, window.location.origin);
      const approved = [permissions.address ? "address" : null, permissions.contact ? "contact" : null].filter(Boolean).join(" and ");
      addEvent(routeId, approved
        ? `Human checkpoint acknowledged. One-route ${approved} autofill was approved; the extension is resuming the same official tab.`
        : "Human checkpoint acknowledged without sensitive autofill. The extension is resuming the same official tab.", "active");
      return;
    }
    setCaptureRouteId(routeId);
    addEvent(routeId, "Human checkpoint acknowledged. ReachRate is waiting for the official result evidence; it will not synthesize a premium.", "active");
  }

  async function saveVerifiedResult(routeId: string, status: AgentRouteStatus, quote: RouteQuote) {
    const route = routes.find((item) => item.id === routeId);
    if (!route) return;
    patchRoute(routeId, { status, quote, blocker: null, fieldsCompleted: route.fieldsPlanned });
    setExtensionCandidates((current) => {
      const next = { ...current };
      delete next[routeId];
      return next;
    });
    setCaptureRouteId(null);
    addEvent(routeId, `${quote.sourceBrand} ${quote.resultType} saved with legal underwriter, coverage and official evidence.`, "success");

    try {
      await fetch("/api/outcomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          registryId: route.registryId,
          marketName: quote.sourceBrand,
          status,
          sourceChannel: route.channel === "broker" ? "broker" : route.channel === "research" ? "research" : "web",
          premiumAmount: quote.monthlyPremium,
          premiumPeriod: "monthly",
          coverageSummary: profileCoverageSummary(profile),
          quoteReference: quote.reference,
          blocker: null,
          evidenceNote: quote.evidence,
          evidenceUrl: quote.sourceUrl,
          legalUnderwriter: quote.legalUnderwriter,
          insurerGroup: quote.insurerGroup,
          intermediary: quote.intermediary,
          distinctRateSourceId: route.registryId,
          resultKind: quote.resultType,
          isSimulation: false,
        }),
      });
    } catch {
      addEvent(routeId, "The verified result remains in this browser run, but Supabase persistence was unavailable.", "warning");
    }
  }

  const refreshSavedOutcomes = useCallback(async () => {
    setRefreshingCallback(true);
    try {
      const response = await fetch(`/api/outcomes?runId=${encodeURIComponent(runId)}`, { cache: "no-store" });
      const payload = await response.json() as { records?: SavedOutcome[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load callback results.");
      const simulations = (payload.records ?? []).filter((record) => record.source_channel === "phone" && record.is_simulation);
      const activeRoute = routes.find((route) => route.id === activeCallbackRouteId) ?? null;
      const newSimulations = simulations.filter((record) => !callbackBaselineOutcomeIds.current.has(record.id));
      setPhoneDemoOutcomes((current) => {
        const priorById = new Map(current.map((outcome) => [outcome.id, outcome]));
        return simulations.map((record) => ({
          id: record.id,
          registryId: record.registry_id,
          routeLabel: priorById.get(record.id)?.routeLabel ?? activeRoute?.name ?? (record.registry_id.includes("demo_agent_2") ? "Demo Carrier 2" : "Demo Carrier 1"),
          premiumAmount: record.premium_amount,
          premiumPeriod: record.premium_period,
          annualPremium: record.annual_premium,
          coverageSummary: record.coverage_summary,
          evidenceNote: record.evidence_note,
          capturedAt: record.captured_at,
          outcomeStatus: record.status,
          blocker: record.blocker ?? null,
        }));
      });
      if (newSimulations.length > 0 && activeCallbackRouteId && activeRoute) {
        const latest = newSimulations[0];
        const amount = latest.premium_amount == null
          ? "No spoken premium was stored."
          : `$${latest.premium_amount.toFixed(2)} ${latest.premium_period ?? ""} was stored as a simulation.`;
        const terminalStatus: AgentRouteStatus = mapStoredSyntheticOutcomeToUiStatus(latest.premium_amount, latest.status);
        patchRoute(activeCallbackRouteId, {
          status: activeRoute.isSimulation ? terminalStatus : "callback_ready",
          blocker: `${amount} This result is excluded from official comparison.`,
          demoPremiumAmount: latest.premium_amount,
          demoPremiumPeriod: latest.premium_period,
        });
        addEvent(activeCallbackRouteId, `${activeRoute.name} persisted a private voice simulation—not a market quote.`, "success");
        setActiveCallbackRouteId(null);
        callbackQueuedAt.current = null;
        activeConversationId.current = null;
        callbackStatusFailures.current = 0;
        setCallState("complete");
        setCallMessage(latest.premium_amount != null
          ? `${activeRoute.name} captured C$${latest.premium_amount.toFixed(2)} per ${latest.premium_period === "annual" ? "year" : "month"}. It is visible only in the synthetic Demo lane.`
          : latest.status === "manual_handoff"
            ? `${activeRoute.name}: Rejected—AI assistance was declined and a real person was requested. No price was saved.`
            : `${activeRoute.name}: No answer / unable to reach. No price was saved; Try again is available.`);
        setCallbackRouteId(null);
      } else if ((callState === "queued" || callState === "connected") && activeRoute) {
        const conversationId = activeConversationId.current;
        if (conversationId) {
          const statusResponse = await fetch(`/api/voice/status?conversationId=${encodeURIComponent(conversationId)}`, { cache: "no-store" });
          const statusPayload = await statusResponse.json() as VoiceStatusPayload;
          if (!statusResponse.ok) throw new Error(statusPayload.error ?? "Unable to read call status.");
          callbackStatusFailures.current = 0;

          if (statusPayload.outcome) {
            const outcome = statusPayload.outcome;
            const mapped: DemoPhoneOutcome = {
              id: outcome.id,
              registryId: outcome.registryId,
              routeLabel: activeRoute.name,
              premiumAmount: outcome.premiumAmount,
              premiumPeriod: outcome.premiumPeriod,
              annualPremium: outcome.annualPremium,
              coverageSummary: outcome.coverageSummary,
              evidenceNote: outcome.evidenceNote,
              capturedAt: outcome.capturedAt,
              outcomeStatus: outcome.outcomeStatus,
              blocker: outcome.blocker,
            };
            setPhoneDemoOutcomes((current) => current.some((item) => item.id === mapped.id) ? current : [mapped, ...current]);
            const routeStatus: AgentRouteStatus = mapStoredSyntheticOutcomeToUiStatus(outcome.premiumAmount, outcome.outcomeStatus);
            patchRoute(activeRoute.id, {
              status: routeStatus,
              blocker: outcome.blocker ?? statusPayload.message ?? null,
              demoPremiumAmount: outcome.premiumAmount,
              demoPremiumPeriod: outcome.premiumPeriod,
            });
            addEvent(activeRoute.id, outcome.premiumAmount != null
              ? `${activeRoute.name} succeeded: C$${outcome.premiumAmount.toFixed(2)} per ${outcome.premiumPeriod === "annual" ? "year" : "month"} was saved as synthetic evidence.`
              : outcome.outcomeStatus === "manual_handoff"
                ? `${activeRoute.name} was rejected: AI assistance was declined and human follow-up was requested.`
                : `${activeRoute.name} ended with no answer / unable to reach and no captured price.`, outcome.premiumAmount != null ? "success" : "warning");
            setCallState("complete");
            setCallMessage(statusPayload.message ?? "The private demo call reached a terminal state.");
            setActiveCallbackRouteId(null);
            callbackQueuedAt.current = null;
            activeConversationId.current = null;
            setCallbackRouteId(null);
          } else if (statusPayload.terminal) {
            patchRoute(activeRoute.id, { status: "unreachable", blocker: statusPayload.message ?? "The call ended without a structured result." });
            addEvent(activeRoute.id, `${activeRoute.name} ended without a captured result.`, "warning");
            setCallState("complete");
            setCallMessage(statusPayload.message ?? "The call ended without a captured result. Use Try again when ready.");
            setActiveCallbackRouteId(null);
            callbackQueuedAt.current = null;
            activeConversationId.current = null;
            setCallbackRouteId(null);
          } else {
            const connected = statusPayload.providerStatus === "in-progress";
            setCallState(connected ? "connected" : "queued");
            setCallMessage(connected
              ? "Call connected. Continue the short demo conversation; ReachRate is waiting for a terminal structured result."
              : "Call queued. ReachRate is monitoring the provider status automatically.");
          }
        } else if (callbackQueuedAt.current != null && Date.now() - callbackQueuedAt.current >= 90_000) {
          patchRoute(activeRoute.id, { status: "unreachable", blocker: "Call status timed out before a structured result was returned." });
          setCallState("complete");
          setCallMessage("Unable to confirm the call result. Use Try again when ready.");
          setActiveCallbackRouteId(null);
          callbackQueuedAt.current = null;
          setCallbackRouteId(null);
        }
      }
    } catch (error) {
      callbackStatusFailures.current += 1;
      const activeRoute = routes.find((route) => route.id === activeCallbackRouteId) ?? null;
      const timedOut = callbackQueuedAt.current != null && Date.now() - callbackQueuedAt.current >= 90_000;
      if (activeRoute && (callbackStatusFailures.current >= 3 || timedOut)) {
        patchRoute(activeRoute.id, { status: "unreachable", blocker: "Provider status could not be confirmed after the private call." });
        addEvent(activeRoute.id, `${activeRoute.name} status could not be confirmed; retry is available.`, "warning");
        setActiveCallbackRouteId(null);
        callbackQueuedAt.current = null;
        activeConversationId.current = null;
        setCallbackRouteId(null);
        setCallState("error");
        setCallMessage(error instanceof Error ? `${error.message} Try again is available on the card.` : "Unable to load callback evidence. Try again is available on the card.");
      } else {
        setCallState("queued");
        setCallMessage("The call-status check was temporarily unavailable. ReachRate is retrying automatically.");
      }
    } finally {
      setRefreshingCallback(false);
    }
  }, [activeCallbackRouteId, addEvent, callState, patchRoute, routes, runId]);

  async function placeCallbackCall() {
    if (!callbackRoute) return;
    setCallState("calling");
    setCallMessage("");
    try {
      const response = await fetch("/api/voice/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicantDisplayName: profile.firstName || "Applicant", runId, routeLabel: callbackRoute.name, consentToCall: true, simulation: true }),
      });
      const payload = await response.json() as { error?: string; maskedNumber?: string; conversationId?: string | null };
      if (!response.ok) throw new Error(payload.error ?? "Unable to start the call.");
      patchRoute(callbackRoute.id, { status: "callback_queued" });
      setActiveCallbackRouteId(callbackRoute.id);
      callbackQueuedAt.current = Date.now();
      activeConversationId.current = payload.conversationId ?? null;
      callbackStatusFailures.current = 0;
      callbackBaselineOutcomeIds.current = new Set(phoneDemoOutcomes.map((outcome) => outcome.id));
      setCallState("queued");
      setCallMessage(`Private rehearsal queued to ${payload.maskedNumber ?? "the allowlisted number"}. ${callbackRoute.demoScenario === "human_handoff" ? "Say ‘No, I want to talk to a real person’ to demonstrate the rejected-AI human-handoff outcome." : "Answer, consent and state a numeric demo price such as ‘200 per month’ or ‘220 pounds per month’; ReachRate will save C$200/mo or C$220/mo."}`);
      addEvent(callbackRoute.id, `${callbackRoute.name} context handed to the private AI voice rehearsal.`, "active");
    } catch (error) {
      setCallState("error");
      setCallMessage(error instanceof Error ? error.message : "Unable to start the call.");
    }
  }

  useEffect(() => {
    if (!["queued", "connected"].includes(callState) || !activeCallbackRouteId) return;
    const intervalId = window.setInterval(() => void refreshSavedOutcomes(), 3000);
    return () => window.clearInterval(intervalId);
  }, [activeCallbackRouteId, callState, refreshSavedOutcomes]);

  const stageMeta: Array<{ id: WorkspaceStage; label: string; icon: typeof CarFront; enabled: boolean }> = [
    { id: "profile", label: "Profile", icon: CarFront, enabled: true },
    { id: "plan", label: "Search scope", icon: Library, enabled: accurateConfirmed && searchAuthorized },
    { id: "search", label: "Find quotes", icon: Bot, enabled: runState !== "idle" },
    { id: "compare", label: "Compare", icon: FileCheck2, enabled: attempted || stage === "compare" },
  ];

  return (
    <div className="min-h-screen bg-[#fffdfc] text-[#253640]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-[1280px] items-center justify-between gap-5 px-5 md:px-8">
          <button type="button" onClick={editProfile} className="flex items-center gap-3 text-left" aria-label="Return to quote profile">
            <span className="grid size-10 place-items-center rounded-xl bg-[#253640] text-white"><Route size={20} /></span>
            <span><span className="block text-xl font-black tracking-[-0.055em]">reachrate</span><span className="block text-[0.6rem] font-black uppercase tracking-[0.16em] text-[#8a969b]">Ontario All-Quote Agent</span></span>
          </button>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Workspace stages">
            {stageMeta.map(({ id, label, enabled }) => (
              <button key={id} type="button" disabled={!enabled} onClick={() => { if (!enabled) return; if (id === "profile") editProfile(); else if (id === "plan") openPlan(); else setStage(id); }} className={`relative min-h-[76px] text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${stage === id ? "text-[#273942]" : "text-[#66757d] hover:text-[#273942]"}`}>
                {label}{stage === id && <span className="absolute inset-x-0 bottom-0 h-1 bg-[#e8b978]" />}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 rounded-full border border-[#cce8e9] bg-[#f2fbfb] px-3 py-2 text-[0.66rem] font-black text-[#4c838a] sm:flex"><LockKeyhole size={14} />Quote search · evidence mode</div>
        </div>
      </header>

      {stage === "profile" && <ProfileIntake profile={profile} step={profileStep} profileLoaded={profileLoaded} accurateConfirmed={accurateConfirmed} searchAuthorized={searchAuthorized} onChange={updateProfile} onStepChange={setProfileStep} onLoadDemo={loadCleanProfile} onClear={clearProfile} onAccurateConfirmed={setAccurateConfirmed} onSearchAuthorized={setSearchAuthorized} onStartSearch={openPlan} />}

      {stage === "plan" && <MarketPlan profile={profile} searchScope={searchScope} selectedRouteIds={selectedRouteIds} onSearchScope={chooseSearchScope} onToggleRoute={toggleSelectedRoute} onSelectAllRoutes={() => setSelectedRouteIds(routeIdsForSearchScope("all"))} onClearAllRoutes={() => setSelectedRouteIds([])} onBack={editProfile} onRun={startAgentSearch} extensionReady={extensionReady} extensionVersion={extensionVersion} />}

      {stage === "search" && <AgentSearch routes={routes} events={events} runState={runState} mappedRouteCount={registryStats.routes} activeRouteId={activeRouteId} onRunRoute={runSingleRoute} onMoveRoute={moveRouteToLane} onOpenCallback={(routeId) => { setCallbackRouteId(routeId); setCallbackProfileAccurate(false); setRepresentationAuthorized(false); setSimulationAcknowledged(false); setCallState("idle"); setCallMessage(""); }} onCompare={() => { setStage("compare"); window.scrollTo({ top: 0, behavior: "smooth" }); }} onRestart={openPlan} onRefreshCallback={() => void refreshSavedOutcomes()} refreshingCallback={refreshingCallback} />}

      {stage === "compare" && <QuoteComparison profile={profile} routes={routes} phoneDemoOutcomes={phoneDemoOutcomes} onBack={() => setStage("search")} onRestart={editProfile} />}

      <footer className="border-t border-black/[0.06] bg-white"><div className="mx-auto flex max-w-[1220px] flex-col justify-between gap-4 px-5 py-7 text-xs text-[#78858b] md:flex-row md:items-center md:px-8"><p>ReachRate · personal-use Ontario hackathon prototype</p><div className="flex flex-wrap items-center gap-4"><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> No CAPTCHA bypass</span><span className="inline-flex items-center gap-1.5"><Check size={14} /> No fabricated premium, VIN or underwriter</span></div></div></footer>

      <CheckpointDialog key={checkpointRoute?.id ?? "no-checkpoint"} route={checkpointRoute} profile={profile} onClose={() => setCheckpointRouteId(null)} onResume={resumeCheckpoint} />
      {captureRoute && <ResultCaptureDialog key={captureRoute.id} route={captureRoute} profile={profile} candidate={extensionCandidates[captureRoute.id] ?? null} onClose={() => setCaptureRouteId(null)} onSave={(routeId, status, quote) => void saveVerifiedResult(routeId, status, quote)} />}
      <CallbackDialog route={callbackRoute} profileAccurate={callbackProfileAccurate} representationAuthorized={representationAuthorized} simulationAcknowledged={simulationAcknowledged} callState={callState} callMessage={callMessage} onProfileAccurate={setCallbackProfileAccurate} onRepresentationAuthorized={setRepresentationAuthorized} onSimulationAcknowledged={setSimulationAcknowledged} onClose={() => setCallbackRouteId(null)} onPlaceCall={() => void placeCallbackCall()} />
    </div>
  );
}
