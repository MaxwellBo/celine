import { Cite } from '@citation-js/core'
import '@citation-js/plugin-bibtex'
import '@citation-js/plugin-doi'
import '@citation-js/plugin-csl'
import '@citation-js/plugin-wikidata'
// import 'npm:@citation-js/plugin-hayagriva@0.1.1'

/**
 * Converts a number to alphabetical representation (1=a, 2=b, 26=z, 27=aa, etc.)
 */
function alphabetize(n: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
  let out = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    out = alphabet[mod] + out;
    n = Math.floor((n - mod) / 26);
  }
  return out;
}

/**
 * Gets the bibliography element from the document
 * @throws {Error} If bibliography element is not found
 */
async function getBibliography(): Promise<BibhtmlBibliography> {
  const bibliography = document.querySelector(BibhtmlBibliography.customElementName) as BibhtmlBibliography | null;

  if (!bibliography) {
    throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
  }

  // Edge case where the custom element is defined but not yet upgraded
  await customElements.whenDefined(BibhtmlBibliography.customElementName);

  return bibliography;
}

export class BibhtmlCite extends HTMLElement {
  static customElementName = 'bh-cite';

  _referenceIndex: number | null = null;
  _citationIndex: number | null = null;
  _notifiedBibliography = false;
  _tooltip: HTMLElement | null = null;

  connectedCallback() {
    getBibliography().then(bib => bib.addCitation(this.refId, this));
  }

  disconnectedCallback() {
    getBibliography().then(bib => bib.removeCitation(this.refId, this));
    // Remove tooltip if it exists
    if (this._tooltip && this._tooltip.parentNode) {
      document.body.removeChild(this._tooltip);
      this._tooltip = null;
    }
    // Clean up event listeners
    this.removeEventListener('mouseenter', this._handleMouseEnter);
    this.removeEventListener('mouseleave', this._handleMouseLeave);
  }

  static get observedAttributes(): string[] {
    return ['replace', 'ref', 'deref'];
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null) {
    if (name === 'deref' || name === 'ref' || name === 'replace') {
      this.render();
    }
  }

  get replace(): string {
    const REPLACEMENTS = ['number', 'none', ''];

    if (!REPLACEMENTS.includes(this.getAttribute('replace') || '')) {
      console.warn(`Invalid value for the replace attribute in <${BibhtmlCite.customElementName}>. Valid values are ${REPLACEMENTS.join(', ')}. Defaulting to "number".`);
      return "number";
    }

    return this.getAttribute('replace') || "number";
  }

  /**
   * @throws {Error} If both ref and deref attributes are present or if no anchor element is found
   */
  get refId(): string {
    if (this.hasAttribute('ref') && this.hasAttribute('deref')) {
      throw new Error(`You have both ref and deref attributes in <${BibhtmlCite.customElementName}>. You should only have one.`);
    }

    const a = this.querySelector('a') as HTMLAnchorElement | null;

    if (a == null) {
      throw new Error(`Could not find an <a> element in <${BibhtmlCite.customElementName}>. Make sure you have one inside your <${BibhtmlCite.customElementName}>...</${BibhtmlCite.customElementName}>.`);
    }

    return (this.getAttribute('ref') || a.getAttribute('href') || '').replace(/^#/, '');
  }

  set referenceIndex(value: number) {
    this._referenceIndex = value;
    this.render();
  }

  set citationIndex(value: number) {
    this._citationIndex = value;
    this.render();
  }

  _handleMouseEnter = () => {
    if (this._tooltip) {
      this._tooltip.style.display = 'block';
      
      // Position the tooltip underneath the citation link
      const rect = this.getBoundingClientRect();
      this._tooltip.style.left = `${rect.left}px`;
      this._tooltip.style.top = `${rect.bottom}px`;
    }
  }

  _handleMouseLeave = () => {
    if (this._tooltip) {
      this._tooltip.style.display = 'none';
    }
  }

  render() {
    if (this._referenceIndex === null || this._citationIndex === null) {
      return;
    }

    const bibliography = (this.getRootNode() as Document).querySelector(BibhtmlBibliography.customElementName) as BibhtmlBibliography | null;

    if (!bibliography) {
      throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
    }
    
    const citationShorthand = alphabetize(this._citationIndex + 1);
    this.id = `cite-${this.refId}-${citationShorthand}`;

    const a = this.querySelector('a') as HTMLAnchorElement | null;

    if (!a) {
      throw new Error(`Could not find an <a> element in <${BibhtmlCite.customElementName}>. Make sure you have one inside your <${BibhtmlCite.customElementName}>...</${BibhtmlCite.customElementName}>.`);
    }

    a.setAttribute('role', 'doc-noteref'); // https://kb.daisy.org/publishing/docs/html/dpub-aria/doc-noteref.html

    if (this.replace === "number") {
      a.innerText = a.innerText.replace('?', (this._referenceIndex + 1).toString());
    }

    // If deref, we need to get the URL from the citation of the reference
    if (this.hasAttribute('deref')) {
      const ref = bibliography._refIdToReference.get(this.refId);
      if (!ref) {
        console.warn(`Could not find a reference with id ${this.refId} in the bibliography.`);
        return;
      }
      const citation = ref._citation;
      if (!citation) {
        console.log(`Could not find a citation for reference with id ${this.refId}. It may not have loaded yet.`);
        return;
      }
      const url = citation.data[0].URL;
      if (!url) {
        console.log(`Could not find a citation URL for reference with id ${this.refId}.`);
        return;
      }
      a.href = url;
    }

    // Create or update tooltip
    const ref = bibliography._refIdToReference.get(this.refId);
    if (ref) {
      if (this._tooltip && this._tooltip.parentNode) {
        document.body.removeChild(this._tooltip);
      }
      
      this._tooltip = document.createElement('span');
      this._tooltip.innerHTML = ref.innerHTML || '';
      this._tooltip.style.position = 'absolute';
      this._tooltip.style.backgroundColor = 'white';
      this._tooltip.style.border = '1px solid black';
      this._tooltip.style.padding = '5px';
      this._tooltip.style.display = 'none';
      this._tooltip.style.zIndex = '1000';
      this._tooltip.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      this._tooltip.style.borderRadius = '4px';
      this._tooltip.style.maxWidth = '300px';
      this._tooltip.style.fontSize = '14px';
      
      document.body.appendChild(this._tooltip);
      
      this.removeEventListener('mouseenter', this._handleMouseEnter);
      this.removeEventListener('mouseleave', this._handleMouseLeave);
      this.addEventListener('mouseenter', this._handleMouseEnter);
      this.addEventListener('mouseleave', this._handleMouseLeave);
    }
  }
}

export class BibhtmlReference extends HTMLElement {
  static customElementName = 'bh-reference';

  /** 
   * @deprecated you don't need to explicitly define the custom element now, it's done at import time.
   */
  static defineCustomElement(name: string) {
    customElements.define(name, BibhtmlReference);
    BibhtmlReference.customElementName = name;
  }

  static get observedAttributes(): string[] {
    return ['id'];
  }

  // deno-lint-ignore no-explicit-any
  _citation: any = null;
  // deno-lint-ignore no-explicit-any
  _citationPromise: Promise<any> | null = null;
  _notifiedBibliography = false;
  _citationCount = 0;
  _originalContent: string | null = null;

  constructor() {
    super();
    if (!this.getAttribute('id')) {
      console.error(`<${BibhtmlReference.customElementName}> must have an id attribute so that you can cite it`);
    }
  }

  set citationCount(value: number) {
    this._citationCount = value;
    this.render();
  }

  connectedCallback() {
    if (!this._citation && this._citationPromise == null) {
      this._citationPromise = Cite.async(this.textContent).then((citation: unknown) => {
        this._citation = citation;
        this.render();
        return getBibliography().then(bib => bib.render())
      }).catch((e: unknown) => {
        console.log(`Could not parse <${BibhtmlReference.customElementName}> innerText with Citation.js. See https://citation.js.org/ for valid formats. innerText was:`, this.textContent, e);
      });
    }

    if (!this._notifiedBibliography) {
      this._notifiedBibliography = true;
      getBibliography().then(bib => bib.addReference(this.id, this));
    }
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'id' && newValue) {
      getBibliography().then(bib => bib.addReference(newValue, this));
    }
  }

  render(template = 'apa') {
    if (this._citationCount == 0) {
      this.innerHTML = '';
      return;
    }

    if (!this._citation) {
      return;
    }

    const tempTemplate = document.createElement('template');
    tempTemplate.innerHTML = this._citation.format('bibliography', {
      format: 'html',
      hyperlinks: true,
      template
    });

    const cslEntry = tempTemplate.content.querySelector('.csl-entry');

    if (!cslEntry) {
      throw new Error('Could not find .csl-entry element in Citation.js rendered HTML. This is very odd. Please report this on the @celine/bibhtml GitHub repository.');
    }

    this.innerHTML = '';
    while (cslEntry.firstChild) {
      this.appendChild(cslEntry.firstChild);
    }
  }
}

export class BibhtmlBibliography extends HTMLElement {
  static customElementName = 'bh-bibliography';

  _refIdToReference = new Map<string, BibhtmlReference>();
  _refIdToCitations = new Map<string, BibhtmlCite[]>();

  connectedCallback() {
    this.render();
  }

  static get observedAttributes(): string[] {
    return ['format'];
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null) {
    if (name === 'format') {
      this.render();
    }
  }

  addReference(refId: string, reference: BibhtmlReference) {
    this._refIdToReference.set(refId, reference);
    this.render();
  }

  addCitation(refId: string, citation: BibhtmlCite) {
    if (!this._refIdToCitations.has(refId)) {
      this._refIdToCitations.set(refId, []);
    }
    this._refIdToCitations.get(refId)!.push(citation);
    this.render();
  }

  removeCitation(refId: string, citation: BibhtmlCite) {
    if (!this._refIdToCitations.has(refId)) {
      return;
    }
    this._refIdToCitations.set(refId, this._refIdToCitations.get(refId)!.filter(c => c !== citation));
    this.render();
  }

  render() {
    const ol = document.createElement('ol');
    ol.style.overflowWrap = 'break-word';

    let referenceIndex = 0;
    for (const [refId, citations] of this._refIdToCitations.entries()) {
      const reference = this._refIdToReference.get(refId);
      if (!reference) {
        continue;
      }

      reference.citationCount = citations.length;

      if (citations.length === 0) {
        continue;
      }

      let citationIndex = 0;
      for (const citation of citations) {
        citation.referenceIndex = referenceIndex;
        citation.citationIndex = citationIndex;
        citation.render();
        citationIndex++;
      }

      const li = document.createElement('li');

      const backlinks = document.createElement('sup');
      if (citations.length === 1) {
        const backlink = document.createElement('a');
        backlink.href = `#cite-${refId}-a`;
        backlink.textContent = '^';
        backlinks.appendChild(backlink);
      } else {
        let i = 0;
        backlinks.textContent = '^';
        backlinks.appendChild(document.createTextNode(' '));

        for (const _citation of citations) {
          const citationShorthand = alphabetize(i + 1);
          const backlink = document.createElement('a');
          backlink.href = `#cite-${refId}-${citationShorthand}`;
          backlink.textContent = citationShorthand;
          backlinks.appendChild(document.createTextNode(' '));
          backlinks.appendChild(backlink);
          i++;
        }
      }
      backlinks.appendChild(document.createTextNode(' '));

      li.appendChild(backlinks);
      li.appendChild(reference);

      ol.appendChild(li);
      referenceIndex++;
    }

    this.innerHTML = '';
    this.appendChild(ol);
  }
}

customElements.define(BibhtmlBibliography.customElementName, BibhtmlBibliography);
customElements.define(BibhtmlReference.customElementName, BibhtmlReference);
customElements.define(BibhtmlCite.customElementName, BibhtmlCite);
