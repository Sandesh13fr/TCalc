import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "./lib/config.js";
import { formatOutput, validateInput } from "./lib/utils.js";

export async function main() {
  const config = await loadConfig();
  const data = await readFile(resolve(config.inputPath), "utf-8");
  const parsed = JSON.parse(data);
  if (!validateInput(parsed)) {
    throw new Error("Invalid input");
  }
  return formatOutput(parsed);
}

export function greet(name) {
  return `Hello, ${name}!`;
}

export function add(a, b) {
  return a + b;
}

export function isEven(n) {
  return n % 2 === 0;
}

export function multiply(a, b) {
  return a * b;
}
