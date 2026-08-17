/**
 * Maps Tailwind utility names to "property groups". Two utilities in the same
 * group (under the same variants) target the same CSS property, so the later
 * one wins and the earlier one is dead weight.
 */

const TEXT_SIZES = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
]);
const TEXT_ALIGN = new Set(['left', 'center', 'right', 'justify', 'start', 'end']);
const FONT_WEIGHTS = new Set([
  'thin', 'extralight', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black',
]);
const BG_SIZES = new Set(['auto', 'cover', 'contain']);
const BG_POSITIONS = new Set([
  'bottom', 'center', 'left', 'left-bottom', 'left-top', 'right', 'right-bottom', 'right-top', 'top',
]);
const BG_REPEATS = new Set([
  'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'repeat-round', 'repeat-space',
]);
const BG_ATTACHMENTS = new Set(['fixed', 'local', 'scroll']);
const OBJECT_FITS = new Set(['contain', 'cover', 'fill', 'none', 'scale-down']);
const BORDER_SIDES = new Set(['x', 'y', 's', 'e', 't', 'r', 'b', 'l']);
const ROUNDED_CORNERS = ['ss', 'se', 'ee', 'es', 'tl', 'tr', 'br', 'bl', 's', 'e', 't', 'r', 'b', 'l'];
const SHADOW_SIZES = new Set(['sm', 'md', 'lg', 'xl', '2xl', 'inner', 'none']);
const DECORATION_STYLES = new Set(['solid', 'double', 'dotted', 'dashed', 'wavy']);
const BACKDROP_FILTERS = [
  'hue-rotate', 'blur', 'brightness', 'contrast', 'grayscale', 'invert', 'opacity', 'saturate', 'sepia',
];
const NUMERIC_RE = /^\d+(?:\.\d+)?$/;

function isArbitrary(value: string): boolean {
  return value.startsWith('[') && value.endsWith(']');
}

type ArbKind = 'color' | 'length' | 'other';

/** Best-effort guess at what an arbitrary value `[...]` denotes. */
function arbKind(value: string): ArbKind {
  const inner = value.slice(1, -1);
  if (inner.startsWith('color:') || inner.startsWith('#') || /^(?:rgb|rgba|hsl|hsla|oklch)\(/.test(inner)) {
    return 'color';
  }
  if (inner.startsWith('length:') || inner.startsWith('size:') || inner.startsWith('calc(') || /^[\d.]/.test(inner)) {
    return 'length';
  }
  return 'other';
}

/** True when a value reads as a width/size (numeric scale step or arbitrary length). */
function isWidthLike(value: string): boolean {
  if (NUMERIC_RE.test(value)) {
    return true;
  }
  return isArbitrary(value) && arbKind(value) === 'length';
}

function textGroup(rest: string): string {
  if (TEXT_SIZES.has(rest)) {
    return 'font-size';
  }
  if (TEXT_ALIGN.has(rest)) {
    return 'text-align';
  }
  if (isArbitrary(rest) && arbKind(rest) === 'length') {
    return 'font-size';
  }
  return 'text-color';
}

function fontGroup(rest: string): string {
  if (FONT_WEIGHTS.has(rest)) {
    return 'font-weight';
  }
  if (isArbitrary(rest) && arbKind(rest) === 'length') {
    return 'font-weight';
  }
  return 'font-family';
}

function bgGroup(rest: string): string {
  if (rest.startsWith('gradient-') || rest === 'none') {
    return 'bg-image';
  }
  if (BG_SIZES.has(rest)) {
    return 'bg-size';
  }
  if (BG_POSITIONS.has(rest)) {
    return 'bg-position';
  }
  if (BG_REPEATS.has(rest)) {
    return 'bg-repeat';
  }
  if (BG_ATTACHMENTS.has(rest)) {
    return 'bg-attachment';
  }
  if (isArbitrary(rest) && rest.includes('url(')) {
    return 'bg-image';
  }
  return 'bg-color';
}

function borderGroup(rest: string): string {
  const side = rest.length === 1 || rest[1] === '-' ? (rest[0] as string) : '';
  if (BORDER_SIDES.has(side)) {
    const value = rest.length === 1 ? '' : rest.slice(2);
    if (value === '' || isWidthLike(value)) {
      return `border-w-${side}`;
    }
    return `border-color-${side}`;
  }
  if (isWidthLike(rest)) {
    return 'border-w';
  }
  return 'border-color';
}

function roundedGroup(rest: string): string {
  for (const corner of ROUNDED_CORNERS) {
    if (rest === corner || rest.startsWith(`${corner}-`)) {
      return `rounded-${corner}`;
    }
  }
  return 'rounded';
}

function shadowGroup(rest: string): string {
  if (SHADOW_SIZES.has(rest)) {
    return 'shadow';
  }
  if (isArbitrary(rest) && arbKind(rest) !== 'color') {
    return 'shadow';
  }
  return 'shadow-color';
}

function decorationGroup(rest: string): string {
  if (DECORATION_STYLES.has(rest)) {
    return 'decoration-style';
  }
  if (rest === 'from-font' || isWidthLike(rest)) {
    return 'decoration-w';
  }
  return 'decoration-color';
}

function backdropGroup(rest: string): string | null {
  for (const filter of BACKDROP_FILTERS) {
    if (rest === filter || rest.startsWith(`${filter}-`)) {
      return `backdrop-${filter}`;
    }
  }
  return null;
}

const ringGroup = (rest: string): string => (isWidthLike(rest) ? 'ring-w' : 'ring-color');
const ringOffsetGroup = (rest: string): string =>
  isWidthLike(rest) ? 'ring-offset-w' : 'ring-offset-color';
const outlineGroup = (rest: string): string => (isWidthLike(rest) ? 'outline-w' : 'outline-color');
const strokeGroup = (rest: string): string => (isWidthLike(rest) ? 'stroke-w' : 'stroke-color');
const objectGroup = (rest: string): string =>
  OBJECT_FITS.has(rest) ? 'object-fit' : 'object-position';
const contentGroup = (rest: string): string =>
  rest === 'none' || isArbitrary(rest) ? 'content' : 'content-align';
const listGroup = (rest: string): string =>
  rest === 'inside' || rest === 'outside' ? 'list-position' : 'list-type';

/** `[color:red]` → `arb:color`; anything else → null. */
function arbitraryProperty(name: string): string | null {
  if (!name.startsWith('[') || !name.endsWith(']')) {
    return null;
  }
  const colon = name.indexOf(':');
  return colon === -1 ? null : `arb:${name.slice(1, colon)}`;
}

function fromEntries(group: string, names: string[]): Array<[string, string]> {
  return names.map((name) => [name, group]);
}

const EXACT = new Map<string, string>([
  ...fromEntries('display', [
    'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'table',
    'inline-table', 'table-caption', 'table-cell', 'table-column', 'table-column-group',
    'table-footer-group', 'table-header-group', 'table-row-group', 'table-row', 'flow-root',
    'contents', 'list-item', 'hidden',
  ]),
  ...fromEntries('position', ['static', 'fixed', 'absolute', 'relative', 'sticky']),
  ...fromEntries('visibility', ['visible', 'invisible', 'collapse']),
  ...fromEntries('box', ['box-border', 'box-content']),
  ...fromEntries('isolation', ['isolate', 'isolation-auto']),
  ...fromEntries('float', ['float-left', 'float-right', 'float-none', 'float-start', 'float-end']),
  ...fromEntries('clear', ['clear-left', 'clear-right', 'clear-both', 'clear-none', 'clear-start', 'clear-end']),
  ['container', 'container'],
  ...fromEntries('sr', ['sr-only', 'not-sr-only']),
  ...fromEntries('flex-direction', ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse']),
  ...fromEntries('flex-wrap', ['flex-wrap', 'flex-wrap-reverse', 'flex-nowrap']),
  ...fromEntries('flex', ['flex-auto', 'flex-initial', 'flex-none']),
  ['grow', 'grow'],
  ['shrink', 'shrink'],
  ['col-auto', 'col'],
  ['row-auto', 'row'],
  ...fromEntries('font-style', ['italic', 'not-italic']),
  ...fromEntries('font-smoothing', ['antialiased', 'subpixel-antialiased']),
  ...fromEntries('font-variant', [
    'normal-nums', 'ordinal', 'slashed-zero', 'lining-nums', 'oldstyle-nums', 'proportional-nums',
    'tabular-nums', 'diagonal-fractions', 'stacked-fractions',
  ]),
  ...fromEntries('text-decoration', ['underline', 'overline', 'line-through', 'no-underline']),
  ...fromEntries('text-transform', ['uppercase', 'lowercase', 'capitalize', 'normal-case']),
  ...fromEntries('text-overflow', ['truncate', 'text-ellipsis', 'text-clip']),
  ...fromEntries('text-wrap', ['text-wrap', 'text-nowrap', 'text-balance', 'text-pretty']),
  ...fromEntries('word-break', ['break-normal', 'break-words', 'break-all', 'break-keep']),
  ...fromEntries('hyphens', ['hyphens-none', 'hyphens-manual', 'hyphens-auto']),
  ['border', 'border-w'],
  ...fromEntries('border-style', [
    'border-solid', 'border-dashed', 'border-dotted', 'border-double', 'border-hidden', 'border-none',
  ]),
  ...fromEntries('border-collapse', ['border-collapse', 'border-separate']),
  ['rounded', 'rounded'],
  ['shadow', 'shadow'],
  ...fromEntries('ring-w', ['ring', 'ring-inset']),
  ...fromEntries('outline-style', [
    'outline', 'outline-none', 'outline-dashed', 'outline-dotted', 'outline-double',
  ]),
  ['divide-x', 'divide-x'],
  ['divide-y', 'divide-y'],
  ...fromEntries('divide-style', [
    'divide-solid', 'divide-dashed', 'divide-dotted', 'divide-double', 'divide-none',
  ]),
  ...fromEntries('transition', [
    'transition', 'transition-none', 'transition-all', 'transition-colors', 'transition-opacity',
    'transition-shadow', 'transition-transform',
  ]),
  ...fromEntries('transform', ['transform', 'transform-none', 'transform-gpu', 'transform-cpu']),
  ...fromEntries('table-layout', ['table-auto', 'table-fixed']),
  ...fromEntries('caption', ['caption-top', 'caption-bottom']),
  ...fromEntries('resize', ['resize', 'resize-none', 'resize-x', 'resize-y']),
  ...fromEntries('appearance', ['appearance-none', 'appearance-auto']),
  ...fromEntries('scroll-behavior', ['scroll-auto', 'scroll-smooth']),
  ['blur', 'blur'],
  ['grayscale', 'grayscale'],
  ['invert', 'invert'],
  ['sepia', 'sepia'],
  ['drop-shadow', 'drop-shadow'],
]);

type Resolver = string | ((rest: string) => string | null);

/** Ordered prefix rules — first match wins, so specific prefixes come first. */
const PREFIX: Array<[string, Resolver]> = [
  ['grid-cols-', 'grid-cols'],
  ['grid-rows-', 'grid-rows'],
  ['grid-flow-', 'grid-flow'],
  ['col-span-', 'col-span'],
  ['col-start-', 'col-start'],
  ['col-end-', 'col-end'],
  ['row-span-', 'row-span'],
  ['row-start-', 'row-start'],
  ['row-end-', 'row-end'],
  ['auto-cols-', 'auto-cols'],
  ['auto-rows-', 'auto-rows'],
  ['justify-items-', 'justify-items'],
  ['justify-self-', 'justify-self'],
  ['justify-', 'justify-content'],
  ['place-content-', 'place-content'],
  ['place-items-', 'place-items'],
  ['place-self-', 'place-self'],
  ['items-', 'items'],
  ['content-', contentGroup],
  ['self-', 'self'],
  ['object-', objectGroup],
  ['overflow-x-', 'overflow-x'],
  ['overflow-y-', 'overflow-y'],
  ['overflow-', 'overflow'],
  ['overscroll-x-', 'overscroll-x'],
  ['overscroll-y-', 'overscroll-y'],
  ['overscroll-', 'overscroll'],
  ['inset-x-', 'inset-x'],
  ['inset-y-', 'inset-y'],
  ['inset-', 'inset'],
  ['top-', 'top'],
  ['right-', 'right'],
  ['bottom-', 'bottom'],
  ['left-', 'left'],
  ['start-', 'start'],
  ['end-', 'end'],
  ['z-', 'z'],
  ['order-', 'order'],
  ['flex-', 'flex'],
  ['grow-', 'grow'],
  ['shrink-', 'shrink'],
  ['basis-', 'basis'],
  ['gap-x-', 'gap-x'],
  ['gap-y-', 'gap-y'],
  ['gap-', 'gap'],
  ['space-x-', 'space-x'],
  ['space-y-', 'space-y'],
  ['px-', 'px'],
  ['py-', 'py'],
  ['pt-', 'pt'],
  ['pr-', 'pr'],
  ['pb-', 'pb'],
  ['pl-', 'pl'],
  ['ps-', 'ps'],
  ['pe-', 'pe'],
  ['p-', 'p'],
  ['mx-', 'mx'],
  ['my-', 'my'],
  ['mt-', 'mt'],
  ['mr-', 'mr'],
  ['mb-', 'mb'],
  ['ml-', 'ml'],
  ['ms-', 'ms'],
  ['me-', 'me'],
  ['m-', 'm'],
  ['min-w-', 'min-w'],
  ['max-w-', 'max-w'],
  ['min-h-', 'min-h'],
  ['max-h-', 'max-h'],
  ['size-', 'size'],
  ['w-', 'w'],
  ['h-', 'h'],
  ['text-', textGroup],
  ['font-', fontGroup],
  ['tracking-', 'tracking'],
  ['leading-', 'leading'],
  ['indent-', 'indent'],
  ['align-', 'align'],
  ['whitespace-', 'whitespace'],
  ['list-', listGroup],
  ['decoration-', decorationGroup],
  ['underline-offset-', 'underline-offset'],
  ['bg-clip-', 'bg-clip'],
  ['bg-origin-', 'bg-origin'],
  ['bg-blend-', 'bg-blend'],
  ['bg-', bgGroup],
  ['from-', 'from'],
  ['via-', 'via'],
  ['to-', 'to'],
  ['rounded-', roundedGroup],
  ['border-spacing-', 'border-spacing'],
  ['border-', borderGroup],
  ['divide-x-', 'divide-x'],
  ['divide-y-', 'divide-y'],
  ['divide-', 'divide-color'],
  ['outline-offset-', 'outline-offset'],
  ['outline-', outlineGroup],
  ['ring-offset-', ringOffsetGroup],
  ['ring-', ringGroup],
  ['shadow-', shadowGroup],
  ['opacity-', 'opacity'],
  ['mix-blend-', 'mix-blend'],
  ['blur-', 'blur'],
  ['brightness-', 'brightness'],
  ['contrast-', 'contrast'],
  ['drop-shadow-', 'drop-shadow'],
  ['grayscale-', 'grayscale'],
  ['hue-rotate-', 'hue-rotate'],
  ['invert-', 'invert'],
  ['saturate-', 'saturate'],
  ['sepia-', 'sepia'],
  ['backdrop-', backdropGroup],
  ['transition-', 'transition'],
  ['duration-', 'duration'],
  ['ease-', 'ease'],
  ['delay-', 'delay'],
  ['animate-', 'animate'],
  ['scale-x-', 'scale-x'],
  ['scale-y-', 'scale-y'],
  ['scale-', 'scale'],
  ['rotate-', 'rotate'],
  ['translate-x-', 'translate-x'],
  ['translate-y-', 'translate-y'],
  ['skew-x-', 'skew-x'],
  ['skew-y-', 'skew-y'],
  ['origin-', 'origin'],
  ['accent-', 'accent'],
  ['cursor-', 'cursor'],
  ['caret-', 'caret'],
  ['pointer-events-', 'pointer-events'],
  ['select-', 'select'],
  ['touch-', 'touch'],
  ['will-change-', 'will-change'],
  ['fill-', 'fill'],
  ['stroke-', strokeGroup],
  ['aspect-', 'aspect'],
  ['columns-', 'columns'],
  ['break-after-', 'break-after'],
  ['break-before-', 'break-before'],
  ['break-inside-', 'break-inside'],
];

/** Classify a utility name into its property group (null when unknown). */
export function classify(name: string): string | null {
  const exact = EXACT.get(name);
  if (exact !== undefined) {
    return exact;
  }
  const arb = arbitraryProperty(name);
  if (arb !== null) {
    return arb;
  }
  for (const [prefix, resolver] of PREFIX) {
    if (name.startsWith(prefix)) {
      return typeof resolver === 'string' ? resolver : resolver(name.slice(prefix.length));
    }
  }
  return null;
}

/**
 * Canonical output order for groups: layout → flex/grid → spacing → sizing →
 * typography → backgrounds → borders → effects → filters → tables →
 * transitions → transforms → interactivity → SVG.
 */
export const GROUP_ORDER: string[] = [
  'container', 'sr', 'pointer-events', 'visibility', 'position',
  'inset', 'inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end',
  'isolation', 'z', 'order',
  'col', 'col-span', 'col-start', 'col-end', 'row', 'row-span', 'row-start', 'row-end',
  'float', 'clear', 'box', 'display', 'aspect', 'columns',
  'break-after', 'break-before', 'break-inside',
  'object-fit', 'object-position',
  'overflow', 'overflow-x', 'overflow-y', 'overscroll', 'overscroll-x', 'overscroll-y',
  'flex-direction', 'flex-wrap', 'flex', 'grow', 'shrink', 'basis',
  'grid-flow', 'grid-cols', 'grid-rows', 'auto-cols', 'auto-rows',
  'gap', 'gap-x', 'gap-y',
  'justify-content', 'justify-items', 'justify-self',
  'items', 'content-align', 'self', 'place-content', 'place-items', 'place-self',
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me',
  'space-x', 'space-y',
  'size', 'w', 'min-w', 'max-w', 'h', 'min-h', 'max-h',
  'font-family', 'font-size', 'font-smoothing', 'font-style', 'font-weight', 'font-variant',
  'tracking', 'leading', 'indent',
  'list-type', 'list-position',
  'text-align', 'text-color', 'text-transform', 'text-overflow', 'text-wrap',
  'align', 'whitespace', 'word-break', 'hyphens', 'content',
  'text-decoration', 'decoration-color', 'decoration-style', 'decoration-w', 'underline-offset',
  'bg-attachment', 'bg-clip', 'bg-color', 'bg-origin', 'bg-position', 'bg-repeat', 'bg-size',
  'bg-image', 'from', 'via', 'to',
  'rounded', 'rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
  'rounded-ss', 'rounded-se', 'rounded-ee', 'rounded-es',
  'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
  'border-w', 'border-w-x', 'border-w-y',
  'border-w-t', 'border-w-r', 'border-w-b', 'border-w-l', 'border-w-s', 'border-w-e',
  'border-style',
  'border-color', 'border-color-x', 'border-color-y',
  'border-color-t', 'border-color-r', 'border-color-b', 'border-color-l', 'border-color-s', 'border-color-e',
  'divide-x', 'divide-y', 'divide-style', 'divide-color',
  'outline-style', 'outline-w', 'outline-offset', 'outline-color',
  'ring-w', 'ring-color', 'ring-offset-w', 'ring-offset-color',
  'shadow', 'shadow-color', 'opacity', 'mix-blend', 'bg-blend',
  'blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert',
  'saturate', 'sepia',
  'backdrop-blur', 'backdrop-brightness', 'backdrop-contrast', 'backdrop-grayscale',
  'backdrop-hue-rotate', 'backdrop-invert', 'backdrop-opacity', 'backdrop-saturate', 'backdrop-sepia',
  'border-collapse', 'border-spacing', 'table-layout', 'caption',
  'transition', 'duration', 'ease', 'delay', 'animate',
  'transform', 'scale', 'scale-x', 'scale-y', 'rotate', 'translate-x', 'translate-y',
  'skew-x', 'skew-y', 'origin',
  'accent', 'appearance', 'cursor', 'caret', 'resize', 'scroll-behavior', 'select', 'touch',
  'will-change',
  'fill', 'stroke-color', 'stroke-w',
];

const ORDER_INDEX = new Map(GROUP_ORDER.map((group, index) => [group, index]));

/** Sort position for a group; arbitrary properties and unknowns go last. */
export function groupIndex(group: string | null): number {
  if (group === null) {
    return GROUP_ORDER.length + 1;
  }
  if (group.startsWith('arb:')) {
    return GROUP_ORDER.length;
  }
  return ORDER_INDEX.get(group) as number;
}

/**
 * Shorthand → the specific groups it fully covers. A later shorthand makes an
 * earlier specific utility redundant (`pl-1 p-2` → `pl-1` never applies).
 */
export const COVERS: Record<string, string[]> = {
  p: ['px', 'py', 'pt', 'pr', 'pb', 'pl', 'ps', 'pe'],
  px: ['pr', 'pl'],
  py: ['pt', 'pb'],
  m: ['mx', 'my', 'mt', 'mr', 'mb', 'ml', 'ms', 'me'],
  mx: ['mr', 'ml'],
  my: ['mt', 'mb'],
  inset: ['inset-x', 'inset-y', 'top', 'right', 'bottom', 'left', 'start', 'end'],
  'inset-x': ['right', 'left'],
  'inset-y': ['top', 'bottom'],
  size: ['w', 'h'],
  gap: ['gap-x', 'gap-y'],
  rounded: [
    'rounded-s', 'rounded-e', 'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
    'rounded-ss', 'rounded-se', 'rounded-ee', 'rounded-es',
    'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
  ],
  'rounded-t': ['rounded-tl', 'rounded-tr'],
  'rounded-r': ['rounded-tr', 'rounded-br'],
  'rounded-b': ['rounded-br', 'rounded-bl'],
  'rounded-l': ['rounded-tl', 'rounded-bl'],
  'rounded-s': ['rounded-ss', 'rounded-es'],
  'rounded-e': ['rounded-se', 'rounded-ee'],
  'border-w': [
    'border-w-x', 'border-w-y',
    'border-w-t', 'border-w-r', 'border-w-b', 'border-w-l', 'border-w-s', 'border-w-e',
  ],
  'border-w-x': ['border-w-r', 'border-w-l'],
  'border-w-y': ['border-w-t', 'border-w-b'],
  'border-color': [
    'border-color-x', 'border-color-y',
    'border-color-t', 'border-color-r', 'border-color-b', 'border-color-l', 'border-color-s', 'border-color-e',
  ],
  'border-color-x': ['border-color-r', 'border-color-l'],
  'border-color-y': ['border-color-t', 'border-color-b'],
  overflow: ['overflow-x', 'overflow-y'],
  overscroll: ['overscroll-x', 'overscroll-y'],
  scale: ['scale-x', 'scale-y'],
};
