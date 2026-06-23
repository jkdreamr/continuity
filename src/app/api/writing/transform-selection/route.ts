import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { TRANSFORM_SYSTEM, buildTransformUser } from "@/lib/writing/agentPrompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  documentId: z.string().optional(),
  documentVersion: z.number().optional(),
  requestId: z.string().optional(),
  baseSelectionHash: z.string().optional(),
  selection: z.object({ from: z.number(), to: z.number(), text: z.string().min(1).max(8000) }),
  surroundingContext: z.object({ before: z.string().max(2000), after: z.string().max(2000) }).optional(),
  instruction: z.string().min(1).max(1000),
  brief: z.unknown().optional(),
});

function stripQuotes(s: string): string {
  return s.trim().replace(/^["“'`]+|["”'`]+$/g, "").trim();
}

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
    const replacement = await adapter.generate({
      system: TRANSFORM_SYSTEM,
      user: buildTransformUser({
        selection: d.selection.text,
        before: d.surroundingContext?.before ?? "",
        after: d.surroundingContext?.after ?? "",
        instruction: d.instruction,
        brief: d.brief as never,
      }),
      signal: req.signal,
    });
    return Response.json({
      replacement: stripQuotes(replacement),
      requestId: d.requestId,
      baseSelectionHash: d.baseSelectionHash,
      documentVersion: d.documentVersion,
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ error: aborted ? "aborted" : "provider_error" }, { status: aborted ? 499 : 502 });
  }
}
