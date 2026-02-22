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
bun ./index.html            # root page at http://localhost:3000
bun ./bibhtml/index.html    # bibhtml page
bun ./libertine/index.html  # libertine page
```

The dev server resolves local imports from `celine/mod.mjs` and `bibhtml/mod.mjs` automatically, so changes to the source modules are reflected immediately.

### Building standalone HTML

Each HTML page can be compiled into a single self-contained file (all JS, CSS, fonts, and images inlined) using [Bun's standalone HTML](https://bun.sh/docs/bundler/standalone-html) feature:

```bash
bun run build.ts
```

This produces:
```
dist/
├── index.html          # root page
├── bibhtml/
│   └── index.html      # bibhtml page
└── libertine/
    └── index.html      # libertine page
```

To preview the built files:
```bash
cd dist && bunx serve
```

### Project structure

```
├── entry.mjs                 # Root page entry (imports celine from source)
├── index.html                # Root page
├── overview.html             # Overview page
├── build.ts                  # Standalone HTML build script
├── celine/
│   ├── mod.mjs               # @celine/celine source
│   ├── cell.css              # Cell styling
│   └── deno.json             # Package config + Deno import map
├── bibhtml/
│   ├── mod.mjs               # @celine/bibhtml source
│   ├── entry.mjs             # Bibhtml page entry
│   └── deno.json             # Package config + Deno import map
├── libertine/
│   ├── libertine.css         # Libertine stylesheet
│   ├── entry.mjs             # Libertine page entry
│   └── deno.json             # Package config
└── static/                   # Shared static assets (favicons, images)
```

### Publishing to JSR

The source modules use bare import specifiers (e.g. `@observablehq/runtime`) which are resolved by:
- **Bun**: via `node_modules/` (after `bun install`)
- **Deno/JSR**: via the `imports` map in each package's `deno.json`
