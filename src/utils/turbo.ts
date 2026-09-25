export const TURBO_STORAGE_KEY = 'casino_turbo_mode_v1';

export function isTurboMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TURBO_STORAGE_KEY) === 'true';
}

export function setTurboMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TURBO_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('casino_turbo_change', { detail: { enabled } }));
  window.dispatchEvent(new CustomEvent('casino_turbo_mode_updated', { detail: enabled }));
}
