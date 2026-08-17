import { describe, expect, it } from 'vitest';
import { extractClassChunks, positionAt } from '../src/extract.js';

const values = (source: string) => extractClassChunks(source).map((c) => c.value);

describe('extractClassChunks', () => {
  it('extracts double-quoted class attributes', () => {
    expect(values('<div class="flex p-2">')).toEqual(['flex p-2']);
  });

  it('extracts single-quoted class attributes', () => {
    expect(values("<div class='mt-4'>")).toEqual(['mt-4']);
  });

  it('extracts JSX className strings', () => {
    expect(values('<div className="p-2" />')).toEqual(['p-2']);
    expect(values("<div className={'p-4'} />")).toEqual(['p-4']);
    expect(values('<div className={ "m-2" } />')).toEqual(['m-2']);
  });

  it('extracts JSX template literals without interpolation', () => {
    expect(values('<div className={`flex gap-2`} />')).toEqual(['flex gap-2']);
  });

  it('skips template literals with interpolation', () => {
    expect(values('<div className={`flex ${extra}`} />')).toEqual([]);
  });

  it('extracts @apply declarations', () => {
    expect(values('.btn {\n  @apply px-4 py-2;\n}')).toEqual(['px-4 py-2']);
  });

  it('records exact value offsets', () => {
    const source = '<a class="p-2">\n<style>.x { @apply a; }</style>';
    for (const chunk of extractClassChunks(source)) {
      expect(source.slice(chunk.start, chunk.start + chunk.value.length)).toBe(chunk.value);
    }
  });

  it('does not mistake the @apply keyword for the value', () => {
    const source = '.a { @apply a; }';
    const [chunk] = extractClassChunks(source);
    expect(source.slice(chunk!.start, chunk!.start + 1)).toBe('a');
    expect(chunk!.start).toBe(12);
  });

  it('returns chunks sorted by position', () => {
    const source = '.x { @apply p-1; }\n<div class="p-2">';
    const chunks = extractClassChunks(source);
    expect(chunks.map((c) => c.value)).toEqual(['p-1', 'p-2']);
  });

  it('finds multiple attributes across lines', () => {
    const source = '<div class="a">\n  <span class="b"></span>\n</div>';
    expect(values(source)).toEqual(['a', 'b']);
  });
});

describe('positionAt', () => {
  it('reports 1-based line and column', () => {
    const source = 'ab\ncdef\ng';
    expect(positionAt(source, 0)).toEqual({ line: 1, column: 1 });
    expect(positionAt(source, 4)).toEqual({ line: 2, column: 2 });
    expect(positionAt(source, 8)).toEqual({ line: 3, column: 1 });
  });
});
