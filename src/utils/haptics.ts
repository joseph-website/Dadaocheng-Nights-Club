/**
 * Haptic feedback utility for mobile web gaming
 * Safe against non-supporting browsers and desktop environments
 */

const canVibrate = (): boolean => {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

export const haptics = {
  /** Ultra-light tap for chip selection or tab click (8ms) */
  selection: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(8);
    } catch {
      // Ignore vibration error
    }
  },

  /** Light vibration for card deal, pinball launch, or roulette tick (15ms) */
  light: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(15);
    } catch {
      // Ignore vibration error
    }
  },

  /** Medium vibration for Blackjack Hit/Stand, Slot Spin, Dice Roll (30ms) */
  medium: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(30);
    } catch {
      // Ignore vibration error
    }
  },

  /** Strong vibration for claw drop, jackpot or high-stakes action (50ms) */
  heavy: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate(50);
    } catch {
      // Ignore vibration error
    }
  },

  /** Win / payout rhythm */
  success: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate([20, 40, 30, 40, 40]);
    } catch {
      // Ignore vibration error
    }
  },

  /** Warning or error rhythm */
  warning: () => {
    if (!canVibrate()) return;
    try {
      navigator.vibrate([30, 50, 30]);
    } catch {
      // Ignore vibration error
    }
  },

  /** Combined screen shake and haptic feedback for game impact / battle hits / jackpots */
  screenShake: (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    triggerScreenShake(intensity);
    if (intensity === 'heavy') {
      haptics.heavy();
    } else if (intensity === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
  },
};

/**
 * Dispatch screen shake custom event (light, medium, heavy)
 */
export const triggerScreenShake = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('casino_screen_shake', { detail: { intensity } }));
  } catch {
    // Ignore event dispatch errors
  }
};
