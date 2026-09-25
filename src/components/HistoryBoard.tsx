import React from 'react';
import { SpinResult } from '../types/roulette';
import { getNumberColor } from '../utils/constants';
import { Flame, Snowflake, History, MousePointerClick } from 'lucide-react';
import { sound } from '../utils/audio';

interface HistoryBoardProps {
  history: SpinResult[];
  onQuickBetNumber?: (num: number) => void;
  disabled?: boolean;
}

export const HistoryBoard: React.FC<HistoryBoardProps> = ({
  history,
  onQuickBetNumber,
  disabled = false,
}) => {
  if (history.length === 0) {
    return (
      <div className="w-full p-2.5 rounded-xl bg-[#0e1017] border border-stone-800 text-center text-xs text-stone-500">
        尚無開獎紀錄，請開始下注並旋轉輪盤！
      </div>
    );
  }

  // Calculate stats
  const recentSpins = history.slice(0, 50);
  let redCount = 0;
  let blackCount = 0;
  let zeroCount = 0;
  let evenCount = 0;
  let oddCount = 0;

  const frequencyMap: { [num: number]: number } = {};

  recentSpins.forEach((spin) => {
    frequencyMap[spin.number] = (frequencyMap[spin.number] || 0) + 1;
    if (spin.number === 0) zeroCount++;
    else if (spin.color === 'red') redCount++;
    else blackCount++;

    if (spin.isEven === true) evenCount++;
    else if (spin.isEven === false) oddCount++;
  });

  const total = recentSpins.length || 1;
  const redPct = Math.round((redCount / total) * 100);
  const blackPct = Math.round((blackCount / total) * 100);
  const evenPct = Math.round((evenCount / total) * 100);
  const oddPct = Math.round((oddCount / total) * 100);

  // Hot (most frequent) and Cold (least frequent)
  const sortedByFreq = Object.entries(frequencyMap)
    .map(([num, count]) => ({ num: parseInt(num, 10), count }))
    .sort((a, b) => b.count - a.count);

  const hotNumbers = sortedByFreq.slice(0, 4);

  // Cold numbers (numbers from 0-36 that appeared 0 or 1 times)
  const all37 = Array.from({ length: 37 }, (_, i) => i);
  const coldCandidates = all37
    .map((num) => ({ num, count: frequencyMap[num] || 0 }))
    .sort((a, b) => a.count - b.count);
  const coldNumbers = coldCandidates.slice(0, 4);

  const handleNumberClick = (num: number) => {
    if (disabled || !onQuickBetNumber) return;
    sound.playChip();
    onQuickBetNumber(num);
  };

  return (
    <div className="w-full flex flex-col gap-2 p-2.5 rounded-xl bg-[#0e1017] border border-amber-500/20 shadow-xl backdrop-blur select-none shrink-0">
      {/* Top Header & Recent Numbers Ribbon */}
      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-stone-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-300">
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] sm:text-xs">開獎路單</span>
        </div>

        {/* Horizontal ribbon of recent 12 winning numbers */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[280px] sm:max-w-[340px] pb-0.5">
          {history.slice(0, 10).map((spin, idx) => {
            const color = spin.color;
            const isLatest = idx === 0;

            return (
              <button
                key={`hist-${spin.timestamp}-${idx}`}
                type="button"
                disabled={disabled}
                onClick={() => handleNumberClick(spin.number)}
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold font-mono transition-transform cursor-pointer ${
                  color === 'green'
                    ? 'bg-emerald-700 text-white border border-emerald-400'
                    : color === 'red'
                    ? 'bg-rose-700 text-white border border-rose-400'
                    : 'bg-zinc-900 text-white border border-zinc-600'
                } ${isLatest ? 'ring-2 ring-amber-400 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'opacity-85 hover:scale-110'}`}
                title={`第 ${history.length - idx} 局: ${spin.number} (${color}) - 點擊快速下注直注`}
              >
                {spin.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Breakdown Bar */}
      <div className="grid grid-cols-4 gap-1.5 text-xs">
        {/* Red vs Black ratio */}
        <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800 flex flex-col gap-0.5">
          <div className="text-[10px] text-stone-400">紅 / 黑</div>
          <div className="flex items-center gap-0.5 font-mono text-[11px] font-bold">
            <span className="text-rose-400">{redPct}%</span>
            <span className="text-stone-600">/</span>
            <span className="text-zinc-300">{blackPct}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden flex">
            <div style={{ width: `${redPct}%` }} className="bg-rose-600 h-full"></div>
            <div style={{ width: `${blackPct}%` }} className="bg-zinc-400 h-full"></div>
          </div>
        </div>

        {/* Even vs Odd ratio */}
        <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800 flex flex-col gap-0.5">
          <div className="text-[10px] text-stone-400">單 / 雙</div>
          <div className="flex items-center gap-0.5 font-mono text-[11px] font-bold">
            <span className="text-amber-400">{oddPct}%</span>
            <span className="text-stone-600">/</span>
            <span className="text-blue-400">{evenPct}%</span>
          </div>
          <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden flex">
            <div style={{ width: `${oddPct}%` }} className="bg-amber-500 h-full"></div>
            <div style={{ width: `${evenPct}%` }} className="bg-blue-500 h-full"></div>
          </div>
        </div>

        {/* Hot Numbers */}
        <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800 flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[10px] text-amber-400">
            <div className="flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-amber-400" />
              <span>熱門 (HOT)</span>
            </div>
            <MousePointerClick className="w-2.5 h-2.5 text-amber-400/70" />
          </div>
          <div className="flex items-center gap-1">
            {hotNumbers.slice(0, 3).map((item) => (
              <button
                key={`hot-${item.num}`}
                type="button"
                disabled={disabled}
                onClick={() => handleNumberClick(item.num)}
                className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  getNumberColor(item.num) === 'green'
                    ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-800'
                    : getNumberColor(item.num) === 'red'
                    ? 'bg-rose-900/90 text-rose-300 border border-rose-500/50 hover:bg-rose-800'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700'
                }`}
                title={`熱門號碼 ${item.num} (出現 ${item.count} 次) - 點擊快速下注`}
              >
                {item.num}
              </button>
            ))}
          </div>
        </div>

        {/* Cold Numbers */}
        <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800 flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-[10px] text-cyan-400">
            <div className="flex items-center gap-1">
              <Snowflake className="w-2.5 h-2.5 text-cyan-400" />
              <span>冷門 (COLD)</span>
            </div>
            <MousePointerClick className="w-2.5 h-2.5 text-cyan-400/70" />
          </div>
          <div className="flex items-center gap-1">
            {coldNumbers.slice(0, 3).map((item) => (
              <button
                key={`cold-${item.num}`}
                type="button"
                disabled={disabled}
                onClick={() => handleNumberClick(item.num)}
                className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  getNumberColor(item.num) === 'green'
                    ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-800'
                    : getNumberColor(item.num) === 'red'
                    ? 'bg-rose-900/90 text-rose-300 border border-rose-500/50 hover:bg-rose-800'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-zinc-700'
                }`}
                title={`冷門號碼 ${item.num} (出現 ${item.count} 次) - 點擊快速下注`}
              >
                {item.num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
