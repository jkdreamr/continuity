import { describe, it, expect } from "vitest";
import { recordRequest, recordDraft, draftsForRequest } from "@/lib/requests";
import type { Draft, QuickRequest, Workspace } from "@/types/continuity";

function emptyWs(): Workspace {
  return {
    version: 2,
    packs: [],
    tasks: [],
    artifacts: [],
    requests: [],
    drafts: [],
    documents: [],
    dismissedProposals: [],
    seededDemo: false,
  };
}

function req(id: string, text: string): QuickRequest {
  return {
    id,
    text,
    inferredMode: "writing",
    selectedMode: "writing",
    includeIds: [],
    excludeIds: [],
    targetTool: "Claude",
    createdAt: "2026-06-23T00:00:00.000Z",
    updatedAt: "2026-06-23T00:00:00.000Z",
  };
}

function draft(id: string, requestId: string, content: string, createdAt: string): Draft {
  return { id, requestId, mode: "writing", content, activeContextIds: [], createdAt };
}

describe("autosave helpers", () => {
  it("records a request", () => {
    const ws = recordRequest(emptyWs(), req("r1", "hello"));
    expect(ws.requests.map((r) => r.id)).toEqual(["r1"]);
  });

  it("upserts a request by id rather than duplicating", () => {
    let ws = recordRequest(emptyWs(), req("r1", "hello"));
    ws = recordRequest(ws, req("r1", "hello again"));
    expect(ws.requests).toHaveLength(1);
    expect(ws.requests[0]!.text).toBe("hello again");
  });

  it("records drafts and returns them newest-first for a request", () => {
    let ws = emptyWs();
    ws = recordDraft(ws, draft("d1", "r1", "first", "2026-06-23T00:00:00.000Z"));
    ws = recordDraft(ws, draft("d2", "r1", "second", "2026-06-23T00:01:00.000Z"));
    ws = recordDraft(ws, draft("d3", "r2", "other", "2026-06-23T00:02:00.000Z"));
    const forR1 = draftsForRequest(ws, "r1");
    expect(forR1.map((d) => d.id)).toEqual(["d2", "d1"]);
  });
});
