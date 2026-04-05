import { CelineModule, registerScriptReevaluationOnBlur } from "../celine/mod.ts";
import * as Inputs from "@observablehq/inputs";
import * as htl from "htl";

const celine = CelineModule.usingNewObservableRuntimeAndModule(document);
const library = celine.library; /* @observablehq/stdlib */

window.celine = celine;
window.library = library;
window.Inputs = Inputs;
window.htl = htl;

/** Strip runtime-added `role` on `<a>` inside `<bh-cite>` (for doc example echo output). */
function stripBibhtmlCiteRole(root) {
  for (const a of root.querySelectorAll("bh-cite a[role]")) {
    a.removeAttribute("role");
  }
}
window.stripBibhtmlCiteRole = stripBibhtmlCiteRole;

registerScriptReevaluationOnBlur(document, /*class=*/"echo");

export {
  CelineModule,
  Inputs,
  celine,
  htl,
  library,
  registerScriptReevaluationOnBlur
};
