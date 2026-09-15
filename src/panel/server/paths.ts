import { resolve, sep } from 'node:path';

/**
 * The only files the panel may ever write.
 *
 * An allowlist rather than a traversal check: a traversal check has to be
 * right about every trick, an allowlist has to be right once.
 */
const ALLOWED = new Set([
  'src/styles/layout.generated.css',
  'index.html',
  'projects.html',
  'music.html',
  'workshop.html',
  'projects/cache-it.html',
]);

/** Absolute path for an allowed target, or throw. Never returns for anything else. */
export function resolveWriteTarget(rel: string): string {
  const normalised = rel.split(/[\\/]/).join('/');
  if (!ALLOWED.has(normalised)) {
    throw new Error(`Refusing to write: "${rel}" is not an allowed panel target`);
  }
  return resolve(process.cwd(), ...normalised.split('/')).split('/').join(sep);
}
