export type CrapsPhase = 'come_out' | 'point';

export type CrapsBetType =
  | 'pass_line'
  | 'dont_pass'
  | 'field'
  | 'place_four'
  | 'place_five'
  | 'place_six'
  | 'place_eight'
  | 'place_nine'
  | 'place_ten'
  | 'hard_four'
  | 'hard_six'
  | 'hard_eight'
  | 'hard_ten'
  | 'any_seven'
  | 'any_craps'
  | 'yo_eleven'
  | 'aces_two'
  | 'twelve_craps';

export interface CrapsBetItem {
  id: string;
  type: CrapsBetType;
  amount: number;
  label: string;
  payoutRatioText: string;
  multiplier: number;
}

export type CrapsEventType =
  | 'natural'
  | 'craps'
  | 'point_established'
  | 'point_hit'
  | 'seven_out'
  | 'continue';

export interface CrapsWinningBet {
  id: string;
  type: CrapsBetType;
  label: string;
  betAmount: number;
  wonAmount: number;
  payoutRatioText: string;
}

export interface CrapsRollResult {
  id: string;
  timestamp: number;
  dice: [number, number];
  sum: number;
  phaseBefore: CrapsPhase;
  pointBefore: number | null;
  phaseAfter: CrapsPhase;
  pointAfter: number | null;
  event: CrapsEventType;
  eventDescription: string;
  totalBet: number;
  totalWon: number;
  netProfit: number;
  winningBets: CrapsWinningBet[];
  persistingBets: CrapsBetItem[];
}

export interface CrapsStats {
  rolls: number;
  pointsHit: number;
  sevenOuts: number;
  naturals: number;
  crapsCount: number;
  totalBet: number;
  totalWon: number;
  highestWin: number;
}
