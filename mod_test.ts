import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { add } from "./mod.ts";

Deno.test(function addTest() {
  assertEquals(add(2, 3), 5);
});
