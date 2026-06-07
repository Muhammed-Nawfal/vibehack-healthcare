import type { MiraContext } from './api';

const CONTEXT_KEY = 'mira_context';

/** Persists the gestation/trust context so every later screen can read it. */
export function saveContext(context: MiraContext): void {
  sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

/** Reads the gestation/trust context, or null if the user hasn't set it yet. */
export function loadContext(): MiraContext | null {
  const raw = sessionStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MiraContext;
    if (
      typeof parsed.gestationWeeks === 'number' &&
      typeof parsed.isPostnatal === 'boolean' &&
      typeof parsed.trustId === 'string'
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearContext(): void {
  sessionStorage.removeItem(CONTEXT_KEY);
}
