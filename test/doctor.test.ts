import { describe, expect, it } from 'vitest';
import { fixSource, lintSource } from '../src/doctor.js';

const ORDER = { order: true };
const NO_ORDER = { order: false };

describe('lintSource', () => {
  it('maps findings to line and column positions', () => {
    const source = '<div class="flex">\n  <span class="p-2 p-4"></span>\n</div>';
    const problems = lintSource(source, NO_ORDER);
    expect(problems).toEqual([
      expect.objectContaining({ kind: 'override', className: 'p-2', line: 2, column: 16 }),
    ]);
  });

  it('reports problems from several chunks', () => {
    const source = '<div class="p-2 p-2">\n<style>.x { @apply mt-1 mt-2; }</style>';
    const kinds = lintSource(source, NO_ORDER).map((p) => p.kind);
    expect(kinds).toEqual(['duplicate', 'override']);
  });

  it('returns nothing for clean sources', () => {
    expect(lintSource('<div class="flex p-2">', ORDER)).toEqual([]);
  });

  it('skips chunks that overlap an earlier chunk', () => {
    const source = '<div class="@apply p-2 p-2 x;">';
    const problems = lintSource(source, NO_ORDER);
    expect(problems).toEqual([
      expect.objectContaining({ kind: 'duplicate', className: 'p-2' }),
    ]);
  });
});

describe('fixSource', () => {
  it('rewrites only chunks with findings', () => {
    const source = '<div class="p-2 p-4">\n<span class="flex"></span>';
    const { output, fixedCount } = fixSource(source, NO_ORDER);
    expect(output).toBe('<div class="p-4">\n<span class="flex"></span>');
    expect(fixedCount).toBe(1);
  });

  it('applies canonical ordering when enabled', () => {
    const { output, fixedCount } = fixSource('<div class="p-4 flex">', ORDER);
    expect(output).toBe('<div class="flex p-4">');
    expect(fixedCount).toBe(1);
  });

  it('fixes @apply declarations', () => {
    const { output } = fixSource('.btn { @apply px-4 px-2; }', NO_ORDER);
    expect(output).toBe('.btn { @apply px-2; }');
  });

  it('leaves clean sources untouched', () => {
    const source = '<div class="flex p-4">';
    const { output, fixedCount } = fixSource(source, ORDER);
    expect(output).toBe(source);
    expect(fixedCount).toBe(0);
  });

  it('does not double-fix overlapping chunks', () => {
    const source = '<div class="@apply p-2 p-2 x;">';
    const { output, fixedCount } = fixSource(source, NO_ORDER);
    expect(output).toBe('<div class="@apply p-2 x;">');
    expect(fixedCount).toBe(1);
  });
});
