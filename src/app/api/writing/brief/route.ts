import { z } from "zod";
import { inferBrief } from "@/lib/writing/documentBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().max(12000), userStated: z.boolean().optional() });

/** Deterministic, task-local Document Brief inference. Works without a provider. */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  return Response.json({ brief: inferBrief(parsed.data.text, { userStated: parsed.data.userStated }) });
}
