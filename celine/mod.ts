import { Runtime } from "@observablehq/runtime";
import { Inspector } from "@observablehq/inspector";
import * as stdlib from "@observablehq/stdlib";

/**
 * For convenience, this module re-exports the Observable standard library.
 */
export const library: typeof stdlib.Library = new stdlib.Library();

export type ObserverVisibility = "hidden" | "visible";

// deno-lint-ignore no-explicit-any
export type Definition = ((...args: any[]) => any) | object;

export type Inputs = string[];

/**
 * A cell to import from a notebook.
 * - `"x"` — imports cell `"x"` with the same name.
 * - `{name: "x", alias: "y"}` — imports cell `"x"` as local `"y"`.
 * - `{name: "x", with: "local"}` — imports cell `"x"`, overriding it with local cell `"local"`.
 * - `{name: "x", alias: "y", with: "local"}` — imports cell `"x"` as local `"y"`, overriding it with local cell `"local"`.
 */
export type ImportSpecifier = string | { name: string; alias?: string; with?: string };

/**
 * A CelineModule is a wrapper around an Observable runtime, a derived Observable runtime module, and a document.
 * 
 * Its various cell constructors alter both the module and the document to create reactive cells.
 */
export class CelineModule {
  document: Document;

  // deno-lint-ignore no-explicit-any
  module: any;

  library = library;

  // deno-lint-ignore no-explicit-any
  constructor(document: Document, module: any) {
    this.document = document;
    this.module = module;
  }

  /**
   * @deprecated Use `usingNewObservableRuntimeAndModule` instead.
   */
  static usingNewObservableRuntime(document: Document): CelineModule {
    return CelineModule.usingNewObservableRuntimeAndModule(document);
  }

  static usingNewObservableRuntimeAndModule(document: Document): CelineModule {
    const runtime = new Runtime(library);
    runtime.fileAttachments = stdlib.FileAttachments;
    const module = runtime.module();
    return new CelineModule(document, module);
  }

  // deno-lint-ignore no-explicit-any
  static usingExistingObservableModule(document: Document, module: any): CelineModule {
    return new CelineModule(document, module);
  }

  private observer(name: string): Inspector {
    const elementContainer = this.document.querySelector(`[data-display="${name}"]`);

    if (!elementContainer) {
      throw new Error(`No element with data-display ${name} found.

        celine tried to find a DOM element with data-display="${name}" to attach an observer to because some cell with name "${name}" was declared,
        but it couldn't find one.

        Either:
        1) Annotate an element with data-display="${name}" in your HTML file. This is where the cell's current value will be displayed.
        2) Use celine.silentCell instead of celine.cell if you don't want to display the cell's current value anywhere.`);
    }

    // Saved notebooks include the previous inspector output in the HTML. When
    // reopening them, reuse that node instead of inserting a duplicate output.
    // Do not reuse `celine-syntax-error` hosts (script parse errors).
    const previousElement = elementContainer.previousElementSibling;
    const savedOutputElement = previousElement?.tagName === "DIV" &&
      previousElement.classList.contains("observablehq") &&
      !previousElement.classList.contains(CELINE_SYNTAX_ERROR_CLASS);

    const div = savedOutputElement
      ? previousElement as HTMLDivElement
      : this.document.createElement("div");

    if (!div.parentNode) {
      elementContainer.parentNode!.insertBefore(div, elementContainer);
    }

    const observer = new Inspector(div);
    const errorLoggingObserver = {
      pending: () => observer.pending?.(),
      fulfilled: (value: unknown) => observer.fulfilled?.(value),
      rejected: (error: unknown) => {
        console.error(`[celine] Cell "${name}" rejected`, error);
        observer.rejected?.(error);
      },
      _node: observer._node,
    };
    return errorLoggingObserver;
  }

  /**
   * Declares a reactive cell that renders its value above its data-display element.
   * The cell can depend on other cells and its definition can return values of type
   * T, Promise<T>, Iterator<T>, or AsyncIterator<T>.
   *
   * @example
   * ```javascript
   * // Counter that increments every second
   * celine.cell("counter", async function* () {
   *   let i = 0;
   *   while (true) {
   *     await library.Promises.delay(1000);
   *     yield i++;
   *   }
   * });
   * 
   * // FizzBuzz implementation depending on counter
   * celine.cell("fizzbuzz", ["counter"], (counter) => {
   *   if (counter % 15 === 0) return "FizzBuzz";
   *   if (counter % 3 === 0) return "Fizz";
   *   if (counter % 5 === 0) return "Buzz";
   *   return counter;
   * });
   * ```
   */
  cell(name: string, inputsOrDefinition: Inputs | Definition, maybeDefinition?: Definition) {
    this._cell("visible", name, inputsOrDefinition, maybeDefinition);
  }

  /**
   * Declares a cell that doesn't render a value above an element container.
   * Otherwise behaves the same as `cell()`.
   * 
   * @example
   * ```javascript
   * celine.silentCell("hidden", () => {
   *   return "This string does NOT render above any element";
   * });
   * ```
   */
  silentCell(name: string, inputsOrDefinition: Inputs | Definition, maybeDefinition?: Definition) {
    this._cell("hidden", name, inputsOrDefinition, maybeDefinition);
  }

  private _cell(observerVisibility: ObserverVisibility, name: string, inputsOrDefinition: Inputs | Definition, maybeDefinition?: Definition) {
    const existingVariable = this.module._scope.get(name);

    // https://github.com/observablehq/runtime/blob/622a1974087f03545b5e91c8625b46874e82e4df/src/variable.js#L11
    // Observable represents "no observer" with a private Symbol. 
    const variableHasNoObserver = existingVariable && typeof existingVariable._observer === 'symbol';
    const needsObserver = observerVisibility === "visible" && (!existingVariable || variableHasNoObserver);
    const observer = needsObserver
      ? this.observer(name)
      : undefined;
    const variable = existingVariable || this.module.variable(observer);
    const inputs: Inputs = Array.isArray(inputsOrDefinition) ? inputsOrDefinition : [];
    const definition: Definition = Array.isArray(inputsOrDefinition) ? maybeDefinition! : inputsOrDefinition;

    // If a cell was previously silent but is now visible, redefine it with a real observer.
    if (variableHasNoObserver && observer) {
      if (inputs && definition) {
        variable.redefine(name, inputs, definition);
      } else {
        variable.redefine(name, definition);
      }

      return;
    }

    if (inputs && definition) {
      variable.define(name, inputs, definition);
    } else {
      variable.define(name, definition);
    }
  }
  
  /**
   * Renders a TeX string using the Observable stdlib.
   */
  // deno-lint-ignore no-explicit-any
  async tex(strings: TemplateStringsArray, ...values: any[]): Promise<object> {
    const tex = await library.tex();
    return tex(strings, ...values);
  }

  /**
   * Renders a Markdown string using the Observable stdlib.
   */
  // deno-lint-ignore no-explicit-any
  async md(strings: TemplateStringsArray, ...values: any[]): Promise<object> {
    const md = await library.md();
    return md(strings, ...values);
  }

  /**
   * Special constructor designed to work with Observable Inputs. It declares two reactive cells:
   * - The "name" cell for the value
   * - The "viewof name" cell for the DOM element itself
   * 
   * For creating custom inputs, see the Observable "Synchronized Inputs" guide.
   * 
   * @example
   * ```javascript
   * // Text input with placeholder
   * celine.viewof("name", () => {
   *   return Inputs.text({placeholder: "What's your name?"});
   * });
   * 
   * // Greeting that depends on the name input
   * celine.cell("greeting", ["name"], (name) => {
   *   return `Hello, ${name}!`;
   * });
   * ```
   */
  viewof(name: string, inputsOrDefinition: Inputs | Definition, maybeDefinition?: Definition) {
    this._cell(
      "visible",
      `viewof ${name}`,
      inputsOrDefinition,
      maybeDefinition
    );
    this._cell(
      "hidden",
      name,
      [`viewof ${name}`],
      (inpt: unknown) => library.Generators.input(inpt)
    );
  }

  /**
   * Declares a cell and returns a reference that can be mutated.
   * Mutations propagate to cells that depend upon it.
   * 
   * @example
   * ```javascript
   * // Create a mutable reference
   * const ref = celine.mutable("ref", 3);
   * 
   * // Create buttons to manipulate the reference
   * celine.viewof("increment", () => {
   *   const increment = () => ++ref.value;
   *   const reset = () => ref.value = 0;
   *   return Inputs.button([["Increment", increment], ["Reset", reset]]);
   * });
   * 
   * // Display that depends on the reference
   * celine.cell("sword", ["ref"], (ref) => {
   *   return `↜(╰ •ω•)╯ |${'═'.repeat(ref)}═ﺤ`;
   * });
   * ```
   */
  mutable<T>(name: string, value: T): { value: T } {
    const m = Mutable(value);
    // @ts-ignore - some really scary stuff going on here
    this.cell(name, m);
    // @ts-ignore - some really scary stuff going on here
    return m;
  }

  /**
   * Like {@link mutable}, but doesn't render the value above the element container.
   */
  silentMutable<T>(name: string, value: T): { value: T } {
    const m = Mutable(value);
    // @ts-ignore - some really scary stuff going on here
    this.silentCell(name, m);
    // @ts-ignore - some really scary stuff going on here
    return m;
  }

  /**
   * Imports cells from an Observable notebook, mirroring Observable's
   * {@link https://observablehq.com/documentation/notebooks/imports import} syntax.
   *
   * Each entry in `cells` can be:
   * - **import**: `"x"` — imports cell `"x"`
   * - **import-as**: `{name: "x", alias: "y"}` — imports cell `"x"` as local `"y"`
   * - **import-with**: `{name: "x", with: "local"}` — imports cell `"x"`, overriding it with local cell `"local"`
   * - **import-as-with**: `{name: "x", alias: "y", with: "local"}` — imports cell `"x"` as local `"y"`, overriding it with local cell `"local"`
   *
   * @example
   * ```javascript
   * const nb = "https://observablehq.com/@mjbo/celine-celine-import-target";
   *
   * celine.import(nb, [
   *   "importMeUnchanged",
   *   {name: "renameMe", alias: "renamed"},
   *   {name: "overrideMe", with: "myOverride"},
   *   {name: "overrideAndRenameMe", alias: "renamedOverride", with: "myOverride"},
   * ]);
   * ```
   */
  import(source: string, cells: ImportSpecifier[]) {
    const runtime = this.module._runtime;
    const url = CelineModule._resolveNotebookUrl(source);

    const variables = cells.map(cell => {
      const localName = typeof cell === "string" ? cell : (cell.alias || cell.name);
      return this.module._scope.get(localName) || this.module.variable();
    });

    // deno-lint-ignore no-explicit-any
    import(url).then((m: any) => {
      let child = runtime.module(m.default);

      const overrides = cells
        .filter((cell): cell is { name: string; alias?: string; with: string } => typeof cell === "object" && !!cell.with)
        .map(cell => ({ name: cell.with, alias: cell.name }));

      if (overrides.length > 0) {
        child = child.derive(overrides, this.module);
      }

      cells.forEach((cell, i) => {
        const variable = variables[i];
        if (typeof cell === "string") {
          variable.import(cell, child);
        } else {
          const { name, alias } = cell;
          if (alias && alias !== name) {
            variable.import(name, alias, child);
          } else {
            variable.import(name, child);
          }
        }
      });
    });
  }

  private static _resolveNotebookUrl(source: string): string {
    if (source.startsWith("https://observablehq.com/")) {
      const path = source.slice("https://observablehq.com".length);
      return `https://api.observablehq.com${path}.js?v=4`;
    }
    if (source.startsWith("https://api.observablehq.com/")) {
      const url = new URL(source);
      if (url.searchParams.get("v") !== "4") {
        throw new Error(`Only v=4 Observable API URLs are supported. Got: ${source}`);
      }
      return source;
    }
    throw new Error(`Unsupported notebook URL. Expected https://observablehq.com/... or https://api.observablehq.com/...?v=4. Got: ${source}`);
  }
}

/**
 * Creates a mutable value wrapper with Observable integration.
 */
function Mutable<T>(value: T): { value: T } {
  // deno-lint-ignore no-explicit-any
  let change: any;
  return Object.defineProperty(
    // deno-lint-ignore no-explicit-any
    library.Generators.observe((_: any) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x: T) => void change((value = x)),
    }
  );
}

/**
 * Re-runs editable scripts when they lose focus, and attaches the same behavior to
 * matching scripts added to the document later.
 *
 * @param document The document to search (usually `globalThis.document`).
 * @param className Scripts must match `script.{className}[contenteditable]`.
 */
export function registerScriptReevaluationOnBlur(document: Document, className: string) {
  const selector = `script.${className}[contenteditable='true']`;
  const registered = new WeakSet<Element>();

  function register(script: Element) {
    if (registered.has(script)) return;
    script.addEventListener("blur", reevaluate as EventListener);
    registered.add(script);
  }

  function registerElementAndDescendants(element: Element) {
    if (element.matches(selector)) register(element);
    element.querySelectorAll(selector).forEach(register);
  }

  async function reevaluate(event: Event) {
    const old = event.target as HTMLScriptElement;
    const syntaxErrorDetected = await isSyntaxValid(old);

    if (syntaxErrorDetected) {
      showSyntaxError(document, old, syntaxErrorDetected);
      return;
    }

    const neww = document.createElement("script");
    neww.textContent = old.textContent;

    for (let i = 0; i < old.attributes.length; i++) {
      neww.setAttribute(old.attributes[i].name, old.attributes[i].value || "");
    }
    register(neww);

    old.parentNode!.insertBefore(neww, old);
    old.parentNode!.removeChild(old);
    clearSyntaxError(neww);
  }

  document.querySelectorAll(selector).forEach(register);

  // New nodes may appear after load (e.g. notebook or live-edited markup).
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) registerElementAndDescendants(node);
        });
      } else if (mutation.type === "attributes" && mutation.target instanceof Element) {
        registerElementAndDescendants(mutation.target);
      }
    }
  }).observe(document, {
    attributes: true,
    attributeFilter: ["class", "contenteditable"],
    childList: true,
    subtree: true,
  });
}

const CELINE_SYNTAX_ERROR_CLASS = "celine-syntax-error";

function showSyntaxError(doc: Document, script: HTMLScriptElement, error: unknown) {
  // Not the cell inspector root: dedicated host so saved notebooks / cell output reuse stays separate.
  const previousElement = script.previousElementSibling;
  const reuse = previousElement?.tagName === "DIV" &&
    previousElement.classList.contains(CELINE_SYNTAX_ERROR_CLASS);

  const host = reuse
    ? previousElement as HTMLDivElement
    : doc.createElement("div");

  if (!reuse) {
    host.classList.add(CELINE_SYNTAX_ERROR_CLASS);
  }

  if (!host.parentNode) {
    script.parentNode!.insertBefore(host, script);
  }

  new Inspector(host).rejected?.(error);
  console.error("[celine] Syntax error", error);
}

// One syntax-error host per editable script: previousElementSibling, class celine-syntax-error.
function clearSyntaxError(script: Element | null): void {
  const prev = script?.previousElementSibling;
  if (prev?.classList.contains(CELINE_SYNTAX_ERROR_CLASS)) {
    prev.remove();
  }
}


async function isSyntaxValid(script: HTMLScriptElement): Promise<unknown | null> {
  if (script.type.toLowerCase() !== "module") return null;

  const source = script.textContent ?? "";
  const sentinelLine = source.split("\n").length + 2;
  const sentinel = "#CELINE_SENTINEL_SYNTAX_ERROR";
  const blob = new Blob([`${source}\n\n${sentinel}`], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    await import(url);
    return new Error("Module syntax check unexpectedly evaluated.");
  } catch (error) {
    const lineNumber = typeof (error as { lineNumber?: unknown })?.lineNumber === "number"
      ? (error as { lineNumber: number }).lineNumber
      : undefined;

    const text = error instanceof Error
      ? `${error.message}\n${error.stack ?? ""}`
      : String(error);

    const stoppedAtSentinel = lineNumber === sentinelLine ||
      text.includes(sentinel) ||
      text.includes(`${url}:${sentinelLine}:`) ||
      text.includes(`${url}:${sentinelLine}`) ||
      text.includes(`:${sentinelLine}:`);

    return stoppedAtSentinel ? null : error;
  } finally {
    URL.revokeObjectURL(url);
  }
}

