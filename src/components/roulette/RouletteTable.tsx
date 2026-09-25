import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  SlidersHorizontal,
  Info,
  ChevronDown,
  ChevronUp,
  Undo2,
  XCircle,
  PanelRightOpen,
  PanelRightClose,
  Shield,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { BetItem, BetType, SpinResult } from '../../types/roulette';
import { calculateSpinResult } from '../../utils/payout';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { checkHouseBonus, notifyHouseBonus } from '../../utils/aura';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { isTurboMode } from '../../utils/turbo';

import { RouletteWheel } from '../RouletteWheel';
import { BettingTable } from '../BettingTable';
import { ChipSelector } from '../ChipSelector';
import { ControlPanel } from '../ControlPanel';
import { HistoryBoard } from '../HistoryBoard';
import { WinToast, WinToastData } from '../common/WinToast';
import { CasinoChip } from '../common/CasinoChip';

export interface RouletteTableProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  selectedChip?: number;
  onSelectChip?: (chip: number) => void;
  soundEnabled?: boolean;
  onRoundBusyChange?: (isBusy: boolean, currentBetAtStake?: number) => void;
  onResetBalance?: () => void;
}

const STORAGE_KEYS = {
  HISTORY: 'european_roulette_history_v1',
  PREV_BETS: 'european_roulette_prev_bets_v1',
};

export const RouletteTable: React.FC<RouletteTableProps> = ({
  balance,
  onUpdateBalance,
  selectedChip: propSelectedChip,
  onSelectChip: propOnSelectChip,
  soundEnabled = true,
  onRoundBusyChange,
  onResetBalance,
}) => {
  // Local chip selection fallback
  const [internalSelectedChip, setInternalSelectedChip] = useState<number>(100);
  const selectedChip = propSelectedChip ?? internalSelectedChip;
  const setSelectedChip = useCallback(
    (chip: number) => {
      if (propOnSelectChip) {
        propOnSelectChip(chip);
      } else {
        setInternalSelectedChip(chip);
      }
    },
    [propOnSelectChip]
  );

  // ==================== ROULETTE CORE STATE ====================
  const [bets, setBets] = useState<BetItem[]>([]);
  const [previousBets, setPreviousBets] = useState<BetItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PREV_BETS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });
  const [betHistoryStack, setBetHistoryStack] = useState<{ id: string; amount: number }[]>([]);

  const [isSpinning, setIsSpinning] = useState(false);
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [winToast, setWinToast] = useState<WinToastData | null>(null);

  // Mobile/Tablet Drawer & Desktop Collapse states
  const [isRouletteDrawerOpen, setIsRouletteDrawerOpen] = useState(false);
  const [isRouletteDesktopCollapsed, setIsRouletteDesktopCollapsed] = useState(false);
  const [rouletteMobileTab, setRouletteMobileTab] = useState<'wheel' | 'table'>('wheel');

  // Spin History
  const [history, setHistory] = useState<SpinResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Calculate total bet placed on table
  const totalBet = useMemo(
    () => bets.reduce((acc, curr) => acc + curr.amount, 0),
    [bets]
  );

  // Synchronize busy state to parent container (App.tsx)
  useEffect(() => {
    const isBusy = isSpinning || bets.length > 0 || totalBet > 0;
    onRoundBusyChange?.(isBusy, totalBet);
  }, [isSpinning, bets.length, totalBet, onRoundBusyChange]);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  // Sync previousBets to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PREV_BETS, JSON.stringify(previousBets));
  }, [previousBets]);

  // Listen to global reset & forfeit
  useEffect(() => {
    const handleFullReset = () => {
      setBets([]);
      setPreviousBets([]);
      setBetHistoryStack([]);
      setHistory([]);
      setIsSpinning(false);
      setTargetNumber(null);
      setCurrentResult(null);
      setWinToast(null);
      onRoundBusyChange?.(false, 0);
    };
    const handleForfeit = () => {
      setBets([]);
      setIsSpinning(false);
      setTargetNumber(null);
      setCurrentResult(null);
      onRoundBusyChange?.(false, 0);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    window.addEventListener('casino_forfeit_round', handleForfeit);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
      window.removeEventListener('casino_forfeit_round', handleForfeit);
    };
  }, [onRoundBusyChange]);

  // ==================== BETTING OPERATIONS ====================

  // Place a bet in Roulette
  const handlePlaceBet = useCallback(
    (type: BetType, value?: number, label?: string) => {
      if (isSpinning) return;

      if (balance < selectedChip) {
        sound.playLoss();
        toastService.warn('籌碼餘額不足，請選擇較小面額籌碼或重置籌碼！');
        return;
      }

      const id = type === 'straight' ? `straight-${value}` : type;
      const defaultLabel = label || id;

      onUpdateBalance(balance - selectedChip);

      setBets((prev) => {
        const existingIndex = prev.findIndex((b) => b.id === id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            amount: updated[existingIndex].amount + selectedChip,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id,
              type,
              value,
              amount: selectedChip,
              label: defaultLabel,
            },
          ];
        }
      });

      setBetHistoryStack((prev) => [...prev, { id, amount: selectedChip }]);
      dispatchBetAction({ gameId: 'roulette', betType: type, amount: selectedChip, label: defaultLabel });
    },
    [isSpinning, balance, selectedChip, onUpdateBalance]
  );

  // Place batch bets for French Racetrack sectors or Neighbors
  const handlePlaceBatchBets = useCallback(
    (items: { type: BetType; value?: number; label?: string }[]) => {
      if (isSpinning || items.length === 0) return;
      const totalNeeded = items.length * selectedChip;
      if (balance < totalNeeded) {
        sound.playLoss();
        toastService.warn(`籌碼餘額不足！下注該區域需要 $${totalNeeded.toLocaleString()}`);
        return;
      }

      sound.playChip();
      onUpdateBalance(balance - totalNeeded);
      dispatchBetAction({ gameId: 'roulette', betType: 'batch', amount: totalNeeded });

      setBets((prev) => {
        let updated = [...prev];
        items.forEach((it) => {
          const id = it.type === 'straight' ? `straight-${it.value}` : it.type;
          const defaultLabel = it.label || id;
          const existingIndex = updated.findIndex((b) => b.id === id);
          if (existingIndex >= 0) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              amount: updated[existingIndex].amount + selectedChip,
            };
          } else {
            updated.push({
              id,
              type: it.type,
              value: it.value,
              amount: selectedChip,
              label: defaultLabel,
            });
          }
        });
        return updated;
      });

      setBetHistoryStack((prev) => [
        ...prev,
        ...items.map((it) => ({
          id: it.type === 'straight' ? `straight-${it.value}` : it.type,
          amount: selectedChip,
        })),
      ]);
    },
    [isSpinning, selectedChip, balance, onUpdateBalance]
  );

  // Undo the last bet action
  const handleUndoBet = useCallback(() => {
    if (isSpinning || betHistoryStack.length === 0) return;
    const lastAction = betHistoryStack[betHistoryStack.length - 1];
    setBetHistoryStack((prev) => prev.slice(0, -1));

    onUpdateBalance(balance + lastAction.amount);
    setBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === lastAction.id);
      if (existingIdx === -1) return prev;
      const currentItem = prev[existingIdx];
      const remainingAmt = currentItem.amount - lastAction.amount;
      if (remainingAmt <= 0) {
        return prev.filter((b) => b.id !== lastAction.id);
      } else {
        const updated = [...prev];
        updated[existingIdx] = { ...currentItem, amount: remainingAmt };
        return updated;
      }
    });
  }, [isSpinning, betHistoryStack, balance, onUpdateBalance]);

  // Remove specific bet spot
  const handleRemoveBetSpot = useCallback(
    (id: string) => {
      if (isSpinning) return;
      const existing = bets.find((b) => b.id === id);
      if (!existing) return;

      onUpdateBalance(balance + existing.amount);
      setBets((prev) => prev.filter((b) => b.id !== id));
      setBetHistoryStack((prev) => prev.filter((b) => b.id !== id));
    },
    [isSpinning, bets, balance, onUpdateBalance]
  );

  // Clear all bets
  const handleClearBets = useCallback(() => {
    if (isSpinning || bets.length === 0) return;
    onUpdateBalance(balance + totalBet);
    setBets([]);
    setBetHistoryStack([]);
  }, [isSpinning, bets.length, balance, totalBet, onUpdateBalance]);

  // Double all bets (2X)
  const handleDoubleBets = useCallback(() => {
    if (isSpinning || bets.length === 0) return;
    if (balance < totalBet) {
      toastService.warn('籌碼不足以加倍下注！');
      return;
    }

    onUpdateBalance(balance - totalBet);
    const added: { id: string; amount: number }[] = [];
    setBets((prev) =>
      prev.map((b) => {
        added.push({ id: b.id, amount: b.amount });
        return {
          ...b,
          amount: b.amount * 2,
        };
      })
    );
    setBetHistoryStack((prev) => [...prev, ...added]);
    dispatchBetAction({ gameId: 'roulette', betType: 'double', amount: totalBet });
  }, [isSpinning, bets.length, balance, totalBet, onUpdateBalance]);

  // Repeat previous round bets (Rebet)
  const handleRebet = useCallback(() => {
    if (isSpinning || previousBets.length === 0) return;
    const prevTotal = previousBets.reduce((acc, curr) => acc + curr.amount, 0);

    if (balance < prevTotal) {
      toastService.warn('籌碼不足以重複上一輪下注！');
      return;
    }

    const netChange = bets.length > 0 ? totalBet - prevTotal : -prevTotal;
    onUpdateBalance(balance + netChange);

    setBets([...previousBets]);
    setBetHistoryStack(
      previousBets.map((b) => ({ id: b.id, amount: b.amount }))
    );
    dispatchBetAction({ gameId: 'roulette', betType: 'rebet', amount: prevTotal });
  }, [isSpinning, previousBets, balance, bets.length, totalBet, onUpdateBalance]);

  // Spin Roulette Wheel
  const handleSpin = useCallback(() => {
    if (isSpinning || bets.length === 0) return;

    setPreviousBets([...bets]);
    const winningNum = Math.floor(Math.random() * 37);
    setTargetNumber(winningNum);
    setIsSpinning(true);
  }, [isSpinning, bets]);

  // Spin completed handler
  const handleSpinComplete = useCallback(() => {
    if (targetNumber === null) return;

    const result = calculateSpinResult(targetNumber, bets);
    setCurrentResult(result);
    setHistory((prev) => [result, ...prev]);

    let finalPayout = result.totalWon;
    let bonusWon = 0;
    if (result.totalWon > 0) {
      const bonus = checkHouseBonus(result.totalBet);
      if (bonus.triggered) {
        bonusWon = bonus.bonusAmount;
        finalPayout += bonusWon;
        notifyHouseBonus(bonus, '輪盤');
      }
    }
    onUpdateBalance(balance + finalPayout);

    // Check Roulette Hidden Collectibles Silently (Differentiated triggers & Chip thresholds)
    if (targetNumber === 0 && bets.some((b) => b.type === 'straight' && b.value === 0 && b.amount >= 300)) {
      unlockHiddenCollectible('col-roulette-zero');
    }
    if (result.winningBets.some((b) => b.multiplier === '1:35' && b.amount >= 500)) {
      unlockHiddenCollectible('col-roulette-36x');
    }
    if (result.totalWon >= 20000 && result.totalBet >= 5000) {
      unlockHiddenCollectible('col-roulette-big-win');
    }
    if (
      result.winningBets.some((b) => b.multiplier === '1:2') &&
      bets.filter((b) => b.multiplier === '1:2').reduce((acc, b) => acc + b.amount, 0) >= 1000
    ) {
      unlockHiddenCollectible('col-roulette-dozens');
    }
    if (
      result.color === 'red' &&
      bets.some((b) => b.type === 'red' && b.amount >= 500) &&
      history.slice(0, 2).length === 2 &&
      history.slice(0, 2).every((h) => h.color === 'red')
    ) {
      unlockHiddenCollectible('col-roulette-red-streak');
    }
    if (
      result.color === 'black' &&
      bets.some((b) => b.type === 'black' && b.amount >= 500) &&
      history.slice(0, 2).length === 2 &&
      history.slice(0, 2).every((h) => h.color === 'black')
    ) {
      unlockHiddenCollectible('col-roulette-black-streak');
    }

    setIsSpinning(false);

    // Record Career Round for Global Stats & Favorite Game tracking
    recordCareerRound({
      gameId: 'roulette',
      betAmount: result.totalBet,
      winAmount: result.totalWon,
      multiplier: result.winningBets.some((b) => b.multiplier === '1:35')
        ? 36
        : result.winningBets.some((b) => b.multiplier === '1:2')
        ? 3
        : 2,
    });

    // Audio cue
    if (result.totalWon > 0) {
      sound.playWin();
    } else {
      sound.playLoss();
    }

    // Trigger auto-fading Toast notification inside #game-visual-area
    const isWin = result.totalWon > 0;
    const winningHits = result.winningBets.map((b) => b.label).join('、');

    setWinToast({
      title: isWin ? '輪盤大贏！' : '本輪未中獎',
      amount: finalPayout,
      extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
      description: isWin
        ? `開出 ${targetNumber} 號！命中了 ${winningHits}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`
        : `開出 ${targetNumber} 號，再接再厲！`,
      isWin,
    });

    setBets([]);
  }, [targetNumber, bets, balance, onUpdateBalance, history]);

  // Roulette specific keyboard shortcuts: C (clear), 2x (X), R (rebet), Space (spin)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toUpperCase();

      if (key === 'C') {
        e.preventDefault();
        handleClearBets();
        return;
      }
      if (key === 'X') {
        e.preventDefault();
        handleDoubleBets();
        return;
      }
      if (key === 'R') {
        e.preventDefault();
        handleRebet();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isSpinning && bets.length > 0) {
          handleSpin();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSpinning, bets.length, handleClearBets, handleDoubleBets, handleRebet, handleSpin]);

  // Toggle audio
  const handleToggleSound = useCallback(() => {
    sound.enabled = !sound.enabled;
  }, []);

  // Hot and Cold numbers computation
  const { hotNumbers, coldNumbers } = useMemo(() => {
    const recentSpins = history.slice(0, 100);
    const frequencyMap: { [num: number]: number } = {};
    recentSpins.forEach((item) => {
      frequencyMap[item.number] = (frequencyMap[item.number] || 0) + 1;
    });
    const sortedByFreq = Object.entries(frequencyMap)
      .map(([num, count]) => ({ num: parseInt(num, 10), count }))
      .sort((a, b) => b.count - a.count);
    const hot = sortedByFreq.slice(0, 4);

    const all37 = Array.from({ length: 37 }, (_, i) => i);
    const coldCandidates = all37
      .map((num) => ({ num, count: frequencyMap[num] || 0 }))
      .sort((a, b) => a.count - b.count);
    const cold = coldCandidates.slice(0, 4);

    return { hotNumbers: hot, coldNumbers: cold };
  }, [history]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-1.5 sm:gap-3 overflow-hidden animate-fade-in select-none">
      {/* Mobile View Mode Switcher (輪盤動畫視角 vs 完整下注檯面 - 手機專屬) */}
      <div className="lg:hidden w-full flex items-center p-1 rounded-xl bg-stone-950/90 border border-amber-500/30 shrink-0">
        <button
          id="btn-roulette-tab-wheel"
          onClick={() => setRouletteMobileTab('wheel')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            rouletteMobileTab === 'wheel'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>輪盤動畫視角</span>
        </button>
        <button
          id="btn-roulette-tab-table"
          onClick={() => setRouletteMobileTab('table')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            rouletteMobileTab === 'table'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>完整下注檯面 {bets.length > 0 && `(${bets.length}注)`}</span>
        </button>
      </div>

      {/* Left Column: Roulette Wheel, Live Bets, Roadmap History & Odds */}
      <div
        id="game-visual-area"
        className={`${
          rouletteMobileTab === 'wheel' ? 'flex flex-col w-full' : 'hidden lg:flex'
        } ${
          isRouletteDesktopCollapsed ? 'lg:flex-1' : 'lg:w-[33%] xl:w-[30%]'
        } h-full min-h-0 rounded-2xl bg-[#0b0d14] border border-amber-500/20 shadow-2xl p-2 sm:p-3 justify-between items-center relative overflow-hidden shrink-0 transition-all duration-700`}
      >
        {/* Floating 2-Second Auto-Fading Win Toast located internally inside #game-visual-area */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* Active Bets Status Bar Badge */}
        {totalBet > 0 && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-in zoom-in-95">
            <CasinoChip amount={totalBet} size="xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-stone-400 font-bold uppercase">賭桌當前押注</span>
              <span className="font-mono font-black text-xs text-amber-300">
                {totalBet.toLocaleString()} 點 ({bets.length} 處)
              </span>
            </div>
          </div>
        )}

        {/* Wheel Viewport (Maximized game space) */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-[160px] sm:min-h-[180px]">
          <RouletteWheel
            isSpinning={isSpinning}
            targetNumber={targetNumber}
            onSpinComplete={handleSpinComplete}
          />
        </div>

        {/* History & Statistics Roadmap */}
        <div className="w-full shrink-0 my-0.5 sm:my-1">
          <HistoryBoard
            history={history}
            onQuickBetNumber={(num) => handlePlaceBet('straight', num, `單號 ${num}`)}
            disabled={isSpinning}
          />
        </div>

        {/* Mobile Quick Bets Bar: Visible on Wheel view for instant on-screen betting */}
        <div className="w-full flex flex-col gap-1 my-1 lg:hidden shrink-0">
          <div className="flex items-center justify-between text-[11px] px-1 text-stone-300 font-bold">
            <span className="flex items-center gap-1 text-amber-300">
              <Info className="w-3 h-3 text-amber-400" />
              <span>快速下注 (點擊即押注 ${selectedChip})</span>
            </span>
            <button
              onClick={() => setRouletteMobileTab('table')}
              className="text-[10px] text-amber-400 underline underline-offset-2 flex items-center gap-0.5"
            >
              <span>全桌面</span>
              <ChevronDown className="w-2.5 h-2.5 rotate-270" />
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1 w-full text-[10px] font-bold">
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('red', undefined, '紅 (Red)')}
              className="py-1.5 px-0.5 rounded-lg bg-rose-950/80 border border-rose-500/70 text-rose-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">🔴 紅</span>
              <span className="font-mono text-[9px] text-rose-300">1:1</span>
            </button>
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('black', undefined, '黑 (Black)')}
              className="py-1.5 px-0.5 rounded-lg bg-stone-900/90 border border-stone-600 text-stone-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">⚫ 黑</span>
              <span className="font-mono text-[9px] text-stone-300">1:1</span>
            </button>
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('odd', undefined, '單 (Odd)')}
              className="py-1.5 px-0.5 rounded-lg bg-purple-950/80 border border-purple-500/60 text-purple-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">單數</span>
              <span className="font-mono text-[9px] text-purple-300">1:1</span>
            </button>
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('even', undefined, '雙 (Even)')}
              className="py-1.5 px-0.5 rounded-lg bg-blue-950/80 border border-blue-500/60 text-blue-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">雙數</span>
              <span className="font-mono text-[9px] text-blue-300">1:1</span>
            </button>
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('low', undefined, '小 (1-18)')}
              className="py-1.5 px-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">1-18</span>
              <span className="font-mono text-[9px] text-emerald-300">1:1</span>
            </button>
            <button
              disabled={isSpinning}
              onClick={() => handlePlaceBet('high', undefined, '大 (19-36)')}
              className="py-1.5 px-0.5 rounded-lg bg-amber-950/80 border border-amber-500/60 text-amber-200 active:scale-95 flex flex-col items-center justify-center cursor-pointer"
            >
              <span className="text-[11px]">19-36</span>
              <span className="font-mono text-[9px] text-amber-300">1:1</span>
            </button>
          </div>
        </div>

        {/* Bottom Quick Odds Bar - Always visible */}
        <div className="flex w-full px-2.5 py-1 rounded-xl bg-[#07090e]/90 border border-stone-800/80 text-[10px] text-stone-400 items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 text-amber-300 font-bold shrink-0">
            <Info className="w-3 h-3 text-amber-400" />
            <span>歐式輪盤賠率:</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 font-mono text-stone-300 text-[10px] shrink-0">
            <span>直注 <b className="text-amber-400">1:35</b></span>
            <span>紅/黑/單雙/大小 <b className="text-amber-400">1:1</b></span>
            <span>打/列 <b className="text-amber-400">1:2</b></span>
          </div>
        </div>

        {/* COMPACT MOBILE & TABLET BOTTOM QUICK ACTION DOCK (收納式輪盤下注欄) */}
        <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2 py-1.5 mt-1 bg-stone-900/95 rounded-xl border border-stone-800/90 shadow-xl shrink-0 lg:hidden">
          {/* Chip Denomination Quick Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 shrink-0 max-w-[120px] sm:max-w-none">
            {[10, 50, 100, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  sound.playChip();
                  setSelectedChip(amt);
                }}
                className={`px-1.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                  selectedChip === amt
                    ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                    : 'bg-stone-950 text-stone-300 border border-stone-700'
                }`}
              >
                ${amt >= 1000 ? `${amt / 1000}k` : amt}
              </button>
            ))}
          </div>

          {/* Center: Main Spin Button */}
          <button
            id="btn-mobile-roulette-spin"
            disabled={isSpinning || bets.length === 0}
            onClick={handleSpin}
            className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 shadow-lg touch-manipulation active:scale-95 ${
              isSpinning
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : bets.length > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? '旋轉中...' : bets.length > 0 ? `旋轉 (${bets.length}注)` : '請先下注'}</span>
          </button>

          {/* Quick Undo / Clear if bets present */}
          {!isSpinning && bets.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {betHistoryStack.length > 0 && (
                <button
                  onClick={handleUndoBet}
                  className="p-2 min-h-[44px] min-w-[36px] rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-bold border border-stone-700 flex items-center justify-center active:scale-95 cursor-pointer"
                  title="撤銷上一筆下注"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleClearBets}
                className="p-2 min-h-[44px] min-w-[36px] rounded-xl bg-stone-800 text-rose-400 hover:text-rose-300 text-xs font-bold border border-stone-700 flex items-center justify-center active:scale-95 cursor-pointer"
                title="清除全部下注"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
              {balance >= totalBet && (
                <button
                  onClick={handleDoubleBets}
                  className="px-2 py-1.5 min-h-[44px] rounded-xl bg-purple-950/80 text-purple-300 border border-purple-500/50 text-[11px] font-bold touch-manipulation active:scale-95 cursor-pointer"
                  title="注碼加倍 (2X)"
                >
                  2X
                </button>
              )}
            </div>
          )}

          {/* Right: Open Betting Drawer Button */}
          <button
            id="btn-toggle-roulette-drawer"
            onClick={() => {
              setIsRouletteDrawerOpen((prev) => !prev);
            }}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 touch-manipulation active:scale-95 shrink-0 cursor-pointer ${
              bets.length > 0
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/80 ring-1 ring-amber-400/50'
                : 'bg-stone-950 text-stone-200 border-stone-700 hover:border-amber-500/50'
            }`}
            title="展開歐式輪盤桌面下注選單"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden min-[360px]:inline">選單</span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Right Column: Full Casino Felt Betting Table, Chip Selector & Action Controls */}
      <div
        className={`${
          rouletteMobileTab === 'table' ? 'flex flex-col w-full h-full' : 'hidden lg:flex'
        } transition-all duration-300 ${
          isRouletteDesktopCollapsed
            ? 'lg:w-11 lg:h-full lg:justify-center lg:items-center'
            : 'lg:w-[67%] xl:w-[70%] h-full flex flex-col justify-between gap-2 min-w-0'
        } overflow-hidden shrink-0 relative`}
      >
        {isRouletteDesktopCollapsed ? (
          <button
            onClick={() => setIsRouletteDesktopCollapsed(false)}
            className="w-10 h-36 rounded-xl bg-stone-900/90 border border-amber-500/40 text-amber-400 hover:text-white flex flex-col items-center justify-center gap-2 hover:bg-stone-800 shadow-xl transition-all cursor-pointer"
            title="展開輪盤下注桌面"
          >
            <PanelRightOpen className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold" style={{ writingMode: 'vertical-rl' }}>
              展開下注桌面
            </span>
          </button>
        ) : (
          <>
            {/* Desktop Collapse Button */}
            <div className="absolute top-2 right-2 z-20">
              <button
                onClick={() => setIsRouletteDesktopCollapsed(true)}
                className="p-1.5 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700/80 cursor-pointer shadow-md"
                title="收起下注桌面以最大化輪盤視野"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Main Betting Felt Table (Flexible height with smooth scrollbar) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <BettingTable
                balance={balance}
                currentBets={bets}
                selectedChip={selectedChip}
                onPlaceBet={handlePlaceBet}
                onPlaceBatchBets={handlePlaceBatchBets}
                onRemoveBetSpot={handleRemoveBetSpot}
                disabled={isSpinning}
                hotNumbers={hotNumbers.map((h) => h.num)}
                coldNumbers={coldNumbers.map((c) => c.num)}
              />
            </div>

            {/* 2. Chip Selector (Fixed at bottom) */}
            <div className="rounded-xl bg-[#0c0e14] border border-amber-500/20 p-1.5 sm:p-2 shadow-lg shrink-0">
              <ChipSelector
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                disabled={isSpinning}
                balance={balance}
              />
            </div>

            {/* 3. Action Control Panel (SPIN, 2X, Clear, Rebet, Undo) */}
            <ControlPanel
              balance={balance}
              totalBet={totalBet}
              isSpinning={isSpinning}
              hasBets={bets.length > 0}
              hasPreviousBets={previousBets.length > 0}
              canUndo={betHistoryStack.length > 0}
              onSpin={handleSpin}
              onClearBets={handleClearBets}
              onDoubleBets={handleDoubleBets}
              onRebet={handleRebet}
              onUndo={handleUndoBet}
              onResetBalance={onResetBalance || (() => {})}
              soundEnabled={soundEnabled}
              onToggleSound={handleToggleSound}
            />
          </>
        )}
      </div>

      {/* MOBILE & TABLET SLIDE-UP COLLAPSIBLE DRAWER (收納式下注選單 - 手機與平板專屬) */}
      {isRouletteDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="flex-1 w-full"
            onClick={() => setIsRouletteDrawerOpen(false)}
          />

          <div className="w-full max-h-[88vh] overflow-hidden flex flex-col bg-[#0b0e14] border-t-2 border-amber-500/60 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="p-3 bg-stone-950/95 border-b border-stone-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300 leading-tight">
                    歐式輪盤分析與籌碼選單
                  </h3>
                  <span className="text-[11px] text-stone-400 font-mono">
                    當前押注: ${totalBet.toLocaleString()} • 餘額: ${balance.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsRouletteDrawerOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-bold border border-stone-700 flex items-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
              >
                <span>收起選單</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content - SAFE MODE ONLY: Switch chips, check roadmap, confirm exit to bet */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-2.5">
              {/* Safe Mode Notice & Chip Selector Panel */}
              <div className="rounded-xl bg-[#0c0e14] border border-amber-500/30 p-3 shadow-xl flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-stone-300 pb-2 border-b border-stone-800">
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>安全防誤觸模式已啟用</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    目前籌碼: ${selectedChip.toLocaleString()}
                  </span>
                </div>

                <p className="text-[11px] text-stone-400 leading-relaxed">
                  此選單僅供切換籌碼幣值與查看開號路單。選定欲使用的籌碼面額後，請點擊下方「確定退出」按鈕，返回檯面後即可進行押注與旋轉開獎，避免在調整籌碼時誤觸下注。
                </p>

                {/* Chip Selector Tray */}
                <div className="w-full">
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelectChip={(amt) => {
                      setSelectedChip(amt);
                      sound.playChip();
                    }}
                    disabled={isSpinning}
                    balance={balance}
                  />
                </div>

                {/* Mandatory Confirm Exit Button */}
                <button
                  id="btn-roulette-drawer-confirm"
                  onClick={() => {
                    sound.playChip();
                    setIsRouletteDrawerOpen(false);
                    toastService.info(`已設定輪盤籌碼面額：$${selectedChip.toLocaleString()}`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-stone-950" />
                  <span>確定退出 (使用 ${selectedChip.toLocaleString()} 籌碼)</span>
                </button>
              </div>

              {/* Recent Spins History & Frequency Heatmap */}
              <div className="p-2.5 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-lg flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-stone-300 border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>輪盤冷熱號與路單 (近 {history.length} 局)</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    單一號碼 35:1
                  </span>
                </div>

                {/* Hot & Cold Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30">
                    <div className="text-[10px] text-rose-300 font-bold mb-1">🔥 熱門號碼</div>
                    <div className="flex items-center gap-1">
                      {hotNumbers.length > 0 ? (
                        hotNumbers.map((h) => (
                          <span
                            key={h.num}
                            className="px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-100 font-mono font-bold text-[11px]"
                          >
                            {h.num}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-stone-500">暫無</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-500/30">
                    <div className="text-[10px] text-blue-300 font-bold mb-1">❄️ 冷門號碼</div>
                    <div className="flex items-center gap-1">
                      {coldNumbers.length > 0 ? (
                        coldNumbers.map((c) => (
                          <span
                            key={c.num}
                            className="px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-100 font-mono font-bold text-[11px]"
                          >
                            {c.num}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-stone-500">暫無</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* History Bead Row */}
                <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                  {history.length === 0 ? (
                    <span className="text-[10px] text-stone-500 italic py-1">尚無開獎記錄</span>
                  ) : (
                    history.slice(0, 16).map((h, idx) => (
                      <div
                        key={`drawer-roul-hist-${idx}-${h.timestamp}`}
                        className={`shrink-0 w-6 h-6 rounded-full text-[10px] font-mono font-black border flex items-center justify-center shadow-xs ${
                          h.color === 'red'
                            ? 'bg-rose-900/90 text-rose-100 border-rose-500/80'
                            : h.color === 'black'
                            ? 'bg-stone-900 text-stone-100 border-stone-600'
                            : 'bg-emerald-900 text-emerald-100 border-emerald-500'
                        }`}
                      >
                        {h.number}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
