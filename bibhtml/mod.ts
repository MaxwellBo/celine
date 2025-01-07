import { Cite } from 'npm:@citation-js/core@0.7.14'
import 'npm:@citation-js/plugin-bibtex@0.7.16'
import 'npm:@citation-js/plugin-doi@0.7.16'
import 'npm:@citation-js/plugin-csl@0.7.14'
import 'npm:@citation-js/plugin-wikidata@0.7.15'
// import 'npm:@citation-js/plugin-hayagriva@0.1.1'

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

async function getBibliography(): Promise<BibhtmlBibliography> {
  const bibliography: BibhtmlBibliography | null = document.querySelector(BibhtmlBibliography.customElementName);

  if (!bibliography) {
    throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
  }

  // Edge case where the custom element is defined but not yet upgraded
  await customElements.whenDefined(BibhtmlBibliography.customElementName);

  return bibliography;
}

export class BibhtmlCite extends HTMLElement {
  _referenceIndex: number | null;
  _citationIndex: number | null;
  _notifiedBibliography: boolean;

  static customElementName = 'bh-cite';

  constructor() {
    super();
    this._referenceIndex = null;
    this._citationIndex = null;
    this._notifiedBibliography = false;
  }

  connectedCallback() {
    getBibliography().then(bib => bib.addCitation(this.refId, this));
  }

  disconnectedCallback() {
    getBibliography().then(bib => bib.removeCitation(this.refId, this));
  }

  static get observedAttributes(): string[] {
    return ['replace', 'ref', 'deref'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
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

  get refId(): string {
    if (this.hasAttribute('ref') && this.hasAttribute('deref')) {
      throw new Error(`You have both ref and deref attributes in <${BibhtmlCite.customElementName}>. You should only have one.`);
    }

    const a = this.querySelector('a');

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

  render() {
    if (this._referenceIndex === null || this._citationIndex === null) {
      return;
    }

    const bibliography: BibhtmlBibliography | null = (this.getRootNode() as Document | ShadowRoot).querySelector(BibhtmlBibliography.customElementName);

    if (!bibliography) {
      throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
    }
    const citationShorthand = alphabetize(this._citationIndex + 1);

    this.id = `cite-${this.refId}-${citationShorthand}`;

    // get the first link
    const a = this.querySelector('a');

    // fail if no first link
    if (!a) {
      throw new Error(`Could not find an <a> element in <${BibhtmlCite.customElementName}>. Make sure you have one inside your <${BibhtmlCite.customElementName}>...</${BibhtmlCite.customElementName}>.`);
    }

    // build a shadow root if it doesn't exist
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    // clone light DOM into shadow DOM
    this.shadowRoot!.replaceChildren(...Array.from(this.children).map(child => child.cloneNode(true)));

    // get the cloned first link
    const clonedA = this.shadowRoot!.querySelector('a');
    clonedA?.setAttribute('part', 'bh-a'); // used to style links in libertine.css
    // swap ? for the reference index
    
    if (this.replace === "number") {
      clonedA!.innerText = clonedA!.innerText.replace('?', (this._referenceIndex + 1).toString());
    }

    // if deref, we need to get the URL from the citation of the reference
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
      clonedA!.href = url;
    }

    // Show the entire reference on hover
    const ref = bibliography._refIdToReference.get(this.refId);
    if (ref) {
      const tooltip = document.createElement('span');
      tooltip.textContent = ref.shadowRoot?.innerHTML || ref.innerHTML || '';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'white';
      tooltip.style.border = '1px solid black';
      tooltip.style.padding = '5px';
      tooltip.style.display = 'none';
      tooltip.style.zIndex = '1000';
      tooltip.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
      tooltip.style.borderRadius = '4px';
      tooltip.style.maxWidth = '300px';
      tooltip.style.fontSize = '14px';

      // Position the tooltip underneath the citation link
      const rect = clonedA!.getBoundingClientRect();
      tooltip.style.left = `${rect.left}px`;

      this.shadowRoot!.appendChild(tooltip);

      this.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      });

      this.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }
  }
}

export class BibhtmlReference extends HTMLElement {
  _citation: any;
  _notifiedBibliography: boolean;
  _citationCount = 0;
  _citationPromise: Promise<any> | null;

  static customElementName = 'bh-reference';

  /** @deprecated you don't need to explicitly define the custom element now, it's done at import time.  */
  static defineCustomElement(name: string) {
    customElements.define(name, BibhtmlReference);
    BibhtmlReference.customElementName = name;
  }

  static get observedAttributes(): string[] {
    return ['id'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._citation = null;
    this._citationPromise = null;
    this._notifiedBibliography = false;

    if (!this.getAttribute('id')) {
      console.error(`<${BibhtmlReference.customElementName}> must have an id attribute so that you can cite it`);

    }
  }

  set citationCount(value: number) {
    this._citationCount = value;
  }

  connectedCallback() {
    if (!this._citation && this._citationPromise == null) {
      this._citationPromise = Cite.async(this.textContent).then((citation: any) => {
        this._citation = citation;
        this.render();
        return getBibliography().then(bib => bib.render())
      }).catch((e: Error) => {
        console.log(`Could not parse <${BibhtmlReference.customElementName}> innerText with Citation.js. See https://citation.js.org/ for valid formats. innerText was:`, this.textContent, e);
      });
    }

    if (!this._notifiedBibliography) {
      this._notifiedBibliography = true;
      getBibliography().then(bib => bib.addReference(this.id, this));
    }
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    if (name === 'id' && newValue) {
      getBibliography().then(bib => bib.addReference(newValue, this));
    }
  }

  render(template = 'apa') {
    if (this._citationCount == 0) {
      // clear the shadow root
      this.shadowRoot!.replaceChildren();
      return;
    }

    // gracefully degrade
    if (!this._citation) {
      this.shadowRoot!.replaceChildren(document.createTextNode(this.textContent || ''));
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

    this.shadowRoot!.replaceChildren(...cslEntry.childNodes);
  }
}

export class BibhtmlBibliography extends HTMLElement {
  _refIdToReference: Map<string, BibhtmlReference>;
  _refIdToCitations: Map<string, BibhtmlCite[]>;

  constructor() {
    super();
    this._refIdToReference = new Map();
    this._refIdToCitations = new Map();
  }

  static customElementName = 'bh-bibliography';

  async connectedCallback() {
    this.render();
  }

  static get observedAttributes(): string[] {
    return ['format'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null) {
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
    ol.style.wordWrap = 'break-word';

    let referenceIndex = 0;
    for (const [refId, citations] of this._refIdToCitations.entries()) {
      const reference = this._refIdToReference.get(refId);
      if (!reference) {
        continue;
      }

      reference.citationCount = citations.length;
      reference.render(this.getAttribute('format') ?? undefined);

      if (citations.length === 0) {
        continue
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

        for (const citation of citations) {
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
    };

    this.replaceChildren(ol);
  }
}

customElements.define(BibhtmlBibliography.customElementName, BibhtmlBibliography);
customElements.define(BibhtmlReference.customElementName, BibhtmlReference);
customElements.define(BibhtmlCite.customElementName, BibhtmlCite);