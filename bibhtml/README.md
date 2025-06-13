# @celine/bibhtml

[maxbo.me/celine/bibhtml](https://maxbo.me/celine/bibhtml)

_@celine/bibhtml_ is a Web Components-based referencing system for HTML documents.

## Installation

```bash
# Using npm
npm install @celine/bibhtml

# Using yarn
yarn add @celine/bibhtml

# Using bun
bun add @celine/bibhtml
```

## Usage

Include the library in your HTML file:

```html
<!-- Using npm/bun package -->
<script type="module">
  import '@celine/bibhtml';
</script>

<!-- Or using JSR -->
<script type="module" src="https://esm.sh/jsr/@celine/bibhtml@3.14.0"></script>
```

Then use the custom elements:

```html
<bh-cite><a href="#reference-id">[?]</a></bh-cite>
...
<bh-reference id="reference-id">
  @article{willighagen2019,
  title = {Citation.js: a format-independent, modular bibliography tool for the browser and command line},
  author = {Willighagen, Lars G.},
  year = 2019,
  month = aug,
  keywords = {Bibliography, Javascript},
  volume = 5,
  pages = {e214},
  journal = {PeerJ Computer Science},
  issn = {2376-5992},
  url = {https://doi.org/10.7717/peerj-cs.214},
  doi = {10.7717/peerj-cs.214}
  }
</bh-reference>
...
<bh-bibliography format="apa">
</bh-bibliography>
```

## Development

```bash
# Build the package
bun run build

# Build with type declarations
bun run build:all
```

