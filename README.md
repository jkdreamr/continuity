# Continuity

**Type what you need. Continuity carries the rest.**

Continuity is a local-first **personal creation layer** for writing and building with AI. You type one natural-language request; Continuity quietly applies your approved voice, project, and guardrails, tells you exactly what it used, and hands back an editable draft — no task forms, no prompt assembly, no copy-paste ritual.

Two surfaces, one engine:

- **Writing** (default) — produces a finished, editable **draft** in-app via a server-side AI provider.
- **Build (Beta)** — produces a scope-safe **change brief** to copy into Claude Code, Lovable, or a generic builder.

> Continuity chooses defaults and removes form-filling, but **automatic ≠ invisible**: every applied piece of context shows a plain-language reason and can be turned off in one tap. No background clipboard reads, no page scraping, no hidden memory.

---

## The loop

**Writing:** `Ask → Draft → React`
Type → **Write it** → edit the draft or tap a reaction (Shorter, Warmer, More like me, More direct, Less polished, Reframe).

**Build:** `Ask → Change Brief → Copy / Continue`
Type → **Make a change brief** → Copy for Claude Code / Lovable, or refine (Safer, Bolder, More editorial, Keep structure, Plan first).

The whole primary writing flow is **at most two deliberate actions** after typing: click *Write it*, then copy or react.

### Keyboard
- `Cmd/Ctrl + Enter` — run the request
- `Cmd/Ctrl + K` — focus the ask field
- `Enter` — newline

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
    page.tsx              # Now — the ask → draft → react surface
    library/              # Library — your voice, spaces, keep true, visual direction
    settings/             # Data control, provider status, privacy
    api/generate/         # Server-side generation route (key never leaves the server)
    api/provider-status/  # Reports configured/provider/model — never the key
  components/continuity/   # Now composer, context drawer, mode chip, using line, reactions…
  components/ui/           # Button, Field, Drawer, ConfirmDialog, Toast
  lib/
    inferMode · contextMix · reactions · generationPrompt · generateClient
    requestTask · requests · migrate · compile · selection · rails · …
    server/                # provider adapter + config (server-only)
  data/                    # seed Library
  types/                   # domain model
tests/                     # Vitest unit tests
docs/                      # mvp-scope.md · v5-product-reset.md
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Vitest · lucide-react. Typeface: Newsreader (editorial serif) + IBM Plex Sans / Mono, self-hosted via `next/font`.

## Known limitations

- Single-browser persistence (move data via Settings → Export/Import). No cloud sync.
- Writing drafts require a configured provider key; without one, you get the prompt to paste elsewhere (Build works fully offline).
- Context selection is deterministic and conservative by design — no embeddings/semantic retrieval in this iteration.
- No browser extension yet (the generation + context boundaries are built to make one possible later).
