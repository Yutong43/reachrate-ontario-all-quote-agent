import { createClient } from "npm:@supabase/supabase-js@2.112.2";

const JSON_HEADERS = { "Content-Type": "application/json" };
const OUTCOME_STATUSES = new Set([
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
]);
const SOURCE_CHANNELS = new Set(["web", "phone", "broker", "research"]);

class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestError("A JSON object is required.");
  }
  return value as Record<string, unknown>;
}

function requiredText(
  value: unknown,
  field: string,
  maxLength = 3_000,
) {
  if (typeof value !== "string" || value.length < 1 || value.length > maxLength) {
    throw new RequestError(`${field} is invalid.`);
  }
  return value;
}

function optionalText(value: unknown, field: string, maxLength = 3_000) {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new RequestError(`${field} is invalid.`);
  }
  return value;
}

function optionalPremium(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000) {
    throw new RequestError("premium_amount is invalid.");
  }
  return value;
}

function publicDemoRunId(value: unknown) {
  const runId = requiredText(value, "run_id", 120);
  if (!/^run-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)) {
    throw new RequestError("run_id is invalid.");
  }
  return runId;
}

function getAdminKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    const parsed = JSON.parse(modernKeys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) return key;
  }

  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!legacyKey) throw new Error("Supabase admin key is unavailable.");
  return legacyKey;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function authorize(
  request: Request,
  admin: ReturnType<typeof createClient>,
) {
  const suppliedSecret = request.headers.get("x-elevenlabs-tool-secret") ?? "";
  if (suppliedSecret.length < 32) return false;

  const { data, error } = await admin
    .from("integration_secret_hashes")
    .select("secret_sha256")
    .eq("secret_name", "reachrate_tool")
    .eq("active", true)
    .maybeSingle();

  if (error || !data?.secret_sha256) return false;
  return constantTimeEqual(await sha256(suppliedSecret), data.secret_sha256);
}

function normalizeOutcome(value: unknown) {
  const payload = asObject(value);
  const status = requiredText(payload.status, "status", 60);
  const sourceChannel = requiredText(payload.source_channel, "source_channel", 20);
  const premiumPeriod = payload.premium_period;
  const resultKind = payload.result_kind;

  if (!OUTCOME_STATUSES.has(status)) throw new RequestError("status is invalid.");
  if (!SOURCE_CHANNELS.has(sourceChannel)) {
    throw new RequestError("source_channel is invalid.");
  }
  if (premiumPeriod != null && premiumPeriod !== "monthly" && premiumPeriod !== "annual") {
    throw new RequestError("premium_period is invalid.");
  }
  if (
    resultKind != null &&
    !["quote", "estimate", "blocker", "handoff"].includes(String(resultKind))
  ) {
    throw new RequestError("result_kind is invalid.");
  }
  if (typeof payload.is_simulation !== "boolean") {
    throw new RequestError("is_simulation is invalid.");
  }
  if (typeof payload.consent_confirmed !== "boolean") {
    throw new RequestError("consent_confirmed is invalid.");
  }

  const premiumAmount = optionalPremium(payload.premium_amount);
  const isSimulation = payload.is_simulation;
  return {
    id: requiredText(payload.id, "id", 120),
    run_id: requiredText(payload.run_id, "run_id", 120),
    registry_id: requiredText(payload.registry_id, "registry_id", 160),
    market_name: requiredText(payload.market_name, "market_name", 160),
    status: isSimulation && status !== "unreachable" ? "manual_handoff" : status,
    source_channel: sourceChannel,
    premium_amount: premiumAmount,
    premium_period: premiumPeriod ?? null,
    annual_premium:
      premiumAmount == null || premiumPeriod == null
        ? null
        : premiumPeriod === "monthly"
          ? premiumAmount * 12
          : premiumAmount,
    coverage_summary: optionalText(payload.coverage_summary, "coverage_summary") ?? "",
    quote_reference: isSimulation
      ? null
      : optionalText(payload.quote_reference, "quote_reference", 300),
    blocker: optionalText(payload.blocker, "blocker", 1_500),
    evidence_note: isSimulation
      ? `Supervised private-number simulation; role-played values are excluded from market metrics. ${requiredText(payload.evidence_note, "evidence_note")}`
      : requiredText(payload.evidence_note, "evidence_note"),
    evidence_url: isSimulation ? null : optionalText(payload.evidence_url, "evidence_url", 2_000),
    source_brand: isSimulation ? null : optionalText(payload.source_brand, "source_brand", 160),
    legal_underwriter: isSimulation ? null : optionalText(payload.legal_underwriter, "legal_underwriter", 220),
    insurer_group: isSimulation ? null : optionalText(payload.insurer_group, "insurer_group", 160),
    intermediary: isSimulation ? "Private voice rehearsal" : optionalText(payload.intermediary, "intermediary", 220),
    distinct_rate_source_id: isSimulation
      ? "voice_simulation_not_market_source"
      : optionalText(payload.distinct_rate_source_id, "distinct_rate_source_id", 180),
    result_kind: isSimulation ? "handoff" : resultKind == null ? null : String(resultKind),
    captured_at: requiredText(payload.captured_at, "captured_at", 80),
    is_simulation: isSimulation,
    consent_confirmed: payload.consent_confirmed,
    provider_conversation_id: optionalText(
      payload.provider_conversation_id,
      "provider_conversation_id",
      200,
    ),
  };
}

function directVoiceToolEnvelope(value: Record<string, unknown>) {
  if (value.isSimulation !== true) {
    throw new RequestError("The direct voice tool accepts private simulations only.");
  }
  const premiumAmount = optionalPremium(value.premiumAmount);
  const premiumPeriod = value.premiumPeriod ?? null;
  if ((premiumAmount == null) !== (premiumPeriod == null)) {
    throw new RequestError("premiumAmount and premiumPeriod must be supplied together.");
  }
  const outcomeStatus = requiredText(value.outcomeStatus, "outcomeStatus", 60);
  if (!new Set(["manual_handoff", "unreachable"]).has(outcomeStatus)) {
    throw new RequestError("A voice rehearsal status must be manual_handoff or unreachable.");
  }
  const consentConfirmed = value.consentConfirmed === true;
  if (premiumAmount != null && !consentConfirmed) {
    throw new RequestError("Affirmative consent is required before saving a spoken premium.");
  }
  if (outcomeStatus === "unreachable" && premiumAmount != null) {
    throw new RequestError("An unreachable rehearsal cannot store a premium.");
  }

  return {
    action: "save_quote_outcome",
    payload: {
      id: `voice-${crypto.randomUUID()}`,
      run_id: requiredText(value.runId, "runId", 120),
      registry_id: requiredText(value.registryId, "registryId", 160),
      market_name: requiredText(value.marketName, "marketName", 160),
      status: outcomeStatus,
      source_channel: "phone",
      premium_amount: premiumAmount,
      premium_period: premiumPeriod,
      coverage_summary: requiredText(value.coverageSummary, "coverageSummary"),
      quote_reference: optionalText(value.quoteReference, "quoteReference", 300),
      blocker: optionalText(value.blocker, "blocker", 1_500),
      evidence_note: requiredText(value.evidenceNote, "evidenceNote"),
      result_kind: "handoff",
      captured_at: new Date().toISOString(),
      is_simulation: true,
      consent_confirmed: consentConfirmed,
      provider_conversation_id: optionalText(value.conversationId, "conversationId", 200),
    },
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let phase = "bootstrap";
  let requestAuthorized = false;
  try {
    phase = "parse_request";
    const requestBody = asObject(await request.json());
    const envelope = "action" in requestBody
      ? requestBody
      : directVoiceToolEnvelope(requestBody);
    const action = requiredText(envelope.action, "action", 80);
    const payload = asObject(envelope.payload);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, getAdminKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "list_public_demo_outcomes") {
      phase = "list_public_demo_outcomes";
      const runId = publicDemoRunId(payload.run_id);
      const { data, error } = await admin
        .from("quote_outcomes")
        .select(
          "id,registry_id,market_name,status,source_channel,premium_amount,premium_period,annual_premium,coverage_summary,evidence_note,captured_at,is_simulation",
        )
        .eq("run_id", runId)
        .eq("source_channel", "phone")
        .eq("is_simulation", true)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return json({ records: data ?? [], persisted: true, scope: "redacted_phone_simulations" });
    }

    phase = "authorize";
    if (!(await authorize(request, admin))) {
      return json({ error: "Unauthorized." }, 401);
    }
    requestAuthorized = true;

    if (action === "save_quote_outcome") {
      phase = "save_quote_outcome";
      const record = normalizeOutcome(payload);
      const { error } = await admin.from("quote_outcomes").insert(record);
      if (error) throw error;

      if (record.provider_conversation_id) {
        phase = "complete_voice_handoff";
        const { error: handoffError } = await admin
          .from("voice_handoffs")
          .update({
            status: record.premium_amount != null
              ? "completed"
              : record.status === "manual_handoff"
              ? "human_requested"
              : record.status === "unreachable"
                ? "unreachable"
                : "completed",
            consent_to_continue: record.consent_confirmed,
            consent_to_transcribe: record.consent_confirmed,
            consent_to_record: false,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_conversation_id", record.provider_conversation_id);
        if (handoffError) throw handoffError;
      }

      return json({ record, persisted: true }, 201);
    }

    if (action === "save_voice_handoff") {
      phase = "save_voice_handoff";
      const record = {
        id: requiredText(payload.id, "id", 120),
        run_id: requiredText(payload.run_id, "run_id", 120),
        route_label: requiredText(payload.route_label, "route_label", 160),
        masked_destination: requiredText(
          payload.masked_destination,
          "masked_destination",
          40,
        ),
        provider_conversation_id: optionalText(
          payload.provider_conversation_id,
          "provider_conversation_id",
          200,
        ),
        provider_call_sid: optionalText(payload.provider_call_sid, "provider_call_sid", 200),
        status: "queued",
        is_simulation: payload.is_simulation === true,
      };
      const { error } = await admin.from("voice_handoffs").insert(record);
      if (error) throw error;
      return json({ persisted: true }, 201);
    }

    if (action === "list_quote_outcomes") {
      phase = "list_quote_outcomes";
      const runId = requiredText(payload.run_id, "run_id", 120);
      const { data, error } = await admin
        .from("quote_outcomes")
        .select(
          "id,run_id,registry_id,market_name,status,source_channel,premium_amount,premium_period,annual_premium,coverage_summary,quote_reference,blocker,evidence_note,evidence_url,source_brand,legal_underwriter,insurer_group,intermediary,distinct_rate_source_id,result_kind,captured_at,is_simulation,consent_confirmed,provider_conversation_id",
        )
        .eq("run_id", runId)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return json({ records: data ?? [], persisted: true });
    }

    if (action === "delete_run_data") {
      phase = "delete_run_data";
      const runId = requiredText(payload.run_id, "run_id", 120);
      const targets = [
        ["evidence_records", "run_id"],
        ["quote_outcomes", "run_id"],
        ["voice_handoffs", "run_id"],
        ["route_attempts", "run_id"],
        ["quote_runs", "id"],
      ] as const;
      for (const [table, column] of targets) {
        const { error } = await admin.from(table).delete().eq(column, runId);
        if (error) throw error;
      }
      const { error } = await admin.from("deletion_log").insert({
        run_id: runId,
        deletion_scope: "all_run_data",
        result: "deleted",
      });
      if (error) throw error;
      return json({ persisted: true });
    }

    throw new RequestError("Unsupported persistence action.", 404);
  } catch (error) {
    console.error("quote-persistence failed", error);
    if (error instanceof RequestError) {
      return json({ error: error.message }, error.status);
    }
    const detail =
      requestAuthorized &&
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : requestAuthorized && error instanceof Error
          ? error.message
          : undefined;
    return json(
      {
        error: "Persistence operation failed.",
        phase,
        ...(detail ? { detail } : {}),
      },
      500,
    );
  }
});
