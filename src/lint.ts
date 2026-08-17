import { COVERS, groupIndex } from './classify.js';
import { parseClassList } from './parse.js';
import type { ClassToken, Finding, LintOptions, LintOutcome } from './types.js';

const RESPONSIVE: Record<string, number> = { sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5 };

/** Variant-set key, order-insensitive: `md:hover:` and `hover:md:` collide. */
function variantKey(token: ClassToken): string {
  return [...token.variants].sort().join(':');
}

function sortKey(token: ClassToken): string {
  let responsive = 0;
  const others: string[] = [];
  for (const variant of token.variants) {
    const weight = RESPONSIVE[variant];
    if (weight === undefined) {
      others.push(variant);
    } else {
      responsive = Math.max(responsive, weight);
    }
  }
  return [
    token.variants.length === 0 ? '0' : '1',
    String(responsive),
    others.sort().join(':'),
    String(groupIndex(token.group)).padStart(4, '0'),
    token.name,
    token.raw,
  ].join('|');
}

/**
 * Canonical order: base classes first (in property-group order), then state
 * variants, then responsive variants from `sm:` up. Unknown utilities sink to
 * the end of their variant bucket.
 */
export function sortTokens(tokens: ClassToken[]): ClassToken[] {
  return tokens
    .map((token) => ({ token, key: sortKey(token) }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((entry) => entry.token);
}

const joinRaw = (tokens: ClassToken[]): string => tokens.map((t) => t.raw).join(' ');

/**
 * Lint one class string: exact duplicates, same-group overrides, shorthand
 * shadowing, `!important` losers, and canonical order. Also returns the fixed
 * string (survivors, canonically sorted when `options.order` is on).
 */
export function lintClassList(input: string, options: LintOptions): LintOutcome {
  const tokens = parseClassList(input);
  const findings: Finding[] = [];
  const removed = new Set<ClassToken>();

  const firstByRaw = new Map<string, ClassToken>();
  for (const token of tokens) {
    const first = firstByRaw.get(token.raw);
    if (first === undefined) {
      firstByRaw.set(token.raw, token);
    } else {
      removed.add(token);
      findings.push({
        kind: 'duplicate',
        className: token.raw,
        offset: token.index,
        related: first.raw,
        message: `"${token.raw}" is repeated — keep one`,
      });
    }
  }

  const active: ClassToken[] = [];
  for (const token of tokens) {
    if (removed.has(token) || token.group === null) {
      continue;
    }
    const vkey = variantKey(token);
    const covers = COVERS[token.group] ?? [];
    for (const seen of active) {
      if (removed.has(seen) || variantKey(seen) !== vkey) {
        continue;
      }
      const direct = seen.group === token.group;
      if (!direct && !covers.includes(seen.group as string)) {
        continue;
      }
      if (seen.important && !token.important) {
        if (direct) {
          removed.add(token);
          findings.push({
            kind: 'ineffective',
            className: token.raw,
            offset: token.index,
            related: seen.raw,
            message: `"${token.raw}" has no effect — "${seen.raw}" wins with !important`,
          });
          break;
        }
        continue;
      }
      removed.add(seen);
      findings.push(
        direct
          ? {
              kind: 'override',
              className: seen.raw,
              offset: seen.index,
              related: token.raw,
              message: `"${seen.raw}" is overridden by later "${token.raw}"`,
            }
          : {
              kind: 'shorthand',
              className: seen.raw,
              offset: seen.index,
              related: token.raw,
              message: `"${seen.raw}" is redundant — later "${token.raw}" covers it`,
            },
      );
    }
    if (!removed.has(token)) {
      active.push(token);
    }
  }

  const kept = tokens.filter((token) => !removed.has(token));
  let ordered = kept;
  if (options.order) {
    ordered = sortTokens(kept);
    const misplaced = kept.findIndex((token, i) => token !== ordered[i]);
    if (misplaced !== -1) {
      const token = kept[misplaced] as ClassToken;
      findings.push({
        kind: 'order',
        className: token.raw,
        offset: token.index,
        related: null,
        message: `classes are not in canonical order — expected "${joinRaw(ordered)}"`,
      });
    }
  }

  return { findings, kept, fixed: joinRaw(ordered) };
}
