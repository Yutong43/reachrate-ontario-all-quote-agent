import { z } from "zod";

import { getSyntheticConversationStatus } from "@/lib/server/voice-conversation";

const conversationIdSchema = z.string().regex(/^conv_[A-Za-z0-9_-]{12,180}$/);

export async function GET(request: Request) {
  const conversationId = new URL(request.url).searchParams.get("conversationId");
  const parsed = conversationIdSchema.safeParse(conversationId);
  if (!parsed.success) {
    return Response.json({ error: "A valid conversationId is required." }, { status: 400 });
  }

  try {
    return Response.json(await getSyntheticConversationStatus(parsed.data));
  } catch (error) {
    console.error("Failed to read private demo call status", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to read call status." },
      { status: 502 },
    );
  }
}
