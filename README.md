# tailwind-class-doctor

![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> A lint doctor for Tailwind class strings — finds duplicates, conflicting utilities, and messy ordering, then fixes them.

`p-2 p-4` silently throws half your styles away. `tailwind-class-doctor` scans your
markup for class strings where one utility overrides another, flags exact duplicates,
and can rewrite everything into one canonical, diff-friendly order.

## Install

```bash
pnpm add -g tailwind-class-doctor
```

> _Bleeding edge or before the first npm release: `pnpm add -g github:kea0811/tailwind-class-doctor`._

## License

[MIT](./LICENSE) © kea0811
