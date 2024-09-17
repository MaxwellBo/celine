import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertEquals, assertExists } from "https://deno.land/std/testing/asserts.ts";
import { JSDOM } from "https://jspm.dev/jsdom";
import { cell, viewof, mutable, reevaluate, initContentEditableScripts } from "./mod.ts";

// Mock DOM environment
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
global.document = dom.window.document;
global.window = dom.window as any;

Deno.test("cell function creates a variable", () => {
  cell("testCell", () => 42);
  const testCell = (window as any).testCell;
  assertExists(testCell);
  assertEquals(testCell, 42);
});

Deno.test("viewof function creates two cells", () => {
  viewof("testViewof", () => ({ value: 10 }));
  const testViewof = (window as any).testViewof;
  const viewofTestViewof = (window as any)["viewof testViewof"];
  assertExists(testViewof);
  assertExists(viewofTestViewof);
  assertEquals(testViewof, 10);
});

Deno.test("mutable function creates a mutable cell", () => {
  const testMutable = mutable("testMutable", 5);
  assertEquals(testMutable.value, 5);
  testMutable.value = 10;
  assertEquals(testMutable.value, 10);
});

Deno.test("reevaluate function replaces script element", () => {
  const script = document.createElement("script");
  script.textContent = "console.log('test')";
  document.body.appendChild(script);

  const event = new FocusEvent("blur", { target: script });
  reevaluate(event);

  assertEquals(document.body.children.length, 1);
  assertEquals(document.body.children[0].tagName, "SCRIPT");
  assertEquals(document.body.children[0].textContent, "console.log('test')");
});

Deno.test("initContentEditableScripts adds event listeners", () => {
  const script = document.createElement("script");
  script.className = "echo";
  document.body.appendChild(script);

  initContentEditableScripts();

  // Check if the event listener was added (this is a bit hacky, but works for testing purposes)
  assertEquals(typeof (script as any).onblur, "function");
});