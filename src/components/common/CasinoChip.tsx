import React from 'react';

interface CasinoChipProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  count?: number; // Optional visual stack count
}

export const CasinoChip: React.FC<CasinoChipProps> = ({
  amount,
  size = 'sm',
  className = '',
  count,
}) => {
  if (amount <= 0) return null;

  // Determine color theme based on chip denomination
  let chipColor = 'from-blue-600 via-blue-500 to-blue-700 border-blue-300 text-white';
  let innerRing = 'border-blue-200/60 bg-blue-950/70 text-blue-100';
  let glow = 'shadow-[0_4px_10px_rgba(37,99,235,0.5)]';

  if (amount >= 2000) {
    chipColor = 'from-rose-600 via-rose-500 to-rose-700 border-rose-300 text-white';
    innerRing = 'border-rose-200/70 bg-rose-950/80 text-rose-100';
    glow = 'shadow-[0_4px_10px_rgba(244,63,94,0.6)]';
  } else if (amount >= 1000) {
    chipColor = 'from-amber-500 via-yellow-500 to-amber-600 border-amber-200 text-stone-950';
    innerRing = 'border-amber-300/80 bg-amber-950/80 text-amber-300';
    glow = 'shadow-[0_4px_10px_rgba(245,158,11,0.7)]';
  } else if (amount >= 500) {
    chipColor = 'from-purple-600 via-purple-500 to-purple-700 border-purple-300 text-white';
    innerRing = 'border-purple-200/60 bg-purple-950/70 text-purple-100';
    glow = 'shadow-[0_4px_10px_rgba(147,51,234,0.5)]';
  } else if (amount >= 200) {
    chipColor = 'from-emerald-600 via-emerald-500 to-emerald-700 border-emerald-300 text-white';
    innerRing = 'border-emerald-200/60 bg-emerald-950/70 text-emerald-100';
    glow = 'shadow-[0_4px_10px_rgba(16,185,129,0.5)]';
  } else {
    chipColor = 'from-blue-600 via-blue-500 to-blue-700 border-blue-300 text-white';
    innerRing = 'border-blue-200/60 bg-blue-950/70 text-blue-100';
    glow = 'shadow-[0_4px_10px_rgba(37,99,235,0.5)]';
  }

  // Format label
  const formatted =
    amount >= 1000000
      ? `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`
      : amount >= 1000
      ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
      : `${amount}`;

  // Dimensions
  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs sm:text-[13px]',
    md: 'w-11 h-11 text-sm sm:text-base font-black',
    lg: 'w-14 h-14 text-base sm:text-lg font-black',
  }[size];

  const innerSizeStyles = {
    xs: 'w-4.5 h-4.5',
    sm: 'w-6 h-6',
    md: 'w-8.5 h-8.5',
    lg: 'w-11 h-11',
  }[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-gradient-to-br border-2 font-mono font-black select-none pointer-events-none chip-drop-bounce ${sizeStyles} ${chipColor} ${glow} ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Outer Striped Casino Rim / Dashes */}
      <div className="absolute inset-0.5 rounded-full border border-dashed border-white/60 pointer-events-none opacity-80" />

      {/* Inner Core Disc */}
      <div
        className={`rounded-full border flex items-center justify-center shadow-inner font-black leading-none ${innerSizeStyles} ${innerRing}`}
      >
        <span>{formatted}</span>
      </div>

      {/* Multi-stack indicator badge */}
      {count && count > 1 && (
        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-stone-950 font-sans text-[8px] font-black leading-none border border-black shadow">
          x{count}
        </span>
      )}
    </div>
  );
};
