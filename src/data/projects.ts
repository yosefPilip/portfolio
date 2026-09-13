export type ProjectCategory = 'ai' | 'fullstack' | 'tools';

export interface Project {
  slug: string;
  title: string;
  /** One line. Shown on the collapsed row. */
  hook: string;
  category: ProjectCategory;
  year: string;
  stack: readonly string[];
  /** True only when a real tier-3 page exists at /projects/<slug>. */
  hasCaseStudy: boolean;
  /** External link, when there is something live to look at. */
  live?: string;
}

/** Order is fixed by the spec and must not be changed. */
export const PROJECTS: readonly Project[] = [
  {
    slug: 'cache-it',
    title: 'Cache It',
    hook: 'Hidden art around a city. Find it, tap it, keep it.',
    category: 'fullstack',
    year: '2026',
    stack: ['React', 'Vite', 'FastAPI', 'NFC', 'NTAG 424 DNA'],
    hasCaseStudy: true,
    live: 'https://cache-it-one.vercel.app',
  },
  {
    slug: 'podcast-generator',
    title: 'Batch Podcast Generator',
    hook: '100-episode runs from a prompt, without melting the API.',
    category: 'ai',
    year: '2026',
    stack: ['Python', 'Anthropic API', 'SQLite', 'Vercel'],
    hasCaseStudy: false,
  },
  {
    slug: 'resell-assistant',
    title: 'Resell Assistant',
    hook: 'Ask what a thing is worth. It answers, then updates the books.',
    category: 'ai',
    year: 'In development',
    stack: ['MCP', 'Google Sheets API', 'OAuth 2.0'],
    hasCaseStudy: false,
  },
  {
    slug: 'cloudgeometry',
    title: 'CloudGeometry internal tools',
    hook: 'The Slack bot, the HR platform, and the thing that audits everyone’s account.',
    category: 'ai',
    year: '2025–',
    stack: ['Python', 'Gemini API', 'Apps Script', 'AppSheet', 'Admin SDK'],
    hasCaseStudy: false,
  },
  {
    slug: 'music-sorter',
    title: 'DJ Music Sorter',
    // OPEN: owner has not supplied what it sorts or by what. Ships as a dash.
    hook: '—',
    category: 'tools',
    year: 'Being built',
    stack: ['—'],
    hasCaseStudy: false,
  },
  {
    slug: 'portfolio',
    title: 'This site',
    hook: 'Four rooms, one building. Scroll-linked depth, hand-built.',
    category: 'fullstack',
    year: '2026',
    stack: ['Vite', 'TypeScript', 'React', 'Lenis'],
    hasCaseStudy: false,
    live: 'https://github.com/yosefPilip',
  },
];
