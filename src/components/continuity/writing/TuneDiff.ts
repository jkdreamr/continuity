import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";

/**
 * Transient diff decorations for live Tune. Lets the rewritten selection visibly
 * reshape: a faint active tint while shaping, then a fade/lift on the new text.
 * Decoration-only transactions never touch the document or history.
 */
export const tuneDiffKey = new PluginKey("tuneDiff");

export type TuneDecoSpec = { from: number; to: number; cls: string };
type Meta = { type: "set"; decos: TuneDecoSpec[] } | { type: "clear" };

export function tuneDiffPlugin(): Plugin {
  return new Plugin({
    key: tuneDiffKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, old) {
        const meta = tr.getMeta(tuneDiffKey) as Meta | undefined;
        if (meta?.type === "clear") return DecorationSet.empty;
        if (meta?.type === "set") {
          const decos = meta.decos
            .filter((d) => d.to > d.from)
            .map((d) => Decoration.inline(d.from, d.to, { class: d.cls }));
          return DecorationSet.create(tr.doc, decos);
        }
        return old.map(tr.mapping, tr.doc);
      },
    },
    props: {
      decorations(state) {
        return tuneDiffKey.getState(state) as DecorationSet | undefined;
      },
    },
  });
}

export function clearTuneDecos(view: EditorView): void {
  const set = tuneDiffKey.getState(view.state) as DecorationSet | undefined;
  if (set && set.find().length) view.dispatch(view.state.tr.setMeta(tuneDiffKey, { type: "clear" }));
}
