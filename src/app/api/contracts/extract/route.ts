import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { EXTRACT_SYSTEM, buildExtractUser } from "@/lib/contracts/contractPrompts";
import { validateExtraction } from "@/lib/contracts/contractSchemas";
import { extractJson } from "@/lib/writing/modelJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().min(1).max(12000),
  objective: z.string().max(2000).optional(),
});

/**
 * Provider-only deeper extraction. The deterministic extractor already runs on
 * the client; this route exists for the enrichment path and is honest about a
 * missing key (503) — it never fabricates items.
 */
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

  try {
    const text = await adapter.generate({
      system: EXTRACT_SYSTEM,
      user: buildExtractUser(parsed.data),
      signal: req.signal,
    });
    let raw: unknown = null;
    try {
      raw = JSON.parse(extractJson(text));
    } catch {
      raw = null;
    }
    return Response.json({ items: validateExtraction(raw), provider: adapter.name });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ error: aborted ? "aborted" : "provider_error" }, { status: aborted ? 499 : 502 });
  }
}
