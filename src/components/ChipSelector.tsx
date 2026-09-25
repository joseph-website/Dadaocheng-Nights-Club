import React from 'react';
import { CHIP_DENOMINATIONS } from '../utils/constants';
import { sound } from '../utils/audio';

interface ChipSelectorProps {
  selectedChip: number;
  onSelectChip: (amount: number) => void;
  disabled?: boolean;
  balance?: number;
}

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  selectedChip,
  onSelectChip,
  disabled = false,
  balance,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1 select-none">
      <span className="text-xs sm:text-sm font-bold text-stone-300 mr-1 hidden sm:inline">
        籌碼:
      </span>
      {CHIP_DENOMINATIONS.map((chip) => {
        const isSelected = selectedChip === chip.value;
        const isAffordable = balance === undefined || balance >= chip.value;
        const isBtnDisabled = disabled || !isAffordable;

        return (
          <button
            key={`chip-${chip.value}`}
            id={`chip-selector-${chip.value}`}
            disabled={isBtnDisabled}
            title={
              !isAffordable
                ? `餘額不足 ($${chip.value.toLocaleString()} > $${(balance || 0).toLocaleString()})`
                : undefined
            }
            onClick={() => {
              if (isBtnDisabled) {
                sound.playLoss();
                return;
              }
              sound.playChip();
              onSelectChip(chip.value);
            }}
            className={`chip-btn relative group flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 transition-all duration-200 ${
              chip.color
            } ${chip.borderColor} ${chip.textColor} ${
              isSelected
                ? 'scale-110 -translate-y-0.5 shadow-[0_0_20px_rgba(255,255,255,0.7)] ring-3 ring-white/60 z-10'
                : !isAffordable
                ? 'opacity-30 grayscale-[50%] cursor-not-allowed'
                : 'opacity-85 hover:opacity-100 hover:scale-105 shadow-md'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : isAffordable ? 'cursor-pointer active:scale-95' : ''}`}
            style={{
              boxShadow: isSelected && isAffordable ? `0 0 20px ${chip.glowColor}` : undefined,
            }}
          >
            {/* Outer dash ring for casino chip look */}
            <div className="absolute inset-0.5 rounded-full border border-dashed border-white/60 pointer-events-none"></div>

            {/* Inner circle */}
            <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center border border-white/50 shadow-inner">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white drop-shadow-md">
                {chip.label}
              </span>
            </div>

            {/* Not affordable indicator */}
            {!isAffordable && (
              <div className="absolute -top-1 -right-1 px-1 rounded-full bg-rose-950/90 border border-rose-500/70 text-[9px] font-bold text-rose-300 pointer-events-none">
                不足
              </div>
            )}

            {/* Selected arrow indicator */}
            {isSelected && isAffordable && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-amber-400"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};
