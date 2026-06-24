import { z } from "zod";
import { getAdapter } from "@/lib/server/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  system: z.string().min(1),
  user: z.string().min(1).max(20000),
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
  if (!parsed.success) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Honest missing-provider state, never a fake draft.
  if (!adapter) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  try {
    const text = await adapter.generate({
      system: parsed.data.system,
      user: parsed.data.user,
      signal: req.signal,
    });
    return Response.json({ text, provider: adapter.name, model: adapter.model });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    // Deliberately do not echo request content or the underlying error detail.
    return Response.json(
      { error: aborted ? "aborted" : "provider_error" },
      { status: aborted ? 499 : 502 },
    );
  }
}
