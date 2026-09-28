import { inject } from '@vercel/analytics';

// Vercel Web Analytics. The script it loads is served by Vercel itself, so it
// only reports from a deployed build; in dev it runs in debug mode and just
// logs to the console.
export function initAnalytics(): void {
  inject({ mode: import.meta.env.DEV ? 'development' : 'production' });
}
