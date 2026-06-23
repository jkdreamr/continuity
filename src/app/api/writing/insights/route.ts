import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { INSIGHTS_SYSTEM, buildInsightsUser } from "@/lib/writing/agentPrompts";
import { extractJson } from "@/lib/writing/modelJson";
import { validateInsights } from "@/lib/writing/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  documentId: z.string().optional(),
  documentVersion: z.number().optional(),
  text: z.string().max(12000),
  brief: z.unknown().optional(),
  dismissedKinds: z.array(z.string()).optional(),
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
      system: INSIGHTS_SYSTEM,
      user: buildInsightsUser({ text: d.text, brief: d.brief as never }),
      signal: req.signal,
    });
    let raw: unknown = null;
    try {
      raw = JSON.parse(extractJson(text));
    } catch {
      raw = null;
    }
    // Validation fails closed; invalid model output yields no intervention.
    const insights = validateInsights(raw, d.text.length).filter(
      (i) => !(d.dismissedKinds ?? []).includes(i.kind),
    );
    return Response.json({ insights, documentVersion: d.documentVersion });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ error: aborted ? "aborted" : "provider_error" }, { status: aborted ? 499 : 502 });
  }
}
