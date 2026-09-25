import React from 'react';
import { useToastAura } from '../../utils/aura';

interface ToastAuraIndicatorProps {
  className?: string;
  showTableAmbient?: boolean;
}

/**
 * ToastAuraIndicator:
 * Pure ambient visual effect only.
 * Strictly NO text badges, NO popovers, and NO extension buttons as requested.
 */
export const ToastAuraIndicator: React.FC<ToastAuraIndicatorProps> = ({
  showTableAmbient = true,
}) => {
  const { isActive } = useToastAura();

  if (!isActive || !showTableAmbient) {
    return null;
  }

  return (
    <div
      id="toast-aura-ambient-layer"
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10"
    >
      {/* Subtle radiant golden ambient sheen */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-amber-500/12 via-amber-500/4 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08),transparent_65%)]" />

      {/* Floating golden sparkle particles (visual only, no text) */}
      <div
        className="aura-sparkle-float absolute bottom-6 left-[15%] w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fde047]"
        style={{ animationDelay: '0s', animationDuration: '3.4s' }}
      />
      <div
        className="aura-sparkle-float absolute bottom-8 left-[45%] w-1.5 h-1.5 rounded-full bg-yellow-200 shadow-[0_0_6px_#fef08a]"
        style={{ animationDelay: '1.2s', animationDuration: '4.1s' }}
      />
      <div
        className="aura-sparkle-float absolute bottom-5 right-[25%] w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"
        style={{ animationDelay: '2.1s', animationDuration: '3.6s' }}
      />
    </div>
  );
};
