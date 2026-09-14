/**
 * Tier 1 → tier 2: filter pills and expand-in-place.
 *
 * Works against markup that is already in the HTML, so the page is complete
 * without JavaScript and this only ever enhances it.
 *
 * The no-JS state is therefore the COMPLETE one, not the collapsed one: the
 * HTML ships every `.work-detail` open (so every paragraph, stack line and
 * link — including the only in-page link to the Cache It case study — is
 * reachable without scripting) and ships `.filters` hidden (pills that filter
 * nothing are six dead controls). This function inverts both: it collapses
 * the details it is about to make expandable, and reveals the filters it is
 * about to make work.
 */
export function initProjectsIndex(root: Document | HTMLElement): void {
  const items = Array.from(root.querySelectorAll<HTMLElement>('.work-item'));
  const pills = Array.from(root.querySelectorAll<HTMLButtonElement>('.pill[data-filter]'));
  const count = root.querySelector<HTMLElement>('#filterCount');
  const filters = root.querySelector<HTMLElement>('.filters');

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

    // JS is present, so the row becomes expandable — which means it starts
    // collapsed. Both halves are set here rather than trusting the markup,
    // so the button's state and the detail's visibility cannot disagree.
    collapse(item);

    button.addEventListener('click', () => {
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', open ? 'false' : 'true');
      detail.hidden = open;
    });
  });

  // Only now do the pills mean anything.
  if (filters) filters.hidden = false;

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
