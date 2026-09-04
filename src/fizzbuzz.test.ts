import { describe, expect, it } from "vitest";
import { fizzbuzz } from "./fizzbuzz";

describe("fizzbuzz", () => {
  it("returns the number itself when no rule matches", () => {
    expect(fizzbuzz(1, 2, {})).toEqual([1, 2]);
  });

  it("replaces a number with the rule's word when its divisor matches", () => {
    expect(fizzbuzz(1, 3, { 3: "Fizz" })).toEqual([1, 2, "Fizz"]);
  });

  it("concatenates words, in ascending divisor order, when multiple rules match", () => {
    expect(fizzbuzz(1, 15, { 3: "Fizz", 5: "Buzz" })).toEqual([
      1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz",
      11, "Fizz", 13, 14, "FizzBuzz",
    ]);
  });

  it("returns an empty array when start is after end", () => {
    expect(fizzbuzz(5, 1, { 3: "Fizz" })).toEqual([]);
  });
});
