// Auto-Save Storage Notification Utility
let isInitialized = false;

export function initStorageNotifier() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  try {
    const originalSetItem = window.localStorage.setItem;
    const originalRemoveItem = window.localStorage.removeItem;

    window.localStorage.setItem = function (key: string, value: string) {
      originalSetItem.apply(this, [key, value]);
      // Defer event dispatch to avoid updating parent/other components during React render phases
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('casino-storage-saved', { detail: { key, action: 'set' } }));
        }
      }, 0);
    };

    window.localStorage.removeItem = function (key: string) {
      originalRemoveItem.apply(this, [key]);
      // Defer event dispatch to avoid updating parent/other components during React render phases
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('casino-storage-saved', { detail: { key, action: 'remove' } }));
        }
      }, 0);
    };
  } catch (e) {
    console.warn('Storage notifier initialization warning:', e);
  }
}

export function notifyStorageSaved(key?: string) {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('casino-storage-saved', { detail: { key } }));
    }, 0);
  }
}

