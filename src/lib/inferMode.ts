import type { Mode } from "@/types/continuity";

/**
 * Lightweight, conservative mode inference. Writing is the default; Build is
 * inferred only when the request clearly signals software work. The user can
 * always flip the mode chip, this just picks a sensible starting point.
 */

// Strong, unambiguous software signals.
const STRONG = [
  /\bredesign|refactor|re-?architect\b/i,
  /\bclaude code\b|\blovable\b|\bv0\b|\bvercel\b/i,
  /\bdo ?n['o]t (touch|change|break)\s+(the\s+)?(auth|authentication|routing|schema|data ?model|database)\b/i,
  /\bchange brief\b/i,
  /\b(authentication|routing|schema|endpoint|api route|css|tailwind|codebase)\b/i,
];

// "action verb" + "software noun" combinations.
const VERB = /\b(fix|change|update|implement|add|remove|tweak|build|wire|migrate|redesign|style)\b/i;
const NOUN = /\b(screen|page|flow|component|layout|ui|app|feature|button|form|section|modal|navbar|sidebar|onboarding|endpoint|route|schema|database)\b/i;

export function inferMode(text: string): Mode {
  const t = text.trim();
  if (!t) return "writing";

  if (STRONG.some((re) => re.test(t))) return "build";

  // Require BOTH an action verb and a software noun, reasonably close together,
  // so "build a case for raising" (no software noun) stays Writing.
  if (VERB.test(t) && NOUN.test(t)) return "build";

  return "writing";
}
