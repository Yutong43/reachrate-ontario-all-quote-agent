"use client";

import {
  ArrowRight,
  Bot,
  Check,
  CircleAlert,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  PhoneCall,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import type { AgentRoute, DriverProfile } from "@/lib/demo-flow";

type CallbackDialogProps = {
  route: AgentRoute | null;
  profileAccurate: boolean;
  representationAuthorized: boolean;
  simulationAcknowledged: boolean;
  callState: "idle" | "calling" | "queued" | "connected" | "complete" | "error";
  callMessage: string;
  onProfileAccurate: (checked: boolean) => void;
  onRepresentationAuthorized: (checked: boolean) => void;
  onSimulationAcknowledged: (checked: boolean) => void;
  onClose: () => void;
  onPlaceCall: () => void;
};

export function CallbackDialog({
  route,
  profileAccurate,
  representationAuthorized,
  simulationAcknowledged,
  callState,
  callMessage,
  onProfileAccurate,
  onRepresentationAuthorized,
  onSimulationAcknowledged,
  onClose,
  onPlaceCall,
}: CallbackDialogProps) {
  if (!route) return null;
  const ready =
    profileAccurate &&
    representationAuthorized &&
    simulationAcknowledged;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#15242d]/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="callback-title"
    >
      <section className="my-6 w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-[0_26px_80px_rgba(20,34,43,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f0e8f7] text-[#74578a]">
              <PhoneCall size={23} />
            </span>
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-[#8d607a]">
                {route.isBrandedPhoneRehearsal ? "Private rehearsal · branded phone fallback" : route.isSimulation ? "Synthetic demo · voice agent" : "Tier 3 · voice handoff"}
              </p>
              <h2 id="callback-title" className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#263b45]">
                {route.isBrandedPhoneRehearsal ? `Authorize private rehearsal for ${route.name}` : route.isSimulation ? `Authorize ${route.name}` : "Authorize an AI callback rehearsal"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6e7b82]">
                ReachRate will call your private demo number. {route.isBrandedPhoneRehearsal ? `${route.name}'s official public line is shown for context, but this demo does not call the company.` : route.isSimulation ? `${route.name} is a synthetic company card used only to demonstrate the call workflow.` : `It will not call ${route.name}; you can role-play the representative safely on camera.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-[#708087] transition hover:bg-[#f3f3ef]"
            aria-label="Close callback authorization"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 md:p-7">
          <div className="rounded-2xl border border-[#e4d8ec] bg-[#fcf9fe] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[#816393]">
                  {route.isBrandedPhoneRehearsal ? "Displayed market route · private call destination" : "Simulated destination"}
                </p>
                <p className="mt-1 text-lg font-black text-[#344650]">{route.name}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1.5 text-[0.65rem] font-black text-[#7b5c8d]">
                Run remains excluded from rankings
              </span>
            </div>
            <ol className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Disclose that the caller is an automated assistant.",
                "State that it represents the applicant and is not a licensed broker.",
                "Ask permission to continue and save a structured, non-audio demo summary.",
                route.demoScenario === "human_handoff"
                  ? "Say ‘No, I want to talk to a real person’; the card will show Rejected · human requested and save no price."
                  : "After Yes, state a numeric price such as ‘200 per month’ or ‘220 pounds per month’; the Agent will save C$200/mo or C$220/mo as a successful synthetic result.",
              ].map((item, index) => (
                <li key={item} className="flex gap-3 rounded-xl bg-white p-3 text-xs leading-5 text-[#606d74]">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#efe5f5] text-[0.65rem] font-black text-[#725487]">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <label className="mt-6 block">
            <span className="label">Private demo phone number</span>
            <input
              className="form-control"
              value="Configured private number"
              readOnly
              aria-label="Configured private demo number"
            />
            <span className="mt-2 block text-xs leading-5 text-[#7b878d]">
              The full allowlisted number stays hidden during recording. {route.publicPhone ? `${route.name}'s official public line is ${route.publicPhone}; it will not be dialled by this demo.` : "Only your configured private number will be dialled."}
            </span>
          </label>

          <div className="mt-5 space-y-3">
            {[
              {
                checked: profileAccurate,
                onChange: onProfileAccurate,
                label: "I confirm the profile is accurate for the rehearsal or clearly hypothetical.",
              },
              {
                checked: representationAuthorized,
                onChange: onRepresentationAuthorized,
                label: `I authorize the ReachRate AI to run the ${route.name} rehearsal with my own number.`,
              },
              {
                checked: simulationAcknowledged,
                onChange: onSimulationAcknowledged,
                label: "I understand this call goes to my own private number and any spoken price is a simulation, not a market quote.",
              },
            ].map((item) => (
              <label key={item.label} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.07] bg-[#fbfaf7] p-4">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) => item.onChange(event.target.checked)}
                  className="mt-1 size-4 accent-[#6eaf9b]"
                />
                <span className="text-sm leading-6 text-[#51616a]">{item.label}</span>
              </label>
            ))}
          </div>

          {callMessage && (
            <div
              className={`mt-5 flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ${
                callState === "error"
                  ? "border border-[#efc6c6] bg-[#fff2f2] text-[#8d4848]"
                  : "border border-[#bfe1d5] bg-[#eff9f5] text-[#3d6f5f]"
              }`}
            >
              {callState === "error" ? (
                <CircleAlert size={19} className="mt-0.5 shrink-0" />
              ) : (
                <Check size={19} className="mt-0.5 shrink-0" />
              )}
              {callMessage}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-xl border border-[#d5d9d7] bg-white px-5 text-sm font-black text-[#62717a]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPlaceCall}
              disabled={!ready || callState === "calling" || callState === "queued" || callState === "connected"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#9fd5dc] px-6 text-sm font-black text-[#173f45] shadow-sm transition hover:bg-[#8bcbd4] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {callState === "calling" ? (
                <LoaderCircle size={17} className="animate-spin" />
              ) : callState === "queued" || callState === "connected" || callState === "complete" ? (
                <Check size={17} />
              ) : (
                <Bot size={17} />
              )}
              {callState === "calling"
                ? "Requesting call…"
                : callState === "queued"
                  ? "Call queued"
                  : callState === "connected"
                    ? "Call connected"
                    : callState === "complete"
                      ? "Call complete"
                  : "Authorize and call me"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type CheckpointDialogProps = {
  route: AgentRoute | null;
  profile: DriverProfile;
  onClose: () => void;
  onResume: (permissions: { address: boolean; contact: boolean }) => void;
};

export function CheckpointDialog({ route, profile, onClose, onResume }: CheckpointDialogProps) {
  const [shareAddress, setShareAddress] = useState(false);
  const [shareContact, setShareContact] = useState(false);

  if (!route) return null;
  const checkpointText = `${route.checkpointKind ?? ""} ${route.blocker ?? ""}`;
  const needsAddress = /address|garaging|parking/i.test(checkpointText);
  const needsContact = /contact|email|phone|follow.?up/i.test(checkpointText);
  const hasAddress = Boolean(profile.streetAddress.trim());
  const hasContact = Boolean(profile.contactEmail.trim() && profile.contactPhone.trim());

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#15242d]/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkpoint-title"
    >
      <section className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-[0_26px_80px_rgba(20,34,43,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff3d9] text-[#966522]">
              <Fingerprint size={22} />
            </span>
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.15em] text-[#9a6a28]">
                Human checkpoint
              </p>
              <h2 id="checkpoint-title" className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#263b45]">
                {route.name} needs you for one step
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6e7b82]">
                The Agent paused instead of bypassing a verification or making a declaration for you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full text-[#708087] hover:bg-[#f3f3ef]"
            aria-label="Close human checkpoint"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-[#ead3a1] bg-[#fff9e9] p-5">
            <div className="flex items-center gap-2 text-sm font-black text-[#75501d]">
              <LockKeyhole size={18} />
              Exact checkpoint
            </div>
            <p className="mt-2 text-sm leading-6 text-[#80633d]">
              {route.blocker ?? "Complete the visible CAPTCHA or identity-consent step in the opened route."}
            </p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f1f8f6] p-4 text-sm leading-6 text-[#46665d]">
            <ShieldCheck size={19} className="mt-0.5 shrink-0" />
            <p>
              Complete only the requested verification. Do not enter a fabricated VIN or licence number. Then return here and resume the Agent.
            </p>
          </div>

          {(needsAddress || needsContact) && (
            <div className="mt-5 space-y-3 rounded-2xl border border-[#cfe1e1] bg-[#f7fbfb] p-5">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#4e8187]">
                Optional one-route autofill permission
              </p>
              <p className="text-xs leading-5 text-[#687980]">
                This approval applies only to the connected {route.name} tab in this run. It never approves a declaration, licence lookup, CAPTCHA, marketing consent, purchase or payment.
              </p>
              {needsAddress && (
                <label className={`flex items-start gap-3 rounded-xl border p-3 ${hasAddress ? "cursor-pointer border-[#c9dedc] bg-white" : "border-[#ead8b1] bg-[#fff9ea]"}`}>
                  <input type="checkbox" checked={shareAddress} disabled={!hasAddress} onChange={(event) => setShareAddress(event.target.checked)} className="mt-1 size-4 accent-[#4f9080]" />
                  <span className="text-xs leading-5 text-[#586a72]"><strong>Prefill my session-only street address on this route.</strong> {hasAddress ? "You must still review it and select any official address suggestion yourself." : "No street address is saved in the current profile; enter it manually on the official page or return to Edit profile."}</span>
                </label>
              )}
              {needsContact && (
                <label className={`flex items-start gap-3 rounded-xl border p-3 ${hasContact ? "cursor-pointer border-[#c9dedc] bg-white" : "border-[#ead8b1] bg-[#fff9ea]"}`}>
                  <input type="checkbox" checked={shareContact} disabled={!hasContact} onChange={(event) => setShareContact(event.target.checked)} className="mt-1 size-4 accent-[#4f9080]" />
                  <span className="text-xs leading-5 text-[#586a72]"><strong>Prefill my session-only email and phone on this route.</strong> {hasContact ? "Any follow-up or marketing consent remains an explicit manual click." : "Email and phone are missing; enter them manually on the official page or return to Edit profile."}</span>
                </label>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            {route.officialUrl && (
              <a
                href={route.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d5d9d7] bg-white px-5 text-sm font-black text-[#62717a]"
              >
                Open visible route
                <ExternalLink size={16} />
              </a>
            )}
            <button
              type="button"
              onClick={() => onResume({ address: shareAddress && hasAddress, contact: shareContact && hasContact })}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#e8b978] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#dda861]"
            >
              Verification complete · Resume
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
