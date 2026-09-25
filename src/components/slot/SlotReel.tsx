import React from 'react';
import { SlotSymbolId } from '../../types/slot';
import { SLOT_SYMBOLS, REEL_STRIP } from '../../utils/slot';

interface SlotReelProps {
  targetSymbol: SlotSymbolId;
  isSpinning: boolean;
  reelIndex: number;
}

export const SlotReel: React.FC<SlotReelProps> = ({
  targetSymbol,
  isSpinning,
  reelIndex,
}) => {
  const currentSymbol = SLOT_SYMBOLS[targetSymbol] || SLOT_SYMBOLS.seven;

  // Derive previous and next symbol on strip for 3-row visual reel effect
  const currentIndex = REEL_STRIP.indexOf(targetSymbol);
  const prevSymbolId = REEL_STRIP[(currentIndex - 1 + REEL_STRIP.length) % REEL_STRIP.length];
  const nextSymbolId = REEL_STRIP[(currentIndex + 1) % REEL_STRIP.length];

  const prevSymbol = SLOT_SYMBOLS[prevSymbolId];
  const nextSymbol = SLOT_SYMBOLS[nextSymbolId];

  return (
    <div className="relative flex-1 h-[220px] sm:h-[250px] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 rounded-xl border-2 border-stone-800 shadow-inner overflow-hidden flex flex-col items-center justify-center select-none">
      {/* 3D Glass & Shadow Reflections */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20" />
      
      {/* Center Payline Highlight Zone */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[76px] sm:h-[84px] bg-amber-500/10 border-y border-amber-400/40 pointer-events-none z-10 shadow-[0_0_15px_rgba(245,158,11,0.2)]" />

      {isSpinning ? (
        /* Blur Rolling Motion Ticker */
        <div
          className="flex flex-col items-center justify-around h-full w-full py-2 animate-bounce"
          style={{
            animation: `reelBlurScroll 0.12s linear infinite`,
            filter: 'blur(1.5px)',
          }}
        >
          <div className="text-3xl sm:text-4xl opacity-40">🍋</div>
          <div className="text-4xl sm:text-5xl scale-105 opacity-90 text-amber-300">7️⃣</div>
          <div className="text-3xl sm:text-4xl opacity-40">🍒</div>
        </div>
      ) : (
        /* Static 3-Row Viewport (Top Preview, Center Active Target, Bottom Preview) */
        <div className="w-full h-full flex flex-col items-center justify-between py-1 transition-all duration-300">
          {/* Top Preview Symbol */}
          <div className="h-[60px] sm:h-[68px] flex items-center justify-center opacity-35 scale-80 transition-transform">
            <span className="text-2xl sm:text-3xl">{prevSymbol.icon}</span>
          </div>

          {/* Center Winning Target Symbol */}
          <div
            className="h-[80px] sm:h-[90px] w-[90%] rounded-xl flex flex-col items-center justify-center bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-700/70 shadow-lg relative z-10 transition-transform duration-200 hover:scale-105"
            style={{
              animation: 'popIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            }}
          >
            <span className="text-4xl sm:text-5xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter">
              {currentSymbol.icon}
            </span>
            <span
              className={`text-[10px] sm:text-[11px] tracking-wider uppercase mt-0.5 ${currentSymbol.textColor}`}
            >
              {currentSymbol.label}
            </span>
          </div>

          {/* Bottom Preview Symbol */}
          <div className="h-[60px] sm:h-[68px] flex items-center justify-center opacity-35 scale-80 transition-transform">
            <span className="text-2xl sm:text-3xl">{nextSymbol.icon}</span>
          </div>
        </div>
      )}
    </div>
  );
};
