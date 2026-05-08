import { createHash } from "node:crypto";

export function privateUserHandle(userId: string) {
  const digest = createHash("sha256").update(`zook-private-user:${userId}`).digest("hex");
  return `ZF-${digest.slice(0, 6).toUpperCase()}`;
}
