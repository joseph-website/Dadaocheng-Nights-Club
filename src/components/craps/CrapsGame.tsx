import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CrapsBetItem,
  CrapsBetType,
  CrapsPhase,
  CrapsRollResult,
  CrapsStats,
} from '../../types/craps';
import { rollCrapsDice, evaluateCrapsRoll } from '../../utils/craps';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { isTurboMode } from '../../utils/turbo';
import { CrapsFeltTable } from './CrapsFeltTable';
import { CrapsBettingPanel } from './CrapsBettingPanel';
import { WinToast, WinToastData } from '../common/WinToast';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import { CasinoChip } from '../common/CasinoChip';
import { ChipSelector } from '../ChipSelector';
import {
  Sparkles,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Dices,
  RotateCcw,
  Undo2,
  Copy,
  XCircle,
  CheckCircle2,
  Shield,
  BarChart3,
} from 'lucide-react';

interface CrapsGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  selectedChip: number;
  onSelectChip: (chip: number) => void;
  soundEnabled?: boolean;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEY_CRAPS_STATS = 'casino_craps_stats_v1';
const STORAGE_KEY_CRAPS_HISTORY = 'casino_craps_history_v1';

export const CrapsGame: React.FC<CrapsGameProps> = ({
  balance,
  onUpdateBalance,
  selectedChip,
  onSelectChip,
  onRoundBusyChange,
}) => {
  // Craps game phase: 'come_out' or 'point'
  const [phase, setPhase] = useState<CrapsPhase>('come_out');
  const [point, setPoint] = useState<number | null>(null);

  // Dice on table
  const [dice, setDice] = useState<[number, number]>([3, 4]);
  const [isRolling, setIsRolling] = useState<boolean>(false);

  // Bets
  const [currentBets, setCurrentBets] = useState<CrapsBetItem[]>([]);
  const [previousBets, setPreviousBets] = useState<CrapsBetItem[]>([]);
  const [betHistoryStack, setBetHistoryStack] = useState<{ type: CrapsBetType; amount: number }[]>([]);

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Win Toast
  const [winToast, setWinToast] = useState<WinToastData | null>(null);

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);

  // History & Stats
  const [history, setHistory] = useState<CrapsRollResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CRAPS_HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [stats, setStats] = useState<CrapsStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CRAPS_STATS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      rolls: 0,
      pointsHit: 0,
      sevenOuts: 0,
      naturals: 0,
      crapsCount: 0,
      totalBet: 0,
      totalWon: 0,
      highestWin: 0,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CRAPS_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CRAPS_HISTORY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const isBusy = isRolling || currentBets.length > 0;
    const totalCrapsBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
    onRoundBusyChange?.(isBusy, totalCrapsBet);
  }, [isRolling, currentBets, onRoundBusyChange]);

  // Listen to global casino reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({
        rolls: 0,
        pointsHit: 0,
        sevenOuts: 0,
        naturals: 0,
        crapsCount: 0,
        totalBet: 0,
        totalWon: 0,
        highestWin: 0,
      });
      setHistory([]);
      setCurrentBets([]);
      setPreviousBets([]);
      setPoint(null);
      setPhase('come_out');
      setDice([3, 4]);
      setWinToast(null);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, []);

  const totalBet = currentBets.reduce((acc, b) => acc + b.amount, 0);

  // Place bet on a specific felt zone
  const handlePlaceBet = (
    type: CrapsBetType,
    label: string,
    payoutRatioText: string,
    multiplier: number
  ) => {
    if (isRolling) return;

    if (balance < selectedChip) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足，請選擇較小面額或重置籌碼！');
      return;
    }

    const newTotal = totalBet + selectedChip;
    onRoundBusyChange?.(true, newTotal);
    sound.playChip();
    onUpdateBalance(balance - selectedChip);
    dispatchBetAction({ gameId: 'craps', betType: type, amount: selectedChip, label });

    const betId = `craps-bet-${type}`;
    setBetHistoryStack((prev) => [...prev, { type, amount: selectedChip }]);
    setCurrentBets((prev) => {
      const existingIndex = prev.findIndex((b) => b.id === betId);
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
            id: betId,
            type,
            amount: selectedChip,
            label,
            payoutRatioText,
            multiplier,
          },
        ];
      }
    });
  };

  // Remove/refund bet on a specific spot
  const handleRemoveBet = (type: CrapsBetType) => {
    if (isRolling) return;
    const betId = `craps-bet-${type}`;
    const existing = currentBets.find((b) => b.id === betId);
    if (!existing) return;

    sound.playClick();
    onUpdateBalance(balance + existing.amount);
    setCurrentBets((prev) => prev.filter((b) => b.id !== betId));
    setBetHistoryStack((prev) => prev.filter((b) => b.type !== type));
  };

  // Undo last bet action
  const handleUndoBet = () => {
    if (isRolling || betHistoryStack.length === 0) return;
    const lastAction = betHistoryStack[betHistoryStack.length - 1];
    setBetHistoryStack((prev) => prev.slice(0, -1));
    sound.playClick();
    onUpdateBalance(balance + lastAction.amount);

    const betId = `craps-bet-${lastAction.type}`;
    setCurrentBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === betId);
      if (existingIdx === -1) return prev;
      const currentItem = prev[existingIdx];
      const remainingAmt = currentItem.amount - lastAction.amount;
      if (remainingAmt <= 0) {
        return prev.filter((b) => b.id !== betId);
      } else {
        const updated = [...prev];
        updated[existingIdx] = { ...currentItem, amount: remainingAmt };
        return updated;
      }
    });
  };

  // Clear all current bets
  const handleClearBets = () => {
    if (isRolling || currentBets.length === 0) return;
    sound.playClick();
    onUpdateBalance(balance + totalBet);
    setCurrentBets([]);
    setBetHistoryStack([]);
  };

  // Double all bets
  const handleDoubleBets = () => {
    if (isRolling || currentBets.length === 0) return;
    if (balance < totalBet) {
      toastService.warn('籌碼餘額不足以加倍下注！');
      return;
    }

    const newDoubleTotal = totalBet * 2;
    onRoundBusyChange?.(true, newDoubleTotal);
    onUpdateBalance(balance - totalBet);
    dispatchBetAction({ gameId: 'craps', betType: 'double', amount: totalBet });
    setCurrentBets((prev) =>
      prev.map((b) => ({
        ...b,
        amount: b.amount * 2,
      }))
    );
  };

  // Rebet previous bets
  const handleRebet = () => {
    if (isRolling || previousBets.length === 0) return;
    const prevTotal = previousBets.reduce((acc, b) => acc + b.amount, 0);
    if (balance < prevTotal) {
      toastService.warn('籌碼餘額不足以同額續注！');
      return;
    }

    onRoundBusyChange?.(true, prevTotal);
    if (currentBets.length > 0) {
      onUpdateBalance(balance + totalBet - prevTotal);
    } else {
      onUpdateBalance(balance - prevTotal);
    }
    dispatchBetAction({ gameId: 'craps', betType: 'rebet', amount: prevTotal });
    setCurrentBets([...previousBets]);
  };

  const finalizeRoll = useCallback(() => {
    const finalDice = rollCrapsDice();
    setDice(finalDice);

    const result = evaluateCrapsRoll(finalDice, phase, point, currentBets);

    // Update Phase and Point
    setPhase(result.phaseAfter);
    setPoint(result.pointAfter);

    // Update Balance with total won (and check house bonus)
    let finalPayout = result.totalWon;
    let bonusWon = 0;
    if (result.totalWon > 0) {
      const bonus = checkHouseBonus(result.totalBet);
      if (bonus.triggered) {
        bonusWon = bonus.bonusAmount;
        finalPayout += bonusWon;
        notifyHouseBonus(bonus, '花旗骰');
      }
      onUpdateBalance(balance + finalPayout);
    }

    // Persist unresolved bets on table (e.g. Pass Line during point phase)
    setCurrentBets(result.persistingBets);
    setBetHistoryStack([]);

    // Update History & Stats
    setHistory((prev) => [result, ...prev.slice(0, 49)]);
    setStats((prev) => ({
      rolls: prev.rolls + 1,
      pointsHit: prev.pointsHit + (result.event === 'point_hit' ? 1 : 0),
      sevenOuts: prev.sevenOuts + (result.event === 'seven_out' ? 1 : 0),
      naturals: prev.naturals + (result.event === 'natural' ? 1 : 0),
      crapsCount: prev.crapsCount + (result.event === 'craps' ? 1 : 0),
      totalBet: prev.totalBet + result.totalBet,
      totalWon: prev.totalWon + result.totalWon,
      highestWin: Math.max(prev.highestWin, result.totalWon),
    }));

    // Check Hidden Collectibles Silently (Differentiated triggers & Chip thresholds)
    if (result.event === 'natural' && currentBets.some((b) => b.type === 'pass_line' && b.amount >= 500)) {
      unlockHiddenCollectible('col-craps-natural');
    }
    if (result.event === 'point_hit' && result.totalWon >= 1000) {
      unlockHiddenCollectible('col-craps-point-hit');
    }
    if ((result.sum === 2 || result.sum === 12) && result.winningBets.some((b) => b.type === 'field' && b.betAmount >= 500)) {
      unlockHiddenCollectible('col-craps-field-double');
    }
    if (stats.rolls >= 5 && result.event !== 'seven_out' && (stats.totalWon + result.totalWon) >= 3000) {
      unlockHiddenCollectible('col-craps-no-seven');
    }
    if (result.sum === 7 && result.winningBets.some((b) => b.type === 'any_seven' && b.betAmount >= 500)) {
      unlockHiddenCollectible('col-craps-any-seven');
    }
    if (
      finalDice[0] === finalDice[1] &&
      result.winningBets.some((b) => b.type.startsWith('hard_') && b.betAmount >= 500)
    ) {
      unlockHiddenCollectible('col-craps-hardway');
    }

    // Record Global Career Round
    recordCareerRound({
      gameId: 'craps',
      betAmount: result.totalBet,
      winAmount: result.totalWon,
    });

    setIsRolling(false);

    // Play Audio Cue & trigger WinToast
    if (result.totalWon > result.totalBet) {
      sound.playBigWin();
    } else if (result.totalWon > 0) {
      sound.playWin();
    } else if (result.event === 'seven_out' || result.event === 'craps') {
      sound.playLoss();
    } else {
      sound.playDiceReveal();
    }

    const isWin = result.totalWon > 0;
    const isJackpot = result.totalWon >= 50000 || result.netProfit >= 20000;

    setWinToast({
      id: result.id,
      title:
        result.event === 'point_hit'
          ? '🔥 命中目標點數！'
          : result.event === 'natural'
          ? '🎉 首擲 Natural 7/11 大勝！'
          : isWin
          ? '花旗骰中獎！'
          : result.event === 'point_established'
          ? `🎯 確立目標點數 ${result.pointAfter} 點！`
          : result.event === 'seven_out'
          ? '⚠️ 7點淘汰 (Seven-Out)！'
          : '本輪無中獎',
      amount: finalPayout,
      extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
      multiplier: result.winningBets.length > 0 ? result.winningBets[0].wonAmount / (result.winningBets[0].betAmount || 1) : 1,
      subtitle: `${result.eventDescription}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
      isJackpot,
    });
  }, [balance, currentBets, onUpdateBalance, phase, point, stats.rolls, stats.totalWon]);

  // Roll Dice Action
  const handleRoll = useCallback(() => {
    if (isRolling || currentBets.length === 0) return;

    setPreviousBets([...currentBets]);
    setIsRolling(true);

    // Audio cue for dice rattle
    sound.playDiceShake();

    const isTurbo = isTurboMode();
    const maxTicks = isTurbo ? 4 : 10;
    const tickInterval = isTurbo ? 60 : 90;

    // Random dice tumbling animation ticker
    let tickCount = 0;
    const interval = setInterval(() => {
      setDice(rollCrapsDice());
      tickCount++;
      if (tickCount >= maxTicks) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, tickInterval);
  }, [isRolling, currentBets, finalizeRoll]);

  // Keyboard shortcuts: Space (Roll), C (Clear), X (Double), R (Rebet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRolling && currentBets.length > 0) {
          handleRoll();
        }
      } else if (e.key.toUpperCase() === 'Z') {
        e.preventDefault();
        if (!isRolling && betHistoryStack.length > 0) {
          handleUndoBet();
        }
      } else if (e.key.toUpperCase() === 'C') {
        e.preventDefault();
        if (!isRolling && currentBets.length > 0) {
          handleClearBets();
        }
      } else if (e.key.toUpperCase() === 'X') {
        e.preventDefault();
        if (!isRolling && currentBets.length > 0) {
          handleDoubleBets();
        }
      } else if (e.key.toUpperCase() === 'R') {
        e.preventDefault();
        if (!isRolling && previousBets.length > 0) {
          handleRebet();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRolling, currentBets, previousBets, handleRoll, handleClearBets, handleDoubleBets, handleRebet]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-hidden animate-fade-in select-none">
      {/* LEFT COLUMN: Visual Craps Table (Full size on mobile/tablet, flex-1 on desktop) */}
      <div
        id="game-visual-area"
        className="w-full lg:flex-1 h-full min-h-0 rounded-2xl bg-[#0b0d14] border border-amber-500/20 shadow-2xl p-2 sm:p-2.5 flex flex-col justify-between items-center relative overflow-hidden transition-all duration-700"
      >
        {/* Floating Auto-Fading Win Toast */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* Active Bets Status Bar Badge */}
        {totalBet > 0 && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-in zoom-in-95">
            <CasinoChip amount={totalBet} size="xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-stone-400 font-bold uppercase">賭桌當前押注</span>
              <span className="font-mono font-black text-xs text-amber-300">
                ${totalBet.toLocaleString()} ({currentBets.length} 處)
              </span>
            </div>
          </div>
        )}

        {/* Craps Felt Interactive Table (Maximized game space) */}
        <div className="w-full flex-1 min-h-0 overflow-hidden">
          <CrapsFeltTable
            phase={phase}
            point={point}
            dice={dice}
            isRolling={isRolling}
            currentBets={currentBets}
            onPlaceBet={handlePlaceBet}
            onRemoveBet={handleRemoveBet}
            disabled={isRolling}
          />
        </div>



        {/* COMPACT MOBILE & TABLET BOTTOM QUICK ACTION DOCK (收納式下注欄 - 手機與平板專屬) */}
        <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2 py-1.5 mt-1 bg-stone-900/95 rounded-xl border border-stone-800/90 shadow-xl shrink-0 lg:hidden">
          {/* Current Bet / Chip Indicator */}
          <div className="flex items-center gap-1.5 bg-stone-950/90 px-2 sm:px-2.5 py-1.5 rounded-lg border border-stone-800 shrink-0">
            <CasinoChip amount={selectedChip} size="xs" />
            <div className="flex flex-col leading-none">
              <span className="text-[9px] text-stone-400">選擇</span>
              <span className="font-mono font-black text-xs text-amber-400">
                ${selectedChip >= 1000 ? `${selectedChip / 1000}k` : selectedChip}
              </span>
            </div>
            {totalBet > 0 && (
              <button
                disabled={isRolling}
                onClick={handleClearBets}
                className="ml-1 p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="清除下注"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Center: Main Roll Button */}
          <button
            id="btn-mobile-craps-roll"
            disabled={isRolling || (phase === 'come_out' && totalBet === 0)}
            onClick={handleRoll}
            className={`flex-1 min-h-[44px] px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-lg touch-manipulation active:scale-95 ${
              isRolling
                ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                : totalBet > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
            <span>
              {isRolling
                ? '骰子擲出中...'
                : totalBet > 0
                ? `擲骰 (${phase === 'come_out' ? '首擲' : `點數 ${point}`})`
                : '請先下注'}
            </span>
          </button>

          {/* Quick Double / Rebet if available */}
          {!isRolling && currentBets.length > 0 && balance >= totalBet && (
            <button
              onClick={handleDoubleBets}
              className="px-2 py-1.5 min-h-[44px] rounded-xl bg-purple-950/80 text-purple-300 border border-purple-500/50 text-[11px] font-bold touch-manipulation active:scale-95 shrink-0"
              title="加倍下注 (2X)"
            >
              2X
            </button>
          )}

          {/* Right: Drawer Menu Trigger Button */}
          <button
            id="btn-toggle-craps-drawer"
            onClick={() => {
              sound.playClick();
              setIsDrawerOpen((prev) => !prev);
            }}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 touch-manipulation active:scale-95 shrink-0 ${
              totalBet > 0
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/80 ring-1 ring-amber-400/50'
                : 'bg-stone-950 text-stone-200 border-stone-700 hover:border-amber-500/50'
            }`}
            title="開啟下注、籌碼與機率分析選單"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden min-[360px]:inline">下注選單</span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Desktop Side Controls (Can be collapsed for full-canvas view) */}
      <div
        className={`hidden lg:flex transition-all duration-300 ${
          isDesktopCollapsed ? 'w-11 h-full justify-center items-center' : 'w-[380px] xl:w-[410px] h-full'
        } shrink-0 relative`}
      >
        {isDesktopCollapsed ? (
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="w-10 h-36 rounded-xl bg-stone-900/90 border border-amber-500/40 text-amber-400 hover:text-white flex flex-col items-center justify-center gap-2 hover:bg-stone-800 shadow-xl transition-all cursor-pointer"
            title="展開下注與控制面板"
          >
            <PanelRightOpen className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold" style={{ writingMode: 'vertical-rl' }}>
              展開控制面板
            </span>
          </button>
        ) : (
          <div className="w-full h-full relative flex flex-col">
            <button
              onClick={() => setIsDesktopCollapsed(true)}
              className="absolute top-3.5 right-3.5 z-20 p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700/60 cursor-pointer shadow-md"
              title="收起控制面板以最大化花旗骰桌面"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
            <CrapsBettingPanel
              balance={balance}
              phase={phase}
              point={point}
              selectedChip={selectedChip}
              onSelectChip={onSelectChip}
              currentBets={currentBets}
              hasPreviousBets={previousBets.length > 0}
              isRolling={isRolling}
              canUndo={betHistoryStack.length > 0}
              onUndo={handleUndoBet}
              history={history}
              stats={stats}
              onRoll={handleRoll}
              onClearBets={handleClearBets}
              onDoubleBets={handleDoubleBets}
              onRebet={handleRebet}
              onResetStats={() =>
                setStats({
                  rolls: 0,
                  pointsHit: 0,
                  sevenOuts: 0,
                  naturals: 0,
                  crapsCount: 0,
                  totalBet: 0,
                  totalWon: 0,
                  highestWin: 0,
                })
              }
            />
          </div>
        )}
      </div>

      {/* MOBILE & TABLET SLIDE-UP COLLAPSIBLE DRAWER (收納式選單 - 手機與平板專屬) */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Click outside backdrop to close */}
          <div
            className="flex-1 w-full"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Sheet Container */}
          <div className="w-full max-h-[86vh] overflow-hidden flex flex-col bg-[#0b0e14] border-t-2 border-amber-500/60 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            {/* Drawer Drag Bar & Header */}
            <div className="p-3 bg-stone-950/95 border-b border-stone-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300 leading-tight">
                    花旗骰分析與籌碼選單
                  </h3>
                  <span className="text-[11px] text-stone-400 font-mono">
                    當前押注: ${totalBet.toLocaleString()} • 餘額: ${balance.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white text-xs font-bold border border-stone-700 flex items-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
              >
                <span>收起選單</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content - SAFE MODE ONLY: Switch chips, check statistics, confirm exit to bet */}
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
                  此選單僅供切換籌碼幣值與查看投骰機率統計。選定欲使用的籌碼面額後，請點擊下方「確定退出」按鈕，返回檯面即可進行押注與擲骰，避免在調整籌碼時誤觸下注。
                </p>

                {/* Chip Selector Tray */}
                <div className="w-full">
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelectChip={(amt) => {
                      onSelectChip(amt);
                      sound.playChip();
                    }}
                    disabled={isRolling}
                    balance={balance}
                  />
                </div>

                {/* Mandatory Confirm Exit Button */}
                <button
                  id="btn-craps-drawer-confirm"
                  onClick={() => {
                    sound.playChip();
                    setIsDrawerOpen(false);
                    toastService.info(`已設定花旗骰籌碼面額：$${selectedChip.toLocaleString()}`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-stone-950" />
                  <span>確定退出 (使用 ${selectedChip.toLocaleString()} 籌碼)</span>
                </button>
              </div>

              {/* Craps Lifetime Stats Card */}
              <div className="p-2.5 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-lg flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between text-xs font-bold text-stone-300 border-b border-stone-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>花旗骰局勢統計 (STATS)</span>
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    近局戰果
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-stone-400">總擲骰次數</div>
                    <div className="font-mono font-black text-xs text-stone-100">{stats.rolls}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-emerald-400">擊中定點數</div>
                    <div className="font-mono font-black text-xs text-emerald-300">{stats.pointsHit}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-rose-400">7-Out 出局</div>
                    <div className="font-mono font-black text-xs text-rose-300">{stats.sevenOuts}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-amber-300">首擲天牌(7/11)</div>
                    <div className="font-mono font-black text-xs text-amber-300">{stats.naturals}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-purple-300">Craps 點(2/3/12)</div>
                    <div className="font-mono font-black text-xs text-purple-300">{stats.crapsCount}</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-stone-900/80 border border-stone-800">
                    <div className="text-[9px] text-amber-400">單局最高彩金</div>
                    <div className="font-mono font-black text-xs text-amber-300">${stats.highestWin.toLocaleString()}</div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
