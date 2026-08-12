"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Filter,
  PhoneCall,
  RotateCcw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { buildSubmissionAuditRoutes } from "@/lib/demo-flow";
import type { AgentRoute, DemoPhoneOutcome, DriverProfile, RouteQuote } from "@/lib/demo-flow";
import { faviconUrl } from "@/lib/market-catalog";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 }).format(value);
}

function matchesBenchmark(quote: RouteQuote, profile: DriverProfile) {
  return (
    quote.resultType === "quote" &&
    quote.coverage.liability === Number(profile.liabilityLimit) &&
    quote.coverage.deductible === Number(profile.deductible) &&
    quote.coverage.collision === profile.collisionCoverage &&
    quote.coverage.comprehensive === profile.comprehensiveCoverage &&
    quote.coverage.opcf44r === profile.opcf44r &&
    quote.coverage.telematics === profile.telematics
  );
}

function outcomeLabel(route: AgentRoute) {
  const labels: Record<AgentRoute["status"], string> = {
    queued: "Not attempted",
    navigating: "Opening route",
    filling: "Agent filling",
    waiting_human: "Human checkpoint",
    quoted_comparable: "Quoted · comparable",
    quoted_non_comparable: "Quoted · coverage differs",
    estimate_only: "Estimate only",
    manual_handoff: "Manual handoff",
    callback_ready: "Callback required",
    callback_queued: "Callback queued",
    demo_complete: "Success · price saved",
    rejected: "Rejected · human requested",
    unreachable: "No answer · unable to reach",
    vin_required: "VIN required",
    terms_restricted: "Blocked by terms",
    discovery_only: "Discovery only",
    not_applicable: "Not applicable",
    access_blocked: "Access blocked",
    blocked: "Blocked",
  };
  return labels[route.status];
}

function CoverageValue({ value }: { value: boolean | null }) {
  if (value == null) return <span className="text-[#7c878c]">Unknown</span>;
  return value ? <span className="inline-flex items-center gap-1 text-[#3d806c]"><Check size={13} /> Included</span> : <span className="text-[#8a6262]">Not included</span>;
}

export function QuoteComparison({
  profile,
  routes,
  phoneDemoOutcomes,
  onBack,
  onRestart,
}: {
  profile: DriverProfile;
  routes: AgentRoute[];
  phoneDemoOutcomes: DemoPhoneOutcome[];
  onBack: () => void;
  onRestart: () => void;
}) {
  const [includeEstimates, setIncludeEstimates] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const marketRoutes = routes.filter((route) => !route.isSimulation);
  const capturedRoutes = marketRoutes.filter((route) => route.quote != null);
  const comparableRoutes = capturedRoutes.filter((route) => route.quote && matchesBenchmark(route.quote, profile));
  const estimateRoutes = capturedRoutes.filter((route) => route.quote?.resultType === "estimate");
  const blockedRoutes = marketRoutes.filter((route) => route.quote == null && !["queued", "navigating", "filling"].includes(route.status));
  const currentRunAuditRoutes = marketRoutes.filter((route) => route.normalizedAuditOutcome != null);
  const showingPriorAudit = currentRunAuditRoutes.length === 0;
  const normalizedAuditRoutes = showingPriorAudit ? buildSubmissionAuditRoutes() : currentRunAuditRoutes;

  const rankedRoutes = capturedRoutes
    .filter((route) => includeEstimates || route.quote?.resultType === "quote")
    .sort((a, b) => (a.quote?.annualPremium ?? Number.POSITIVE_INFINITY) - (b.quote?.annualPremium ?? Number.POSITIVE_INFINITY));
  const selectedRoute = capturedRoutes.find((route) => route.id === selectedRouteId) ?? null;
  const bestComparable = [...comparableRoutes].sort(
    (a, b) => (a.quote?.annualPremium ?? Number.POSITIVE_INFINITY) - (b.quote?.annualPremium ?? Number.POSITIVE_INFINITY),
  )[0] ?? null;

  return (
    <>
      <section className="border-b border-black/[0.06] bg-white/90">
        <div className="mx-auto flex max-w-[1220px] flex-col justify-between gap-5 px-5 py-8 md:flex-row md:items-center md:px-8">
          <div>
            <p className="text-[0.67rem] font-black uppercase tracking-[0.14em] text-[#8e6278]">Coverage first · evidence always</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#263640]">Verified quote and blocker ledger</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#697780]">The visited website, distributor, legal underwriter and insurer group stay separate. Estimates are excluded from price ranking unless you explicitly include them.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#d4d8d6] bg-white px-4 text-sm font-black text-[#64737b]"><ArrowLeft size={16} /> Agent run</button>
            <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#a9dce3] bg-white px-4 text-sm font-black text-[#68aeb8]"><RotateCcw size={16} /> New run</button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1220px] space-y-8 px-5 py-8 md:px-8 md:py-10">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            [marketRoutes.length, "selected market routes"],
            [capturedRoutes.length, "evidenced prices"],
            [comparableRoutes.length, "comparable quotes"],
            [estimateRoutes.length, "estimates"],
            [blockedRoutes.length, "blockers / handoffs"],
            [phoneDemoOutcomes.length, "private phone demos"],
          ].map(([value, label]) => (
            <div key={label as string} className="rounded-[16px] border border-black/[0.07] bg-white p-4 shadow-sm"><strong className="block text-2xl tracking-[-0.04em] text-[#2e424c]">{value}</strong><span className="mt-1 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[#7a878d]">{label}</span></div>
          ))}
        </section>

        <section className="overflow-hidden rounded-[20px] border border-[#c4dfe2] bg-[#f4fbfb]">
          <div className="grid gap-6 p-6 md:grid-cols-[0.8fr_1.2fr] md:p-7">
            <div>
              <div className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#4d8790]"><ShieldCheck size={16} /> Comparison benchmark</div>
              <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#2d414a]">Coverage differences come before price.</h2>
              <p className="mt-2 text-sm leading-6 text-[#65777e]">This is a disclosed comparison configuration, not insurance advice. A cheaper quote with different limits stays unranked.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Liability", `$${Number(profile.liabilityLimit).toLocaleString("en-CA")}`],
                ["DCPD", "Included"],
                ["Collision", profile.collisionCoverage ? "Included" : "Not included"],
                ["Comprehensive", profile.comprehensiveCoverage ? "Included" : "Not included"],
                ["Deductible", `$${Number(profile.deductible).toLocaleString("en-CA")}`],
                ["OPCF 44R / telematics", `${profile.opcf44r ? "Included" : "Not included"} / ${profile.telematics ? "Enabled" : "No"}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white bg-white/90 p-3"><span className="block text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#829097]">{label}</span><strong className="mt-1 block text-xs text-[#40545e]">{value}</strong></div>
              ))}
            </div>
          </div>
        </section>

        {normalizedAuditRoutes.length > 0 && (
          <section className="overflow-hidden rounded-[20px] border border-[#b9d9d3] bg-[#f3faf7]">
            <div className="flex flex-col justify-between gap-4 border-b border-[#cfe4dd] p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[0.63rem] font-black uppercase tracking-[0.12em] text-[#4c816f]">{showingPriorAudit ? "Prior redacted supervised audit" : "Redacted supervised audit"} · 2026-08-11</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#304a40]">{normalizedAuditRoutes.length} normalized outcomes use one common schema.</h2>
                <p className="mt-1 text-xs leading-5 text-[#62776f]">{showingPriorAudit ? "This prior audit is displayed separately from the live run above. " : ""}These are evidence-backed blockers and handoffs—not quotes. Requested coverage, returned coverage, next action, timestamp and evidence lineage remain visible.</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#4c816f]">0 official premiums</span>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-3">
              {normalizedAuditRoutes.map((route) => {
                const outcome = route.normalizedAuditOutcome!;
                return (
                  <article key={route.id} className="rounded-[17px] border border-white bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><strong className="text-sm text-[#304a40]">{route.name}</strong><p className="mt-1 text-[0.62rem] leading-5 text-[#74847e]">{route.legalUnderwriter ?? "Returned insurer required"}</p></div>
                      <span className="rounded-full bg-[#fff1dc] px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#8a5d20]">{outcomeLabel(route)}</span>
                    </div>
                    <dl className="mt-4 space-y-3 text-xs leading-5 text-[#5f7069]">
                      <div><dt className="font-black text-[#40564d]">Requested coverage</dt><dd>$2M liability · $1,000 deductible · collision + comprehensive · OPCF 44R · no telematics</dd></div>
                      <div><dt className="font-black text-[#40564d]">Returned coverage</dt><dd>No policy coverage returned</dd></div>
                      <div><dt className="font-black text-[#40564d]">Coverage difference</dt><dd>{outcome.coverageDifferences.join(" ")}</dd></div>
                      <div><dt className="font-black text-[#40564d]">Next action</dt><dd>{outcome.nextAction}</dd></div>
                    </dl>
                    <div className="mt-4 border-t border-black/[0.07] pt-4 text-[0.65rem] leading-5 text-[#7a8983]">
                      <p>{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(outcome.capturedAt))} UTC · confidence {outcome.confidence}</p>
                      <p className="mt-1 font-mono">{outcome.reference ?? "No reference returned"}</p>
                      <p className="mt-1 font-mono break-all">{outcome.evidenceArtifact}</p>
                    </div>
                    <a href={route.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-[#4e8790]">Open evidence source <ExternalLink size={13} /></a>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section className={`flex flex-col justify-between gap-5 rounded-[20px] border p-6 md:flex-row md:items-center ${bestComparable ? "border-[#b9dfd2] bg-[#eff9f5]" : "border-[#ead3a1] bg-[#fff9e9]"}`}>
          <div className="flex items-start gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow-sm ${bestComparable ? "text-[#43806d]" : "text-[#946521]"}`}><Scale size={20} /></span>
            <div>
              <p className={`text-[0.62rem] font-black uppercase tracking-[0.12em] ${bestComparable ? "text-[#43806d]" : "text-[#946521]"}`}>Evidence-based recommendation</p>
              {bestComparable?.quote ? (
                <>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#30454d]">Best comparable result: {bestComparable.quote.sourceBrand} at {formatMoney(bestComparable.quote.monthlyPremium)}/month.</h2>
                  <p className="mt-2 text-sm leading-6 text-[#61747b]">It is currently the lowest evidenced quote that matches the selected liability, deductible and coverage benchmark. Confirm the live premium before purchase.</p>
                </>
              ) : capturedRoutes.length > 0 ? (
                <>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#30454d]">No result is comparable enough to recommend yet.</h2>
                  <p className="mt-2 text-sm leading-6 text-[#74684f]">At least one price was captured, but its coverage differs or it is only an estimate. Resolve the missing coverage evidence before ranking it.</p>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#30454d]">No real insurer recommendation yet.</h2>
                  <p className="mt-2 text-sm leading-6 text-[#74684f]">No official premium has been evidenced for this run. Complete one or more human checkpoints and save the returned underwriter, price and coverage; synthetic phone demos do not affect this decision.</p>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#68777e]">Demo results excluded</span>
        </section>

        <section>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-[0.64rem] font-black uppercase tracking-[0.13em] text-[#98637c]">Price comparison</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#2d414a]">Official results only</h2></div>
            <button type="button" onClick={() => setIncludeEstimates((value) => !value)} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-xs font-black ${includeEstimates ? "border-[#91cbd2] bg-[#edf9fa] text-[#3f7880]" : "border-[#d3d8d6] bg-white text-[#63727a]"}`}><Filter size={14} /> {includeEstimates ? "Estimates included" : "Estimates excluded"}</button>
          </div>

          {rankedRoutes.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-[#cfd5d2] bg-white p-10 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f2f6f4] text-[#698078]"><FileCheck2 size={22} /></span>
              <h3 className="mt-4 text-xl font-black tracking-[-0.03em] text-[#344750]">No evidenced premium has been captured yet.</h3>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#718087]">Return to Agent Run, operate an official route, then record the returned underwriter, premium, coverage, reference ID and source URL. ReachRate will not invent a showcase result.</p>
              <button type="button" onClick={onBack} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#253640] px-5 text-sm font-black text-white"><ArrowLeft size={16} /> Continue live run</button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {rankedRoutes.map((route, index) => {
                const quote = route.quote!;
                const comparable = matchesBenchmark(quote, profile);
                return (
                  <article key={route.id} className={`flex flex-col rounded-[20px] border bg-white p-5 shadow-[0_12px_30px_rgba(36,53,63,0.06)] ${comparable && index === 0 ? "border-[#8dcab7]" : "border-black/[0.08]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-black/[0.07] bg-white"><img src={faviconUrl(route.logoDomain)} alt={`${route.name} logo`} className="size-7 object-contain" /></span><div className="min-w-0"><h3 className="truncate font-black text-[#2d414a]">{quote.sourceBrand}</h3><p className="mt-1 truncate text-[0.65rem] text-[#75838a]">via {quote.intermediary ?? route.name}</p></div></div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.08em] ${comparable ? "bg-[#eaf7f2] text-[#397661]" : quote.resultType === "estimate" ? "bg-[#eef2fa] text-[#5c6f92]" : "bg-[#fff2df] text-[#8b5c1c]"}`}>{comparable ? "Comparable" : quote.resultType === "estimate" ? "Estimate" : "Coverage differs"}</span>
                    </div>
                    <div className="mt-5"><strong className="text-3xl tracking-[-0.05em] text-[#25414a]">{formatMoney(quote.monthlyPremium)}</strong><span className="ml-1 text-xs font-black text-[#617079]">/mo</span><p className="mt-1 text-xs font-bold text-[#748188]">{formatMoney(quote.annualPremium)} / year</p></div>
                    <div className="mt-5 border-y border-black/[0.07] py-4 text-xs leading-5 text-[#5e6e76]"><p><span className="font-black text-[#3f535d]">Legal underwriter:</span> {quote.legalUnderwriter}</p><p className="mt-2"><span className="font-black text-[#3f535d]">Insurer group:</span> {quote.insurerGroup ?? "Not shown"}</p></div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><p><span className="block text-[0.6rem] font-black uppercase tracking-[0.08em] text-[#879399]">Liability</span><strong>{quote.coverage.liability == null ? "Unknown" : formatMoney(quote.coverage.liability)}</strong></p><p><span className="block text-[0.6rem] font-black uppercase tracking-[0.08em] text-[#879399]">Deductible</span><strong>{quote.coverage.deductible == null ? "Unknown" : formatMoney(quote.coverage.deductible)}</strong></p><p><span className="block text-[0.6rem] font-black uppercase tracking-[0.08em] text-[#879399]">Collision</span><strong><CoverageValue value={quote.coverage.collision} /></strong></p><p><span className="block text-[0.6rem] font-black uppercase tracking-[0.08em] text-[#879399]">Comprehensive</span><strong><CoverageValue value={quote.coverage.comprehensive} /></strong></p></div>
                    <div className="mt-5 flex items-center justify-between gap-3"><a href={quote.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-[#4e8790]">Evidence source <ExternalLink size={13} /></a><button type="button" onClick={() => setSelectedRouteId(route.id)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-black ${selectedRouteId === route.id ? "bg-[#eaf7f2] text-[#397661]" : "border border-[#b5dce1] bg-white text-[#4d8790]"}`}>{selectedRouteId === route.id ? <CheckCircle2 size={14} /> : <BadgeCheck size={14} />}{selectedRouteId === route.id ? "Selected" : "Follow up"}</button></div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[20px] border border-[#d9c7e6] bg-[#faf6fd]">
          <div className="flex flex-col justify-between gap-4 border-b border-[#dfd0e9] p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#76558b] shadow-sm"><PhoneCall size={20} /></span>
              <div><p className="text-[0.63rem] font-black uppercase tracking-[0.12em] text-[#85629a]">Synthetic phone demo</p><h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#4e3d5b]">Demo Carrier 1 and Demo Carrier 2 stay outside market ranking.</h2><p className="mt-1 text-xs leading-5 text-[#796986]">This lane proves AI disclosure, spoken-price capture and a declined-AI human handoff. Neither card represents a real company or insurer quote.</p></div>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[0.6rem] font-black uppercase tracking-[0.09em] text-[#76558b]">Simulation · not comparable</span>
          </div>

          {phoneDemoOutcomes.length === 0 ? (
            <div className="p-6 text-sm leading-6 text-[#786982]">No synthetic call result has been saved in this run. Run Demo Carrier 1 for a spoken-price capture or Demo Carrier 2 for a declined-AI human handoff; both remain outside official comparison.</div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {phoneDemoOutcomes.map((outcome) => {
                const primaryPeriod = outcome.premiumPeriod === "annual" ? "year" : "mo";
                const annual = outcome.annualPremium ?? (outcome.premiumAmount == null ? null : outcome.premiumPeriod === "monthly" ? outcome.premiumAmount * 12 : outcome.premiumAmount);
                return (
                  <article key={outcome.id} className="rounded-[17px] border border-white bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-[#4f405b]">{outcome.routeLabel}</strong><span className="rounded-full bg-[#f1e8f7] px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#76558b]">Demo result</span></div>
                    <div className="mt-4">{outcome.premiumAmount == null ? <strong className="text-lg text-[#695b72]">{outcome.outcomeStatus === "manual_handoff" ? "Rejected · human requested · no price" : "No answer · no price captured"}</strong> : <><strong className="text-3xl tracking-[-0.05em] text-[#4f405b]">{formatMoney(outcome.premiumAmount)}</strong><span className="ml-1 text-xs font-black text-[#7b6a85]">/{primaryPeriod}</span><p className="mt-1 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#4d7e6d]">Success · synthetic CAD demo result</p>{annual != null && <p className="mt-1 text-xs text-[#887792]">Role-play annualized amount: {formatMoney(annual)}</p>}</>}</div>
                    {outcome.blocker && <p className="mt-3 text-xs font-bold leading-5 text-[#76558b]">{outcome.blocker}</p>}
                    {outcome.coverageSummary && <p className="mt-4 rounded-xl bg-[#faf6fd] p-3 text-xs leading-5 text-[#74627e]">{outcome.coverageSummary}</p>}
                    <p className="mt-4 text-[0.65rem] leading-5 text-[#897992]">Saved {new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(outcome.capturedAt))} · Supabase simulation record</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[20px] border border-black/[0.07] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-black/[0.07] p-5"><div className="flex items-center gap-2 text-sm font-black text-[#33464f]"><Scale size={18} className="text-[#6db8c3]" /> Complete market outcome ledger</div><span className="text-xs font-bold text-[#7d898f]">{marketRoutes.length} market {marketRoutes.length === 1 ? "route" : "routes"} · demo cards listed separately</span></div>
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[1080px] border-separate border-spacing-y-2 text-left text-xs">
              <thead className="text-[0.61rem] font-black uppercase tracking-[0.1em] text-[#758188]"><tr><th className="px-4 py-2">Route / role</th><th className="px-4 py-2">Legal underwriter</th><th className="px-4 py-2">Outcome</th><th className="px-4 py-2">Annual price</th><th className="px-4 py-2">Evidence / blocker</th><th className="px-4 py-2">Source</th></tr></thead>
              <tbody>{marketRoutes.map((route) => (
                <tr key={route.id} className="bg-[#f8f7f3] text-[#52636c]">
                  <td className="rounded-l-2xl px-4 py-4"><p className="font-black text-[#2d414a]">{route.name}</p><p className="mt-1 text-[0.65rem] text-[#819096]">{route.role.replaceAll("_", " ")}</p></td>
                  <td className="max-w-[230px] px-4 py-4">{route.quote?.legalUnderwriter ?? route.legalUnderwriter ?? "Must be captured from result"}</td>
                  <td className="px-4 py-4 font-black">{outcomeLabel(route)}</td>
                  <td className="px-4 py-4">{route.quote ? formatMoney(route.quote.annualPremium) : "—"}</td>
                  <td className="max-w-md px-4 py-4 leading-5">{route.quote?.evidence ?? route.blocker ?? route.evidenceNote}</td>
                  <td className="rounded-r-2xl px-4 py-4"><a href={route.quote?.sourceUrl ?? route.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-[#4e8790]">Open <ExternalLink size={12} /></a>{route.quote && <p className="mt-1 font-mono text-[0.6rem] text-[#879399]">{route.quote.reference}</p>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        {selectedRoute && (
          <section className="flex flex-col justify-between gap-4 rounded-[20px] border border-[#bddfd3] bg-[#f0faf6] p-6 md:flex-row md:items-center"><div className="flex items-start gap-3"><FileCheck2 size={22} className="mt-0.5 shrink-0 text-[#4d927b]" /><div><p className="font-black text-[#304a40]">{selectedRoute.quote?.sourceBrand} marked for follow-up</p><p className="mt-1 text-sm leading-6 text-[#5f746c]">ReachRate saved the selection only. Confirm the live premium and coverage with the named insurer or licensed intermediary before taking action.</p></div></div><span className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-black text-[#4d7f6e]">No purchase made</span></section>
        )}

        {blockedRoutes.length > 0 && (
          <section className="rounded-[20px] border border-[#ecd8af] bg-[#fffaf0] p-6"><div className="flex items-start gap-3"><CircleAlert size={21} className="mt-0.5 shrink-0 text-[#a6742e]" /><div><p className="font-black text-[#6f4c1c]">Unpriced routes remain visible</p><p className="mt-1 text-sm leading-6 text-[#80633c]">{blockedRoutes.length} {blockedRoutes.length === 1 ? "route" : "routes"} ended at a callback, verification gate, VIN requirement, terms restriction or another exact blocker. They remain in the denominator and evidence ledger.</p></div></div></section>
        )}

        <p className="flex items-center justify-center gap-2 text-center text-xs text-[#7a878d]"><CheckCircle2 size={14} className="text-[#4b8d76]" /> No quote, estimate or intermediary is mislabeled as an insurer.</p>
      </main>
    </>
  );
}
