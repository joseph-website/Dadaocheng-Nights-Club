/**
 * Casino Toast Aura (敬酒幸運光環) Utility
 * Manages the global lucky buff granted when treating NPCs to drinks.
 * 
 * Functions of the Toast Aura:
 * 1. 莊家幸運加碼 (House Bonus):
 *    - 當玩家在持有光環效果時獲勝，莊家有機率 (30%) 額外加碼給玩家。
 *    - 加碼金為 $300 ~ $1,000 不等，加碼金額用抽的（金額越高機率越低）。
 *    - 但當局累計下注金額超過 $8,000 時，固定加碼 $1,000！
 * 2. VIP Acclaim: Active NPCs cheer and react more favorably; golden visual aura displays on avatar & status bar.
 * 3. 珍品取得機制：蒐藏品取得條件維持原樣，必須滿足該賭桌各自的隱藏規則。
 */

import { useState, useEffect } from 'react';
import { sound } from './audio';
import { toastService } from './toast';

const STORAGE_KEY_AURA = 'casino_toast_aura_expire_time_v1';
const MAX_AURA_SECONDS = 300; // Cap at 5 minutes

export interface HouseBonusResult {
  triggered: boolean;
  bonusAmount: number;
  isHighRollerFixed: boolean;
}

/**
 * Weighted draw for bonus amount between 300 and 1000:
 * Amounts: 300, 400, 500, 600, 700, 800, 900, 1000
 * Strictly adheres to: higher amounts have lower probabilities.
 */
export function drawRandomBonusAmount(): number {
  const tiers = [
    { amount: 300, weight: 32 },
    { amount: 400, weight: 22 },
    { amount: 500, weight: 17 },
    { amount: 600, weight: 12 },
    { amount: 700, weight: 8 },
    { amount: 800, weight: 5 },
    { amount: 900, weight: 2.8 },
    { amount: 1000, weight: 1.2 },
  ];
  const totalWeight = tiers.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const tier of tiers) {
    if (roll < tier.weight) {
      return tier.amount;
    }
    roll -= tier.weight;
  }
  return 300;
}

/**
 * Check and calculate dealer / house bonus (莊家加碼) on a round win.
 * 
 * Rules:
 * 1. Requires active aura (`isAuraActive()`).
 * 2. 30% chance to trigger (`Math.random() * 100 < 30`).
 * 3. If total cumulative bet of this round exceeds 8000 -> fixed bonus of 1000.
 * 4. Otherwise -> drawn randomly between 300 and 1000 (higher amounts have lower probabilities).
 * 
 * @param roundTotalBet The total cumulative bet amount placed by the player in this round.
 * @returns HouseBonusResult
 */
export function checkHouseBonus(roundTotalBet: number): HouseBonusResult {
  if (!isAuraActive()) {
    return { triggered: false, bonusAmount: 0, isHighRollerFixed: false };
  }

  // 30% chance to trigger
  const roll = Math.random() * 100;
  if (roll >= 30) {
    return { triggered: false, bonusAmount: 0, isHighRollerFixed: false };
  }

  // If cumulative bet of this round exceeds 8000 -> fixed 1000
  if (roundTotalBet > 8000) {
    return {
      triggered: true,
      bonusAmount: 1000,
      isHighRollerFixed: true,
    };
  }

  // Otherwise, draw randomly (higher amount has lower probability)
  const bonus = drawRandomBonusAmount();
  return {
    triggered: true,
    bonusAmount: bonus,
    isHighRollerFixed: false,
  };
}

/**
 * Plays celebratory sound and displays exciting Toast notification when house bonus is granted.
 */
export function notifyHouseBonus(bonus: HouseBonusResult, gameName: string): void {
  if (!bonus.triggered) return;
  sound.playCoinPayout();
  const bonusStr = bonus.bonusAmount.toLocaleString();
  const title = `🎰 敬酒光環・莊家加碼`;
  const desc = bonus.isHighRollerFixed
    ? `【${gameName}】莊家敬重您的豪賭氣魄！當局下注超過 $8,000，固定加碼頂額 +$${bonusStr} 籌碼！`
    : `【${gameName}】莊家賞識您的神手風采！額外加碼賞金 +$${bonusStr} 籌碼！`;
  toastService.success(desc, title);
}

export function getAuraRemainingTime(): number {
  try {
    const expireTime = localStorage.getItem(STORAGE_KEY_AURA);
    if (!expireTime) return 0;
    const diff = Math.floor((parseInt(expireTime, 10) - Date.now()) / 1000);
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

export function isAuraActive(): boolean {
  return getAuraRemainingTime() > 0;
}

export function addAuraDuration(seconds: number): number {
  try {
    const currentRemaining = getAuraRemainingTime();
    const newRemaining = Math.min(MAX_AURA_SECONDS, currentRemaining + seconds);
    const newExpireTime = Date.now() + newRemaining * 1000;
    localStorage.setItem(STORAGE_KEY_AURA, newExpireTime.toString());

    // Dispatch global event for instant reactivity across all views
    window.dispatchEvent(
      new CustomEvent('casino_aura_updated', {
        detail: { remaining: newRemaining },
      })
    );

    return newRemaining;
  } catch {
    return seconds;
  }
}

export function clearAura(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_AURA);
    window.dispatchEvent(
      new CustomEvent('casino_aura_updated', {
        detail: { remaining: 0 },
      })
    );
  } catch {
    // Ignore error
  }
}

/**
 * React Hook that provides real-time aura status and countdown,
 * ticking down every second and automatically updating.
 */
export function useToastAura() {
  const [remaining, setRemaining] = useState<number>(() => getAuraRemainingTime());

  useEffect(() => {
    // Set initial
    setRemaining(getAuraRemainingTime());

    const handleAuraUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ remaining: number }>;
      if (customEvent.detail?.remaining !== undefined) {
        setRemaining(customEvent.detail.remaining);
      } else {
        setRemaining(getAuraRemainingTime());
      }
    };

    window.addEventListener('casino_aura_updated', handleAuraUpdate);

    const interval = setInterval(() => {
      const rem = getAuraRemainingTime();
      setRemaining(rem);
    }, 1000);

    return () => {
      window.removeEventListener('casino_aura_updated', handleAuraUpdate);
      clearInterval(interval);
    };
  }, []);

  const isActive = remaining > 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  return {
    isActive,
    remainingSeconds: remaining,
    formattedTime,
  };
}

/**
 * Convenient method to activate or extend Toast Aura directly with celebratory audio and notification
 */
export function triggerTableToastAura(seconds = 90, source = '桌邊請酒'): number {
  const newRem = addAuraDuration(seconds);
  sound.playCoinPayout();
  const mins = Math.floor(newRem / 60);
  const secs = newRem % 60;
  const timeStr = `${mins}分${secs > 0 ? `${secs}秒` : ''}`;
  toastService.success(
    `全館賭桌已籠罩在金色幸運微光中（剩餘 ${timeStr}）！獲勝時享 30% 莊家額外加碼賞金！`,
    `🥂 敬酒幸運光環已啟動【${source}】`
  );
  return newRem;
}

