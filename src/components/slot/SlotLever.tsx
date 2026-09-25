import React from 'react';

interface SlotLeverProps {
  isPulled: boolean;
  disabled: boolean;
  onPull: () => void;
}

export const SlotLever: React.FC<SlotLeverProps> = ({
  isPulled,
  disabled,
  onPull,
}) => {
  return (
    <div
      onClick={() => {
        if (!disabled) onPull();
      }}
      className={`relative w-14 sm:w-16 h-52 flex flex-col items-center justify-end cursor-pointer group select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'
      }`}
      title="點擊拉桿進行 3D 壓下拉動旋轉"
    >
      {/* Heavy Chrome Mounting Bracket Base */}
      <div className="w-10 h-12 rounded-xl bg-gradient-to-r from-stone-800 via-stone-700 to-stone-900 border-2 border-stone-600 shadow-[0_4px_10px_rgba(0,0,0,0.8)] flex items-center justify-center relative z-20">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 via-stone-900 to-black border border-amber-400/60 shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_#fbbf24]" />
        </div>
      </div>

      {/* 3D Mechanical Pivot Shaft & Knob */}
      <div
        className={`absolute bottom-6 w-3.5 bg-gradient-to-r from-stone-300 via-stone-100 to-stone-400 border border-stone-500 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.6)] origin-bottom transition-all duration-300 ${
          isPulled ? 'lever-pull-animation h-32' : 'h-40 group-hover:-rotate-3'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Chrome metallic grooves on shaft */}
        <div className="w-full h-1 bg-stone-500/40 my-3 rounded-full" />
        <div className="w-full h-1 bg-stone-500/40 my-3 rounded-full" />
        <div className="w-full h-1 bg-stone-500/40 my-3 rounded-full" />

        {/* 3D Shiny Metallic Red Ball Knob */}
        <div
          className={`absolute -top-7 -left-3.5 w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-gradient-to-br from-rose-400 via-rose-600 to-rose-950 border-2 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.8),inset_0_2px_6px_rgba(255,255,255,0.7)] group-hover:scale-110 group-hover:shadow-[0_0_25px_rgba(244,63,94,1)] transition-all flex items-center justify-center ${
            isPulled ? 'scale-95 brightness-125' : ''
          }`}
        >
          {/* Specular Glare Reflection */}
          <div className="w-3.5 h-3 rounded-full bg-white/80 absolute top-1.5 left-2 blur-[0.5px] rotate-[-25deg]" />
          <div className="w-1.5 h-1.5 rounded-full bg-white/60 absolute bottom-2 right-2.5 blur-[0.5px]" />
        </div>
      </div>
    </div>
  );
};
