import { Cite } from 'npm:@citation-js/core@0.7.14'
import 'npm:@citation-js/plugin-bibtex@0.7.16'
import 'npm:@citation-js/plugin-doi@0.7.16'
import 'npm:@citation-js/plugin-csl@0.7.14'
import 'npm:@citation-js/plugin-wikidata@0.7.15'

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

  get refId(): string {
    const a = this.querySelector('a');

    if (a == null) {
      throw new Error(`Could not find an <a> element in <${BibhtmlCite.customElementName}>. Make sure you have one inside your <${BibhtmlCite.customElementName}>...</${BibhtmlCite.customElementName}>.`);
    }

    return (a.getAttribute('href') || '').replace(/^#/, '');
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
    // swap ? for the reference index
    clonedA!.innerText = clonedA!.innerText.replace('#?', (this._referenceIndex + 1).toString());
  }
}

export class BibhtmlReference extends HTMLElement {
  _citation: any;
  _notifiedBibliography: boolean;
  _citationCount = 0;

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
    this._notifiedBibliography = false;

    if (!this.getAttribute('id')) {
      console.error(`<${BibhtmlReference.customElementName}> must have an id attribute so that you can cite it with <${BibhtmlCite.customElementName}>{id}</${BibhtmlCite.customElementName}> or <${BibhtmlCite.customElementName} ref="{id}">...</${BibhtmlCite.customElementName}>.`);

    }
  }

  set citationCount(value: number) {
    this._citationCount = value;
  }

  connectedCallback() {
    if (!this._citation) {
      Cite.async(this.textContent).then((citation: any) => {
        this._citation = citation;
        this.render();
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