import { providerStatus } from "@/lib/server/providerConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Returns only { configured, provider?, model? } — never the API key. */
export async function GET() {
  return Response.json(providerStatus(process.env));
}
