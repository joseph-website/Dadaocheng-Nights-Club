export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PokerCard {
  id: string;
  suit: Suit;
  rank: CardRank;
  value: number; // 2..14 (A = 14)
  isHidden?: boolean;
}

export enum HandCategory {
  HighCard = 1,
  OnePair = 2,
  TwoPair = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}

export interface HandEvaluation {
  category: HandCategory;
  categoryName: string;
  categoryNameEn: string;
  score: number; // Comparable score value for tie-breaking
  best5Cards: PokerCard[];
  description: string;
}

export type PokerStage =
  | 'idle'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'folded';

export type CurrentTurn = 'player' | 'ai' | 'animating';

export interface PokerGameHistory {
  id: string;
  timestamp: Date;
  winner: 'player' | 'ai' | 'split' | 'player_folded' | 'ai_folded';
  pot: number;
  playerHandName: string;
  aiHandName: string;
  playerNet: number;
}

export interface PokerStats {
  handsPlayed: number;
  playerWins: number;
  aiWins: number;
  splits: number;
  totalWon: number;
  biggestPot: number;
  royalFlushCount: number;
  straightFlushCount: number;
  fourKindCount: number;
}
