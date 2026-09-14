import { describe, it, expect, beforeEach } from 'vitest';
import { initProjectsIndex } from '../src/shared/projectsIndex';

function build(): void {
  document.body.innerHTML = `
    <div class="filters" hidden>
      <button class="pill is-active" data-filter="all" aria-pressed="true">All</button>
      <button class="pill" data-filter="ai" aria-pressed="false">AI</button>
      <button class="pill" data-filter="fullstack" aria-pressed="false">Full-stack</button>
      <span class="meta" id="filterCount">3 projects</span>
    </div>
    <div class="work-list" id="projectList">
      <article class="work-item" data-slug="a" data-category="ai">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail"></div>
      </article>
      <article class="work-item" data-slug="b" data-category="fullstack">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail"></div>
      </article>
      <article class="work-item" data-slug="c" data-category="ai">
        <button class="work-row--button" aria-expanded="false"></button>
        <div class="work-detail"></div>
      </article>
    </div>`;
}

const items = () => Array.from(document.querySelectorAll<HTMLElement>('.work-item'));
const visible = () => items().filter((el) => !el.hidden);

beforeEach(() => { build(); initProjectsIndex(document); });

// The fixture is deliberately the no-JS shape of projects.html: details open,
// filters hidden. That is the state the page ships in so that a visitor
// without JavaScript gets every paragraph and every link and no dead pills.
describe('progressive enhancement', () => {
  it('collapses every detail at init, so the rows become expandable', () => {
    for (const detail of document.querySelectorAll<HTMLElement>('.work-detail')) {
      expect(detail.hidden).toBe(true);
    }
    for (const button of document.querySelectorAll('.work-row--button')) {
      expect(button.getAttribute('aria-expanded')).toBe('false');
    }
  });

  it('reveals the filters, which only mean anything now', () => {
    expect(document.querySelector<HTMLElement>('.filters')!.hidden).toBe(false);
  });
});

describe('expand in place', () => {
  it('opens a row on click', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector<HTMLElement>('.work-detail')!.hidden).toBe(false);
  });

  it('closes it again on a second click', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector<HTMLElement>('.work-detail')!.hidden).toBe(true);
  });

  it('lets several rows be open at once', () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.work-row--button');
    buttons[0].click();
    buttons[1].click();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
  });
});

describe('filtering', () => {
  it('shows only the chosen category', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(visible().map((el) => el.dataset.slug)).toEqual(['a', 'c']);
  });

  it('moves the active pill and its aria-pressed state', () => {
    const ai = document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!;
    ai.click();
    expect(ai.classList.contains('is-active')).toBe(true);
    expect(ai.getAttribute('aria-pressed')).toBe('true');
    const all = document.querySelector<HTMLButtonElement>('[data-filter="all"]')!;
    expect(all.classList.contains('is-active')).toBe(false);
    expect(all.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates the live count, singular and plural', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="fullstack"]')!.click();
    expect(document.getElementById('filterCount')!.textContent).toBe('1 project');
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(document.getElementById('filterCount')!.textContent).toBe('2 projects');
    document.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(document.getElementById('filterCount')!.textContent).toBe('3 projects');
  });

  it('collapses any open row when the filter changes', () => {
    const button = document.querySelector<HTMLButtonElement>('.work-row--button')!;
    button.click();
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps collapsed a row that was open when hidden by filter', () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.work-row--button');
    const fullstackButton = buttons[1];
    const fullstackDetail = document.querySelectorAll<HTMLElement>('.work-detail')[1];
    const fullstackItem = document.querySelectorAll<HTMLElement>('.work-item')[1];
    fullstackButton.click();
    expect(fullstackButton.getAttribute('aria-expanded')).toBe('true');
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    expect(fullstackItem.hidden).toBe(true);
    expect(fullstackButton.getAttribute('aria-expanded')).toBe('false');
    expect(fullstackDetail.hidden).toBe(true);
  });

  it('restores everything on "all"', () => {
    document.querySelector<HTMLButtonElement>('[data-filter="ai"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-filter="all"]')!.click();
    expect(visible()).toHaveLength(3);
  });
});
