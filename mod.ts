// deno-lint-ignore-file ban-types

import { Inspector, Runtime } from "npm:@observablehq/runtime@5.9.9";
import * as stdlib from "npm:@observablehq/stdlib@5.8.8";

export const library: any = new stdlib.Library();

type CellVisibility = "hidden" | "visible";

export class CelineModule {
  public document: any;
  public module: any;

  constructor(document: any, module: any) {
    this.document = document;
    this.module = module;
  }

  static usingNewRuntime(document: any): CelineModule {
    const runtime = new Runtime();;
    const module = runtime.module();
    return new CelineModule(document, module);
  }

  private observer(name: string) {
    const div = this.document.createElement("div");
    const currentScript = this.document.getElementById(name);

    if (!currentScript) {
      throw new Error(`No script with id ${name} found`);
    }

    currentScript.parentNode.insertBefore(div, currentScript);
    return new Inspector(div);
  }

  public cell(name: string, inputs: string[], definition: Function): void;
  public cell(name: string, definition: Function): void;
  public cell(
    name: string,
    inputsOrDefinition: string[] | Function,
    maybeDefinition?: Function,
  ): void {
    this._cell("visible", name, inputsOrDefinition, maybeDefinition);
  }

  public hidden(name: string, inputs: string[], definition: Function): void;
  public hidden(name: string, definition: Function): void;
  public hidden(
    name: string,
    inputsOrDefinition: string[] | Function,
    maybeDefinition?: Function,
  ): void {
    this._cell("hidden", name, inputsOrDefinition, maybeDefinition);
  }

  private _cell(
    visible: CellVisibility,
    name: string,
    inputsOrDefinition: string[] | Function,
    maybeDefinition?: Function,
  ) {
    const variable = this.module._scope.get(name) ||
      this.module.variable(visible === "visible" ? this.observer(name) : undefined);

    const inputs: string[] = Array.isArray(inputsOrDefinition)
      ? inputsOrDefinition
      : [];
    const definition: Function = Array.isArray(inputsOrDefinition)
      ? maybeDefinition as Function
      : inputsOrDefinition;

    if (inputs && definition) {
      variable.define(name, inputs, definition);
    } else {
      variable.define(name, definition);
    }
  }

  public viewof(name: string, inputs: string[], definition: Function): void;
  public viewof(name: string, definition: Function): void;
  public viewof(
    name: string,
    inputsOrDefinition: string[] | Function,
    maybeDefinition?: Function,
  ): void {
    this._cell(
      "visible",
      `viewof ${name}`,
      inputsOrDefinition,
      maybeDefinition,
    );
    this._cell(
      "hidden",
      name,
      [`viewof ${name}`],
      (inpt: any) => library.Generators.input(inpt),
    );
  }

  public mutable<T>(name: string, value: T): typeof Mutable<T> {
    const m = Mutable(value);
    // @ts-ignore
    this.cell(name, m);
    // @ts-ignore
    return m;
  }
}

function Mutable<T>(value: T): Object
{
  let change: any;
  return Object.defineProperty(
    library.Generators.observe((_: any) => {
      change = _;
      if (value !== undefined) change(value);
    }),
    "value",
    {
      get: () => value,
      set: (x) => void change(value = x),
    },
  );
}

export function contenteditableEchoScriptsReevaluateOnBlur(document: any) {
  function reevaluate(event: any) {
    const old = event.target;
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

  document.querySelectorAll("script.echo[contenteditable='true']").forEach((script: any) => {
    script.addEventListener("blur", reevaluate as EventListener);
  });
}