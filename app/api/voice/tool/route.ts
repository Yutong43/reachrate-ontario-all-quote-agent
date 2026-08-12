import { z } from "zod";

import { saveQuoteOutcome } from "@/lib/server/outcomes";
import { constantTimeEqual, getBearerToken } from "@/lib/server/secrets";

const snakeCaseVoiceToolSchema = z.object({
  run_id: z.string().min(1).max(120),
  registry_id: z.string().min(1).max(160).default("voice_simulation"),
  market_name: z.string().min(1).max(160),
  outcome_status: z.literal("manual_handoff"),
  premium_amount: z.number().nonnegative().max(1_000_000).nullable().optional(),
  premium_period: z.enum(["monthly", "annual"]).nullable().optional(),
  coverage_summary: z.string().max(3_000).default(""),
  quote_reference: z.string().max(300).nullable().optional(),
  blocker: z.string().max(1_500).nullable().optional(),
  evidence_note: z.string().min(1).max(3_000),
  consent_confirmed: z.boolean(),
  is_simulation: z.literal(true),
  conversation_id: z.string().max(200).nullable().optional(),
});

const camelCaseVoiceToolSchema = z
  .object({
    runId: z.string().min(1).max(120),
    registryId: z.string().min(1).max(160).default("voice_simulation"),
    marketName: z.string().min(1).max(160),
    outcomeStatus: z.literal("manual_handoff"),
    premiumAmount: z.number().nonnegative().max(1_000_000).nullable().optional(),
    premiumPeriod: z.enum(["monthly", "annual"]).nullable().optional(),
    coverageSummary: z.string().max(3_000).default(""),
    quoteReference: z.string().max(300).nullable().optional(),
    blocker: z.string().max(1_500).nullable().optional(),
    evidenceNote: z.string().min(1).max(3_000),
    consentConfirmed: z.boolean(),
    isSimulation: z.literal(true),
    conversationId: z.string().max(200).nullable().optional(),
  })
  .transform((input) => ({
    run_id: input.runId,
    registry_id: input.registryId,
    market_name: input.marketName,
    outcome_status: input.outcomeStatus,
    premium_amount: input.premiumAmount,
    premium_period: input.premiumPeriod,
    coverage_summary: input.coverageSummary,
    quote_reference: input.quoteReference,
    blocker: input.blocker,
    evidence_note: input.evidenceNote,
    consent_confirmed: input.consentConfirmed,
    is_simulation: input.isSimulation,
    conversation_id: input.conversationId,
  }));

const voiceToolSchema = z.union([
  snakeCaseVoiceToolSchema,
  camelCaseVoiceToolSchema,
]);

export async function POST(request: Request) {
  const expectedSecret = process.env.ELEVENLABS_TOOL_SECRET ?? "";
  const providedSecret =
    request.headers.get("x-elevenlabs-tool-secret") ?? getBearerToken(request);

  if (
    !expectedSecret ||
    !providedSecret ||
    !constantTimeEqual(expectedSecret, providedSecret)
  ) {
    return Response.json({ error: "Unauthorized tool call." }, { status: 401 });
  }

  try {
    const input = voiceToolSchema.parse(await request.json());

    if (!input.consent_confirmed) {
      return Response.json(
        { error: "Consent must be confirmed before any transcript-derived outcome is retained." },
        { status: 409 },
      );
    }

    const saved = await saveQuoteOutcome({
      runId: input.run_id,
      registryId: input.registry_id,
      marketName: input.market_name,
      status: input.outcome_status,
      sourceChannel: "phone",
      premiumAmount: input.premium_amount,
      premiumPeriod: input.premium_period,
      coverageSummary: input.coverage_summary,
      quoteReference: input.quote_reference,
      blocker: input.blocker,
      evidenceNote: input.evidence_note,
      intermediary: "Private voice rehearsal",
      distinctRateSourceId: "voice_simulation_not_market_source",
      resultKind: "handoff",
      isSimulation: input.is_simulation,
      consentConfirmed: input.consent_confirmed,
      providerConversationId: input.conversation_id,
    });

    return Response.json({
      success: true,
      outcome_id: saved.record.id,
      persisted: saved.persisted,
      normalized_status: saved.record.status,
      excluded_from_rankings: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid structured quote outcome.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Voice tool persistence failed", error);
    return Response.json({ error: "Unable to store voice outcome." }, { status: 500 });
  }
}
