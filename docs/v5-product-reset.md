# Continuity V5 — Frictionless Product Reset

Source of truth: `Creation_Continuity_Layer_Thesis_V5_Frictionless_Product_Reset_June_2026.docx`.
This is an inversion of the V4 interaction model, not a redesign. The Context Pack engine is preserved; the front door changes.

---

## 1. Core V5 thesis

- **Type what you need. Continuity carries the rest.** The default experience is one natural-language ask → one click → an editable draft. No task form, no pack picking, no rails before first value.
- **Context becomes automatic but never invisible.** The app chooses a small, safe context mix, shows it as one compact `Using:` line, and lets the user overturn any item in one tap via a drawer.
- **Writing is the primary surface** and must produce a real, editable draft in-app (server-side AI generation). Build is the second surface and produces a structured **Change Brief** to copy into Claude Code / Lovable.
- **Reactions replace rails.** Refinement happens *after* output through plain-language chips (Shorter, Warmer, More like me, …), each mapping to a deterministic instruction.
- **Automatic ≠ invisible.** Selection is deterministic, bounded by a context budget, conservative (only high-confidence auto-applies), and every applied item carries a plain-language reason. No scraping, no background clipboard, no silent memory.
- **Autosave.** Requests and drafts persist automatically; history is a byproduct, not a ritual.
- **Preserve the engine and the data.** Context Packs, selection logic, compiler, export/import, and the Context Thread are kept — relabeled (Library / Your voice / Spaces / Keep true) and moved behind progressive disclosure.

## 2. Current UX problems being removed

| V4 friction | V5 response |
| --- | --- |
| Choose Writing/Build, then "Start a task" | Infer mode from the request; default Writing; reversible chip |
| Fill title, goal, audience, destination, notes, tags | One Ask bar; infer the rest; ask at most one follow-up only when correctness needs it |
| Review active/available/excluded/off-scope packs | Auto-select; one `Using:` line; evidence behind a drawer |
| Tune rails before any output | Generate first; offer reaction chips after |
| Copy a compiled prompt (no draft) | Generate an editable draft in-app; prompt is a secondary "View prompt" |
| Manual "Save to history" | Autosave with a quiet saved state |
| "Context Packs" as the front-door concept | "Library" infrastructure; Now is the home |

## 3. In-scope (this iteration)

- **Now** home: dominant multiline Ask bar, example chips (new users only), inferred reversible mode chip, compact `Using:` line, primary action (Write it / Make a change brief), explicit "Use clipboard" / paste source.
- **Keyboard:** `Cmd/Ctrl+Enter` runs, `Cmd/Ctrl+K` focuses the ask, plain `Enter` = newline.
- **Real generation:** server-side provider adapter (Anthropic/OpenAI) behind a typed interface; `/api/generate`; honest "not configured" state that still shows + copies the compiled prompt; loading / cancel / error / retry.
- **Writing result:** editable draft canvas, reaction chips (More like me, Shorter, Warmer, More direct, Less polished, Reframe), copy, regenerate, export prompt (secondary), per-request version history, autosave.
- **Build result:** structured Change Brief (objective, scope, locked areas, direction, acceptance, verification) + Copy for Claude Code / Lovable / Generic + adjustments (Safer, Bolder, More editorial, Keep structure, Plan first).
- **Context Drawer** ("What Continuity is using"): 2–4 cards, each with name, reason, source band, and a per-request toggle; change Space; add/remove; "don't use automatically".
- **Library**: relabeled pack management — Your voice / Spaces / Keep true / Visual direction / Recent work.
- **Settings**: provider status (Connected / Not configured, never the key), privacy ledger, export/import, reset.
- **Data:** `QuickRequest`, `ContextMixItem`, `Draft`, `Reaction`; versioned localStorage migration (v1 → v2) with no data loss.
- **Deterministic context selection:** priority order + confidence bands + context budget + Space scoring; conservative auto-apply.

## 4. Excluded (this iteration)

- No browser extension (architecture left compatible; no build).
- No passive clipboard reads, tab/DOM/form scraping, or background collection.
- No client-side API keys, no `NEXT_PUBLIC_` provider secrets, no fake/templated "AI" output.
- No embeddings / hidden semantic retrieval — deterministic rules only.
- No code execution, canvas editor, or agent inside Continuity.
- No mandatory onboarding, auth, payments, cloud DB, or team features.

## 5. Requirements traceability checklist

| Requirement | Status | Where |
| --- | --- | --- |
| Now is the default home; one dominant ask field | ✅ | `src/app/page.tsx` |
| Example chips for new users only | ✅ | `NowAsk` |
| Cmd/Ctrl+Enter run · Cmd/Ctrl+K focus · Enter newline | ✅ | `NowAsk` |
| Inferred, reversible mode chip (default Writing) | ✅ | `lib/inferMode.ts`, `ModeChip` |
| Compact `Using:` line → Context Drawer | ✅ | `UsingLine`, `ContextDrawer` |
| Primary action: Write it / Make a change brief | ✅ | Now page |
| Real server-side generation, typed adapter | ✅ | `lib/server/provider.ts`, `app/api/generate/route.ts` |
| Honest no-provider state; still show/copy prompt | ✅ | Result view; `/api/provider-status` |
| No API key in client; no fake output | ✅ | server-only module; route returns `not_configured` |
| Editable draft + copy + regenerate + export prompt + history | ✅ | `WritingResult` |
| Reaction chips → deterministic instructions | ✅ | `lib/reactions.ts` |
| Build Change Brief + copy-for-tool + adjustments | ✅ | `BuildResult`, reuses `compile.ts` |
| Autosave requests + drafts | ✅ | `lib/requests.ts`, store |
| Context drawer: reason, source, per-task toggle | ✅ | `ContextDrawer` |
| Library relabel (voice/spaces/keep true/visual) | ✅ | `src/app/library/page.tsx` |
| Settings: provider status + privacy ledger | ✅ | `src/app/settings/page.tsx` |
| Deterministic, conservative, budgeted selection | ✅ | `lib/contextMix.ts` |
| Sensitive/manual-only never auto-applies | ✅ | `contextMix` (manual activation) |
| Versioned migration, no data loss | ✅ | `lib/migrate.ts`, schema |
| Tests, lint, build pass | ✅ | `tests/`, CI commands |

### Mandated tests (§ Required tests / 10.3)
1 default Writing · 2 Build inference · 3 explicit override · 4 baseline approved+mode · 5 manual exclusion wins · 6 pinned Space outranks keyword · 7 sensitive never auto · 8 every item explained · 9 reactions→instructions · 10 autosave · 11 migration · 12 missing provider ≠ fake · 13 keys not in client · 14 copy · 15 shortcuts · 16 drawer mobile — see `tests/` (1–12 unit; 13 config guard; 14–16 manual QA).

## 6. Data migration strategy

- **Versioning.** `Workspace.version` moves `1 → 2`. `migrateWorkspace(raw)` is run on load and on import, before validation, and is idempotent.
- **Additive, non-destructive.** v1 fields (`packs`, `tasks`, `artifacts`, `dismissedProposals`, `seededDemo`) are preserved untouched. v2 adds `requests: QuickRequest[]` and `drafts: Draft[]`, defaulting to `[]` when absent.
- **Packs → Library, no data change.** Existing packs render under Library categories by `kind` (voice→Your voice, project/audience/reference→Spaces, constraint/decision→Keep true, taste→Visual direction). No fields are dropped or rewritten.
- **Old exports import cleanly.** The Zod schema accepts both v1 and v2 (new arrays optional, defaulted), so a V4 export imports without loss.
- **Tasks/artifacts retained.** The old Task/Artifact records remain in storage (readable, exportable) even though the Composer route is removed; nothing is deleted.
- **Storage key unchanged** (`continuity.workspace.v1`) so existing users' data loads and upgrades in place on first V5 visit.
