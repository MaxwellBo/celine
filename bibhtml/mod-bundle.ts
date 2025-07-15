// Re-export the classes from the simplified bundle
export { BibhtmlCite, BibhtmlReference, BibhtmlBibliography } from './bundle.ts';

// If in browser context, try to load the full implementation
if (typeof window !== 'undefined') {
  import('./mod.ts').catch(e => {
    console.warn('Failed to load full implementation:', e);
  });
}