import { z } from "zod";

import { listQuoteOutcomes, saveQuoteOutcome } from "@/lib/server/outcomes";

const outcomeStatuses = [
  "quoted",
  "quoted_comparable",
  "quoted_non_comparable",
  "estimate_only",
  "callback_required",
  "manual_handoff",
  "ineligible",
  "affinity_restricted",
  "specialty_only",
  "duplicate_rate_source",
  "not_currently_writing",
  "blocked",
  "access_blocked",
  "unreachable",
  "vin_required",
  "unresolved",
] as const;

const schema = z.object({
  runId: z.string().min(1).max(120),
  registryId: z.string().min(1).max(160),
  marketName: z.string().min(1).max(160),
  status: z.enum(outcomeStatuses),
  sourceChannel: z.enum(["web", "phone", "broker", "research"]),
  premiumAmount: z.number().nonnegative().max(1_000_000).nullable().optional(),
  premiumPeriod: z.enum(["monthly", "annual"]).nullable().optional(),
  coverageSummary: z.string().max(3_000).optional(),
  quoteReference: z.string().max(300).nullable().optional(),
  blocker: z.string().max(1_500).nullable().optional(),
  evidenceNote: z.string().min(1).max(3_000),
  evidenceUrl: z.string().url().max(2_000).nullable().optional(),
  sourceBrand: z.string().max(160).nullable().optional(),
  legalUnderwriter: z.string().max(220).nullable().optional(),
  insurerGroup: z.string().max(160).nullable().optional(),
  intermediary: z.string().max(220).nullable().optional(),
  distinctRateSourceId: z.string().max(180).nullable().optional(),
  resultKind: z.enum(["quote", "estimate", "blocker", "handoff"]).nullable().optional(),
  isSimulation: z.boolean(),
});

const runIdSchema = z.string().min(1).max(120);

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get("runId");
  const parsedRunId = runIdSchema.safeParse(runId);
  if (!parsedRunId.success) {
    return Response.json({ error: "A valid runId is required." }, { status: 400 });
  }

  try {
    return Response.json(await listQuoteOutcomes(parsedRunId.data));
  } catch (error) {
    console.error("Failed to read normalized outcomes", error);
    return Response.json({ error: "Unable to read outcomes." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const saved = await saveQuoteOutcome(input);
    return Response.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid normalized outcome.", issues: error.issues },
        { status: 400 },
      );
    }

    console.error("Failed to save normalized outcome", error);
    return Response.json({ error: "Unable to save outcome." }, { status: 500 });
  }
}
