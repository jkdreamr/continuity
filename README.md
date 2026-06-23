# Continuity

**Type what you need. Continuity carries the rest.**

Continuity is a local-first **personal creation layer** for writing and building with AI. It quietly applies your approved voice, project, and guardrails, tells you exactly what it used, and keeps authorship with you — no task forms, no prompt assembly, no copy-paste ritual.

Two distinct surfaces, one shared context engine. On **Now** you pick one:

- **Write** (default) — opens **Continuity Writer**, a context-aware document editor (Tiptap). Write from a blank page, a one-line brief, or pasted source. As you write you get low-noise inline help: ghost completions accepted with **Tab**, sparse contextual insights, and selection-level rewrites via live **Tune** sliders. _A writer never has to stop writing to operate the AI._
- **Build prompt** — **Build Prompt Studio** stays prompt-first: describe a software change, get a scope-safe **change brief** to copy into Claude Code, Lovable, or a generic builder.

> Continuity chooses defaults and removes form-filling, but **automatic ≠ invisible**: every applied piece of context shows a plain-language reason and can be turned off in one tap. No background clipboard reads, no page scraping, no hidden memory.

---

## The loops

**Writing:** `Start → Write → Inline help → Tune selection → Learn`
Open the document desk, write. Ghost text appears at a natural pause — **Tab** to accept, **Esc** to dismiss. Select a passage for the **Tune** bubble (`Shorter · Warmer · More direct · Tune`); the three context-specific sliders show their intent live and apply only on your click. A task-local **Document Brief** (editable chips) and a quiet `Using:` line keep context visible.

**Build:** `Ask → Change Brief → Copy to tool`
Type → **Make a change brief** → Copy for Claude Code / Lovable / Generic, or refine (Safer, Bolder, More editorial, Keep structure, Plan first).

### Live writing help (ghost / insights / Tune)
- **Quiet by default.** Ghost completion is gated by an idle pause, a collapsed cursor, enough context, and safety checks (no code/URL/email, no finished paragraph, no IME). At most one suggestion; it is a decoration, never document content until **Tab**.
- **Insights are semantic, not grammar squiggles** — ask clarity, tone fit, voice drift, redundancy, unsupported specificity. ≤3 at once, each with a range and a reason; Apply / Dismiss / Not-for-this-document. Validated and **fails closed**.
- **No fake output.** Without a provider key, ghost/insights stay off and Tune shows the exact prompt it would send. Nothing is fabricated.

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
| `ANTHROPIC_API_KEY` | one key required | Recommended provider |
| `OPENAI_API_KEY` | (alternative) | Used if Anthropic isn't set |
| `AI_PROVIDER` | optional | `anthropic` \| `openai` to force a choice |
| `ANTHROPIC_MODEL` | optional | defaults to `claude-sonnet-4-6` |
| `OPENAI_MODEL` | optional | defaults to `gpt-4o-mini` |

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

- **Local-first.** Packs, requests, and drafts live in `localStorage` under `continuity.workspace.v1`. No server database; the only network call is the stateless generation request.
- **Versioned migration.** On load the workspace is run through `migrateWorkspace` (`src/lib/migrate.ts`). V4 data (`version: 1`) upgrades **in place** to V5 (`version: 2`) — existing packs, tasks, and artifacts are preserved and the new `requests`/`drafts` arrays are added. Migration is idempotent and non-destructive; old exports import cleanly.
- **Autosave.** Requests and drafts save automatically (no "Save" button). Each request keeps a draft version history.
- **Portable.** Export the whole workspace as JSON, or any draft as Markdown (Settings / result view). Reset the demo or clear everything from Settings.

---

## Privacy model

- **Stays local:** everything you create stays in your browser.
- **Sent per generation:** only your request, the handful of approved context items shown in the *Using* line, and any source text you explicitly pasted — never your whole Library.
- **Never collected:** no background clipboard reads, no tab/DOM/form scraping, no hidden memory. Clipboard and pasted source are used only on an explicit click and stay on that request unless you save them.

Settings shows a live data-flow ledger and the provider connection status (never the key itself).

---

## Project structure

```
src/
  app/
    page.tsx               # Now — [Write] [Build prompt] choice
    write/                 # Continuity Writer — the Tiptap document desk
    library/               # Library — your voice, spaces, keep true, visual direction
    settings/              # Data control, provider status, privacy
    api/generate · api/provider-status · api/analyze-source
    api/writing/{generate,brief,complete,insights,transform-selection}  # server-only
  components/continuity/
    writing/               # DocumentEditor, GhostCompletion, SelectionTune, DocumentBriefBar
    …                      # context drawer, using line, reactions, mode chip…
  components/ui/            # Button, Field, Drawer, ConfirmDialog, Toast
  lib/
    writing/               # documentBrief · completionGate · tuneTemplates · insights
                           # agentPrompts · agentClient · sourceAnalysis · writingDocs
    contextMix · reactions · generationPrompt · migrate · compile · selection · rails · …
    server/                # provider adapter + config (server-only)
  data/ · types/
tests/                     # Vitest unit tests (96)
docs/                      # mvp-scope.md · v5-product-reset.md · v7-writing-agent.md
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Vitest · lucide-react. Typeface: Newsreader (editorial serif) + IBM Plex Sans / Mono, self-hosted via `next/font`.

## Known limitations

- Single-browser persistence (move data via Settings → Export/Import). No cloud sync.
- Writing drafts require a configured provider key; without one, you get the prompt to paste elsewhere (Build works fully offline).
- Context selection is deterministic and conservative by design — no embeddings/semantic retrieval in this iteration.
- No browser extension yet (the generation + context boundaries are built to make one possible later).
