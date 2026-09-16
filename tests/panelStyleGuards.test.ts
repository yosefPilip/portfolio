import { describe, it, expect } from 'vitest';
import { trackingAllowed, colorAllowed } from '../src/panel/styleControls';

describe('trackingAllowed', () => {
  it('permits negative tracking below the 32px threshold', () => {
    expect(trackingAllowed('body', -0.01)).toBe(true);
  });

  it('refuses negative tracking on steps that render at 32px or more', () => {
    expect(trackingAllowed('display', -0.01)).toBe(false);
    expect(trackingAllowed('h1', -0.02)).toBe(false);
    expect(trackingAllowed('wordmark', -0.005)).toBe(false);
  });

  it('permits positive tracking at any size', () => {
    expect(trackingAllowed('wordmark', 0.06)).toBe(true);
  });
});

describe('colorAllowed', () => {
  it('permits every offered token in every room — they all clear 4.5:1', () => {
    for (const room of ['home', 'projects', 'music', 'workshop']) {
      for (const c of ['fg', 'fg-dim', 'muted', 'accent', 'accent-2'] as const) {
        expect(colorAllowed(c, room), `${c} on ${room}`).toBe(true);
      }
    }
  });

  it('refuses a token against a room it does not clear', () => {
    expect(colorAllowed('fg', 'nonexistent-room')).toBe(false);
  });
});
