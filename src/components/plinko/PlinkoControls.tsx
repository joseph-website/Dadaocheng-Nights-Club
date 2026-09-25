import React from 'react';
import { Play, Square, Zap, Layers, Coins, AlertCircle, CircleDot, ShoppingCart } from 'lucide-react';
import { PlinkoStats, PLINKO_MULTIPLIERS } from '../../types/plinko';
import { sound } from '../../utils/audio';

export interface BallPackage {
  balls: number;
  cost: number;
  label: string;
  discount?: string;
}

export const BALL_PACKAGES: BallPackage[] = [
  { balls: 10, cost: 500, label: '買10球', discount: '' },
  { balls: 20, cost: 950, label: '買20球', discount: '省50' },
  { balls: 50, cost: 2250, label: '買50球', discount: '省250' },
  { balls: 100, cost: 4200, label: '買100球', discount: '省800' },
];

interface PlinkoControlsProps {
  balance: number;
  ballsCount: number;
  onBuyBalls: (pkg: BallPackage) => void;
  onDropBall: () => void;
  isAutoDropping: boolean;
  isAutoSessionActive?: boolean;
  onToggleAutoDrop: (mode?: 'toggle' | 'all' | 10 | 50) => void;
  autoDropTarget: number | 'all';
  remainingAutoDrops: number;
  stats: PlinkoStats;
  onResetStats: () => void;
  onClose?: () => void;
}

export const PlinkoControls: React.FC<PlinkoControlsProps> = ({
  balance,
  ballsCount,
  onBuyBalls,
  onDropBall,
  isAutoDropping,
  isAutoSessionActive = false,
  onToggleAutoDrop,
  autoDropTarget,
  remainingAutoDrops,
  stats,
  onResetStats,
  onClose,
}) => {
  const isSessionBusy = isAutoDropping || isAutoSessionActive;
  const winRate = stats.totalDrops > 0 ? Math.round((stats.wins / stats.totalDrops) * 100) : 0;
  const netProfit = stats.totalWon - stats.totalWagered;
  const hasBalls = ballsCount > 0;

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 gap-2.5 overflow-y-auto custom-scrollbar select-none bg-stone-950/85 rounded-2xl border-2 border-stone-800/80 shadow-2xl">
      {/* 1. BALL INVENTORY & CHIP BALANCE & PURCHASE PACKAGES */}
      <div className="p-3.5 rounded-xl bg-stone-900/95 border border-stone-800 shadow-md flex flex-col gap-3 shrink-0">
        {/* Row 1: Left = 目前持有球數, Right = 持有籌碼總額 (加大尺寸) */}
        <div className="flex items-center justify-between pb-1 border-b border-stone-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-inner">
              <CircleDot className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-stone-400 block leading-tight font-medium">目前持有球數</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-1 py-0.2 rounded font-medium">離場保留</span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-amber-400 text-2xl sm:text-3xl leading-none">
                  {ballsCount.toLocaleString()}
                </span>
                <span className="text-xs text-stone-400 font-bold">顆</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 mb-0.5 text-stone-400">
              <Coins className="w-3.5 h-3.5 text-amber-400/80" />
              <span className="text-xs font-medium">持有籌碼總額</span>
            </div>
            <span className="font-mono font-black text-stone-100 text-lg sm:text-xl">
              ${balance.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Row 2: Purchase Buttons (2-cols on mobile for comfortable touch targets, 4-cols on tablet/desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BALL_PACKAGES.map((pkg) => {
            const canAfford = balance >= pkg.cost;
            return (
              <button
                key={pkg.balls}
                disabled={!canAfford}
                onClick={() => {
                  sound.playChip();
                  onBuyBalls(pkg);
                }}
                className={`min-h-[48px] py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border relative overflow-hidden touch-manipulation ${
                  canAfford
                    ? 'bg-gradient-to-b from-stone-900 to-stone-950 hover:from-amber-950/40 hover:to-stone-900 text-stone-200 border-stone-700/80 hover:border-amber-500/70 shadow-sm active:scale-95'
                    : 'bg-stone-950/60 text-stone-600 border-stone-900 cursor-not-allowed opacity-50'
                }`}
                title={`以 $${pkg.cost.toLocaleString()} 購買 ${pkg.balls} 顆彈珠${pkg.discount ? ` (${pkg.discount})` : ''}`}
              >
                {pkg.discount && (
                  <span className="absolute -top-0.5 right-0 text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-bl-md leading-tight">
                    {pkg.discount}
                  </span>
                )}
                <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3 text-amber-400/80 shrink-0 inline" />
                  {pkg.label}
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-300">
                  ${pkg.cost.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MULTIPLIER PAYOUT SUMMARY TABLE (說明改為基本價50元/球) */}
      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 shadow-md flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
          <span className="text-stone-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>11 軌分牌槽回饋 (基本價$50/球)</span>
          </span>
          <span className="font-mono text-xs sm:text-sm text-amber-400 font-black">
            最高 $5,000
          </span>
        </div>

        {/* Multiplier distribution row with responsive scroll guard */}
        <div className="w-full overflow-x-auto scrollbar-none touch-pan-x">
          <div className="grid grid-cols-11 gap-0.5 text-center min-w-[280px]">
            {PLINKO_MULTIPLIERS.map((m, idx) => {
              const isJackpot = m >= 100;
              const isHigh = m >= 7 && m < 100;
              const isMid = m >= 0.7 && m < 7;
              const payoutPts = Math.round(50 * m);
              return (
                <div
                  key={idx}
                  className={`py-1.5 rounded-lg flex flex-col items-center justify-center border text-[9px] sm:text-[10px] font-mono font-black ${
                    isJackpot
                      ? 'bg-rose-950 text-rose-200 border-rose-500'
                      : isHigh
                      ? 'bg-amber-950 text-amber-200 border-amber-500/70'
                      : isMid
                      ? 'bg-stone-900 text-stone-300 border-stone-800'
                      : 'bg-stone-950 text-stone-500 border-stone-900'
                  }`}
                  title={`落入倍率 ${m}x，回饋 $${payoutPts.toLocaleString()} 籌碼`}
                >
                  <span>{m}x</span>
                  <span className="text-[8px] opacity-75">${payoutPts}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. AUTO-DROP (連續投球) SWITCH CONTROLS */}
      <div className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 shadow-md flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-200 min-h-[24px]">
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>連續投球 (Auto-Drop)</span>
          </span>
          {isAutoDropping ? (
            <span className="text-xs font-mono text-amber-400 animate-pulse font-bold">
              {remainingAutoDrops > 0
                ? `進行中 (剩餘 ${remainingAutoDrops} 顆)`
                : '持續投球中'}
            </span>
          ) : (
            <span className="text-xs font-mono text-stone-400">
              基本價 $50/球
            </span>
          )}
        </div>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {([
            { target: 10 as const, id: 'btn-auto-10', label: '連投 10 顆', subLabel: '10 顆彈珠', stopLabel: '停止 (10顆)', activeTextClass: 'text-stone-300' },
            { target: 50 as const, id: 'btn-auto-50', label: '連投 50 顆', subLabel: '50 顆彈珠', stopLabel: '停止 (50顆)', activeTextClass: 'text-stone-300' },
            { target: 'all' as const, id: 'btn-auto-infinite', label: '全部連投', subLabel: ballsCount > 0 ? `現有 ${ballsCount} 顆` : '持續投球', stopLabel: '停止全部', activeTextClass: 'text-amber-400 font-bold' },
          ]).map((mode) => {
            const isTargetActive = isSessionBusy && autoDropTarget === mode.target;
            const isDisabled = (isSessionBusy && (!isAutoDropping || autoDropTarget !== mode.target)) || (!isSessionBusy && ballsCount < 1);

            return (
              <button
                key={mode.id}
                id={mode.id}
                disabled={isDisabled}
                onClick={() => onToggleAutoDrop(isSessionBusy ? 'toggle' : mode.target)}
                className={`min-h-[46px] py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 touch-manipulation active:scale-95 ${
                  isTargetActive
                    ? 'bg-rose-900/90 text-rose-100 border-rose-500 animate-pulse ring-2 ring-rose-500/50'
                    : isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-stone-950 text-stone-600 border-stone-900'
                    : `bg-stone-950 hover:bg-stone-800 ${mode.activeTextClass} border-stone-800`
                }`}
              >
                {isTargetActive ? (
                  <span className="flex items-center gap-1">
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{mode.stopLabel}</span>
                  </span>
                ) : (
                  <>
                    <span>{mode.label}</span>
                    <span className="text-[10px] font-mono opacity-60 font-normal">
                      {mode.subLabel}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PRIMARY LAUNCH ACTION BUTTON */}
      <div className="p-2 rounded-xl bg-stone-900 border border-amber-500/40 shadow-xl flex flex-col shrink-0">
        <button
          id="btn-plinko-drop"
          disabled={isAutoSessionActive && !isAutoDropping}
          onClick={() => {
            if (isAutoDropping) {
              onToggleAutoDrop('toggle');
            } else if (!isSessionBusy) {
              onDropBall();
            }
          }}
          className={`w-full min-h-[52px] py-3 rounded-xl font-black text-base sm:text-lg tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 touch-manipulation ${
            isAutoDropping
              ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-500 text-white border-2 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)] cursor-pointer active:scale-98 animate-pulse'
              : isAutoSessionActive
              ? 'bg-stone-800/90 text-amber-300/90 border border-amber-500/40 cursor-wait'
              : hasBalls
              ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-[0.98] cursor-pointer'
              : 'bg-stone-800 text-stone-400 border border-stone-700 cursor-not-allowed'
          }`}
        >
          {isAutoDropping ? (
            <>
              <Square className="w-5 h-5 fill-current text-white" />
              <span>
                {remainingAutoDrops > 0
                  ? `停止連投 (剩餘 ${remainingAutoDrops} 顆)`
                  : '停止連投 (點擊立即中斷)'}
              </span>
            </>
          ) : isAutoSessionActive ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              等待彈珠落槽結算中...
            </span>
          ) : hasBalls ? (
            <span className="flex items-center gap-2">
              <Play className="w-5 h-5 fill-current" />
              <span>投擲 1 顆彈珠</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-stone-400 text-xs sm:text-sm text-center">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              彈珠不足 (請先在上方購買彈珠)
            </span>
          )}
        </button>
      </div>

      {/* 5. STATS SUMMARY (Clean responsive wrapping for mobile/tablet) */}
      <div className="p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/80 text-[11px] sm:text-xs space-y-1.5 shrink-0">
        <div className="grid grid-cols-3 gap-1 text-stone-400 text-center sm:text-left">
          <div>累計投球: <strong className="text-stone-200 block sm:inline">{stats.totalDrops} 顆</strong></div>
          <div>獲利倍率: <strong className="text-emerald-400 block sm:inline">{stats.wins} 次 ({winRate}%)</strong></div>
          <div>歷史最高: <strong className="text-rose-400 block sm:inline">{stats.maxMultiplier}x</strong></div>
        </div>
        <div className="flex flex-wrap items-center justify-between text-stone-400 pt-1 border-t border-stone-800/60 gap-1.5">
          <span>總價值: <strong className="text-stone-300">${stats.totalWagered.toLocaleString()}</strong></span>
          <span>總獲得: <strong className="text-amber-400">${stats.totalWon.toLocaleString()}</strong></span>
          <span className="flex items-center gap-1">
            <span>淨損益:</span>
            <strong className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {netProfit >= 0 ? `+$${netProfit.toLocaleString()}` : `-$${Math.abs(netProfit).toLocaleString()}`}
            </strong>
          </span>
          <button
            onClick={() => {
              sound.playClick();
              onResetStats();
            }}
            className="text-[10px] text-stone-500 hover:text-stone-300 underline cursor-pointer ml-auto py-1 px-1 touch-manipulation"
            title="重置彈珠台數據"
          >
            重置數據
          </button>
        </div>
      </div>
    </div>
  );
};
