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
 * Elements whose content is the HTML tokenizer's RAWTEXT state: entities are
 * never decoded inside them (unlike RCDATA elements `title`/`textarea`,
 * which decode correctly). `escapeHtml` always HTML-escapes `after`, so
 * writing into one of these would permanently corrupt the payload — e.g.
 * `a < b` inside `<script>` becomes the literal, never-decoded text
 * `a &lt; b`, which is broken JavaScript, not an entity a browser resolves.
 *
 * A denylist, not an allowlist of "safe" flow content: the defect is
 * specific to this one content model, and an allowlist would have to
 * enumerate every tag this site's authors are allowed to put `data-edit` on,
 * rejecting legitimate future markup it doesn't yet know about. Denylisting
 * the actual defect keeps the blast radius to the tags that are provably
 * broken.
 *
 * `noscript` is included even though a real browser's parsing of it depends
 * on whether scripting is enabled: parse5 has no such toggle and always
 * parses `noscript` content as RAWTEXT, so it always needs this guard here.
 */
const RAWTEXT_TAGS = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript']);

/**
 * A stale-text abort, carrying the ids that no longer match the file.
 *
 * Typed rather than left to the caller to regex out of the message: the client
 * offers to discard exactly these edits, and coupling that recovery to the
 * wording of a human-readable sentence would break the escape hatch the next
 * time the copy is improved.
 */
export interface StaleTextError extends Error {
  staleIds: string[];
}

export function isStaleTextError(err: unknown): err is StaleTextError {
  return err instanceof Error && Array.isArray((err as StaleTextError).staleIds);
}

function staleTextError(ids: string[]): StaleTextError {
  const one = ids.length === 1;
  const err = new Error(
    `Refusing to patch ${ids.map((id) => `"${id}"`).join(', ')}: the source text changed on disk ` +
      `since ${one ? 'this edit was' : 'these edits were'} made, so it no longer matches what ` +
      `${one ? 'the edit was' : 'the edits were'} based on. Reloading will NOT clear this — the ` +
      `edit is restored from the panel's own storage. Discard the conflicting text ` +
      `edit${one ? '' : 's'} to keep saving.`,
  ) as StaleTextError;
  err.staleIds = ids;
  return err;
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

  // Two patches targeting the same id would resolve to the same element and
  // produce identical {start,end} ranges; applying both corrupts the file,
  // because the second splice uses a stale `end` against the string the
  // first splice already shortened. Catch it before any parsing or offset
  // work happens at all.
  const seenIds = new Set<string>();
  for (const patch of patches) {
    if (seenIds.has(patch.id)) {
      throw new Error(`Refusing to patch: duplicate id "${patch.id}" appears more than once in the same batch`);
    }
    seenIds.add(patch.id);
  }

  const doc = parse(source, { sourceCodeLocationInfo: true });
  const byId = new Map<string, Element>();
  walk(doc, (el) => {
    const attr = el.attrs?.find((a) => a.name === 'data-edit');
    if (attr) {
      // data-edit is a system-wide unique key (the CSS generator emits
      // `[data-edit="<id>"]` as a selector), so last-wins is never correct:
      // it would silently edit a different element than the one the panel
      // showed the user.
      if (byId.has(attr.value)) {
        throw new Error(
          `Refusing to patch: duplicate data-edit="${attr.value}" found on more than one element in the document`,
        );
      }
      byId.set(attr.value, el);
    }
  });

  // Every stale id in the batch is collected rather than thrown on sight, so
  // one round of "discard these" clears all of them instead of surfacing the
  // next conflict on every retry. Nothing is written either way — the throw
  // below still aborts the whole batch.
  const stale: string[] = [];
  const edits: Array<{ start: number; end: number; after: string }> = [];

  for (const patch of patches) {
    const el = byId.get(patch.id);
    if (!el) throw new Error(`No element with data-edit="${patch.id}"`);

    if (RAWTEXT_TAGS.has(el.tagName)) {
      throw new Error(
        `Refusing to patch "${patch.id}": <${el.tagName}> content is raw text and never decodes HTML entities, so it cannot be safely rewritten`,
      );
    }

    const kids = el.childNodes ?? [];
    const textOnly = kids.length === 0 || (kids.length === 1 && kids[0].nodeName === '#text');
    if (!textOnly) {
      throw new Error(`Refusing to patch "${patch.id}": it contains nested markup`);
    }

    const current = kids.length === 0 ? '' : ((kids[0] as { value: string }).value ?? '');
    if (current !== patch.before) {
      stale.push(patch.id);
      continue;
    }

    const loc = el.sourceCodeLocation;
    if (!loc?.startTag || !loc?.endTag) {
      throw new Error(
        `Refusing to patch "${patch.id}": no closing-tag location found — likely an omitted end tag ` +
          `(e.g. <p>, <li>, <td> implicitly closed by what follows), or, less commonly, a void element`,
      );
    }

    edits.push({ start: loc.startTag.endOffset, end: loc.endTag.startOffset, after: escapeHtml(patch.after) });
  }

  if (stale.length > 0) throw staleTextError(stale);

  let out = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.after + out.slice(e.end);
  }
  return out;
}
