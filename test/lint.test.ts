import { describe, expect, it } from 'vitest';
import { lintClassList, sortTokens } from '../src/lint.js';
import { parseClassList } from '../src/parse.js';

const lint = (input: string, order = true) => lintClassList(input, { order });
const kinds = (input: string, order = true) => lint(input, order).findings.map((f) => f.kind);

describe('duplicates', () => {
  it('flags an exact repeat and keeps the first', () => {
    const { findings, fixed } = lint('flex p-2 flex');
    expect(findings).toEqual([
      expect.objectContaining({ kind: 'duplicate', className: 'flex', offset: 9, related: 'flex' }),
    ]);
    expect(fixed).toBe('flex p-2');
  });

  it('treats different variants as different classes', () => {
    expect(kinds('p-2 hover:p-2')).toEqual([]);
  });
});

describe('overrides', () => {
  it('flags an earlier class overridden by a later one in the same group', () => {
    const { findings } = lint('p-2 p-4');
    expect(findings).toEqual([
      expect.objectContaining({ kind: 'override', className: 'p-2', related: 'p-4', offset: 0 }),
    ]);
  });

  it('resolves chains, keeping only the last', () => {
    const { findings, fixed } = lint('p-1 p-2 p-3');
    expect(findings.map((f) => f.className)).toEqual(['p-1', 'p-2']);
    expect(fixed).toBe('p-3');
  });

  it('only conflicts under the same variant set', () => {
    expect(kinds('hover:p-2 p-4', false)).toEqual([]);
    expect(kinds('hover:p-2 hover:p-4')).toEqual(['override']);
  });

  it('compares variant sets order-insensitively', () => {
    expect(kinds('md:hover:p-2 hover:md:p-4')).toEqual(['override']);
  });

  it('flags negative vs positive utilities of the same group', () => {
    expect(kinds('-mt-2 mt-4', false)).toEqual(['override']);
  });

  it('ignores utilities from different groups', () => {
    expect(kinds('p-2 mt-4 text-red-500', false)).toEqual([]);
  });

  it('ignores unknown utilities entirely', () => {
    expect(kinds('btn btn-primary p-2', false)).toEqual([]);
  });
});

describe('important', () => {
  it('flags a later normal class beaten by an earlier !important', () => {
    const { findings, fixed } = lint('!p-2 p-4', false);
    expect(findings).toEqual([
      expect.objectContaining({ kind: 'ineffective', className: 'p-4', related: '!p-2' }),
    ]);
    expect(fixed).toBe('!p-2');
  });

  it('lets a later !important override a normal class', () => {
    expect(kinds('p-2 !p-4', false)).toEqual(['override']);
  });

  it('treats two !important classes as a normal override', () => {
    expect(kinds('!p-2 !p-4', false)).toEqual(['override']);
  });

  it('supports the trailing bang syntax', () => {
    expect(kinds('p-2! p-4', false)).toEqual(['ineffective']);
  });

  it('keeps checking later classes after an ineffective one', () => {
    const { findings } = lint('!p-2 mt-1 p-4 p-6', false);
    expect(findings.map((f) => `${f.kind}:${f.className}`)).toEqual([
      'ineffective:p-4',
      'ineffective:p-6',
    ]);
  });

  it('leaves an !important specific alone under a later normal shorthand', () => {
    expect(kinds('!pl-1 p-2', false)).toEqual([]);
  });
});

describe('shorthand coverage', () => {
  it('flags a specific utility fully covered by a later shorthand', () => {
    const { findings, fixed } = lint('pl-1 p-2', false);
    expect(findings).toEqual([
      expect.objectContaining({ kind: 'shorthand', className: 'pl-1', related: 'p-2' }),
    ]);
    expect(fixed).toBe('p-2');
  });

  it('covers several specifics at once', () => {
    const { fixed } = lint('pt-1 pb-2 p-4', false);
    expect(fixed).toBe('p-4');
  });

  it('allows the intentional shorthand-then-specific pattern', () => {
    expect(kinds('p-4 px-2', false)).toEqual([]);
    expect(kinds('px-2 pl-1', false)).toEqual([]);
  });

  it('understands axis shorthands', () => {
    expect(kinds('pl-1 px-4', false)).toEqual(['shorthand']);
    expect(kinds('mt-1 my-2', false)).toEqual(['shorthand']);
  });

  it('understands size covering width and height', () => {
    expect(kinds('w-4 h-4 size-8', false)).toEqual(['shorthand', 'shorthand']);
  });

  it('respects variants for shorthand coverage', () => {
    expect(kinds('md:pl-1 p-2', false)).toEqual([]);
  });
});

describe('order', () => {
  it('flags classes out of canonical order with the expected string', () => {
    const { findings } = lint('p-4 flex');
    expect(findings).toEqual([
      expect.objectContaining({
        kind: 'order',
        className: 'p-4',
        message: expect.stringContaining('expected "flex p-4"'),
      }),
    ]);
  });

  it('accepts canonical order', () => {
    expect(kinds('flex p-4 text-sm')).toEqual([]);
  });

  it('can be disabled', () => {
    expect(kinds('p-4 flex', false)).toEqual([]);
  });

  it('sorts base before state variants before responsive variants', () => {
    const { fixed } = lint('lg:p-8 sm:p-6 hover:bg-sky-600 bg-sky-500 rounded');
    expect(fixed).toBe('bg-sky-500 rounded hover:bg-sky-600 sm:p-6 lg:p-8');
  });

  it('keeps the max responsive weight for stacked variants', () => {
    const { fixed } = lint('md:sm:p-2 sm:m-1');
    expect(fixed).toBe('sm:m-1 md:sm:p-2');
  });

  it('sinks unknown utilities to the end of their bucket', () => {
    const { fixed } = lint('btn flex');
    expect(fixed).toBe('flex btn');
  });

  it('groups multiple state variants deterministically', () => {
    const { fixed } = lint('focus:ring-2 hover:bg-sky-600');
    expect(fixed).toBe('focus:ring-2 hover:bg-sky-600');
  });
});

describe('fixed output', () => {
  it('preserves written order when the order rule is off', () => {
    const { fixed } = lint('p-2 p-4 flex', false);
    expect(fixed).toBe('p-4 flex');
  });

  it('dedupes, resolves, and sorts all at once', () => {
    const { fixed } = lint('p-2 flex p-4 flex text-red-500 text-blue-500');
    expect(fixed).toBe('flex p-4 text-blue-500');
  });

  it('returns the input untouched when clean', () => {
    const { findings, fixed } = lint('flex p-4');
    expect(findings).toEqual([]);
    expect(fixed).toBe('flex p-4');
  });
});

describe('sortTokens', () => {
  it('orders by property group within the same bucket', () => {
    const sorted = sortTokens(parseClassList('text-sm flex w-4 p-2'));
    expect(sorted.map((t) => t.raw)).toEqual(['flex', 'p-2', 'w-4', 'text-sm']);
  });

  it('orders arbitrary properties before unknown utilities', () => {
    const sorted = sortTokens(parseClassList('btn [color:red] flex'));
    expect(sorted.map((t) => t.raw)).toEqual(['flex', '[color:red]', 'btn']);
  });
});
