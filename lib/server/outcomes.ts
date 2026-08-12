import { randomUUID } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { callSupabasePersistence, listPublicDemoOutcomes } from "@/lib/server/supabase-edge";
import type { OutcomeStatus } from "@/lib/types";

type SaveOutcomeInput = {
  runId: string;
  registryId: string;
  marketName: string;
  status: OutcomeStatus;
  sourceChannel: "web" | "phone" | "broker" | "research";
  premiumAmount?: number | null;
  premiumPeriod?: "monthly" | "annual" | null;
  coverageSummary?: string;
  quoteReference?: string | null;
  blocker?: string | null;
  evidenceNote: string;
  evidenceUrl?: string | null;
  sourceBrand?: string | null;
  legalUnderwriter?: string | null;
  insurerGroup?: string | null;
  intermediary?: string | null;
  distinctRateSourceId?: string | null;
  resultKind?: "quote" | "estimate" | "blocker" | "handoff" | null;
  isSimulation: boolean;
  consentConfirmed?: boolean;
  providerConversationId?: string | null;
};

function annualize(
  premiumAmount: number | null | undefined,
  premiumPeriod: "monthly" | "annual" | null | undefined,
) {
  if (premiumAmount == null || premiumPeriod == null) return null;
  return premiumPeriod === "monthly" ? premiumAmount * 12 : premiumAmount;
}

export async function saveQuoteOutcome(input: SaveOutcomeInput) {
  const id = randomUUID();
  const capturedAt = new Date().toISOString();
  const simulationEvidence = input.isSimulation
    ? `Supervised private-number simulation; role-played values are excluded from market metrics. ${input.evidenceNote}`
    : input.evidenceNote;
  const record = {
    id,
    run_id: input.runId,
    registry_id: input.registryId,
    market_name: input.marketName,
    status: input.isSimulation && input.status !== "unreachable" ? "manual_handoff" : input.status,
    source_channel: input.sourceChannel,
    premium_amount: input.premiumAmount ?? null,
    premium_period: input.premiumPeriod ?? null,
    annual_premium: annualize(input.premiumAmount, input.premiumPeriod),
    coverage_summary: input.coverageSummary ?? "",
    quote_reference: input.isSimulation ? null : input.quoteReference ?? null,
    blocker: input.blocker ?? null,
    evidence_note: simulationEvidence,
    evidence_url: input.isSimulation ? null : input.evidenceUrl ?? null,
    source_brand: input.isSimulation ? null : input.sourceBrand ?? input.marketName,
    legal_underwriter: input.isSimulation ? null : input.legalUnderwriter ?? null,
    insurer_group: input.isSimulation ? null : input.insurerGroup ?? null,
    intermediary: input.isSimulation ? "Private voice rehearsal" : input.intermediary ?? null,
    distinct_rate_source_id: input.isSimulation ? "voice_simulation_not_market_source" : input.distinctRateSourceId ?? null,
    result_kind: input.isSimulation ? "handoff" : input.resultKind ?? null,
    captured_at: capturedAt,
    is_simulation: input.isSimulation,
    consent_confirmed: input.consentConfirmed ?? false,
    provider_conversation_id: input.providerConversationId ?? null,
  };

  const supabase = getSupabaseAdmin();

  if (!supabase) {
    const edgeResult = await callSupabasePersistence<{
      record: typeof record;
      persisted: true;
    }>("save_quote_outcome", record);
    if (edgeResult) return edgeResult;
    return { record, persisted: false as const };
  }

  const { error } = await supabase.from("quote_outcomes").insert(record);
  if (error) throw new Error(`Unable to persist quote outcome: ${error.message}`);

  return { record, persisted: true as const };
}

export async function saveVoiceHandoff(input: {
  runId: string;
  routeLabel: string;
  maskedDestination: string;
  conversationId: string | null;
  callSid: string | null;
  isSimulation: boolean;
}) {
  const record = {
    id: randomUUID(),
    run_id: input.runId,
    route_label: input.routeLabel,
    masked_destination: input.maskedDestination,
    provider_conversation_id: input.conversationId,
    provider_call_sid: input.callSid,
    status: "queued",
    is_simulation: input.isSimulation,
  };
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const edgeResult = await callSupabasePersistence<{ persisted: true }>(
      "save_voice_handoff",
      record,
    );
    return edgeResult ?? { persisted: false as const };
  }

  const { error } = await supabase.from("voice_handoffs").insert(record);

  if (error) throw new Error(`Unable to persist voice handoff: ${error.message}`);
  return { persisted: true as const };
}

export async function listQuoteOutcomes(runId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const edgeResult = await callSupabasePersistence<{
      records: Record<string, unknown>[];
      persisted: true;
    }>("list_quote_outcomes", { run_id: runId });
    if (edgeResult) return edgeResult;
    const publicDemoResult = await listPublicDemoOutcomes<{
      records: Record<string, unknown>[];
      persisted: true;
      scope: "redacted_phone_simulations";
    }>(runId);
    if (publicDemoResult) return publicDemoResult;
    return { records: [], persisted: false as const };
  }

  const { data, error } = await supabase
    .from("quote_outcomes")
    .select(
      "id,run_id,registry_id,market_name,status,source_channel,premium_amount,premium_period,annual_premium,coverage_summary,quote_reference,blocker,evidence_note,evidence_url,source_brand,legal_underwriter,insurer_group,intermediary,distinct_rate_source_id,result_kind,captured_at,is_simulation,consent_confirmed,provider_conversation_id",
    )
    .eq("run_id", runId)
    .order("captured_at", { ascending: false });

  if (error) throw new Error(`Unable to read quote outcomes: ${error.message}`);
  return { records: data ?? [], persisted: true as const };
}

export async function deleteRunData(runId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const edgeResult = await callSupabasePersistence<{ persisted: true }>(
      "delete_run_data",
      { run_id: runId },
    );
    return edgeResult ?? { persisted: false as const };
  }

  const deletionTargets = [
    { table: "evidence_records", column: "run_id" },
    { table: "quote_outcomes", column: "run_id" },
    { table: "voice_handoffs", column: "run_id" },
    { table: "route_attempts", column: "run_id" },
    { table: "quote_runs", column: "id" },
  ] as const;

  for (const target of deletionTargets) {
    const { error } = await supabase
      .from(target.table)
      .delete()
      .eq(target.column, runId);
    if (error) {
      throw new Error(`Unable to delete ${target.table}: ${error.message}`);
    }
  }

  const { error: logError } = await supabase.from("deletion_log").insert({
    run_id: runId,
    deletion_scope: "all_run_data",
    result: "deleted",
  });
  if (logError) {
    throw new Error(`Run data was deleted, but the deletion audit failed: ${logError.message}`);
  }

  return { persisted: true as const };
}
