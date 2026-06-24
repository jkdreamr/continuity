import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { TUNE_SYSTEM, buildTuneUser } from "@/lib/writing/tunePrompts";
import { ContractItemSchema } from "@/lib/contracts/contractSchemas";
import type { ContractItem, DocumentBrief } from "@/types/continuity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live-Tune rewrite stream. Returns `text/plain` token stream (structured JSON is
 * reserved for contracts/receipts/insights). Sends only the selection + a little
 * neighbor context + a compact contract/brief, never the full document. Honest
 * 503 when no provider; it never fakes a rewrite.
 */
const Vector = z.object({ formality: z.number(), length: z.number(), naturalness: z.number() });
const Body = z.object({
  selection: z.string().min(1).max(8000),
  before: z.string().max(2000).optional(),
  after: z.string().max(2000).optional(),
  vector: Vector,
  brief: z.unknown().optional(),
  contract: z.array(ContractItemSchema).max(40).optional(),
  voiceSummary: z.string().max(400).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });

  const adapter = getAdapter();
  if (!adapter) return Response.json({ error: "not_configured" }, { status: 503 });

  const d = parsed.data;
  const user = buildTuneUser({
    selection: d.selection,
    before: d.before,
    after: d.after,
    vector: d.vector,
    brief: d.brief as DocumentBrief | undefined,
    contract: d.contract as ContractItem[] | undefined,
    voiceSummary: d.voiceSummary,
  });

  try {
    const stream = await adapter.stream({ system: TUNE_SYSTEM, user, signal: req.signal, fast: true });
    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
        "x-provider": adapter.name,
        "x-model": adapter.fastModel,
      },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return Response.json({ error: aborted ? "aborted" : "provider_error" }, { status: aborted ? 499 : 502 });
  }
}
