"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowLeft,
  Bot,
  Building2,
  ExternalLink,
  FileSearch,
  Layers3,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  executableRoutes,
  faviconUrl,
  hasBrowserAdapter,
  insurerGroupReferences,
  type MarketAccessClass,
} from "@/lib/market-catalog";
import { marketRegistry } from "@/lib/market-registry";
import { routeAudit, routeAuditById } from "@/lib/route-audit";

type RegistryTab = "groups" | "entities" | "journeys";

const accessMeta: Record<MarketAccessClass, { label: string; className: string }> = {
  direct_online: { label: "Direct web path", className: "bg-[#e8f6f1] text-[#397661]" },
  broker_panel: { label: "Broker panel", className: "bg-[#eef2fa] text-[#5a6e91]" },
  mutual_local: { label: "Local mutual", className: "bg-[#f4edf9] text-[#73558a]" },
  high_net_worth: { label: "HNW broker", className: "bg-[#fff1dd] text-[#895d21]" },
  residual: { label: "Residual market", className: "bg-[#fff0e9] text-[#915a3f]" },
  commercial_specialty: { label: "Not standard PPA", className: "bg-[#f1f2ef] text-[#657078]" },
};

const accessOrder: MarketAccessClass[] = [
  "direct_online",
  "broker_panel",
  "mutual_local",
  "high_net_worth",
  "residual",
  "commercial_specialty",
];

function BrandMark({ domain, name }: { domain: string; name: string }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-black/[0.07] bg-white shadow-sm"><img src={faviconUrl(domain)} alt={`${name} logo`} className="size-6 object-contain" /></span>;
}

function normalized(value: string) {
  return value.toLowerCase().trim();
}

export function MarketRegistryView() {
  const [tab, setTab] = useState<RegistryTab>("groups");
  const [query, setQuery] = useState("");
  const [accessFilter, setAccessFilter] = useState<MarketAccessClass | "all">("all");
  const entityRows = useMemo(() => insurerGroupReferences.flatMap((group) => group.legalEntities.map((entity) => ({ entity, group }))), []);
  const term = normalized(query);

  const groups = insurerGroupReferences.filter((group) => {
    if (accessFilter !== "all" && group.accessClass !== accessFilter) return false;
    if (!term) return true;
    return normalized(group.group).includes(term) || group.legalEntities.some((entity) => normalized(entity).includes(term));
  });
  const entities = entityRows.filter(({ entity, group }) => {
    if (accessFilter !== "all" && group.accessClass !== accessFilter) return false;
    if (!term) return true;
    return normalized(entity).includes(term) || normalized(group.group).includes(term);
  });
  const journeys = marketRegistry.filter((record) => {
    if (!term) return true;
    return [record.brand_or_program, record.legal_underwriter, record.insurer_group, record.distribution_type].some((value) => normalized(value).includes(term));
  });

  return (
    <div className="min-h-screen bg-[#fffdfc] text-[#253640]">
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[76px] max-w-[1280px] items-center justify-between gap-5 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#253640] text-white"><Layers3 size={20} /></span><span><span className="block text-xl font-black tracking-[-0.055em]">market registry</span><span className="block text-[0.6rem] font-black uppercase tracking-[0.16em] text-[#8a969b]">ReachRate · Ontario PPA</span></span></Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#bddfe2] bg-white px-4 text-sm font-black text-[#548d95]"><ArrowLeft size={16} /> Back to quote flow</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">
        <section className="grid gap-7 rounded-[24px] border border-[#c7dfe1] bg-[#f3fbfb] p-6 shadow-[0_16px_40px_rgba(64,125,134,0.08)] md:grid-cols-[1fr_0.9fr] md:p-8">
          <div><p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#8e6278]">Seed, ownership and consumer routes</p><h1 className="mt-2 text-4xl font-black tracking-[-0.055em] text-[#263b45]">The market is larger than 32 labels.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#64767d]">Appendix A contains 32 regulatory groups and 60 legal entities. Consumer brands, broker panels, affinity programs and locators create additional journeys—but overlapping routes must be deduplicated before they count as distinct rates.</p></div>
          <div className="grid grid-cols-2 gap-3">
            {[["32", "seed groups"], ["60", "legal entities"], [String(marketRegistry.length), "mapped journeys"], [String(routeAudit.confirmed_price_count), "confirmed prices"]].map(([value, label]) => <div key={label} className="rounded-[18px] border border-white bg-white/90 p-4 shadow-sm"><strong className="block text-3xl tracking-[-0.05em] text-[#2c414a]">{value}</strong><span className="mt-1 block text-[0.61rem] font-black uppercase tracking-[0.1em] text-[#7a878d]">{label}</span></div>)}
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-3 rounded-[18px] border border-[#ead6a8] bg-[#fff9e9] p-5 text-xs leading-5 text-[#745b36] md:flex-row md:items-center md:justify-between">
          <p><strong className="text-[#654818]">Real browser verification:</strong> {routeAudit.deep_attempt_count} online journeys were pushed to a concrete result or checkpoint on {routeAudit.audited_at}; none returned a premium without applicant-controlled address, contact consent, declaration, licence/VIN or CAPTCHA.</p>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 font-black uppercase tracking-[0.08em] text-[#8a6428]">No fabricated prices</span>
        </section>

        <section className="mt-6 grid gap-3 md:grid-cols-2">
          {insurerGroupReferences.filter((group) => group.currentMarketNote).map((group) => <div key={group.id} className="rounded-[18px] border border-[#ead3a1] bg-[#fff9e9] p-4"><p className="text-[0.62rem] font-black uppercase tracking-[0.1em] text-[#95651f]">2026 ownership crosswalk · {group.group}</p><p className="mt-2 text-xs leading-5 text-[#765a31]">{group.currentMarketNote}</p></div>)}
        </section>

        <section className="mt-8 overflow-hidden rounded-[22px] border border-black/[0.08] bg-white">
          <div className="flex flex-col gap-4 border-b border-black/[0.07] p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([ ["groups", "32 groups", Building2], ["entities", "60 legal entities", ShieldCheck], ["journeys", `${marketRegistry.length} journeys`, Bot] ] as Array<[RegistryTab, string, typeof Bot]>).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-black ${tab === id ? "bg-[#253640] text-white" : "border border-[#d6d9d7] bg-white text-[#64737b]"}`}><Icon size={15} />{label}</button>)}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative block min-w-[260px]"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#819097]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search group, entity or route" className="min-h-11 w-full rounded-xl border border-[#d6d9d7] bg-white pl-10 pr-4 text-sm outline-none focus:border-[#8fcbd2]" /></label>
              {tab !== "journeys" && <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as MarketAccessClass | "all")} className="min-h-11 rounded-xl border border-[#d6d9d7] bg-white px-3 text-xs font-black text-[#5f6f77] outline-none"><option value="all">All access types</option>{accessOrder.map((key) => <option key={key} value={key}>{accessMeta[key].label}</option>)}</select>}
            </div>
          </div>

          {tab === "groups" && <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-xs"><thead className="border-b border-black/[0.06] bg-[#fbfaf7] text-[0.61rem] font-black uppercase tracking-[0.1em] text-[#78858b]"><tr><th className="px-5 py-3">Group</th><th className="px-5 py-3">Access reality</th><th className="px-5 py-3">Legal entities</th><th className="px-5 py-3">Validation / current note</th><th className="px-5 py-3">Official</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{groups.map((group) => { const meta = accessMeta[group.accessClass]; return <tr key={group.id} className="align-top hover:bg-[#fcfbf8]"><td className="px-5 py-4"><div className="flex items-center gap-3"><BrandMark domain={group.logoDomain} name={group.group} /><strong className="text-sm text-[#2f434d]">{group.group}</strong></div></td><td className="max-w-xs px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.07em] ${meta.className}`}>{meta.label}</span><p className="mt-3 leading-5 text-[#65747c]">{group.accessSummary}</p></td><td className="max-w-md px-5 py-4 leading-5 text-[#627078]">{group.legalEntities.join(" · ")}</td><td className="max-w-xs px-5 py-4 leading-5 text-[#69777e]"><p>{group.validationNote}</p>{group.currentMarketNote && <p className="mt-2 font-bold text-[#8b5d20]">{group.currentMarketNote}</p>}</td><td className="px-5 py-4"><a href={group.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-[#4e8a93]">Open <ExternalLink size={11} /></a></td></tr>; })}</tbody></table></div>}

          {tab === "entities" && <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-black/[0.06] bg-[#fbfaf7] text-[0.61rem] font-black uppercase tracking-[0.1em] text-[#78858b]"><tr><th className="px-5 py-3">#</th><th className="px-5 py-3">Legal entity in seed</th><th className="px-5 py-3">Regulatory group</th><th className="px-5 py-3">Consumer access class</th><th className="px-5 py-3">Important distinction</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{entities.map(({ entity, group }, index) => { const meta = accessMeta[group.accessClass]; return <tr key={`${group.id}-${entity}`} className="align-top hover:bg-[#fcfbf8]"><td className="px-5 py-4 font-mono text-[#8a969b]">{String(index + 1).padStart(2, "0")}</td><td className="px-5 py-4 font-black text-[#314650]">{entity}</td><td className="px-5 py-4">{group.group}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.07em] ${meta.className}`}>{meta.label}</span></td><td className="max-w-md px-5 py-4 leading-5 text-[#66757d]">A legal entity is not automatically a separate consumer quote. Count it only when the returned evidence proves a distinct current rate source.</td></tr>; })}</tbody></table></div>}

          {tab === "journeys" && <div className="overflow-x-auto"><table className="w-full min-w-[1380px] text-left text-xs"><thead className="border-b border-black/[0.06] bg-[#fbfaf7] text-[0.61rem] font-black uppercase tracking-[0.1em] text-[#78858b]"><tr><th className="px-5 py-3">Journey / brand</th><th className="px-5 py-3">Distribution</th><th className="px-5 py-3">Underwriter rule</th><th className="px-5 py-3">Agent capability</th><th className="px-5 py-3">2026-08-11 verified outcome</th><th className="px-5 py-3">Required next step / phone</th><th className="px-5 py-3">Source</th></tr></thead><tbody className="divide-y divide-black/[0.06]">{journeys.map((record) => { const definition = executableRoutes.find((route) => route.registryId === record.registry_id); const adapter = definition ? hasBrowserAdapter(definition.id) : false; const audit = definition ? routeAuditById.get(definition.id) : undefined; return <tr key={record.registry_id} className="align-top hover:bg-[#fcfbf8]"><td className="px-5 py-4"><strong className="block text-sm text-[#2f434d]">{record.brand_or_program}</strong><span className="mt-1 block font-mono text-[0.6rem] text-[#879399]">{record.registry_id}</span></td><td className="px-5 py-4">{record.distribution_type.replaceAll("_", " ")}</td><td className="max-w-xs px-5 py-4 leading-5">{record.legal_underwriter}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.07em] ${adapter ? "bg-[#e8f6f1] text-[#397661]" : "bg-[#f4edf9] text-[#73558a]"}`}>{adapter ? "Visible-tab adapter" : "Handoff / reference"}</span><p className="mt-2 text-[0.65rem] leading-5 text-[#65747c]">Licence: {String(record.requirements.requires_licence)} · VIN: {String(record.requirements.requires_VIN)} · Human: {String(record.requirements.requires_human)}</p></td><td className="max-w-md px-5 py-4 leading-5 text-[#65747c]">{audit ? <><span className="rounded-full bg-[#fff3dc] px-2 py-1 text-[0.58rem] font-black uppercase tracking-[0.06em] text-[#885b1c]">{audit.audit_status.replaceAll("_", " ")}</span><p className="mt-2">{audit.test_depth}</p><p className="mt-1 font-black text-[#8c4f4f]">Price returned: {audit.price_returned ? "yes" : "no"}</p></> : record.terms_or_automation_notes}</td><td className="max-w-sm px-5 py-4 leading-5 text-[#65747c]">{audit?.user_action_required ?? record.terms_or_automation_notes}{audit?.public_phone && <p className="mt-2 font-black text-[#40545e]">{audit.public_phone}</p>}</td><td className="px-5 py-4">{record.evidence_url ? <a href={record.evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-black text-[#4e8a93]">Evidence <ExternalLink size={11} /></a> : "—"}</td></tr>; })}</tbody></table></div>}

          <div className="flex items-start gap-3 border-t border-black/[0.07] bg-[#fbfaf7] p-5 text-xs leading-5 text-[#68777e]"><FileSearch size={17} className="mt-0.5 shrink-0 text-[#6aaebb]" /><p><strong className="text-[#40545e]">Counting rule:</strong> 32 groups, 60 legal entities and {marketRegistry.length} mapped consumer journeys are three different denominators. Only an evidence-backed, non-duplicate returned rate enters the price comparison.</p></div>
        </section>
      </main>
    </div>
  );
}
