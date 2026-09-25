import {
  CrapsBetItem,
  CrapsPhase,
  CrapsRollResult,
  CrapsWinningBet,
  CrapsEventType,
} from '../types/craps';

export function rollCrapsDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2];
}

export function evaluateCrapsRoll(
  dice: [number, number],
  phaseBefore: CrapsPhase,
  pointBefore: number | null,
  currentBets: CrapsBetItem[]
): CrapsRollResult {
  const sum = dice[0] + dice[1];
  let phaseAfter: CrapsPhase = phaseBefore;
  let pointAfter: number | null = pointBefore;
  let event: CrapsEventType = 'continue';
  let eventDescription = '';

  let totalWon = 0;
  const winningBets: CrapsWinningBet[] = [];
  const persistingBets: CrapsBetItem[] = [];

  const totalBet = currentBets.reduce((acc, b) => acc + b.amount, 0);

  // 1. Determine Phase & Main Game Event
  if (phaseBefore === 'come_out') {
    if (sum === 7 || sum === 11) {
      event = 'natural';
      eventDescription = `🎉 首擲開出 ${sum} 點 (Natural 7/11)！Pass Line 過關大獲全勝！`;
      phaseAfter = 'come_out';
      pointAfter = null;
    } else if (sum === 2 || sum === 3) {
      event = 'craps';
      eventDescription = `💀 首擲開出 ${sum} 點 (Craps)！Pass Line 輸，Don't Pass 獲勝！`;
      phaseAfter = 'come_out';
      pointAfter = null;
    } else if (sum === 12) {
      event = 'craps';
      eventDescription = `💀 首擲開出 12 點 (Craps 12)！Pass Line 輸，Don't Pass 平手退注 (Push)！`;
      phaseAfter = 'come_out';
      pointAfter = null;
    } else {
      // 4, 5, 6, 8, 9, 10
      event = 'point_established';
      phaseAfter = 'point';
      pointAfter = sum;
      eventDescription = `🎯 確立目標點數 Point: 【${sum} 點】！Puck 標記亮起 ON，進入點數拉鋸戰！`;
    }
  } else {
    // Point Phase
    if (sum === pointBefore) {
      event = 'point_hit';
      eventDescription = `🔥 再次命中目標點數 【${sum} 點】！Pass Line 迎來大勝！重置為首擲階段！`;
      phaseAfter = 'come_out';
      pointAfter = null;
    } else if (sum === 7) {
      event = 'seven_out';
      eventDescription = `⚠️ 擲出 7 點 (Seven-Out)！拉鋸結束，Pass Line 輸，Don't Pass 獲勝！`;
      phaseAfter = 'come_out';
      pointAfter = null;
    } else {
      event = 'continue';
      eventDescription = `🎲 開出 ${sum} 點！目標點數仍為 【${pointBefore} 點】，拉鋸戰持續中！`;
      phaseAfter = 'point';
      pointAfter = pointBefore;
    }
  }

  // 2. Resolve Bets
  for (const bet of currentBets) {
    if (bet.type === 'pass_line') {
      if (phaseBefore === 'come_out') {
        if (sum === 7 || sum === 11) {
          const won = bet.amount * 2; // Returns 1:1 profit + principal
          totalWon += won;
          winningBets.push({
            id: bet.id,
            type: bet.type,
            label: bet.label,
            betAmount: bet.amount,
            wonAmount: won,
            payoutRatioText: '1:1',
          });
        } else if (sum === 2 || sum === 3 || sum === 12) {
          // Lost
        } else {
          // Point established -> bet persists
          persistingBets.push(bet);
        }
      } else {
        // In Point phase
        if (sum === pointBefore) {
          const won = bet.amount * 2;
          totalWon += won;
          winningBets.push({
            id: bet.id,
            type: bet.type,
            label: bet.label,
            betAmount: bet.amount,
            wonAmount: won,
            payoutRatioText: '1:1',
          });
        } else if (sum === 7) {
          // Lost
        } else {
          // Continues
          persistingBets.push(bet);
        }
      }
    } else if (bet.type === 'dont_pass') {
      if (phaseBefore === 'come_out') {
        if (sum === 7 || sum === 11) {
          // Lost
        } else if (sum === 2 || sum === 3) {
          const won = bet.amount * 2;
          totalWon += won;
          winningBets.push({
            id: bet.id,
            type: bet.type,
            label: bet.label,
            betAmount: bet.amount,
            wonAmount: won,
            payoutRatioText: '1:1',
          });
        } else if (sum === 12) {
          // Push (refund)
          totalWon += bet.amount;
          winningBets.push({
            id: bet.id,
            type: bet.type,
            label: `${bet.label} (平手退注)`,
            betAmount: bet.amount,
            wonAmount: bet.amount,
            payoutRatioText: '退本',
          });
        } else {
          // Point established -> bet persists
          persistingBets.push(bet);
        }
      } else {
        // Point phase
        if (sum === pointBefore) {
          // Lost
        } else if (sum === 7) {
          const won = bet.amount * 2;
          totalWon += won;
          winningBets.push({
            id: bet.id,
            type: bet.type,
            label: bet.label,
            betAmount: bet.amount,
            wonAmount: won,
            payoutRatioText: '1:1',
          });
        } else {
          // Continues
          persistingBets.push(bet);
        }
      }
    } else if (bet.type === 'field') {
      // 1-roll bet
      if (sum === 2) {
        // Double pay 1:2 (returns principal + 2x)
        const won = bet.amount * 3;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: `${bet.label} (開出2點雙倍!)`,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '1:2',
        });
      } else if (sum === 12) {
        // Double pay 1:2
        const won = bet.amount * 3;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: `${bet.label} (開出12點雙倍!)`,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '1:2',
        });
      } else if ([3, 4, 9, 10, 11].includes(sum)) {
        // Standard 1:1
        const won = bet.amount * 2;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '1:1',
        });
      }
      // 5, 6, 7, 8 lost (not added to persistingBets)
    } else if (bet.type === 'place_four') {
      // Place 4: Hits on 4 (pays 9:5 profit -> 1.8x profit + 1x principal = 2.8x)
      if (sum === 4) {
        const profit = Math.round((bet.amount * 9) / 5);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '9:5',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'place_five') {
      // Place 5: Hits on 5 (pays 7:5 profit -> 1.4x profit + 1x principal = 2.4x)
      if (sum === 5) {
        const profit = Math.round((bet.amount * 7) / 5);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:5',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'place_six') {
      // Place 6: Hits on 6 (pays 7:6 profit -> 1.167x profit + 1x principal)
      if (sum === 6) {
        const profit = Math.round((bet.amount * 7) / 6);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:6',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'place_eight') {
      // Place 8: Hits on 8 (pays 7:6 profit)
      if (sum === 8) {
        const profit = Math.round((bet.amount * 7) / 6);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:6',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'place_nine') {
      // Place 9: Hits on 9 (pays 7:5 profit)
      if (sum === 9) {
        const profit = Math.round((bet.amount * 7) / 5);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:5',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'place_ten') {
      // Place 10: Hits on 10 (pays 9:5 profit)
      if (sum === 10) {
        const profit = Math.round((bet.amount * 9) / 5);
        const won = bet.amount + profit;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '9:5',
        });
      } else if (sum !== 7) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'hard_four') {
      // 2 + 2 pays 7:1 (8x return). Loses on 7 or easy 4 (1-3, 3-1)
      if (dice[0] === 2 && dice[1] === 2) {
        const won = bet.amount * 8;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:1',
        });
      } else if (sum !== 7 && sum !== 4) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'hard_six') {
      // 3 + 3 pays 9:1 (10x return). Loses on 7 or easy 6
      if (dice[0] === 3 && dice[1] === 3) {
        const won = bet.amount * 10;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '9:1',
        });
      } else if (sum !== 7 && sum !== 6) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'hard_eight') {
      // 4 + 4 pays 9:1 (10x return). Loses on 7 or easy 8
      if (dice[0] === 4 && dice[1] === 4) {
        const won = bet.amount * 10;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '9:1',
        });
      } else if (sum !== 7 && sum !== 8) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'hard_ten') {
      // 5 + 5 pays 7:1 (8x return). Loses on 7 or easy 10
      if (dice[0] === 5 && dice[1] === 5) {
        const won = bet.amount * 8;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '7:1',
        });
      } else if (sum !== 7 && sum !== 10) {
        persistingBets.push(bet);
      }
    } else if (bet.type === 'any_seven') {
      // 1-roll bet: 7 pays 1:4 (returns principal + 4x = 5x)
      if (sum === 7) {
        const won = bet.amount * 5;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '1:4',
        });
      }
    } else if (bet.type === 'any_craps') {
      // 1-roll bet: 2, 3, 12 pays 1:7 (returns principal + 7x = 8x)
      if ([2, 3, 12].includes(sum)) {
        const won = bet.amount * 8;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '1:7',
        });
      }
    } else if (bet.type === 'yo_eleven') {
      // 1-roll bet: 11 pays 15:1 (returns principal + 15x = 16x)
      if (sum === 11) {
        const won = bet.amount * 16;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '15:1',
        });
      }
    } else if (bet.type === 'aces_two') {
      // 1-roll bet: 1+1 pays 30:1 (returns principal + 30x = 31x)
      if (dice[0] === 1 && dice[1] === 1) {
        const won = bet.amount * 31;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '30:1',
        });
      }
    } else if (bet.type === 'twelve_craps') {
      // 1-roll bet: 6+6 pays 30:1 (returns principal + 30x = 31x)
      if (dice[0] === 6 && dice[1] === 6) {
        const won = bet.amount * 31;
        totalWon += won;
        winningBets.push({
          id: bet.id,
          type: bet.type,
          label: bet.label,
          betAmount: bet.amount,
          wonAmount: won,
          payoutRatioText: '30:1',
        });
      }
    }
  }

  const netProfit = totalWon - totalBet;

  return {
    id: `craps-roll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    dice,
    sum,
    phaseBefore,
    pointBefore,
    phaseAfter,
    pointAfter,
    event,
    eventDescription,
    totalBet,
    totalWon,
    netProfit,
    winningBets,
    persistingBets,
  };
}
