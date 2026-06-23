import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { COMPLETION_SYSTEM, buildCompletionUser } from "@/lib/writing/agentPrompts";
import { parseCompletion } from "@/lib/writing/modelJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  documentId: z.string().optional(),
  documentVersion: z.number().optional(),
  requestId: z.string().optional(),
  beforeCursor: z.string().max(4000),
  afterCursor: z.string().max(2000).default(""),
  brief: z.unknown().optional(),
  activeMemory: z.array(z.string()).max(12).optional(),
});

export async function POST(req: Request) {
  const adapter = getAdapter();
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!adapter) return Response.json({ error: "not_configured" }, { status: 503 });

  const d = parsed.data;
  try {
    const text = await adapter.generate({
      system: COMPLETION_SYSTEM,
      user: buildCompletionUser({
        before: d.beforeCursor,
        after: d.afterCursor,
        brief: d.brief as never,
        memory: d.activeMemory,
      }),
      signal: req.signal,
    });
    return Response.json({
      suggestion: parseCompletion(text, 90),
      requestId: d.requestId,
      documentVersion: d.documentVersion,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ error: aborted ? "aborted" : "provider_error" }, { status: aborted ? 499 : 502 });
  }
}
