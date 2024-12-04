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

function anchorify(root: ShadowRoot | Document, element: HTMLElement, query: string): void {
  element.onclick = () => {
    const target = root.querySelector(query);
    if (!target) {
      throw new Error(`Could not find element to scroll to and focus. Query was ${query}`);
    }

    target.scrollIntoView();
    (target as HTMLElement).focus();
  };
}

export class BibhtmlCite extends HTMLElement {
  _referenceIndex: number | null;
  _citationIndex: number | null;
  _notifiedBibliography: boolean;

  static customElementName = 'bh-cite';

  static defineCustomElement(name: string) {
    customElements.define(name, BibhtmlCite);
    BibhtmlCite.customElementName = name;
  }

  constructor() {
    super();
    this._referenceIndex = null;
    this._citationIndex = null;
    this._notifiedBibliography = false;
  }

  connectedCallback() {
    const bibliography: BibhtmlBibliography | null = document.querySelector(BibhtmlBibliography.customElementName);

    if (!bibliography) {
      throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
    }

    bibliography.addCitation(this.refId, this);
  }

  static get observedAttributes(): string[] {
    return ['ref', 'href'];
  }

  attributeChangedCallback(name: string, oldValue: string | null, _newValue: string | null) {
    if (name === 'ref') {
      this.render();
    }

    if (name === 'href') {
      this.render();
    }
  }

  get refId(): string {
    if (this.getAttribute('href') && this.getAttribute('ref')) {
      console.warn(`<${BibhtmlCite.customElementName}> has both a href and ref attribute. Using href: ${this.getAttribute('href')}.`);
    }

    return this.getAttribute('href') || this.getAttribute('ref') || (this.textContent || '').trim();
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

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    const bibliography: BibhtmlBibliography | null = document.querySelector(BibhtmlBibliography.customElementName);

    if (!bibliography) {
      throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
    }

    const link = document.createElement('a');
    const citationShorthand = alphabetize(this._citationIndex + 1);

    this.id = `cite-${this.refId}-${citationShorthand}`;
    link.href = `#${this.refId}`;

    if (this.getAttribute('href')) {
      link.textContent = this.textContent;
    } else {
      link.textContent = `[${this._referenceIndex + 1}]`;
    }

    this.shadowRoot!.replaceChildren(link);
  }
}

export class BibhtmlReference extends HTMLElement {
  _citation: any;
  _notifiedBibliography: boolean;
  _citationCount = 0;

  static customElementName = 'bh-reference';

  static defineCustomElement(name: string) {
    customElements.define(name, BibhtmlReference);
    BibhtmlReference.customElementName = name;
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

  async connectedCallback() {
    const bibliography: BibhtmlBibliography | null = document.querySelector(BibhtmlBibliography.customElementName);
    if (!bibliography) {
      throw new Error(`Could not find <${BibhtmlBibliography.customElementName}> element in the document. Make sure you have one in your document.`);
    }

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
      bibliography.addReference(this.id, this);
    }
  }

  format(template: string): string {
    return this._citation.format('bibliography', {
      format: 'html',
      template
    });
  }

  render(template = 'apa') {
    if (this._citationCount == 0) {
      return;
    }

    // gracefully degrade
    if (!this._citation) {
      this.shadowRoot!.replaceChildren(document.createTextNode(this.textContent || ''));
      return;
    }

    const tempTemplate = document.createElement('template');
    tempTemplate.innerHTML = this.format(template);

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

  static defineCustomElement(name: string) {
    customElements.define(name, BibhtmlBibliography);
    BibhtmlBibliography.customElementName = name;
  }

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

  render() {
    const list = document.createElement('ol');

    let referenceIndex = 0;
    for (const [refId, citations] of this._refIdToCitations.entries()) {
      const reference = this._refIdToReference.get(refId);
      if (!reference) {
        continue;
      }

      let citationIndex = 0;
      for (const citation of citations) {
        citation.referenceIndex = referenceIndex;
        citation.citationIndex = citationIndex;
        citation.render();
        citationIndex++;
      }

      const item = document.createElement('li');

      reference.citationCount = citations.length;
      reference.render(this.getAttribute('format') ?? undefined);
      item.appendChild(reference);
      item.id = `ref-${refId}`;

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
      item.prepend(backlinks);
      list.appendChild(item);
      referenceIndex++;
    };

    this.replaceChildren(list);
  }
}
