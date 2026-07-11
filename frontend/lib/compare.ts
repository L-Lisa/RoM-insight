/**
 * Jämförelsevalet: delas mellan alla sidor via localStorage + ett fönsterevent.
 * Nyckelformat: "leverantör|område" — samma som /jamfor?keys=. Max 6 (K2/K8).
 * Endast klientkomponenter importerar detta.
 */

const STORAGE_KEY = "rominsight-compare";
const CHANGE_EVENT = "rominsight-compare-changed";
export const MAX_COMPARE = 6;

export function getCompare(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function setCompare(keys: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_COMPARE)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Växlar ett avtal. Returnerar "added" | "removed" | "full". */
export function toggleCompare(key: string): "added" | "removed" | "full" {
  const current = getCompare();
  if (current.includes(key)) {
    setCompare(current.filter((k) => k !== key));
    return "removed";
  }
  if (current.length >= MAX_COMPARE) return "full";
  setCompare([...current, key]);
  return "added";
}

export function subscribeCompare(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
