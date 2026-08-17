import type { Chunk } from './types.js';

const ATTR_RE =
  /\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\})/g;
const APPLY_RE = /@apply\s+([^;{}]+);/g;

const QUOTES = ['"', "'", '"', "'", '`'];

/**
 * Pull class strings out of source: `class` / `className` attributes (plain,
 * JSX string, or JSX template literal without interpolation) and CSS `@apply`
 * lines. Each chunk records where the string starts in the source.
 */
export function extractClassChunks(source: string): Chunk[] {
  const chunks: Chunk[] = [];

  for (const match of source.matchAll(ATTR_RE)) {
    const groupAt = match.slice(1).findIndex((value) => value !== undefined);
    const value = match[groupAt + 1] as string;
    if (value.includes('${')) {
      continue;
    }
    const quote = QUOTES[groupAt] as string;
    const start = match.index + match[0].indexOf(quote + value) + 1;
    chunks.push({ value, start });
  }

  for (const match of source.matchAll(APPLY_RE)) {
    const value = match[1] as string;
    chunks.push({ value, start: match.index + match[0].length - 1 - value.length });
  }

  return chunks.sort((a, b) => a.start - b.start);
}

/** 1-based line/column of a character offset. */
export function positionAt(source: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lastBreak = -1;
  for (let i = 0; i < offset; i++) {
    if (source[i] === '\n') {
      line++;
      lastBreak = i;
    }
  }
  return { line, column: offset - lastBreak };
}
