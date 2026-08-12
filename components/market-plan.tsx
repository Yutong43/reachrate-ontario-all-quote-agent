"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ArrowRight,
  Check,
  Compass,
  Gauge,
  Globe2,
  LockKeyhole,
  Puzzle,
  Sparkles,
} from "lucide-react";

import {
  routeIdsForSearchScope,
  type DriverProfile,
  type SearchScope,
} from "@/lib/demo-flow";
import {
  executableRoutes,
  faviconUrl,
  routeCanReturnPrice,
  routeRoleLabels,
} from "@/lib/market-catalog";

type MarketPlanProps = {
  profile: DriverProfile;
  searchScope: SearchScope;
  selectedRouteIds: string[];
  onSearchScope: (scope: SearchScope) => void;
  onToggleRoute: (routeId: string) => void;
  onSelectAllRoutes: () => void;
  onClearAllRoutes: () => void;
  onBack: () => void;
  onRun: () => void;
  extensionReady: boolean;
  extensionVersion: string | null;
};

const scopeOptions: Array<{
  id: SearchScope;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
  icon: typeof Gauge;
}> = [
  {
    id: "recommended",
    eyebrow: "Best live-demo path",
    title: "Recommended shortlist",
    description: "Start with six recognizable direct and comparison routes, prioritized for a clear supervised demo.",
    note: `${routeIdsForSearchScope("recommended").length} recommended routes`,
    icon: Gauge,
  },
  {
    id: "explore",
    eyebrow: "Broader search",
    title: "Explore every suitable route",
    description: "Try all currently mapped web journeys that can plausibly accept this planned-vehicle profile.",
    note: `${routeIdsForSearchScope("explore").length} suitable routes`,
    icon: Compass,
  },
  {
    id: "all",
    eyebrow: "All price-capable entrances",
    title: "Choose every quote route",
    description: "Show every direct, broker, comparison and eligible program entrance that can return a carrier price.",
    note: `${routeIdsForSearchScope("all").length} price-capable routes`,
    icon: Globe2,
  },
];

function ProfileSummary({ profile }: { profile: DriverProfile }) {
  return (
    <div className="grid gap-3 rounded-[18px] border border-[#cce6e7] bg-[#f3fbfb] p-4 text-xs text-[#4d7880] sm:grid-cols-3">
      <div><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#7f9095]">Vehicle</span><strong className="mt-1 block text-[#304f57]">{profile.vehicleYear} {profile.vehicleMake} {profile.vehicleModel}</strong></div>
      <div><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#7f9095]">Use</span><strong className="mt-1 block text-[#304f57]">{Number(profile.annualKilometres).toLocaleString("en-CA")} km/year · {profile.commuteKilometres} km commute</strong></div>
      <div><span className="block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#7f9095]">Driver</span><strong className="mt-1 block text-[#304f57]">{profile.postalCode} · Ontario {profile.licenceClass} · first licensed {profile.firstLicensedYear}</strong></div>
    </div>
  );
}

export function MarketPlan({
  profile,
  searchScope,
  selectedRouteIds,
  onSearchScope,
  onToggleRoute,
  onSelectAllRoutes,
  onClearAllRoutes,
  onBack,
  onRun,
  extensionReady,
  extensionVersion,
}: MarketPlanProps) {
  const extensionCurrent = extensionReady && ["0.5.1", "0.5.2"].includes(extensionVersion ?? "");
  const routeCount = selectedRouteIds.length;
  const recommendedIds = routeIdsForSearchScope("recommended");
  const recommendedRoutes = recommendedIds
    .map((routeId) => executableRoutes.find((route) => route.id === routeId))
    .filter((route): route is (typeof executableRoutes)[number] => route != null);
  const allRoutes = routeIdsForSearchScope("all")
    .map((routeId) => executableRoutes.find((route) => route.id === routeId))
    .filter((route): route is (typeof executableRoutes)[number] => route != null);
  const referenceRoutes = executableRoutes.filter((route) => !routeCanReturnPrice(route));

  return (
    <>
      <section className="border-b border-black/[0.06] bg-white/90">
        <div className="mx-auto max-w-[1120px] px-5 py-7 md:px-8">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#8e6278]">Step 2 · choose search depth</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-[-0.045em] text-[#263640]">How widely should ReachRate search?</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#697780]">You are choosing the breadth of the Agent run—not an insurer. Individual routes and their exact checkpoints appear on the next screen.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c8e4e6] bg-[#f2fbfb] px-3 py-2 text-[0.65rem] font-black text-[#4a7e85]"><Sparkles size={14} /> No VIN profile ready</span>
          </div>
          <div className="mt-5"><ProfileSummary profile={profile} /></div>
        </div>
      </section>

      <main className="mx-auto max-w-[1120px] px-5 py-8 md:px-8">
        <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Search depth">
          {scopeOptions.map((option) => {
            const selected = searchScope === option.id;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSearchScope(option.id)}
                className={`group min-h-[220px] rounded-[20px] border p-5 text-left transition ${selected ? "border-[#79bec7] bg-[#effafa] shadow-[0_14px_34px_rgba(70,135,145,0.12)]" : "border-black/[0.08] bg-white hover:border-[#b7dce0] hover:bg-[#fbffff]"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid size-11 place-items-center rounded-xl ${selected ? "bg-[#d9f1f2] text-[#397983]" : "bg-[#f5f4ef] text-[#64747b]"}`}><Icon size={20} /></span>
                  <span className={`grid size-6 place-items-center rounded-full border ${selected ? "border-[#65adb7] bg-[#65adb7] text-white" : "border-[#cbd3d4] text-transparent"}`}><Check size={14} /></span>
                </div>
                <p className="mt-5 text-[0.6rem] font-black uppercase tracking-[0.12em] text-[#8d6578]">{option.eyebrow}</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#2d414a]">{option.title}</h2>
                <p className="mt-2 text-xs leading-5 text-[#68777e]">{option.description}</p>
                <p className="mt-4 text-[0.64rem] font-black uppercase tracking-[0.08em] text-[#4d858d]">{option.note}</p>
              </button>
            );
          })}
        </div>

        <section className="mt-6 grid gap-4 rounded-[20px] border border-black/[0.07] bg-white p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8e6278]">Recommended route preview</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedRoutes.map((route) => (
                <div key={route.id} className="flex min-w-0 items-center gap-3 rounded-xl border border-black/[0.07] bg-[#fafaf7] p-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-white shadow-sm"><img src={faviconUrl(route.logoDomain)} alt="" className="size-5 object-contain" /></span>
                  <span><strong className="block text-sm text-[#30434c]">{route.name}</strong><span className="mt-0.5 block text-[0.62rem] text-[#7c898e]">Official quote intake · human checkpoint possible</span></span>
                </div>
              ))}
            </div>
          </div>
          <p className="max-w-xs text-xs leading-5 text-[#6f7d83]">These are starting routes, not promised prices. A premium only enters comparison after it appears on an official result page and you confirm the evidence.</p>
        </section>

        {searchScope === "all" && (
          <section className="mt-6 rounded-[20px] border border-[#c6e0e2] bg-[#f5fbfb] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#4e8188]">Choose exact destinations</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.035em] text-[#2d414a]">{selectedRouteIds.length} of {allRoutes.length} price-capable routes selected</h2>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-[#6c7a80]">A route is a place ReachRate can request a price. It may be an insurer, agent, broker or comparison platform. Any returned price is attributed to the legal underwriter—not automatically to the website brand.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onSelectAllRoutes} className="min-h-10 rounded-xl border border-[#b9dadd] bg-white px-4 text-xs font-black text-[#4b7e85]">Select all</button>
                <button type="button" onClick={onClearAllRoutes} className="min-h-10 rounded-xl border border-[#d7dad8] bg-white px-4 text-xs font-black text-[#6c787e]">Clear</button>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allRoutes.map((route) => {
                const selected = selectedRouteIds.includes(route.id);
                return (
                  <label key={route.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected ? "border-[#8bc7ce] bg-white shadow-sm" : "border-black/[0.06] bg-white/55 opacity-70 hover:opacity-100"}`}>
                    <input type="checkbox" checked={selected} onChange={() => onToggleRoute(route.id)} className="size-4 shrink-0 accent-[#559aa4]" />
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-black/[0.06] bg-white"><img src={faviconUrl(route.logoDomain)} alt="" className="size-5 object-contain" /></span>
                    <span className="min-w-0"><strong className="block truncate text-xs text-[#334850]">{route.name}</strong><span className="mt-0.5 block truncate text-[0.58rem] font-bold text-[#5f7f86]">{routeRoleLabels[route.role]}</span><span className="mt-0.5 block truncate text-[0.55rem] text-[#8a9599]">{route.legalUnderwriter ? `Underwriter: ${route.legalUnderwriter}` : "Returned carrier required"}</span></span>
                  </label>
                );
              })}
            </div>
            <details className="mt-5 rounded-xl border border-[#d8dfdc] bg-white/70 p-4">
              <summary className="cursor-pointer text-xs font-black text-[#66777e]">Excluded from quote run ({referenceRoutes.length} reference-only routes)</summary>
              <p className="mt-2 text-[0.68rem] leading-5 text-[#7a868b]">These remain in the market registry but cannot produce a comparable price for this profile.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {referenceRoutes.map((route) => <div key={route.id} className="rounded-lg bg-[#f5f5f1] px-3 py-2 text-[0.65rem] text-[#6e7a80]"><strong className="text-[#455860]">{route.name}</strong> · {routeRoleLabels[route.role]}</div>)}
              </div>
            </details>
          </section>
        )}

        <section className={`mt-6 flex flex-col justify-between gap-4 rounded-[18px] border p-4 md:flex-row md:items-center ${extensionCurrent ? "border-[#b8dfd2] bg-[#eef8f4]" : "border-[#ead3a1] bg-[#fff9e9]"}`}>
          <div className="flex items-start gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm ${extensionCurrent ? "text-[#397661]" : "text-[#91621f]"}`}><Puzzle size={18} /></span>
            <div>
              <p className={`text-[0.62rem] font-black uppercase tracking-[0.1em] ${extensionCurrent ? "text-[#397661]" : "text-[#91621f]"}`}>{extensionCurrent ? `Extension connected · v${extensionVersion}` : extensionReady ? `Reload extension · loaded v${extensionVersion}` : "Extension required for autofill"}</p>
              <p className="mt-1 text-xs leading-5 text-[#68777f]">{extensionCurrent ? "The active ReachRate profile, Autofill, price detection and manual result return are ready." : "Reload the unpacked ReachRate Quote Copilot after this update, then refresh the app."}</p>
            </div>
          </div>
          <code className="max-w-full overflow-x-auto rounded-lg bg-white px-3 py-2 text-[0.6rem] text-[#726046]">browser-extension · v{extensionVersion ?? "0.5.2"}</code>
        </section>

        <section className="mt-6 flex flex-col justify-between gap-4 rounded-[18px] border border-black/[0.08] bg-white p-4 shadow-[0_14px_36px_rgba(36,53,63,0.08)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#f5e6ed] text-[#8d6277]"><LockKeyhole size={18} /></span><div><strong className="block text-sm text-[#31444e]">{routeCount} routes in this search</strong><span className="block text-xs text-[#7b888e]">The next page separates captured prices from routes that need your click.</span></div></div>
          <div className="flex gap-3"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-[#d6d9d7] bg-white px-4 text-sm font-black text-[#617079]">Back</button><button type="button" onClick={onRun} disabled={routeCount === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#e8b978] px-5 text-sm font-black text-white shadow-sm hover:bg-[#dda861] disabled:cursor-not-allowed disabled:opacity-40">Find quotes <ArrowRight size={16} /></button></div>
        </section>
      </main>
    </>
  );
}
