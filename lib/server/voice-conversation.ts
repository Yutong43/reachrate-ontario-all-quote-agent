import { listQuoteOutcomes, saveQuoteOutcome } from "@/lib/server/outcomes";
import {
  asksForHuman,
  classifySyntheticVoiceResult,
  extractSpokenPremium,
  hasAffirmativeConsent,
} from "@/lib/voice-result-classifier";

const terminalStatuses = new Set(["done", "failed"]);

type ElevenLabsTranscriptItem = {
  role?: unknown;
  message?: unknown;
};

type ElevenLabsConversation = {
  status?: unknown;
  transcript?: unknown;
  conversation_initiation_client_data?: unknown;
};

type SafeVoiceOutcome = {
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
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function dynamicVariables(conversation: ElevenLabsConversation) {
  const initiation = asRecord(conversation.conversation_initiation_client_data);
  return asRecord(initiation.dynamic_variables);
}

function userMessages(conversation: ElevenLabsConversation) {
  if (!Array.isArray(conversation.transcript)) return [];
  return (conversation.transcript as ElevenLabsTranscriptItem[])
    .filter((item) => item.role === "user" && typeof item.message === "string")
    .map((item) => String(item.message).trim())
    .filter(Boolean)
    .slice(-20);
}

function safeOutcome(record: Record<string, unknown>): SafeVoiceOutcome {
  const premiumPeriod = record.premium_period === "monthly" || record.premium_period === "annual"
    ? record.premium_period
    : null;
  return {
    id: String(record.id ?? ""),
    registryId: String(record.registry_id ?? ""),
    outcomeStatus: String(record.status ?? "unresolved"),
    premiumAmount: typeof record.premium_amount === "number" ? record.premium_amount : null,
    premiumPeriod,
    annualPremium: typeof record.annual_premium === "number" ? record.annual_premium : null,
    coverageSummary: typeof record.coverage_summary === "string" ? record.coverage_summary : "",
    blocker: typeof record.blocker === "string" ? record.blocker : null,
    evidenceNote: typeof record.evidence_note === "string" ? record.evidence_note : "",
    capturedAt: String(record.captured_at ?? new Date().toISOString()),
  };
}

async function existingRouteOutcome(runId: string, registryId: string, conversationId: string) {
  const listed = await listQuoteOutcomes(runId);
  const records = Array.isArray(listed.records) ? listed.records as Record<string, unknown>[] : [];
  const exactMatch = records.find((record) => record.provider_conversation_id === conversationId);
  if (exactMatch) return safeOutcome(exactMatch);
  const providerIdsAreAvailable = records.some((record) => "provider_conversation_id" in record);
  if (providerIdsAreAvailable) return null;
  const match = records.find((record) =>
    record.registry_id === registryId &&
    record.source_channel === "phone" &&
    record.is_simulation === true
  );
  return match ? safeOutcome(match) : null;
}

export async function getSyntheticConversationStatus(conversationId: string) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}`,
    {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs conversation status returned HTTP ${response.status}.`);

  const conversation = await response.json() as ElevenLabsConversation;
  const providerStatus = typeof conversation.status === "string" ? conversation.status : "unknown";
  const variables = dynamicVariables(conversation);
  const runId = typeof variables.run_id === "string" ? variables.run_id : null;
  const registryId = typeof variables.demo_registry_id === "string" ? variables.demo_registry_id : null;
  const routeLabel = typeof variables.route_label === "string" ? variables.route_label : null;
  const isSimulation = variables.is_simulation === true || variables.is_simulation === "true";
  const terminal = terminalStatuses.has(providerStatus);

  if (!isSimulation || !runId || !registryId || !routeLabel) {
    return { providerStatus, terminal, outcome: null, message: "Waiting for verified simulation context." };
  }

  const existing = await existingRouteOutcome(runId, registryId, conversationId);
  if (existing) return { providerStatus, terminal, outcome: existing, message: "Structured demo outcome saved." };
  if (!terminal) {
    return { providerStatus, terminal: false, outcome: null, message: providerStatus === "in-progress" ? "Call connected." : "Call is being processed." };
  }

  const messages = userMessages(conversation);
  const classified = classifySyntheticVoiceResult(messages, registryId === "voice_simulation_demo_agent_1");
  const consentConfirmed = classified.consentConfirmed;
  const spokenPremium = classified.kind === "success" ? classified.premium : null;
  const profileSummary = typeof variables.profile_summary === "string"
    ? variables.profile_summary
    : "Synthetic Ontario auto-insurance profile.";
  const coverageSummary = typeof variables.coverage_summary === "string"
    ? variables.coverage_summary
    : "Synthetic demo coverage configuration.";

  // The provider tool usually writes the result before the conversation reaches
  // `done`. The redacted public read intentionally omits provider IDs, so use the
  // simulation registry ID as the second idempotency key before applying fallback
  // extraction from the terminal transcript.

  const terminalFailure = providerStatus === "failed";
  const capturedSpokenPrice = classified.kind === "success";
  const status = capturedSpokenPrice
    ? "manual_handoff" as const
    : classified.kind === "rejected"
      ? "manual_handoff" as const
      : "unreachable" as const;
  const blocker = capturedSpokenPrice
    ? null
    : status === "manual_handoff"
      ? "AI assistance was declined; human follow-up is required. No price was saved."
    : status === "unreachable"
      ? terminalFailure
        ? "The private demo call failed before a structured result was saved."
        : "The call ended before a consented spoken premium was captured."
      : null;

  const saved = await saveQuoteOutcome({
    runId,
    registryId,
    marketName: routeLabel,
    status,
    sourceChannel: "phone",
    premiumAmount: capturedSpokenPrice ? spokenPremium?.amount ?? null : null,
    premiumPeriod: capturedSpokenPrice ? spokenPremium?.period ?? null : null,
    coverageSummary: capturedSpokenPrice
      ? `${profileSummary} · ${coverageSummary} · Spoken numeric amount normalized to CAD for this synthetic demo.`
      : "No quote details collected.",
    blocker,
    evidenceNote: capturedSpokenPrice
      ? "Consent-confirmed spoken synthetic amount captured from the private-number rehearsal; no audio or transcript retained by ReachRate."
      : "Private-number rehearsal reached a terminal state without a market quote; no audio or transcript retained by ReachRate.",
    resultKind: "handoff",
    isSimulation: true,
    consentConfirmed,
    providerConversationId: conversationId,
  });

  return {
    providerStatus,
    terminal: true,
    outcome: safeOutcome(saved.record as Record<string, unknown>),
    message: capturedSpokenPrice
      ? `Synthetic spoken price captured: C$${spokenPremium?.amount.toFixed(2)} per ${spokenPremium?.period === "annual" ? "year" : "month"}.`
      : blocker,
  };
}

export const voiceConversationTestHelpers = {
  extractSpokenPremium,
  hasAffirmativeConsent,
  asksForHuman,
  classifySyntheticVoiceResult,
};
