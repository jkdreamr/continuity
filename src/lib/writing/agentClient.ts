import type { DocumentBrief, DocumentInsight } from "@/types/continuity";

/**
 * Client transport for the writing agent. Each call aborts via the caller's
 * signal and maps a missing provider to a typed `not_configured` result so the
 * UI can show an honest state instead of fake output.
 */

export type AgentError = "not_configured" | "provider_error" | "aborted" | "network";

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<{ ok: true; data: T } | { ok: false; error: AgentError }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    if (res.status === 503) return { ok: false, error: "not_configured" };
    return { ok: false, error: "provider_error" };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { ok: false, error: "aborted" };
    return { ok: false, error: "network" };
  }
}

export async function requestCompletion(
  payload: { beforeCursor: string; afterCursor: string; brief?: DocumentBrief; activeMemory?: string[]; documentVersion?: number },
  signal: AbortSignal,
): Promise<string | null> {
  const r = await post<{ suggestion: string | null }>("/api/writing/complete", payload, signal);
  return r.ok ? r.data.suggestion : null;
}

export async function requestInsights(
  payload: { text: string; brief?: DocumentBrief; contract?: string[]; dismissedKinds?: string[] },
  signal: AbortSignal,
): Promise<DocumentInsight[]> {
  const r = await post<{ insights: DocumentInsight[] }>("/api/writing/insights", payload, signal);
  return r.ok ? r.data.insights : [];
}

export async function requestTransform(
  payload: {
    selection: { from: number; to: number; text: string };
    surroundingContext?: { before: string; after: string };
    instruction: string;
    brief?: DocumentBrief;
    baseSelectionHash?: string;
  },
  signal: AbortSignal,
): Promise<{ ok: true; replacement: string; baseSelectionHash?: string } | { ok: false; error: AgentError }> {
  const r = await post<{ replacement: string; baseSelectionHash?: string }>("/api/writing/transform-selection", payload, signal);
  return r.ok ? { ok: true, replacement: r.data.replacement, baseSelectionHash: r.data.baseSelectionHash } : { ok: false, error: r.error };
}
