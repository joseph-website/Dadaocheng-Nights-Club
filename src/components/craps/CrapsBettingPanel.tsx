import React, { useState } from 'react';
import { CrapsBetItem, CrapsPhase, CrapsRollResult, CrapsStats } from '../../types/craps';
import {
  Sparkles,
  Zap,
  History,
  TrendingUp,
  RefreshCw,
  XCircle,
  Copy,
  BarChart3,
  Undo2,
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface CrapsBettingPanelProps {
  balance: number;
  phase: CrapsPhase;
  point: number | null;
  selectedChip: number;
  onSelectChip: (amount: number) => void;
  currentBets: CrapsBetItem[];
  hasPreviousBets: boolean;
  isRolling: boolean;
  canUndo?: boolean;
  onUndo?: () => void;
  history: CrapsRollResult[];
  stats: CrapsStats;
  onRoll: () => void;
  onClearBets: () => void;
  onDoubleBets: () => void;
  onRebet: () => void;
  onResetStats: () => void;
  onClose?: () => void;
}

const CHIP_PRESETS = [100, 500, 1000, 5000, 10000, 25000];

// Theoretical probability distribution for 2 dice (sum 2 to 12)
const THEORETICAL_PROB: Record<number, { ways: number; pct: number }> = {
  2: { ways: 1, pct: 2.78 },
  3: { ways: 2, pct: 5.56 },
  4: { ways: 3, pct: 8.33 },
  5: { ways: 4, pct: 11.11 },
  6: { ways: 5, pct: 13.89 },
  7: { ways: 6, pct: 16.67 },
  8: { ways: 5, pct: 13.89 },
  9: { ways: 4, pct: 11.11 },
  10: { ways: 3, pct: 8.33 },
  11: { ways: 2, pct: 5.56 },
  12: { ways: 1, pct: 2.78 },
};

export const CrapsBettingPanel: React.FC<CrapsBettingPanelProps> = ({
  balance,
  phase,
  point,
  selectedChip,
  onSelectChip,
  currentBets,
  hasPreviousBets,
  isRolling,
  canUndo = false,
  onUndo,
  history,
  stats,
  onRoll,
  onClearBets,
  onDoubleBets,
  onRebet,
  onResetStats,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'log' | 'distribution'>('log');
  const totalBet = currentBets.reduce((acc, b) => acc + b.amount, 0);

  // Compute sum frequencies from history
  const sumCounts: Record<number, number> = {};
  for (let i = 2; i <= 12; i++) sumCounts[i] = 0;
  history.forEach((h) => {
    if (sumCounts[h.sum] !== undefined) {
      sumCounts[h.sum]++;
    }
  });
  const totalRecorded = history.length;

  return (
    <div className="w-full h-full flex flex-col justify-between gap-1.5 overflow-hidden">
      {/* 1. CHIP SELECTION & BET STATUS */}
      <div className="p-2 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>選擇籌碼面額 (CHIP):</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400">目前押注:</span>
            <span className="font-mono text-sm sm:text-base text-amber-400 font-black">
              ${totalBet.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Chip Buttons */}
        <div className="grid grid-cols-6 gap-1">
          {CHIP_PRESETS.map((val) => {
            const isSelected = selectedChip === val;
            const isAffordable = balance >= val;
            const isBtnDisabled = isRolling || !isAffordable;
            return (
              <button
                key={val}
                type="button"
                disabled={isBtnDisabled}
                title={!isAffordable ? `餘額不足 ($${val.toLocaleString()} > $${balance.toLocaleString()})` : undefined}
                onClick={() => {
                  if (!isAffordable) {
                    sound.playLoss();
                    return;
                  }
                  sound.playChip();
                  onSelectChip(val);
                }}
                className={`chip-btn min-h-[34px] py-1 px-0.5 rounded-lg border font-mono font-bold text-xs sm:text-sm transition-all select-none flex items-center justify-center relative ${
                  isSelected && isAffordable
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-102 font-black'
                    : !isAffordable
                    ? 'opacity-30 grayscale-[50%] bg-stone-900 border-stone-800 text-stone-500 cursor-not-allowed'
                    : 'bg-stone-900/90 text-stone-200 border-stone-800 hover:border-amber-500/40 hover:bg-stone-800 cursor-pointer'
                } ${isRolling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ${val >= 1000 ? `${val / 1000}k` : val}
                {!isAffordable && (
                  <span className="absolute -top-1 -right-0.5 px-0.5 rounded bg-rose-950 text-[8px] text-rose-300 border border-rose-500/60 font-sans">
                    不足
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Bet Utilities - Standardized 4 buttons */}
        <div className="grid grid-cols-4 gap-1 mt-0.5">
          {/* Undo Bet */}
          <button
            id="btn-craps-undo"
            type="button"
            disabled={isRolling || !canUndo}
            onClick={() => {
              sound.playClick();
              onUndo?.();
            }}
            className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
            title="撤銷上一筆下注 (快捷鍵: Z)"
          >
            <Undo2 className="w-3 h-3 text-amber-400" />
            <span>撤銷</span>
          </button>

          {/* Clear Bets */}
          <button
            id="btn-craps-clear"
            type="button"
            disabled={isRolling || totalBet === 0}
            onClick={() => {
              sound.playClick();
              onClearBets();
            }}
            className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
            title="清空所有押注 (快捷鍵: C)"
          >
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>清空</span>
          </button>

          {/* Double 2X */}
          <button
            id="btn-craps-double"
            type="button"
            disabled={isRolling || totalBet === 0 || balance < totalBet}
            onClick={() => {
              sound.playChip();
              onDoubleBets();
            }}
            className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
            title="所有下注加倍 2X (快捷鍵: X)"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>加倍 2X</span>
          </button>

          {/* Rebet */}
          <button
            id="btn-craps-rebet"
            type="button"
            disabled={isRolling || !hasPreviousBets}
            onClick={() => {
              sound.playChip();
              onRebet();
            }}
            className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
            title="重複上一輪下注 (快捷鍵: R)"
          >
            <Copy className="w-3 h-3 text-emerald-400" />
            <span>同額續注</span>
          </button>
        </div>
      </div>

      {/* 2. BIG PRIMARY ROLL BUTTON */}
      <div className="shrink-0 flex flex-col gap-1">
        <button
          id="btn-craps-roll"
          disabled={isRolling || totalBet === 0}
          onClick={onRoll}
          className={`w-full min-h-[46px] py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wider uppercase shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            isRolling
              ? 'bg-stone-800 text-amber-300 border border-amber-500/40 cursor-wait animate-pulse'
              : totalBet > 0
              ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-98'
              : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>
            {isRolling
              ? '擲骰進行中 (ROLLING)...'
              : totalBet > 0
              ? `搖骰開獎 (ROLL - $${totalBet.toLocaleString()})`
              : '請在左側檯面下注 (PLACE BETS)'}
          </span>
        </button>
      </div>

      {/* 3. DUAL-TAB PANEL: HISTORY LOG VS BELL CURVE */}
      <div className="flex-1 min-h-0 p-2 rounded-xl bg-[#0c0e14] border border-stone-800 shadow-inner flex flex-col justify-between overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-1 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                activeTab === 'log'
                  ? 'bg-stone-800 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <History className="w-3 h-3" />
              <span>開獎日誌</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('distribution')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                activeTab === 'distribution'
                  ? 'bg-stone-800 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>常態分佈</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-stone-400">
            {phase === 'come_out' ? '等待定點' : `目標: ${point}點`}
          </span>
        </div>

        {/* Recent Rolls Bead Strip (Visible in log tab) */}
        {activeTab === 'log' && history.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto py-1 border-b border-stone-800/80 scrollbar-none shrink-0">
            {history.slice(0, 10).map((h, idx) => {
              const isWin = h.event === 'natural' || h.event === 'point_hit';
              const isSevenOut = h.event === 'seven_out';
              return (
                <div
                  key={`craps-bead-${idx}-${h.id}`}
                  className={`h-6 min-w-[24px] px-1 rounded-full text-[10px] font-mono font-black border flex items-center justify-center shrink-0 shadow-xs ${
                    isWin
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/70 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : isSevenOut
                      ? 'bg-rose-950 text-rose-300 border-rose-500/70'
                      : 'bg-stone-900 text-amber-300 border-stone-700'
                  }`}
                  title={`${h.dice[0]}+${h.dice[1]}=${h.sum} (${h.eventDescription})`}
                >
                  {h.sum}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'log' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar my-1 pr-1 flex flex-col gap-1 text-xs">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-3 text-stone-500">
                <span className="text-2xl mb-1">🎲</span>
                <p className="text-xs">尚未有擲骰紀錄</p>
                <p className="text-[10px] text-stone-600">下注並點擊「搖骰開獎」開始！</p>
              </div>
            ) : (
              history.map((h) => {
                const isSevenOut = h.event === 'seven_out';
                const isNatural = h.event === 'natural';
                const isPointHit = h.event === 'point_hit';

                return (
                  <div
                    key={h.id}
                    className={`p-1.5 rounded-lg border flex flex-col gap-0.5 transition-all ${
                      isPointHit || isNatural
                        ? 'bg-emerald-950/40 border-emerald-500/40'
                        : isSevenOut
                        ? 'bg-rose-950/40 border-rose-500/40'
                        : 'bg-stone-900/60 border-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.5 rounded bg-stone-950 text-amber-300 font-black text-[11px]">
                          🎲 {h.dice[0]}+{h.dice[1]}={h.sum}
                        </span>
                        <span
                          className={`font-bold text-[10px] truncate max-w-[140px] sm:max-w-[190px] ${
                            isPointHit || isNatural
                              ? 'text-emerald-300'
                              : isSevenOut
                              ? 'text-rose-400'
                              : 'text-stone-300'
                          }`}
                        >
                          {h.eventDescription}
                        </span>
                      </div>

                      {h.totalWon > 0 && (
                        <span className="text-emerald-400 font-bold text-[11px] shrink-0 ml-1">
                          +${h.totalWon.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Dice Sum Bell Curve Histogram */
          <div className="flex-1 overflow-y-auto custom-scrollbar my-1 pr-1 flex flex-col gap-1 text-[11px]">
            <div className="p-1 rounded bg-stone-900/80 border border-stone-800 flex items-center justify-between text-[10px] text-stone-400">
              <span>點數</span>
              <span>命中次數 / 佔比 (理論值)</span>
            </div>

            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((val) => {
              const count = sumCounts[val] || 0;
              const actualPct = totalRecorded > 0 ? ((count / totalRecorded) * 100).toFixed(1) : '0.0';
              const theo = THEORETICAL_PROB[val];
              const isSeven = val === 7;
              const isHighlight = val === point;

              return (
                <div
                  key={val}
                  className={`p-1 rounded-lg border flex flex-col gap-0.5 ${
                    isHighlight
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : isSeven
                      ? 'bg-rose-950/30 border-rose-500/30'
                      : 'bg-stone-900/40 border-stone-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 text-center font-black ${
                          isHighlight ? 'text-amber-300' : isSeven ? 'text-rose-400' : 'text-stone-200'
                        }`}
                      >
                        {val}
                      </span>
                      <div className="w-20 sm:w-28 h-2 bg-stone-950 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isHighlight
                              ? 'bg-amber-400'
                              : isSeven
                              ? 'bg-rose-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (parseFloat(actualPct) / (theo.pct * 2)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-200">{count} 次</span>
                      <span className="text-[10px] text-stone-400">
                        {actualPct}% <span className="text-stone-600">({theo.pct}%)</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. BOTTOM STATS SUMMARY */}
        <div className="pt-1 border-t border-stone-800 flex items-center justify-between text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-2 text-stone-300">
            <span>總擲: <b className="text-stone-100">{stats.rolls}</b></span>
            <span>命中: <b className="text-emerald-400">{stats.pointsHit}</b></span>
            <span>7淘汰: <b className="text-rose-400">{stats.sevenOuts}</b></span>
          </div>

          <button
            type="button"
            onClick={onResetStats}
            title="重置統計"
            className="text-stone-500 hover:text-stone-300 p-0.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
