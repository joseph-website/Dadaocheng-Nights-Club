import React from 'react';
import { SlotWinPatternId } from '../../types/slot';
import { Award } from 'lucide-react';

interface SlotPaytableProps {
  winPatternId?: SlotWinPatternId;
}

export const SlotPaytable: React.FC<SlotPaytableProps> = ({
  winPatternId,
}) => {
  const payRows: {
    symbols: string;
    name: string;
    mult: string;
    color: string;
    bg: string;
    id: SlotWinPatternId;
  }[] = [
    {
      symbols: '7️⃣ 7️⃣ 7️⃣',
      name: '777 幸運大獎',
      mult: '200X',
      color: 'text-amber-400 font-black',
      bg: 'border-amber-400/50 bg-amber-500/10',
      id: 'seven',
    },
    {
      symbols: '🪙 🪙 🪙',
      name: 'BAR 金條',
      mult: '40X',
      color: 'text-amber-300 font-bold',
      bg: 'border-amber-500/30 bg-amber-500/5',
      id: 'bar',
    },
    {
      symbols: '🔔 🔔 🔔',
      name: '金鐘 (BELL)',
      mult: '20X',
      color: 'text-yellow-300 font-bold',
      bg: 'border-yellow-500/30 bg-yellow-500/5',
      id: 'bell',
    },
    {
      symbols: '🍉 🍉 🍉',
      name: '西瓜 (MELON)',
      mult: '10X',
      color: 'text-emerald-300 font-semibold',
      bg: 'border-emerald-500/30 bg-emerald-500/5',
      id: 'watermelon',
    },
    {
      symbols: '🍇 🍇 🍇',
      name: '葡萄 (GRAPE)',
      mult: '6X',
      color: 'text-purple-300 font-semibold',
      bg: 'border-purple-500/30 bg-purple-500/5',
      id: 'grape',
    },
    {
      symbols: '🍋 🍋 🍋',
      name: '檸檬 (LEMON)',
      mult: '4X',
      color: 'text-lime-300 font-semibold',
      bg: 'border-lime-500/30 bg-lime-500/5',
      id: 'lemon',
    },
    {
      symbols: '🍒 🍒 🍒',
      name: '櫻桃 (3張全中)',
      mult: '4X',
      color: 'text-rose-300 font-semibold',
      bg: 'border-rose-500/30 bg-rose-500/5',
      id: 'cherry3',
    },
    {
      symbols: '🍉 🍇 🍋',
      name: '水果拼盤(3色)',
      mult: '1.5X',
      color: 'text-amber-200 font-bold',
      bg: 'border-stone-800 bg-stone-900/40',
      id: 'mixed',
    },
    {
      symbols: '🍒 🍒 ❓',
      name: '櫻桃 (任意2張)',
      mult: '1.5X',
      color: 'text-rose-300',
      bg: 'border-stone-800 bg-stone-900/40',
      id: 'cherry2',
    },
    {
      symbols: '🍒 ❓ ❓',
      name: '櫻桃 (任意1張)',
      mult: '0.5X',
      color: 'text-rose-200',
      bg: 'border-stone-800 bg-stone-900/40',
      id: 'cherry1',
    },
  ];

  return (
    <div className="w-full p-2 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1.5 shrink-0">
      <div className="flex items-center justify-between border-b border-stone-800 pb-1">
        <div className="flex items-center gap-1.5 text-stone-200 font-bold text-xs sm:text-sm">
          <Award className="w-4 h-4 text-amber-400" />
          <span>老虎機賠率表 (PAYTABLE)</span>
        </div>
        <span className="text-xs text-amber-400 font-mono font-bold">固定倍率彩金</span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs sm:text-sm">
        {payRows.map((row) => {
          const isHighlighted = winPatternId === row.id;

          return (
            <div
              key={row.id}
              className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-xs transition-all duration-300 ${
                isHighlighted
                  ? 'border-amber-400 bg-amber-500/25 ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-pulse font-bold'
                  : row.bg
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-sm">{row.symbols}</span>
                <span className="text-stone-200 text-xs font-bold truncate">{row.name}</span>
              </div>
              <span className={`font-mono text-xs sm:text-sm ${row.color} shrink-0 ml-1`}>
                {row.mult}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
