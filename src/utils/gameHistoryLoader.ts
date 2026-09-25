import { getCareerStats } from './careerStats';

export interface UniversalGameRoundRecord {
  id: string;
  roundNumber: number;
  timestamp?: number | string | Date;
  betAmount: number;
  winAmount: number;
  netProfit: number;
  resultTitle: string;
  resultDetail: string;
  badgeType: 'win' | 'loss' | 'push' | 'jackpot' | 'special';
  tags?: string[];
}

export interface GameDetailHistoryData {
  gameId: string;
  gameName: string;
  gameIcon: string;
  description: string;
  totalRounds: number;
  totalBet: number;
  totalWon: number;
  netProfit: number;
  records: UniversalGameRoundRecord[];
}

const SLOT_SYMBOL_ICONS: Record<string, string> = {
  seven: '7️⃣',
  bar: '🍫',
  bell: '🔔',
  watermelon: '🍉',
  grape: '🍇',
  lemon: '🍋',
  cherry: '🍒',
};

export function loadGameDetailHistory(gameId: string): GameDetailHistoryData {
  const career = getCareerStats();

  switch (gameId) {
    // =========================================================================
    // 1. 21點 (BLACKJACK)
    // =========================================================================
    case 'blackjack': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('casino_blackjack_recent_hands_v1') ||
          localStorage.getItem('blackjack_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const bet = h.bet || 0;
              const net = h.netProfit || 0;
              const isBJ = h.isBlackjack || h.outcome === 'player_blackjack';
              const isWin = net > 0 || h.outcome === 'player_win' || isBJ;
              const isPush = net === 0 || h.outcome === 'push';
              const won = isWin ? bet + net : isPush ? bet : 0;

              let badge: UniversalGameRoundRecord['badgeType'] = isBJ
                ? 'special'
                : isWin
                ? 'win'
                : isPush
                ? 'push'
                : 'loss';

              return {
                id: h.id || `bj-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isBJ
                  ? '♠️ Natural 21點 (Blackjack 3:2)'
                  : isWin
                  ? '🏆 贏得牌局'
                  : isPush
                  ? '🤝 平手退注'
                  : '💥 莊家勝出',
                resultDetail: `玩家: ${h.playerScore || 0} 點 vs 莊家: ${h.dealerScore || 0} 點${
                  h.dealerBusted ? ' (莊家爆牌)' : ''
                }`,
                badgeType: badge,
                tags: isBJ ? ['Blackjack'] : isPush ? ['Push 平局'] : isWin ? ['Win 獲勝'] : ['Lose 惜敗'],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      // Stats fallback if individual hand array is empty
      let bjStats: any = {};
      try {
        const rawStats = localStorage.getItem('blackjack_stats_v1');
        if (rawStats) bjStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const handsPlayed = bjStats.handsPlayed || career.gameRounds.blackjack || 0;
      const wins = bjStats.wins || 0;
      const losses = bjStats.losses || 0;
      const pushes = bjStats.pushes || 0;
      const blackjacks = bjStats.blackjacks || 0;
      const dealerBusts = bjStats.dealerBusts || 0;
      const recordedBet = bjStats.totalBet || career.gameBets.blackjack || 0;
      const recordedWon = bjStats.totalWon || 0;

      if (records.length === 0 && handsPlayed > 0) {
        records.push({
          id: 'bj-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `♠️ 生涯累計對局 ${handsPlayed} 手`,
          resultDetail: `勝場: ${wins} 勝 | 敗場: ${losses} 負 | 平手: ${pushes} 次 | 天牌 Blackjack: ${blackjacks} 次 | 莊家爆牌: ${dealerBusts} 次`,
          badgeType: wins > losses ? 'win' : 'push',
          tags: [`勝率 ${handsPlayed > 0 ? (((wins + blackjacks) / handsPlayed) * 100).toFixed(1) : 0}%`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'blackjack',
        gameName: '21點 (Blackjack)',
        gameIcon: '♠️',
        description: '標準 6 副牌真人發牌規則，支援投降、分牌、雙倍下注與保險機制。',
        totalRounds: Math.max(records.length, handsPlayed),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 2. 德州撲克 (TEXAS HOLD'EM)
    // =========================================================================
    case 'poker': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('casino_poker_history_v1') ||
          localStorage.getItem('texas_holdem_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const isPlayerWin = h.winner === 'player' || h.winner === 'ai_folded';
              const isSplit = h.winner === 'split';
              const net = h.playerNet || 0;
              const pot = h.pot || 0;
              const bet = Math.max(0, pot - net);
              const won = isPlayerWin ? pot : isSplit ? Math.floor(pot / 2) : 0;

              let badge: UniversalGameRoundRecord['badgeType'] = isPlayerWin
                ? 'win'
                : isSplit
                ? 'push'
                : 'loss';

              return {
                id: h.id || `poker-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isPlayerWin
                  ? '🎉 奪得彩池 (Pot Won)'
                  : isSplit
                  ? '🤝 平分彩池 (Split Pot)'
                  : '💀 對手勝出',
                resultDetail:
                  h.winner === 'player_folded'
                    ? '玩家蓋牌棄牌 (Player Folded)'
                    : h.winner === 'ai_folded'
                    ? '電腦蓋牌棄牌 (AI Folded)'
                    : `玩家【${h.playerHandName || '牌型'}】 vs 電腦【${h.aiHandName || '牌型'}】`,
                badgeType: badge,
                tags: [`彩池 $${pot.toLocaleString()}`, isPlayerWin ? '獲勝' : isSplit ? '平分' : '落敗'],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let pokerStats: any = {};
      try {
        const rawStats = localStorage.getItem('texas_holdem_stats_v1');
        if (rawStats) pokerStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const handsPlayed = pokerStats.handsPlayed || career.gameRounds.poker || 0;
      const handsWon = pokerStats.handsWon || 0;
      const showdownCount = pokerStats.showdownCount || 0;
      const bestHand = pokerStats.bestHand || '無紀錄';
      const recordedBet = pokerStats.totalBet || career.gameBets.poker || 0;
      const recordedWon = pokerStats.totalWon || 0;

      if (records.length === 0 && handsPlayed > 0) {
        records.push({
          id: 'poker-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `🃏 生涯累計德撲對局 ${handsPlayed} 手`,
          resultDetail: `勝場: ${handsWon} 場 | 攤牌對決: ${showdownCount} 次 | 生涯最佳牌型: 【${bestHand}】`,
          badgeType: handsWon > 0 ? 'win' : 'push',
          tags: [`勝率 ${handsPlayed > 0 ? ((handsWon / handsPlayed) * 100).toFixed(1) : 0}%`, `最佳牌型: ${bestHand}`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'poker',
        gameName: '德州撲克 (Texas Hold\'em)',
        gameIcon: '🃏',
        description: '1V1 Heads-up 無限注德州撲克對局，考驗讀牌、加注心理與詐唬技巧。',
        totalRounds: Math.max(records.length, handsPlayed),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 3. 歐式輪盤 (ROULETTE)
    // =========================================================================
    case 'roulette': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('european_roulette_history_v1') ||
          localStorage.getItem('roulette_history') ||
          localStorage.getItem('roulette_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const won = h.totalWon || 0;
              const bet = h.totalBet || 0;
              const net = h.netProfit !== undefined ? h.netProfit : won - bet;
              const isWin = net > 0;
              const isPush = net === 0 && bet > 0;
              const isSingleHit = (h.winningBets || []).some((b: any) => b.multiplier === '1:35' || b.multiplier === '35:1');

              return {
                id: h.id || `roulette-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isSingleHit
                  ? `🌟 單號直擊 35:1 大獎 (開出 ${h.number} 號)`
                  : isWin
                  ? `🎯 命中開獎號碼 ${h.number}`
                  : `⭕ 開出號碼 ${h.number}`,
                resultDetail: `開獎: ${h.number} 號 (${
                  h.color === 'red' ? '紅色' : h.color === 'black' ? '黑色' : '綠色 0'
                }) | 命中 ${h.winningBets?.length || 0} 個注區`,
                badgeType: isSingleHit ? 'special' : isWin ? 'win' : isPush ? 'push' : 'loss',
                tags: [
                  `${h.color === 'red' ? '紅' : h.color === 'black' ? '黑' : '綠'} #${h.number}`,
                  isWin ? `獲利 +$${net.toLocaleString()}` : `投注 $${bet.toLocaleString()}`,
                ],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      const rouletteRounds = career.gameRounds.roulette || 0;
      const rouletteBet = career.gameBets.roulette || 0;

      if (records.length === 0 && rouletteRounds > 0) {
        records.push({
          id: 'roulette-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: rouletteBet,
          winAmount: 0,
          netProfit: -rouletteBet,
          resultTitle: `🎡 生涯累計旋轉 ${rouletteRounds} 局`,
          resultDetail: `累計投入籌碼 $${rouletteBet.toLocaleString()} | 37 格單零歐式輪盤`,
          badgeType: 'push',
          tags: [`共 ${rouletteRounds} 局旋轉`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = rouletteBet;
        totalWon = 0;
      }

      return {
        gameId: 'roulette',
        gameName: '歐式輪盤 (European Roulette)',
        gameIcon: '🎡',
        description: '37 格單零歐式輪盤，提供單號 35:1 頂級賠率與多重外圍注區。',
        totalRounds: Math.max(records.length, rouletteRounds),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 4. 台灣十八仔 (SIBA)
    // =========================================================================
    case 'siba': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('casino_siba_history_v1') ||
          localStorage.getItem('siba_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const won = h.totalWon || 0;
              const bet = h.totalBet || 0;
              const net = h.netProfit !== undefined ? h.netProfit : won - bet;
              const isWin = net > 0;
              const catLabel =
                h.categoryLabel ||
                h.categoryName ||
                (h.points ? `${h.points} 點` : '無點');
              const isSpecial =
                h.isBG ||
                h.isEighteen ||
                h.isFourKind ||
                h.category === 'bg' ||
                h.category === 'eighteen' ||
                h.category === 'four_kind' ||
                h.points === 12;

              return {
                id: h.id || `siba-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isSpecial
                  ? `🔥 驚世牌型【${catLabel}】`
                  : isWin
                  ? `🎉 獲勝【${catLabel}】`
                  : `碗內點數【${catLabel}】`,
                resultDetail: `骰子: [${(h.dice || []).join(', ')}] | 點數判定: ${
                  h.subDescription || catLabel
                }`,
                badgeType: isSpecial ? 'special' : isWin ? 'win' : 'loss',
                tags: [catLabel, isWin ? `+${won.toLocaleString()}` : `-$${bet.toLocaleString()}`],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let sibaStats: any = {};
      try {
        const rawStats = localStorage.getItem('casino_siba_stats_v1');
        if (rawStats) sibaStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const totalRounds = sibaStats.rolls || career.gameRounds.siba || 0;
      const sibaWins = sibaStats.wins || 0;
      const bgCount = sibaStats.bgCount || 0;
      const eighteenCount = sibaStats.eighteenCount || 0;
      const fourKindCount = sibaStats.fourKindCount || 0;
      const recordedBet = sibaStats.totalBet || career.gameBets.siba || 0;
      const recordedWon = sibaStats.totalWon || 0;

      if (records.length === 0 && totalRounds > 0) {
        records.push({
          id: 'siba-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `🥣 生涯累計擲骰 ${totalRounds} 局`,
          resultDetail: `勝局: ${sibaWins} 場 | 豹子一色: ${fourKindCount} 次 | 十八點: ${eighteenCount} 次 | 逼機 (BG): ${bgCount} 次`,
          badgeType: sibaWins > 0 ? 'win' : 'push',
          tags: [`勝率 ${totalRounds > 0 ? ((sibaWins / totalRounds) * 100).toFixed(1) : 0}%`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'siba',
        gameName: '台灣十八仔 (Siba)',
        gameIcon: '🥣',
        description: '經典廟口黑陶大碗擲骰，一色豹子、十八點、比點數與通殺玩法。',
        totalRounds: Math.max(records.length, totalRounds),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 5. 美式花旗骰 (CRAPS)
    // =========================================================================
    case 'craps': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('casino_craps_history_v1') ||
          localStorage.getItem('craps_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const bet = h.totalBet || 0;
              const won = h.totalWon || 0;
              const net = h.netProfit !== undefined ? h.netProfit : won - bet;
              const isSevenOut = h.event === 'seven_out';
              const isPointHit = h.event === 'point_hit';
              const isNatural = h.event === 'natural_win' || h.event === 'natural';
              const isWin = net > 0 || isPointHit || isNatural;

              return {
                id: h.id || `craps-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isSevenOut
                  ? '💀 擲出 7 點淘汰 (Seven Out)'
                  : isPointHit
                  ? '🎯 擊中目標點數 (Point Hit)'
                  : isNatural
                  ? '🌟 Natural 7/11 贏局'
                  : `擲骰合計: ${h.sum || 0} 點`,
                resultDetail: `骰面: [${h.dice ? h.dice.join(', ') : ''}] 合計 ${h.sum || 0} 點 | ${
                  h.eventDescription || ''
                }`,
                badgeType: isWin ? 'win' : isSevenOut ? 'loss' : 'push',
                tags: [
                  `${h.sum || 0} 點`,
                  h.phaseBefore === 'come_out' ? 'Come Out 階段' : 'Point 目標階段',
                ],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let crapsStats: any = {};
      try {
        const rawStats = localStorage.getItem('casino_craps_stats_v1');
        if (rawStats) crapsStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const totalRolls = crapsStats.rolls || career.gameRounds.craps || 0;
      const pointsHit = crapsStats.pointsHit || 0;
      const sevenOuts = crapsStats.sevenOuts || 0;
      const naturals = crapsStats.naturals || 0;
      const recordedBet = crapsStats.totalBet || career.gameBets.craps || 0;
      const recordedWon = crapsStats.totalWon || 0;

      if (records.length === 0 && totalRolls > 0) {
        records.push({
          id: 'craps-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `🎲 生涯累計投骰 ${totalRolls} 次`,
          resultDetail: `目標命中: ${pointsHit} 次 | 7點淘汰: ${sevenOuts} 次 | Natural 贏局: ${naturals} 次`,
          badgeType: pointsHit > 0 || naturals > 0 ? 'win' : 'push',
          tags: [`命中率 ${totalRolls > 0 ? (((pointsHit + naturals) / totalRolls) * 100).toFixed(1) : 0}%`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'craps',
        gameName: '美式花旗骰 (Craps)',
        gameIcon: '🎲',
        description: '真實雙骰物理碰撞，體驗 Pass Line、Come Out 與目標點數的激烈博弈。',
        totalRounds: Math.max(records.length, totalRolls),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 6. 金字塔彈珠台 (PLINKO)
    // =========================================================================
    case 'plinko': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw =
          localStorage.getItem('plinko_history_v2') ||
          localStorage.getItem('plinko_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const bet = h.bet || 0;
              const won = h.payout || 0;
              const net = won - bet;
              const mult = h.multiplier || 1;
              const isJackpot = mult >= 10;
              const isWin = net > 0;

              return {
                id: h.id || `plinko-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isJackpot
                  ? `🔥 驚喜高倍率 ${mult}x`
                  : isWin
                  ? `🎉 命中 ${mult}x 賠率槽`
                  : `落入 ${mult}x 槽`,
                resultDetail: `投注 $${bet.toLocaleString()} ➔ 獲得 $${won.toLocaleString()} (倍率 ${mult}x)`,
                badgeType: isJackpot ? 'jackpot' : isWin ? 'win' : 'loss',
                tags: [`${mult}x 倍率`, isWin ? `+${won.toLocaleString()}` : `-$${bet.toLocaleString()}`],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let plinkoStats: any = {};
      try {
        const rawStats = localStorage.getItem('plinko_stats_v2');
        if (rawStats) plinkoStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const totalDrops = plinkoStats.totalDrops || career.gameRounds.plinko || 0;
      const maxMultiplier = plinkoStats.maxMultiplier || 1;
      const winsCount = plinkoStats.wins || 0;
      const recordedBet = plinkoStats.totalWagered || career.gameBets.plinko || 0;
      const recordedWon = plinkoStats.totalWon || 0;

      if (records.length === 0 && totalDrops > 0) {
        records.push({
          id: 'plinko-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `🎯 生涯累計落球 ${totalDrops} 顆`,
          resultDetail: `歷史最高乘數: ${maxMultiplier}x | 盈利次數: ${winsCount} 次 | 累計投球 $${recordedBet.toLocaleString()}`,
          badgeType: maxMultiplier >= 10 ? 'jackpot' : 'win',
          tags: [`最高 ${maxMultiplier}x`, `共 ${totalDrops} 顆落球`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'plinko',
        gameName: '金字塔彈珠台 (Plinko)',
        gameIcon: '🎯',
        description: '高動態隨機物理偏轉落球釘盤，兩側邊緣蘊藏千倍極限大獎。',
        totalRounds: Math.max(records.length, totalDrops),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 7. 夜行拉霸機 (SLOT MACHINE)
    // =========================================================================
    case 'slot': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw = localStorage.getItem('casino_slot_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const bet = h.bet || 0;
              const won = h.winAmount || 0;
              const net = won - bet;
              const isJackpot = h.isJackpot || h.multiplier >= 20;
              const isWin = h.isWin || won > 0;
              const reelIcons = (h.reels || []).map((r: string) => SLOT_SYMBOL_ICONS[r] || r).join(' ');

              return {
                id: h.id || `slot-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: bet,
                winAmount: won,
                netProfit: net,
                resultTitle: isJackpot
                  ? `👑 黃金頭獎 Jackpot (${h.multiplier || 50}x)`
                  : isWin
                  ? `🎉 ${h.title || '旋轉中獎'} (${h.multiplier || 1}x)`
                  : '🍒 旋轉未中獎',
                resultDetail: `輪盤圖案: [ ${reelIcons || '🍒 🍋 🍉'} ] | ${
                  h.description || (isWin ? `獲得 $${won.toLocaleString()}` : `投注 $${bet.toLocaleString()}`)
                }`,
                badgeType: isJackpot ? 'jackpot' : isWin ? 'win' : 'loss',
                tags: [`${h.multiplier || 0}x`, isWin ? `+${won.toLocaleString()}` : `-$${bet.toLocaleString()}`],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let slotStats: any = {};
      try {
        const rawStats = localStorage.getItem('casino_slot_stats_v1');
        if (rawStats) slotStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const totalSpins = slotStats.spins || career.gameRounds.slot || 0;
      const totalWins = slotStats.wins || 0;
      const jackpots = slotStats.jackpots || 0;
      const highestWin = slotStats.highestWin || 0;
      const recordedBet = slotStats.totalBet || career.gameBets.slot || 0;
      const recordedWon = slotStats.totalWon || 0;

      if (records.length === 0 && totalSpins > 0) {
        records.push({
          id: 'slot-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedBet,
          winAmount: recordedWon,
          netProfit: recordedWon - recordedBet,
          resultTitle: `🍒 生涯累計旋轉 ${totalSpins} 次`,
          resultDetail: `中獎次數: ${totalWins} 次 | 大獎 Jackpot: ${jackpots} 次 | 單局最高贏額: $${highestWin.toLocaleString()}`,
          badgeType: jackpots > 0 ? 'jackpot' : 'win',
          tags: [`中獎率 ${totalSpins > 0 ? ((totalWins / totalSpins) * 100).toFixed(1) : 0}%`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedBet;
        totalWon = recordedWon;
      }

      return {
        gameId: 'slot',
        gameName: '夜行拉霸機 (Slot Machine)',
        gameIcon: '🍒',
        description: '3 軸 5 線經典夜行霓虹拉霸機，支援自動旋轉與黃金 Jackpot。',
        totalRounds: Math.max(records.length, totalSpins),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    // =========================================================================
    // 8. 夜行夾娃娃機 (CLAW MACHINE)
    // =========================================================================
    case 'claw': {
      let records: UniversalGameRoundRecord[] = [];
      let totalBet = 0;
      let totalWon = 0;

      try {
        const raw = localStorage.getItem('casino_claw_history_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            records = parsed.map((h: any, idx: number) => {
              const cost = h.cost || 100;
              const prizeVal = h.prizeValue || 0;
              const net = prizeVal - cost;
              const isWin = h.isWin || prizeVal > 0;

              return {
                id: h.id || `claw-${idx}`,
                roundNumber: parsed.length - idx,
                timestamp: h.timestamp || Date.now(),
                betAmount: cost,
                winAmount: prizeVal,
                netProfit: net,
                resultTitle: h.resultTitle || (isWin ? `🎯 成功夾取【${h.toyName || '公仔'}】` : '💨 未能夾取'),
                resultDetail:
                  h.resultDetail ||
                  (isWin
                    ? `獲得兌幣券【${h.prizeName || '兌幣券'}】($${prizeVal.toLocaleString()} 籌碼)`
                    : '投幣 $100 下爪'),
                badgeType: isWin ? 'win' : 'loss',
                tags: [h.prizeName || (isWin ? '夾中獲獎' : '投幣操作')],
              };
            });
          }
        }
      } catch {
        // ignore
      }

      let clawStats: any = {};
      try {
        const rawStats = localStorage.getItem('casino_claw_stats_v1');
        if (rawStats) clawStats = JSON.parse(rawStats);
      } catch {
        // ignore
      }

      const totalPlays = clawStats.plays || career.gameRounds.claw || 0;
      const clawWins = clawStats.wins || 0;
      const clawMisses = clawStats.misses || 0;
      const recordedValue = clawStats.totalValueWon || 0;
      const recordedCost = totalPlays * 100 || career.gameBets.claw || 0;

      if (records.length === 0 && totalPlays > 0) {
        records.push({
          id: 'claw-summary-overview',
          roundNumber: 1,
          timestamp: Date.now(),
          betAmount: recordedCost,
          winAmount: recordedValue,
          netProfit: recordedValue - recordedCost,
          resultTitle: `🕹️ 生涯累計投幣 ${totalPlays} 次`,
          resultDetail: `成功夾中: ${clawWins} 次 | 失誤滑落: ${clawMisses} 次 | 累計贏取兌換價值 $${recordedValue.toLocaleString()}`,
          badgeType: clawWins > 0 ? 'win' : 'special',
          tags: [`成功率 ${totalPlays > 0 ? ((clawWins / totalPlays) * 100).toFixed(1) : 0}%`],
        });
      }

      if (records.length > 0) {
        records.forEach((r) => {
          totalBet += r.betAmount;
          totalWon += r.winAmount;
        });
      } else {
        totalBet = recordedCost;
        totalWon = recordedValue;
      }

      return {
        gameId: 'claw',
        gameName: '夜行夾娃娃機 (Claw Machine)',
        gameIcon: '🕹️',
        description: '實體街機物理爪力抓取，可抓取籌碼換幣券、幸運金蛋與絕版賭桌珍品。',
        totalRounds: Math.max(records.length, totalPlays),
        totalBet,
        totalWon,
        netProfit: totalWon - totalBet,
        records,
      };
    }

    default:
      return {
        gameId,
        gameName: '賭桌對局',
        gameIcon: '🎰',
        description: '大稻賭埕之夜經典娛樂項目。',
        totalRounds: 0,
        totalBet: 0,
        totalWon: 0,
        netProfit: 0,
        records: [],
      };
  }
}
