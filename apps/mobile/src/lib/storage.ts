import * as SecureStore from "expo-secure-store";

const inMemoryStorage = new Map<string, string>();

export async function secureStoreAvailable() {
  try {
    return await SecureStore.isAvailableAsync()
  } catch {
    return false
  }
}

export async function getStoredValue(key: string) {
  if (await secureStoreAvailable()) {
    return SecureStore.getItemAsync(key)
  }
  return inMemoryStorage.get(key) ?? null
}

export async function setStoredValue(key: string, value: string) {
  if (await secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  inMemoryStorage.set(key, value)
}

export async function deleteStoredValue(key: string) {
  if (await secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key)
    return
  }
  inMemoryStorage.delete(key)
}
