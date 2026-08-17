---
name: tailwind-class-doctor
description: Use when a user wants to lint, clean up, deduplicate, or canonically sort Tailwind CSS class strings — a Node CLI (Node >= 18) that finds duplicate classes, conflicting utilities (p-2 p-4), dead classes shadowed by shorthands or !important, and non-canonical order, with an autofix that rewrites files in place.
---

# tailwind-class-doctor

A command-line linter for Tailwind class strings. It scans markup (JSX/TSX,
HTML, Vue, Svelte, Astro, MDX, and CSS `@apply`) for class attributes,
classifies every utility into its CSS property group, and reports five kinds of
rot: exact duplicates, same-group overrides, specifics made dead by a later
shorthand, classes that silently lose to an earlier `!important`, and
non-canonical ordering. `--fix` rewrites the class strings in place. Reach for
it when class strings have accumulated conflicts or need normalizing —
especially after big copy-paste refactors or AI-generated markup.

## When to reach for this

User says:
- "Are there conflicting/duplicate Tailwind classes in this project?"
- "Clean up / sort / normalize the Tailwind classes in these files."
- "Why isn't `p-2` applying?" (a later `p-4` or an `!important` sibling may be beating it)
- "Add a CI check that Tailwind class strings stay sane."

User does NOT mean this when they ask for:
- ❌ Sorting classes at format time in the editor → that's `prettier-plugin-tailwindcss`.
- ❌ Merging class strings at runtime in JS → that's `tailwind-merge` / `clsx`.
- ❌ Linting `tailwind.config` or finding unused CSS → point them at Tailwind's own tooling / `eslint-plugin-tailwindcss`.

## Install

```bash
pnpm add -g tailwind-class-doctor   # global commands: tailwind-class-doctor + twdoctor
pnpm dlx tailwind-class-doctor src/ # run once without installing
```

## Most common pattern (95% of cases)

```bash
# Report problems across a source tree (exit 1 if any — CI-friendly)
twdoctor src/

# Fix everything in place: dedupe, drop dead classes, canonical order
twdoctor src/ --fix

# Check one class string quickly
twdoctor -s "p-2 p-4 flex flex" --fix   # → "flex p-4"
```

## API / flags

| Flag | What it does |
| --- | --- |
| `[paths...]` | Files or directories to scan (recursive; node_modules etc. skipped) |
| `-s, --string <classes>` | Lint a raw class string instead of files |
| `-f, --fix` | Rewrite files in place (with `-s`: print the fixed string) |
| `--format <pretty\|json>` | Output format (default `pretty`) |
| `--no-order` | Only report real conflicts, skip the order rule |
| `--no-color` | Disable ANSI colors |
| `-e, --ext <list>` | Extensions for directory scans, e.g. `-e tsx,html` |

Exit codes: `0` clean/fixed, `1` problems found, `2` usage error.

## Gotchas worth knowing

1. Conflicts are variant-set aware: `hover:p-2 p-4` is fine, but `md:hover:p-2`
   vs `hover:md:p-4` IS a conflict (same variant set, different spelling).
2. `p-4 px-2` (shorthand first, specific later) is an intentional pattern and is
   never flagged — only the reverse (`px-2` dead under a later `p-4`) is.
3. Unknown utilities (`btn`, CSS-module classes) are never flagged as conflicts,
   and `className={`…${dynamic}…`}` template literals are skipped, not guessed at.
4. The canonical order is opinionated (layout → spacing → typography → color →
   effects); use `--no-order` if the team only wants hard-conflict linting.

## Links

- npm / install: `pnpm add -g tailwind-class-doctor`
- repo: https://github.com/kea0811/tailwind-class-doctor
