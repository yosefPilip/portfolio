import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The panel makes every [data-edit] element contentEditable. Several of them
 * live INSIDE a link — every Elsewhere door description, every Selected work
 * row name — and clicking one to place a caret also followed the link, so the
 * page navigated away and that text could never be edited. Reported by the
 * owner as "when I try to edit the DJ description it sends me to the page
 * instead of letting me edit the text".
 */

let active = true;

vi.mock('../src/panel/overlay', () => ({
  isActive: () => active,
  refreshPanel: () => {},
  onSaveSuccess: () => {},
  onBeforeEditModeOff: () => {},
  onUndo: () => {},
}));

const { installTextEditing } = await import('../src/panel/textEditing');

/** A minimal store: installTextEditing only ever records through it here. */
function fakeStore() {
  return {
    get: () => ({ text: {}, images: {}, style: {} }),
    setText: vi.fn(),
    setImage: vi.fn(),
    undo: vi.fn(),
  };
}

let installed = false;

function render(): { link: HTMLAnchorElement; body: HTMLElement; heading: HTMLElement } {
  document.body.innerHTML = `
    <a class="life" href="/music.html">
      <h3 class="door-heading">DJ</h3>
      <p data-edit="elsewhere.body2">I play as Recursion.</p>
    </a>`;
  // installTextEditing attaches document-level listeners, so install once and
  // let each case re-render underneath them — exactly how it behaves live.
  if (!installed) {
    installTextEditing(fakeStore() as never);
    installed = true;
  }
  return {
    link: document.querySelector('a')!,
    body: document.querySelector('[data-edit]')!,
    heading: document.querySelector('.door-heading')!,
  };
}

/** Click the way a browser does, and report whether navigation was allowed. */
function clickAllowsNavigation(el: Element): boolean {
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return !ev.defaultPrevented;
}

beforeEach(() => {
  active = true;
});

describe('editing text that lives inside a link', () => {
  it('does not follow the link when the click lands on editable text', () => {
    const { body } = render();
    expect(clickAllowsNavigation(body)).toBe(false);
  });

  it('still follows the link from anywhere else in the card', () => {
    // Navigating the site is the other half of what the panel is used for, so
    // the suppression has to be narrow: the image and the heading still work.
    const { heading, link } = render();
    expect(clickAllowsNavigation(heading)).toBe(true);
    expect(clickAllowsNavigation(link)).toBe(true);
  });

  it('follows the link normally once edit mode is off', () => {
    const { body } = render();
    active = false;
    expect(clickAllowsNavigation(body)).toBe(true);
  });

  it('leaves a [data-edit] block that is not inside a link alone', () => {
    render();
    document.body.insertAdjacentHTML('beforeend', '<p data-edit="about.body1">Free text.</p>');
    const loose = document.querySelector('[data-edit="about.body1"]')!;
    expect(clickAllowsNavigation(loose)).toBe(true);
  });
});
