import { parse } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];

export interface TextPatch {
  /** The element's data-edit value. */
  id: string;
  /** Text the panel loaded. A mismatch aborts, rather than guessing. */
  before: string;
  /** Replacement, unescaped. */
  after: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function walk(node: Node, visit: (el: Element) => void): void {
  const children = (node as { childNodes?: Node[] }).childNodes ?? [];
  for (const child of children) {
    if ('tagName' in child) visit(child as Element);
    walk(child, visit);
  }
}

/**
 * Replace the text inside `[data-edit]` elements, touching nothing else.
 *
 * Every patch is resolved and validated BEFORE a single byte is written, so a
 * bad patch anywhere aborts the whole batch. Replacements are applied from the
 * end of the file backwards, which keeps earlier offsets valid.
 */
export function patchHtml(source: string, patches: TextPatch[]): string {
  if (patches.length === 0) return source;

  const doc = parse(source, { sourceCodeLocationInfo: true });
  const byId = new Map<string, Element>();
  walk(doc, (el) => {
    const attr = el.attrs?.find((a) => a.name === 'data-edit');
    if (attr) byId.set(attr.value, el);
  });

  const edits = patches.map((patch) => {
    const el = byId.get(patch.id);
    if (!el) throw new Error(`No element with data-edit="${patch.id}"`);

    const kids = el.childNodes ?? [];
    const textOnly = kids.length === 0 || (kids.length === 1 && kids[0].nodeName === '#text');
    if (!textOnly) {
      throw new Error(`Refusing to patch "${patch.id}": it contains nested markup`);
    }

    const current = kids.length === 0 ? '' : ((kids[0] as { value: string }).value ?? '');
    if (current !== patch.before) {
      throw new Error(
        `Refusing to patch "${patch.id}": the file changed on disk. Reload the page and try again.`,
      );
    }

    const loc = el.sourceCodeLocation;
    if (!loc?.startTag || !loc?.endTag) {
      throw new Error(`Refusing to patch "${patch.id}": no source location (is it a void element?)`);
    }

    return { start: loc.startTag.endOffset, end: loc.endTag.startOffset, after: escapeHtml(patch.after) };
  });

  let out = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.after + out.slice(e.end);
  }
  return out;
}
