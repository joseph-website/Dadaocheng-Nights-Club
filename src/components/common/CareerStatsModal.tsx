import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Flame,
  Award,
  Sparkles,
  RotateCcw,
  X,
  TrendingUp,
  Coins,
  History,
  Gamepad2,
  Calendar,
} from 'lucide-react';
import { getCareerStats, GlobalCasinoStats, resetCareerStats } from '../../utils/careerStats';
import { getPlayerCollectibles, ALL_COLLECTIBLES } from '../../utils/inventory';
import { sound } from '../../utils/audio';

interface CareerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

export const CareerStatsModal: React.FC<CareerStatsModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
}) => {
  const [stats, setStats] = useState<GlobalCasinoStats>(getCareerStats());
  const [collectiblesCount, setCollectiblesCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStats(getCareerStats());
      setCollectiblesCount(getPlayerCollectibles().length);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      setStats(getCareerStats());
      setCollectiblesCount(getPlayerCollectibles().length);
    };
    window.addEventListener('casino_career_stats_updated', handleUpdate);
    return () => window.removeEventListener('casino_career_stats_updated', handleUpdate);
  }, []);

  // ESC key listener for instant close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const gameRows = [
    { name: '歐式輪盤', icon: '🎡', count: stats.gameRounds.roulette },
    { name: '21點 (Blackjack)', icon: '♠️', count: stats.gameRounds.blackjack },
    { name: '金字塔彈珠台', icon: '🎯', count: stats.gameRounds.plinko },
    { name: '經典拉霸機', icon: '🍒', count: stats.gameRounds.slot },
    { name: '德州撲克', icon: '🃏', count: stats.gameRounds.poker },
    { name: '十八仔 (Si-bō-á)', icon: '🎲', count: stats.gameRounds.siba },
    { name: '花旗骰 (Craps)', icon: '🎲', count: stats.gameRounds.craps },
    { name: '夾娃娃機', icon: '🕹️', count: stats.gameRounds.claw },
    { name: '打彈珠', icon: '🔴', count: stats.gameRounds.pinball },
  ].sort((a, b) => b.count - a.count);

  return (
    <div
      id="modal-career-stats-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none cursor-pointer"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
      title="點擊背景空白處即可直接關閉"
    >
      <div
        id="modal-career-stats-container"
        className="w-full max-w-2xl bg-[#0d1017] border-2 border-amber-500/40 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.25),0_25px_50px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 text-stone-200 flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-gradient-to-r from-[#141824] via-[#1a2035] to-[#141824] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.5)] flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>VIP 貴賓生涯統計總覽</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono">
                  VIP CAREER STATS
                </span>
              </h3>
              <p className="text-xs text-stone-400">即時記錄所有賭桌對局、獲利高峰與珍品收集里程碑</p>
            </div>
          </div>
          <button
            id="btn-close-career-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
            title="點擊或按 ESC 關閉"
          >
            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Top 4 Core Metrics Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. 當前共享籌碼 */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-amber-500/30 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>當前籌碼庫存</span>
              </span>
              <span className="text-lg font-black text-amber-300 font-mono mt-1 drop-shadow-sm">
                ${currentBalance.toLocaleString()}
              </span>
            </div>

            {/* 2. 歷史累計投注額 */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>累計下注總量</span>
              </span>
              <span className="text-lg font-black text-stone-100 font-mono mt-1">
                ${stats.totalBetsPlaced.toLocaleString()}
              </span>
            </div>

            {/* 3. 單筆最高獲利 */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-emerald-500/30 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>歷史單局最大贏額</span>
              </span>
              <span className="text-lg font-black text-emerald-400 font-mono mt-1">
                ${stats.biggestSingleWin.toLocaleString()}
              </span>
            </div>

            {/* 4. 珍藏品收集率 */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-purple-500/30 flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>珍藏品圖鑑解鎖</span>
              </span>
              <span className="text-lg font-black text-purple-300 font-mono mt-1">
                {collectiblesCount} <span className="text-xs text-stone-500 font-normal">/ {ALL_COLLECTIBLES.length} 件</span>
              </span>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#121622] border border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-stone-400 font-bold">總遊玩總局數</p>
                <p className="text-base font-black text-white font-mono mt-0.5">
                  {stats.totalRoundsPlayed.toLocaleString()} <span className="text-xs text-stone-500 font-normal">局</span>
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <History className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121622] border border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-stone-400 font-bold">最高單筆倍率</p>
                <p className="text-base font-black text-amber-300 font-mono mt-0.5">
                  {stats.biggestMultiplier > 1 ? `${stats.biggestMultiplier}x` : '1.0x'}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-4 h-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#121622] border border-stone-800 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-stone-400 font-bold">最鍾愛熱門賭桌</p>
                <p className="text-base font-black text-amber-400 mt-0.5 truncate max-w-[120px]">
                  {stats.favoriteGame}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Gamepad2 className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Game Rounds Breakdown */}
          <div className="p-4 rounded-xl bg-[#10141e] border border-stone-800 space-y-3">
            <h4 className="text-xs font-bold text-stone-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>各項遊戲遊玩頻次分佈</span>
              </span>
              <span className="text-[10px] text-stone-500 font-mono">共 {stats.totalRoundsPlayed} 局紀錄</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {gameRows.map((g) => {
                const pct = stats.totalRoundsPlayed > 0 ? Math.round((g.count / stats.totalRoundsPlayed) * 100) : 0;
                return (
                  <div
                    key={g.name}
                    className="p-2.5 rounded-lg bg-stone-900/60 border border-stone-800/80 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-stone-300 font-medium truncate">
                        <span>{g.icon}</span>
                        <span className="truncate">{g.name}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-bold font-mono text-white">{g.count} <span className="text-[10px] text-stone-500 font-normal">局</span></span>
                      <span className="text-[10px] font-mono text-amber-400/90 font-bold">{pct}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-stone-800 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(pct, g.count > 0 ? 5 : 0))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-stone-800 bg-[#141824]/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-stone-500 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>最後遊玩時間：{new Date(stats.lastPlayedAt).toLocaleTimeString()}</span>
          </span>

          <button
            id="btn-close-career-bottom"
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all active:scale-95"
          >
            關閉總覽
          </button>
        </div>
      </div>
    </div>
  );
};
