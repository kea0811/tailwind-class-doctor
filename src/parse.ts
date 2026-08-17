import { classify } from './classify.js';
import type { ClassToken } from './types.js';

/** Split a class string on whitespace, keeping each token's character offset. */
export function splitTokens(input: string): Array<{ raw: string; index: number }> {
  const tokens: Array<{ raw: string; index: number }> = [];
  const re = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input)) !== null) {
    tokens.push({ raw: match[0], index: match.index });
  }
  return tokens;
}

/**
 * Split `md:hover:p-2` into variants and base. Colons inside `[...]` or
 * `(...)` (arbitrary variants/values) are not separators.
 */
export function splitVariants(raw: string): { variants: string[]; base: string } {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '[' || ch === '(') {
      depth++;
    } else if (ch === ']' || ch === ')') {
      depth--;
    } else if (ch === ':' && depth === 0) {
      variants.push(raw.slice(start, i));
      start = i + 1;
    }
  }
  return { variants, base: raw.slice(start) };
}

/** Parse one written class into a `ClassToken`. */
export function parseToken(raw: string, index: number): ClassToken {
  const { variants, base } = splitVariants(raw);
  let name = base;
  let important = false;
  if (name.startsWith('!')) {
    important = true;
    name = name.slice(1);
  } else if (name.endsWith('!')) {
    important = true;
    name = name.slice(0, -1);
  }
  let negative = false;
  if (name.startsWith('-')) {
    negative = true;
    name = name.slice(1);
  }
  return { raw, variants, base, name, negative, important, index, group: classify(name) };
}

/** Parse a whole class string into tokens. */
export function parseClassList(input: string): ClassToken[] {
  return splitTokens(input).map((t) => parseToken(t.raw, t.index));
}
