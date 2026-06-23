import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { shouldComplete } from "@/lib/writing/completionGate";

/**
 * Ghost completion. The suggestion lives in plugin state and renders as a widget
 * decoration — it is NEVER part of the document until the user presses Tab.
 *
 * Gates: idle timer, collapsed cursor, no IME composition, deterministic
 * `shouldComplete` (context length, code/url/email, finished paragraph).
 * Safety: AbortController + monotonic request id + doc-identity + cursor-position
 * checks ensure a stale or superseded response never renders.
 */

type GhostState = { text: string | null; pos: number | null };

export const ghostKey = new PluginKey<GhostState>("ghostCompletion");

export interface GhostOptions {
  idleMs: number;
  getEnabled: () => boolean;
  complete: (args: { before: string; after: string; signal: AbortSignal }) => Promise<string | null>;
}

const BEFORE_WINDOW = 1000;
const AFTER_WINDOW = 200;

export const GhostCompletion = Extension.create<GhostOptions>({
  name: "ghostCompletion",

  addOptions() {
    return {
      idleMs: 550,
      getEnabled: () => false,
      complete: async () => null,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let abort: AbortController | null = null;
    let reqId = 0;
    let destroyed = false;

    function clearTimer() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function clearGhost(view: EditorView) {
      const cur = ghostKey.getState(view.state);
      if (cur?.text) view.dispatch(view.state.tr.setMeta(ghostKey, { text: null, pos: null }));
    }

    async function fire(view: EditorView) {
      if (destroyed || !options.getEnabled() || view.composing) return;
      const { selection, doc } = view.state;
      if (!selection.empty) return;

      const head = selection.head;
      const before = doc.textBetween(Math.max(0, head - BEFORE_WINDOW), head, "\n", " ");
      const after = doc.textBetween(head, Math.min(doc.content.size, head + AFTER_WINDOW), "\n", " ");

      if (!shouldComplete({ beforeCursor: before, afterCursor: after, collapsed: true, composing: view.composing, hasContext: before.trim().length >= 12 })) {
        return;
      }

      const myId = ++reqId;
      abort?.abort();
      abort = new AbortController();
      const docAtRequest = doc;

      let suggestion: string | null = null;
      try {
        suggestion = await options.complete({ before, after, signal: abort.signal });
      } catch {
        suggestion = null;
      }

      // Staleness: superseded request, destroyed, doc changed, cursor moved, or
      // selection no longer collapsed -> never render.
      if (destroyed || myId !== reqId || !suggestion) return;
      const state = view.state;
      if (state.doc !== docAtRequest) return;
      if (!state.selection.empty || state.selection.head !== head) return;

      view.dispatch(state.tr.setMeta(ghostKey, { text: suggestion, pos: head }));
    }

    return [
      new Plugin<GhostState>({
        key: ghostKey,
        state: {
          init: () => ({ text: null, pos: null }),
          apply(tr, value) {
            const meta = tr.getMeta(ghostKey) as GhostState | undefined;
            if (meta !== undefined) return meta;
            // Any document edit invalidates a visible ghost.
            if (tr.docChanged && value.text) return { text: null, pos: null };
            if (value.pos != null) return { text: value.text, pos: tr.mapping.map(value.pos) };
            return value;
          },
        },
        props: {
          decorations(state) {
            const s = ghostKey.getState(state);
            if (!s?.text || s.pos == null) return DecorationSet.empty;
            const widget = Decoration.widget(
              s.pos,
              () => {
                const span = document.createElement("span");
                span.className = "ghost-completion";
                span.textContent = s.text;
                return span;
              },
              { side: 1, marks: [] },
            );
            return DecorationSet.create(state.doc, [widget]);
          },
          handleKeyDown(view, event) {
            const s = ghostKey.getState(view.state);
            if (!s?.text || s.pos == null) return false;
            if (event.key === "Tab") {
              event.preventDefault();
              view.dispatch(view.state.tr.insertText(s.text, s.pos).setMeta(ghostKey, { text: null, pos: null }));
              return true;
            }
            if (event.key === "Escape") {
              view.dispatch(view.state.tr.setMeta(ghostKey, { text: null, pos: null }));
              return true;
            }
            return false;
          },
        },
        view() {
          return {
            update(view, prevState) {
              if (!options.getEnabled()) {
                clearTimer();
                return;
              }
              const docChanged = !prevState.doc.eq(view.state.doc);
              const selChanged = !prevState.selection.eq(view.state.selection);
              if (!docChanged && !selChanged) return;

              clearTimer();
              abort?.abort();
              if (!view.state.selection.empty || view.composing) {
                clearGhost(view);
                return;
              }
              clearGhost(view);
              timer = setTimeout(() => fire(view), options.idleMs);
            },
            destroy() {
              destroyed = true;
              clearTimer();
              abort?.abort();
            },
          };
        },
      }),
    ];
  },
});
