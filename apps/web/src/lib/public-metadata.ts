import { getOrigins } from "./origins";

export function publicAbsoluteUrl(path: string) {
  return new URL(path, getOrigins().public).toString();
}

export function publicSocialImage(path = "/icons/icon-512.png") {
  return publicAbsoluteUrl(path);
}
