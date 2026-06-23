import type { WritingDocument } from "@/types/continuity";
import { newId, nowIso } from "@/lib/id";

/** Plain text -> minimal ProseMirror/Tiptap doc JSON (paragraphs on blank lines). */
export function textToDoc(text: string): unknown {
  const paragraphs = (text || "")
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] }));
  return { type: "doc", content: paragraphs.length ? paragraphs : [{ type: "paragraph" }] };
}

/** Best-effort text extraction from doc JSON (the editor supplies plainText live). */
export function docToText(doc: unknown): string {
  function collect(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === "text") return n.text ?? "";
    if (Array.isArray(n.content)) {
      const sep = n.type === "doc" ? "\n\n" : "";
      return n.content.map(collect).join(sep);
    }
    return "";
  }
  return collect(doc).trim();
}

export function newWritingDocument(partial: Partial<WritingDocument> = {}): WritingDocument {
  const ts = nowIso();
  return {
    id: partial.id ?? newId("doc"),
    title: partial.title ?? "",
    contentJson: partial.contentJson ?? textToDoc(partial.plainText ?? ""),
    plainText: partial.plainText ?? "",
    mode: "writing",
    brief: partial.brief,
    liveHelpEnabled: partial.liveHelpEnabled ?? true,
    activeMemoryOverrides: partial.activeMemoryOverrides ?? { includeIds: [], excludeIds: [] },
    version: partial.version ?? 1,
    createdAt: partial.createdAt ?? ts,
    updatedAt: partial.updatedAt ?? ts,
  };
}
