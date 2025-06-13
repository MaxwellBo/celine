#!/usr/bin/env bun
import { BibhtmlBibliography, BibhtmlCite, BibhtmlReference } from './dist/mod.js';

console.log('Successfully imported:');
console.log('- BibhtmlBibliography:', typeof BibhtmlBibliography === 'function');
console.log('- BibhtmlCite:', typeof BibhtmlCite === 'function');
console.log('- BibhtmlReference:', typeof BibhtmlReference === 'function');
console.log('Custom element names:');
console.log('- BibhtmlBibliography.customElementName:', BibhtmlBibliography.customElementName);
console.log('- BibhtmlCite.customElementName:', BibhtmlCite.customElementName);
console.log('- BibhtmlReference.customElementName:', BibhtmlReference.customElementName);