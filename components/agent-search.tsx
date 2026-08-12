"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileCheck2,
  GripVertical,
  LoaderCircle,
  MousePointerClick,
  PhoneCall,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useState, type DragEvent } from "react";

import type { AgentEvent, AgentRoute, AgentRouteStatus } from "@/lib/demo-flow";
import { faviconUrl, routeRoleLabels } from "@/lib/market-catalog";

type AgentSearchProps = {
  routes: AgentRoute[];
  events: AgentEvent[];
  runState: "idle" | "running" | "paused" | "complete";
  mappedRouteCount: number;
  activeRouteId: string | null;
  onRunRoute: (routeId: string) => void;
  onMoveRoute: (routeId: string, lane: "web" | "phone") => void;
  onOpenCallback: (routeId: string) => void;
  onCompare: () => void;
  onRestart: () => void;
  onRefreshCallback: () => void;
  refreshingCallback: boolean;
};

const statusMeta: Record<AgentRouteStatus, { label: string; className: string; active?: boolean }> = {
  queued: { label: "Queued", className: "border-[#dfe1df] bg-[#f7f7f4] text-[#77838a]" },
  navigating: { label: "Opening official route", className: "border-[#b7dfe4] bg-[#edf9fa] text-[#397782]", active: true },
  filling: { label: "Agent mapping fields", className: "border-[#b7dfe4] bg-[#edf9fa] text-[#397782]", active: true },
  waiting_human: { label: "Human checkpoint", className: "border-[#e9cf9f] bg-[#fff8e8] text-[#8a5b17]" },
  quoted_comparable: { label: "Comparable quote", className: "border-[#b8dfd2] bg-[#edf8f4] text-[#397561]" },
  quoted_non_comparable: { label: "Quote · coverage differs", className: "border-[#e8cf9f] bg-[#fff7e7] text-[#8a5b17]" },
  estimate_only: { label: "Estimate only", className: "border-[#cfd8e9] bg-[#f2f5fb] text-[#586d91]" },
  manual_handoff: { label: "Review official journey", className: "border-[#e5d0a6] bg-[#fff9eb] text-[#866027]" },
  callback_ready: { label: "Private phone demo ready", className: "border-[#d9c7e6] bg-[#faf6fd] text-[#73558a]" },
  callback_queued: { label: "Calling private demo number", className: "border-[#d9c7e6] bg-[#faf6fd] text-[#73558a]", active: true },
  demo_complete: { label: "Success · price saved", className: "border-[#b8dfd2] bg-[#edf8f4] text-[#397561]" },
  rejected: { label: "Rejected · human requested", className: "border-[#e5c4ca] bg-[#fff3f5] text-[#914e5a]" },
  unreachable: { label: "No answer · unable to reach", className: "border-[#d7c9df] bg-[#f7f2fa] text-[#735d7e]" },
  vin_required: { label: "VIN required", className: "border-[#e9cf9f] bg-[#fff8e8] text-[#8a5b17]" },
  terms_restricted: { label: "Automation restricted by terms", className: "border-[#efc3c3] bg-[#fff2f2] text-[#9a4a4a]" },
  discovery_only: { label: "Discovery only", className: "border-[#d4d9d7] bg-[#f7f8f6] text-[#617078]" },
  not_applicable: { label: "Not applicable", className: "border-[#d4d9d7] bg-[#f7f8f6] text-[#617078]" },
  access_blocked: { label: "Access blocked", className: "border-[#efc3c3] bg-[#fff2f2] text-[#9a4a4a]" },
  blocked: { label: "Blocked", className: "border-[#efc3c3] bg-[#fff2f2] text-[#9a4a4a]" },
};

const capturedStatuses: AgentRouteStatus[] = ["quoted_comparable", "quoted_non_comparable", "estimate_only"];
const activeStatuses: AgentRouteStatus[] = ["navigating", "filling", "callback_queued"];

function RouteActions({
  route,
  activeRouteId,
  onRunRoute,
  onOpenCallback,
  onCompare,
  onRefreshCallback,
  refreshingCallback,
}: Pick<
  AgentSearchProps,
  | "activeRouteId"
  | "onRunRoute"
  | "onOpenCallback"
  | "onCompare"
  | "onRefreshCallback"
  | "refreshingCallback"
> & { route: AgentRoute }) {
  if (route.isSimulation && route.status === "demo_complete") {
    return (
      <button type="button" onClick={onCompare} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#76558b] px-4 text-xs font-black text-white">
        View demo result <ArrowRight size={14} />
      </button>
    );
  }

  if (route.isSimulation && ["unreachable", "rejected", "manual_handoff"].includes(route.status)) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-[#e2d4eb] bg-[#fcf9fe] px-3 py-2 text-[0.66rem] font-bold leading-5 text-[#6f5a7c]">
          {route.status === "rejected" || route.status === "manual_handoff"
            ? "Rejected · AI declined · human requested · no price saved"
            : "No answer / unable to reach · no price saved"}
        </div>
        <button type="button" onClick={() => onOpenCallback(route.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7c3e6] bg-white px-4 text-xs font-black text-[#6f5285]">
          <PhoneCall size={14} /> Try again
        </button>
      </div>
    );
  }

  if (capturedStatuses.includes(route.status)) {
    return (
      <button type="button" onClick={onCompare} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#e8b978] px-4 text-xs font-black text-white hover:bg-[#dda861]">
        View normalized result <ArrowRight size={14} />
      </button>
    );
  }

  if (route.status === "callback_ready") {
    return (
      <button type="button" onClick={() => onOpenCallback(route.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7c3e6] bg-[#faf6fd] px-4 text-xs font-black text-[#6f5285] hover:bg-[#f1e7f8]">
        <PhoneCall size={14} /> {route.isBrandedPhoneRehearsal ? `Demo call ${route.name}` : route.isSimulation ? `Call ${route.name}` : "Try private AI callback"}
      </button>
    );
  }

  if (route.status === "callback_queued") {
    return (
      <div className="space-y-2">
        <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d7c3e6] bg-[#faf6fd] px-4 text-xs font-black text-[#6f5285]">
          <LoaderCircle size={14} className="animate-spin" /> Monitoring live call
        </div>
        <button type="button" onClick={onRefreshCallback} disabled={refreshingCallback} className="block text-[0.64rem] font-black text-[#7a618a] disabled:opacity-50">
          <RefreshCw size={12} className={`mr-1 inline ${refreshingCallback ? "animate-spin" : ""}`} /> Check now
        </button>
      </div>
    );
  }

  if (["waiting_human", "manual_handoff", "access_blocked", "blocked"].includes(route.status)) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => onRunRoute(route.id)} disabled={activeRouteId != null} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d5d9d7] bg-white px-4 text-xs font-black text-[#61717a] disabled:cursor-not-allowed disabled:opacity-35">
          <RefreshCw size={14} /> Reconnect &amp; open quote form
        </button>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#d8c18f] bg-white/75 px-3 py-2.5 text-[0.65rem] text-[#78623d]"><span><strong className="text-[#65491f]">Premium:</strong> waiting for extension</span><span className="rounded-full bg-[#fff3d8] px-2 py-1 font-black uppercase tracking-[0.07em]">Unknown</span></div>
      </div>
    );
  }

  if (route.status === "queued" && !route.isSimulation) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => onRunRoute(route.id)} disabled={activeRouteId != null} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#253640] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35"><Play size={14} /> Open quote form</button>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#d9dcda] bg-white px-3 py-2.5 text-[0.65rem] text-[#758188]"><span><strong className="text-[#53656e]">Premium:</strong> not requested yet</span><span className="rounded-full bg-[#f1f2ee] px-2 py-1 font-black uppercase tracking-[0.07em]">Unknown</span></div>
      </div>
    );
  }

  if (activeStatuses.includes(route.status)) {
    return <div className="space-y-3"><span className="inline-flex min-h-10 items-center gap-2 px-2 text-xs font-black text-[#4a8189]"><LoaderCircle size={15} className="animate-spin" /> Official form open · use extension Autofill</span><p className="px-2 text-[0.6rem] font-bold text-[#6d8a90]">If the extension does not acknowledge the route, this card will stop automatically and show Retry.</p><button type="button" onClick={() => onRunRoute(route.id)} className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#b7dfe4] bg-white px-3 text-[0.65rem] font-black text-[#4a8189]"><RotateCcw size={13} /> Stop pending attempt</button><div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#b8dbe0] bg-white px-3 py-2.5 text-[0.65rem] text-[#558089]"><span><strong>Premium:</strong> listening for result</span><span className="rounded-full bg-[#e9f6f7] px-2 py-1 font-black uppercase tracking-[0.07em]">Pending</span></div></div>;
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {route.officialUrl && (
        <a href={route.officialUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d5d9d7] bg-white px-4 text-xs font-black text-[#61717a]">
          Official source <ExternalLink size={14} />
        </a>
      )}
      <div className="rounded-xl border border-dashed border-[#d9dcda] bg-white px-3 py-2 text-[0.65rem] text-[#758188]">Premium: <strong>Unavailable / unknown</strong></div>
    </div>
  );
}

type ResultLane = "automatic" | "checkpoint" | "followup";

function laneForRoute(route: AgentRoute): ResultLane {
  if (capturedStatuses.includes(route.status)) return "automatic";
  if (route.preferredLane === "phone") return "followup";
  if (route.tier === 3 || ["callback_ready", "callback_queued", "discovery_only", "not_applicable"].includes(route.status)) return "followup";
  return "checkpoint";
}

function CompactRouteCard(props: Omit<AgentSearchProps, "routes" | "events" | "runState" | "mappedRouteCount" | "onRestart"> & { route: AgentRoute }) {
  const { route, onMoveRoute } = props;
  const meta = route.isSimulation && route.status === "manual_handoff"
    ? statusMeta.rejected
    : statusMeta[route.status];
  const captured = capturedStatuses.includes(route.status) && route.quote != null;
  const movable = !route.isSimulation && !captured && !activeStatuses.includes(route.status);
  const inPhoneLane = route.preferredLane === "phone";
  return (
    <article
      draggable={movable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("application/x-reachrate-route", route.id);
        event.dataTransfer.setData("text/plain", route.id);
      }}
      className={`rounded-[16px] border bg-white p-4 shadow-[0_8px_22px_rgba(36,53,63,0.045)] transition ${movable ? "cursor-grab active:cursor-grabbing" : ""} ${inPhoneLane ? "border-[#d9c7e6]" : "border-black/[0.08]"}`}
      aria-label={`${route.name} ${movable ? "draggable route card" : "route card"}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] bg-white shadow-sm">{route.isSimulation && !route.isBrandedPhoneRehearsal ? <Bot size={20} className="text-[#76558b]" /> : <img src={faviconUrl(route.logoDomain)} alt={`${route.name} logo`} className="size-6 object-contain" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-black text-[#2a3e48]">{route.name}</h3>
            {(route.isBrandedPhoneRehearsal || route.isSimulation) && <span className="rounded-full bg-[#ede2f5] px-2 py-0.5 text-[0.52rem] font-black uppercase tracking-[0.08em] text-[#68447f]">{route.isBrandedPhoneRehearsal ? "Private rehearsal" : "Synthetic demo"}</span>}
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.06em] ${meta.className}`}>
              {meta.active && <LoaderCircle size={10} className="animate-spin" />}
              {captured && <CheckCircle2 size={10} />}
              {meta.label}
            </span>
          </div>
          <p className="mt-1 truncate text-[0.6rem] font-black text-[#5f7f86]">{route.isSimulation ? "Not an insurer · excluded from ranking" : routeRoleLabels[route.role]}</p>
          {!route.isSimulation && <p className="mt-0.5 truncate text-[0.56rem] text-[#879197]">{route.legalUnderwriter ? `Underwriter: ${route.legalUnderwriter}` : "Returned carrier must be captured before this price can rank"}</p>}
        </div>
        {movable && <GripVertical size={18} className="mt-1 shrink-0 text-[#a5aaab]" aria-hidden="true" />}
      </div>

      {route.isSimulation && route.status === "demo_complete" && route.demoPremiumAmount != null ? (
        <div className="mt-4 rounded-xl border border-[#b8dfd2] bg-[#edf8f4] p-3">
          <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#4d7e6d]">Success · price saved</span>
          <strong className="mt-1 block text-2xl tracking-[-0.04em] text-[#315d50]">C${route.demoPremiumAmount.toFixed(2)}<span className="ml-1 text-xs">/{route.demoPremiumPeriod === "annual" ? "year" : "mo"}</span></strong>
          <p className="mt-1 text-[0.6rem] font-bold text-[#55756b]">Synthetic demo only · excluded from official ranking</p>
        </div>
      ) : route.isSimulation && route.status === "rejected" ? (
        <div className="mt-4 rounded-xl border border-[#e5c4ca] bg-[#fff3f5] p-3">
          <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#914e5a]">Rejected · human requested</span>
          <strong className="mt-1 block text-sm text-[#77515a]">No price saved</strong>
        </div>
      ) : route.isSimulation && route.status === "unreachable" ? (
        <div className="mt-4 rounded-xl border border-[#d7c9df] bg-[#f7f2fa] p-3">
          <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#735d7e]">No answer · unable to reach</span>
          <strong className="mt-1 block text-sm text-[#6f6276]">No price saved · Try again</strong>
        </div>
      ) : route.quote ? (
        <div className="mt-4 rounded-xl bg-[#edf8f4] p-3">
          <span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#4d7e6d]">Evidence saved</span>
          <strong className="mt-1 block text-2xl tracking-[-0.04em] text-[#315d50]">${route.quote.monthlyPremium.toFixed(2)}<span className="ml-1 text-xs">/mo</span></strong>
        </div>
      ) : route.isBrandedPhoneRehearsal ? (
        <p className="mt-3 line-clamp-4 text-[0.7rem] leading-5 text-[#6d7b81]">Moved from the web queue for a private phone rehearsal. No insurer is contacted.</p>
      ) : (
        <p className="mt-3 line-clamp-4 text-[0.7rem] leading-5 text-[#6d7b81]">{route.blocker ?? route.userActionRequired ?? route.summary}</p>
      )}

      {!route.isSimulation && !route.isBrandedPhoneRehearsal && route.auditStatus && (
        <div className="mt-3 rounded-xl bg-[#f6f6f2] p-3 text-[0.62rem] leading-4 text-[#6f7d83]">
          <p><span className="font-black text-[#43565f]">Last live check:</span> {route.auditStatus.replaceAll("_", " ")}</p>
          {route.engineFamily && <p className="mt-1"><span className="font-black text-[#43565f]">Engine:</span> {route.engineFamily.replaceAll("_", " ")}</p>}
          {route.publicPhone && <p className="mt-1"><span className="font-black text-[#43565f]">Public phone:</span> {route.publicPhone}</p>}
        </div>
      )}

      {route.isBrandedPhoneRehearsal && (
        <div className="mt-3 rounded-xl bg-[#f6f1fa] p-3 text-[0.62rem] leading-4 text-[#705d7d]">
          <p><span className="font-black text-[#5c436d]">Official public phone:</span> {route.publicPhone}</p>
          <p className="mt-1"><span className="font-black text-[#5c436d]">Demo destination:</span> your configured private number</p>
        </div>
      )}

      <div className="mt-4 border-t border-black/[0.06] pt-3">
        <RouteActions {...props} route={route} />
        {movable && (
          <button
            type="button"
            onClick={() => onMoveRoute(route.id, inPhoneLane ? "web" : "phone")}
            className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-[0.65rem] font-black text-[#74578a] hover:bg-[#f7f0fb]"
          >
            {inPhoneLane ? <><RotateCcw size={13} /> Return to web quote</> : <><PhoneCall size={13} /> Move to phone demo</>}
          </button>
        )}
      </div>
    </article>
  );
}

export function AgentSearch({
  routes,
  events,
  runState,
  mappedRouteCount,
  activeRouteId,
  onRunRoute,
  onMoveRoute,
  onOpenCallback,
  onCompare,
  onRestart,
  onRefreshCallback,
  refreshingCallback,
}: AgentSearchProps) {
  const [expandedLanes, setExpandedLanes] = useState<Record<ResultLane, boolean>>({
    automatic: false,
    checkpoint: false,
    followup: false,
  });
  const [dragOverLane, setDragOverLane] = useState<"web" | "phone" | null>(null);
  const marketRoutes = routes.filter((route) => !route.isSimulation);
  const captured = marketRoutes.filter((route) => capturedStatuses.includes(route.status)).length;
  const attempted = marketRoutes.filter((route) => route.status !== "queued").length;
  const blockers = marketRoutes.filter((route) => route.preferredLane !== "phone" && route.status !== "queued" && !capturedStatuses.includes(route.status) && !activeStatuses.includes(route.status)).length;
  const lanes: Record<ResultLane, AgentRoute[]> = {
    automatic: marketRoutes.filter((route) => laneForRoute(route) === "automatic"),
    checkpoint: marketRoutes.filter((route) => laneForRoute(route) === "checkpoint"),
    followup: routes
      .filter((route) => laneForRoute(route) === "followup")
      .sort((a, b) => Number(Boolean(a.isSimulation)) - Number(Boolean(b.isSimulation))),
  };

  const sharedProps = { activeRouteId, onRunRoute, onMoveRoute, onOpenCallback, onCompare, onRefreshCallback, refreshingCallback };

  function dropRoute(event: DragEvent<HTMLElement>, lane: "web" | "phone") {
    event.preventDefault();
    const routeId = event.dataTransfer.getData("application/x-reachrate-route") || event.dataTransfer.getData("text/plain");
    setDragOverLane(null);
    if (routeId) onMoveRoute(routeId, lane);
  }

  return (
    <>
      <section className="border-b border-black/[0.06] bg-white/90">
        <div className="mx-auto flex max-w-[1220px] flex-col justify-between gap-5 px-5 py-8 md:flex-row md:items-center md:px-8">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black tracking-[-0.045em] text-[#263640]">Quote results</h1>
              <span className="rounded-full bg-[#eaf7f2] px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#3d7b66]">Evidence mode</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697780]">ReachRate separates captured prices, supervised web forms and private phone rehearsals. Only evidence returned from an official web journey enters market ranking.</p>
          </div>
          <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#a9dce3] bg-white px-5 text-sm font-black text-[#68aeb8] hover:bg-[#edf9fa]"><RotateCcw size={16} /> Change search depth</button>
        </div>
      </section>

      <main className="mx-auto grid max-w-[1220px] gap-8 px-5 py-8 md:px-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-5 lg:sticky lg:top-[96px] lg:h-fit">
          <section className="rounded-[18px] border border-black/[0.08] bg-white p-5 shadow-[0_12px_28px_rgba(36,53,63,0.06)]">
            <div className="flex items-center justify-between"><h2 className="text-sm font-black text-[#344750]">Run summary</h2><span className={`size-2.5 rounded-full ${runState === "running" ? "animate-pulse bg-[#75c1cb]" : "bg-[#62ad91]"}`} /></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[[marketRoutes.length, "market routes"], [attempted, "attempted"], [captured, "verified results"], [blockers, "terminal blockers"]].map(([value, label]) => (
                <div key={label as string} className="rounded-2xl bg-[#f7f6f2] p-3"><strong className="block text-2xl tracking-[-0.04em] text-[#31444d]">{value}</strong><span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.1em] text-[#7d898f]">{label}</span></div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-[#efd7e2] bg-[#fff7fa] p-4 text-xs leading-5 text-[#765b68]"><strong className="flex items-center gap-2 text-[#654b58]"><ShieldCheck size={15} /> What counts as a price</strong><p className="mt-2">Only a premium returned by an official journey and saved with coverage evidence enters comparison. The separate Registry currently tracks {mappedRouteCount} possible consumer journeys for audit and follow-up.</p></div>
          </section>

          <section className="overflow-hidden rounded-[18px] bg-[#243b45] text-white shadow-[0_16px_34px_rgba(28,48,58,0.18)]">
            <div className="border-b border-white/10 p-4"><div className="flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#9fd8de]"><Bot size={16} /> Agent trace</div></div>
            <div className="max-h-[420px] space-y-4 overflow-y-auto p-4">
              {events.length === 0 ? <p className="text-xs leading-5 text-white/55">Open an official quote form when you are ready; the supervised Agent trace will appear here.</p> : events.slice().reverse().map((event) => (
                <div key={event.id} className="flex gap-3 text-xs leading-5"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${event.tone === "success" ? "bg-[#7ed0ae]" : event.tone === "warning" ? "bg-[#f0bd72]" : event.tone === "active" ? "animate-pulse bg-[#8fd5dd]" : "bg-white/35"}`} /><div><p className="text-white/85">{event.message}</p><span className="mt-1 block text-[0.6rem] text-white/40">{event.at}</span></div></div>
              ))}
            </div>
          </section>
        </aside>

        <div>
          <section className={`flex flex-col justify-between gap-5 rounded-[20px] border p-6 md:flex-row md:items-center ${runState === "running" ? "border-[#bedfe2] bg-[#effafb]" : "border-[#bcded3] bg-[#eff9f5]"}`}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#4c8790] shadow-sm">{runState === "running" ? <LoaderCircle size={19} className="animate-spin" /> : <FileCheck2 size={19} />}</span>
              <div><p className="text-[0.64rem] font-black uppercase tracking-[0.12em] text-[#4b858d]">{runState === "running" ? "Live route in progress" : "Route pass available"}</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#2c414a]">{runState === "running" ? "The Agent is operating one visible journey." : `${captured} verified result${captured === 1 ? "" : "s"}; ${blockers} explicit blocker${blockers === 1 ? "" : "s"}.`}</h2><p className="mt-2 text-sm leading-6 text-[#64777e]">No pre-canned premium is injected. Open the ledger at any time to inspect source identity, coverage and unresolved routes.</p></div>
            </div>
            <button type="button" onClick={onCompare} disabled={attempted === 0} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#e8b978] px-5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Compare all results <ArrowRight size={16} /></button>
          </section>

          <section className="mt-8 space-y-5">
            {([
              {
                id: "automatic" as const,
                eyebrow: "Results layer 1 · captured automatically",
                title: `Verified prices (${lanes.automatic.filter((route) => capturedStatuses.includes(route.status)).length})`,
                description: "A price appears here only after the official result page returns it and you confirm its insurer, underwriter and coverage evidence.",
                icon: Bot,
                accent: "border-[#b8dfd2] bg-[#f2faf7] text-[#397561]",
                empty: "No verified web premium yet. Complete one official route below; the confirmed result will move here automatically.",
              },
              {
                id: "checkpoint" as const,
                eyebrow: "Results layer 2 · your review",
                title: `Needs your review (${lanes.checkpoint.length})`,
                description: "Open the quote form, let the extension Autofill the reviewed profile, complete only the named declaration or verification, then resume or send the visible price back.",
                icon: MousePointerClick,
                accent: "border-[#e9cf9f] bg-[#fff9eb] text-[#8a5b17]",
                empty: "No route currently needs a human checkpoint.",
              },
            ]).map((lane) => {
              const LaneIcon = lane.icon;
              const laneRoutes = lanes[lane.id];
              return (
                <section
                  key={lane.id}
                  aria-label={lane.id === "checkpoint" ? "Web quote lane" : "Verified price lane"}
                  onDragOver={lane.id === "checkpoint" ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverLane("web"); } : undefined}
                  onDragLeave={lane.id === "checkpoint" ? (event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverLane(null); } : undefined}
                  onDrop={lane.id === "checkpoint" ? (event) => dropRoute(event, "web") : undefined}
                  className={`min-w-0 rounded-[20px] border p-5 transition ${lane.accent} ${lane.id === "checkpoint" && dragOverLane === "web" ? "ring-4 ring-[#b8dfe4]/60" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><LaneIcon size={18} /></span>
                    <div>
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.13em] opacity-75">{lane.eyebrow}</p>
                      <h2 className="mt-1 text-lg font-black leading-6 tracking-[-0.035em] text-[#2c414a]">{lane.title}</h2>
                    </div>
                  </div>
                  <p className="mt-3 max-w-3xl text-[0.72rem] leading-5 text-[#6e7b82]">{lane.description}</p>
                  <div className="mt-4 grid gap-3 xl:grid-cols-2">
                    {laneRoutes.length > 0
                      ? laneRoutes.slice(0, expandedLanes[lane.id] ? laneRoutes.length : 6).map((route) => <CompactRouteCard key={route.id} {...sharedProps} route={route} />)
                      : <div className="rounded-[16px] border border-dashed border-current/25 bg-white/70 p-4 text-xs leading-5 opacity-70">{lane.empty}</div>}
                  </div>
                  {laneRoutes.length > 6 && (
                    <button type="button" onClick={() => setExpandedLanes((current) => ({ ...current, [lane.id]: !current[lane.id] }))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-current/20 bg-white px-4 text-xs font-black">
                      <ChevronDown size={15} className={`transition ${expandedLanes[lane.id] ? "rotate-180" : ""}`} />
                      {expandedLanes[lane.id] ? "Show fewer routes" : `Show ${laneRoutes.length - 6} more routes`}
                    </button>
                  )}
                </section>
              );
            })}

            <details
              aria-label="Phone demo lane"
              className={`group rounded-[20px] border border-[#d9c7e6] bg-[#faf6fd] p-5 text-[#73558a] transition ${dragOverLane === "phone" ? "ring-4 ring-[#d8bee8]/70" : ""}`}
              open
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverLane("phone"); }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverLane(null); }}
              onDrop={(event) => dropRoute(event, "phone")}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white shadow-sm"><PhoneCall size={18} /></span><span><span className="block text-[0.58rem] font-black uppercase tracking-[0.13em] opacity-75">Optional demo follow-up</span><strong className="mt-1 block text-lg text-[#2c414a]">Phone, broker and specialist routes ({lanes.followup.length})</strong></span></span>
                <ChevronDown size={19} className="transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-3xl text-[0.7rem] leading-5 text-[#6e7b82]">Drag any unfinished company card here—or use its Move to phone demo button. The card leaves the web lane, keeps its official public phone for context, and gains a private rehearsal button that calls only your allowlisted number. Demo Carrier 1 and 2 remain synthetic; all phone rehearsals stay outside market ranking.</p>
              <div className={`mt-4 rounded-xl border border-dashed px-4 py-3 text-center text-[0.68rem] font-black transition ${dragOverLane === "phone" ? "border-[#8e67a5] bg-white text-[#65447a]" : "border-[#cdb9da] bg-white/55 text-[#816b8e]"}`}>Drop a company card here to use the phone-demo path</div>
              <div className="mt-4 grid gap-3 xl:grid-cols-2">{lanes.followup.length > 0 ? lanes.followup.slice(0, expandedLanes.followup ? lanes.followup.length : 6).map((route) => <CompactRouteCard key={route.id} {...sharedProps} route={route} />) : <div className="rounded-[16px] border border-dashed border-current/25 bg-white/70 p-4 text-xs">No follow-up route in this search.</div>}</div>
              {lanes.followup.length > 6 && <button type="button" onClick={() => setExpandedLanes((current) => ({ ...current, followup: !current.followup }))} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-current/20 bg-white px-4 text-xs font-black"><ChevronDown size={15} className={`transition ${expandedLanes.followup ? "rotate-180" : ""}`} />{expandedLanes.followup ? "Show fewer phone routes" : `Show ${lanes.followup.length - 6} more phone routes`}</button>}
            </details>
          </section>
        </div>
      </main>
    </>
  );
}
