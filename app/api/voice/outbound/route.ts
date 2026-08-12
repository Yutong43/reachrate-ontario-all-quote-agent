import { z } from "zod";

import { saveVoiceHandoff } from "@/lib/server/outcomes";

const outboundSchema = z.object({
  toNumber: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  applicantDisplayName: z.string().min(1).max(80),
  runId: z.string().min(1).max(120),
  routeLabel: z.string().min(1).max(160),
  consentToCall: z.literal(true),
  simulation: z.literal(true),
});

const recentCalls = new Map<string, { at: number; runId: string }>();
const CALL_COOLDOWN_MS = 5 * 60 * 1000;

function maskPhone(number: string) {
  return number.length > 4 ? `***${number.slice(-4)}` : "***";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function POST(request: Request) {
  try {
    if (process.env.OUTBOUND_CALLS_ENABLED !== "true") {
      return Response.json(
        { error: "Outbound calls are disabled. Set OUTBOUND_CALLS_ENABLED=true only for the supervised demo window." },
        { status: 503 },
      );
    }

    const input = outboundSchema.parse(await request.json());
    const allowlist = new Set(
      (process.env.OUTBOUND_PHONE_ALLOWLIST ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    const toNumber = input.toNumber ?? (allowlist.size === 1 ? [...allowlist][0] : null);

    if (!toNumber) {
      return Response.json(
        { error: "Enter an E.164 private number or configure exactly one allowlisted demo number." },
        { status: 400 },
      );
    }

    if (!allowlist.has(toNumber)) {
      return Response.json(
        { error: "This destination is not on the private-number allowlist." },
        { status: 403 },
      );
    }

    // Keep accidental-repeat protection per demo card while allowing the
    // planned Demo Carrier 1 and Demo Carrier 2 calls to run back-to-back.
    const cooldownKey = `${toNumber}:${input.routeLabel}`;
    const recentCall = recentCalls.get(cooldownKey);
    if (recentCall && recentCall.runId === input.runId && Date.now() - recentCall.at < CALL_COOLDOWN_MS) {
      return Response.json(
        { error: "The five-minute call cooldown is still active for this number." },
        { status: 429 },
      );
    }

    const apiKey = getRequiredEnv("ELEVENLABS_API_KEY");
    const agentId = getRequiredEnv("ELEVENLABS_AGENT_ID");
    const phoneNumberId = getRequiredEnv("ELEVENLABS_PHONE_NUMBER_ID");
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: phoneNumberId,
          to_number: toNumber,
          call_recording_enabled: false,
          conversation_initiation_client_data: {
            dynamic_variables: {
              applicant_display_name: input.applicantDisplayName,
              run_id: input.runId,
              route_label: input.routeLabel,
              demo_registry_id: input.routeLabel === "Demo Carrier 2"
                ? "voice_simulation_demo_agent_2"
                : "voice_simulation_demo_agent_1",
              is_simulation: "true",
              demo_scenario: input.routeLabel === "Demo Carrier 2" ? "human_handoff" : "spoken_price",
              profile_summary:
                "Planned 2025 Toyota Corolla LE, 5,000 kilometres per year, Ontario G licence, first licensed in 2017, clean record.",
              coverage_summary:
                "Two million dollars liability, one thousand dollar deductible, collision, comprehensive and OPCF 44R, with no telematics.",
              opening_policy:
                "Disclose automation and non-licensed status. Ask permission to continue and save only a structured non-audio demo summary.",
            },
          },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : typeof payload.message === "string"
            ? payload.message
            : `ElevenLabs returned ${response.status}.`;
      return Response.json({ error: detail }, { status: response.status });
    }

    const conversationId =
      typeof payload.conversation_id === "string"
        ? payload.conversation_id
        : null;
    const callSid =
      typeof payload.callSid === "string"
        ? payload.callSid
        : typeof payload.call_sid === "string"
          ? payload.call_sid
          : null;
    const maskedNumber = maskPhone(toNumber);

    recentCalls.set(cooldownKey, { at: Date.now(), runId: input.runId });
    await saveVoiceHandoff({
      runId: input.runId,
      routeLabel: input.routeLabel,
      maskedDestination: maskedNumber,
      conversationId,
      callSid,
      isSimulation: true,
    });

    return Response.json(
      {
        conversationId,
        maskedNumber,
        status: "queued",
        isSimulation: true,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Use a configured allowlisted number or enter an E.164 number, and confirm the supervised simulation." },
        { status: 400 },
      );
    }

    console.error("Failed to request outbound call", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to start call." },
      { status: 500 },
    );
  }
}
