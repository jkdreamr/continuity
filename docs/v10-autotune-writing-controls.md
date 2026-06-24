# Continuity V10 — AutoTune Writing Controls & Instant Direct Manipulation

Source of truth: `Creation_Continuity_Layer_Thesis_V10_AutoTune_Writing_Controls_June_2026.docx`
and `Continuity_V10_AutoTune_Writing_Controls_Claude_Code_Prompt.md`. A surgical
upgrade on V8 — not a rebuild.

> **Decision:** Replace the unimplemented V9 "Intent Pack" gallery with a
> recommendation engine. Writers never pick a prompt pack. Continuity reads the
> moment and recommends a posture across three controls — **Formality, Length,
> Naturalness** — then leaves the writer in control. Build recommends an
> **approach**, not a pack.

## 1. Repo audit (current state)

- Next 14 App Router, React 18, TS, Tailwind v3, Zod, Vitest, Tiptap 2.27.
- Surfaces: `Now` (`src/app/page.tsx`, Write | Build prompt | Check), Writing desk
  (`src/app/write` + `DocumentEditor.tsx` + `SelectionTune.tsx`), Library, Settings.
- V8 layer intact: Context Contracts + Continuity Receipts (`src/lib/contracts/*`),
  Check mode, deterministic engines offline-first, provider enrich-only.
- Live Tune already exists (V8): `SelectionTune.tsx` is direct-manipulation, **no
  Apply button**, original-base invariant, restore-then-commit single undo, request
  counter, debounce, no-provider prompt preview. Per-doc-type axis templates live in
  `tuneTemplates.ts`. Transform is JSON (`/api/writing/transform-selection`).
- Providers: `providerConfig.ts` (anthropic | openai | openrouter), `provider.ts`
  non-streaming `generate()`. Honest 503 when unconfigured; never fakes output.
- Persistence: localStorage `continuity.workspace.v1`, versioned migration (v→4),
  additive/idempotent/fail-safe.

## 2. What V10 changes

- **Replace** per-doc-type tune templates with three universal controls
  (Formality / Length / Naturalness) plus a deterministic **AutoTune recommendation
  engine** that derives a non-50/50 baseline from explicit instruction → contract →
  brief → selection → approved voice → neutral.
- **Tune feels live (three-speed):** instant rAF UI (<16ms), LRU cache (<100ms),
  streamed `text/plain` provider rewrite. 7-stop quantization. Visible word-level
  diff via ProseMirror decorations. Still no Apply button; one Undo restores original.
- **Now becomes a launcher:** one composer, no stats tiles / receipt panel / card wall.
- **Build recommends an approach** (explore-plan | debug-verify | minimal-diff |
  design-refinement | safety-review) and augments the Contracted Build Brief.
- **Receipts** appear only when meaningful (a commitment preserved, a constraint
  limited the edit, an overpromise removed). No empty ritual.

## 3. Behavior contract

- Recommending controls **never mutates text**. Text changes only when the writer
  moves a control or clicks a contextual quick action.
- Explicit user instruction outranks everything. A contract constrains but can never
  silently force a style the user cannot override (`userOverride`).
- Naturalness = less formulaic, more specific, truer to the point. It preserves facts,
  commitments, citations, deadlines, named entities, relationship context. It never
  adds typos/slang/forced contractions/fake emotion and never claims AI-detector
  evasion or "human-written" certification. UI label is **Naturalness**, action
  **Make more natural**.
- Stable-base invariant: every transform derives from the ORIGINAL selection + current
  contract + neighbor context + full 3-axis vector. Never from a prior transient rewrite.
- No fake instant rewrite: with no cache hit, show a "Shaping from your original"
  transition, then stream the real rewrite. With no provider, show the prompt preview
  and never change text.

## 4. Files (added / changed)

Added: `src/lib/writing/autoTune/{types,recommend,rules,explain,normalize,buildApproach}.ts`,
`src/lib/writing/tunePrompts.ts` (Appendix A rewrite instructions), `src/lib/writing/tuneCache.ts`,
`src/lib/writing/tuneTiming.ts`, `src/components/continuity/writing/AutoTuneRecommendation.tsx`,
`src/components/continuity/writing/AutoTuneWhyDrawer.tsx`,
`src/components/continuity/writing/TuneDiff.ts` (PM diff decorations),
`src/app/api/writing/tune-stream/route.ts`.
Changed: `SelectionTune.tsx` (full rework), `DocumentEditor.tsx` (wire recommendation),
`tuneTemplates.ts` (3 controls), `provider.ts`/`providerConfig.ts` (AI_FAST_MODEL + stream),
`agentClient.ts` (streaming client), `compile.ts`/`buildBrief.ts` (approach modules),
`page.tsx` (launcher + Build approach UI), `types/continuity.ts`.

## 5. Performance budget

- Instant UI < 16ms (rAF only, never awaits network). Cache hit < 100ms.
- Quantize to 7 stops: 0, 17, 33, 50, 67, 83, 100. Remote calls only on vector change.
- Debounce 100–140ms during drag; flush on pointer release; abort stale.
- Payload: selected text + ≤~300 chars each side + compact contract summary + brief +
  3-axis vector + optional voice summary. Never the full document by default.
- `AI_FAST_MODEL` for interactive writes; fall back to configured model. `text/plain`
  streaming for rewrites; JSON only for contracts/receipts/insights.
- Diff transition 140–220ms; `prefers-reduced-motion` → color/diff state only.
- `?debugTune=1` dev-only timing overlay; opaque IDs/hashes only, never raw text.

## 6. Migration & privacy

- Additive only: optional `autoTunePreferences` on the workspace (approved, with
  evidence). No per-selection/vector persistence. Migration stays idempotent and
  fail-safe; never deletes local data.
- Privacy reinforced: "Continuity learns only from what you write, paste, import, or
  approve." "Tune sends only the relevant selection and minimal surrounding/approved
  context to the selected model." No background collection of any kind.

## 7. Test plan

Recommendation engine (precedence, all baseline profiles, low-confidence neutral,
reasons present/safe, override, no silent persistence). Naturalness guardrails (prompt
content asserts preservation + forbids slang/typos/detector claims). Build approach
(each detected condition → approach, reasons, override; copies preserved). Tune utils
(7-stop quantize, cache-key correctness, cache hit, stable-base). UI invariants
(no Apply, prompt preview with no provider). lint / typecheck / test / build + manual QA.

## 8. Receipts & approved preferences (implemented)

- **Meaningful-only Tune receipt** (`tuneReceipt.ts`): after a control settles, the chip
  shows "Kept …" (a preserved commitment/decision/constraint) and "Changed …" (overpromise
  or generic framing removed, tightening) — and returns nothing when there is nothing
  meaningful to say, so there is no empty ritual.
- **Approved preferences** (`tunePreferences.ts`): a one-off adjustment is never saved.
  Only a direction accepted **three times** becomes a *proposed* preference ("You often make
  writing more natural. Make it your default?"); once approved it gently nudges future
  recommendations. Stored under its own `localStorage` key — the workspace schema is
  untouched (no migration), keeping V8 data and the no-silent-persistence guarantee intact.

## 9. Known limitations

- Streamed rewrite + visible diff require a provider key to exercise end-to-end; the
  instant-UI, cache, quantization, recommendation, prompt-preview, receipt, and
  preference paths run offline.
- Recommendation is deterministic/heuristic (no LLM for initial settings, by design).
