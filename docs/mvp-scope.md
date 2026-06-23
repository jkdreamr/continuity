# Continuity — MVP Scope

_A creator-controlled Context Pack system for writing and building with AI._
Source of truth: `Creation_Continuity_Layer_Thesis_V4_Investor_Founder_Developer_June_2026.docx`.
This document is the build scope; where it conflicts with the thesis, the build mandate wins.

---

## 1. The MVP thesis (in 8 bullets)

- **Context, not prompts.** People re-explain themselves to AI on every serious task. Continuity removes that "context debt" by keeping the parts of their thinking that should persist — voice, project facts, audience, references, decisions, and constraints — as reusable **Context Packs**.
- **Visible, not hidden.** The technical north star: _a Context Pack is an inspectable artifact, not an invisible model state._ Every active item shows its content, type, scope, and a one-line reason it is included.
- **Control, not memory.** This is not "AI that remembers everything." It is a control surface that makes the user **more deliberate** — they choose what carries forward and can see exactly what was left out and why.
- **Deterministic selection.** Context is chosen by hard scope rules first (mode boundaries), then activation and tag overlap — never by hidden similarity or autonomous memory.
- **Rails that mean something.** Plain-English intent rails map to documented compiler behavior ("no placebo sliders"). Moving a rail visibly changes the compiled prompt.
- **One core, two surfaces.** A single Context Pack engine powers **Writing** (the polished wedge) and **Build (Beta)** (a narrower, scope-safe change-brief compiler for vibe-coding tools).
- **Portable & owned.** Output is a model-neutral, paste-ready prompt. All data is local-first, exportable as JSON/Markdown, and deletable.
- **Honest learning.** Memory proposals are derived only from saved choices ("you added this twice"), labelled _Suggested from your saved choices_, and always require explicit accept / edit / dismiss.

---

## 2. Explicitly included (built)

### Screens
- **Home / Workspace** — concise product explanation, Writing/Build mode switch, recent tasks, always-on packs, start-a-task and create-pack actions, memory suggestions, seeded demo on first run.
- **Context Packs** — filter by type / mode / activation / priority; create, edit, duplicate, delete; teaching empty state; pack editor drawer with friendly labels and a usage preview.
- **Composer** (`/compose`) — task fields with progressive disclosure; suggested active packs with per-pack rationale and manual include/exclude; intent rails; **live** compiled output; Context Thread; target-tool switch; copy; save to history; export Markdown.
- **Settings / Data Control** — export JSON, import JSON with validation + friendly errors, reset demo, clear all (confirmed), privacy statement.

### Core engine (pure, tested)
- Relevant context selection with human-readable reasons (`src/lib/selection.ts`).
- Writing + Build prompt compilers, target-tool aware (`src/lib/compile.ts`).
- Intent-rail language mapping (`src/lib/rails.ts`).
- Local persistence, SSR-safe (`src/lib/storage.ts`).
- Export/import validation with Zod (`src/lib/exportImport.ts`, `src/lib/schema.ts`).
- Memory proposal generation from saved choices (`src/lib/memory.ts`).

### Signature
- **Context Thread** — a vertical spine that threads each active pack (a bead in its kind color) and carries them down into a single compiled-output terminal. Respects `prefers-reduced-motion`.

### Two modes
- **Writing rails:** Concise↔Expansive, Direct↔Nuanced, Conversational↔Formal, Collaborative↔Assertive, Preserve↔Reframe.
- **Build rails:** Preserve structure↔Reimagine, Restrained↔Expressive, Safer↔Bolder, Behavior protected↔Intentional change.
- Build output includes scope, an explicit "Do not change" list (auto-expanded on safe settings), acceptance criteria, and verification steps; adapts to Claude Code / Lovable / ChatGPT / Generic.

---

## 3. Explicitly excluded (per mandate)

Not built, by design: browser extension; direct integrations (ChatGPT/Claude/Gmail/Notion/Drive/Lovable/Bolt/Claude Code); auth; payments; cloud database; background scraping / hidden memory; AI API calls needing a secret key; vector DB / RAG; team workspaces; social feeds / prompt marketplaces / public templates; a marketing site; **fake AI generation**.

The app runs fully offline after `npm install`. Continuity compiles a better prompt for the user to paste — it never calls a model itself.

---

## 4. Product decisions made during implementation

1. **Composer and Output are one screen.** The thesis insists the "magic" happens in under 60 seconds; splitting compose/output adds a step. The composer shows the live output and Context Thread side-by-side (stacked on mobile).
2. **`Task.selectedPackIds` → `includePackIds` + `excludePackIds`.** The suggested schema's single list can't express "manually removed an always-on pack." Two explicit override lists make every decision reversible and inspectable. (Documented deviation; the spec invited schema improvement.)
3. **Four decision states, not two.** Selection yields `active | available | excluded | unavailable`, each with a reason. This powers the transparent "what's active and why / what's off-scope" surface.
4. **Mode is a hard boundary, applied first.** A Build-only pack is `unavailable` in a Writing task even if manually added — matching the thesis's "hard filters before ranking."
5. **Rails carry exact compiler text.** Each rail stores the literal phrase emitted at low/mid/high bands, so the UI's "why" line and the compiled prompt are guaranteed to match.
6. **Memory proposals are content-deterministic.** Proposal ids derive from the underlying packs so dismissals persist and nothing is proposed twice.
7. **Light, editorial theme only.** A single disciplined "control room" theme (Newsreader + IBM Plex Sans/Mono) serves the brand better than a light/dark toggle. Dark mode is a deliberate non-goal for the MVP.
8. **Local-first via a debounced localStorage store** with deterministic SSR hydration (empty → seed on mount) to avoid hydration mismatches.

---

## 5. Requirements traceability checklist

| Requirement (from mandate) | Status | Where |
| --- | --- | --- |
| Create visible, editable Context Packs | ✅ | `/packs`, `PackEditor`, `WorkspaceProvider` |
| Start writing or build task | ✅ | Home → `createTask` → `/compose` |
| See which context is active **and why** | ✅ | `selection.ts`, `DecisionRow`, `ContextThread` |
| Adjust high-level intent controls | ✅ | `rails.ts`, `RailControl` |
| Copy a better task-specific prompt | ✅ | `compile.ts`, `PromptPreview` |
| First-run seeded demo workspace | ✅ | `src/data/seed.ts` |
| Create / edit / delete / duplicate packs | ✅ | `WorkspaceProvider`, `PackCard`, `PackEditor` |
| Mode (Writing/Build/Both), priority, activation, tags | ✅ | `PackEditor`, domain types |
| Preview where a pack is used; manual include/exclude | ✅ | `PackEditor` usage line; `DecisionRow` |
| Friendly, non-technical pack labels | ✅ | `packKinds.ts` ("How I sound", etc.) |
| Writing compiler with role/audience/context/constraints/tone/deliverable/avoid | ✅ | `compile.ts` |
| Five writing rails that change prompt language | ✅ | `rails.ts`, test `rails`/`compile` |
| Build Beta: scope, do-not-change, acceptance, verification | ✅ | `compile.ts` (build) |
| Build "Safer change" expands non-change constraints | ✅ | `compile.ts`, test `compile` |
| Output adapts to target tool | ✅ | `compile.ts` `framing()` |
| Memory proposals ("Suggested from your saved choices") | ✅ | `memory.ts`, `ProposalCard` |
| Export JSON / import with validation / clear / reset demo | ✅ | `/settings`, `exportImport.ts` |
| Tests for selection, compile, rails, export/import, memory | ✅ | `tests/` (38 tests) |
| No dead buttons; every control works | ✅ | Manual QA |
| Local-first, offline, no API keys | ✅ | localStorage only |
| Accessible focus, reduced motion, mobile, semantic controls | ✅ | `globals.css`, components; QA at 375px |

### Required compiler tests (mandate §9)
1. Always-On matching-mode packs included — ✅ `selection.test.ts`
2. Build-only packs absent from Writing tasks — ✅ `selection.test.ts`
3. Manual exclusions override suggestion logic — ✅ `selection.test.ts`
4. Required constraints appear in compiled prompts — ✅ `compile.test.ts`
5. Writing rail values change prompt language — ✅ `rails.test.ts`, `compile.test.ts`
6. Safe Build scope produces non-change constraints — ✅ `compile.test.ts`
7. Export/import preserves valid data — ✅ `exportImport.test.ts`
8. Invalid import rejected gracefully — ✅ `exportImport.test.ts`

---

## 6. Known limitations

- Single-browser persistence (by design); no sync. Move data between browsers via Settings → Export/Import.
- Light theme only (dark mode is an explicit non-goal).
- The compiler is deterministic and template-driven; it produces a strong prompt to paste, and intentionally does **not** call any model.
- Memory proposals cover three honest patterns (promote-to-always-on, build-scope confirmation, fold-constraint-into-voice); richer learning is future work.
