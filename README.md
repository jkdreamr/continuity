# Continuity

**Type what you need. Continuity carries the rest.**

Continuity is a local-first **cross-model system of record** for what a founder-led team has decided, promised, assumed, and must preserve while AI generates the work. It turns scattered context into **Context Contracts** (inspectable, structured truths), holds AI accountable with a **Continuity Receipt** after meaningful work, and keeps authorship with you — no task forms, no prompt assembly, no copy-paste ritual.

Two defensible primitives run underneath every surface:

- **Context Contracts** — decisions, commitments, guardrails, approved facts, open questions, relationship and tone notes. Each item carries evidence, confidence, sensitivity, and an apply policy. Nothing is collected silently; every item traces to something you wrote, pasted, imported, or approved.
- **Continuity Receipts** — always five sections: _context used · commitments created · assumptions made · potential contradictions · what should carry forward_. Produced deterministically (offline, no key) so the accountability is real, not faked.

Three surfaces, one shared engine. On **Now** you pick one:

- **Write** (default) — **Continuity Writer**, a context-aware document editor (Tiptap). Ghost completions accepted with **Tab**, continuity-aware insights, and **direct-manipulation Tune sliders** that rewrite the selection live, in place — no Apply button.
- **Build prompt** — describe a software change, get a **Contracted Build Brief**: objective, current context, decisions to preserve, protected areas, scope and out-of-scope, verification commands, rollback notes, the exact prompt to paste, and a receipt.
- **Check** — paste any draft, email, or AI output and get a Continuity Receipt back. Runs locally; a provider only enriches it.

> Continuity chooses defaults and removes form-filling, but **automatic ≠ invisible**: every applied piece of context shows a plain-language reason and can be turned off in one tap. No background clipboard reads, no page scraping, no hidden memory.

---

## The loops

**Writing:** `Start → Write → Continuity check → Tune live → Save to contract`
Open the document desk, write. Ghost text appears at a natural pause — **Tab** to accept, **Esc** to dismiss. Continuity-aware insights flag what matters (a commitment you just made, a contradiction with your contract, an overpromise) with one safe action each. Select a passage for the **Tune** bubble; the context-specific sliders rewrite the selection **live, in place** — a single undo restores the original.

**Build:** `Ask → Contracted Build Brief → Copy to tool`
Type → **Make a change brief** → Copy for Claude Code / Lovable / Generic, or refine (Safer, Bolder, More editorial, Keep structure, Plan first). The brief carries a Continuity Receipt so the change stays accountable to your context.

**Check:** `Paste → Receipt`
Paste any text → a five-section Continuity Receipt. Save commitments or carry-forward items into a durable contract.

### Live writing help (ghost / insights / live Tune)
- **Quiet by default.** Ghost completion is gated by an idle pause, a collapsed cursor, enough context, and safety checks (no code/URL/email, no finished paragraph, no IME). At most one suggestion; never document content until **Tab**.
- **Continuity insights, not grammar squiggles** — `unclear_ask`, `accidental_commitment`, `unsupported_specificity`, `contradicts_contract`, `missing_context`, `relationship_mismatch`, `decision_drift`, `overpromise`. ≤3 at once, each with a range, a reason, and one safe action. They run **locally with no key**; a provider only enriches them. Validated and **fails closed**.
- **Direct-manipulation Tune.** Dragging a slider edits the selected passage live — no Apply button. Every transform rewrites the _original_ selection (stable under back-and-forth), intermediate edits stay out of history, and committing leaves exactly **one undo** from original → final.
- **No fake output.** Without a provider key, ghost completions and live rewrites stay off and Tune shows the exact prompt it would send. Continuity checks still run. Nothing is fabricated.

### Keyboard
- `Tab` accept ghost · `Esc` dismiss (in the editor)
- `Cmd/Ctrl + Enter` — run · `Cmd/Ctrl + K` — focus the ask (on Now)

---

## Local setup

Requires Node.js 18.18+ (developed on Node 22).

```bash
npm install
cp .env.example .env.local   # optional — add a provider key for direct drafting
npm run dev                  # http://localhost:3000
```

On first run the app seeds a small demo Library so every surface is populated. Reset or clear it from **Settings**.

### AI provider (required for Writing drafts)

Direct drafting needs a **server-side** provider key. Set one of these as an environment variable (in `.env.local` locally, or in your Vercel project settings):

| Variable | Required? | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | one key required | Recommended provider (no training on API data by default) |
| `OPENAI_API_KEY` | (alternative) | Used if Anthropic isn't set |
| `OPENROUTER_API_KEY` | (alternative) | One key, many models incl. **free** tiers — see caveat below |
| `AI_PROVIDER` | optional | `anthropic` \| `openai` \| `openrouter` to force a choice |
| `ANTHROPIC_MODEL` | optional | defaults to `claude-sonnet-4-6` |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |
| `OPENROUTER_MODEL` | optional | defaults to `openai/gpt-oss-120b:free`; paste any slug from the model page |

> **OpenRouter free tier:** `:free` models are great for testing but **may log prompts and use them for training**, which conflicts with Continuity's privacy posture — don't point them at sensitive context. You may also need to enable the free-model data policy in OpenRouter → Settings → Privacy. The deterministic features (Check, receipts, continuity insights) never call a provider, so they stay private regardless.

- Keys are read **only on the server** (`src/lib/server/`) and never sent to the browser. Do **not** use a `NEXT_PUBLIC_` prefix.
- **No provider = no fake output.** If no key is configured, Continuity shows an honest "not configured" state and still assembles + lets you copy the exact prompt. Build mode (change briefs) works fully without any key.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (67 tests) |
| `npm run test:watch` | Vitest watch mode |

Core logic is covered by tests under `tests/`: mode inference, context selection, reactions, provider configuration, migration, autosave, and the V4 compiler.

---

## Data, persistence & migrations

- **Local-first.** Packs, requests, drafts, documents, contracts, and receipts live in `localStorage` under `continuity.workspace.v1`. No server database; the only network calls are stateless generation/extraction requests.
- **Versioned migration.** On load the workspace runs through `migrateWorkspace` (`src/lib/migrate.ts`). Each version upgrades **in place** and additively: `1` (V4) → `2` (V5: `requests`/`drafts`) → `3` (V7: `documents`) → `4` (V8: `contracts`/`receipts`, plus optional `contractIds`/`receiptIds` on documents). Migration is idempotent, never destructive, and fails safe (returns `null` rather than discarding old data on garbage); old exports import cleanly.
- **Autosave.** Requests and drafts save automatically (no "Save" button). Each request keeps a draft version history.
- **Portable.** Export the whole workspace as JSON, or any draft as Markdown (Settings / result view). Reset the demo or clear everything from Settings.

---

## Privacy model

- **Continuity learns only from what you write, paste, import, or approve** — never from your browser tabs, clipboard, Gmail, Docs, Slack, or AI chats without an explicit action.
- **Stays local:** everything you create stays in your browser. Continuity Checks and continuity insights run **fully offline**.
- **Sent per generation:** only your request, the handful of approved context items shown in the *Using* line, and any source text you explicitly pasted — never your whole Library. No full-document provider calls by default.
- **Never collected:** no background reads, no tab/DOM/form scraping, no hidden model memory. Sensitive items are never auto-applied, and no speculative inference becomes durable without your confirmation.

Settings shows a live data-flow ledger and the provider connection status (never the key itself).

---

## Project structure

```
src/
  app/
    page.tsx               # Now — [Write] [Build prompt] [Check] choice
    write/                 # Continuity Writer — the Tiptap document desk
    library/               # Library — your voice, spaces, keep true, visual direction
    settings/              # Data control, provider status, privacy
    api/generate · api/provider-status · api/analyze-source
    api/writing/{generate,brief,complete,insights,transform-selection}  # server-only
    api/contracts/{check,extract,receipt}                               # server-only (V8)
  components/continuity/
    writing/               # DocumentEditor, GhostCompletion, SelectionTune (live), DocumentBriefBar
    contracts/             # ContinuityReceiptPanel, ContextContractDrawer, ContractItemCard
    …                      # context drawer, using line, reactions, mode chip…
  components/ui/            # Button, Field, Drawer, ConfirmDialog, Toast
  lib/
    writing/               # documentBrief · completionGate · tuneTemplates · insights
                           # continuityInsights · agentPrompts · agentClient · writingDocs
    contracts/             # extractContractItems · buildContextContract · detectContradictions
                           # generateContinuityReceipt · checkService · buildBrief · contractSchemas
    contextMix · reactions · generationPrompt · migrate · compile · selection · rails · …
    server/                # provider adapter + config (server-only)
  data/ · types/
tests/                     # Vitest unit tests (134)
docs/                      # mvp-scope.md · v5-product-reset.md · v7-writing-agent.md · v8-context-contracts.md
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Vitest · lucide-react. Typeface: Newsreader (editorial serif) + IBM Plex Sans / Mono, self-hosted via `next/font`.

## Known limitations

- Single-browser persistence (move data via Settings → Export/Import). No cloud sync.
- Writing drafts and **live** Tune rewrites require a configured provider key; without one you get the prompt to paste elsewhere. **Continuity Checks, receipts, and continuity insights run fully offline** — the deterministic engine is the baseline; a provider only enriches it.
- Contract extraction and contradiction detection are pattern-based and conservative by design — no embeddings/semantic retrieval in this iteration. A provider deepens extraction when configured.
- No browser extension yet (the generation + context boundaries are built to make one possible later).
