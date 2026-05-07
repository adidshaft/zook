export function compactLastValues<T>(values: T[], nextValue: T, max = 5) {
  return [nextValue, ...values.filter((value) => JSON.stringify(value) !== JSON.stringify(nextValue))].slice(
    0,
    max,
  );
}
