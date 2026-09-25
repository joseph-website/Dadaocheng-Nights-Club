export interface PlinkoBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  bet: number;
  currentRow: number;
  pathDecisions: number[]; // 0 for left, 1 for right at each row
  state: 'falling' | 'entering_slot' | 'landed' | 'settled';
  createdAt: number;
  targetSlotIndex: number;
  alpha: number;
  enterSlotY?: number;
  step?: number;
  stepProgress?: number;
  stepFrames?: number;
  sessionId?: string;
}

export interface PlinkoHistoryItem {
  id: string;
  timestamp: number;
  bet: number;
  multiplier: number;
  payout: number;
  slotIndex: number;
}

export interface PlinkoStats {
  totalDrops: number;
  totalWagered: number;
  totalWon: number;
  maxMultiplier: number;
  wins: number;
}

// 10 層釘子，11 個倍率分牌槽（對稱常態金字塔分佈，嚴格將期望值控制在 ~97%：1000.6/1024 = 97.7%）
export const PLINKO_MULTIPLIERS: number[] = [100, 7, 2.5, 0.8, 0.4, 0.3, 0.4, 0.8, 2.5, 7, 100];

export const PLINKO_ROWS = 10;
export const PLINKO_SLOTS_COUNT = PLINKO_ROWS + 1; // 11 slots
