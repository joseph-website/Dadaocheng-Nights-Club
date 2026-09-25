import React from 'react';
import { Card, Suit } from '../../types/blackjack';

interface PlayingCardProps {
  card: Card;
  index?: number;
  className?: string;
}

const SUIT_ICONS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const PlayingCard: React.FC<PlayingCardProps> = ({ card, index = 0, className = '' }) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSymbol = SUIT_ICONS[card.suit];

  if (card.isHidden) {
    return (
      <div
        id={`card-hidden-${index}`}
        style={{ animationDelay: `${index * 120}ms` }}
        className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 border-2 border-amber-500/60 shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex items-center justify-center p-2 select-none transform transition-all duration-300 hover:-translate-y-1 animate-in fade-in zoom-in-90 ${className}`}
      >
        {/* Diamond Lattice Pattern */}
        <div className="w-full h-full rounded-lg border border-amber-500/30 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:8px_8px] opacity-70 flex items-center justify-center">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-amber-400/50 bg-stone-950/80 flex items-center justify-center text-amber-400 font-serif font-black text-xs sm:text-sm shadow-inner">
            ♠
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`card-${card.id}`}
      style={{ animationDelay: `${index * 120}ms` }}
      className={`relative w-20 h-28 sm:w-24 sm:h-36 rounded-xl bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#f1f5f9] border border-stone-300 shadow-[0_10px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between p-2 select-none transform transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-top-4 ${className}`}
    >
      {/* Top Left Rank & Suit */}
      <div className={`flex flex-col items-center leading-none ${isRed ? 'text-rose-600' : 'text-stone-900'}`}>
        <span className="text-sm sm:text-base font-black font-mono">{card.rank}</span>
        <span className="text-xs sm:text-sm font-bold">{suitSymbol}</span>
      </div>

      {/* Center Motif */}
      <div className={`self-center text-2xl sm:text-4xl ${isRed ? 'text-rose-600' : 'text-stone-900'} opacity-90 drop-shadow-xs`}>
        {suitSymbol}
      </div>

      {/* Bottom Right Inverted Rank & Suit */}
      <div className={`flex flex-col items-center leading-none rotate-180 ${isRed ? 'text-rose-600' : 'text-stone-900'}`}>
        <span className="text-sm sm:text-base font-black font-mono">{card.rank}</span>
        <span className="text-xs sm:text-sm font-bold">{suitSymbol}</span>
      </div>
    </div>
  );
};
