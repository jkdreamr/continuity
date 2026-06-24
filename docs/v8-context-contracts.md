# Continuity V8 — Context Contracts & Continuity Receipts

Source of truth: `Creation_Continuity_Layer_Thesis_V8_Context_Contracts_Receipts_June_2026.docx`.
A surgical upgrade on the V7 Next/Tiptap app — not a rebuild.

> **Positioning shift:** Continuity is not a better Grammarly / prompt manager / memory folder. It is the **cross-model system of record** for what a founder-led team has decided, promised, assumed, and must preserve while AI generates work. The question changes from "can it write this better?" to "does this stay faithful to what we decided, promised, and must keep true?"

---

## 1. Thesis in brief

Five defensible primitives:
1. **Context Contracts** — small, structured, inspectable task/project truths: objective, approved facts, decisions, commitments, constraints, open questions, relationship/tone notes, and evidence. User-owned, editable, suppressible, exportable.
2. **Continuity Receipts** — produced after important work, always five sections: context used · commitments created · assumptions made · potential contradictions · what should carry forward. Every item has an explanation + evidence.
3. **Direct-manipulation sliders** — highlight text, move a slider, the selection changes **live in place**. No Apply button; release commits one undoable transaction.
4. **Build Prompt Studio** — preserved, prompt-first; output becomes a **Contracted Build Brief** (+ receipt).
5. **Continuity Check** — paste an email / spec / memo / Claude Code prompt → get a receipt before sending or using it.

## 2. Repo readout (preserved)

Next 14 + Tiptap + Zod + Vitest. `Now` separates Write / Build and routes Write → `/write`; `DocumentEditor` wires Tiptap + ghost completion + brief inference + insights + context drawer + `SelectionTune`; provider routes are server-only with an honest no-provider state; workspace is local-first at `continuity.workspace.v1`, currently version 3. **Build prompt flow, provider architecture, and all local data are preserved.** SelectionTune is converted in place (not rebuilt).

## 3. Implementation plan (phases)

1. **Types + pure engines** — `ContractItem`, `ContextContract`, `ContinuityReceipt`, `ReceiptConflict`; modules `extractContractItems`, `buildContextContract`, `generateContinuityReceipt`, `detectContradictions`, `contractPrompts`, `contractSchemas`. Deterministic baselines (work offline, testable); provider enriches when configured.
2. **Check mode** — `Now: Write | Build prompt | Check`; routes `/api/contracts/{check,extract,receipt}`; five-part receipt UI with save/keep-task-only/copy/discard.
3. **Contracted Build Brief** — objective · current context · decisions to preserve · protected areas · scope · out of scope · implementation direction · acceptance checks · verification commands · rollback notes · prompt to paste · receipt. Copy-for-tool buttons kept.
4. **Continuity-aware writing insights** — replace generic grammar with continuity categories (`unclear_ask`, `accidental_commitment`, `unsupported_specificity`, `contradicts_contract`, `missing_context`, `relationship_mismatch`, `decision_drift`, `overpromise`). ≤3 visible; range + rationale + evidence + one safe action + Dismiss + Not-for-document.
5. **Live direct-manipulation sliders** — capture original selection once; rewrite always derives from `original + contract + surrounding + full slider vector` (never from prior rewrite); 150–300ms debounce; flush on release; AbortController + request counter; intermediate patches `addToHistory:false`; commit = restore-original then apply-final as one history step → `Cmd/Ctrl+Z` restores original; "Tuned · Undo" chip; cancel on manual edit; provider-missing → live prompt preview only.
6. **Drawer language** — contract vocabulary: What Continuity is using · Context Contract · Decisions · Commitments · Approved facts · Keep true · Open questions · Evidence. Each item shows statement, reason used, evidence, scope, auto/review/manual-only, remove, suppress, forget.
7. **Receipt UI** — `ContinuityReceiptPanel`, `ContextContractDrawer`, `ContractItemCard`. Quiet operational receipt, not a compliance dashboard.
8. **Persistence + migration** (below).
9. **Privacy language** (below).
10. **Tests** (below).

## 4. Migration strategy (v3 → v4, fail-safe)

`migrateWorkspace` bumps `version 3 → 4`, additively. Existing `packs`, `requests`, `drafts`, `documents`, `tasks`, `artifacts` are preserved untouched. v4 adds `contracts: ContextContract[]` and `receipts: ContinuityReceipt[]` (default `[]`); each `WritingDocument` gains optional `contractIds`/`receiptIds` (defaulted via schema). Build receipts are generated **on open**, never via mass background processing. Idempotent; malformed/unrecoverable input returns `null` so the caller falls back **without** overwriting raw localStorage. Storage key unchanged.

## 5. Privacy rules (preserved + extended)

- "Continuity learns only from what you write, paste, import, or approve."
- "Receipts are saved only when you choose to keep them."
- "Sources stay task-local unless you save them to a contract."
- No passive collection (tabs, clipboard, Gmail, Docs, Slack, AI chats); no background memory extraction; no hidden durable memory — every saved contract item has visible evidence + controls. No client-side API keys; no raw sensitive text in logs. Provider calls use slices/contracts/receipts, never the full document by default. **No fake AI output when no provider is configured.**

## 6. Test plan

Contracts: extraction schema validation · facts require evidence · commitments/constraints/open-questions detected · sensitive items default to review/manual-only · low-confidence items don't auto-save.
Receipts: always five sections · commitments separated from assumptions · contradiction severity · carry-forward requires user action · copy/export.
Build: studio still works · Claude Code/Lovable/Generic copy · contracted brief has protected areas + acceptance checks + verification commands + receipt · no fake output without provider.
Writing: continuity categories not grammar · range mapping · dismiss/suppress · drawer shows reasons + evidence.
Live sliders: no Apply · debounced transform · release flushes · stale responses can't patch · stable original base · no drift across moves · manual edit cancels · Undo restores original · provider-missing preview only · cache key includes original + contract + slider vector.
Migration: V7 data migrates safely · old drafts/documents/requests open · malformed data is non-destructive.

CI: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## 7. Known limitations (tracked)

- Deterministic engines run offline and power Check/receipts/insights without a key; a configured provider deepens extraction/wording but is never required and never faked.
- Single-undo for live tune uses a restore-then-commit history trick; a visible `Undo`/`Revert` chip is the guaranteed fallback.
- Contradiction detection is content-word matching against contract constraints/decisions — high precision, not exhaustive; a provider enriches it.
- Live Tune mutation requires a provider (no fake rewrites); the slider still streams the exact prompt offline.

---

## 8. Implementation status (shipped)

All ten phases landed as a surgical upgrade on V7. Existing local data, the Build workflow, and all prior tests are preserved.

**Engine (offline, deterministic, tested):**
- `src/lib/contracts/extractContractItems.ts` — pattern classifier → contract items with evidence/confidence/sensitivity/applyPolicy.
- `buildContextContract.ts`, `detectContradictions.ts`, `generateContinuityReceipt.ts` (+ `receiptToMarkdown`), `checkService.ts` (`runContinuityCheck` + `mergeProviderItems`), `buildBrief.ts` (`buildContractedBrief` + `briefToMarkdown`), `contractSchemas.ts` (Zod, fail-closed `validateExtraction`), `contractPrompts.ts`, `contractMeta.ts`.
- `src/lib/writing/continuityInsights.ts` — eight continuity categories with ranges + one safe action; `insights.ts` gains `mergeInsights` (local-first).

**Routes (server-only, honest 503 / deterministic-first):** `api/contracts/{extract,check,receipt}`.

**Store:** `WorkspaceProvider` gains `saveContract`, `addContractItem`, `updateContractItem`, `saveReceipt`, `attachToDocument`.

**UI:** Now gains a **Check** surface (`Write | Build prompt | Check`) rendering `ContinuityReceiptPanel`; Build result shows the Contracted Build Brief receipt + "Copy full brief"; `DocumentEditor` runs continuity insights offline and exposes a document **Contract** drawer; `SelectionTune` rewritten to live direct manipulation (no Apply, original-base invariant, request-counter, addToHistory:false intermediates, restore-then-commit single undo, "Tuned · Undo" chip). New slider templates: formal email (Directness / Commitment level / Warmth), product memo (Compression / Conviction / Decision clarity), founder update (Confidence / Detail / Ask clarity), build (Safety / Structure / Specificity).

**Migration:** `version: 4` — additive `contracts`/`receipts` arrays + optional `contractIds`/`receiptIds`; idempotent, fail-safe.

**Verification:** `tsc --noEmit` clean · `next lint` clean · **134 Vitest tests pass** · `next build` succeeds (3 new routes registered) · browser QA confirmed Check receipt, offline insights with save-to-contract, and the live Tune panel (no Apply, live prompt, honest no-provider state).
