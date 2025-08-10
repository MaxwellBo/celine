import { Runtime } from "npm:@observablehq/runtime@6.0.0";
import { Inspector } from "npm:@observablehq/inspector@5.0.1";
import * as stdlib from "npm:@observablehq/stdlib@5.8.8";
import * as kit from "npm:@observablehq/notebook-kit@1.0.1"


/**
 * For convenience, this module re-exports the Observable standard library.
 * @type {stdlib.Library}
 */
export const library = new stdlib.Library();

/**
 * @typedef {"hidden" | "visible"} ObserverVisibility
 */

/**
 * @typedef {Function | object} Definition
 */

/**
 * @typedef {string[]} Inputs
 */

/**
 * A CelineModule is a wrapper around an Observable runtime, a derived Observable runtime module, and a document.
 * 
 * Its various cell constructors alter both the module and the document to create reactive cells.
 */
export class CelineModule {
  /**
   * The document object to create elements in.
   * @type {Document}
   */
  document;

  /**
   * The Observable runtime module to define variables in.
   * @type {Runtime.Module}
   */
  module;

  /**
   * For convenience, this class re-exports the Observable standard library.
   * @type {stdlib.Library}
   */
  library = library;

  /**
   * Creates a new CelineModule instance.
   * @param {Document} document - The document object to create elements in
   * @param {Runtime.Module} module - The Observable runtime module to define variables in.
   */
  constructor(document, module) {
    this.document = document;
    this.module = module;
  }

  /**
   * Creates a new CelineModule with a fresh Observable runtime.
   * @deprecated Use `usingNewObservableRuntimeAndModule` instead.
   * @param {Document} document - The document object to create elements in
   * @returns {CelineModule} A new CelineModule instance
   */
  static usingNewObservableRuntime(document) {
    return CelineModule.usingNewObservableRuntimeAndModule(document);
  }

  /**
   * Creates a new CelineModule with a fresh Observable runtime and module.
   * @param {Document} document - The document object to create elements in
   * @returns {CelineModule} A new CelineModule instance
   */
  static usingNewObservableRuntimeAndModule(document) {
    const runtime = new Runtime();
    const module = runtime.module();
    return new CelineModule(document, module);
  }

  /**
   * Creates a new CelineModule using an existing Observable module.
   * This is just an alias of the default constructor.
   * @param {Document} document - The document object to create elements in
   * @param {Runtime.Module} module - The existing Observable runtime module to use
   * @returns {CelineModule} A new CelineModule instance
   */
  static usingExistingObservableModule(document, module) {
    return new CelineModule(document, module);
  }

  /**
   * Creates an Inspector for observing cell output.
   * @private
   * @param {string} name - The data-display attribute of the element to attach an observer to
   * @returns {Inspector} A new Inspector instance
   * @throws {Error} Error if no element with a data-display attribute is found
   */
  observeId(name) {
    const div = this.document.createElement("div");
    const elementContainer = this.document.getElementById(name);

    if (!elementContainer) {
      throw new Error(`No element with id ${name} found.

        celine tried to find a DOM element with id="${name}" to attach an observer to because some cell with name "${name}" was declared,
        but it couldn't find one.

        Either:
        1) Annotate an element with id="${name}" in your HTML file. This is where the cell's current value will be displayed.
        2) Use celine.silentCell instead of celine.cell if you don't want to display the cell's current value anywhere.`);
    }


    elementContainer.parentNode.insertBefore(div, elementContainer);
    return new Inspector(div);
  }

  /**
   * Creates an Inspector for observing cell output.
   * @private
   * @param {string} name - The data-display attribute of the element to attach an observer to
   * @returns {Inspector} A new Inspector instance
   * @throws {Error} Error if no element with a data-display attribute is found
   */
  observer(name) {
    const div = this.document.createElement("div");
    const elementContainer = this.document.querySelector(`[data-display="${name}"]`);

    if (!elementContainer) {
      throw new Error(`No element with data-display ${name} found.

        celine tried to find a DOM element with data-display="${name}" to attach an observer to because some cell with name "${name}" was declared,
        but it couldn't find one.

        Either:
        1) Annotate an element with data-display="${name}" in your HTML file. This is where the cell's current value will be displayed.
        2) Use celine.silentCell instead of celine.cell if you don't want to display the cell's current value anywhere.`);
    }


    elementContainer.parentNode.insertBefore(div, elementContainer);
    return new Inspector(div);
  }

    async registerN2Handlers(document) {
      const md = await library.md();
      const tex = await library.tex();
      const Plot = await library.Plot();
      const lodash = await library._();
      const d3 = await library.d3();
      const html = await library.html();
      const dot = await library.dot();
      console.log(dot)
      this.module.builtin("md", md);
      this.module.builtin("tex", tex);
      this.module.builtin("Plot", Plot);
      this.module.builtin("_", lodash);
      this.module.builtin("d3", d3);
      this.module.builtin("html", html);
      this.module.builtin("dot", dot);

      const scriptTypes = [
        'text/markdown',
        'text/html', 
        'application/sql',
        'application/x-tex',
        'text/vnd.graphviz',
        'application/vnd.observable.javascript'
      ];

      const typeMapping = {
        "module": "js",
        'text/markdown': 'md',
        'text/html': 'html',
        'application/sql': 'sql',
        'application/x-tex': 'tex',
        'text/vnd.graphviz': 'dot',
        'application/vnd.observable.javascript': 'ojs'
      };

      for (const type of scriptTypes) {
        const scripts = document.querySelectorAll(`script[type="${type}"]`);
        for (const script of scripts) {
          const tjs = kit.transpile(script.textContent.trim(), typeMapping[type]);

          console.log(tjs)

          if (tjs.automutable) {
            console.error("NOT SUPPORTED")
            continue
          }


          const observer = this.observeId(script.id);

            // Register a blur handler that retranspiles and uses redefine
          script.addEventListener("blur", () => {
            console.log("Reevaluating script", script.id, type);
            const tjsNew = kit.transpile(script.textContent.trim(), typeMapping[type]);
            const name = tjsNew.output?.replace(" ", "$") ?? script.id;
            const expression = `((${tjsNew.body}))`;

            const old = this.module._scope.get(name);

            console.log(old)
            old.redefine(
              name,
              tjsNew.inputs,
              eval(expression)
            );
            });

          const name = tjs.output?.replace(" ", "$") ?? script.id;
          const expression = `((${tjs.body}))`;

          this.module.variable(observer).define(
            name,
            tjs.inputs,
            eval(expression));
        }
      }
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
   * @param {string} name - The name of the cell
   * @param {Inputs | Definition} inputsOrDefinition - Either array of input dependencies or the definition function
   * @param {Definition} [maybeDefinition] - The definition function (when inputs are provided)
   */
  cell(name, inputsOrDefinition, maybeDefinition) {
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
   * @param {string} name - The name of the cell
   * @param {Inputs | Definition} inputsOrDefinition - Either array of input dependencies or the definition function
   * @param {Definition} [maybeDefinition] - The definition function (when inputs are provided)
   */
  silentCell(name, inputsOrDefinition, maybeDefinition) {
    this._cell("hidden", name, inputsOrDefinition, maybeDefinition);
  }

  /**
   * Internal method for creating cells with specified visibility.
   * @private
   * @param {ObserverVisibility} observerVisibility - Whether the cell should be visible or hidden
   * @param {string} name - The name of the cell
   * @param {Inputs | Definition} inputsOrDefinition - Either array of input dependencies or the definition function
   * @param {Definition} [maybeDefinition] - The definition function (when inputs are provided)
   */
  _cell(observerVisibility, name, inputsOrDefinition, maybeDefinition) {
    const observer = observerVisibility === "visible" ? this.observer(name) : undefined;
    const variable = this.module._scope.get(name) || this.module.variable(observer);

    /** @type {Inputs} */
    const inputs = Array.isArray(inputsOrDefinition) ? inputsOrDefinition : [];
    /** @type {Definition} */
    const definition = Array.isArray(inputsOrDefinition) ? maybeDefinition : inputsOrDefinition;

    // https://github.com/observablehq/runtime/blob/622a1974087f03545b5e91c8625b46874e82e4df/src/variable.js#L11
    // if a variable's observer is a symbol, it means it's a Symbol("no-observer")
    // that means we need to redefine it
    if (typeof variable._observer === 'symbol' && observer) {
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
   * @param {TemplateStringsArray} strings - The template string array
   * @param {...any} values - Values to interpolate
   * @returns {Promise<object>} The rendered TeX object
   */
  async tex(strings, ...values) {
    const tex = await library.tex();
    return tex(strings, ...values);
  }

  /**
   * Renders a Markdown string using the Observable stdlib.
   * @param {TemplateStringsArray} strings - The template string array
   * @param {...any} values - Values to interpolate
   * @returns {Promise<object>} The rendered Markdown object
   */
  async md(strings, ...values) {
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
   * @param {string} name - The name of the viewof cell
   * @param {Inputs | Definition} inputsOrDefinition - Either array of input dependencies or the definition function
   * @param {Definition} [maybeDefinition] - The definition function (when inputs are provided)
   */
  viewof(name, inputsOrDefinition, maybeDefinition) {
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
      (inpt) => library.Generators.input(inpt)
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
   * @template T
   * @param {string} name - The name of the mutable cell
   * @param {T} value - The initial value
   * @returns {{ value: T }} A mutable object with getter/setter for the value
   */
  mutable(name, value) {
    const m = Mutable(value);
    // @ts-ignore - some really scary stuff going on here
    this.cell(name, m);
    // @ts-ignore - some really scary stuff going on here
    return m;
  }

  /**
   * Like {@link mutable}, but doesn't render the value above the element container.
   * @template T
   * @param {string} name - The name of the mutable cell
   * @param {T} value - The initial value
   * @returns {{ value: T }} A mutable object with getter/setter for the value
   */
  silentMutable(name, value) {
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
 * @param {T} value - The initial value
 * @returns {{ value: T }} A mutable object with getter/setter for the value
 */
function Mutable(value) {
  let change;
  return Object.defineProperty(
    library.Generators.observe((_) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x) => void change((value = x)),
    }
  );
}

/**
 * @deprecated since 1.0.0 Use registerReevaluationOnBlur instead.
 * @param {Document} document - The document object
 * @param {string} className - The class name of script elements to watch
 */
export function reevaluateOnBlur(document, className) {
  console.warn("The reevaluateOnBlur function is deprecated. Use registerScriptReevaluationOnBlur instead.");
  registerScriptReevaluationOnBlur(document, className);
}

/**
 * Sets up automatic reevaluation of editable script elements on blur.
 * When a script element marked with the specified class loses focus,
 * it will be replaced with a new script element containing the updated content.
 * 
 * @param {Document} document - The document object containing the script elements
 * @param {string} className - The class name of script elements to watch
 */
export function registerScriptReevaluationOnBlur(document, className) {
  /**
   * @param {Event} event - The blur event
   */
  function reevaluate(event) {
    const old = /** @type {HTMLScriptElement} */ (event.target);
    const neww = document.createElement("script");
    neww.textContent = old.textContent;

    for (let i = 0; i < old.attributes.length; i++) {
      neww.setAttribute(old.attributes[i].name, old.attributes[i].value || "");
    }
    // register the blur listener again (given we've made a new script element)
    neww.addEventListener("blur", reevaluate);

    old.parentNode.insertBefore(neww, old);
    old.parentNode.removeChild(old);
  }

  document
    .querySelectorAll(`script.${className}[contenteditable='true']`)
    .forEach((script) => {
      script.addEventListener("blur", /** @type {EventListener} */ (reevaluate));
    });
}
