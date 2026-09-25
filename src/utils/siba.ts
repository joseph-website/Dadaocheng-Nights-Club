import {
  SibaBetItem,
  SibaBetType,
  SibaEvaluation,
  SibaOutcomeCategory,
  SibaRollResult,
  SibaWinningBetDetail,
} from '../types/siba';

// Roll 4 fair dice (1-6)
export const roll4Dice = (): [number, number, number, number] => {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const d3 = Math.floor(Math.random() * 6) + 1;
  const d4 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2, d3, d4];
};

// Evaluate the 4 dice according to traditional Taiwanese Si-Bō-Á rules
export const evaluateSiba = (
  dice: [number, number, number, number]
): SibaEvaluation => {
  const sorted = [...dice].sort((a, b) => a - b) as [
    number,
    number,
    number,
    number
  ];
  const counts: Record<number, number> = {};
  dice.forEach((d) => {
    counts[d] = (counts[d] || 0) + 1;
  });

  const uniqueKeys = Object.keys(counts).map(Number);

  // 1. Check Four of a Kind (四一色 / 豹子)
  if (sorted[0] === sorted[3]) {
    const val = sorted[0];
    if (val === 6) {
      return {
        dice,
        points: 12,
        category: 'eighteen',
        categoryLabel: '十八 (大十八・四一色)',
        subDescription: '四顆全為 6 點！最高至尊十八點！',
        basePair: [6, 6],
        scoringDice: [6, 6],
        isBG: false,
        isSmall: false,
        isBig: true,
        isEighteen: true,
        isFourKind: true,
        isValidPoint: true,
      };
    } else {
      return {
        dice,
        points: 12, // Treated as top tier payout
        category: 'four_kind',
        categoryLabel: `四一色 (豹子 ${val} 點)`,
        subDescription: `四顆全為 ${val} 點！爆發四一色特別獎！`,
        basePair: [val, val],
        scoringDice: [val, val],
        isBG: false,
        isSmall: false,
        isBig: true,
        isEighteen: false,
        isFourKind: true,
        isValidPoint: true,
      };
    }
  }

  // 2. Check Two Pairs (兩對)
  const pairKeys = uniqueKeys.filter((k) => counts[k] === 2).sort((a, b) => a - b);
  if (pairKeys.length === 2) {
    const smallerPair = pairKeys[0];
    const largerPair = pairKeys[1];

    // Special Taiwanese Siba rule: if one pair is double 6s, e.g. [3, 3, 6, 6]
    // The pair of 3s acts as base pair, double 6s score 6+6=12 (十八)!
    if (largerPair === 6) {
      return {
        dice,
        points: 12,
        category: 'eighteen',
        categoryLabel: '十八 (12 點)',
        subDescription: `對 ${smallerPair} 搭配雙 6，達成最高 12 點十八！`,
        basePair: [smallerPair, smallerPair],
        scoringDice: [6, 6],
        isBG: false,
        isSmall: false,
        isBig: true,
        isEighteen: true,
        isFourKind: false,
        isValidPoint: true,
      };
    }

    // Other two pairs: larger pair acts as base pair, remaining smaller pair sums up
    const points = smallerPair * 2;
    const isSmall = points >= 4 && points <= 8;
    const isBig = points >= 9 && points <= 12;

    return {
      dice,
      points,
      category: isBig ? 'big' : 'small',
      categoryLabel: `${points} 點 (${isBig ? '大' : '小'})`,
      subDescription: `兩對 (對 ${largerPair} 與 對 ${smallerPair})，取剩餘對子計 ${points} 點！`,
      basePair: [largerPair, largerPair],
      scoringDice: [smallerPair, smallerPair],
      isBG: false,
      isSmall,
      isBig,
      isEighteen: false,
      isFourKind: false,
      isValidPoint: true,
    };
  }

  // 3. Check Exactly One Pair + Two Singletons (一對基底 + 兩顆相加)
  if (pairKeys.length === 1 && uniqueKeys.length === 3) {
    const pairVal = pairKeys[0];
    const singles = uniqueKeys.filter((k) => counts[k] === 1).sort((a, b) => a - b);
    const s1 = singles[0];
    const s2 = singles[1];
    const points = s1 + s2;

    // Check BG 逼機 (1 + 2 = 3 點)
    if (s1 === 1 && s2 === 2) {
      return {
        dice,
        points: 3,
        category: 'bg',
        categoryLabel: 'BG 逼機 (3 點)',
        subDescription: `對 ${pairVal} 搭配 1 與 2，開出最低 3 點逼機！`,
        basePair: [pairVal, pairVal],
        scoringDice: [1, 2],
        isBG: true,
        isSmall: false,
        isBig: false,
        isEighteen: false,
        isFourKind: false,
        isValidPoint: true,
      };
    }

    const isSmall = points >= 4 && points <= 8;
    const isBig = points >= 9 && points <= 12;

    return {
      dice,
      points,
      category: isBig ? 'big' : 'small',
      categoryLabel: `${points} 點 (${isBig ? '大' : '小'})`,
      subDescription: `對 ${pairVal} 搭配 ${s1} 與 ${s2}，合計 ${points} 點！`,
      basePair: [pairVal, pairVal],
      scoringDice: [s1, s2],
      isBG: false,
      isSmall,
      isBig,
      isEighteen: false,
      isFourKind: false,
      isValidPoint: true,
    };
  }

  // 4. Case 4: No Points (無點: 4 distinct numbers or 3-of-a-kind + 1 singleton)
  return {
    dice,
    points: 0,
    category: 'no_points',
    categoryLabel: '無點 (自動重搖)',
    subDescription: '未出現成對基底，依規則自動重新搖骰！',
    isBG: false,
    isSmall: false,
    isBig: false,
    isEighteen: false,
    isFourKind: false,
    isValidPoint: false,
  };
};

// Roll until a valid point is obtained (or return history of rolls)
export const rollUntilValidSiba = (): {
  finalResult: SibaEvaluation;
  rerollHistory: [number, number, number, number][];
} => {
  const rerollHistory: [number, number, number, number][] = [];
  let currentDice = roll4Dice();
  let evalResult = evaluateSiba(currentDice);
  rerollHistory.push(currentDice);

  let attempts = 0;
  while (!evalResult.isValidPoint && attempts < 20) {
    attempts++;
    currentDice = roll4Dice();
    evalResult = evaluateSiba(currentDice);
    rerollHistory.push(currentDice);
  }

  return {
    finalResult: evalResult,
    rerollHistory,
  };
};

// Multiplier definition for betting areas
export const SIBA_PAYOUT_RATIOS: Record<SibaBetType, number> = {
  big: 1,               // 1:1
  small: 1,             // 1:1
  bg: 8,                // 1:8
  eighteen_special: 15, // 1:15
  point_4: 6,
  point_5: 6,
  point_6: 5,
  point_7: 4,
  point_8: 4,
  point_9: 4,
  point_10: 5,
  point_11: 6,
  point_12: 6,
};

// Calculate final settlement of bets against outcome
export const calculateSibaResult = (
  evaluation: SibaEvaluation,
  bets: SibaBetItem[],
  rerollHistory?: [number, number, number, number][]
): SibaRollResult => {
  const totalBet = bets.reduce((acc, b) => acc + b.amount, 0);
  let totalWon = 0;
  const winningBets: SibaWinningBetDetail[] = [];

  bets.forEach((bet) => {
    let multiplier = 0;

    // 1. Big (大點 9-12)
    if (bet.type === 'big' && evaluation.isBig && !evaluation.isBG) {
      multiplier = 1;
    }
    // 2. Small (小點 4-8)
    else if (bet.type === 'small' && evaluation.isSmall && !evaluation.isBG) {
      multiplier = 1;
    }
    // 3. BG 逼機 (3 點)
    else if (bet.type === 'bg' && evaluation.isBG) {
      multiplier = 8;
    }
    // 4. 十八 / 四一色 (1 賠 15)
    else if (
      bet.type === 'eighteen_special' &&
      (evaluation.isEighteen || evaluation.isFourKind)
    ) {
      multiplier = 15;
    }
    // 5. Specific point bets
    else if (bet.type.startsWith('point_')) {
      const targetPoint = parseInt(bet.type.replace('point_', ''), 10);
      if (evaluation.points === targetPoint && !evaluation.isBG) {
        multiplier = SIBA_PAYOUT_RATIOS[bet.type] || 4;
      }
    }

    if (multiplier > 0) {
      const profit = bet.amount * multiplier;
      const payout = bet.amount + profit;
      totalWon += payout;
      winningBets.push({
        id: bet.id,
        label: bet.label,
        betAmount: bet.amount,
        multiplier,
        payout,
        profit,
      });
    }
  });

  const netProfit = totalWon - totalBet;

  return {
    ...evaluation,
    totalBet,
    totalWon,
    netProfit,
    winningBets,
    rerollHistory,
    timestamp: Date.now(),
  };
};
