import { describe, it, expect } from 'vitest';
import { patchHtml, isStaleTextError, patchImageSrc, isStaleSrcError } from '../src/panel/server/htmlPatcher';
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

  it('carries the stale ids structurally, not only in the message', () => {
    // The client offers to discard exactly these. Regexing them back out of a
    // human sentence would break the recovery the next time the copy changes.
    try {
      patchHtml(DOC, [{ id: 'a', before: 'Stale value', after: 'New' }]);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isStaleTextError(err)).toBe(true);
      expect((err as { staleIds: string[] }).staleIds).toEqual(['a']);
    }
  });

  it('collects EVERY stale id in the batch, so one discard clears them all', () => {
    try {
      patchHtml(DOC, [
        { id: 'a', before: 'Stale one', after: 'x' },
        { id: 'b', before: 'Stale two', after: 'y' },
      ]);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as { staleIds: string[] }).staleIds).toEqual(['a', 'b']);
    }
  });

  it('tells the user a recovery that actually works — reloading is not one', () => {
    // The old message said "Reload the page and try again", which re-hydrates
    // the same stale edit from localStorage and 400s forever.
    try {
      patchHtml(DOC, [{ id: 'a', before: 'Stale value', after: 'New' }]);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as Error).message).toMatch(/discard/i);
      expect((err as Error).message).not.toMatch(/reload the page and try again/i);
    }
  });

  it('does not mark a structural failure as stale', () => {
    try {
      patchHtml(DOC, [{ id: 'c', before: 'Has markup inside', after: 'x' }]);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isStaleTextError(err)).toBe(false);
    }
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

  it('refuses to patch <noscript>, which parse5 always treats as raw text', () => {
    // parse5 has no scriptingEnabled toggle, so <noscript> content is
    // RAWTEXT unconditionally, unlike a browser with JS enabled — and,
    // being RAWTEXT, the entity in the source is never decoded, so `before`
    // must match the literal, undecoded text parse5 stores.
    const noscriptDoc = `<!DOCTYPE html><html><body><noscript data-edit="n">Enable JS &amp; reload</noscript></body></html>`;
    expect(() =>
      patchHtml(noscriptDoc, [
        { id: 'n', before: 'Enable JS &amp; reload', after: 'Please <turn> on JS & retry' },
      ]),
    ).toThrow(/raw text/i);
  });

  it('keeps the hardcoded data-edit attribute name in sync with MANIFEST.editAttr', () => {
    expect('data-edit').toBe(MANIFEST.editAttr);
  });
});

const FRAME_DOC = `<!DOCTYPE html>
<html><body>
  <figure class="frame" data-label="Hero L1 — jungle-far"><img src="/assets/img/jungle-far.webp" alt="" /></figure>
  <figure class="frame" data-label="Hero L3 — jungle-mid"><img src="/assets/img/jungle-mid.webp" alt="" /></figure>
</body></html>`;

describe('patchImageSrc', () => {
  it('replaces only the targeted <img src>, leaving everything else identical', () => {
    const out = patchImageSrc(FRAME_DOC, [
      { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/assets/img/photo.jpg' },
    ]);
    expect(out).toContain('data-label="Hero L1 — jungle-far"><img src="/assets/img/photo.jpg" alt=""');
    expect(out).toContain('data-label="Hero L3 — jungle-mid"><img src="/assets/img/jungle-mid.webp" alt=""');
  });

  it('leaves every other byte identical', () => {
    const out = patchImageSrc(FRAME_DOC, [
      { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/assets/img/photo.jpg' },
    ]);
    expect(out).toBe(FRAME_DOC.replace('/assets/img/jungle-far.webp', '/assets/img/photo.jpg'));
  });

  it('escapes " and \' in the new value — a context text patching never had to handle', () => {
    const out = patchImageSrc(FRAME_DOC, [
      { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: `a"b'c<d>e&f` },
    ]);
    expect(out).toContain('src="a&quot;b&#39;c&lt;d&gt;e&amp;f"');
    // The escaped value must not be able to terminate the attribute early.
    expect(out).not.toContain('src="a"');
  });

  it('applies several patches in one pass', () => {
    const out = patchImageSrc(FRAME_DOC, [
      { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/assets/img/one.png' },
      { label: 'Hero L3 — jungle-mid', before: '/assets/img/jungle-mid.webp', after: '/assets/img/two.png' },
    ]);
    expect(out).toContain('src="/assets/img/one.png"');
    expect(out).toContain('src="/assets/img/two.png"');
  });

  it('handles an empty patch list as a no-op', () => {
    expect(patchImageSrc(FRAME_DOC, [])).toBe(FRAME_DOC);
  });

  it('aborts on a stale src and writes nothing', () => {
    expect(() =>
      patchImageSrc(FRAME_DOC, [{ label: 'Hero L1 — jungle-far', before: '/assets/img/stale.webp', after: '/x.png' }]),
    ).toThrow(/changed on disk/i);
  });

  it('aborts the WHOLE batch when any one patch is stale', () => {
    expect(() =>
      patchImageSrc(FRAME_DOC, [
        { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/x.png' },
        { label: 'Hero L3 — jungle-mid', before: '/assets/img/stale.webp', after: '/y.png' },
      ]),
    ).toThrow(/changed on disk/i);
  });

  it('carries the stale labels structurally, not only in the message', () => {
    try {
      patchImageSrc(FRAME_DOC, [{ label: 'Hero L1 — jungle-far', before: '/assets/img/stale.webp', after: '/x.png' }]);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isStaleSrcError(err)).toBe(true);
      expect((err as { staleLabels: string[] }).staleLabels).toEqual(['Hero L1 — jungle-far']);
    }
  });

  it('throws on an unknown data-label rather than silently doing nothing', () => {
    expect(() => patchImageSrc(FRAME_DOC, [{ label: 'nope', before: '', after: '/x.png' }])).toThrow(
      /no frame with data-label/i,
    );
  });

  it('rejects two patches with the same label in one batch, before any offset work', () => {
    expect(() =>
      patchImageSrc(FRAME_DOC, [
        { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/a.png' },
        { label: 'Hero L1 — jungle-far', before: '/assets/img/jungle-far.webp', after: '/b.png' },
      ]),
    ).toThrow(/duplicate/i);
  });

  it('refuses a document where two frames share the same data-label', () => {
    const dupDoc = `<!DOCTYPE html><html><body>
      <figure class="frame" data-label="x"><img src="/a.png"></figure>
      <figure class="frame" data-label="x"><img src="/b.png"></figure>
    </body></html>`;
    expect(() => patchImageSrc(dupDoc, [{ label: 'x', before: '/a.png', after: '/c.png' }])).toThrow(/duplicate/i);
  });

  it('refuses an <img> that has no src attribute at all', () => {
    const noSrcDoc = `<!DOCTYPE html><html><body><figure class="frame" data-label="x"><img alt="no src"></figure></body></html>`;
    expect(() => patchImageSrc(noSrcDoc, [{ label: 'x', before: '', after: '/c.png' }])).toThrow(/no src attribute/i);
  });

  it('refuses a frame with no <img> inside it at all', () => {
    const noImgDoc = `<!DOCTYPE html><html><body><figure class="frame" data-label="x"></figure></body></html>`;
    expect(() => patchImageSrc(noImgDoc, [{ label: 'x', before: '', after: '/c.png' }])).toThrow(/no <img>/i);
  });

  it('only matches a <figure> that actually carries the "frame" class', () => {
    const wrongTagDoc = `<!DOCTYPE html><html><body><div class="frame" data-label="x"><img src="/a.png"></div></body></html>`;
    expect(() => patchImageSrc(wrongTagDoc, [{ label: 'x', before: '/a.png', after: '/c.png' }])).toThrow(
      /no frame with data-label/i,
    );
  });

  it('keeps the hardcoded figure/frame/data-label trio in sync with MANIFEST', () => {
    expect(MANIFEST.slotSelector).toBe('figure.frame');
    expect(MANIFEST.slotKeyAttr).toBe('data-label');
  });
});
