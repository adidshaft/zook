export function buildPublicQrData(origin: string, username: string, target: string | null) {
  if (target === "app") {
    return `zook://join/${username}`;
  }
  if (target === "join") {
    return new URL(`/join/${username}`, origin).toString();
  }
  return new URL(`/in/${username}?source=qr`, origin).toString();
}
