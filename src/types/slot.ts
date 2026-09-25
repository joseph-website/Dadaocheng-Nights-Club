export type SlotSymbolId =
  | 'seven'
  | 'bar'
  | 'bell'
  | 'watermelon'
  | 'grape'
  | 'lemon'
  | 'cherry';

export type SlotWinPatternId =
  | 'seven'
  | 'bar'
  | 'bell'
  | 'watermelon'
  | 'grape'
  | 'lemon'
  | 'cherry3'
  | 'cherry2'
  | 'cherry1'
  | 'mixed';

export interface SlotSymbol {
  id: SlotSymbolId;
  name: string;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  multiplier3: number;
}

export interface SlotWinResult {
  isWin: boolean;
  multiplier: number;
  winAmount: number;
  title: string;
  description: string;
  isJackpot: boolean;
  matchedSymbolId?: SlotSymbolId;
  winPatternId?: SlotWinPatternId;
}

export interface SlotStats {
  spins: number;
  wins: number;
  totalBet: number;
  totalWon: number;
  jackpots: number;
  highestWin: number;
}

export interface SlotSpinHistoryItem {
  id: string;
  timestamp: number;
  bet: number;
  reels: [SlotSymbolId, SlotSymbolId, SlotSymbolId];
  isWin: boolean;
  winAmount: number;
  multiplier: number;
  title: string;
  description: string;
  isJackpot: boolean;
}
