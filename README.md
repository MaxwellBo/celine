# @celine project monorepo

The project website [maxbo.me/celine](https://maxbo.me/celine/), rather than this README.md, has the [demos](https://maxbo.me/celine/#demo), [installation instructions](https://maxbo.me/celine/#installation), [API docs](https://maxbo.me/celine/#api) and [additional resources](https://maxbo.me/celine/#resources) you might be looking for.

This monorepo contains the following packages:
- [/celine](https://github.com/MaxwellBo/celine/tree/master/celine), which is published as [@celine/celine](https://jsr.io/@celine/celine) on JSR. It exports core reactive cell functionality and styling, and a data visualization focussed standard library. It is documented at [maxbo.me/celine](https://maxbo.me/celine/).
- [/libertine](https://github.com/MaxwellBo/celine/tree/master/libertine), which is published as [@celine/libertine](https://jsr.io/@celine/libertine) on JSR. It exports `libertine.css`, a drop-in stylesheet that emulates the look of some academic typesetting. It is documented at [maxbo.me/celine/libertine](https://maxbo.me/celine/libertine).
- [/bibhtml](https://github.com/MaxwellBo/celine/tree/master/bibhtml), which is published as [@celine/bibhtml](https://jsr.io/@celine/bibhtml) on JSR. It exports 3 Web Components based custom elements that wrap [Citation.js](https://citation.js.org/). It is documented at [maxbo.me/celine/bibhtml](https://maxbo.me/celine/bibhtml).

![demo](og.png)

## Local development

### Prerequisites

- [Bun](https://bun.sh/) v1.3.10+ (canary required for standalone HTML builds)

### Setup

```bash
bun install
```

### Dev server

Bun's built-in HTML dev server bundles and serves the pages with hot reloading:

```bash
bun run dev
```

This serves all pages concurrently:
- `http://localhost:3000/` → `index.html`
- `http://localhost:3000/overview` → `overview.html`
- `http://localhost:3000/bibhtml/` → `bibhtml/index.html`
- `http://localhost:3000/libertine/` → `libertine/index.html`

The dev server resolves local imports from `celine/mod.ts` and `bibhtml/mod.ts` automatically, so changes to the source modules are reflected immediately.

### Publishing to JSR

The source modules use bare import specifiers (e.g. `@observablehq/runtime`) which are resolved by:
- **Bun**: via `node_modules/` (after `bun install`)
- **Deno/JSR**: via the `imports` map in each package's `deno.json`
