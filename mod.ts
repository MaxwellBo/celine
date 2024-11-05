// deno-lint-ignore-file ban-types

import { Inspector, Runtime } from "npm:@observablehq/runtime@5.9.9";
import * as stdlib from "npm:@observablehq/stdlib@5.8.8";

/**
 * For convenience, this module re-exports the Observable standard library.
 */
export const library: stdlib.Library = new stdlib.Library();

type ObserverVisibility = "hidden" | "visible";
type Definition = Function | object;
type Inputs = string[];

/**
 * A CelineModule is a wrapper around an Observable runtime, a derived Observable runtime module, and a document.
 * 
 * Its various cell constructors alter both the module and the document to create reactive cells.
 */
export class CelineModule {
  /**
   * The document object to create elements in.
   */
  public document: Document;

  /**
   * The Observable runtime module to define variables in.
   */
  public module: Runtime.Module;
  /**
   * @public
   * @type {stdlib.Library}
   * @description For convenience, this class re-exports the Observable standard library.
   */
  public library: stdlib.Library = library;

  /**
   * Creates a new CelineModule instance.
   * @param document - The document object to create elements in
   * @param module - The Observable runtime module to define variables in.
   */
  constructor(document: Document, module: Runtime.Module) {
    this.document = document;
    this.module = module;
  }

  /**
   * Creates a new CelineModule with a fresh Observable runtime.
   * @deprecated Use `usingNewObservableRuntimeAndModule` instead.
   * @param document - The document object to create elements in
   * @returns A new CelineModule instance
   */
  static usingNewObservableRuntime(document: Document): CelineModule {
    return CelineModule.usingNewObservableRuntimeAndModule(document);
  }

  /**
   * Creates a new CelineModule with a fresh Observable runtime and module.
   * @param document - The document object to create elements in
   * @returns A new CelineModule instance
   */
  static usingNewObservableRuntimeAndModule(document: Document): CelineModule {
    const runtime = new Runtime();
    const module = runtime.module();
    return new CelineModule(document, module);
  }

  /**
   * Creates a new CelineModule using an existing Observable module.
   * This is just an alias of the default constructor.
   * @param document - The document object to create elements in
   * @param module - The existing Observable runtime module to use
   * @returns A new CelineModule instance
   */
  static usingExistingObservableModule(
    document: Document,
    module: Runtime.Module
  ): CelineModule {
    return new CelineModule(document, module);
  }

  /**
   * Creates an Inspector for observing cell output.
   * @private
   * @param name - The name/id of the element to attach the observer to
   * @returns A new Inspector instance
   * @throws Error if no element with the specified id is found
   */
  private observer(name: string): Inspector {
    const div = this.document.createElement("div");
    const elementContainer = this.document.getElementById(name);

    if (!elementContainer) {
      throw new Error(`No element with id ${name} found.

        celine tried to find a DOM element with id="${name}" to attach an observer to because some cell with name "${name}" was declared,
        but it couldn't find one.

        Either:
        1) Annotate an element with id="${name}" in your HTML file. This is where the cell's current value will be displayed.
        2) Use celine.silent instead of celine.cell if you don't want to display the cell's current value anywhere.`);
    }

    elementContainer.parentNode!.insertBefore(div, elementContainer);
    return new Inspector(div);
  }

  /**
   * Declares a reactive cell that renders its value above its element container.
   * The cell can depend on other cells and its definition can return values of type
   * T, Promise<T>, Iterator<T>, or AsyncIterator<T>.
   * 
   * The element's id must match the name parameter.
   * 
   * @example
   * ```typescript
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
  public cell(name: string, inputs: Inputs, definition: Definition): void;
  public cell(name: string, definition: Definition): void;
  public cell(
    name: string,
    inputsOrDefinition: Inputs | Definition,
    maybeDefinition?: Definition
  ): void {
    this._cell("visible", name, inputsOrDefinition, maybeDefinition);
  }

  /**
   * Declares a cell that doesn't render a value above an element container.
   * Otherwise behaves the same as `cell()`.
   * 
   * @example
   * ```typescript
   * celine.silentCell("hidden", () => {
   *   return "This string does NOT render above any element";
   * });
   * ```
   */
  public silentCell(name: string, inputs: Inputs, definition: Definition): void;
  public silentCell(name: string, definition: Definition): void;
  public silentCell(
    name: string,
    inputsOrDefinition: Inputs | Definition,
    maybeDefinition?: Definition
  ): void {
    this._cell("hidden", name, inputsOrDefinition, maybeDefinition);
  }

  /**
   * Internal method for creating cells with specified visibility.
   * @private
   */
  private _cell(
    observerVisibility: ObserverVisibility,
    name: string,
    inputsOrDefinition: Inputs | Definition,
    maybeDefinition?: Definition
  ): void {
    const variable = this.module._scope.get(name) ||
      this.module.variable(observerVisibility === "visible" ? this.observer(name) : undefined);

    const inputs: Inputs = Array.isArray(inputsOrDefinition)
      ? inputsOrDefinition
      : [];
    const definition: Definition = Array.isArray(inputsOrDefinition)
      ? maybeDefinition as Definition
      : inputsOrDefinition;

    if (inputs && definition) {
      variable.define(name, inputs, definition);
    } else {
      variable.define(name, definition);
    }
  }
  
  /**
   * Renders a TeX string using the Observable stdlib.
   */
  public async tex(strings: TemplateStringsArray, ...values: any[]): Promise<object> {
    const tex = await library.tex();
    return tex(strings, ...values);
  }

  /**
   * Renders a Markdown string using the Observable stdlib.
   */
  public async md(strings: TemplateStringsArray, ...values: any[]): Promise<object> {
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
   * ```typescript
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
  public viewof(name: string, inputs: Inputs, definition: Definition): void;
  public viewof(name: string, definition: Definition): void;
  public viewof(
    name: string,
    inputsOrDefinition: Inputs | Definition,
    maybeDefinition?: Definition
  ): void {
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
      (inpt: any) => library.Generators.input(inpt)
    );
  }

  /**
   * Declares a cell and returns a reference that can be mutated.
   * Mutations propagate to cells that depend upon it.
   * 
   * @example
   * ```typescript
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
  public mutable<T>(name: string, value: T): typeof Mutable<T> {
    const m = Mutable(value);
    // @ts-ignore - some really scary stuff going on here
    this.cell(name, m);
    // @ts-ignore - some really scary stuff going on here
    return m;
  }

  /**
   * Like {@link mutable}, but doesn't render the value above the element container.
   */
  public silentMutable<T>(name: string, value: T): typeof Mutable<T> {
    const m = Mutable(value);
    // @ts-ignore - some really scary stuff going on here
    this.silentCell(name, m);
    // @ts-ignore - some really scary stuff going on here
    return m;
  }
}

/**
 * Creates a mutable value wrapper with Observable integration.
 * @template T - The type of the mutable value
 * @param value - The initial value
 * @returns A mutable object with getter/setter for the value
 */
function Mutable<T>(value: T): { value: T } {
  let change: (value: T) => void;
  return Object.defineProperty(
    library.Generators.observe((_: (value: T) => void) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x: T) => void change((value = x)),
    }
  ) as { value: T };
}

/**
 * 
 * @deprecated since 1.0.0 Use registerReevaluationOnBlur instead.
 */
export function reevaluateOnBlur(document: Document, className: string): void {
  console.warn("The reevaluateOnBlur function is deprecated. Use registerScriptReevaluationOnBlur instead.");
  registerScriptReevaluationOnBlur(document, className);
}

/**
 * Sets up automatic reevaluation of editable script elements on blur.
 * When a script element marked with the specified class loses focus,
 * it will be replaced with a new script element containing the updated content.
 * 
 * @param document - The document object containing the script elements
 * @param className - The class name of script elements to watch
 */
export function registerScriptReevaluationOnBlur(document: Document, className: string): void {
  function reevaluate(event: Event) {
    const old = event.target as HTMLScriptElement;
    const neww = document.createElement("script");
    neww.textContent = old.textContent;

    for (let i = 0; i < old.attributes.length; i++) {
      neww.setAttribute(old.attributes[i].name, old.attributes[i].value || "");
    }
    // register the blur listener again (given we've made a new script element)
    neww.addEventListener("blur", reevaluate);

    old.parentNode!.insertBefore(neww, old);
    old.parentNode!.removeChild(old);
  }

  document
    .querySelectorAll(`script.${className}[contenteditable='true']`)
    .forEach((script: Element) => {
      script.addEventListener("blur", reevaluate as EventListener);
    });
}