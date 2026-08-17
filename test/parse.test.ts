import { describe, expect, it } from 'vitest';
import { parseClassList, parseToken, splitTokens, splitVariants } from '../src/parse.js';

describe('splitTokens', () => {
  it('records each token with its character offset', () => {
    expect(splitTokens('flex  p-2\n\tmt-4')).toEqual([
      { raw: 'flex', index: 0 },
      { raw: 'p-2', index: 6 },
      { raw: 'mt-4', index: 11 },
    ]);
  });

  it('returns nothing for empty or blank input', () => {
    expect(splitTokens('')).toEqual([]);
    expect(splitTokens('   ')).toEqual([]);
  });
});

describe('splitVariants', () => {
  it('handles a class with no variants', () => {
    expect(splitVariants('p-2')).toEqual({ variants: [], base: 'p-2' });
  });

  it('splits stacked variants in written order', () => {
    expect(splitVariants('md:hover:p-2')).toEqual({ variants: ['md', 'hover'], base: 'p-2' });
  });

  it('ignores colons inside arbitrary variants', () => {
    expect(splitVariants('[&:hover]:underline')).toEqual({
      variants: ['[&:hover]'],
      base: 'underline',
    });
  });

  it('ignores colons inside arbitrary values with nested parens', () => {
    expect(splitVariants('bg-[url(http://x/y.png)]')).toEqual({
      variants: [],
      base: 'bg-[url(http://x/y.png)]',
    });
  });

  it('tracks parens outside brackets', () => {
    expect(splitVariants('hover:bg-(--brand)')).toEqual({
      variants: ['hover'],
      base: 'bg-(--brand)',
    });
  });
});

describe('parseToken', () => {
  it('parses a plain utility', () => {
    expect(parseToken('p-2', 4)).toMatchObject({
      raw: 'p-2',
      variants: [],
      base: 'p-2',
      name: 'p-2',
      negative: false,
      important: false,
      index: 4,
      group: 'p',
    });
  });

  it('parses a leading important marker', () => {
    expect(parseToken('!p-2', 0)).toMatchObject({ name: 'p-2', important: true });
  });

  it('parses a trailing important marker', () => {
    expect(parseToken('p-2!', 0)).toMatchObject({ name: 'p-2', important: true });
  });

  it('parses negative utilities', () => {
    expect(parseToken('-mt-2', 0)).toMatchObject({ name: 'mt-2', negative: true, group: 'mt' });
  });

  it('parses variants together with markers', () => {
    expect(parseToken('md:!-mt-2', 0)).toMatchObject({
      variants: ['md'],
      name: 'mt-2',
      negative: true,
      important: true,
    });
  });
});

describe('parseClassList', () => {
  it('parses every token in a class string', () => {
    const tokens = parseClassList('flex hover:p-2');
    expect(tokens).toHaveLength(2);
    expect(tokens[1]).toMatchObject({ raw: 'hover:p-2', variants: ['hover'], group: 'p', index: 5 });
  });
});
