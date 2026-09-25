import { SlotSymbol, SlotSymbolId, SlotWinResult } from '../types/slot';

export const SLOT_SYMBOLS: Record<SlotSymbolId, SlotSymbol> = {
  seven: {
    id: 'seven',
    name: '777 幸運大獎',
    label: '777',
    icon: '7️⃣',
    bgColor: 'from-amber-500 via-rose-500 to-amber-400',
    textColor: 'text-amber-300 font-black',
    borderColor: 'border-amber-400',
    multiplier3: 200,
  },
  bar: {
    id: 'bar',
    name: '金條 (BAR)',
    label: 'BAR',
    icon: '🪙',
    bgColor: 'from-yellow-600 via-amber-400 to-yellow-600',
    textColor: 'text-amber-200 font-black',
    borderColor: 'border-amber-300',
    multiplier3: 40,
  },
  bell: {
    id: 'bell',
    name: '金鐘 (BELL)',
    label: '金鐘',
    icon: '🔔',
    bgColor: 'from-amber-600 to-yellow-500',
    textColor: 'text-yellow-300 font-bold',
    borderColor: 'border-yellow-400',
    multiplier3: 20,
  },
  watermelon: {
    id: 'watermelon',
    name: '西瓜 (MELON)',
    label: '西瓜',
    icon: '🍉',
    bgColor: 'from-emerald-700 to-green-500',
    textColor: 'text-emerald-300 font-bold',
    borderColor: 'border-emerald-400',
    multiplier3: 10,
  },
  grape: {
    id: 'grape',
    name: '葡萄 (GRAPES)',
    label: '葡萄',
    icon: '🍇',
    bgColor: 'from-purple-800 to-indigo-600',
    textColor: 'text-purple-300 font-bold',
    borderColor: 'border-purple-400',
    multiplier3: 6,
  },
  lemon: {
    id: 'lemon',
    name: '檸檬 (LEMON)',
    label: '檸檬',
    icon: '🍋',
    bgColor: 'from-amber-600 to-lime-500',
    textColor: 'text-yellow-200 font-bold',
    borderColor: 'border-lime-400',
    multiplier3: 4,
  },
  cherry: {
    id: 'cherry',
    name: '櫻桃 (CHERRY)',
    label: '櫻桃',
    icon: '🍒',
    bgColor: 'from-rose-800 to-red-600',
    textColor: 'text-rose-300 font-bold',
    borderColor: 'border-rose-400',
    multiplier3: 4,
  },
};

// Reel Strip definition (Ordered symbols for mechanical rolling animation)
export const REEL_STRIP: SlotSymbolId[] = [
  'cherry',
  'lemon',
  'bar',
  'grape',
  'bell',
  'cherry',
  'watermelon',
  'lemon',
  'seven',
  'grape',
  'cherry',
  'bell',
  'watermelon',
  'bar',
  'lemon',
  'grape',
  'cherry',
  'watermelon',
  'bell',
  'lemon',
];

// Weighted random symbol picker for realistic casino slot gameplay
export const getRandomSymbol = (): SlotSymbolId => {
  const rand = Math.random() * 100;
  if (rand < 1.0) return 'seven';        // 1.0% (極罕見 777 大獎，三連線僅 0.0001% 機率)
  if (rand < 5.0) return 'bar';          // 4.0% (BAR 金條)
  if (rand < 14.0) return 'bell';        // 9.0% (金鐘 BELL)
  if (rand < 27.0) return 'watermelon';  // 13.0% (西瓜)
  if (rand < 46.0) return 'grape';       // 19.0% (葡萄)
  if (rand < 71.0) return 'lemon';       // 25.0% (檸檬)
  return 'cherry';                       // 29.0% (櫻桃 - 高頻小額回饋，強化節奏感與持續性)
};

export const calculateSlotWin = (
  reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId],
  betAmount: number
): SlotWinResult => {
  const [s1, s2, s3] = reels;

  // 1. Triple Match (All 3 reels are identical)
  if (s1 === s2 && s2 === s3) {
    const symbol = SLOT_SYMBOLS[s1];
    const multiplier = symbol.multiplier3;
    const winAmount = betAmount * multiplier;
    const isJackpot = s1 === 'seven';

    return {
      isWin: true,
      multiplier,
      winAmount,
      title: isJackpot ? '🌟 JACKPOT 777 超級大獎！' : `🎉 ${symbol.name} 3連中！`,
      description: `3 輪完美匹配 ${symbol.icon} ${symbol.label}，獲得 ${multiplier} 倍彩金！`,
      isJackpot,
      matchedSymbolId: s1,
      winPatternId: s1 === 'cherry' ? 'cherry3' : (s1 as any),
    };
  }

  // 2. Mixed Fruits combination (3 distinct fruit symbols: Watermelon, Grape, Lemon, Cherry)
  const fruitIds: SlotSymbolId[] = ['watermelon', 'grape', 'lemon', 'cherry'];
  const isAllFruits = fruitIds.includes(s1) && fruitIds.includes(s2) && fruitIds.includes(s3);
  const isDistinctFruits = isAllFruits && s1 !== s2 && s2 !== s3 && s1 !== s3;

  if (isDistinctFruits) {
    return {
      isWin: true,
      multiplier: 1.5,
      winAmount: Math.round(betAmount * 1.5),
      title: '🍹 水果大拼盤 (Mixed Fruits)',
      description: '轉出 3 種不同水果拼盤組合，獲得 1.5 倍彩金！',
      isJackpot: false,
      winPatternId: 'mixed',
    };
  }

  // 3. Cherry rules: Exactly 2 cherries or 1 cherry (NOT 3, because 3 was caught in Triple Match)
  const cherryCount = reels.filter((s) => s === 'cherry').length;
  if (cherryCount === 2) {
    return {
      isWin: true,
      multiplier: 1.5,
      winAmount: Math.round(betAmount * 1.5),
      title: '🍒 櫻桃雙響 (2 Cherries)',
      description: '出現 2 個櫻桃，獲得 1.5 倍彩金！',
      isJackpot: false,
      matchedSymbolId: 'cherry',
      winPatternId: 'cherry2',
    };
  }

  if (cherryCount === 1) {
    return {
      isWin: true,
      multiplier: 0.5,
      winAmount: Math.max(1, Math.round(betAmount * 0.5)),
      title: '🍒 櫻桃保底 (1 Cherry)',
      description: '出現 1 個櫻桃，保底返還 0.5 倍注金！',
      isJackpot: false,
      matchedSymbolId: 'cherry',
      winPatternId: 'cherry1',
    };
  }

  // No win
  return {
    isWin: false,
    multiplier: 0,
    winAmount: 0,
    title: '未中獎',
    description: '再接再厲，下一把大獎就是你的！',
    isJackpot: false,
  };
};
