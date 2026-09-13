import type { Project, ProjectCategory } from '../data/projects';

export type FilterValue = ProjectCategory | 'all';

export function filterProjects(
  projects: readonly Project[],
  category: FilterValue,
): Project[] {
  if (category === 'all') return [...projects];
  return projects.filter((p) => p.category === category);
}

export function countByCategory(
  projects: readonly Project[],
): Record<FilterValue, number> {
  const counts: Record<FilterValue, number> = { all: projects.length, ai: 0, fullstack: 0, tools: 0 };
  for (const p of projects) counts[p.category] += 1;
  return counts;
}
