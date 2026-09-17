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

/**
 * Escape a value for insertion into a DOUBLE-QUOTED HTML attribute. A
 * different job than escapeHtml above: text-node content only ever risked
 * breaking out via `&`/`<`/`>`, but an attribute value is unterminated by a
 * literal `"` too — and, since every `src="…"` in this site's HTML is
 * double-quoted, that is the one character that actually matters here. `'`
 * is escaped too, defensively, in case this is ever reused against a
 * single-quoted attribute; `<`/`>` are not strictly required in an attribute
 * value but are escaped anyway for the same reason escapeHtml already does.
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

export interface ImageSrcPatch {
  /** The frame's data-label. */
  label: string;
  /** The src attribute value the panel loaded. A mismatch aborts, rather than guessing. */
  before: string;
  /** The new src, unescaped. */
  after: string;
}

/**
 * A stale-src abort, carrying the labels that no longer match the file. Same
 * shape and purpose as StaleTextError above.
 */
export interface StaleSrcError extends Error {
  staleLabels: string[];
}

export function isStaleSrcError(err: unknown): err is StaleSrcError {
  return err instanceof Error && Array.isArray((err as StaleSrcError).staleLabels);
}

function staleSrcError(labels: string[]): StaleSrcError {
  const one = labels.length === 1;
  const err = new Error(
    `Refusing to repoint ${labels.map((l) => `"${l}"`).join(', ')}: the source ` +
      `${one ? 'image' : 'images'} changed on disk since this drop was made, so it no longer ` +
      `matches what the save was based on. Reloading will NOT clear this — drop the file ` +
      `again after reloading to pick up the current image.`,
  ) as StaleSrcError;
  err.staleLabels = labels;
  return err;
}

/**
 * Same hardcoded trio MANIFEST.slotSelector/slotKeyAttr describe on the
 * browser side ('figure.frame' / 'data-label') — duplicated for the same
 * reason RAWTEXT_TAGS above is duplicated from textEditing.ts: server/ and
 * browser code sit on opposite sides of the tsconfig boundary and neither
 * may import the other.
 */
const FRAME_TAG = 'figure';
const FRAME_CLASS = 'frame';
const LABEL_ATTR = 'data-label';

function isFrameElement(el: Element): boolean {
  if (el.tagName !== FRAME_TAG) return false;
  const cls = el.attrs?.find((a) => a.name === 'class')?.value ?? '';
  return cls.split(/\s+/).includes(FRAME_CLASS);
}

/** The first <img> found anywhere inside `el`, in document order, or null. */
function findFirstImg(el: Element): Element | null {
  let found: Element | null = null;
  walk(el, (child) => {
    if (!found && child.tagName === 'img') found = child;
  });
  return found;
}

/**
 * Repoint the <img src> inside `figure.frame[data-label="…"]` for one or more
 * slots, touching nothing else. Mirrors patchHtml's guarantees exactly: every
 * patch is resolved and validated BEFORE a single byte is written, so a bad
 * patch anywhere aborts the whole batch; replacements are applied from the
 * end of the file backwards, which keeps earlier offsets valid; and a stale
 * src aborts rather than guessing.
 */
export function patchImageSrc(source: string, patches: ImageSrcPatch[]): string {
  if (patches.length === 0) return source;

  // Same reasoning as patchHtml's own duplicate-id guard: two patches
  // targeting the same label would resolve to the same attribute and the
  // same {start,end} range, and applying both would splice against a
  // stale offset from the first.
  const seenLabels = new Set<string>();
  for (const patch of patches) {
    if (seenLabels.has(patch.label)) {
      throw new Error(`Refusing to patch: duplicate label "${patch.label}" appears more than once in the same batch`);
    }
    seenLabels.add(patch.label);
  }

  const doc = parse(source, { sourceCodeLocationInfo: true });
  const byLabel = new Map<string, Element>();
  walk(doc, (el) => {
    if (!isFrameElement(el)) return;
    const attr = el.attrs?.find((a) => a.name === LABEL_ATTR);
    if (!attr) return;
    // data-label is a system-wide unique key (imageEditing.ts finds a slot
    // by exactly this attribute), so last-wins is never correct here either.
    if (byLabel.has(attr.value)) {
      throw new Error(
        `Refusing to patch: duplicate data-label="${attr.value}" found on more than one frame in the document`,
      );
    }
    byLabel.set(attr.value, el);
  });

  const stale: string[] = [];
  const edits: Array<{ start: number; end: number; after: string }> = [];

  for (const patch of patches) {
    const frame = byLabel.get(patch.label);
    if (!frame) throw new Error(`No frame with data-label="${patch.label}"`);

    const img = findFirstImg(frame);
    if (!img) throw new Error(`Refusing to patch "${patch.label}": no <img> found inside its frame`);

    const srcAttr = img.attrs?.find((a) => a.name === 'src');
    if (!srcAttr) {
      throw new Error(`Refusing to patch "${patch.label}": its <img> has no src attribute`);
    }

    if (srcAttr.value !== patch.before) {
      stale.push(patch.label);
      continue;
    }

    // parse5 reports this location as the ENTIRE `src="…"` span (name,
    // `=`, and both quotes included), not just the value inside — so the
    // replacement text below has to reproduce that whole shape, not just
    // the value.
    const loc = img.sourceCodeLocation?.attrs?.src;
    if (!loc) {
      throw new Error(`Refusing to patch "${patch.label}": no source location found for its src attribute`);
    }

    edits.push({ start: loc.startOffset, end: loc.endOffset, after: `src="${escapeAttr(patch.after)}"` });
  }

  if (stale.length > 0) throw staleSrcError(stale);

  let out = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, e.start) + e.after + out.slice(e.end);
  }
  return out;
}
