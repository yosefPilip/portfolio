import { PROJECTS } from '../data/projects';

const CASE_STUDY_SLUGS = new Set(PROJECTS.filter((p) => p.hasCaseStudy).map((p) => p.slug));

/** The slug of the case study a path addresses, or null if it addresses none. */
export function slugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([a-z0-9-]+?)(?:\.html)?\/?$/);
  if (!match) return null;
  const slug = match[1];
  return CASE_STUDY_SLUGS.has(slug) ? slug : null;
}

export function pathForSlug(slug: string): string {
  return `/projects/${slug}`;
}

export function isCaseStudyHref(href: string): boolean {
  if (!href.startsWith('/')) return false;
  return slugFromPath(href.split('#')[0].split('?')[0]) !== null;
}
