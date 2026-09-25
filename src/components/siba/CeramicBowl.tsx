import React from 'react';
import { SibaDice } from './SibaDice';
import { SibaEvaluation } from '../../types/siba';
import { Sparkles, Zap, RotateCcw } from 'lucide-react';

export type CupPhase = 'idle' | 'covering' | 'shaking' | 'revealing';

interface CeramicBowlProps {
  dice: [number, number, number, number];
  isRolling: boolean;
  cupPhase?: CupPhase;
  evaluation: SibaEvaluation | null;
  rerollCount?: number;
}

export const CeramicBowl: React.FC<CeramicBowlProps> = ({
  dice,
  isRolling,
  cupPhase = 'idle',
  evaluation,
  rerollCount = 0,
}) => {
  // Determine which dice are base pairs and which are scoring dice
  const getDiceRole = (index: number, val: number) => {
    if (!evaluation || isRolling || !evaluation.isValidPoint) {
      return { isBasePair: false, isScoring: false };
    }

    if (evaluation.isFourKind) {
      return { isBasePair: true, isScoring: true };
    }

    const baseVal = evaluation.basePair ? evaluation.basePair[0] : null;
    const scorePair = evaluation.scoringDice;
    const occurrencesOfVal = dice.filter((d) => d === val).length;

    if (baseVal !== null && val === baseVal && occurrencesOfVal >= 2) {
      return { isBasePair: true, isScoring: false };
    }

    if (scorePair && (val === scorePair[0] || val === scorePair[1])) {
      return { isBasePair: false, isScoring: true };
    }

    return { isBasePair: false, isScoring: false };
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none py-1">
      {/* 1. Black-Glazed Ceramic Bowl (黑釉瓷碗) */}
      <div className="relative w-80 sm:w-96 md:w-[410px] h-60 sm:h-68 md:h-72 rounded-full bg-gradient-to-b from-[#181614] via-[#0d0c0a] to-[#050504] border-4 border-[#3a332a] shadow-[0_20px_60px_rgba(0,0,0,0.95),inset_0_8px_25px_rgba(255,255,255,0.08)] flex flex-col items-center justify-center p-4">
        {/* Bowl Outer Golden / Bronze Rim Line */}
        <div className="absolute inset-1.5 rounded-full border border-amber-600/30 pointer-events-none" />

        {/* Ceramic High-Gloss Reflective Arc Highlight */}
        <div className="absolute top-3 inset-x-12 h-6 rounded-full bg-gradient-to-b from-white/15 to-transparent blur-[1px] pointer-events-none" />

        {/* Bowl Inner Deep Recess */}
        <div className="relative w-64 sm:w-76 md:w-82 h-44 sm:h-52 md:h-56 rounded-full bg-gradient-to-b from-[#0a0908] via-[#14120f] to-[#040403] border-3 border-[#2c261e] shadow-[inset_0_15px_40px_rgba(0,0,0,0.98),0_0_20px_rgba(245,158,11,0.05)] flex items-center justify-center overflow-hidden">
          {/* Traditional auspicious seal stamp in the center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
            <div className="text-center font-serif text-amber-400">
              <div className="text-sm sm:text-base font-black tracking-widest">
                傳統十八仔
              </div>
              <div className="text-[10px] tracking-widest uppercase">
                TAIWAN CLASSIC
              </div>
            </div>
          </div>

          {/* 4 Clean Flat / Subtle-Shadow Dice */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 z-10 p-2">
            {dice.map((val, idx) => {
              const role = getDiceRole(idx, val);
              return (
                <div key={`die-${idx}`} className="flex items-center justify-center">
                  <SibaDice
                    value={val}
                    index={idx}
                    size="md"
                    isBasePair={role.isBasePair}
                    isScoringDice={role.isScoring}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 100% Solid Opaque Taiwanese Lacquered Dice Cup (不透明實體骰盅) */}
        {cupPhase !== 'idle' && (
          <div
            className={`dice-cup absolute -top-4 sm:-top-6 w-72 sm:w-84 md:w-92 h-52 sm:h-60 md:h-64 z-40 flex flex-col items-center justify-end pointer-events-none ${
              cupPhase === 'covering'
                ? 'dice-cup-cover'
                : cupPhase === 'shaking'
                ? 'dice-cup-shake'
                : 'dice-cup-lift'
            }`}
          >
            {/* Top Solid Antique Bronze Knob & Finial */}
            <div className="relative w-14 h-11 -mb-2 flex flex-col items-center justify-center z-20">
              <div className="w-9 h-9 rounded-full bg-[#3d2314] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,215,0,0.6)] flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-amber-300/80 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              </div>
              <div className="w-7 h-2 bg-[#2d1a0e] border-t border-amber-400/60 rounded-t-sm" />
            </div>

            {/* 100% Opaque Solid Cup Body (Dark Ebony Wood / Lacquered Solid Resin) */}
            <div className="relative w-full h-44 sm:h-52 md:h-56 rounded-t-[110px] rounded-b-[44px] bg-[#1a0f0a] border-4 border-[#3a2013] shadow-[0_30px_70px_rgba(0,0,0,1),inset_0_12px_24px_rgba(255,255,255,0.1),inset_0_-20px_35px_rgba(0,0,0,0.98)] flex flex-col items-center justify-between p-3.5 overflow-hidden">
              {/* Glossy Top Curve Highlight Arc */}
              <div className="absolute top-2 inset-x-8 h-9 rounded-t-[90px] bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-[1px] pointer-events-none" />
              <div className="absolute top-1/4 left-3.5 w-4 h-28 bg-gradient-to-r from-white/15 to-transparent rounded-full blur-[2px] pointer-events-none" />

              {/* Decorative Gold Inlay Rings (雷紋 / 回紋雕花) */}
              <div className="w-full flex flex-col items-center gap-1.5 mt-6 pointer-events-none select-none">
                <div className="w-4/5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                <div className="flex items-center gap-2 text-[11px] sm:text-xs tracking-[0.35em] font-serif font-black text-amber-300 uppercase shadow-md">
                  <span>◆</span>
                  <span>聚寶骰盅</span>
                  <span>◆</span>
                </div>
                <div className="w-4/5 h-0.5 rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </div>

              {/* Internal rattling shockwave effect during shake */}
              {cupPhase === 'shaking' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/70 text-amber-300 text-[11px] font-black animate-pulse shadow-md">
                  <RotateCcw className="w-3 h-3 animate-spin" />
                  <span>
                    {rerollCount > 0
                      ? `無點！重搖第 ${rerollCount + 1} 次...`
                      : '搖盅中...'}
                  </span>
                </div>
              )}

              {/* Bottom Solid Heavy Antique Bronze Rim */}
              <div className="w-full flex flex-col items-center pointer-events-none mt-auto">
                <div className="w-full h-3.5 rounded-b-[40px] bg-gradient-to-r from-[#8a531e] via-[#d98b2c] to-[#8a531e] border-t border-amber-300 shadow-[0_-3px_8px_rgba(0,0,0,0.9)]" />
              </div>
            </div>

            {/* Heavy Cast Drop Shadow under Cup */}
            <div className="w-68 sm:w-80 h-5 rounded-full bg-black/95 blur-[6px] -mt-2 pointer-events-none" />
          </div>
        )}
      </div>

      {/* 3. OUTCOME SUMMARY DISPLAY (Below Ceramic Bowl) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 max-w-full px-2">
        {evaluation && !isRolling ? (
          <>
            {/* Category Main Outcome Badge */}
            <div
              className={`px-3 py-1 rounded-xl border text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 shadow-lg ${
                evaluation.isEighteen || evaluation.isFourKind
                  ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-amber-600 border-amber-400 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.8)] animate-pulse'
                  : evaluation.isBG
                  ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                  : evaluation.isBig
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.7)]'
              }`}
            >
              {evaluation.isEighteen || evaluation.isFourKind ? (
                <Sparkles className="w-4 h-4 text-amber-300" />
              ) : evaluation.isBG ? (
                <Zap className="w-3.5 h-3.5 text-rose-400" />
              ) : null}
              <span>{evaluation.categoryLabel}</span>
            </div>

            {/* Sub description pill */}
            <div className="px-2.5 py-1 rounded-xl bg-stone-950/80 border border-stone-700/80 text-[11px] font-mono text-stone-300">
              {evaluation.subDescription}
            </div>
          </>
        ) : isRolling ? (
          <div className="px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-500/70 text-xs text-amber-200 font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse">
            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            <span>
              {cupPhase === 'covering'
                ? '蓋盅中...'
                : cupPhase === 'shaking'
                ? rerollCount > 0
                  ? `無點！自動第 ${rerollCount + 1} 次搖盅...`
                  : '搖盅中...'
                : '掀盅揭曉！'}
            </span>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-xl bg-stone-900/80 border border-stone-700 text-xs text-stone-400 font-medium">
            點擊「擲骰」開始投擲 4 顆紅黑點骰子
          </div>
        )}
      </div>
    </div>
  );
};
