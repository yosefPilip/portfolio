/**
 * Tier 1 → tier 2: filter pills and expand-in-place.
 *
 * Works against markup that is already in the HTML, so the page is complete
 * without JavaScript and this only ever enhances it.
 */
export function initProjectsIndex(root: Document | HTMLElement): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.work-item'));
  const pills = Array.from(root.querySelectorAll<HTMLButtonElement>('.pill[data-filter]'));
  const count = root.querySelector<HTMLElement>('#filterCount');

  function collapse(item: HTMLElement): void {
    const button = item.querySelector<HTMLButtonElement>('.work-row--button');
    const detail = item.querySelector<HTMLElement>('.work-detail');
    button?.setAttribute('aria-expanded', 'false');
    if (detail) detail.hidden = true;
  }

  items.forEach((item) => {
    const button = item.querySelector<HTMLButtonElement>('.work-row--button');
    const detail = item.querySelector<HTMLElement>('.work-detail');
    if (!button || !detail) return;

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', open ? 'false' : 'true');
      detail.hidden = open;
    });
  });

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const value = pill.dataset.filter ?? 'all';

      pills.forEach((other) => {
        const active = other === pill;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });

      let shown = 0;
      items.forEach((item) => {
        const match = value === 'all' || item.dataset.category === value;
        item.hidden = !match;
        if (match) shown += 1;
        // A row hidden while open would reopen mid-filter looking broken.
        collapse(item);
      });

      if (count) count.textContent = `${shown} project${shown === 1 ? '' : 's'}`;
    });
  });
}
