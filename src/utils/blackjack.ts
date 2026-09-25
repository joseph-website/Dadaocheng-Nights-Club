import { Card, CardRank, Hand, RoundResult, Suit } from '../types/blackjack';

export const TOTAL_SHOE_CARDS = 312; // 6 decks * 52 cards
export const SHOE_RESHUFFLE_THRESHOLD = 75; // Reshuffle trigger when remaining < 75 cards

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: { rank: CardRank; value: number }[] = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
];

/**
 * Generates a brand new 6-deck shoe (312 cards)
 */
export function createSixDeckShoe(): Card[] {
  const shoe: Card[] = [];
  let cardIndex = 0;

  for (let deck = 1; deck <= 6; deck++) {
    for (const suit of SUITS) {
      for (const { rank, value } of RANKS) {
        shoe.push({
          id: `card-d${deck}-${suit}-${rank}-${cardIndex++}`,
          suit,
          rank,
          value,
          isHidden: false,
        });
      }
    }
  }

  return shuffleShoe(shoe);
}

/**
 * Fisher-Yates array shuffling algorithm
 */
export function shuffleShoe(shoe: Card[]): Card[] {
  const shuffled = [...shoe];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculate the dynamic score of a hand with Ace handling
 */
export function calculateHand(cards: Card[]): Hand {
  // Filter out cards that are currently face down if calculating visible score only,
  // but if all cards are passed, calculate the full hand.
  const visibleCards = cards.filter((c) => !c.isHidden);
  if (visibleCards.length === 0) {
    return {
      cards,
      score: 0,
      isSoft: false,
      isBusted: false,
      isBlackjack: false,
    };
  }

  let total = 0;
  let aceCount = 0;

  for (const card of visibleCards) {
    if (card.rank === 'A') {
      aceCount += 1;
      total += 11;
    } else {
      total += card.value;
    }
  }

  // Adjust Aces from 11 to 1 as needed to avoid bust
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount -= 1;
  }

  const isSoft = aceCount > 0 && total <= 21;
  const isBusted = total > 21;
  const isBlackjack = visibleCards.length === 2 && total === 21 && cards.length === 2;
  const isCharlie = visibleCards.length >= 5 && total <= 21;

  return {
    cards,
    score: total,
    isSoft,
    isBusted,
    isBlackjack,
    isCharlie,
  };
}

/**
 * Evaluate the outcome of the round and determine payout
 * 1. Five-Card Charlie (過五關): 2:1 payout (2x profit + bet back = 3x total)
 * 2. Natural Blackjack: 3:2 payout (1.5x profit + bet back = 2.5x total)
 * 3. Regular Win / Dealer Bust: 1:1 payout (1x profit + bet back = 2x total)
 * 4. Push: 1:1 refund of bet (0 profit, bet back = 1x total)
 * 5. Loss / Player Bust: 0 payout
 */
export function evaluateRoundOutcome(
  playerHand: Hand,
  dealerHand: Hand,
  totalBet: number,
  isDouble: boolean,
  isFromSplit?: boolean
): RoundResult {
  const pScore = playerHand.score;
  const dScore = dealerHand.score;

  // Case 1: Player Busted
  if (playerHand.isBusted) {
    return {
      outcome: 'player_bust',
      title: '💥 玩家爆牌 (Bust)',
      description: `點數 (${pScore}) 超過 21 分，損失本局注金 $${totalBet.toLocaleString()}`,
      payout: 0,
      netProfit: -totalBet,
      isDouble,
    };
  }

  // Case 1.5: Five-Card Charlie (五龍過五關)
  // Reached 5 cards without busting! Wins immediately with generous 2:1 payout
  if (playerHand.cards.length >= 5 && !playerHand.isBusted) {
    const profit = totalBet * 2;
    const payout = totalBet + profit;
    return {
      outcome: 'five_card_charlie',
      title: '🐉 五龍過五關！(Five-Card Charlie)',
      description: `手牌連抽滿 5 張未爆牌！達成傳奇過五關，享有 2:1 超高額彩金 +$${profit.toLocaleString()}`,
      payout,
      netProfit: profit,
      isDouble,
    };
  }

  // Case 2: Natural Blackjack checks
  // Note: Hands resulting from split aces/tens count as 21, not natural Blackjack
  const playerHasNaturalBJ = playerHand.isBlackjack && !isFromSplit;

  if (playerHasNaturalBJ && dealerHand.isBlackjack) {
    return {
      outcome: 'push_blackjack',
      title: '🤝 雙方皆為 Blackjack (Push)',
      description: `莊家與玩家同時拿到天生 21 點，平手退還注金 $${totalBet.toLocaleString()}`,
      payout: totalBet,
      netProfit: 0,
      isDouble,
    };
  }

  if (playerHasNaturalBJ && !dealerHand.isBlackjack) {
    // 3:2 payout: profit = totalBet * 1.5. Total returned = totalBet * 2.5
    const profit = Math.floor(totalBet * 1.5);
    const payout = totalBet + profit;
    return {
      outcome: 'player_blackjack',
      title: '🌟 天生 21 點！BLACKJACK！',
      description: `以首兩張牌奪得 21 點！享 3:2 高額彩金獲利 +$${profit.toLocaleString()}`,
      payout,
      netProfit: profit,
      isDouble,
    };
  }

  if (!playerHasNaturalBJ && dealerHand.isBlackjack) {
    return {
      outcome: 'dealer_blackjack',
      title: '👑 莊家 Blackjack',
      description: `莊家拿到天生 21 點，玩家損失注金 $${totalBet.toLocaleString()}`,
      payout: 0,
      netProfit: -totalBet,
      isDouble,
    };
  }

  // Case 3: Dealer Busted
  if (dealerHand.isBusted) {
    const profit = totalBet;
    const payout = totalBet * 2;
    return {
      outcome: 'dealer_bust',
      title: '🎉 莊家爆牌！玩家獲勝',
      description: `莊家點數 (${dScore}) 爆牌！贏得彩金 +$${profit.toLocaleString()}`,
      payout,
      netProfit: profit,
      isDouble,
    };
  }

  // Case 4: Standard score comparisons
  if (pScore > dScore) {
    const profit = totalBet;
    const payout = totalBet * 2;
    return {
      outcome: 'player_win',
      title: '🎉 玩家點數領先獲勝！',
      description: `玩家 ${pScore} 點 > 莊家 ${dScore} 點，贏得彩金 +$${profit.toLocaleString()}`,
      payout,
      netProfit: profit,
      isDouble,
    };
  } else if (pScore < dScore) {
    return {
      outcome: 'dealer_win',
      title: '莊家點數較大獲勝',
      description: `莊家 ${dScore} 點 > 玩家 ${pScore} 點，損失注金 $${totalBet.toLocaleString()}`,
      payout: 0,
      netProfit: -totalBet,
      isDouble,
    };
  } else {
    // Push / Tie
    return {
      outcome: 'push',
      title: '🤝 雙方平手 (Push)',
      description: `雙方點數皆為 ${pScore} 點，注金全額退回 $${totalBet.toLocaleString()}`,
      payout: totalBet,
      netProfit: 0,
      isDouble,
    };
  }
}

/**
 * Evaluate surrendered hand (player forfeits half bet, recovers half)
 */
export function evaluateSurrenderOutcome(totalBet: number): RoundResult {
  const refund = Math.floor(totalBet / 2);
  const loss = totalBet - refund;
  return {
    outcome: 'surrender',
    title: '🏳️ 投降認賠 (Surrender)',
    description: `玩家選擇及早認賠投降，成功取回 50% 注金 $${refund.toLocaleString()}`,
    payout: refund,
    netProfit: -loss,
    isDouble: false,
  };
}

/**
 * Evaluate insurance bet result (2:1 payout if dealer has natural Blackjack)
 */
export function evaluateInsuranceResult(
  insuranceBet: number,
  dealerHasBlackjack: boolean
): { won: boolean; payout: number; netProfit: number } {
  if (dealerHasBlackjack) {
    // 2:1 payout: returns 3x insurance bet (original + 2x profit)
    const profit = insuranceBet * 2;
    return {
      won: true,
      payout: insuranceBet + profit,
      netProfit: profit,
    };
  }
  return {
    won: false,
    payout: 0,
    netProfit: -insuranceBet,
  };
}

/**
 * Combined evaluation for split hands (Hand 1 and Hand 2) against the dealer
 */
export function evaluateSplitRoundOutcome(
  hand1: Hand,
  hand2: Hand,
  dealerHand: Hand,
  bet1: number,
  bet2: number,
  isDouble1: boolean,
  isDouble2: boolean
): RoundResult {
  const res1 = evaluateRoundOutcome(hand1, dealerHand, bet1, isDouble1, true);
  const res2 = evaluateRoundOutcome(hand2, dealerHand, bet2, isDouble2, true);

  const totalPayout = res1.payout + res2.payout;
  const totalNetProfit = res1.netProfit + res2.netProfit;
  const totalBet = bet1 + bet2;

  let overallOutcome: 'player_win' | 'dealer_win' | 'push' | 'split_mixed' = 'split_mixed';
  let title = '✌️ 分牌對決結算';

  if (res1.netProfit > 0 && res2.netProfit > 0) {
    overallOutcome = 'player_win';
    title = '🔥 分牌雙手全勝！大獲全勝！';
  } else if (res1.netProfit < 0 && res2.netProfit < 0) {
    overallOutcome = 'dealer_win';
    title = '💥 分牌雙手告負';
  } else if (totalNetProfit > 0) {
    overallOutcome = 'player_win';
    title = '🎉 分牌淨獲利勝出！';
  } else if (totalNetProfit === 0) {
    overallOutcome = 'push';
    title = '🤝 分牌綜合平手 (Push)';
  } else {
    overallOutcome = 'split_mixed';
    title = '⚖️ 分牌一勝一負 (局部保本)';
  }

  const description = `手牌一: ${res1.title} (${res1.netProfit >= 0 ? '+' : ''}$${res1.netProfit.toLocaleString()}) | 手牌二: ${res2.title} (${res2.netProfit >= 0 ? '+' : ''}$${res2.netProfit.toLocaleString()})`;

  return {
    outcome: overallOutcome,
    title,
    description,
    payout: totalPayout,
    netProfit: totalNetProfit,
    isDouble: isDouble1 || isDouble2,
    splitResults: {
      hand1: res1,
      hand2: res2,
    },
  };
}

