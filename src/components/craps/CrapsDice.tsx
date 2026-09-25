import React from 'react';

interface CrapsDiceProps {
  value: number;
  isRolling?: boolean;
  size?: 'sm' | 'md' | 'lg';
  rotationOffset?: number;
}

export const CrapsDice: React.FC<CrapsDiceProps> = ({
  value,
  isRolling = false,
  size = 'md',
  rotationOffset = 0,
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl p-1',
    md: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-1.5',
    lg: 'w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-2',
  }[size];

  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    lg: 'w-4 h-4 sm:w-5 sm:h-5',
  }[size];

  // Dice dot arrangement for standard 1~6
  const renderDots = () => {
    switch (value) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className={`${dotSize} rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]`} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-start">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-end">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-start">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-center">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-end">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-center">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full flex flex-col justify-between p-1">
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
            <div className="flex justify-between">
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
              <div className={`${dotSize} rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]`} />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-300 ${
        isRolling ? 'animate-bounce' : ''
      }`}
      style={{
        transform: isRolling
          ? `rotate(${Math.sin(Date.now() / 100 + rotationOffset) * 45}deg) scale(1.05)`
          : `rotate(${rotationOffset}deg)`,
      }}
    >
      {/* 3D Drop Shadow */}
      <div className="absolute inset-0 translate-y-2 translate-x-1 rounded-2xl bg-black/60 blur-md pointer-events-none" />

      {/* Ruby Red Casino Dice Body with Translucent Specular Shimmer */}
      <div
        className={`relative ${sizeClasses} bg-gradient-to-br from-rose-500 via-red-600 to-rose-900 border-2 border-rose-400/80 shadow-[inset_0_2px_6px_rgba(255,255,255,0.4),0_8px_20px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden`}
      >
        {/* Subtle translucent casino dice bevel ring */}
        <div className="absolute inset-0.5 rounded-[12px] border border-white/20 pointer-events-none" />
        {renderDots()}
      </div>
    </div>
  );
};
