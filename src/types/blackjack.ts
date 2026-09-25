export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: CardRank;
  value: number; // 1-10 (A = 11 base)
  isHidden?: boolean;
}

export interface Hand {
  cards: Card[];
  score: number;
  isSoft: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
  isCharlie?: boolean;
  isDouble?: boolean;
  bet?: number;
  isCompleted?: boolean;
  result?: RoundResult;
}

export type GamePhase = 'betting' | 'dealing' | 'insurance' | 'player_turn' | 'dealer_turn' | 'settled' | 'shuffling';

export type GameOutcome =
  | 'player_blackjack'
  | 'dealer_blackjack'
  | 'push_blackjack'
  | 'player_win'
  | 'dealer_win'
  | 'push'
  | 'player_bust'
  | 'dealer_bust'
  | 'surrender'
  | 'split_mixed'
  | 'five_card_charlie';

export interface RoundResult {
  outcome: GameOutcome;
  title: string;
  description: string;
  payout: number; // Total money returned to player (e.g. bet + profit or push refund)
  netProfit: number; // Profit relative to total bet
  isDouble: boolean;
  insurancePayout?: number;
  insuranceWon?: boolean;
  splitResults?: {
    hand1: RoundResult;
    hand2: RoundResult;
  };
}

export interface BlackjackStats {
  handsPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
  highestWin: number;
}
