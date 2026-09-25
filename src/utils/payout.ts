import { BetItem, SpinResult } from '../types/roulette';
import { RED_NUMBERS, BLACK_NUMBERS, getNumberColor } from './constants';

export function calculateSpinResult(winningNumber: number, bets: BetItem[]): SpinResult {
  const color = getNumberColor(winningNumber);
  const isEven = winningNumber === 0 ? null : winningNumber % 2 === 0;
  const isHigh = winningNumber === 0 ? null : winningNumber >= 19;
  
  let dozen: 1 | 2 | 3 | null = null;
  if (winningNumber >= 1 && winningNumber <= 12) dozen = 1;
  else if (winningNumber >= 13 && winningNumber <= 24) dozen = 2;
  else if (winningNumber >= 25 && winningNumber <= 36) dozen = 3;

  let column: 1 | 2 | 3 | null = null;
  if (winningNumber > 0) {
    const mod = winningNumber % 3;
    if (mod === 1) column = 1;
    else if (mod === 2) column = 2;
    else if (mod === 0) column = 3;
  }

  let totalBet = 0;
  let totalWon = 0;
  const winningBets: SpinResult['winningBets'] = [];

  bets.forEach((bet) => {
    totalBet += bet.amount;
    let won = false;
    let multiplier = 0;
    let multiplierLabel = '';

    switch (bet.type) {
      case 'straight':
        if (bet.value === winningNumber) {
          won = true;
          multiplier = 36; // 1 to 35 payout + original bet returned
          multiplierLabel = '1:35 (直注)';
        }
        break;

      case 'red':
        if (winningNumber !== 0 && RED_NUMBERS.includes(winningNumber)) {
          won = true;
          multiplier = 2; // 1 to 1 payout + original bet returned
          multiplierLabel = '1:1 (紅色)';
        }
        break;

      case 'black':
        if (winningNumber !== 0 && BLACK_NUMBERS.includes(winningNumber)) {
          won = true;
          multiplier = 2;
          multiplierLabel = '1:1 (黑色)';
        }
        break;

      case 'even':
        if (winningNumber !== 0 && winningNumber % 2 === 0) {
          won = true;
          multiplier = 2;
          multiplierLabel = '1:1 (雙數)';
        }
        break;

      case 'odd':
        if (winningNumber !== 0 && winningNumber % 2 === 1) {
          won = true;
          multiplier = 2;
          multiplierLabel = '1:1 (單數)';
        }
        break;

      case 'low':
        if (winningNumber >= 1 && winningNumber <= 18) {
          won = true;
          multiplier = 2;
          multiplierLabel = '1:1 (小 1-18)';
        }
        break;

      case 'high':
        if (winningNumber >= 19 && winningNumber <= 36) {
          won = true;
          multiplier = 2;
          multiplierLabel = '1:1 (大 19-36)';
        }
        break;

      case 'dozen_1':
        if (dozen === 1) {
          won = true;
          multiplier = 3; // 1 to 2 payout
          multiplierLabel = '1:2 (第 1 組 1-12)';
        }
        break;

      case 'dozen_2':
        if (dozen === 2) {
          won = true;
          multiplier = 3;
          multiplierLabel = '1:2 (第 2 組 13-24)';
        }
        break;

      case 'dozen_3':
        if (dozen === 3) {
          won = true;
          multiplier = 3;
          multiplierLabel = '1:2 (第 3 組 25-36)';
        }
        break;

      case 'col_1':
        if (column === 1) {
          won = true;
          multiplier = 3;
          multiplierLabel = '1:2 (第 1 行)';
        }
        break;

      case 'col_2':
        if (column === 2) {
          won = true;
          multiplier = 3;
          multiplierLabel = '1:2 (第 2 行)';
        }
        break;

      case 'col_3':
        if (column === 3) {
          won = true;
          multiplier = 3;
          multiplierLabel = '1:2 (第 3 行)';
        }
        break;
    }

    if (won) {
      const payout = bet.amount * multiplier;
      totalWon += payout;
      winningBets.push({
        label: bet.label,
        amount: bet.amount,
        payout,
        multiplier: multiplierLabel,
      });
    }
  });

  const netProfit = totalWon - totalBet;

  return {
    number: winningNumber,
    color,
    isEven,
    isHigh,
    dozen,
    column,
    totalBet,
    totalWon,
    netProfit,
    winningBets,
    timestamp: Date.now(),
  };
}
