import { z } from "zod";
import { analyzeSource } from "@/lib/writing/sourceAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().min(1).max(20000) });

/**
 * Explicit source analysis only, the user pasted/uploaded this text. Deterministic
 * and offline; never reads clipboard, tabs, or the DOM passively.
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
  return Response.json(analyzeSource(parsed.data.text));
}
