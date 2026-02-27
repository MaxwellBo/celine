import { CelineModule, registerScriptReevaluationOnBlur } from './celine/mod.ts';
import * as Inputs from '@observablehq/inputs';
import * as htl from 'htl';

window.celine = CelineModule.usingNewObservableRuntimeAndModule(document);
window.library = celine.library; /* @observablehq/stdlib */
window.Inputs = Inputs;
window.htl = htl;

registerScriptReevaluationOnBlur(document, /*class=*/'echo');
