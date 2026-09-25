import React from 'react';
import { CasinoChip } from './CasinoChip';

export interface TableBetSpotData {
  id: string;
  amount: number;
  label?: string;
  count?: number;
  customPositionClass?: string; // Optional custom positioning
}

export interface TableBetsOverlayProps {
  bets: Array<{
    id: string;
    amount: number;
    label?: string;
  }>;
  /**
   * Optional map of id to position styling or coordinates.
   * If not provided, will default to placing chips neatly or using data-bet-id anchors.
   */
  positionMap?: Record<string, { top?: string; left?: string; bottom?: string; right?: string; transform?: string }>;
  chipSize?: 'xs' | 'sm' | 'md' | 'lg';
  showAmountLabel?: boolean;
  className?: string;
}

/**
 * Global Table Bet Overlay Component & Helper
 * Renders physical golden-rimmed CasinoChips with synced glowing amount badges ($150)
 * directly over designated betting spots in #game-visual-area or any betting container.
 */
export const TableBetsOverlay: React.FC<TableBetsOverlayProps> = ({
  bets,
  positionMap = {},
  chipSize = 'xs',
  showAmountLabel = true,
  className = '',
}) => {
  const activeBets = bets.filter((b) => b.amount > 0);

  if (activeBets.length === 0) return null;

  return (
    <div className={`pointer-events-none ${className}`}>
      {activeBets.map((bet) => {
        const customPos = positionMap[bet.id];

        // Format compact currency text: e.g. $150, $1.5k, $25k
        const formattedAmount =
          bet.amount >= 1000000
            ? `$${(bet.amount / 1000000).toFixed(bet.amount % 1000000 === 0 ? 0 : 1)}M`
            : bet.amount >= 1000
            ? `$${(bet.amount / 1000).toFixed(bet.amount % 1000 === 0 ? 0 : 1)}k`
            : `$${bet.amount.toLocaleString()}`;

        return (
          <div
            key={bet.id}
            data-table-bet-id={bet.id}
            style={
              customPos
                ? {
                    position: 'absolute',
                    top: customPos.top,
                    left: customPos.left,
                    bottom: customPos.bottom,
                    right: customPos.right,
                    transform: customPos.transform || 'translate(-50%, -50%)',
                    zIndex: 25,
                  }
                : undefined
            }
            className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-200 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
          >
            {/* 3D Physical Casino Chip */}
            <CasinoChip amount={bet.amount} size={chipSize} />

            {/* Glowing Amount Label Pill below/beside chip */}
            {showAmountLabel && (
              <div className="mt-0.5 px-1.5 py-0.2 rounded-md bg-black/90 border border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.6)] text-[9px] sm:text-[10px] font-mono font-black text-amber-300 whitespace-nowrap leading-tight backdrop-blur-sm">
                {formattedAmount}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Functional helper to render standard chip + badge for an individual spot or button container
 */
export const renderBetChipBadge = (
  amount: number,
  options?: {
    size?: 'xs' | 'sm' | 'md';
    positionClass?: string;
    showLabel?: boolean;
  }
) => {
  if (amount <= 0) return null;
  const size = options?.size || 'xs';
  const pos = options?.positionClass || 'absolute -top-2.5 -right-2.5 z-20';
  const showLabel = options?.showLabel !== false;

  const formattedAmount =
    amount >= 1000000
      ? `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`
      : amount >= 1000
      ? `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
      : `$${amount.toLocaleString()}`;

  return (
    <div
      className={`${pos} flex flex-col items-center pointer-events-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] animate-in zoom-in-75 duration-150`}
    >
      <CasinoChip amount={amount} size={size} />
      {showLabel && (
        <span className="mt-0.5 px-1 py-0.2 rounded bg-black/95 border border-amber-400/90 text-amber-300 font-mono font-black text-[8px] sm:text-[9px] leading-tight shadow-[0_0_6px_rgba(245,158,11,0.7)] whitespace-nowrap">
          {formattedAmount}
        </span>
      )}
    </div>
  );
};
