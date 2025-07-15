// bundle.ts
var BibhtmlCite = class extends HTMLElement {
  _referenceIndex;
  _citationIndex;
  _notifiedBibliography;
  static customElementName = "bh-cite";
  constructor() {
    super();
    this._referenceIndex = null;
    this._citationIndex = null;
    this._notifiedBibliography = false;
  }
};
var BibhtmlReference = class extends HTMLElement {
  _citation;
  _notifiedBibliography;
  _citationCount = 0;
  _citationPromise;
  static customElementName = "bh-reference";
  constructor() {
    super();
    this.attachShadow({
      mode: "open"
    });
    this._citation = null;
    this._citationPromise = null;
    this._notifiedBibliography = false;
  }
};
var BibhtmlBibliography = class extends HTMLElement {
  _refIdToReference;
  _refIdToCitations;
  constructor() {
    super();
    this._refIdToReference = /* @__PURE__ */ new Map();
    this._refIdToCitations = /* @__PURE__ */ new Map();
  }
  static customElementName = "bh-bibliography";
};
if (typeof customElements !== "undefined") {
  try {
    customElements.define(BibhtmlBibliography.customElementName, BibhtmlBibliography);
    customElements.define(BibhtmlReference.customElementName, BibhtmlReference);
    customElements.define(BibhtmlCite.customElementName, BibhtmlCite);
  } catch (e) {
    console.warn("Custom elements already defined or not supported:", e);
  }
}
export {
  BibhtmlBibliography,
  BibhtmlCite,
  BibhtmlReference
};
