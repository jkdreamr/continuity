import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";
import { EXTRACT_SYSTEM, buildExtractUser } from "@/lib/contracts/contractPrompts";
import { ContractItemSchema, validateExtraction } from "@/lib/contracts/contractSchemas";
import { runContinuityCheck, mergeProviderItems } from "@/lib/contracts/checkService";
import { extractJson } from "@/lib/writing/modelJson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().min(1).max(12000),
  contract: z.array(ContractItemSchema).optional(),
  artifactId: z.string().optional(),
});

/**
 * Produce a Continuity Receipt for a piece of AI-produced work. Same honest
 * deterministic-first contract as /check; framed as the receipt that should
 * accompany a generated artifact.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const { text, contract, artifactId } = parsed.data;

  const { receipt } = runContinuityCheck({ text, contractItems: contract, artifactId });

  const adapter = getAdapter();
  if (!adapter) return Response.json({ receipt, enriched: false });

  try {
    const out = await adapter.generate({
      system: EXTRACT_SYSTEM,
      user: buildExtractUser({ text }),
      signal: req.signal,
    });
    const items = validateExtraction(JSON.parse(extractJson(out)));
    return Response.json({ receipt: mergeProviderItems(receipt, items), enriched: items.length > 0, provider: adapter.name });
  } catch {
    return Response.json({ receipt, enriched: false });
  }
}
