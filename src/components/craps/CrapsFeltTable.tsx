import React from 'react';
import { CrapsBetItem, CrapsBetType, CrapsPhase } from '../../types/craps';
import { CrapsDice } from './CrapsDice';
import { CrapsPuck } from './CrapsPuck';
import { CasinoChip } from '../common/CasinoChip';
import { Sparkles, ShieldAlert, Award, Zap, Flame, Crown, Target } from 'lucide-react';

interface CrapsFeltTableProps {
  phase: CrapsPhase;
  point: number | null;
  dice: [number, number];
  isRolling: boolean;
  currentBets: CrapsBetItem[];
  onPlaceBet: (type: CrapsBetType, label: string, payoutRatioText: string, multiplier: number) => void;
  onRemoveBet: (type: CrapsBetType) => void;
  disabled?: boolean;
}

const PLACE_CONFIG: {
  num: number;
  type: CrapsBetType;
  payout: string;
  label: string;
}[] = [
  { num: 4, type: 'place_four', payout: '9:5', label: 'Place 4 點' },
  { num: 5, type: 'place_five', payout: '7:5', label: 'Place 5 點' },
  { num: 6, type: 'place_six', payout: '7:6', label: 'Place 6 點' },
  { num: 8, type: 'place_eight', payout: '7:6', label: 'Place 8 點' },
  { num: 9, type: 'place_nine', payout: '7:5', label: 'Place 9 點' },
  { num: 10, type: 'place_ten', payout: '9:5', label: 'Place 10 點' },
];

export const CrapsFeltTable: React.FC<CrapsFeltTableProps> = ({
  phase,
  point,
  dice,
  isRolling,
  currentBets,
  onPlaceBet,
  onRemoveBet,
  disabled = false,
}) => {
  const getBetAmount = (type: CrapsBetType) => {
    const item = currentBets.find((b) => b.type === type);
    return item ? item.amount : 0;
  };

  const handleCellClick = (
    e: React.MouseEvent,
    type: CrapsBetType,
    label: string,
    payoutRatioText: string,
    multiplier: number
  ) => {
    e.preventDefault();
    if (disabled) return;
    onPlaceBet(type, label, payoutRatioText, multiplier);
  };

  const handleContextMenu = (e: React.MouseEvent, type: CrapsBetType) => {
    e.preventDefault();
    if (disabled) return;
    onRemoveBet(type);
  };

  const renderChip = (amount: number) => {
    if (amount <= 0) return null;
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none drop-shadow-2xl animate-in zoom-in-75 duration-150">
        <CasinoChip amount={amount} size="xs" />
      </div>
    );
  };

  const sum = dice[0] + dice[1];

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 rounded-2xl bg-gradient-to-b from-[#082a1b] via-[#041a10] to-[#020d08] border-2 border-emerald-500/30 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_12px_36px_rgba(0,0,0,0.6)] relative overflow-hidden select-none">
      {/* Authentic Diamond Craps Bumper Rails Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

      {/* 1. TOP POINT NUMBERS TRACK (4, 5, 6, 8, 9, 10) - INTERACTIVE PLACE BETS + PUCK */}
      <div className="w-full shrink-0 flex items-center justify-between gap-1.5 p-1.5 rounded-xl bg-black/60 border border-emerald-500/30 backdrop-blur-md z-10 shadow-lg">
        {/* Left: Global Puck State Indicator */}
        <div className="flex items-center gap-2 pl-1 shrink-0">
          <CrapsPuck isOn={phase === 'point'} size="sm" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-stone-300">
              {phase === 'come_out' ? '首擲階段 (COME-OUT)' : '拉鋸階段 (POINT PHASE)'}
            </span>
            <span className="text-xs font-mono font-black text-amber-300">
              {point ? `目標點數: 【${point} 點】` : '等待定點 (OFF)'}
            </span>
          </div>
        </div>

        {/* Center/Right: Point Numbers Rail (Interactive Place Bets) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-end">
          {PLACE_CONFIG.map(({ num, type, payout, label }) => {
            const isTargetPoint = point === num;
            const betAmount = getBetAmount(type);

            return (
              <button
                key={num}
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, type, label, payout, 1)}
                onContextMenu={(e) => handleContextMenu(e, type)}
                title={`點擊下注 Place ${num} 點 (賠率 ${payout})`}
                className={`relative flex-1 max-w-[56px] sm:max-w-[70px] h-12 sm:h-13 rounded-xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isTargetPoint
                    ? 'bg-gradient-to-b from-amber-500/30 via-yellow-600/20 to-amber-950/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.6)] ring-2 ring-amber-300/80 scale-102'
                    : betAmount > 0
                    ? 'bg-emerald-950/80 border-amber-400 ring-1 ring-amber-400/60'
                    : 'bg-[#06180f]/90 border-emerald-600/40 hover:border-emerald-400 text-emerald-100/90'
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                {/* Floating Puck on active Point */}
                {isTargetPoint && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 animate-bounce">
                    <CrapsPuck isOn={true} size="sm" />
                  </div>
                )}
                <span
                  className={`font-mono font-black text-sm sm:text-base leading-none ${
                    isTargetPoint
                      ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                      : 'text-white'
                  }`}
                >
                  {num}
                </span>
                <span className="text-[8px] sm:text-[9px] font-mono text-emerald-400/90 font-bold mt-0.5">
                  {payout}
                </span>
                {renderChip(betAmount)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CENTER STAGE: ROLLING DICE ARENA & ROUND SUMMARY */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative my-1 py-1 px-3">
        {/* Felt Craps Brand Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none select-none opacity-10">
          <h2 className="text-3xl sm:text-5xl font-black text-amber-300 tracking-widest uppercase">
            CRAPS
          </h2>
          <p className="text-[10px] sm:text-xs font-mono tracking-widest text-emerald-400">
            LAS VEGAS CASINO STANDARD
          </p>
        </div>

        {/* Dice & Result Presentation Box */}
        <div className="flex flex-col items-center gap-1.5 z-10">
          {/* Animated 3D Rolling Dice Pair */}
          <div className="flex items-center gap-3 sm:gap-5">
            <CrapsDice
              value={dice[0]}
              isRolling={isRolling}
              size="lg"
              rotationOffset={-8}
            />
            <CrapsDice
              value={dice[1]}
              isRolling={isRolling}
              size="lg"
              rotationOffset={12}
            />
          </div>

          {/* Sum & Outcome Ribbon */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-stone-950/90 border border-amber-500/50 shadow-2xl backdrop-blur-md">
            <span className="text-xs font-bold text-stone-300">總點數:</span>
            <span className="font-mono font-black text-base sm:text-xl text-amber-300">
              {isRolling ? '?' : sum} 點
            </span>
            <span className="text-stone-500">|</span>
            <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-300">
              {isRolling
                ? '🎲 擲骰進行中...'
                : sum === 7
                ? '★ SEVEN 7 ★'
                : sum === 11
                ? '★ YO-ELEVEN 11 ★'
                : [2, 3, 12].includes(sum)
                ? '💀 CRAPS 💀'
                : `POINT ${sum}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FELT INTERACTIVE BETTING ZONES */}
      <div className="w-full flex flex-col gap-1 z-10 shrink-0">
        {/* Row A: Pass Line & Don't Pass Primary Rail Bets */}
        <div className="grid grid-cols-2 gap-1">
          {/* PASS LINE */}
          {(() => {
            const betAmount = getBetAmount('pass_line');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'pass_line', 'Pass Line (過關線)', '1:1', 1)}
                onContextMenu={(e) => handleContextMenu(e, 'pass_line')}
                className={`bet-cell relative min-h-[46px] sm:min-h-[50px] p-1.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-amber-950/70 via-amber-900/50 to-[#0c1f14]/80 hover:from-amber-900/90 hover:to-[#133020] border-amber-400/80 text-amber-100 shadow-xl cursor-pointer ${
                  betAmount > 0
                    ? 'ring-2 ring-amber-300 font-black border-amber-300 bg-amber-950/90'
                    : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'}`}
              >
                <div className="flex items-center gap-1 text-amber-300 font-black text-xs sm:text-sm tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>PASS LINE (過關線)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono">
                  <span className="text-stone-300 font-medium">首擲7/11勝 &bull; 點數拉鋸</span>
                  <span className="text-amber-300 font-black">1:1</span>
                </div>
                {renderChip(betAmount)}
              </button>
            );
          })()}

          {/* DON'T PASS */}
          {(() => {
            const betAmount = getBetAmount('dont_pass');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'dont_pass', "Don't Pass (不過關)", '1:1', 1)}
                onContextMenu={(e) => handleContextMenu(e, 'dont_pass')}
                className={`bet-cell relative min-h-[46px] sm:min-h-[50px] p-1.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-gradient-to-b from-slate-900/80 via-slate-800/60 to-[#0c1a14]/80 hover:from-slate-800 hover:to-[#142820] border-slate-500/60 text-slate-100 shadow-xl cursor-pointer ${
                  betAmount > 0
                    ? 'ring-2 ring-blue-400 font-black border-blue-400 bg-slate-900/95'
                    : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-98'}`}
              >
                <div className="flex items-center gap-1 text-blue-300 font-black text-xs sm:text-sm tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  <span>DON'T PASS (不過關)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono">
                  <span className="text-stone-300 font-medium">首擲2/3勝 &bull; 壓7勝 (12退注)</span>
                  <span className="text-amber-300 font-black">1:1</span>
                </div>
                {renderChip(betAmount)}
              </button>
            );
          })()}
        </div>

        {/* Row B: HARDWAYS DOUBLE BETS (Hard 4, Hard 6, Hard 8, Hard 10) */}
        <div className="grid grid-cols-4 gap-1">
          {[
            { type: 'hard_four' as CrapsBetType, label: 'Hard 4 (2-2)', payout: '7:1', dice: '⚁⚁' },
            { type: 'hard_six' as CrapsBetType, label: 'Hard 6 (3-3)', payout: '9:1', dice: '⚂⚂' },
            { type: 'hard_eight' as CrapsBetType, label: 'Hard 8 (4-4)', payout: '9:1', dice: '⚃⚃' },
            { type: 'hard_ten' as CrapsBetType, label: 'Hard 10 (5-5)', payout: '7:1', dice: '⚄⚄' },
          ].map(({ type, label, payout, dice }) => {
            const betAmount = getBetAmount(type);
            return (
              <button
                key={type}
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, type, label, payout, 1)}
                onContextMenu={(e) => handleContextMenu(e, type)}
                className={`bet-cell relative min-h-[42px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-stone-900/85 hover:bg-stone-800 border-amber-500/30 text-stone-200 cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400 bg-amber-950/60' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300 leading-none">
                  <span>{dice}</span>
                  <span>{label}</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5">
                  賠率 {payout}
                </span>
                {renderChip(betAmount)}
              </button>
            );
          })}
        </div>

        {/* Row C: FIELD & PROPOSITION SINGLE-ROLL BETS */}
        <div className="grid grid-cols-6 gap-1">
          {/* FIELD (2,3,4,9,10,11,12) - spans 2 cols */}
          {(() => {
            const betAmount = getBetAmount('field');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'field', 'Field (現場 2/3/4/9/10/11/12)', '1:1 / 1:2', 1)}
                onContextMenu={(e) => handleContextMenu(e, 'field')}
                className={`col-span-2 bet-cell relative min-h-[44px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-gradient-to-b from-emerald-950/80 to-[#05130b] hover:from-emerald-900/80 border-emerald-500/50 text-emerald-100 shadow-md cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <div className="flex items-center gap-1 text-emerald-300 font-black text-[11px]">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>FIELD (現場 2/12雙倍)</span>
                </div>
                <span className="text-[9px] font-mono text-stone-300">
                  2, 3, 4, 9, 10, 11, 12
                </span>
                {renderChip(betAmount)}
              </button>
            );
          })()}

          {/* ANY SEVEN (4:1) */}
          {(() => {
            const betAmount = getBetAmount('any_seven');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'any_seven', 'Any Seven (單局7點)', '1:4', 4)}
                onContextMenu={(e) => handleContextMenu(e, 'any_seven')}
                className={`bet-cell relative min-h-[44px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-rose-950/70 hover:bg-rose-900/70 border-rose-500/40 text-rose-100 cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className="text-[10px] font-black text-rose-300 leading-none">ANY 7</span>
                <span className="text-[9px] font-mono text-amber-300 font-bold mt-0.5">1:4</span>
                {renderChip(betAmount)}
              </button>
            );
          })()}

          {/* ANY CRAPS (2,3,12 - 7:1) */}
          {(() => {
            const betAmount = getBetAmount('any_craps');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'any_craps', 'Any Craps (2,3,12點)', '1:7', 7)}
                onContextMenu={(e) => handleContextMenu(e, 'any_craps')}
                className={`bet-cell relative min-h-[44px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-purple-950/70 hover:bg-purple-900/70 border-purple-500/40 text-purple-100 cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className="text-[10px] font-black text-purple-300 leading-none">CRAPS</span>
                <span className="text-[9px] font-mono text-amber-300 font-bold mt-0.5">1:7</span>
                {renderChip(betAmount)}
              </button>
            );
          })()}

          {/* YO-ELEVEN (15:1) */}
          {(() => {
            const betAmount = getBetAmount('yo_eleven');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'yo_eleven', 'Yo-11 (11點)', '1:15', 15)}
                onContextMenu={(e) => handleContextMenu(e, 'yo_eleven')}
                className={`bet-cell relative min-h-[44px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-amber-950/70 hover:bg-amber-900/70 border-amber-500/40 text-amber-100 cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className="text-[10px] font-black text-amber-300 leading-none">YO-11</span>
                <span className="text-[9px] font-mono text-amber-300 font-bold mt-0.5">1:15</span>
                {renderChip(betAmount)}
              </button>
            );
          })()}

          {/* ACES (2点) & 12点 (30:1) */}
          {(() => {
            const betAmount = getBetAmount('aces_two');
            return (
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => handleCellClick(e, 'aces_two', 'Aces 2 (雙1點)', '1:30', 30)}
                onContextMenu={(e) => handleContextMenu(e, 'aces_two')}
                className={`bet-cell relative min-h-[44px] p-1 rounded-lg border transition-all flex flex-col items-center justify-center bg-indigo-950/70 hover:bg-indigo-900/70 border-indigo-500/40 text-indigo-100 cursor-pointer ${
                  betAmount > 0 ? 'ring-2 ring-amber-400 font-black border-amber-400' : ''
                } ${disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className="text-[10px] font-black text-indigo-300 leading-none">ACES 2</span>
                <span className="text-[9px] font-mono text-amber-300 font-bold mt-0.5">1:30</span>
                {renderChip(betAmount)}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
