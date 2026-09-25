import React, { useMemo, useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Layers,
  ChevronRight,
  Trophy,
  Coins,
} from 'lucide-react';
import { loadGameDetailHistory } from '../../utils/gameHistoryLoader';
import { sound } from '../../utils/audio';

interface GameHistoryDetailModalProps {
  isOpen: boolean;
  gameId: string | null;
  onClose: () => void;
}

export const GameHistoryDetailModal: React.FC<GameHistoryDetailModalProps> = ({
  isOpen,
  gameId,
  onClose,
}) => {
  const historyData = useMemo(() => {
    if (!gameId) return null;
    return loadGameDetailHistory(gameId);
  }, [gameId]);

  // ESC key listener
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

  if (!isOpen || !historyData) return null;

  return (
    <div
      id="modal-game-history-detail-overlay"
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        id="modal-game-history-detail-container"
        className="w-full max-w-2xl bg-[#0b0e14] border border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[85vh] text-stone-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              {historyData.gameIcon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-amber-200 drop-shadow">
                  {historyData.gameName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-300">
                  {historyData.records.length} 筆對局
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                {historyData.description}
              </p>
            </div>
          </div>

          <button
            id="btn-close-game-history-detail"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-all cursor-pointer border border-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-stone-950/80 border-b border-stone-800/80 font-mono text-center">
          <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-800">
            <span className="text-[10px] text-stone-400 block mb-0.5">總記錄局數</span>
            <span className="text-xs sm:text-sm font-bold text-amber-300">
              {historyData.totalRounds || historyData.records.length} 局
            </span>
          </div>

          <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-800">
            <span className="text-[10px] text-stone-400 block mb-0.5">總投入籌碼</span>
            <span className="text-xs sm:text-sm font-bold text-stone-200">
              {historyData.totalBet > 0 ? `$${historyData.totalBet.toLocaleString()}` : '--'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-stone-900/60 border border-stone-800">
            <span className="text-[10px] text-stone-400 block mb-0.5">累計損益</span>
            <span
              className={`text-xs sm:text-sm font-bold flex items-center justify-center gap-1 ${
                historyData.netProfit > 0
                  ? 'text-emerald-400'
                  : historyData.netProfit < 0
                  ? 'text-rose-400'
                  : 'text-stone-300'
              }`}
            >
              {historyData.netProfit > 0 ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : historyData.netProfit < 0 ? (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              ) : null}
              {historyData.netProfit > 0
                ? `+$${historyData.netProfit.toLocaleString()}`
                : historyData.netProfit < 0
                ? `-$${Math.abs(historyData.netProfit).toLocaleString()}`
                : '$0'}
            </span>
          </div>
        </div>

        {/* Records List Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2">
          {historyData.records.length === 0 ? (
            <div className="py-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
              <History className="w-8 h-8 text-stone-600 opacity-60 mb-1" />
              <div className="text-sm font-bold text-stone-400">本次無詳細對局紀錄</div>
              <p className="text-xs text-stone-500 max-w-xs">
                在該賭桌進行投注與開牌後，系統將自動記錄每局的牌況與下注明細。
              </p>
            </div>
          ) : (
            historyData.records.map((rec) => {
              const isWin = rec.netProfit > 0 || rec.badgeType === 'win' || rec.badgeType === 'jackpot';
              const isSpecial = rec.badgeType === 'special' || rec.badgeType === 'jackpot';
              const isPush = rec.badgeType === 'push';

              return (
                <div
                  key={rec.id}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSpecial
                      ? 'bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-stone-900/80 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : isWin
                      ? 'bg-stone-900/80 border-emerald-500/40'
                      : isPush
                      ? 'bg-stone-900/60 border-stone-700'
                      : 'bg-stone-950/80 border-stone-800/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-bold shrink-0">
                        #{rec.roundNumber}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                        {rec.resultTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs sm:text-sm font-black">
                      {rec.netProfit !== 0 && (
                        <span
                          className={
                            rec.netProfit > 0
                              ? 'text-emerald-400 drop-shadow'
                              : 'text-rose-400'
                          }
                        >
                          {rec.netProfit > 0
                            ? `+${rec.netProfit.toLocaleString()}`
                            : `${rec.netProfit.toLocaleString()}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detail & Tags Row */}
                  <div className="flex items-center justify-between text-[11px] text-stone-400 gap-2 border-t border-stone-800/60 pt-1.5">
                    <span className="truncate">{rec.resultDetail}</span>
                    {rec.tags && rec.tags.length > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        {rec.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            💡 點擊背景或右上角即可返回生涯結算總覽
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer border border-stone-700 transition-all active:scale-98"
          >
            關閉明細
          </button>
        </div>
      </div>
    </div>
  );
};
