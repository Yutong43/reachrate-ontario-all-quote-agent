type PersistenceAction =
  | "save_quote_outcome"
  | "save_voice_handoff"
  | "list_quote_outcomes"
  | "delete_run_data";

export function hasSupabaseEdgePersistence() {
  return Boolean(
    process.env.SUPABASE_EDGE_FUNCTION_URL &&
      process.env.ELEVENLABS_TOOL_SECRET,
  );
}

export function hasSupabaseEdgeRead() {
  return Boolean(process.env.SUPABASE_EDGE_FUNCTION_URL);
}

export async function listPublicDemoOutcomes<T>(runId: string): Promise<T | null> {
  const endpoint = process.env.SUPABASE_EDGE_FUNCTION_URL;
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "list_public_demo_outcomes",
      payload: { run_id: runId },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`Supabase demo-result read returned HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
}

export async function callSupabasePersistence<T>(
  action: PersistenceAction,
  payload: unknown,
): Promise<T | null> {
  const endpoint = process.env.SUPABASE_EDGE_FUNCTION_URL;
  const secret = process.env.ELEVENLABS_TOOL_SECRET;

  if (!endpoint || !secret) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-elevenlabs-tool-secret": secret,
    },
    body: JSON.stringify({ action, payload }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const failure = (await response.json().catch(() => ({}))) as {
      phase?: string;
      detail?: string;
    };
    const diagnostic = [failure.phase, failure.detail]
      .filter(Boolean)
      .join(": ");
    throw new Error(
      `Supabase persistence bridge returned HTTP ${response.status}${
        diagnostic ? ` (${diagnostic})` : ""
      }.`,
    );
  }

  return (await response.json()) as T;
}
