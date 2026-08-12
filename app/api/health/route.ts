import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { hasSupabaseEdgePersistence, hasSupabaseEdgeRead } from "@/lib/server/supabase-edge";

export function GET() {
  return Response.json({
    ok: true,
    services: {
      elevenlabs: Boolean(
        process.env.ELEVENLABS_API_KEY &&
          process.env.ELEVENLABS_AGENT_ID &&
          process.env.ELEVENLABS_PHONE_NUMBER_ID,
      ),
      supabase: Boolean(getSupabaseAdmin() || hasSupabaseEdgeRead()),
      supabaseServerWrite: Boolean(getSupabaseAdmin() || hasSupabaseEdgePersistence()),
      outboundCallsEnabled: process.env.OUTBOUND_CALLS_ENABLED === "true",
    },
  });
}
