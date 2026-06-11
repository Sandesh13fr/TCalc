import { describe, it, expect } from "vitest";
import { greet, add, isEven, multiply } from "../index.js";

describe("small-app", () => {
  it("greet returns correct string", () => {
    expect(greet("World")).toBe("Hello, World!");
  });

  it("add returns sum", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("isEven detects even numbers", () => {
    expect(isEven(4)).toBe(true);
    expect(isEven(5)).toBe(false);
  });

  it("multiply returns product", () => {
    expect(multiply(3, 4)).toBe(12);
  });
});
