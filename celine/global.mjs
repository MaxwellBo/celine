import { CelineModule, registerScriptReevaluationOnBlur } from "./mod.ts";
import * as Inputs from "@observablehq/inputs";
import * as htl from "htl";

const celine = CelineModule.usingNewObservableRuntimeAndModule(document);
const library = celine.library; /* @observablehq/stdlib */

window.celine = celine;
window.library = library;
window.Inputs = Inputs;
window.htl = htl;

registerScriptReevaluationOnBlur(document, /*class=*/"echo");

export { CelineModule, Inputs, celine, htl, library, registerScriptReevaluationOnBlur };
