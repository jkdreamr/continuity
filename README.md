# Continuity

**Decide what your AI knows — before it writes or builds.**

Continuity is a local-first web app for assembling the right context _before_ you prompt an AI tool. Instead of re-pasting the same background on every task, you keep your voice, project facts, audience, references, decisions, and constraints as visible, reusable **Context Packs**. Start a task, see exactly which context is active and why, tune a few plain-English controls, and copy a sharper, task-specific prompt.

It has two surfaces powered by one engine:

- **Writing** — outreach, posts, updates, high-stakes notes (the primary, polished workflow).
- **Build (Beta)** — scope-safe change briefs for vibe-coding tools (Claude Code, Lovable, …).

> Continuity compiles a better prompt for **you** to paste. It never calls a model, has no accounts, and collects nothing in the background. Everything stays in your browser unless you export it.

---

## What makes it different

- **Inspectable, not invisible.** Every active piece of context shows its type, scope, and a one-line reason it was included — and what was left out and why.
- **Deterministic selection.** Hard mode boundaries first, then activation and tag overlap. No hidden similarity, no autonomous memory.
- **Rails that mean something.** Each intent rail maps to documented compiler behaviour; moving it visibly changes the compiled prompt.
- **The Context Thread.** A signature visual that threads each active pack down into the compiled output, so you can see your decisions being carried forward.

---

## Local setup

Requires Node.js 18.18+ (developed on Node 22). No API keys, no internet needed after install.

```bash
npm install      # install dependencies
npm run dev      # start the dev server at http://localhost:3000
```

On first run the app seeds a fictional demo workspace (the "Continuity" startup) so every screen is populated. Reset or clear it anytime from **Settings**.

## App commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Run the unit-test suite once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Test commands

Core logic is covered by Vitest (38 tests across selection, compilation, rails, export/import, and memory proposals):

```bash
npm run test          # one-shot
npm run test:watch    # watch mode
```

The required compiler behaviours (always-on inclusion, mode boundaries, manual-exclusion overrides, required constraints, rail language, safe-build non-change constraints, export/import round-trips, graceful invalid-import handling) each have dedicated tests under `tests/`.

---

## Data & persistence model

- **Local-first.** Your entire workspace — packs, tasks, and saved outputs — lives in your browser's `localStorage` under the key `continuity.workspace.v1`. There is no server and no database.
- **SSR-safe.** The store hydrates from `localStorage` on mount (seeding the demo if empty), so there are no hydration mismatches.
- **Validated.** Saved and imported data is validated at runtime with Zod (`src/lib/schema.ts`); malformed data is rejected with a friendly message rather than corrupting state.
- **Portable & disposable.** Export your workspace as JSON (Settings) or any compiled task as Markdown (Composer). Reset the demo or clear everything from Settings — clearing is confirmed and irreversible.

### Domain model (core types — `src/types/continuity.ts`)

```ts
type Mode = "writing" | "build";
type PackKind = "voice" | "project" | "audience" | "reference" | "constraint" | "decision" | "taste";

type ContextPack = {
  id; name; kind; mode: Mode | "both"; summary; details; tags: string[];
  priority: "required" | "preferred" | "optional";
  activation: "always_on" | "suggested" | "manual";
  createdAt; updatedAt;
};

type Task = {
  id; mode; title; goal; audience; destination; notes; tags: string[];
  includePackIds: string[];   // manually switched ON for this task
  excludePackIds: string[];   // manually switched OFF for this task
  rails: Record<string, number>;
  targetTool: "ChatGPT" | "Claude" | "Claude Code" | "Lovable" | "Generic";
  createdAt; updatedAt;
};

type OutputArtifact = { id; taskId; mode; targetTool; prompt; activePackIds: string[]; createdAt };
```

---

## Project structure

```
src/
  app/            # Next.js App Router pages: / , /compose , /packs , /settings
  components/
    continuity/   # domain components (Context Thread, pack editor, rails, decisions…)
    ui/           # primitives (Button, Field, Drawer, ConfirmDialog, Toast)
  lib/            # pure, tested logic: selection, compile, rails, memory, storage, schema
  data/           # seed workspace
  types/          # domain types
tests/            # Vitest unit tests
docs/             # mvp-scope.md
```

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Zod · Vitest · lucide-react. Type system: Newsreader (editorial serif) + IBM Plex Sans / IBM Plex Mono, self-hosted via `next/font`.
