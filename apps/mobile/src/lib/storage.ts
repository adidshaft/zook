import * as SecureStore from "expo-secure-store";

const inMemoryStorage = new Map<string, string>();
const SECURE_STORE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

export type PhoneRevealScope = "owner" | "reception";

function storageKey(key: string) {
  if (SECURE_STORE_KEY_PATTERN.test(key)) {
    return key;
  }
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

export function phoneRevealStorageKey(scope: PhoneRevealScope, orgId?: string | null) {
  return `zook_revealed_${scope}_phones_${orgId ?? "none"}`;
}

export async function secureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync()
  } catch {
    return false
  }
}

export async function getStoredValue(key: string) {
  const normalizedKey = storageKey(key);
  if (await secureStoreAvailable()) {
    return SecureStore.getItemAsync(normalizedKey)
  }
  return inMemoryStorage.get(normalizedKey) ?? null
}

export async function setStoredValue(key: string, value: string) {
  const normalizedKey = storageKey(key);
  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(normalizedKey, value)
    return
  }
  inMemoryStorage.set(normalizedKey, value)
}

export async function deleteStoredValue(key: string) {
  const normalizedKey = storageKey(key);
  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(normalizedKey)
    return
  }
  inMemoryStorage.delete(normalizedKey)
}
