/**
 * Deterministic gating for ghost completion. The provider call only fires when
 * ALL gates pass, this is where "do not interrupt" is enforced, independent of
 * the idle timer in the editor extension.
 */

export type CompletionContext = {
  beforeCursor: string;
  afterCursor: string;
  collapsed: boolean;
  composing: boolean;
  hasContext: boolean;
};

const MIN_CONTEXT_CHARS = 12;

export function isCodeLike(s: string): boolean {
  const tail = s.slice(-80);
  if (/[{}<>`]|=>|\/\/|;\s*$|::/.test(tail)) return true;
  return /\b(const|let|function|return|import|export|class|def|public|void)\b\s*[\w({]/.test(tail);
}

export function looksLikeUrlOrEmail(s: string): boolean {
  const tail = s.slice(-80);
  return /https?:\/\/|www\.\S+|\b[^\s@]+@[^\s@]+\.[^\s@]+/.test(tail);
}

/** True when a quoted block ends right at the cursor. */
function inQuotedOrList(before: string): boolean {
  const line = before.slice(before.lastIndexOf("\n") + 1);
  return /^\s*(>|"|“|-\s|\*\s|\d+\.\s)/.test(line) && line.trim().length < 4;
}

export function shouldComplete(ctx: CompletionContext): boolean {
  if (!ctx.collapsed || ctx.composing || !ctx.hasContext) return false;

  const before = ctx.beforeCursor;
  if (before.trim().length < MIN_CONTEXT_CHARS) return false;

  // Finished paragraph (blank line right before the cursor).
  if (/\n\s*\n\s*$/.test(before)) return false;

  if (isCodeLike(before) || looksLikeUrlOrEmail(before)) return false;
  if (inQuotedOrList(before)) return false;

  // The writer should appear mid-thought: the char before the cursor is part of
  // a word or a small connective, not a hard sentence terminator with no tail.
  const lastChar = before.slice(-1);
  if (/[.!?]$/.test(before.trimEnd()) && ctx.afterCursor.trim() === "") return false;

  return /[A-Za-z0-9,;:'")\s]/.test(lastChar);
}
