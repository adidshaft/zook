function numericParts(version: string) {
  return version
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

export function compareAppVersions(current: string, minimum: string) {
  const currentParts = numericParts(current);
  const minimumParts = numericParts(minimum);
  const length = Math.max(currentParts.length, minimumParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (currentPart < minimumPart) return -1;
    if (currentPart > minimumPart) return 1;
  }
  return 0;
}
