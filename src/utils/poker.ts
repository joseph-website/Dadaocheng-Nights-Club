import {
  PokerCard,
  Suit,
  CardRank,
  HandCategory,
  HandEvaluation,
} from '../types/poker';

const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANKS: { rank: CardRank; value: number }[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

export const RANK_NAMES: Record<number, string> = {
  14: 'A',
  13: 'K',
  12: 'Q',
  11: 'J',
  10: '10',
  9: '9',
  8: '8',
  7: '7',
  6: '6',
  5: '5',
  4: '4',
  3: '3',
  2: '2',
};

// Generate fresh 52-card deck (strictly 1 copy of each 4 suits x 13 ranks = 52 cards)
export function createDeck(roundSeed?: string | number): PokerCard[] {
  const deck: PokerCard[] = [];
  const prefix = roundSeed !== undefined ? `poker-r${roundSeed}` : `poker-${Date.now()}`;
  for (const s of SUITS) {
    for (const r of RANKS) {
      deck.push({
        id: `${prefix}-${s}-${r.rank}`,
        suit: s,
        rank: r.rank,
        value: r.value,
        isHidden: false,
      });
    }
  }
  return deck;
}

// Verify deck has exactly 52 unique cards (no duplicate suits/ranks)
export function validateDeckIntegrity(deck: PokerCard[]): { valid: boolean; error?: string } {
  if (deck.length !== 52) {
    return { valid: false, error: `牌庫數量異常：當前為 ${deck.length} 張，標準應為 52 張` };
  }
  const seen = new Set<string>();
  for (const card of deck) {
    const key = `${card.suit}-${card.rank}`;
    if (seen.has(key)) {
      return { valid: false, error: `牌庫存在重複牌面：${key}` };
    }
    seen.add(key);
  }
  return { valid: true };
}

// Fisher-Yates Shuffle
export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper combinations algorithm: chooses k elements from array
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map((c) => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Evaluate exactly 5 cards
function evaluate5Cards(cards: PokerCard[]): HandEvaluation {
  // Sort descending by value
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map((c) => c.value);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check for Straight
  let isStraight = false;
  let straightHigh = 0;

  // Normal 5 consecutive
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  }
  // A-2-3-4-5 (Wheel Straight: Ace counts as 1)
  else if (
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    isStraight = true;
    straightHigh = 5; // 5 is the top of the wheel
  }

  // Count rank frequencies
  const counts: Record<number, number> = {};
  values.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });

  const countEntries = Object.entries(counts)
    .map(([val, cnt]) => ({ value: parseInt(val, 10), count: cnt }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.value - a.value;
    });

  // 1. Royal Flush & Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        category: HandCategory.RoyalFlush,
        categoryName: '皇家同花順 (Royal Flush)',
        categoryNameEn: 'Royal Flush',
        score: HandCategory.RoyalFlush * 1e10 + straightHigh * 1e8,
        best5Cards: sorted,
        description: `極致大牌 A-K-Q-J-10 同花順`,
      };
    }
    return {
      category: HandCategory.StraightFlush,
      categoryName: '同花順 (Straight Flush)',
      categoryNameEn: 'Straight Flush',
      score: HandCategory.StraightFlush * 1e10 + straightHigh * 1e8,
      best5Cards: sorted,
      description: `${RANK_NAMES[straightHigh]} 頂同花順`,
    };
  }

  // 2. Four of a Kind (鐵支 / 四條)
  if (countEntries[0].count === 4) {
    const quadVal = countEntries[0].value;
    const kickerVal = countEntries[1].value;
    return {
      category: HandCategory.FourOfAKind,
      categoryName: '鐵支四條 (Four of a Kind)',
      categoryNameEn: 'Four of a Kind',
      score: HandCategory.FourOfAKind * 1e10 + quadVal * 1e8 + kickerVal * 1e6,
      best5Cards: sorted,
      description: `四張 ${RANK_NAMES[quadVal]} (帶 ${RANK_NAMES[kickerVal]})`,
    };
  }

  // 3. Full House (葫蘆)
  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    const trioVal = countEntries[0].value;
    const pairVal = countEntries[1].value;
    return {
      category: HandCategory.FullHouse,
      categoryName: '葫蘆 (Full House)',
      categoryNameEn: 'Full House',
      score: HandCategory.FullHouse * 1e10 + trioVal * 1e8 + pairVal * 1e6,
      best5Cards: sorted,
      description: `${RANK_NAMES[trioVal]} 條配 ${RANK_NAMES[pairVal]} 對`,
    };
  }

  // 4. Flush (同花)
  if (isFlush) {
    const score =
      HandCategory.Flush * 1e10 +
      values[0] * 1e8 +
      values[1] * 1e6 +
      values[2] * 1e4 +
      values[3] * 1e2 +
      values[4];
    return {
      category: HandCategory.Flush,
      categoryName: '同花 (Flush)',
      categoryNameEn: 'Flush',
      score,
      best5Cards: sorted,
      description: `${RANK_NAMES[values[0]]} 頂同花`,
    };
  }

  // 5. Straight (順子)
  if (isStraight) {
    return {
      category: HandCategory.Straight,
      categoryName: '順子 (Straight)',
      categoryNameEn: 'Straight',
      score: HandCategory.Straight * 1e10 + straightHigh * 1e8,
      best5Cards: sorted,
      description: `${RANK_NAMES[straightHigh]} 頂順子`,
    };
  }

  // 6. Three of a Kind (三條)
  if (countEntries[0].count === 3) {
    const trioVal = countEntries[0].value;
    const k1 = countEntries[1].value;
    const k2 = countEntries[2].value;
    return {
      category: HandCategory.ThreeOfAKind,
      categoryName: '三條 (Three of a Kind)',
      categoryNameEn: 'Three of a Kind',
      score:
        HandCategory.ThreeOfAKind * 1e10 +
        trioVal * 1e8 +
        k1 * 1e6 +
        k2 * 1e4,
      best5Cards: sorted,
      description: `三張 ${RANK_NAMES[trioVal]}`,
    };
  }

  // 7. Two Pair (兩對)
  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const highPair = Math.max(countEntries[0].value, countEntries[1].value);
    const lowPair = Math.min(countEntries[0].value, countEntries[1].value);
    const kicker = countEntries[2].value;
    return {
      category: HandCategory.TwoPair,
      categoryName: '兩對 (Two Pair)',
      categoryNameEn: 'Two Pair',
      score:
        HandCategory.TwoPair * 1e10 +
        highPair * 1e8 +
        lowPair * 1e6 +
        kicker * 1e4,
      best5Cards: sorted,
      description: `${RANK_NAMES[highPair]} 與 ${RANK_NAMES[lowPair]} 雙對`,
    };
  }

  // 8. One Pair (一對)
  if (countEntries[0].count === 2) {
    const pairVal = countEntries[0].value;
    const k1 = countEntries[1].value;
    const k2 = countEntries[2].value;
    const k3 = countEntries[3].value;
    return {
      category: HandCategory.OnePair,
      categoryName: '一對 (One Pair)',
      categoryNameEn: 'One Pair',
      score:
        HandCategory.OnePair * 1e10 +
        pairVal * 1e8 +
        k1 * 1e6 +
        k2 * 1e4 +
        k3 * 1e2,
      best5Cards: sorted,
      description: `一對 ${RANK_NAMES[pairVal]}`,
    };
  }

  // 9. High Card (高牌)
  const score =
    HandCategory.HighCard * 1e10 +
    values[0] * 1e8 +
    values[1] * 1e6 +
    values[2] * 1e4 +
    values[3] * 1e2 +
    values[4];
  return {
    category: HandCategory.HighCard,
    categoryName: '高牌 (High Card)',
    categoryNameEn: 'High Card',
    score,
    best5Cards: sorted,
    description: `高牌 ${RANK_NAMES[values[0]]}`,
  };
}

// Evaluate 5 to 7 cards (selects best 5-card hand)
export function evaluateHoldemHand(availableCards: PokerCard[]): HandEvaluation {
  if (availableCards.length < 5) {
    // Return placeholder or partial eval
    const sorted = [...availableCards].sort((a, b) => b.value - a.value);
    const highest = sorted[0]?.value || 2;
    return {
      category: HandCategory.HighCard,
      categoryName: availableCards.length > 0 ? `高牌 ${RANK_NAMES[highest]}` : '未發牌',
      categoryNameEn: 'High Card',
      score: HandCategory.HighCard * 1e10 + highest * 1e8,
      best5Cards: availableCards,
      description: '等待發出公共牌...',
    };
  }

  const combinations = getCombinations(availableCards, 5);
  let bestEval: HandEvaluation | null = null;

  for (const combo of combinations) {
    const currentEval = evaluate5Cards(combo);
    if (!bestEval || currentEval.score > bestEval.score) {
      bestEval = currentEval;
    }
  }

  return bestEval!;
}

// Compare two evaluations: returns 1 (player win), -1 (ai win), 0 (tie)
export function compareEvaluations(
  playerEval: HandEvaluation,
  aiEval: HandEvaluation
): number {
  if (playerEval.score > aiEval.score) return 1;
  if (playerEval.score < aiEval.score) return -1;
  return 0;
}

// Computer NPC AI Decision Engine (100% Pure Client-Side Local JavaScript/TypeScript Logic)
// Includes Psychology "Tells", Draw Detection, Bluff/Truth Dialogue, and Action Timing
export interface AiDecision {
  action: 'check' | 'call' | 'raise' | 'fold';
  raiseAmount?: number;
  thought: string;
  tellText?: string;
  isBluff?: boolean;
  delayMs: number;
}

// Helper: Check for Flush Draw (4 of the same suit)
function hasFlushDraw(cards: PokerCard[]): boolean {
  const suitCounts: Record<string, number> = {};
  for (const c of cards) {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  }
  return Object.values(suitCounts).some((count) => count === 4);
}

// Helper: Check for Open-Ended or Gutshot Straight Draw (4 unique values within a span of 4 or 5)
function hasStraightDraw(cards: PokerCard[]): boolean {
  const uniqueVals = Array.from(new Set(cards.map((c) => c.value))).sort((a, b) => a - b);
  if (uniqueVals.length < 4) return false;

  // Add Ace as 1 if Ace (14) is present
  if (uniqueVals.includes(14)) {
    uniqueVals.unshift(1);
  }

  for (let i = 0; i <= uniqueVals.length - 4; i++) {
    const span = uniqueVals[i + 3] - uniqueVals[i];
    if (span <= 4) return true; // 4 cards in a span of 5 or less = straight draw
  }
  return false;
}

export function computeAiDecision(
  aiCards: PokerCard[],
  communityCards: PokerCard[],
  playerCurrentBet: number,
  aiCurrentBet: number,
  pot: number,
  minRaise: number,
  betCap: number = 10000
): AiDecision {
  const callAmount = playerCurrentBet - aiCurrentBet;
  const allCards = [...aiCards, ...communityCards];
  const evalResult = evaluateHoldemHand(allCards);
  const category = evalResult.category;

  const flushDraw = communityCards.length >= 3 && hasFlushDraw(allCards);
  const straightDraw = communityCards.length >= 3 && hasStraightDraw(allCards);
  const hasDraw = flushDraw || straightDraw;

  // Effective max raise capped at min(2 * pot, 10000)
  const maxPossibleRaise = Math.max(minRaise, Math.min(betCap, Math.floor(pot * 2)));

  // Psychology system: 75% truth (strong hand), 25% bluff (weak hand / bluff raise)
  // Strong hand quotes (Quick decision 400-500ms)
  const truthQuotes = [
    '「這把牌很有意思，我跟了！」',
    '「牌面不錯，加注看你敢不敢來。」',
    '「看來運氣站在我這邊。」',
    '「好牌，跟！」',
    '「這局我勢在必得。」',
    '「機會來了，加注！」',
  ];

  // Bluff / Hesitant quotes (Delayed decision 1000-1500ms)
  const bluffQuotes = [
    '「（思考許久）...我跟！」',
    '「（猶豫地看著底牌）...這張牌有點意思，加注！」',
    '「（緊盯公牌半晌）...加注，試探一下。」',
    '「（眼神閃爍）...再跟一把看看。」',
    '「（深呼吸）...既然到了這裡，那就加注！」',
    '「（敲了敲桌子）...我跟注。」',
  ];

  // 1. 強勁牌型 (三條 / 順子 / 同花 / 葫蘆 / 鐵支 / 同花順 / 皇家同花順)：
  if (category >= HandCategory.ThreeOfAKind) {
    const raiseAmt = Math.min(maxPossibleRaise, Math.max(minRaise, Math.floor(pot * 0.75)));
    const quote = truthQuotes[Math.floor(Math.random() * truthQuotes.length)];
    return {
      action: 'raise',
      raiseAmount: raiseAmt,
      thought: '評估手牌勝率領先，發動強力加注！',
      tellText: quote,
      isBluff: false,
      delayMs: 450, // 秒加注 / 秒行動 (0.45s)
    };
  }

  // 2. 中等牌型 (一對 / 兩對)：具高防守價值，積極跟注或小幅加注
  if (category === HandCategory.TwoPair || category === HandCategory.OnePair) {
    if (callAmount === 0) {
      // 40% 機率在兩對時主動小加注，60% 過牌
      if (category === HandCategory.TwoPair && Math.random() < 0.4) {
        const raiseAmt = Math.min(maxPossibleRaise, minRaise);
        return {
          action: 'raise',
          raiseAmount: raiseAmt,
          thought: '手牌兩對優勢，進行價值加注。',
          tellText: truthQuotes[Math.floor(Math.random() * truthQuotes.length)],
          isBluff: false,
          delayMs: 500,
        };
      }
      return {
        action: 'check',
        thought: '手牌具防守價值，選擇過牌觀望。',
        tellText: '「過牌。」',
        isBluff: false,
        delayMs: 500,
      };
    }

    // Facing player bet: 90% 跟注，低棄牌率
    const quote = truthQuotes[Math.floor(Math.random() * truthQuotes.length)];
    return {
      action: 'call',
      thought: '手牌有一對/兩對成牌，果斷跟注防守。',
      tellText: quote,
      isBluff: false,
      delayMs: 500,
    };
  }

  // 3. 聽牌狀態 (4張同花或4張順子)：大幅降低棄牌率，80% 跟注買牌
  if (hasDraw) {
    if (callAmount === 0) {
      return {
        action: 'check',
        thought: '正在聽大牌 (Draw)，免費過牌看下一張。',
        tellText: '「過牌。」',
        isBluff: false,
        delayMs: 500,
      };
    }

    // Facing player bet when drawing: 80% Call, 20% Fold only if call is very large
    const isCallTooBig = callAmount > pot * 1.5;
    if (isCallTooBig && Math.random() < 0.4) {
      return {
        action: 'fold',
        thought: '下注過大超出買牌勝率，謹慎棄牌。',
        tellText: '「（搖了搖頭）這把我不跟了。」',
        isBluff: false,
        delayMs: 800,
      };
    }

    const quote = truthQuotes[Math.floor(Math.random() * truthQuotes.length)];
    return {
      action: 'call',
      thought: '手牌聽牌中 (差一張成牌)，選擇跟注買牌！',
      tellText: quote,
      isBluff: false,
      delayMs: 600,
    };
  }

  // 4. 弱勢牌型 (高牌 / 無對)：
  if (callAmount === 0) {
    // 無注差：90% 過牌，10% 機會發動延遲詐牌加注 (Bluff)
    if (Math.random() < 0.1) {
      const raiseAmt = Math.min(maxPossibleRaise, minRaise);
      const quote = bluffQuotes[Math.floor(Math.random() * bluffQuotes.length)];
      return {
        action: 'raise',
        raiseAmount: raiseAmt,
        thought: '手牌不佳，發動心理詐牌加注！',
        tellText: quote,
        isBluff: true,
        delayMs: 1200, // 延遲 1.2 秒才加注 (詐牌微表情)
      };
    }
    return {
      action: 'check',
      thought: '手牌尚未成型，優先過牌觀望。',
      tellText: '「過牌。」',
      isBluff: false,
      delayMs: 500,
    };
  } else {
    // 玩家有加注/下注 (callAmount > 0)
    // 弱牌時：25% 詐牌跟注/反加注 (Bluff/Hesitate)，40% 頑強跟注，35% 棄牌
    const rand = Math.random();
    if (rand < 0.25) {
      // 25% 延遲詐牌 / 猶豫跟注或反加注
      const shouldRaise = Math.random() < 0.3;
      const quote = bluffQuotes[Math.floor(Math.random() * bluffQuotes.length)];
      if (shouldRaise) {
        const raiseAmt = Math.min(maxPossibleRaise, minRaise);
        return {
          action: 'raise',
          raiseAmount: raiseAmt,
          thought: '執行心理詐牌加注 (Bluff Raise)！',
          tellText: quote,
          isBluff: true,
          delayMs: 1300, // 延遲 1.3 秒
        };
      }
      return {
        action: 'call',
        thought: '執行猶豫跟注心理戰。',
        tellText: quote,
        isBluff: true,
        delayMs: 1200, // 延遲 1.2 秒
      };
    } else if (rand < 0.65) {
      // 40% 一般頑強跟注
      return {
        action: 'call',
        thought: '嘗試試探對手，選擇跟注。',
        tellText: '「再跟一張看公牌。」',
        isBluff: false,
        delayMs: 700,
      };
    } else {
      // 35% 棄牌 (相較原本 70% 大幅降低棄牌率)
      return {
        action: 'fold',
        thought: '手牌落後且無聽牌潛力，選擇棄牌止損。',
        tellText: '「（無奈笑笑）蓋了。」',
        isBluff: false,
        delayMs: 750,
      };
    }
  }
}
