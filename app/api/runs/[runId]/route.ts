import { z } from "zod";

import { deleteRunData } from "@/lib/server/outcomes";

const runIdSchema = z.string().min(1).max(120);

export async function DELETE(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  if (request.headers.get("x-confirm-delete") !== "true") {
    return Response.json(
      { error: "Explicit deletion confirmation is required." },
      { status: 428 },
    );
  }

  const { runId } = await context.params;
  const parsedRunId = runIdSchema.safeParse(runId);
  if (!parsedRunId.success) {
    return Response.json({ error: "Invalid run ID." }, { status: 400 });
  }

  try {
    const result = await deleteRunData(parsedRunId.data);
    return Response.json({ deleted: true, ...result });
  } catch (error) {
    console.error("Failed to delete run data", error);
    return Response.json({ error: "Unable to delete run data." }, { status: 500 });
  }
}
