# tailwind-class-doctor

![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> A lint doctor for Tailwind class strings — finds duplicates, conflicting utilities, and messy ordering, then fixes them.

`p-2 p-4` silently throws half your styles away. Copy-pasted markup collects
`flex flex` twins, `text-lg … text-sm` fights, and `pl-1` sitting dead under a
later `p-2`. `tailwind-class-doctor` scans your markup (JSX, HTML, Vue, Svelte,
Astro, CSS `@apply` — anything with a class string), diagnoses five kinds of
class-list rot, and can rewrite everything into one canonical, diff-friendly
order with `--fix`.

## For AI coding agents

Drop [`SKILL.md`](./SKILL.md) into your AI coding agent or editor and it learns how to
use this tool — when to reach for it, the install + canonical command, the full flag
reference, and the gotchas that are easy to miss.

## Install

```bash
pnpm add -g tailwind-class-doctor
```

Prefer not to install? Run it on demand:

```bash
pnpm dlx tailwind-class-doctor src/
```

npm / yarn work too (`npm i -g tailwind-class-doctor`, `yarn global add tailwind-class-doctor`).
The command installs as `tailwind-class-doctor` with a short alias, `twdoctor`.

> _Bleeding edge or before the first npm release: `pnpm add -g github:kea0811/tailwind-class-doctor`._

## Quick start

Point it at a directory (or specific files) and it walks everything with a
markup-ish extension:

```bash
$ twdoctor src/
src/Card.tsx
  3:21    ✖ override    "p-4" is overridden by later "p-6"
  3:40    ✖ override    "shadow" is overridden by later "shadow-md"
  3:25    ⚠ order       classes are not in canonical order — expected "p-6 bg-white rounded-lg shadow-md"
  4:22    ✖ override    "text-lg" is overridden by later "text-sm"
  5:41    ✖ duplicate   "mt-2" is repeated — keep one

✖ 5 problems in 1 of 1 file — rerun with --fix to fix them
```

Let it do the surgery:

```bash
$ twdoctor src/ --fix
✎ src/Card.tsx — fixed 5
fixed 5 problems in 1 of 1 files
```

Or hand it a class string straight from your clipboard:

```bash
$ twdoctor -s "p-2 p-4 flex flex"
(string)
  1:14    ✖ duplicate   "flex" is repeated — keep one
  1:1     ✖ override    "p-2" is overridden by later "p-4"
  1:5     ⚠ order       classes are not in canonical order — expected "flex p-4"

$ twdoctor -s "p-2 p-4 flex flex" --fix
flex p-4
```

## What it catches

| Diagnosis | Example | Why it matters |
| --- | --- | --- |
| `duplicate` | `flex … flex` | Pure noise — one of them is a copy-paste ghost. |
| `override` | `p-2 p-4` | Both set the same property; only one survives, the other misleads readers. |
| `shorthand` | `pl-1 … p-2` | A later shorthand fully covers the earlier specific utility — it's dead code. |
| `ineffective` | `!p-2 p-4` | The later class silently loses to an earlier `!important`. |
| `order` | `p-4 flex` | Not a bug, but consistent order makes class strings scannable and diffs quiet. |

Conflicts are variant-aware: `hover:p-2 p-4` is fine, `hover:p-2 hover:p-4` is
flagged, and `md:hover:p-2` collides with `hover:md:p-4` because the variant
*set* is what matters. The intentional refinement pattern `p-4 px-2` (shorthand
first, specific after) is left alone.

## Usage

```
twdoctor [options] [paths...]
```

`paths` are files or directories (scanned recursively; `node_modules`, `dist`,
`.git`, `build`, `coverage`, `.next` are skipped).

### Options

| Flag | Description | Default |
| --- | --- | --- |
| `-s, --string <classes>` | Lint a class string instead of files | |
| `-f, --fix` | Rewrite files in place (or print the fixed string with `-s`) | off |
| `--format <format>` | Output format: `pretty`, `json` | `pretty` |
| `--no-order` | Disable the canonical-order rule | |
| `--no-color` | Disable colored output | |
| `-e, --ext <list>` | Extensions for directory scans, e.g. `-e tsx,html` | html, htm, js, jsx, ts, tsx, vue, svelte, astro, mdx, css, scss |
| `-v, --version` | Print the version | |
| `-h, --help` | Show help with examples | |

### Exit codes

`0` — clean (or everything fixed) · `1` — problems found · `2` — usage error.
That makes a lovely lightweight CI gate:

```bash
twdoctor src/ || exit 1
```

## Common uses

```bash
# Gate CI on "no conflicting Tailwind classes" (order rule off)
twdoctor src/ --no-order

# Normalize a whole codebase once, then keep diffs quiet forever
twdoctor src/ --fix

# Pipe a suspicious class string in while debugging
twdoctor -s "mt-2 flex p-2 p-4 flex" --fix

# Feed the report to another tool
twdoctor src/ --format json | jq '.summary'
```

## How it works

Every class is parsed into variants + utility (bracket-aware, so
`[&:hover]:bg-[url(http://…)]` doesn't fool the splitter) and classified into a
**property group** — the set of utilities that write the same CSS property.
`text-lg` and `text-sm` share a group; `text-lg` and `text-red-500` don't,
even though they share a prefix. Overloaded prefixes (`text-`, `font-`, `bg-`,
`border-`, `shadow-`, `ring-`…) are disambiguated by value shape, including
arbitrary values: `text-[12px]` reads as a font size, `text-[#bada55]` as a
color. Two classes in the same group under the same variant set → the earlier
one is dead, following the same "last one wins" convention as `tailwind-merge`.
Shorthand relationships (`p` covers `px` covers `pl`) catch cross-group
shadowing, and `!important` markers (`!p-2` / `p-2!`) flip who wins.

Utilities it doesn't recognize (your `btn`, `card`, CSS-module hashes) are
never flagged — they're only nudged to the end by the order rule, and template
literals with `${…}` interpolation are skipped entirely rather than guessed at.

## Contributing

```bash
pnpm install
pnpm test          # run the suite
pnpm test:coverage # run with coverage (100% is enforced)
pnpm build         # bundle to dist/ with tsup
```

Issues and PRs welcome. Please keep coverage at 100%.

## License

[MIT](./LICENSE) © kea0811
