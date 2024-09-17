// celine.ts

import { Runtime, Inspector } from "https://esm.run/@observablehq/runtime";
import * as stdlib from 'https://esm.run/@observablehq/stdlib';

const library = new stdlib.Library();
const runtime = new Runtime();
const module = runtime.module();

export function cell(name: string, inputsOrDefinition: string[] | Function, maybeDefinition?: Function, observe: boolean = true) {
  const variable = module._scope.get(name) || module.variable(observe ? observer(name) : undefined);

  if (maybeDefinition) {
    const inputs = inputsOrDefinition as string[];
    const definition = maybeDefinition;
    variable.define(name, inputs, definition);
  } else {
    const definition = inputsOrDefinition as Function;
    variable.define(name, definition);
  }
}

function observer(name: string) {
  const div = document.createElement("div");
  const currentScript = document.getElementById(name);
  currentScript?.parentNode?.insertBefore(div, currentScript);
  return new Inspector(div);
}

export function viewof(name: string, inputsOrDefinition: string[] | Function, maybeDefinition?: Function) {
  cell(`viewof ${name}`, inputsOrDefinition, maybeDefinition);
  cell(name, [`viewof ${name}`], (inpt: any) => library.Generators.input(inpt), false);
}

class Mutable<T> {
  private _value: T;
  private change: ((value: T) => void) | undefined;

  constructor(initialValue: T) {
    this._value = initialValue;
    Object.defineProperty(this, "value", {
      get: () => this._value,
      set: (x: T) => { if (this.change) this.change(this._value = x); }
    });
  }

  *[Symbol.iterator]() {
    yield* library.Generators.observe((change) => {
      this.change = change;
      if (this._value !== undefined) change(this._value);
    });
  }
}

export function mutable<T>(name: string, value: T): Mutable<T> {
  const m = new Mutable(value);
  cell(name, m);
  return m;
}

export function reevaluate(event: FocusEvent) {
  const old = event.target as HTMLScriptElement;
  const newScript = document.createElement('script');
  newScript.textContent = old.textContent;
  
  for (let i = 0; i < old.attributes.length; i++) {
    newScript.setAttribute(old.attributes[i].name, old.attributes[i].value || '');
  }
  newScript.addEventListener('blur', reevaluate as EventListener);
  
  old.parentNode?.insertBefore(newScript, old);
  old.parentNode?.removeChild(old);
}

// Helper function to initialize contenteditable scripts
export function initContentEditableScripts() {
  document.querySelectorAll('script.echo').forEach((script) => {
    script.addEventListener('blur', reevaluate as EventListener);
  });
}

// Export library for convenience
export { library };

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  console.log("Add 2 + 3 =", add(2, 3));
}
