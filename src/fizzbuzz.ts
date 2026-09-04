export function fizzbuzz(
  start: number,
  end: number,
  rules: Record<number, string>,
): (number | string)[] {
  const divisors = Object.keys(rules)
    .map(Number)
    .sort((a, b) => a - b);

  const result: (number | string)[] = [];
  for (let n = start; n <= end; n++) {
    const word = divisors
      .filter((divisor) => n % divisor === 0)
      .map((divisor) => rules[divisor])
      .join("");
    result.push(word === "" ? n : word);
  }
  return result;
}
