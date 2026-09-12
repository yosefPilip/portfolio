/** Copy patterns the spec bans outright (§11). */
const FORBIDDEN_COPY: RegExp[] = [
  /SECTOR_\w+/gi,
  /NODE_YP/gi,
  /LOG_\d+/gi,
  /UPLINK_\w+/gi,
  /SIGNAL_LIVE/gi,
  /BUILD_STATIC/gi,
  /STATUS:\s*ONLINE/gi,
];

/** Every banned string present in `source`, in the order the patterns are listed. */
export function findForbiddenCopy(source: string): string[] {
  const hits: string[] = [];
  for (const pattern of FORBIDDEN_COPY) {
    const matches = source.match(pattern);
    if (matches) hits.push(...matches);
  }
  return hits;
}

/** Blocks where colour literals are allowed to live: the token blocks only. */
const TOKEN_BLOCK = /(?::root|\[data-room="[a-z]+"\])\s*\{[^}]*\}/g;
const COMMENT = /\/\*[\s\S]*?\*\//g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/** Every colour literal in `css` that sits outside a token block. */
export function findHardcodedHex(css: string): string[] {
  const stripped = css.replace(COMMENT, '').replace(TOKEN_BLOCK, '');
  return stripped.match(HEX) ?? [];
}
