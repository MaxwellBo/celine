import {
  CelineModule,
  registerScriptReevaluationOnBlur,
} from "https://esm.sh/jsr/@celine/celine@6.1.0";
import * as Inputs from "https://esm.run/@observablehq/inputs@0.12.0";
import * as htl from "https://esm.run/htl@0.3.1";

window.celine = CelineModule.usingNewObservableRuntimeAndModule(document);
window.library = window.celine.library; /* @observablehq/stdlib */
window.Inputs = Inputs;
window.htl = htl;

registerScriptReevaluationOnBlur(document, /*class=*/"echo");
