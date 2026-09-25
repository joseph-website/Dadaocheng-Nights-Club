export interface GlobalCasinoStats {
  totalBetsPlaced: number;
  totalWonAmount: number;
  totalRoundsPlayed: number;
  biggestSingleWin: number;
  biggestMultiplier: number;
  favoriteGame: string;
  favoriteGameSpent: number;
  gameRounds: {
    roulette: number;
    blackjack: number;
    slot: number;
    plinko: number;
    poker: number;
    siba: number;
    craps: number;
    claw: number;
    pinball: number;
  };
  gameBets: {
    roulette: number;
    blackjack: number;
    slot: number;
    plinko: number;
    poker: number;
    siba: number;
    craps: number;
    claw: number;
    pinball: number;
  };
  totalCollectiblesUnlocked: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
}

const STATS_STORAGE_KEY = 'casino_global_career_stats_v1';

export const GAME_NAME_MAP: Record<string, string> = {
  roulette: '歐式輪盤',
  blackjack: '21點',
  slot: '夜行拉霸機',
  plinko: '金字塔彈珠台',
  poker: '德州撲克',
  siba: '台灣十八仔',
  craps: '美式花旗骰',
  claw: '夜行夾娃娃機',
  pinball: '夜市打彈珠',
};

/**
 * Scan individual table storage to recover any spent chips and round counts
 */
function aggregateGameBetsFromStorage(): {
  gameBets: Record<string, number>;
  gameRounds: Record<string, number>;
} {
  const bets: Record<string, number> = {
    roulette: 0,
    blackjack: 0,
    slot: 0,
    plinko: 0,
    poker: 0,
    siba: 0,
    craps: 0,
    claw: 0,
    pinball: 0,
  };
  const rounds: Record<string, number> = {
    roulette: 0,
    blackjack: 0,
    slot: 0,
    plinko: 0,
    poker: 0,
    siba: 0,
    craps: 0,
    claw: 0,
    pinball: 0,
  };

  if (typeof window === 'undefined') return { gameBets: bets, gameRounds: rounds };

  // 1. Roulette
  try {
    const raw = localStorage.getItem('european_roulette_history_v1') || localStorage.getItem('roulette_history');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rounds.roulette = parsed.length;
        bets.roulette = parsed.reduce((sum: number, item: any) => sum + (Number(item?.totalBet) || 0), 0);
      }
    }
  } catch {
    // ignore
  }

  // 2. Blackjack
  try {
    const rawHands = localStorage.getItem('casino_blackjack_recent_hands_v1') || localStorage.getItem('blackjack_history_v1');
    if (rawHands) {
      const parsed = JSON.parse(rawHands);
      if (Array.isArray(parsed)) {
        rounds.blackjack = parsed.length;
        bets.blackjack = parsed.reduce((sum: number, item: any) => sum + (Number(item?.bet) || 0), 0);
      }
    }
    const rawStats = localStorage.getItem('blackjack_stats_v1');
    if (rawStats) {
      const parsed = JSON.parse(rawStats);
      const totalHands = (parsed.wins || 0) + (parsed.losses || 0) + (parsed.pushes || 0);
      if (totalHands > rounds.blackjack) rounds.blackjack = totalHands;
    }
  } catch {
    // ignore
  }

  // 3. Slot
  try {
    const rawSlot = localStorage.getItem('casino_slot_stats_v1');
    if (rawSlot) {
      const parsed = JSON.parse(rawSlot);
      bets.slot = Number(parsed.totalBet) || 0;
      rounds.slot = Number(parsed.spins) || 0;
    }
  } catch {
    // ignore
  }

  // 4. Plinko
  try {
    const rawPlinkoStats = localStorage.getItem('plinko_stats_v2');
    if (rawPlinkoStats) {
      const parsed = JSON.parse(rawPlinkoStats);
      bets.plinko = Number(parsed.totalWagered) || 0;
      rounds.plinko = Number(parsed.totalDrops) || 0;
    }
    const rawPlinkoHist = localStorage.getItem('plinko_history_v2');
    if (rawPlinkoHist) {
      const parsed = JSON.parse(rawPlinkoHist);
      if (Array.isArray(parsed)) {
        const histBets = parsed.reduce((sum: number, item: any) => sum + (Number(item?.bet) || 0), 0);
        if (histBets > bets.plinko) bets.plinko = histBets;
        if (parsed.length > rounds.plinko) rounds.plinko = parsed.length;
      }
    }
  } catch {
    // ignore
  }

  // 5. Poker
  try {
    const rawPokerHist = localStorage.getItem('casino_poker_history_v1');
    if (rawPokerHist) {
      const parsed = JSON.parse(rawPokerHist);
      if (Array.isArray(parsed)) {
        rounds.poker = parsed.length;
        bets.poker = parsed.reduce((sum: number, item: any) => {
          const committed = Number(item?.playerTotalCommitted) || Math.max(0, (Number(item?.pot) || 0) - (Number(item?.playerNet) || 0));
          return sum + committed;
        }, 0);
      }
    }
    const rawPokerStats = localStorage.getItem('texas_holdem_stats_v1');
    if (rawPokerStats) {
      const parsed = JSON.parse(rawPokerStats);
      if ((parsed.handsPlayed || 0) > rounds.poker) rounds.poker = parsed.handsPlayed;
    }
  } catch {
    // ignore
  }

  // 6. Siba
  try {
    const rawSibaStats = localStorage.getItem('casino_siba_stats_v1');
    if (rawSibaStats) {
      const parsed = JSON.parse(rawSibaStats);
      bets.siba = Number(parsed.totalBet) || 0;
      rounds.siba = Number(parsed.rounds) || 0;
    }
    const rawSibaHist = localStorage.getItem('casino_siba_history_v1');
    if (rawSibaHist) {
      const parsed = JSON.parse(rawSibaHist);
      if (Array.isArray(parsed)) {
        const histBets = parsed.reduce((sum: number, item: any) => sum + (Number(item?.totalBet) || 0), 0);
        if (histBets > bets.siba) bets.siba = histBets;
        if (parsed.length > rounds.siba) rounds.siba = parsed.length;
      }
    }
  } catch {
    // ignore
  }

  // 7. Craps
  try {
    const rawCrapsStats = localStorage.getItem('casino_craps_stats_v1');
    if (rawCrapsStats) {
      const parsed = JSON.parse(rawCrapsStats);
      bets.craps = Number(parsed.totalBet) || 0;
      rounds.craps = Number(parsed.rolls) || 0;
    }
    const rawCrapsHist = localStorage.getItem('casino_craps_history_v1');
    if (rawCrapsHist) {
      const parsed = JSON.parse(rawCrapsHist);
      if (Array.isArray(parsed)) {
        const histBets = parsed.reduce((sum: number, item: any) => sum + (Number(item?.totalBet) || 0), 0);
        if (histBets > bets.craps) bets.craps = histBets;
        if (parsed.length > rounds.craps) rounds.craps = parsed.length;
      }
    }
  } catch {
    // ignore
  }

  return { gameBets: bets, gameRounds: rounds };
}

/**
 * Accurately calculate the favorite game by finding the game with the highest invested chips amount
 */
export function calculateFavoriteGame(gameBets: Record<string, number>, gameRounds: Record<string, number>): {
  favoriteGame: string;
  favoriteGameSpent: number;
} {
  const validKeys = ['roulette', 'blackjack', 'slot', 'plinko', 'poker', 'siba', 'craps', 'claw', 'pinball'];
  let maxSpent = 0;
  let topKey: string | null = null;

  for (const key of validKeys) {
    const spent = gameBets[key] || 0;
    if (spent > maxSpent) {
      maxSpent = spent;
      topKey = key;
    }
  }

  // If there's a game with positive spent chips, that's our top invested game
  if (topKey && maxSpent > 0) {
    return {
      favoriteGame: GAME_NAME_MAP[topKey] || topKey,
      favoriteGameSpent: maxSpent,
    };
  }

  // If no bets were recorded, fall back to round count
  let maxRounds = 0;
  let topRoundKey: string | null = null;
  for (const key of validKeys) {
    const r = gameRounds[key] || 0;
    if (r > maxRounds) {
      maxRounds = r;
      topRoundKey = key;
    }
  }

  if (topRoundKey && maxRounds > 0) {
    return {
      favoriteGame: GAME_NAME_MAP[topRoundKey] || topRoundKey,
      favoriteGameSpent: 0,
    };
  }

  return {
    favoriteGame: '尚無投注紀錄',
    favoriteGameSpent: 0,
  };
}

export const getCareerStats = (): GlobalCasinoStats => {
  const defaultStats: GlobalCasinoStats = {
    totalBetsPlaced: 0,
    totalWonAmount: 0,
    totalRoundsPlayed: 0,
    biggestSingleWin: 0,
    biggestMultiplier: 1,
    favoriteGame: '尚無投注紀錄',
    favoriteGameSpent: 0,
    gameRounds: {
      roulette: 0,
      blackjack: 0,
      slot: 0,
      plinko: 0,
      poker: 0,
      siba: 0,
      craps: 0,
      claw: 0,
      pinball: 0,
    },
    gameBets: {
      roulette: 0,
      blackjack: 0,
      slot: 0,
      plinko: 0,
      poker: 0,
      siba: 0,
      craps: 0,
      claw: 0,
      pinball: 0,
    },
    totalCollectiblesUnlocked: 0,
    firstPlayedAt: Date.now(),
    lastPlayedAt: Date.now(),
  };

  if (typeof window === 'undefined') return defaultStats;

  let loadedStats = { ...defaultStats };

  try {
    const saved = localStorage.getItem(STATS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      loadedStats = {
        ...defaultStats,
        ...parsed,
        gameRounds: {
          ...defaultStats.gameRounds,
          ...(parsed.gameRounds || {}),
        },
        gameBets: {
          ...defaultStats.gameBets,
          ...(parsed.gameBets || {}),
        },
      };
    }
  } catch {
    // fallback
  }

  // Cross-synchronize with table storage to make sure any previously played games are counted
  const storageData = aggregateGameBetsFromStorage();
  const mergedBets = { ...loadedStats.gameBets };
  const mergedRounds = { ...loadedStats.gameRounds };

  const validKeys = ['roulette', 'blackjack', 'slot', 'plinko', 'poker', 'siba', 'craps', 'claw', 'pinball'] as const;
  validKeys.forEach((key) => {
    mergedBets[key] = Math.max(mergedBets[key] || 0, storageData.gameBets[key] || 0);
    mergedRounds[key] = Math.max(mergedRounds[key] || 0, storageData.gameRounds[key] || 0);
  });

  loadedStats.gameBets = mergedBets;
  loadedStats.gameRounds = mergedRounds;

  const totalSpentAcrossTables = Object.values(mergedBets).reduce((a, b) => a + b, 0);
  if (totalSpentAcrossTables > loadedStats.totalBetsPlaced) {
    loadedStats.totalBetsPlaced = totalSpentAcrossTables;
  }

  const totalRoundsAcrossTables = Object.values(mergedRounds).reduce((a, b) => a + b, 0);
  if (totalRoundsAcrossTables > loadedStats.totalRoundsPlayed) {
    loadedStats.totalRoundsPlayed = totalRoundsAcrossTables;
  }

  // Accurately compute top invested game (投入金額最多的遊戲)
  const favResult = calculateFavoriteGame(mergedBets, mergedRounds);
  loadedStats.favoriteGame = favResult.favoriteGame;
  loadedStats.favoriteGameSpent = favResult.favoriteGameSpent;

  return loadedStats;
};

export const saveCareerStats = (stats: GlobalCasinoStats): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('casino_career_stats_updated', { detail: stats }));
  } catch {
    // ignore
  }
};

export const recordCareerRound = (params: {
  gameId: 'roulette' | 'blackjack' | 'slot' | 'plinko' | 'poker' | 'siba' | 'craps' | 'claw' | 'pinball' | 'sicbo';
  betAmount: number;
  winAmount: number;
  multiplier?: number;
}): void => {
  const stats = getCareerStats();
  const gameKey = params.gameId as keyof typeof stats.gameRounds;
  const safeBet = Math.max(0, params.betAmount || 0);
  const safeWin = Math.max(0, params.winAmount || 0);

  stats.totalBetsPlaced += safeBet;
  stats.totalWonAmount += safeWin;
  stats.totalRoundsPlayed += 1;
  stats.lastPlayedAt = Date.now();

  // Track rounds
  if (stats.gameRounds && stats.gameRounds[gameKey] !== undefined) {
    stats.gameRounds[gameKey] += 1;
  } else if (stats.gameRounds) {
    (stats.gameRounds as any)[gameKey] = 1;
  }

  // Track bets spent per game
  if (!stats.gameBets) {
    stats.gameBets = {
      roulette: 0,
      blackjack: 0,
      slot: 0,
      plinko: 0,
      poker: 0,
      siba: 0,
      craps: 0,
      claw: 0,
      pinball: 0,
    };
  }
  (stats.gameBets as any)[gameKey] = ((stats.gameBets as any)[gameKey] || 0) + safeBet;

  if (safeWin > stats.biggestSingleWin) {
    stats.biggestSingleWin = safeWin;
  }

  if (params.multiplier && params.multiplier > stats.biggestMultiplier) {
    stats.biggestMultiplier = params.multiplier;
  }

  // Determine favorite game based strictly on where player spent the most chips (投入金額最多的遊戲)
  const favResult = calculateFavoriteGame(stats.gameBets, stats.gameRounds);
  stats.favoriteGame = favResult.favoriteGame;
  stats.favoriteGameSpent = favResult.favoriteGameSpent;

  saveCareerStats(stats);

  // Dispatch casino_round_settled event for live spectator reactions
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('casino_round_settled', {
        detail: {
          gameId: params.gameId,
          betAmount: safeBet,
          winAmount: safeWin,
          netProfit: safeWin - safeBet,
          multiplier: params.multiplier,
          timestamp: Date.now(),
        },
      })
    );
  }
};

export const resetCareerStats = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STATS_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('casino_career_stats_updated'));
};
