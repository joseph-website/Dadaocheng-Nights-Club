import React from 'react';
import { Play, Trash2, RotateCcw, Copy, Undo2, HelpCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface ControlPanelProps {
  balance: number;
  totalBet: number;
  isSpinning: boolean;
  hasBets: boolean;
  hasPreviousBets: boolean;
  canUndo?: boolean;
  onSpin: () => void;
  onClearBets: () => void;
  onDoubleBets: () => void;
  onRebet: () => void;
  onUndo?: () => void;
  onResetBalance: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  balance,
  totalBet,
  isSpinning,
  hasBets,
  hasPreviousBets,
  canUndo = false,
  onSpin,
  onClearBets,
  onDoubleBets,
  onRebet,
  onUndo,
}) => {
  return (
    <div className="w-full flex flex-col gap-2 p-2.5 sm:p-3 rounded-xl bg-[#0c0e14] border border-amber-500/30 shadow-xl backdrop-blur select-none shrink-0">
      {/* Top Row: Balance & Bet Info + Quick Tools */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        {/* Current Total Bet */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400 font-medium">下注:</span>
          <span
            className={`text-base sm:text-lg font-black font-mono ${
              totalBet > 0
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                : 'text-stone-500'
            }`}
          >
            {totalBet.toLocaleString()} 點
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5">
          {/* Rules & Help */}
          <button
            id="btn-roulette-rules"
            type="button"
            onClick={() => {
              sound.playClick();
              window.dispatchEvent(new CustomEvent('casino_open_rules'));
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-400/50 transition-colors cursor-pointer"
            title="查看輪盤玩法規則與賠率"
          >
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">說明</span>
          </button>

          {/* Undo Bet */}
          {onUndo && (
            <button
              id="btn-undo-bet"
              disabled={isSpinning || !canUndo}
              onClick={() => {
                sound.playClick();
                onUndo();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition-colors disabled:opacity-40 cursor-pointer"
              title="撤銷上一筆下注"
            >
              <Undo2 className="w-3 h-3 text-amber-400" />
              <span>撤銷</span>
            </button>
          )}

          {/* Clear Bets */}
          <button
            id="btn-clear-bets"
            disabled={isSpinning || !hasBets}
            onClick={() => {
              sound.playClick();
              onClearBets();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 transition-colors disabled:opacity-40 cursor-pointer"
            title="清除所有下注"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>清除</span>
          </button>

          {/* Double Bets (2X) */}
          <button
            id="btn-double-bets"
            disabled={isSpinning || !hasBets || balance < totalBet}
            onClick={() => {
              sound.playChip();
              onDoubleBets();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/40 transition-colors disabled:opacity-40 cursor-pointer"
            title="下注翻倍"
          >
            <Copy className="w-3 h-3 text-amber-400" />
            <span>加倍 2X</span>
          </button>

          {/* Rebet */}
          <button
            id="btn-rebet"
            disabled={isSpinning || !hasPreviousBets || hasBets}
            onClick={() => {
              sound.playChip();
              onRebet();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 hover:bg-stone-800 text-blue-300 border border-blue-500/40 transition-colors disabled:opacity-40 cursor-pointer"
            title="同額續注上一輪的下注"
          >
            <RotateCcw className="w-3 h-3 text-blue-400" />
            <span>同額續注</span>
          </button>
        </div>
      </div>

      {/* SPIN BUTTON */}
      <button
        id="btn-spin"
        disabled={isSpinning || !hasBets}
        onClick={onSpin}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm sm:text-base tracking-wider uppercase transition-all duration-200 shadow-xl ${
          isSpinning
            ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
            : hasBets
            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] cursor-pointer active:scale-[0.98] animate-pulse'
            : 'bg-stone-800/80 text-stone-500 border border-stone-700/60 cursor-not-allowed'
        }`}
      >
        <Play className={`w-4 h-4 fill-current ${isSpinning ? 'animate-spin' : ''}`} />
        <span>{isSpinning ? '輪盤旋轉開獎中...' : '旋轉開獎 (SPIN)'}</span>
      </button>
    </div>
  );
};
