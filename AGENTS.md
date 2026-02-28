# AGENTS.md

## Typechecking

```sh
deno check celine/mod.ts libertine/mod.ts bibhtml/mod.ts
```

This is a Deno workspace (`deno.json` at the root) with three packages: `@celine/celine`, `@celine/libertine`, and `@celine/bibhtml`. Each package's entry point is `mod.ts`.

## Dev server

```sh
bun install
bun run dev
```

This runs `bun ./index.html ./overview.html ./bibhtml/index.html ./libertine/index.html`, serving all the HTML pages locally with hot reloading.

## Publishing a build

Each workspace package has its own semver version in its `deno.json`:

- `celine/deno.json` — `@celine/celine`
- `libertine/deno.json` — `@celine/libertine`
- `bibhtml/deno.json` — `@celine/bibhtml`

To publish, bump the `"version"` field in the relevant `deno.json` following semver (MAJOR.MINOR.PATCH), commit, and push to `master`. The GitHub Actions workflow (`.github/workflows/publish.yml`) runs `deno publish --no-check` automatically.

When bumping versions: increment PATCH for bug fixes, MINOR for backward-compatible additions, and MAJOR for breaking changes.

## Reference

The Observable runtime API docs: <https://github.com/observablehq/runtime>
