"use client";

import {
  BadgeCheck,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import type {
  AgentRoute,
  AgentRouteStatus,
  DriverProfile,
  ExtractedQuoteCandidate,
  RouteQuote,
} from "@/lib/demo-flow";

type ResultCaptureDialogProps = {
  route: AgentRoute;
  profile: DriverProfile;
  candidate?: ExtractedQuoteCandidate | null;
  onClose: () => void;
  onSave: (routeId: string, status: AgentRouteStatus, quote: RouteQuote) => void;
};

type BooleanChoice = "yes" | "no" | "unknown";

function toBoolean(value: BooleanChoice) {
  return value === "unknown" ? null : value === "yes";
}

export function ResultCaptureDialog({ route, profile, candidate, onClose, onSave }: ResultCaptureDialogProps) {
  const [resultType, setResultType] = useState<"quote" | "estimate">(() => candidate?.resultType ?? (route.resultSemantics === "estimate" ? "estimate" : "quote"));
  const [sourceBrand, setSourceBrand] = useState(candidate?.sourceBrand ?? route.name);
  const [underwriter, setUnderwriter] = useState(candidate?.legalUnderwriter ?? route.legalUnderwriter ?? "");
  const [insurerGroup, setInsurerGroup] = useState(route.insurerGroup ?? "");
  const [intermediary, setIntermediary] = useState(() => candidate?.intermediary ?? (
    ["comparison_platform", "licensed_broker", "direct_distributor", "exclusive_agent", "affinity"].includes(route.role)
      ? route.name
      : ""
  ));
  const [premium, setPremium] = useState(candidate ? String(candidate.premiumAmount) : "");
  const [period, setPeriod] = useState<"monthly" | "annual">(candidate?.premiumPeriod ?? "monthly");
  const [reference, setReference] = useState(candidate?.reference ?? "");
  const [sourceUrl, setSourceUrl] = useState(candidate?.sourceUrl ?? route.officialUrl ?? route.sourceUrl);
  const [liability, setLiability] = useState(profile.liabilityLimit);
  const [deductible, setDeductible] = useState(profile.deductible);
  const [collision, setCollision] = useState<BooleanChoice>("yes");
  const [comprehensive, setComprehensive] = useState<BooleanChoice>("yes");
  const [opcf44r, setOpcf44r] = useState<BooleanChoice>("yes");
  const [telematics, setTelematics] = useState<BooleanChoice>("no");
  const [evidence, setEvidence] = useState(candidate?.evidence ?? "");
  const [confirmed, setConfirmed] = useState(false);

  const parsedPremium = Number(premium);
  const intermediaryRoute = ["comparison_platform", "licensed_broker", "direct_distributor", "exclusive_agent", "affinity"].includes(route.role);
  const platformNeedsReturnedInsurer = route.resultSemantics === "returned_insurer_required" || intermediaryRoute;
  const underwriterLooksLikePlatform =
    underwriter.trim().toLowerCase() === route.name.trim().toLowerCase();
  const canSave = Boolean(
    Number.isFinite(parsedPremium) &&
      parsedPremium > 0 &&
      sourceBrand.trim() &&
      underwriter.trim() &&
      sourceUrl.trim() &&
      evidence.trim() &&
      confirmed &&
      !(platformNeedsReturnedInsurer && underwriterLooksLikePlatform),
  );

  const benchmarkMatch = useMemo(
    () =>
      Number(liability) === Number(profile.liabilityLimit) &&
      Number(deductible) === Number(profile.deductible) &&
      toBoolean(collision) === profile.collisionCoverage &&
      toBoolean(comprehensive) === profile.comprehensiveCoverage &&
      toBoolean(opcf44r) === profile.opcf44r &&
      toBoolean(telematics) === profile.telematics,
    [collision, comprehensive, deductible, liability, opcf44r, profile, telematics],
  );

  function save() {
    if (!canSave) return;
    const monthlyPremium = period === "monthly" ? parsedPremium : parsedPremium / 12;
    const annualPremium = period === "annual" ? parsedPremium : parsedPremium * 12;
    const status: AgentRouteStatus =
      resultType === "estimate"
        ? "estimate_only"
        : benchmarkMatch
          ? "quoted_comparable"
          : "quoted_non_comparable";

    onSave(route.id, status, {
      monthlyPremium,
      annualPremium,
      sourceBrand: sourceBrand.trim(),
      legalUnderwriter: underwriter.trim(),
      insurerGroup: insurerGroup.trim() || null,
      intermediary: intermediary.trim() || null,
      resultType,
      reference: reference.trim() || `page-capture-${new Date().toISOString()}`,
      sourceUrl: sourceUrl.trim(),
      capturedAt: new Date().toISOString(),
      coverage: {
        liability: liability ? Number(liability) : null,
        deductible: deductible ? Number(deductible) : null,
        collision: toBoolean(collision),
        comprehensive: toBoolean(comprehensive),
        opcf44r: toBoolean(opcf44r),
        telematics: toBoolean(telematics),
      },
      evidence: evidence.trim(),
      isLiveEvidence: true,
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#15242d]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="capture-title">
      <div className="mx-auto my-6 w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-[0_26px_80px_rgba(20,34,43,0.3)]">
        <header className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e8f7f3] text-[#3d806b]"><FileCheck2 size={23} /></span>
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-[#4e8b77]">Evidence gate</p>
              <h2 id="capture-title" className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#263b45]">Record an official {route.name} result</h2>
              <p className="mt-2 text-sm leading-6 text-[#6e7b82]">This form normalizes a result already visible on the official journey. It does not create or estimate a premium.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full text-[#708087] hover:bg-[#f3f3ef]" aria-label="Close result capture"><X size={20} /></button>
        </header>

        <div className="space-y-7 p-6 md:p-7">
          {platformNeedsReturnedInsurer && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#ead3a1] bg-[#fff9e9] p-4 text-sm leading-6 text-[#755526]">
              <CircleAlert size={19} className="mt-0.5 shrink-0" />
              <p><strong>{route.name} is an intermediary, not the insurer.</strong> Enter the carrier/legal underwriter shown in the returned result. A {route.name} premium with no returned insurer is rejected.</p>
            </div>
          )}

          {candidate && (
            <div className="flex items-start gap-3 rounded-2xl border border-[#b8dfd2] bg-[#edf8f4] p-4 text-sm leading-6 text-[#426b5d]">
              <BadgeCheck size={19} className="mt-0.5 shrink-0" />
              <p><strong>The browser extension prefilled this candidate from the official page.</strong> Verify every field against the visible insurer result before checking the evidence confirmation below.</p>
            </div>
          )}

          <section>
            <h3 className="text-sm font-black text-[#334750]">1. Source identity</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label><span className="label">Result type</span><select className="form-control" value={resultType} onChange={(event) => setResultType(event.target.value as "quote" | "estimate")} disabled={route.resultSemantics === "estimate"}><option value="quote">Official quote</option><option value="estimate">Estimate only</option></select></label>
              <label><span className="label">Consumer brand returned</span><input className="form-control" value={sourceBrand} onChange={(event) => setSourceBrand(event.target.value)} /></label>
              <label><span className="label">Legal underwriter shown</span><input className="form-control" value={underwriter} onChange={(event) => setUnderwriter(event.target.value)} placeholder="Required — never assume from a logo" /></label>
              <label><span className="label">Insurer group</span><input className="form-control" value={insurerGroup} onChange={(event) => setInsurerGroup(event.target.value)} placeholder="Optional if not shown" /></label>
              <label className="md:col-span-2"><span className="label">Distributor / intermediary</span><input className="form-control" value={intermediary} onChange={(event) => setIntermediary(event.target.value)} placeholder="Broker, comparison platform, agent or distributor" /></label>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-[#334750]">2. Price and evidence</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label><span className="label">Premium amount (CAD)</span><input className="form-control" type="number" min="0" step="0.01" value={premium} onChange={(event) => setPremium(event.target.value)} placeholder="0.00" /></label>
              <label><span className="label">Premium period</span><select className="form-control" value={period} onChange={(event) => setPeriod(event.target.value as "monthly" | "annual")}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
              <label><span className="label">Quote / reference ID</span><input className="form-control" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Optional; a timestamped page-capture ID is used if absent" /></label>
              <label><span className="label">Official result URL</span><input className="form-control" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label>
              <label className="md:col-span-2"><span className="label">Redacted evidence note</span><textarea className="form-control" value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="What the official result showed, what was redacted, and any validity/verification note." /></label>
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#334750]">3. Coverage returned</h3>
              <span className={`rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.08em] ${benchmarkMatch ? "bg-[#eaf7f2] text-[#397661]" : "bg-[#fff2df] text-[#8b5c1c]"}`}>{benchmarkMatch ? "Matches benchmark" : "Coverage difference"}</span>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label><span className="label">Liability limit</span><select className="form-control" value={liability} onChange={(event) => setLiability(event.target.value as DriverProfile["liabilityLimit"])}><option value="1000000">$1,000,000</option><option value="2000000">$2,000,000</option></select></label>
              <label><span className="label">Collision / comprehensive deductible</span><select className="form-control" value={deductible} onChange={(event) => setDeductible(event.target.value as DriverProfile["deductible"])}><option value="500">$500</option><option value="1000">$1,000</option><option value="2000">$2,000</option></select></label>
              {[
                ["Collision", collision, setCollision],
                ["Comprehensive", comprehensive, setComprehensive],
                ["OPCF 44R", opcf44r, setOpcf44r],
                ["Telematics", telematics, setTelematics],
              ].map(([label, value, setter]) => (
                <label key={label as string}>
                  <span className="label">{label as string}</span>
                  <select className="form-control" value={value as string} onChange={(event) => (setter as (choice: BooleanChoice) => void)(event.target.value as BooleanChoice)}>
                    <option value="yes">Included / yes</option><option value="no">Not included / no</option><option value="unknown">Unknown</option>
                  </select>
                </label>
              ))}
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#bee0d5] bg-[#f0faf6] p-4">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-[#4a9078]" />
            <span className="text-sm leading-6 text-[#42665a]"><strong>I captured this from the official result shown for this run.</strong> The amount is not invented, copied from another profile or taken from a marketing example.</span>
          </label>

          {platformNeedsReturnedInsurer && underwriterLooksLikePlatform && (
            <div className="flex items-start gap-3 rounded-xl bg-[#fff0f0] p-3 text-xs leading-5 text-[#914848]"><LockKeyhole size={16} className="mt-0.5 shrink-0" />The comparison platform cannot also be entered as the legal underwriter.</div>
          )}

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-black/[0.07] pt-5 sm:flex-row sm:items-center">
            <a href={route.officialUrl ?? route.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d5d9d7] bg-white px-4 text-sm font-black text-[#62717a]">Open official route <ExternalLink size={15} /></a>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#d5d9d7] bg-white px-4 text-sm font-black text-[#62717a]">Skip for now</button>
              <button type="button" onClick={save} disabled={!canSave} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#4e917b] px-5 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><BadgeCheck size={16} /> Confirm and add to comparison</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
