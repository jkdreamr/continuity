import type { Draft, QuickRequest, Workspace } from "@/types/continuity";

/**
 * Pure autosave helpers. The store calls these so the same logic is unit-tested:
 * requests upsert by id (so editing a live request doesn't duplicate it), and
 * drafts accumulate newest-first as a per-request version history.
 */

export function recordRequest(ws: Workspace, req: QuickRequest): Workspace {
  const exists = ws.requests.some((r) => r.id === req.id);
  const requests = exists
    ? ws.requests.map((r) => (r.id === req.id ? req : r))
    : [req, ...ws.requests];
  return { ...ws, requests };
}

export function recordDraft(ws: Workspace, draft: Draft): Workspace {
  return { ...ws, drafts: [draft, ...ws.drafts] };
}

export function draftsForRequest(ws: Workspace, requestId: string): Draft[] {
  return ws.drafts
    .filter((d) => d.requestId === requestId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
