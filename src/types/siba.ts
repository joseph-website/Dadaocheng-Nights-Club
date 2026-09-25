export type SibaBetType =
  | 'small'             // 小點 (4~8 點, 1 賠 1)
  | 'big'               // 大點 (9~12 點, 1 賠 1)
  | 'bg'                // BG 逼機 (3 點, 1 賠 8)
  | 'eighteen_special'  // 十八 / 四一色 (1 賠 15)
  | 'point_4'           // 4 點 (1:6)
  | 'point_5'           // 5 點 (1:6)
  | 'point_6'           // 6 點 (1:5)
  | 'point_7'           // 7 點 (1:4)
  | 'point_8'           // 8 點 (1:4)
  | 'point_9'           // 9 點 (1:4)
  | 'point_10'          // 10 點 (1:5)
  | 'point_11'          // 11 點 (1:6)
  | 'point_12';         // 12 點 (1:6)

export interface SibaBetItem {
  id: string;
  type: SibaBetType;
  amount: number;
  label: string;
  payoutRatioText: string;
  multiplier: number; // e.g. 1 means 1:1 payout (return 2x total)
}

export interface SibaWinningBetDetail {
  id: string;
  label: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  profit: number;
}

export type SibaOutcomeCategory = 'bg' | 'small' | 'big' | 'eighteen' | 'four_kind' | 'no_points';

export interface SibaEvaluation {
  dice: [number, number, number, number];
  points: number; // 3 ~ 12 (0 if no points)
  category: SibaOutcomeCategory;
  categoryLabel: string;
  subDescription: string;
  basePair?: [number, number];
  scoringDice?: [number, number];
  isBG: boolean;
  isSmall: boolean;
  isBig: boolean;
  isEighteen: boolean;
  isFourKind: boolean;
  isValidPoint: boolean;
}

export interface SibaRollResult extends SibaEvaluation {
  totalBet: number;
  totalWon: number;
  netProfit: number;
  winningBets: SibaWinningBetDetail[];
  rerollHistory?: [number, number, number, number][];
  timestamp: number;
}

export interface SibaStats {
  rolls: number;
  wins: number;
  totalBet: number;
  totalWon: number;
  bgCount: number;
  eighteenCount: number;
  fourKindCount: number;
  highestWin: number;
}
