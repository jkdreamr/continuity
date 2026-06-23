import type { GenerationMessages } from "@/lib/generationPrompt";

export type GenerateError =
  | "not_configured"
  | "provider_error"
  | "aborted"
  | "bad_request"
  | "network";

export type GenerateResult =
  | { ok: true; text: string; provider?: string; model?: string }
  | { ok: false; error: GenerateError };

/** Calls the server route. The API key lives only on the server. */
export async function requestDraft(
  messages: GenerationMessages,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(messages),
      signal,
    });
    if (res.ok) {
      const data = (await res.json()) as { text: string; provider?: string; model?: string };
      return { ok: true, text: data.text, provider: data.provider, model: data.model };
    }
    if (res.status === 503) return { ok: false, error: "not_configured" };
    if (res.status === 400) return { ok: false, error: "bad_request" };
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: data.error === "aborted" ? "aborted" : "provider_error" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "network" };
  }
}
