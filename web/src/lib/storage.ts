/** Safe localStorage write — returns false on quota / private mode errors. */
export function safeStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
