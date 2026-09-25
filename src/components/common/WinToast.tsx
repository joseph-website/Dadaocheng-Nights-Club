import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Flame, TrendingDown, TrendingUp, BarChart3, Scale, Sparkles } from 'lucide-react';

export interface WinToastData {
  id?: string | number;
  title: string;
  amount: number;
  multiplier?: number;
  subtitle?: string;
  description?: string;
  isJackpot?: boolean;
  isWin?: boolean;
  netProfit?: number;
  totalBet?: number;
  totalWon?: number;
  isSummary?: boolean;
  extraBonusAmount?: number;
}

interface WinToastProps {
  toast?: WinToastData | null;
  data?: WinToastData | null;
  onDismiss?: () => void;
  onClose?: () => void;
}

// 32 Pre-distributed falling coin & light particles for smooth 60FPS CSS animation
const MEGA_WIN_PARTICLES = [
  { left: 3, delay: 0.05, duration: 1.6, size: 28, char: '🪙' },
  { left: 7, delay: 0.25, duration: 1.9, size: 22, char: '✨' },
  { left: 11, delay: 0.1, duration: 1.7, size: 26, char: '🪙' },
  { left: 15, delay: 0.4, duration: 2.1, size: 20, char: '⭐' },
  { left: 19, delay: 0.15, duration: 1.8, size: 30, char: '🪙' },
  { left: 24, delay: 0.3, duration: 1.65, size: 24, char: '💰' },
  { left: 28, delay: 0.0, duration: 1.75, size: 26, char: '✨' },
  { left: 32, delay: 0.35, duration: 1.95, size: 28, char: '🪙' },
  { left: 37, delay: 0.2, duration: 1.6, size: 22, char: '💎' },
  { left: 41, delay: 0.45, duration: 2.0, size: 32, char: '🪙' },
  { left: 46, delay: 0.08, duration: 1.85, size: 24, char: '✨' },
  { left: 50, delay: 0.28, duration: 1.7, size: 28, char: '🪙' },
  { left: 55, delay: 0.18, duration: 1.9, size: 22, char: '⭐' },
  { left: 59, delay: 0.5, duration: 2.1, size: 30, char: '🪙' },
  { left: 63, delay: 0.12, duration: 1.65, size: 26, char: '💰' },
  { left: 68, delay: 0.38, duration: 1.8, size: 24, char: '✨' },
  { left: 72, delay: 0.02, duration: 1.75, size: 28, char: '🪙' },
  { left: 76, delay: 0.42, duration: 1.95, size: 20, char: '💎' },
  { left: 81, delay: 0.22, duration: 1.6, size: 30, char: '🪙' },
  { left: 85, delay: 0.14, duration: 1.85, size: 22, char: '✨' },
  { left: 89, delay: 0.48, duration: 2.05, size: 26, char: '🪙' },
  { left: 93, delay: 0.06, duration: 1.7, size: 24, char: '⭐' },
  { left: 96, delay: 0.32, duration: 1.9, size: 28, char: '🪙' },
  { left: 5, delay: 0.6, duration: 2.0, size: 20, char: '✨' },
  { left: 17, delay: 0.55, duration: 1.8, size: 26, char: '🪙' },
  { left: 35, delay: 0.65, duration: 1.95, size: 24, char: '💰' },
  { left: 52, delay: 0.58, duration: 1.75, size: 28, char: '🪙' },
  { left: 66, delay: 0.7, duration: 2.1, size: 22, char: '✨' },
  { left: 79, delay: 0.62, duration: 1.85, size: 26, char: '🪙' },
  { left: 91, delay: 0.75, duration: 1.9, size: 24, char: '⭐' },
  { left: 44, delay: 0.72, duration: 2.0, size: 30, char: '🪙' },
  { left: 22, delay: 0.8, duration: 1.8, size: 22, char: '✨' },
];

export const WinToast: React.FC<WinToastProps> = ({ toast, data, onDismiss, onClose }) => {
  const activeToast = toast || data;
  const dismissCallback = onDismiss || onClose;

  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [showGoldenFlash, setShowGoldenFlash] = useState(false);

  useEffect(() => {
    if (!activeToast) {
      setVisible(false);
      setFading(false);
      setShowGoldenFlash(false);
      return;
    }

    setVisible(true);
    setFading(false);

    // If amount >= 5000 or netProfit >= 5000, trigger golden flash screen for 1.5s
    const isMega = activeToast.amount >= 5000 || (activeToast.netProfit ?? 0) >= 5000;
    if (isMega) {
      setShowGoldenFlash(true);
      const flashTimer = setTimeout(() => {
        setShowGoldenFlash(false);
      }, 1500);

      // Mega win toast stays visible slightly longer to appreciate the coins
      const displayDuration = 2600;
      const totalDuration = 3000;

      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, displayDuration);

      const closeTimer = setTimeout(() => {
        setVisible(false);
        if (dismissCallback) dismissCallback();
      }, totalDuration);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(fadeTimer);
        clearTimeout(closeTimer);
      };
    }

    // Normal win toast durations
    const displayDuration = activeToast.isSummary ? 2400 : 1600;
    const totalDuration = activeToast.isSummary ? 2800 : 2000;

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, displayDuration);

    const closeTimer = setTimeout(() => {
      setVisible(false);
      if (dismissCallback) dismissCallback();
    }, totalDuration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [activeToast, dismissCallback]);

  if (!visible || !activeToast) return null;

  const isNetSettlement = activeToast.isSummary || activeToast.netProfit !== undefined;
  const isLoss = isNetSettlement && (activeToast.netProfit ?? 0) < 0;
  const isGain = isNetSettlement && (activeToast.netProfit ?? 0) > 0;
  const isEven = isNetSettlement && (activeToast.netProfit ?? 0) === 0;
  const isMegaWin = activeToast.amount >= 5000 || (activeToast.netProfit ?? 0) >= 5000;

  return (
    <>
      {/* FULL SCREEN MEGA WIN: Golden Flash Background & Coin/Laser Particle Shower */}
      {isMegaWin &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="fullscreen-mega-win-particles"
            className="fixed inset-0 pointer-events-none z-[99998] overflow-hidden select-none"
          >
            {/* 1.5s Ambient Golden Flash Screen */}
            {showGoldenFlash && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.32)_0%,rgba(217,119,6,0.16)_45%,transparent_75%)] golden-flash-bg pointer-events-none" />
            )}

            {/* Laser Neon Light Beams Sweeping Across Screen */}
            <div
              className="absolute top-1/4 -left-1/4 w-[150vw] h-1.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent laser-beam-effect shadow-[0_0_20px_rgba(245,158,11,0.9)]"
              style={{ '--beam-rot': '-18deg' } as React.CSSProperties}
            />
            <div
              className="absolute top-2/3 -left-1/4 w-[150vw] h-1 bg-gradient-to-r from-transparent via-yellow-200 to-transparent laser-beam-effect shadow-[0_0_16px_rgba(253,224,71,0.9)]"
              style={{ '--beam-rot': '14deg', animationDelay: '0.2s' } as React.CSSProperties}
            />
            <div
              className="absolute top-1/2 -left-1/4 w-[150vw] h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent laser-beam-effect shadow-[0_0_12px_rgba(245,158,11,0.8)]"
              style={{ '--beam-rot': '-8deg', animationDelay: '0.4s' } as React.CSSProperties}
            />

            {/* Falling 32 Golden Coin & Sparkle Particles */}
            {MEGA_WIN_PARTICLES.map((p, idx) => (
              <div
                key={idx}
                className="absolute coin-rain-particle pointer-events-none select-none"
                style={
                  {
                    left: `${p.left}%`,
                    top: '-60px',
                    '--fall-duration': `${p.duration}s`,
                    '--fall-delay': `${p.delay}s`,
                    fontSize: `${p.size}px`,
                    filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.85))',
                  } as React.CSSProperties
                }
              >
                {p.char}
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Floating Centered Win Banner */}
      <div
        className={`absolute top-3.5 left-1/2 -translate-x-1/2 z-40 pointer-events-none transition-all duration-300 ease-out transform ${
          fading
            ? 'opacity-0 -translate-y-3 scale-95'
            : 'opacity-100 translate-y-0 scale-100'
        }`}
      >
        <div
          className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl backdrop-blur-md shadow-2xl border-2 flex items-center gap-3 select-none ${
            isMegaWin || activeToast.isJackpot
              ? 'bg-gradient-to-r from-amber-950/95 via-yellow-900/95 to-amber-950/95 border-amber-300 text-white shadow-[0_0_40px_rgba(245,158,11,0.9)]'
              : isLoss
              ? 'bg-gradient-to-r from-rose-950/95 via-stone-900/95 to-stone-950/95 border-rose-500/80 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)]'
              : isGain || activeToast.amount > 0
              ? 'bg-gradient-to-r from-[#071f14]/95 via-[#0e3522]/95 to-[#071f14]/95 border-emerald-400/90 text-white shadow-[0_0_30px_rgba(16,185,129,0.6)]'
              : 'bg-stone-900/95 border-stone-700 text-stone-200 shadow-xl'
          }`}
        >
          {/* Glow Icon */}
          <div
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border shadow-md shrink-0 ${
              isMegaWin || activeToast.isJackpot
                ? 'bg-amber-500 text-stone-950 border-amber-200 animate-bounce'
                : isLoss
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/50'
                : isEven
                ? 'bg-stone-800 text-stone-300 border-stone-600'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
            }`}
          >
            {isMegaWin || activeToast.isJackpot ? (
              <Flame className="w-5 h-5 fill-current animate-pulse" />
            ) : isLoss ? (
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
            ) : isEven ? (
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-stone-300" />
            ) : isGain ? (
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            ) : (
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs sm:text-sm font-black tracking-wide ${
                  isMegaWin || activeToast.isJackpot
                    ? 'text-amber-200'
                    : isLoss
                    ? 'text-rose-200'
                    : isEven
                    ? 'text-stone-200'
                    : 'text-emerald-200'
                }`}
              >
                {activeToast.title}
              </span>
              {activeToast.multiplier && activeToast.multiplier > 1 && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-amber-400 text-stone-950">
                  {activeToast.multiplier}X
                </span>
              )}
              {isMegaWin && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-950 shadow animate-pulse">
                  MEGA WIN
                </span>
              )}
            </div>

            {/* Amount line */}
            <div className="flex items-baseline gap-1.5">
              {isNetSettlement ? (
                <>
                  <span className="text-[11px] text-stone-300">
                    {isLoss ? '淨結算虧損:' : isGain ? '淨結算獲利:' : '結算打平:'}
                  </span>
                  <span
                    className={`font-mono font-black text-base sm:text-lg tracking-tight ${
                      isLoss
                        ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                        : isGain
                        ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : 'text-stone-300'
                    }`}
                  >
                    {isGain ? '+' : ''}{(activeToast.netProfit ?? 0).toLocaleString()} 點
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] text-stone-300">獲得彩金:</span>
                  <span
                    className={`font-mono font-black text-base sm:text-lg tracking-tight ${
                      isMegaWin || activeToast.isJackpot
                        ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]'
                        : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                    }`}
                  >
                    +{activeToast.amount.toLocaleString()} 點
                  </span>
                </>
              )}
            </div>

            {(activeToast.subtitle || activeToast.description) && (
              <span className="text-[10px] text-stone-300/80 truncate max-w-sm">
                {activeToast.subtitle || activeToast.description}
              </span>
            )}

            {activeToast.extraBonusAmount && activeToast.extraBonusAmount > 0 && (
              <div className="flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="text-[10px] font-black text-amber-200">敬酒光環加碼:</span>
                <span className="text-xs font-mono font-black text-amber-300">
                  +${activeToast.extraBonusAmount.toLocaleString()} 額外籌碼
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
