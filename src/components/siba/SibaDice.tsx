import React from 'react';

export type SibaDiceSize = 'sm' | 'md' | 'lg';

export interface SibaDiceProps {
  value: number; // 1 to 6
  index?: number; // 0, 1, 2, 3
  size?: 'sm' | 'md' | 'lg';
  isBasePair?: boolean;
  isScoringDice?: boolean;
}

// Render pips cleanly for 2D flat/subtle-shadow style
const renderFacePips = (faceVal: number, diceSize: 'sm' | 'md' | 'lg') => {
  const isRedPip = faceVal === 1 || faceVal === 4;
  const pipColor = isRedPip
    ? 'bg-red-600 shadow-[0_0_2px_rgba(220,38,38,0.8)]'
    : 'bg-stone-900 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)]';

  const pipSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    lg: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
  }[diceSize];

  if (faceVal === 1) {
    const centerPipSize = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6 sm:w-7 sm:h-7',
      lg: 'w-8 h-8 sm:w-9 sm:h-9',
    }[diceSize];

    return (
      <div className="w-full h-full flex items-center justify-center">
        <div
          className={`${centerPipSize} rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-[0_1px_3px_rgba(220,38,38,0.6),inset_0_1px_2px_rgba(255,255,255,0.6)] flex items-center justify-center`}
        >
          <div className="w-1/3 h-1/3 rounded-full bg-red-200/40" />
        </div>
      </div>
    );
  }

  if (faceVal === 2) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-1.5 sm:p-2">
        <div className="flex justify-start">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-end">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
      </div>
    );
  }

  if (faceVal === 3) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-1.5 sm:p-2">
        <div className="flex justify-start">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-center">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-end">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
      </div>
    );
  }

  if (faceVal === 4) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-1.5 sm:p-2">
        <div className="flex justify-between">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-between">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
      </div>
    );
  }

  if (faceVal === 5) {
    return (
      <div className="w-full h-full flex flex-col justify-between p-1.5 sm:p-2">
        <div className="flex justify-between">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-center">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
        <div className="flex justify-between">
          <div className={`${pipSize} rounded-full ${pipColor}`} />
          <div className={`${pipSize} rounded-full ${pipColor}`} />
        </div>
      </div>
    );
  }

  // 6
  return (
    <div className="w-full h-full flex justify-between p-1.5 sm:p-2">
      <div className="flex flex-col justify-between">
        <div className={`${pipSize} rounded-full ${pipColor}`} />
        <div className={`${pipSize} rounded-full ${pipColor}`} />
        <div className={`${pipSize} rounded-full ${pipColor}`} />
      </div>
      <div className="flex flex-col justify-between">
        <div className={`${pipSize} rounded-full ${pipColor}`} />
        <div className={`${pipSize} rounded-full ${pipColor}`} />
        <div className={`${pipSize} rounded-full ${pipColor}`} />
      </div>
    </div>
  );
};

export const SibaDice: React.FC<SibaDiceProps> = ({
  value,
  size = 'md',
  isBasePair = false,
  isScoringDice = false,
}) => {
  const validSize: 'sm' | 'md' | 'lg' =
    size === 'sm' || size === 'lg' ? size : 'md';

  const sizeClass =
    validSize === 'sm'
      ? 'w-11 h-11'
      : validSize === 'lg'
      ? 'w-16 h-16 sm:w-18 sm:h-18'
      : 'w-13 h-13 sm:w-14 sm:h-14';

  return (
    <div className="relative flex flex-col items-center justify-center p-1.5 select-none">
      {/* Clean Die Face with Subtle Bone Luster & Shadow */}
      <div
        className={`${sizeClass} rounded-xl bg-gradient-to-br from-[#ffffff] via-[#f7f5f0] to-[#eae4d9] border border-amber-200/90 shadow-[0_4px_10px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.12)] flex items-center justify-center transition-transform hover:scale-105`}
      >
        {renderFacePips(value, validSize)}
      </div>

      {/* Role Tag beneath Die (Base Pair / Scoring Dice) */}
      <div className="h-4 flex items-center justify-center mt-1.5">
        {(isBasePair || isScoringDice) && (
          <span
            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full leading-tight select-none shadow-xs animate-in fade-in zoom-in-75 ${
              isBasePair
                ? 'bg-amber-500 text-stone-950 border border-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-emerald-500 text-stone-950 border border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
            }`}
          >
            {isBasePair ? '門前對子' : '計分點數'}
          </span>
        )}
      </div>
    </div>
  );
};
