import React from 'react';
import { PokerCard, Suit } from '../../types/poker';

interface PokerCardViewProps {
  card?: PokerCard | null;
  isHidden?: boolean;
  isWinningCard?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  delayMs?: number;
}

// 顏色規範：
// 紅心 (♥) 與 方塊 (♦)：文字與花色圖示強制設為【經典鮮紅色 (#D32F2F)】
// 黑桃 (♠) 與 梅花 (♣)：文字與花色圖示強制設為【經典純黑色 (#1E1E1E)】
const SUIT_SYMBOLS: Record<Suit, { icon: string; color: string }> = {
  hearts: { icon: '♥', color: 'text-[#D32F2F]' },
  diamonds: { icon: '♦', color: 'text-[#D32F2F]' },
  clubs: { icon: '♣', color: 'text-[#1E1E1E]' },
  spades: { icon: '♠', color: 'text-[#1E1E1E]' },
};

export const PokerCardView: React.FC<PokerCardViewProps> = ({
  card,
  isHidden = false,
  isWinningCard = false,
  size = 'md',
  className = '',
  delayMs = 0,
}) => {
  const sizeClasses = {
    sm: 'w-12 sm:w-14 text-xs',
    md: 'w-15 sm:w-18 md:w-20 text-sm',
    lg: 'w-18 sm:w-22 md:w-24 text-base',
  }[size];

  // If slot is empty (waiting for community card)
  if (!card) {
    return (
      <div
        className={`${sizeClasses} aspect-[5/7] rounded-[8px] border-2 border-dashed border-emerald-900/60 bg-emerald-950/20 flex items-center justify-center text-emerald-800 font-mono text-xs select-none shadow-inner overflow-hidden ${className}`}
      >
        <div className="w-5 h-5 rounded-full border border-emerald-800/40 flex items-center justify-center opacity-40">
          ♣
        </div>
      </div>
    );
  }

  // Face-down hidden card (Taiwanese Casino Gold-embossed Pattern)
  if (isHidden || card.isHidden) {
    return (
      <div
        style={{ animationDelay: `${delayMs}ms` }}
        className={`${sizeClasses} aspect-[5/7] rounded-[8px] bg-gradient-to-br from-amber-950 via-stone-950 to-stone-900 border-2 border-amber-500/70 shadow-[0_8px_18px_rgba(0,0,0,0.8)] flex items-center justify-center p-1 sm:p-1.5 select-none transform transition-all duration-300 hover:-translate-y-1 animate-in fade-in zoom-in-90 overflow-hidden ${className}`}
      >
        <div className="w-full h-full rounded-[5px] border border-amber-500/40 bg-[radial-gradient(#f59e0b_1.5px,transparent_1.5px)] [background-size:8px_8px] opacity-85 flex items-center justify-center shadow-inner">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-amber-400 bg-stone-950/90 flex items-center justify-center text-amber-400 font-serif font-black text-xs sm:text-sm shadow-md">
            ♠
          </div>
        </div>
      </div>
    );
  }

  const suitInfo = SUIT_SYMBOLS[card.suit];

  return (
    <div
      id={`poker-card-${card.id}`}
      style={{ animationDelay: `${delayMs}ms` }}
      className={`relative ${sizeClasses} aspect-[5/7] rounded-[8px] bg-gradient-to-b from-[#FFFFFF] via-[#FDFDFE] to-[#F5F7FA] border ${
        isWinningCard
          ? 'border-amber-400 ring-3 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.9)] -translate-y-1 z-10'
          : 'border-stone-300 shadow-[0_6px_16px_rgba(0,0,0,0.65)]'
      } flex flex-col justify-between p-1 sm:p-1.5 select-none overflow-hidden transform transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-top-4 ${className}`}
    >
      {/* Top Left: Corner Rank & Suit (line-height: 1, padding: 4-6px, anti-clipping) */}
      <div className={`flex flex-col items-center leading-none ${suitInfo.color} z-10 select-none self-start`}>
        <span className="font-black font-sans tracking-tight text-xs sm:text-sm md:text-base leading-none">
          {card.rank}
        </span>
        <span className="text-[10px] sm:text-xs md:text-sm font-black leading-none mt-0.5">
          {suitInfo.icon}
        </span>
      </div>

      {/* Center Motif (Absolute Centered Large Suit Icon) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`${suitInfo.color} text-2xl sm:text-3xl md:text-4xl font-black leading-none opacity-85 drop-shadow-xs select-none`}
        >
          {suitInfo.icon}
        </span>
      </div>

      {/* Bottom Right: Inverted Corner Rank & Suit */}
      <div
        className={`flex flex-col items-center leading-none rotate-180 ${suitInfo.color} z-10 select-none self-end`}
      >
        <span className="font-black font-sans tracking-tight text-xs sm:text-sm md:text-base leading-none">
          {card.rank}
        </span>
        <span className="text-[10px] sm:text-xs md:text-sm font-black leading-none mt-0.5">
          {suitInfo.icon}
        </span>
      </div>
    </div>
  );
};


