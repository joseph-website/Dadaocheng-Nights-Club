import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import {
  Trophy,
  Flame,
  Award,
  Sparkles,
  RotateCcw,
  Camera,
  Coins,
  TrendingUp,
  Gem,
  Gamepad2,
  Layers,
  ArrowDownCircle,
  Heart,
  ScrollText,
  ChevronRight,
} from 'lucide-react';
import { getCareerStats, GlobalCasinoStats } from '../../utils/careerStats';
import { getPlayerCollectibles, ALL_COLLECTIBLES } from '../../utils/inventory';
import { CollectibleItem } from '../../types/inventory';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { GameHistoryDetailModal } from './GameHistoryDetailModal';

interface GameOverModalProps {
  isOpen: boolean;
  onRestart: () => void;
  finalBalance?: number;
}

interface TableDetailedStat {
  gameId: string;
  name: string;
  icon: string;
  primaryStatLabel: string;
  primaryStatValue: string;
  secondaryStatLabel: string;
  secondaryStatValue: string;
  extraInfo: string;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onRestart,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stats, setStats] = useState<GlobalCasinoStats>(getCareerStats());
  const [collectibles, setCollectibles] = useState<CollectibleItem[]>([]);
  const [tableStats, setTableStats] = useState<TableDetailedStat[]>([]);
  const [selectedGameForHistory, setSelectedGameForHistory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      sound.playLoss();
      const currentStats = getCareerStats();
      setStats(currentStats);
      const playerItems = getPlayerCollectibles();
      setCollectibles(playerItems);

      // Collect specific detailed stats from localStorage for each active table
      const detailed: TableDetailedStat[] = [];

      // 1. 21點 (Blackjack)
      try {
        const bjRaw = localStorage.getItem('blackjack_stats_v1');
        if (bjRaw) {
          const bj = JSON.parse(bjRaw);
          const total = (bj.wins || 0) + (bj.losses || 0) + (bj.pushes || 0) || currentStats.gameRounds.blackjack || 0;
          const winRate = total > 0 ? (((bj.wins || 0) / total) * 100).toFixed(1) + '%' : '0.0%';
          detailed.push({
            gameId: 'blackjack',
            name: '21點 (Blackjack)',
            icon: '♠️',
            primaryStatLabel: '對局',
            primaryStatValue: `${total} 局`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: winRate,
            extraInfo: `天牌: ${bj.blackjacks || 0}次 | 勝場: ${bj.wins || 0}勝`,
          });
        } else {
          detailed.push({
            gameId: 'blackjack',
            name: '21點 (Blackjack)',
            icon: '♠️',
            primaryStatLabel: '對局',
            primaryStatValue: `${currentStats.gameRounds.blackjack || 0} 局`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: '--',
            extraInfo: '標準廿一點對局',
          });
        }
      } catch {
        // ignore
      }

      // 2. 德州撲克 (Texas Hold'em)
      try {
        const pokerRaw = localStorage.getItem('texas_holdem_stats_v1');
        if (pokerRaw) {
          const poker = JSON.parse(pokerRaw);
          const hands = poker.handsPlayed || currentStats.gameRounds.poker || 0;
          const wins = poker.handsWon || 0;
          const winRate = hands > 0 ? (((wins || 0) / hands) * 100).toFixed(1) + '%' : '0.0%';
          detailed.push({
            gameId: 'poker',
            name: '德州撲克 1V1',
            icon: '🃏',
            primaryStatLabel: '手數',
            primaryStatValue: `${hands} 手`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: winRate,
            extraInfo: `勝局: ${wins}場 | 攤牌對決: ${poker.showdownCount || 0}次`,
          });
        } else {
          detailed.push({
            gameId: 'poker',
            name: '德州撲克 1V1',
            icon: '🃏',
            primaryStatLabel: '手數',
            primaryStatValue: `${currentStats.gameRounds.poker || 0} 手`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: '--',
            extraInfo: '經典無限注德撲',
          });
        }
      } catch {
        // ignore
      }

      // 3. 台灣十八仔 (Siba)
      try {
        const sibaRaw = localStorage.getItem('casino_siba_stats_v1');
        if (sibaRaw) {
          const siba = JSON.parse(sibaRaw);
          const rounds = siba.rounds || currentStats.gameRounds.siba || 0;
          const wins = siba.wins || 0;
          const winRate = rounds > 0 ? (((wins || 0) / rounds) * 100).toFixed(1) + '%' : '0.0%';
          detailed.push({
            gameId: 'siba',
            name: '台灣十八仔',
            icon: '🥣',
            primaryStatLabel: '局數',
            primaryStatValue: `${rounds} 局`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: winRate,
            extraInfo: `勝局: ${wins}場 | 豹子/十八點通殺`,
          });
        } else {
          detailed.push({
            gameId: 'siba',
            name: '台灣十八仔',
            icon: '🥣',
            primaryStatLabel: '局數',
            primaryStatValue: `${currentStats.gameRounds.siba || 0} 局`,
            secondaryStatLabel: '勝率',
            secondaryStatValue: '--',
            extraInfo: '經典廟口擲骰',
          });
        }
      } catch {
        // ignore
      }

      // 4. 美式花旗骰 (Craps)
      try {
        const crapsRaw = localStorage.getItem('casino_craps_stats_v1');
        if (crapsRaw) {
          const craps = JSON.parse(crapsRaw);
          const rolls = craps.rolls || currentStats.gameRounds.craps || 0;
          const pointsHit = craps.pointsHit || 0;
          detailed.push({
            gameId: 'craps',
            name: '美式花旗骰',
            icon: '🎲',
            primaryStatLabel: '投骰',
            primaryStatValue: `${rolls} 次`,
            secondaryStatLabel: '目標命中',
            secondaryStatValue: `${pointsHit} 次`,
            extraInfo: `7點淘汰: ${craps.sevenOuts || 0}次 | 免佣雙骰`,
          });
        } else {
          detailed.push({
            gameId: 'craps',
            name: '美式花旗骰',
            icon: '🎲',
            primaryStatLabel: '投骰',
            primaryStatValue: `${currentStats.gameRounds.craps || 0} 次`,
            secondaryStatLabel: '目標命中',
            secondaryStatValue: '0 次',
            extraInfo: '美式雙骰對局',
          });
        }
      } catch {
        // ignore
      }

      // 5. 歐式輪盤 (Roulette)
      const rRounds = currentStats.gameRounds.roulette || 0;
      detailed.push({
        gameId: 'roulette',
        name: '歐式輪盤',
        icon: '🎡',
        primaryStatLabel: '下注',
        primaryStatValue: `${rRounds} 局`,
        secondaryStatLabel: '頂級賠率',
        secondaryStatValue: '35 : 1',
        extraInfo: '37格單零軌道 | 多區佈局',
      });

      // 6. 夜行拉霸機 (Slot) - Display Spins, Wins, Max Multiplier (Not Win Rate!)
      try {
        const slotRaw = localStorage.getItem('casino_slot_stats_v1');
        if (slotRaw) {
          const slot = JSON.parse(slotRaw);
          const spins = slot.spins || currentStats.gameRounds.slot || 0;
          const wins = slot.wins || 0;
          detailed.push({
            gameId: 'slot',
            name: '夜行拉霸機',
            icon: '🍒',
            primaryStatLabel: '旋轉',
            primaryStatValue: `${spins} 次`,
            secondaryStatLabel: '最高乘數',
            secondaryStatValue: `${slot.maxMultiplier || 1}x`,
            extraInfo: `中獎次數: ${wins}次 | Jackpot: ${slot.jackpotCount || 0}次`,
          });
        } else {
          detailed.push({
            gameId: 'slot',
            name: '夜行拉霸機',
            icon: '🍒',
            primaryStatLabel: '旋轉',
            primaryStatValue: `${currentStats.gameRounds.slot || 0} 次`,
            secondaryStatLabel: '最高乘數',
            secondaryStatValue: '1x',
            extraInfo: '經典狂歡拉霸',
          });
        }
      } catch {
        // ignore
      }

      // 7. 金字塔彈珠台 (Plinko) - Multiplier Physics (Not Win Rate!)
      try {
        const plinkoRaw = localStorage.getItem('plinko_stats_v2');
        if (plinkoRaw) {
          const plinko = JSON.parse(plinkoRaw);
          const drops = plinko.drops || currentStats.gameRounds.plinko || 0;
          detailed.push({
            gameId: 'plinko',
            name: '金字塔彈珠台',
            icon: '🎯',
            primaryStatLabel: '落球',
            primaryStatValue: `${drops} 顆`,
            secondaryStatLabel: '歷史最高',
            secondaryStatValue: `${plinko.maxMultiplier || 1}x`,
            extraInfo: '物理釘盤隨機碰撞偏轉',
          });
        } else {
          detailed.push({
            gameId: 'plinko',
            name: '金字塔彈珠台',
            icon: '🎯',
            primaryStatLabel: '落球',
            primaryStatValue: `${currentStats.gameRounds.plinko || 0} 顆`,
            secondaryStatLabel: '最高乘數',
            secondaryStatValue: '1x',
            extraInfo: '物理彈珠掉落',
          });
        }
      } catch {
        // ignore
      }

      // 8. 夾娃娃機 (Claw) - Arcade retrieval (Not Win Rate!)
      const clawRounds = currentStats.gameRounds.claw || 0;
      detailed.push({
        gameId: 'claw',
        name: '夜行夾娃娃機',
        icon: '🕹️',
        primaryStatLabel: '操作',
        primaryStatValue: `${clawRounds} 局`,
        secondaryStatLabel: '機台屬性',
        secondaryStatValue: '實體街機',
        extraInfo: '實體物理抓取兌幣券與金蛋',
      });

      // 9. 夜市打彈珠 (Traditional Pinball)
      const pinballRounds = currentStats.gameRounds.pinball || 0;
      detailed.push({
        gameId: 'pinball',
        name: '夜市打彈珠',
        icon: '🔴',
        primaryStatLabel: '彈射',
        primaryStatValue: `${pinballRounds} 局`,
        secondaryStatLabel: '機台屬性',
        secondaryStatValue: '懷舊童玩',
        extraInfo: '經典木台彈珠 • 彈珠數量永久保留',
      });

      setTableStats(detailed);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Total value of player collection
  const totalCollectionValue = collectibles.reduce((acc, item) => acc + (item.basePrice || 0), 0);

  // Derive player honorific title
  const getPlayerTitle = () => {
    const totalRounds = stats.totalRoundsPlayed;
    const itemsCount = collectibles.length;
    const maxWin = stats.biggestSingleWin;

    if (maxWin >= 100000 || itemsCount >= 18) return '👑 傳奇大稻至尊賭神';
    if (maxWin >= 40000 || itemsCount >= 10) return '💎 大稻賭埕大豪客';
    if (totalRounds >= 35 || itemsCount >= 5) return '🌟 精明老練投機家';
    if (totalRounds >= 12 || itemsCount >= 2) return '🎲 熱血冒險常勝客';
    return '🌱 勇於探秘的初生代賭徒';
  };

  // High-fidelity screenshot handler using html-to-image
  const handleSaveScreenshot = async () => {
    if (!reportRef.current || isCapturing) return;
    setIsCapturing(true);
    sound.playWin();

    try {
      await new Promise((r) => setTimeout(r, 150));

      const dataUrl = await toPng(reportRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#07090e',
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `Dadao_Casino_Career_Report_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();

      toastService.success('📸 大稻賭埕之夜生涯結算報告已成功下載保存！');
    } catch (err) {
      console.error('Screenshot generation failed', err);
      toastService.error('截圖保存失敗，請重試');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div
      id="modal-game-over-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/92 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 select-none overflow-hidden"
    >
      <div
        id="modal-game-over-container"
        className="w-full max-w-4xl bg-[#080b11] border-2 border-amber-500/60 rounded-2xl sm:rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.3),0_30px_80px_rgba(0,0,0,0.98)] overflow-hidden flex flex-col max-h-[94vh] text-stone-200"
      >
        {/* Printable Report Viewport - Dense, Single-Screen Layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-5 space-y-2.5 sm:space-y-3" ref={reportRef}>
          {/* Certificate Header Banner */}
          <div className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-gradient-to-r from-[#1c070a] via-[#121620] to-[#1c070a] border border-amber-500/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-500" />

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-red-950 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.5)] shrink-0 flex items-center justify-center">
                <div className="w-full h-full bg-[#090c13] rounded-[10px] flex items-center justify-center text-2xl">
                  🎭
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-0.5">
                  <span className="px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 text-[9px] sm:text-[10px] font-black tracking-wider uppercase font-mono">
                    STAGE FINALE &bull; 終場結算
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">
                    {new Date().toLocaleDateString('zh-TW')}
                  </span>
                </div>
                <h1 className="text-base sm:text-xl font-black text-amber-200 tracking-wide">
                  大稻賭埕之夜 &bull; 賭王生涯結算報告
                </h1>
                <p className="text-[11px] sm:text-xs text-stone-300 font-medium">
                  榮譽封號：<strong className="text-amber-400 font-black">{getPlayerTitle()}</strong>
                </p>
              </div>
            </div>

            {/* Most Loved Game (花最多籌碼的遊戲) */}
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-b from-rose-950/40 via-stone-900/90 to-stone-950/90 border border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] text-center sm:text-right shrink-0 min-w-[155px]">
              <span className="text-[10px] text-rose-300 font-bold uppercase tracking-wider flex items-center justify-center sm:justify-end gap-1 mb-0.5">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/80" />
                最熱愛遊戲
              </span>
              <div className="flex flex-col items-center sm:items-end">
                <span className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-amber-300 drop-shadow truncate">
                  {stats.favoriteGame || '尚無投注紀錄'}
                </span>
                <span className="text-[10px] font-mono text-stone-400">
                  投入籌碼: <strong className="text-amber-300 font-bold">{(stats.favoriteGameSpent || 0).toLocaleString()}</strong> 點
                </span>
              </div>
            </div>
          </div>

          {/* 4 Big Highlight Metrics Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>生涯總支出籌碼</span>
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-stone-100 mt-0.5">
                {stats.totalBetsPlaced.toLocaleString()} 點
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>單局最高贏額</span>
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-emerald-400 mt-0.5">
                {stats.biggestSingleWin.toLocaleString()} 點
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>總對局輪數</span>
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-amber-300 mt-0.5">
                {stats.totalRoundsPlayed} <span className="text-[10px] text-stone-500 font-normal">輪</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-stone-900/80 border border-purple-500/30 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Gem className="w-3.5 h-3.5 text-purple-400" />
                <span>珍藏品總估值</span>
              </span>
              <span className="text-sm sm:text-base font-mono font-black text-purple-300 mt-0.5">
                {totalCollectionValue.toLocaleString()} 點
              </span>
            </div>
          </div>

          {/* 8 Active Table Game Breakdown Matrix (Compact 4x2 Grid) */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-stone-950/70 border border-stone-800 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>各大賭桌實戰戰績一覽 (點擊卡片可展開對局歷史)</span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">
                最常光顧: <strong className="text-amber-400">{stats.favoriteGame}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-2">
              {tableStats.map((table) => (
                <div
                  key={table.gameId}
                  id={`card-settlement-table-${table.gameId}`}
                  onClick={() => {
                    sound.playClick();
                    setSelectedGameForHistory(table.gameId);
                  }}
                  className="p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/90 flex flex-col justify-between gap-1.5 hover:border-amber-500/70 hover:bg-stone-850 hover:shadow-[0_0_20px_rgba(245,158,11,0.18)] transition-all cursor-pointer group select-none relative overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
                        {table.icon}
                      </span>
                      <span className="text-xs font-bold text-stone-100 group-hover:text-amber-200 transition-colors truncate">
                        {table.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-amber-300 shrink-0">
                      {table.primaryStatValue}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-stone-800/60 pt-1">
                    <span className="text-stone-400">{table.secondaryStatLabel}:</span>
                    <span className="text-emerald-400 font-bold">{table.secondaryStatValue}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-stone-500 group-hover:text-stone-300 pt-0.5 border-t border-stone-800/40">
                    <span className="truncate">{table.extraInfo}</span>
                    <span className="shrink-0 flex items-center gap-0.5 text-amber-400 font-bold ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <span>對局明細</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Collectibles Showcase */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-stone-950/70 border border-purple-500/30 flex flex-col gap-1.5">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>
                  珍藏品圖鑑 ({collectibles.length} / {ALL_COLLECTIBLES.length} 件 &bull; 收集率{' '}
                  {((collectibles.length / ALL_COLLECTIBLES.length) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            {collectibles.length === 0 ? (
              <div className="py-2 text-center text-stone-500 text-[11px]">
                尚未解鎖任何賭桌珍品。在各大賭桌達成特殊觸發條件或夾娃娃即可收集！
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                {collectibles.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="p-1.5 rounded-lg bg-stone-900/80 border border-purple-500/20 flex items-center gap-1.5 min-w-0"
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-stone-200 truncate">{item.name}</div>
                      <div className="text-[9px] text-purple-400 font-mono truncate">
                        {item.basePrice.toLocaleString()} 點
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer - Always Visible & Pinned */}
        <div className="p-2.5 sm:p-3.5 bg-stone-950 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[10px] sm:text-xs text-stone-400 text-center sm:text-left">
            感謝蒞臨大稻賭埕之夜！點擊「截圖保存」留存榮耀戰績，或「重新開始」重獲 20,000 點啟動資金！
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Screenshot Button */}
            <button
              id="btn-game-over-screenshot"
              type="button"
              disabled={isCapturing}
              onClick={handleSaveScreenshot}
              className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-600 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCapturing ? '生成中...' : '📸 截圖保存戰績'}</span>
            </button>

            {/* Restart Button */}
            <button
              id="btn-game-over-restart"
              type="button"
              onClick={() => {
                sound.playWin();
                onRestart();
              }}
              className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs tracking-wide shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>🔄 重新開始 (領取 20,000 點)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Game History Detail Modal */}
      <GameHistoryDetailModal
        isOpen={!!selectedGameForHistory}
        gameId={selectedGameForHistory}
        onClose={() => setSelectedGameForHistory(null)}
      />
    </div>
  );
};
