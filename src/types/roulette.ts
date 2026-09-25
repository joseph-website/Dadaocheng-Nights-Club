export type BetType =
  | 'straight' // single number 0-36
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low' // 1-18
  | 'high' // 19-36
  | 'dozen_1' // 1-12
  | 'dozen_2' // 13-24
  | 'dozen_3' // 25-36
  | 'col_1' // 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
  | 'col_2' // 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
  | 'col_3'; // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36

export interface BetItem {
  id: string; // e.g. "straight-17", "red", "even"
  type: BetType;
  value?: number; // target number if straight bet (0-36)
  amount: number;
  label: string;
}

export interface SpinResult {
  number: number;
  color: 'red' | 'black' | 'green';
  isEven: boolean | null; // null for 0
  isHigh: boolean | null; // null for 0
  dozen: 1 | 2 | 3 | null;
  column: 1 | 2 | 3 | null;
  totalBet: number;
  totalWon: number;
  netProfit: number;
  winningBets: {
    label: string;
    amount: number;
    payout: number;
    multiplier: string;
  }[];
  timestamp: number;
}

export interface ChipDenomination {
  value: number;
  label: string;
  color: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
}
