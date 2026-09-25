import React, { useState } from 'react';
import { BetItem, BetType } from '../types/roulette';
import { getNumberColor, WHEEL_NUMBERS } from '../utils/constants';
import { sound } from '../utils/audio';
import { renderBetChipBadge } from './common/TableBetsOverlay';
import { Layers, Compass, Target } from 'lucide-react';
import { toastService } from '../utils/toast';

interface BettingTableProps {
  balance?: number;
  currentBets: BetItem[];
  selectedChip: number;
  onPlaceBet: (type: BetType, value?: number, label?: string) => void;
  onPlaceBatchBets?: (items: { type: BetType; value?: number; label?: string }[]) => void;
  onRemoveBetSpot: (id: string) => void;
  disabled: boolean;
  hotNumbers?: number[];
  coldNumbers?: number[];
}

// French Roulette Racetrack Sectors
const VOISINS_ZERO = [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25];
const TIERS_CYLINDRE = [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33];
const ORPHELINS = [1, 20, 14, 31, 9, 17, 34, 6];
const JEU_ZERO = [12, 35, 3, 26, 0, 32, 15];

export const BettingTable: React.FC<BettingTableProps> = ({
  balance = 0,
  currentBets,
  selectedChip,
  onPlaceBet,
  onPlaceBatchBets,
  onRemoveBetSpot,
  disabled,
  hotNumbers = [],
  coldNumbers = [],
}) => {
  // Tab switcher: 'felt' (歐式輪盤標準桌面全貌) | 'racetrack' (法式跑道/扇區注)
  const [activeTab, setActiveTab] = useState<'felt' | 'racetrack'>('felt');
  const [neighborRange, setNeighborRange] = useState<number>(2); // ±1, ±2, ±3, ±4
  const [hoveredRacetrackNum, setHoveredRacetrackNum] = useState<number | null>(null);

  const getBetAmount = (id: string): number => {
    const found = currentBets.find((b) => b.id === id);
    return found ? found.amount : 0;
  };

  // Helper to calculate neighbor numbers in wheel sequence
  const getNeighbors = (num: number, range: number): number[] => {
    const index = WHEEL_NUMBERS.indexOf(num);
    if (index === -1) return [num];
    const list: number[] = [];
    for (let offset = -range; offset <= range; offset++) {
      const idx = (index + offset + WHEEL_NUMBERS.length) % WHEEL_NUMBERS.length;
      list.push(WHEEL_NUMBERS[idx]);
    }
    return list;
  };

  const handleBetSector = (name: string, numbers: number[]) => {
    if (disabled) return;
    const requiredAmount = numbers.length * selectedChip;
    if (balance < requiredAmount) {
      sound.playLoss();
      toastService.warn(`籌碼餘額不足！下注該區域需要 $${requiredAmount.toLocaleString()} 籌碼`);
      return;
    }
    const items = numbers.map((n) => ({
      type: 'straight' as BetType,
      value: n,
      label: `單號 ${n} (${name})`,
    }));
    if (onPlaceBatchBets) {
      onPlaceBatchBets(items);
    } else {
      sound.playChip();
      items.forEach((it) => onPlaceBet(it.type, it.value, it.label));
    }
  };

  const handleBetNeighbors = (num: number) => {
    if (disabled) return;
    const neighbors = getNeighbors(num, neighborRange);
    const requiredAmount = neighbors.length * selectedChip;
    if (balance < requiredAmount) {
      sound.playLoss();
      toastService.warn(`籌碼餘額不足！下注該鄰號區需要 $${requiredAmount.toLocaleString()} 籌碼`);
      return;
    }
    const items = neighbors.map((n) => ({
      type: 'straight' as BetType,
      value: n,
      label: `單號 ${n} (${num} 鄰號)`,
    }));
    if (onPlaceBatchBets) {
      onPlaceBatchBets(items);
    } else {
      sound.playChip();
      items.forEach((it) => onPlaceBet(it.type, it.value, it.label));
    }
  };

  const handleCellClick = (
    e: React.MouseEvent,
    type: BetType,
    id: string,
    value?: number,
    label?: string
  ) => {
    e.preventDefault();
    if (disabled) return;
    if (e.button === 2) {
      // Right click to remove
      if (getBetAmount(id) > 0) {
        sound.playClick();
        onRemoveBetSpot(id);
      }
      return;
    }
    sound.playChip();
    onPlaceBet(type, value, label);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    if (disabled) return;
    if (getBetAmount(id) > 0) {
      sound.playClick();
      onRemoveBetSpot(id);
    }
  };

  // Helper to render dropped Casino Chip on bet spot with amount badge
  const renderChip = (amount: number) => {
    return renderBetChipBadge(amount, {
      size: 'xs',
      positionClass: 'absolute z-20 -top-2 -right-1 pointer-events-none drop-shadow-md',
      showLabel: true,
    });
  };

  // Standard 3 rows in European Roulette Table layout:
  // Row 1 (Top): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36 (Column 3)
  // Row 2 (Middle): 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 (Column 2)
  // Row 3 (Bottom): 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34 (Column 1)
  const row1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
  const row2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
  const row3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  // Render number cell for Classic Felt view (Spacious and enlarged)
  const renderFeltNumberCell = (num: number) => {
    const id = `straight-${num}`;
    const amount = getBetAmount(id);
    const color = getNumberColor(num);
    const isRed = color === 'red';
    const isHot = hotNumbers.includes(num);
    const isCold = coldNumbers.includes(num);

    return (
      <button
        key={id}
        id={id}
        type="button"
        disabled={disabled}
        onClick={(e) => handleCellClick(e, 'straight', id, num, `直注 ${num}`)}
        onContextMenu={(e) => handleContextMenu(e, id)}
        className={`bet-cell relative h-11 sm:h-12 md:h-13.5 flex flex-col items-center justify-center font-mono rounded-xl border transition-all duration-150 group select-none shadow-sm ${
          isRed
            ? 'bg-gradient-to-b from-rose-600 via-rose-700 to-rose-900 hover:from-rose-500 hover:to-rose-800 border-rose-400/80 text-white hover:shadow-[0_0_14px_rgba(244,63,94,0.7)]'
            : 'bg-gradient-to-b from-zinc-800 via-stone-900 to-zinc-950 hover:from-zinc-700 hover:to-stone-900 border-zinc-600 text-zinc-100 hover:shadow-[0_0_14px_rgba(255,255,255,0.35)]'
        } ${
          amount > 0
            ? 'ring-2 ring-amber-400 font-black scale-102 z-10 shadow-[0_0_16px_rgba(245,158,11,0.85)]'
            : ''
        } ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'cursor-pointer active:scale-95'
        }`}
        title={`單號 ${num} (${isRed ? '紅' : '黑'}) - 賠率 1:35 ${isHot ? '[🔥熱門號碼]' : ''} ${isCold ? '[❄️冷門號碼]' : ''}`}
      >
        {/* Hot / Cold mini indicator badge */}
        {isHot && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
          </span>
        )}
        {isCold && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_6px_#22d3ee]"></span>
          </span>
        )}

        <span className="text-base sm:text-lg font-black drop-shadow-md leading-none">
          {num}
        </span>
        <span className="text-[9px] sm:text-[10px] font-sans font-bold opacity-80 leading-none mt-0.5">
          {isRed ? '紅' : '黑'}
        </span>
        {renderChip(amount)}
      </button>
    );
  };

  return (
    <div
      id="roulette-betting-table"
      className="w-full flex flex-col gap-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#0e131d] via-[#090d15] to-[#06090e] border border-amber-500/30 shadow-2xl backdrop-blur select-none"
    >
      {/* 1. Header with View Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800/80 gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-sm sm:text-base">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"></span>
          <span>歐式輪盤下注區</span>
          <span className="text-xs text-stone-400 font-mono hidden md:inline">(單 0 賠率 1:35)</span>
        </div>

        {/* Tab Switcher: 賭桌 vs 法式跑道 */}
        <div className="flex items-center bg-stone-950/90 p-1 rounded-xl border border-stone-800 shadow-inner ml-auto">
          <button
            id="tab-felt-bets"
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('felt');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'felt'
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black'
                : 'text-stone-400 hover:text-white'
            }`}
            title="標準歐式賭桌完整佈局 (直注、打、列、紅黑、單雙、大小)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>賭桌</span>
          </button>

          <button
            id="tab-racetrack-bets"
            type="button"
            onClick={() => {
              sound.playClick();
              setActiveTab('racetrack');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'racetrack'
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black'
                : 'text-stone-400 hover:text-white'
            }`}
            title="法式跑道扇區注 (零號旁角、輪盤下角、孤兒注、鄰號注)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>法式跑道</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPLETE AUTHENTIC EUROPEAN ROULETTE TABLE FELT (寬敞放大經典賭桌全貌) */}
      {/* ========================================================================= */}
      {activeTab === 'felt' && (
        <div className="flex flex-col gap-2 animate-fade-in p-3 rounded-2xl bg-gradient-to-b from-[#06241b] via-[#041d15] to-[#02140e] border-2 border-emerald-500/40 shadow-inner">
          {/* Main Felt Structure:
              Left: Single '0' Green Column
              Center: 12 Columns (Top 3x12 numbers, Middle 3 Dozens, Bottom 6 Outside bets)
              Right: 3 Column (2:1) Bets aligned with 3 rows
          */}
          <div className="flex gap-1.5 sm:gap-2 w-full">
            {/* 1. Left '0' Column (Spans upper 3 rows) */}
            <div className="w-14 sm:w-16 md:w-20 shrink-0 flex flex-col">
              {(() => {
                const id = 'straight-0';
                const amount = getBetAmount(id);
                return (
                  <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    onClick={(e) => handleCellClick(e, 'straight', id, 0, '直注 0')}
                    onContextMenu={(e) => handleContextMenu(e, id)}
                    className={`bet-cell relative w-full h-full min-h-[140px] rounded-xl flex flex-col items-center justify-center font-mono font-black transition-all bg-gradient-to-b from-emerald-600 via-emerald-800 to-emerald-950 hover:from-emerald-500 hover:to-emerald-700 border-2 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.35)] ${
                      amount > 0
                        ? 'ring-2 ring-amber-400 font-black scale-102 z-10 shadow-[0_0_18px_rgba(245,158,11,0.9)]'
                        : ''
                    } ${
                      disabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer active:scale-95'
                    }`}
                    title="直注 0 - 賠率 1:35"
                  >
                    <span className="text-2xl sm:text-4xl font-black drop-shadow-lg">0</span>
                    <span className="text-[10px] sm:text-xs text-emerald-200 font-sans font-bold mt-1">
                      零 (1:35)
                    </span>
                    {renderChip(amount)}
                  </button>
                );
              })()}
            </div>

            {/* 2. Center 12-Column Grid (1-36 Numbers) */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {/* Row 1 (Top: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36) */}
              <div className="grid grid-cols-12 gap-1 sm:gap-1.5 min-w-0">
                {row1.map((num) => renderFeltNumberCell(num))}
              </div>

              {/* Row 2 (Middle: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35) */}
              <div className="grid grid-cols-12 gap-1 sm:gap-1.5 min-w-0">
                {row2.map((num) => renderFeltNumberCell(num))}
              </div>

              {/* Row 3 (Bottom: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34) */}
              <div className="grid grid-cols-12 gap-1 sm:gap-1.5 min-w-0">
                {row3.map((num) => renderFeltNumberCell(num))}
              </div>
            </div>

            {/* 3. Right 2:1 Column Bets (Aligned with Row 1, Row 2, Row 3) */}
            <div className="w-14 sm:w-16 md:w-20 shrink-0 flex flex-col gap-1.5">
              {/* Col 3 (Row 1) */}
              {(() => {
                const id = 'col_3';
                const amount = getBetAmount(id);
                return (
                  <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    onClick={(e) =>
                      handleCellClick(e, 'col_3', id, undefined, '第 3 行 (2:1)')
                    }
                    onContextMenu={(e) => handleContextMenu(e, id)}
                    className={`relative w-full h-11 sm:h-12 md:h-13.5 flex flex-col items-center justify-center font-mono font-bold rounded-xl border bg-stone-900/90 hover:bg-stone-800 border-amber-500/50 text-amber-300 shadow-sm transition-all ${
                      amount > 0 ? 'ring-2 ring-amber-400 font-black z-10 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''
                    } ${
                      disabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer active:scale-95'
                    }`}
                    title="第 3 行 (3, 6, 9... 36) - 賠率 1:2"
                  >
                    <span className="font-black text-sm sm:text-base leading-none">2:1</span>
                    <span className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">第3行</span>
                    {renderChip(amount)}
                  </button>
                );
              })()}

              {/* Col 2 (Row 2) */}
              {(() => {
                const id = 'col_2';
                const amount = getBetAmount(id);
                return (
                  <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    onClick={(e) =>
                      handleCellClick(e, 'col_2', id, undefined, '第 2 行 (2:1)')
                    }
                    onContextMenu={(e) => handleContextMenu(e, id)}
                    className={`relative w-full h-11 sm:h-12 md:h-13.5 flex flex-col items-center justify-center font-mono font-bold rounded-xl border bg-stone-900/90 hover:bg-stone-800 border-amber-500/50 text-amber-300 shadow-sm transition-all ${
                      amount > 0 ? 'ring-2 ring-amber-400 font-black z-10 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''
                    } ${
                      disabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer active:scale-95'
                    }`}
                    title="第 2 行 (2, 5, 8... 35) - 賠率 1:2"
                  >
                    <span className="font-black text-sm sm:text-base leading-none">2:1</span>
                    <span className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">第2行</span>
                    {renderChip(amount)}
                  </button>
                );
              })()}

              {/* Col 1 (Row 3) */}
              {(() => {
                const id = 'col_1';
                const amount = getBetAmount(id);
                return (
                  <button
                    id={id}
                    type="button"
                    disabled={disabled}
                    onClick={(e) =>
                      handleCellClick(e, 'col_1', id, undefined, '第 1 行 (2:1)')
                    }
                    onContextMenu={(e) => handleContextMenu(e, id)}
                    className={`relative w-full h-11 sm:h-12 md:h-13.5 flex flex-col items-center justify-center font-mono font-bold rounded-xl border bg-stone-900/90 hover:bg-stone-800 border-amber-500/50 text-amber-300 shadow-sm transition-all ${
                      amount > 0 ? 'ring-2 ring-amber-400 font-black z-10 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''
                    } ${
                      disabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer active:scale-95'
                    }`}
                    title="第 1 行 (1, 4, 7... 34) - 賠率 1:2"
                  >
                    <span className="font-black text-sm sm:text-base leading-none">2:1</span>
                    <span className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5">第1行</span>
                    {renderChip(amount)}
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Dozens & Outside Bets aligned seamlessly under the 12 columns */}
          <div className="flex gap-1.5 sm:gap-2 w-full mt-1">
            {/* Left Spacer matching 0 column */}
            <div className="w-14 sm:w-16 md:w-20 shrink-0 hidden sm:block"></div>

            {/* Center Aligned Dozens & Outside Propositions */}
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {/* Dozens Row (1st 12, 2nd 12, 3rd 12) - 3 blocks matching 4 cols each */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {[
                  { id: 'dozen_1', label: '1st 12 (前區 1-12)', type: 'dozen_1' as BetType },
                  { id: 'dozen_2', label: '2nd 12 (中區 13-24)', type: 'dozen_2' as BetType },
                  { id: 'dozen_3', label: '3rd 12 (後區 25-36)', type: 'dozen_3' as BetType },
                ].map((item) => {
                  const amount = getBetAmount(item.id);
                  return (
                    <button
                      key={item.id}
                      id={item.id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, item.type, item.id, undefined, item.label)}
                      onContextMenu={(e) => handleContextMenu(e, item.id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 hover:from-stone-800 hover:to-stone-900 border-amber-500/40 text-amber-200 flex items-center justify-center gap-2 shadow-sm ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10 shadow-[0_0_12px_rgba(245,158,11,0.8)]' : ''
                      } ${
                        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'
                      }`}
                      title={`${item.label} - 賠率 1:2`}
                    >
                      <span className="truncate font-black">{item.label}</span>
                      <span className="text-xs sm:text-sm text-amber-400 font-mono font-black shrink-0">(1:2)</span>
                      {renderChip(amount)}
                    </button>
                  );
                })}
              </div>

              {/* Outside Row: 6 Propositions (1-18, EVEN, RED, BLACK, ODD, 19-36) */}
              <div className="grid grid-cols-6 gap-1.5 w-full">
                {/* 1-18 Low */}
                {(() => {
                  const id = 'low';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'low', id, undefined, '小 (1-18)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-stone-900/90 hover:bg-stone-800 border-amber-500/40 text-amber-200 flex items-center justify-center gap-1.5 shadow-sm ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="小 (1-18) - 賠率 1:1"
                    >
                      <span className="font-bold">1-18</span>
                      <span className="text-[10px] text-amber-400 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}

                {/* Even */}
                {(() => {
                  const id = 'even';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'even', id, undefined, '雙數 (EVEN)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-stone-900/90 hover:bg-stone-800 border-amber-500/40 text-amber-200 flex items-center justify-center gap-1.5 shadow-sm ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="雙數 (EVEN) - 賠率 1:1"
                    >
                      <span className="font-bold">雙數</span>
                      <span className="text-[10px] text-amber-400 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}

                {/* Red 🔴 */}
                {(() => {
                  const id = 'red';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'red', id, undefined, '紅色 (RED)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-gradient-to-r from-rose-600 via-rose-700 to-rose-900 hover:from-rose-500 hover:to-rose-800 border-rose-400 text-white flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.4)] ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="紅色 (RED) - 賠率 1:1"
                    >
                      <span>🔴 紅</span>
                      <span className="text-[10px] text-rose-200 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}

                {/* Black ⚫ */}
                {(() => {
                  const id = 'black';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'black', id, undefined, '黑色 (BLACK)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-gradient-to-r from-zinc-800 via-stone-900 to-black hover:from-zinc-700 hover:to-zinc-900 border-zinc-500 text-zinc-100 flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(255,255,255,0.2)] ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="黑色 (BLACK) - 賠率 1:1"
                    >
                      <span>⚫ 黑</span>
                      <span className="text-[10px] text-zinc-300 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}

                {/* Odd */}
                {(() => {
                  const id = 'odd';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'odd', id, undefined, '單數 (ODD)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-stone-900/90 hover:bg-stone-800 border-amber-500/40 text-amber-200 flex items-center justify-center gap-1.5 shadow-sm ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="單數 (ODD) - 賠率 1:1"
                    >
                      <span className="font-bold">單數</span>
                      <span className="text-[10px] text-amber-400 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}

                {/* High (19-36) */}
                {(() => {
                  const id = 'high';
                  const amount = getBetAmount(id);
                  return (
                    <button
                      id={id}
                      type="button"
                      disabled={disabled}
                      onClick={(e) => handleCellClick(e, 'high', id, undefined, '大 (19-36)')}
                      onContextMenu={(e) => handleContextMenu(e, id)}
                      className={`bet-cell relative h-10 sm:h-11 md:h-12 rounded-xl border font-black text-xs sm:text-sm transition-all bg-stone-900/90 hover:bg-stone-800 border-amber-500/40 text-amber-200 flex items-center justify-center gap-1.5 shadow-sm ${
                        amount > 0 ? 'ring-2 ring-amber-400 font-black z-10' : ''
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-98'}`}
                      title="大 (19-36) - 賠率 1:1"
                    >
                      <span className="font-bold">19-36</span>
                      <span className="text-[10px] text-amber-400 font-mono font-black">1:1</span>
                      {renderChip(amount)}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Right Spacer matching 2:1 column */}
            <div className="w-14 sm:w-16 md:w-20 shrink-0 hidden sm:block"></div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FRENCH RACETRACK & SECTOR CALL BETS (法式跑道與扇區注) */}
      {/* ========================================================================= */}
      {activeTab === 'racetrack' && (
        <div className="flex flex-col gap-2.5 animate-fade-in p-3 rounded-2xl bg-gradient-to-b from-[#0a111c] to-[#060a12] border border-amber-500/30 shadow-inner">
          {/* 1. Sector Quick Bets (4 Classic French Bets Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Voisins du Zero */}
            {(() => {
              const sectorCost = VOISINS_ZERO.length * selectedChip;
              const sectorTotalBets = VOISINS_ZERO.reduce((acc, n) => acc + getBetAmount(`straight-${n}`), 0);
              return (
                <div className="flex flex-col justify-between p-2.5 rounded-xl bg-stone-900/95 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-amber-300">零號旁角</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">45.9% (17碼)</span>
                  </div>
                  <div className="mt-2">
                    <button
                      id="btn-sector-voisins"
                      type="button"
                      disabled={disabled}
                      onClick={() => handleBetSector('零號旁角', VOISINS_ZERO)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (disabled) return;
                        if (sectorTotalBets > 0) {
                          sound.playClick();
                          VOISINS_ZERO.forEach((n) => onRemoveBetSpot(`straight-${n}`));
                        }
                      }}
                      className="w-full py-1.5 px-1 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="左鍵點擊下注 • 右鍵點擊撤回此扇區注"
                    >
                      下注 ${sectorCost.toLocaleString()}
                    </button>
                  </div>
                  {sectorTotalBets > 0 && (
                    <div className="absolute -top-2 -right-1">
                      {renderChip(sectorTotalBets)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Tiers du Cylindre */}
            {(() => {
              const sectorCost = TIERS_CYLINDRE.length * selectedChip;
              const sectorTotalBets = TIERS_CYLINDRE.reduce((acc, n) => acc + getBetAmount(`straight-${n}`), 0);
              return (
                <div className="flex flex-col justify-between p-2.5 rounded-xl bg-stone-900/95 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-amber-300">輪盤下角</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">32.4% (12碼)</span>
                  </div>
                  <div className="mt-2">
                    <button
                      id="btn-sector-tiers"
                      type="button"
                      disabled={disabled}
                      onClick={() => handleBetSector('輪盤下角', TIERS_CYLINDRE)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (disabled) return;
                        if (sectorTotalBets > 0) {
                          sound.playClick();
                          TIERS_CYLINDRE.forEach((n) => onRemoveBetSpot(`straight-${n}`));
                        }
                      }}
                      className="w-full py-1.5 px-1 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="左鍵點擊下注 • 右鍵點擊撤回此扇區注"
                    >
                      下注 ${sectorCost.toLocaleString()}
                    </button>
                  </div>
                  {sectorTotalBets > 0 && (
                    <div className="absolute -top-2 -right-1">
                      {renderChip(sectorTotalBets)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Orphelins */}
            {(() => {
              const sectorCost = ORPHELINS.length * selectedChip;
              const sectorTotalBets = ORPHELINS.reduce((acc, n) => acc + getBetAmount(`straight-${n}`), 0);
              return (
                <div className="flex flex-col justify-between p-2.5 rounded-xl bg-stone-900/95 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-amber-300">孤兒注</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">21.6% (8碼)</span>
                  </div>
                  <div className="mt-2">
                    <button
                      id="btn-sector-orphelins"
                      type="button"
                      disabled={disabled}
                      onClick={() => handleBetSector('孤兒注', ORPHELINS)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (disabled) return;
                        if (sectorTotalBets > 0) {
                          sound.playClick();
                          ORPHELINS.forEach((n) => onRemoveBetSpot(`straight-${n}`));
                        }
                      }}
                      className="w-full py-1.5 px-1 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="左鍵點擊下注 • 右鍵點擊撤回此扇區注"
                    >
                      下注 ${sectorCost.toLocaleString()}
                    </button>
                  </div>
                  {sectorTotalBets > 0 && (
                    <div className="absolute -top-2 -right-1">
                      {renderChip(sectorTotalBets)}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Jeu Zéro */}
            {(() => {
              const sectorCost = JEU_ZERO.length * selectedChip;
              const sectorTotalBets = JEU_ZERO.reduce((acc, n) => acc + getBetAmount(`straight-${n}`), 0);
              return (
                <div className="flex flex-col justify-between p-2.5 rounded-xl bg-stone-900/95 border border-amber-500/40 hover:border-amber-400 transition-all shadow-md relative">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-amber-300">零注核心</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">18.9% (7碼)</span>
                  </div>
                  <div className="mt-2">
                    <button
                      id="btn-sector-jeuzero"
                      type="button"
                      disabled={disabled}
                      onClick={() => handleBetSector('零注', JEU_ZERO)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (disabled) return;
                        if (sectorTotalBets > 0) {
                          sound.playClick();
                          JEU_ZERO.forEach((n) => onRemoveBetSpot(`straight-${n}`));
                        }
                      }}
                      className="w-full py-1.5 px-1 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="左鍵點擊下注 • 右鍵點擊撤回此扇區注"
                    >
                      下注 ${sectorCost.toLocaleString()}
                    </button>
                  </div>
                  {sectorTotalBets > 0 && (
                    <div className="absolute -top-2 -right-1">
                      {renderChip(sectorTotalBets)}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 2. Neighbor Bets Distance Selector */}
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-stone-800 text-xs">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-stone-200">輪盤鄰號注 (Neighbors) 範圍:</span>
            </div>

            <div className="flex items-center gap-1">
              {[
                { range: 1, label: '±1 (3碼)' },
                { range: 2, label: '±2 (5碼)' },
                { range: 3, label: '±3 (7碼)' },
                { range: 4, label: '±4 (9碼)' },
              ].map((item) => (
                <button
                  key={item.range}
                  id={`btn-neighbor-${item.range}`}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setNeighborRange(item.range);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    neighborRange === item.range
                      ? 'bg-amber-400 text-stone-950 shadow-[0_0_8px_rgba(251,191,36,0.7)] font-black'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Authentic Interactive 37-Number Racetrack Strip */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-stone-300 px-1 font-medium">
              <span>🎡 實體輪盤圓周順序跑道 (點擊任一號碼下注其鄰號)</span>
              {hoveredRacetrackNum !== null && (
                <span className="text-amber-300 font-bold font-mono">
                  {hoveredRacetrackNum} 號鄰號: [{getNeighbors(hoveredRacetrackNum, neighborRange).join(', ')}]
                </span>
              )}
            </div>

            {/* Continuous Racetrack Grid */}
            <div className="grid grid-cols-10 sm:grid-cols-13 md:grid-cols-19 gap-1.5 p-2 rounded-xl bg-stone-950 border border-stone-800">
              {WHEEL_NUMBERS.map((num) => {
                const id = `straight-${num}`;
                const amount = getBetAmount(id);
                const isRed = getNumberColor(num) === 'red';
                const isGreen = num === 0;

                const isHighlighted =
                  hoveredRacetrackNum !== null &&
                  getNeighbors(hoveredRacetrackNum, neighborRange).includes(num);
                const isCenterHovered = hoveredRacetrackNum === num;

                return (
                  <button
                    key={`racetrack-${num}`}
                    id={`racetrack-num-${num}`}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => setHoveredRacetrackNum(num)}
                    onMouseLeave={() => setHoveredRacetrackNum(null)}
                    onClick={() => handleBetNeighbors(num)}
                    onContextMenu={(e) => handleContextMenu(e, id)}
                    className={`bet-cell relative h-9 sm:h-10 rounded-lg border flex flex-col items-center justify-center font-mono transition-all cursor-pointer ${
                      isGreen
                        ? 'bg-gradient-to-b from-emerald-600 to-emerald-950 border-emerald-400 text-emerald-100'
                        : isRed
                        ? 'bg-gradient-to-b from-rose-600 to-rose-950 border-rose-400 text-white'
                        : 'bg-gradient-to-b from-zinc-800 to-zinc-950 border-zinc-600 text-zinc-100'
                    } ${
                      isCenterHovered
                        ? 'ring-2 ring-amber-300 scale-108 z-20 shadow-[0_0_12px_rgba(251,191,36,0.95)]'
                        : isHighlighted
                        ? 'ring-2 ring-yellow-400/90 scale-103 z-10 brightness-125'
                        : ''
                    } ${amount > 0 ? 'ring-2 ring-amber-400 font-black' : ''} ${
                      disabled ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
                    }`}
                    title={`號碼 ${num} - 點擊下注該號碼及 ±${neighborRange} 鄰號`}
                  >
                    <span className="text-xs sm:text-sm font-black leading-none">{num}</span>
                    <span className="text-[8px] opacity-75 font-sans leading-none mt-0.5">
                      {isGreen ? '0' : isRed ? '紅' : '黑'}
                    </span>
                    {renderChip(amount)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
