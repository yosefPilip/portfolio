import { describe, it, expect } from 'vitest';
import { patchHtml } from '../src/panel/server/htmlPatcher';
import { MANIFEST } from '../src/panel/manifest';

const DOC = `<!DOCTYPE html>
<html><body>
  <p data-edit="a">Original text</p>
  <p data-edit="b">Second &amp; sound</p>
  <p data-edit="c">Has <em>markup</em> inside</p>
</body></html>`;

describe('patchHtml', () => {
  it('replaces only the targeted inner range', () => {
    const out = patchHtml(DOC, [{ id: 'a', before: 'Original text', after: 'New text' }]);
    expect(out).toContain('<p data-edit="a">New text</p>');
    expect(out).toContain('<p data-edit="b">Second &amp; sound</p>');
    expect(out).toContain('<!DOCTYPE html>');
  });

  it('leaves every other byte identical', () => {
    const out = patchHtml(DOC, [{ id: 'a', before: 'Original text', after: 'New text' }]);
    expect(out).toBe(DOC.replace('Original text', 'New text'));
  });

  it('compares against decoded text, so entities in source are not a mismatch', () => {
    const out = patchHtml(DOC, [{ id: 'b', before: 'Second & sound', after: 'Third' }]);
    expect(out).toContain('<p data-edit="b">Third</p>');
  });

  it('escapes the incoming text', () => {
    const out = patchHtml(DOC, [{ id: 'a', before: 'Original text', after: 'a & b < c > d' }]);
    expect(out).toContain('a &amp; b &lt; c &gt; d');
  });

  it('aborts on stale text and writes nothing', () => {
    expect(() => patchHtml(DOC, [{ id: 'a', before: 'Stale value', after: 'New' }])).toThrow(/changed on disk/i);
  });

  it('aborts the WHOLE batch when any one patch is stale', () => {
    expect(() =>
      patchHtml(DOC, [
        { id: 'a', before: 'Original text', after: 'Fine' },
        { id: 'b', before: 'Stale', after: 'Nope' },
      ]),
    ).toThrow(/changed on disk/i);
  });

  it('refuses an element containing nested markup', () => {
    expect(() => patchHtml(DOC, [{ id: 'c', before: 'Has markup inside', after: 'x' }])).toThrow(/nested markup/i);
  });

  it('throws on an unknown id rather than silently doing nothing', () => {
    expect(() => patchHtml(DOC, [{ id: 'zzz', before: 'x', after: 'y' }])).toThrow(/no element/i);
  });

  it('applies several patches in one pass', () => {
    const out = patchHtml(DOC, [
      { id: 'a', before: 'Original text', after: 'One' },
      { id: 'b', before: 'Second & sound', after: 'Two' },
    ]);
    expect(out).toContain('<p data-edit="a">One</p>');
    expect(out).toContain('<p data-edit="b">Two</p>');
  });

  it('handles an empty patch list as a no-op', () => {
    expect(patchHtml(DOC, [])).toBe(DOC);
  });

  // Additional hostile-input cases beyond the brief, exercising branches the
  // 10 tests above never reach.

  it('refuses a void element, which has no end tag to bound a replacement', () => {
    const voidDoc = `<!DOCTYPE html><html><body><input data-edit="d" value="x"></body></html>`;
    expect(() => patchHtml(voidDoc, [{ id: 'd', before: '', after: 'y' }])).toThrow(/omitted end tag/i);
  });

  it('treats a lone comment node as nested markup, not text', () => {
    const commentDoc = `<!DOCTYPE html><html><body><p data-edit="f"><!-- a comment --></p></body></html>`;
    expect(() => patchHtml(commentDoc, [{ id: 'f', before: '', after: 'x' }])).toThrow(/nested markup/i);
  });

  it('fills an element that currently has no text content at all', () => {
    const emptyDoc = `<!DOCTYPE html><html><body><p data-edit="e"></p></body></html>`;
    const out = patchHtml(emptyDoc, [{ id: 'e', before: '', after: 'Filled' }]);
    expect(out).toContain('<p data-edit="e">Filled</p>');
  });

  // Fix round 1 — regressions the reviewer found by executing real fixtures
  // against the first commit, not by reasoning about the code.

  it('rejects two patches with the same id in one batch, before any offset work', () => {
    // Both would resolve to the same element and produce identical
    // {start,end} ranges; applying both corrupts the file (verified: the
    // second splice uses a stale `end` against the already-shortened string
    // from the first, and eats the next element's open tag).
    expect(() =>
      patchHtml(DOC, [
        { id: 'a', before: 'Original text', after: 'One' },
        { id: 'a', before: 'Original text', after: 'Two' },
      ]),
    ).toThrow(/duplicate/i);
  });

  it('refuses a document where two elements share the same data-edit id', () => {
    // data-edit is a system-wide unique key (the CSS generator emits
    // `[data-edit="<id>"]` as a selector), so last-wins is never correct.
    const dupDoc = `<!DOCTYPE html><html><body><p data-edit="a">Same</p><span data-edit="a">Same</span></body></html>`;
    expect(() => patchHtml(dupDoc, [{ id: 'a', before: 'Same', after: 'CHANGED' }])).toThrow(/duplicate/i);
  });

  it('refuses to patch <script>, whose raw-text content does not decode entities', () => {
    const scriptDoc = `<!DOCTYPE html><html><body><script data-edit="s">var a=1;</script></body></html>`;
    expect(() =>
      patchHtml(scriptDoc, [{ id: 's', before: 'var a=1;', after: 'if (a < b) x=1;' }]),
    ).toThrow(/raw text/i);
  });

  it('refuses to patch <style>, whose raw-text content does not decode entities', () => {
    const styleDoc = `<!DOCTYPE html><html><body><style data-edit="s">a{color:red}</style></body></html>`;
    expect(() =>
      patchHtml(styleDoc, [{ id: 's', before: 'a{color:red}', after: 'a > b{color:red}' }]),
    ).toThrow(/raw text/i);
  });

  it('keeps the hardcoded data-edit attribute name in sync with MANIFEST.editAttr', () => {
    expect('data-edit').toBe(MANIFEST.editAttr);
  });
});
