import React from 'react';
import { LogOut, Trophy, TrendingUp, TrendingDown, Clock, ShieldAlert, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { INITIAL_BALANCE } from '../../utils/constants';

interface CashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  inventoryCount: number;
  onResetSession: () => void;
}

export const CashOutModal: React.FC<CashOutModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  inventoryCount,
  onResetSession,
}) => {
  if (!isOpen) return null;

  const netProfit = currentBalance - INITIAL_BALANCE;
  const isProfitable = netProfit >= 0;

  // Determine title based on result
  let playerTitle = '神秘夜行客';
  let badgeColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';

  if (currentBalance >= 100000) {
    playerTitle = '👑 夜行傳奇大亨';
    badgeColor = 'text-yellow-300 border-yellow-500/50 bg-yellow-500/20';
  } else if (currentBalance >= 30000) {
    playerTitle = '💎 頂級贏家老手';
    badgeColor = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/20';
  } else if (currentBalance >= 10000) {
    playerTitle = '🍸 優雅離場的貴賓';
    badgeColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  } else if (currentBalance > 0) {
    playerTitle = '🎲 頑強留存的挑戰者';
    badgeColor = 'text-stone-300 border-stone-600 bg-stone-800/40';
  } else {
    playerTitle = '🌧️ 兩袖清風的夜歸人';
    badgeColor = 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90dvh] flex flex-col bg-gradient-to-b from-[#141722] to-[#0c0e15] border border-amber-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden text-stone-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-amber-400">大稻賭埕之夜 · 離場結算清單</h3>
              <p className="text-[10px] sm:text-[11px] text-stone-400">結算今夜的冒險成果並記錄戰績</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-all cursor-pointer"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Player Title Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${badgeColor}`}>
            <span className="text-xs font-bold">今夜稱號評定</span>
            <span className="text-sm font-black tracking-wide">{playerTitle}</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-1">入場初本</span>
              <span className="text-sm font-mono font-bold text-stone-300">
                ${INITIAL_BALANCE.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-1">離場籌碼</span>
              <span className="text-sm font-mono font-black text-amber-400">
                ${currentBalance.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-1">本夜淨損益</span>
              <div className="flex items-center gap-1">
                {isProfitable ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span
                  className={`text-sm font-mono font-bold ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isProfitable ? '+' : ''}${netProfit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800">
              <span className="text-[10px] text-stone-400 block mb-1">背包珍藏物品</span>
              <span className="text-sm font-mono font-bold text-purple-300">
                {inventoryCount} 件密藏
              </span>
            </div>
          </div>

          <p className="text-[11px] text-stone-400 bg-stone-950/60 p-3 rounded-xl border border-stone-800/80 leading-relaxed">
            * 您的籌碼與背包記錄已自動保存在本機快取中。若選擇【重置新夜】，將清空並以初始 ${INITIAL_BALANCE.toLocaleString()} 重新開始。
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950/80 border-t border-stone-800 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs tracking-wider transition-colors cursor-pointer text-center"
          >
            留在俱樂部繼續玩
          </button>
          <button
            onClick={() => {
              onResetSession();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-600/40 text-rose-300 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            清算重置 (${INITIAL_BALANCE.toLocaleString()})
          </button>
        </div>

      </div>
    </div>
  );
};
