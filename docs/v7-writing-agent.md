# Continuity V7 — Writing Agent & Build Prompt Studio

Source of truth: `Creation_Continuity_Layer_Thesis_V7_Writing_Agent_Build_Prompt_Studio_June_2026.docx`.
This is a dual-surface refinement on top of the shipped V5/V6 base, not a rewrite.

> **One rule:** a writer should never have to stop writing to operate an AI system. The agent is quiet by default, explicit about context, non-destructive, and subordinate to the user's authorship.

---

## 1. The V7 thesis

Continuity is one company with two distinct surfaces that share the V6 context engine but **end differently**:

```
Build:   Ask → Context → Change Brief → Copy to tool
Writing: Start → Write → Inline help → Tune selection → Learn
```

- **Build Prompt Studio** stays prompt-first: describe a software change, get a portable, scope-safe brief to paste into Claude Code / Lovable / Generic.
- **Continuity Writer** becomes a real context-aware document editor (Tiptap): blank page, brief, or source → write with low-noise inline help (ghost completions on Tab, sparse contextual insights, selection-level Tune sliders).

The shared engine (approved memory, deterministic context routing, provider adapters, evidence) selects context; the experience layer diverges after that.

## 2. Preserved V6 behavior (no regression)

Now / Library / Settings IA; Build change-brief compilation (`compile.ts`); deterministic, conservative context routing (`contextMix.ts`) with the V6 priority order; provider adapters (Anthropic/OpenAI, server-only); honest no-provider state (never fake output); local-first persistence + versioned migration; export/import; requests/drafts history. Build mode is untouched and reachable from `[ Build prompt ]` on Now.

## 3. What V7 adds

- **Tiptap rich-text Writer** at `/write` (and `/write?doc=<id>`), with title, optional `What is this for?`, `Start writing…` placeholder, `Draft from a brief`, `Add source`, editable Document-Brief chips, a quiet `Using:` line → context drawer, and a `Live help` toggle with one-time disclosure.
- **Ghost completion** — a custom Tiptap/ProseMirror decoration (never document content until Tab). Gated by idle (450–700ms), collapsed cursor, meaning/scope/safety/user gates. Tab accepts, Esc dismisses, typing invalidates; AbortController + document-version + prefix-hash guard against stale renders. `POST /api/writing/complete`.
- **Contextual insights** — sparse, high-value only (`ask_clarity`, `tone_fit`, `voice_drift`, `redundancy`, `unsupported_specificity`). ≤3 unresolved, ≤1/paragraph, exact ranges, Preview/Apply/Dismiss/Not-for-this-document, dismissal suppresses the pattern. Zod-validated, fails closed. `POST /api/writing/insights`.
- **Selection Tune** — Tiptap BubbleMenu `[Shorter] [Warmer] [More direct] [Tune]`; Tune popover with exactly 3 doc-type-specific sliders, live intent copy, stable-base preview, Apply (one reversible transaction) / Keep mine / Undo, debounce + abort. `POST /api/writing/transform-selection`.
- **Task-local Document Brief** inferred deterministically (confidence-gated) or stated, shown as editable chips. Never becomes durable memory automatically.
- Routes: `/api/writing/{generate,brief,complete,insights,transform-selection}`, `/api/analyze-source` — server-only adapters, Zod validation.

## 4. Migration strategy (v2 → v3, fail-safe)

- `migrateWorkspace` upgrades `version 2 → 3`, additively. Existing V5 **drafts** are projected into editable `WritingDocument` records (stable ids, content preserved as a paragraph doc + plainText); the original `drafts`/`requests`/`tasks`/`artifacts`/`packs` arrays are **kept untouched** so Build artifacts and history survive and nothing is destroyed.
- New arrays default to `[]` when absent; idempotent. A failed/invalid migration returns `null` so the caller falls back to a fresh/seeded workspace **without overwriting** the raw stored data. Storage key unchanged.
- Old exports (v1/v2) import cleanly (schema fields optional + defaulted).

## 5. Privacy model

- **Send the minimum per operation:** ghost completion sends the cursor window + brief + relevant approved memory; insights send the paragraph/slice; Tune sends the selection + small neighbours. Never the whole library/history.
- **Live-help disclosure** (one sentence, once): "Live help sends the text near your cursor to your selected model so it can suggest a completion or revision." Toggle global/per-document.
- **Sources are task-local:** "Sources stay with this document unless you choose to keep them." No passive clipboard, no tab/DOM/inbox scraping, no background monitoring, no auto-send.
- **No fake output** when a provider is missing — honest disabled state / labeled prompt preview. Keys are server-only. Exported documents carry no hidden AI metadata.

## 6. Phases (built in order)

A. Editor foundation — Tiptap editor, document persistence, brief chips, Now mode split, V6 draft → document migration.
B. Cursor flow — ghost completion extension + endpoint + Tab/Esc + cancellation + Live-help control.
C. Selection power — bubble menu, 3 dynamic sliders, preview diff, Apply/Undo, stable-base.
D. Contextual insights — sparse structured analysis, range decoration, Apply/Dismiss/suppression.
E. Learning loop — evidence-backed candidates (reuses V6 memory proposals).

## 7. Requirements traceability

| Requirement | Status | Where |
| --- | --- | --- |
| Now: `[Write] [Build prompt]`, Writing default | ✅ | `src/app/page.tsx` |
| Tiptap rich-text Writer, blank/brief/source | ✅ | `src/app/write/page.tsx`, `DocumentEditor` |
| WritingDocument model + autosave + migration | ✅ | `types`, `writingDocs.ts`, `migrate.ts` |
| Document Brief inference + editable chips (confidence) | ✅ | `documentBrief.ts`, `DocumentBriefBar` |
| Ghost completion (Tab/Esc/typing/IME/gates/stale) | ✅ | `GhostCompletion` extension, `completionGate.ts`, `/api/writing/complete` |
| Contextual insights (sparse, ranges, Zod, suppression) | ✅ | `insights.ts`, `InsightController`, `/api/writing/insights` |
| Selection Tune (bubble, 3 sliders, preview, Apply/Undo) | ✅ | `SelectionTune`, `tuneTemplates.ts`, `/api/writing/transform-selection` |
| Stable-base, debounce, abort, cache, no-provider preview | ✅ | `SelectionTune`, `DocumentAgentClient` |
| V6 ContextRouter priority + exclusions preserved | ✅ | `contextMix.ts` (unchanged) |
| Build prompt-first preserved; Tune at brief level | ✅ | Build path (unchanged) |
| Routes + server-only adapters + Zod | ✅ | `src/app/api/writing/*`, `analyze-source` |
| Privacy: disclosure, task-local source, no fake output | ✅ | `LiveHelp` disclosure, Settings, routes |
| Tests, lint, build, manual QA | ✅ | `tests/`, CI commands |

## 8. Known limitations

- Live writing features (ghost, insights, Tune) require a configured provider key; without one they show honest disabled states / a labeled prompt preview (deterministic gating, brief inference, slider mapping all work offline).
- Selection Tune uses reliable non-streaming generation (per the thesis: reliable non-streaming beats simulated streaming).
- Single-browser persistence; no cloud sync.
