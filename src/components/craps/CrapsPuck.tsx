import React from 'react';

interface CrapsPuckProps {
  isOn: boolean;
  size?: 'sm' | 'md';
}

export const CrapsPuck: React.FC<CrapsPuckProps> = ({ isOn, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-11 h-11 sm:w-12 sm:h-12 text-xs sm:text-sm';

  return (
    <div
      className={`relative rounded-full border-2 font-black font-mono select-none flex items-center justify-center transition-all duration-500 shadow-xl ${sizeClasses} ${
        isOn
          ? 'bg-gradient-to-b from-stone-100 via-white to-stone-300 text-stone-950 border-amber-400 shadow-[0_0_18px_rgba(255,255,255,0.9)] ring-2 ring-amber-400/80 animate-pulse'
          : 'bg-gradient-to-b from-stone-900 via-black to-stone-950 text-stone-300 border-stone-600 shadow-[0_4px_12px_rgba(0,0,0,0.8)]'
      }`}
    >
      {/* Metallic Rim Accent */}
      <div className="absolute inset-0.5 rounded-full border border-dashed border-stone-400/40 pointer-events-none" />
      <span className="tracking-widest drop-shadow-sm font-black">{isOn ? 'ON' : 'OFF'}</span>
    </div>
  );
};
