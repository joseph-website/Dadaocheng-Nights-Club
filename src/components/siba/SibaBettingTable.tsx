import React from 'react';
import { SibaBetItem, SibaBetType } from '../../types/siba';
import { SIBA_PAYOUT_RATIOS } from '../../utils/siba';
import { sound } from '../../utils/audio';
import { renderBetChipBadge } from '../common/TableBetsOverlay';
import { Layers, Sparkles, Flame, Zap } from 'lucide-react';

interface SibaBettingTableProps {
  currentBets: SibaBetItem[];
  selectedChip: number;
  onPlaceBet: (type: SibaBetType, label: string, payoutRatioText: string, multiplier: number) => void;
  onRemoveBetSpot: (id: string) => void;
  disabled: boolean;
}

export const SibaBettingTable: React.FC<SibaBettingTableProps> = ({
  currentBets,
  onPlaceBet,
  onRemoveBetSpot,
  disabled,
}) => {
  const getBetAmount = (id: string): number => {
    const normId = id.replace(/[-_]/g, '');
    const found = currentBets.find((b) => {
      const bNorm = b.id.replace(/[-_]/g, '');
      return b.id === id || bNorm === normId || (id.includes('eighteen') && b.type === 'eighteen_special');
    });
    return found ? found.amount : 0;
  };

  const handleCellClick = (
    e: React.MouseEvent,
    type: SibaBetType,
    id: string,
    label: string,
    payoutRatioText: string,
    multiplier: number
  ) => {
    e.preventDefault();
    if (disabled) return;
    if (e.button === 2) {
      // Right click to refund/clear this bet spot
      if (getBetAmount(id) > 0) {
        sound.playClick();
        onRemoveBetSpot(id);
      }
      return;
    }
    sound.playChip();
    onPlaceBet(type, label, payoutRatioText, multiplier);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (disabled) return;
    if (getBetAmount(id) > 0) {
      sound.playClick();
      onRemoveBetSpot(id);
    }
  };

  const renderChip = (amount: number) => {
    return renderBetChipBadge(amount, {
      size: 'xs',
      positionClass: 'absolute z-20 -top-2.5 -right-2 pointer-events-none drop-shadow-md',
      showLabel: true,
    });
  };

  return (
    <div className="w-full flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-[#0e121a] to-[#07090e] border-2 border-amber-500/30 shadow-2xl backdrop-blur select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-sm sm:text-base">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>十八仔下注盤 (SI-BŌ-Á FELT TABLE)</span>
        </div>
        <span className="text-xs text-stone-300 font-mono">
          左鍵下注 &bull; 右鍵退注
        </span>
      </div>

      {/* ================= 1. PRIMARY 4 CORE BETTING REGIONS ================= */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 大點 (Big: 9-12 點, 1 賠 1) */}
        {(() => {
          const id = 'bet-big';
          const amount = getBetAmount(id);
          return (
            <button
              id={id}
              disabled={disabled}
              onClick={(e) =>
                handleCellClick(e, 'big', id, '大點 (9-12 點)', '1:1', SIBA_PAYOUT_RATIOS.big)
              }
              onContextMenu={(e) => handleContextMenu(e, id)}
              className={`bet-cell bet-option relative min-h-[72px] py-2.5 px-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-amber-950/70 via-amber-900/50 to-stone-900/90 hover:from-amber-900/80 hover:to-amber-950 border-amber-500/60 text-amber-100 shadow-md ${
                amount > 0 ? 'ring-2 ring-amber-300 font-black border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-base sm:text-lg font-black tracking-wider text-amber-300">
                  大點 (BIG)
                </span>
              </div>
              <span className="text-xs text-amber-200 font-mono mt-0.5">9 ~ 12 點</span>
              <span className="text-xs font-black text-amber-400 bg-stone-950/80 px-2.5 py-0.5 rounded-full mt-1 border border-amber-500/40">
                1 賠 1
              </span>
              {renderChip(amount)}
            </button>
          );
        })()}

        {/* 小點 (Small: 4-8 點, 1 賠 1) */}
        {(() => {
          const id = 'bet-small';
          const amount = getBetAmount(id);
          return (
            <button
              id={id}
              disabled={disabled}
              onClick={(e) =>
                handleCellClick(e, 'small', id, '小點 (4-8 點)', '1:1', SIBA_PAYOUT_RATIOS.small)
              }
              onContextMenu={(e) => handleContextMenu(e, id)}
              className={`bet-cell bet-option relative min-h-[72px] py-2.5 px-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-blue-950/70 via-blue-900/50 to-stone-900/90 hover:from-blue-900/80 hover:to-blue-950 border-blue-500/60 text-blue-100 shadow-md ${
                amount > 0 ? 'ring-2 ring-amber-300 font-black border-amber-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-wider text-blue-300">
                  小點 (SMALL)
                </span>
              </div>
              <span className="text-xs text-blue-200 font-mono mt-0.5">4 ~ 8 點</span>
              <span className="text-xs font-black text-blue-300 bg-stone-950/80 px-2.5 py-0.5 rounded-full mt-1 border border-blue-500/40">
                1 賠 1
              </span>
              {renderChip(amount)}
            </button>
          );
        })()}

        {/* BG 逼機 (3 點, 1 賠 8) */}
        {(() => {
          const id = 'bet-bg';
          const amount = getBetAmount(id);
          return (
            <button
              id={id}
              disabled={disabled}
              onClick={(e) =>
                handleCellClick(e, 'bg', id, 'BG 逼機 (3 點)', '1:8', SIBA_PAYOUT_RATIOS.bg)
              }
              onContextMenu={(e) => handleContextMenu(e, id)}
              className={`bet-cell bet-option relative min-h-[72px] py-2 px-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-rose-950/70 via-rose-900/50 to-stone-900/90 hover:from-rose-900/90 hover:to-rose-950 border-rose-500/60 text-rose-100 shadow-md ${
                amount > 0 ? 'ring-2 ring-rose-400 font-black border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)]' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-rose-400" />
                <span className="text-sm sm:text-base font-black tracking-wider text-rose-300">
                  BG 逼機 (3 點)
                </span>
              </div>
              <span className="text-[11px] text-rose-200 font-mono mt-0.5">一對 + 1, 2 (最低點)</span>
              <span className="text-xs font-black text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded-full mt-1 border border-rose-500/50">
                1 賠 8
              </span>
              {renderChip(amount)}
            </button>
          );
        })()}

        {/* 十八 / 四一色 (1 賠 15) */}
        {(() => {
          const id = 'bet-eighteen_special';
          const amount = getBetAmount(id);
          return (
            <button
              id={id}
              disabled={disabled}
              onClick={(e) =>
                handleCellClick(
                  e,
                  'eighteen_special',
                  id,
                  '十八 / 四一色',
                  '1:15',
                  SIBA_PAYOUT_RATIOS.eighteen_special
                )
              }
              onContextMenu={(e) => handleContextMenu(e, id)}
              className={`bet-cell bet-option relative min-h-[72px] py-2 px-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-amber-900/70 via-purple-950/60 to-stone-900/90 hover:from-amber-800/80 hover:to-purple-900/80 border-amber-400/70 text-amber-100 shadow-md ${
                amount > 0 ? 'ring-2 ring-amber-300 font-black border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.7)]' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-sm sm:text-base font-black tracking-wider text-amber-300">
                  十八 / 四一色
                </span>
              </div>
              <span className="text-[11px] text-amber-200 font-mono mt-0.5">大十八・豹子通殺</span>
              <span className="text-xs font-black text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full mt-1 border border-amber-400/50">
                1 賠 15
              </span>
              {renderChip(amount)}
            </button>
          );
        })()}
      </div>

      {/* ================= 2. SPECIFIC POINT BETS (4 ~ 12 點) ================= */}
      <div className="flex flex-col gap-1 mt-1">
        <div className="text-xs sm:text-sm font-bold text-amber-200 flex items-center justify-between px-1">
          <span>精準點數投注 (4 ~ 12 點)</span>
          <span className="text-xs text-amber-400 font-mono font-bold">賠率 1:4 ~ 1:6</span>
        </div>

        <div className="grid grid-cols-9 gap-1 sm:gap-1.5">
          {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((pt) => {
            const betType = `point_${pt}` as SibaBetType;
            const id = `bet-${betType}`;
            const amount = getBetAmount(id);
            const ratio = SIBA_PAYOUT_RATIOS[betType];

            return (
              <button
                key={id}
                id={id}
                disabled={disabled}
                onClick={(e) =>
                  handleCellClick(
                    e,
                    betType,
                    id,
                    `點數 ${pt}`,
                    `1:${ratio}`,
                    ratio
                  )
                }
                onContextMenu={(e) => handleContextMenu(e, id)}
                className={`bet-cell relative min-h-[46px] py-1.5 px-0.5 rounded-lg border transition-all flex flex-col items-center justify-center bg-stone-900/90 hover:bg-stone-800 border-stone-700/70 text-stone-200 shadow-xs ${
                  amount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-300 bg-amber-950/40 text-amber-300' : ''
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-90'}`}
              >
                <span className="font-mono font-black text-sm sm:text-base">
                  {pt}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-400 font-mono font-bold mt-0.5">
                  1:{ratio}
                </span>
                {renderChip(amount)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
