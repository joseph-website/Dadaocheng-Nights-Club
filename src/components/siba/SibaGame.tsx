import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SibaBetItem,
  SibaBetType,
  SibaRollResult,
  SibaStats,
  SibaEvaluation,
} from '../../types/siba';
import {
  evaluateSiba,
  calculateSibaResult,
  rollUntilValidSiba,
} from '../../utils/siba';
import { sound } from '../../utils/audio';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { CeramicBowl, CupPhase } from './CeramicBowl';
import { SibaBettingTable } from './SibaBettingTable';
import { ChipSelector } from '../ChipSelector';
import { WinToast, WinToastData } from '../common/WinToast';
import { CasinoChip } from '../common/CasinoChip';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import { isTurboMode } from '../../utils/turbo';
import {
  Sparkles,
  Trophy,
  History,
  RotateCcw,
  Flame,
  Zap,
  Copy,
  XCircle,
  TrendingUp,
  Info,
  Undo2,
  HelpCircle,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  CheckCircle2,
} from 'lucide-react';

interface SibaGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number | ((prev: number) => number)) => void;
  selectedChip?: number;
  onSelectChip?: (chip: number) => void;
  soundEnabled: boolean;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEY_SIBA_STATS = 'casino_siba_stats_v1';
const STORAGE_KEY_SIBA_HISTORY = 'casino_siba_history_v1';

export const SibaGame: React.FC<SibaGameProps> = ({
  balance,
  onUpdateBalance,
  selectedChip: propSelectedChip,
  onSelectChip: propOnSelectChip,
  soundEnabled,
  onRoundBusyChange,
}) => {
  // Current 4 dice on table
  const [dice, setDice] = useState<[number, number, number, number]>([3, 3, 5, 4]);

  // Rolling state
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [cupPhase, setCupPhase] = useState<CupPhase>('idle');
  const [rerollCount, setRerollCount] = useState<number>(0);

  // Active bets
  const [currentBets, setCurrentBets] = useState<SibaBetItem[]>([]);
  const [lastBets, setLastBets] = useState<SibaBetItem[]>([]);
  // Bet history stack for step-by-step undo
  const [betHistoryStack, setBetHistoryStack] = useState<{ id: string; amount: number }[]>([]);

  // Selected chip (supports global control from App.tsx or local fallback)
  const [internalSelectedChip, setInternalSelectedChip] = useState<number>(100);
  const selectedChip = propSelectedChip ?? internalSelectedChip;
  const setSelectedChip = propOnSelectChip ?? setInternalSelectedChip;

  // Evaluation & Results
  const [currentEval, setCurrentEval] = useState<SibaEvaluation>(() =>
    evaluateSiba([3, 3, 5, 4])
  );
  const [lastResult, setLastResult] = useState<SibaRollResult | null>(null);

  // Auto-fading Win Toast
  const [winToast, setWinToast] = useState<WinToastData | null>(null);

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  // Mobile View Tab state (bowl vs table)
  const [sibaMobileTab, setSibaMobileTab] = useState<'bowl' | 'table'>('bowl');

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);

  // History
  const [history, setHistory] = useState<SibaRollResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIBA_HISTORY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Stats
  const [stats, setStats] = useState<SibaStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SIBA_STATS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      rolls: 0,
      wins: 0,
      totalBet: 0,
      totalWon: 0,
      bgCount: 0,
      eighteenCount: 0,
      fourKindCount: 0,
      highestWin: 0,
    };
  });

  const timeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIBA_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SIBA_HISTORY, JSON.stringify(history));
  }, [history]);

  // Sync busy rolling / cup shaking / active bets state to parent
  useEffect(() => {
    const isBusy = isRolling || cupPhase !== 'idle' || currentBets.length > 0;
    const totalSibaBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
    onRoundBusyChange?.(isBusy, totalSibaBet);
  }, [isRolling, cupPhase, currentBets, onRoundBusyChange]);

  // Listen to global casino reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({
        rolls: 0,
        wins: 0,
        totalBet: 0,
        totalWon: 0,
        bgCount: 0,
        eighteenCount: 0,
        fourKindCount: 0,
        highestWin: 0,
      });
      setHistory([]);
      setCurrentBets([]);
      setLastBets([]);
      setCupPhase('idle');
      setLastResult(null);
      setDice([3, 3, 5, 4]);
      setCurrentEval(evaluateSiba([3, 3, 5, 4]));
      setWinToast(null);
      setIsRolling(false);
      setRerollCount(0);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, []);

  const totalBetAmount = currentBets.reduce((acc, b) => acc + b.amount, 0);

  // Add or increment bet on a specific betting spot
  const handlePlaceBet = (
    type: SibaBetType,
    label: string,
    payoutRatioText: string,
    multiplier: number
  ) => {
    if (isRolling) return;

    if (balance < selectedChip) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足，請選擇較低面額或重置籌碼！');
      return;
    }

    // Deduct chip from balance immediately
    const newTotal = totalBetAmount + selectedChip;
    onRoundBusyChange?.(true, newTotal);
    onUpdateBalance((prev: number) => Math.max(0, prev - selectedChip));
    dispatchBetAction({ gameId: 'siba', betType: type, amount: selectedChip, label });

    const betId = `bet-${type}`;
    setBetHistoryStack((prev) => [...prev, { id: betId, amount: selectedChip }]);

    setCurrentBets((prev) => {
      const existing = prev.find((b) => b.id === betId);
      if (existing) {
        return prev.map((b) =>
          b.id === betId ? { ...b, amount: b.amount + selectedChip } : b
        );
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

  // Remove bet on single spot (refund to user balance)
  const handleRemoveBetSpot = (id: string) => {
    if (isRolling) return;
    const normId = id.replace(/[-_]/g, '');
    const betToRemove = currentBets.find((b) => {
      const bNorm = b.id.replace(/[-_]/g, '');
      return b.id === id || bNorm === normId || (id.includes('eighteen') && b.type === 'eighteen_special');
    });

    if (betToRemove) {
      sound.playClick();
      onUpdateBalance((prev: number) => prev + betToRemove.amount);
      const targetId = betToRemove.id;
      const nextBets = currentBets.filter((b) => b.id !== targetId);
      setCurrentBets(nextBets);
      const nextTotal = nextBets.reduce((acc, b) => acc + b.amount, 0);
      onRoundBusyChange?.(nextTotal > 0, nextTotal);
      setBetHistoryStack((prev) => prev.filter((b) => b.id !== targetId));
    }
  };

  // Step-by-step undo of last placed bet
  const handleUndoBet = () => {
    if (isRolling || betHistoryStack.length === 0) return;
    const lastAction = betHistoryStack[betHistoryStack.length - 1];
    setBetHistoryStack((prev) => prev.slice(0, -1));
    sound.playClick();
    onUpdateBalance((prev: number) => prev + lastAction.amount);

    setCurrentBets((prev) => {
      const existingIdx = prev.findIndex((b) => b.id === lastAction.id);
      if (existingIdx === -1) return prev;
      const currentItem = prev[existingIdx];
      const remainingAmt = currentItem.amount - lastAction.amount;
      if (remainingAmt <= 0) {
        const nextList = prev.filter((b) => b.id !== lastAction.id);
        const nextTotal = nextList.reduce((acc, b) => acc + b.amount, 0);
        onRoundBusyChange?.(nextTotal > 0, nextTotal);
        return nextList;
      } else {
        const updated = [...prev];
        updated[existingIdx] = { ...currentItem, amount: remainingAmt };
        const nextTotal = updated.reduce((acc, b) => acc + b.amount, 0);
        onRoundBusyChange?.(nextTotal > 0, nextTotal);
        return updated;
      }
    });
  };

  // Clear all bets
  const handleClearBets = () => {
    if (isRolling || currentBets.length === 0) return;
    sound.playClick();
    onUpdateBalance((prev: number) => prev + totalBetAmount);
    setCurrentBets([]);
    setBetHistoryStack([]);
    onRoundBusyChange?.(false, 0);
  };

  // Double all bets
  const handleDoubleBets = () => {
    if (isRolling || currentBets.length === 0) return;
    if (balance < totalBetAmount) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足以進行雙倍加注！');
      return;
    }
    sound.playChip();
    const newDoubleTotal = totalBetAmount * 2;
    onRoundBusyChange?.(true, newDoubleTotal);
    onUpdateBalance((prev: number) => Math.max(0, prev - totalBetAmount));
    dispatchBetAction({ gameId: 'siba', betType: 'double', amount: totalBetAmount });
    setCurrentBets((prev) =>
      prev.map((b) => ({ ...b, amount: b.amount * 2 }))
    );
  };

  // Rebet previous round bets
  const handleRebet = () => {
    if (isRolling || lastBets.length === 0) return;
    const lastTotal = lastBets.reduce((acc, b) => acc + b.amount, 0);
    if (balance < lastTotal) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足以重複上一輪下注！');
      return;
    }
    // Refund current bets first if any
    if (currentBets.length > 0) {
      onUpdateBalance((prev: number) => prev + totalBetAmount);
    }
    sound.playChip();
    onRoundBusyChange?.(true, lastTotal);
    onUpdateBalance((prev: number) => Math.max(0, prev - lastTotal));
    dispatchBetAction({ gameId: 'siba', betType: 'rebet', amount: lastTotal });
    setCurrentBets([...lastBets]);
  };

  // Roll 4 dice with 3-stage Dice Cup (0.4s 蓋盅 -> 1.2s 搖盅 -> 0.8s 掀盅揭曉, 2.4s total)
  const handleRoll = useCallback(() => {
    if (isRolling || currentBets.length === 0) return;

    sound.playClick();
    setIsRolling(true);
    setCupPhase('covering');
    setLastBets([...currentBets]);
    setRerollCount(0);

    // Play solid wooden cup cover contact sound
    sound.playCupCover();

    // Clear previous timeouts & intervals
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    // Pre-calculate target valid outcome using traditional Siba engine
    const { finalResult, rerollHistory } = rollUntilValidSiba();
    const actualRerolls = Math.max(0, rerollHistory.length - 1);
    setRerollCount(actualRerolls);

    const turbo = isTurboMode();
    const shakeDelay = turbo ? 150 : 400;
    const revealDelay = turbo ? 550 : 1600;
    const completeDelay = turbo ? 900 : 2400;

    // ===== STAGE 2: 搖盅 =====
    const shakeTimer = window.setTimeout(() => {
      setCupPhase('shaking');
      sound.playDiceShake();
    }, shakeDelay);
    timeoutsRef.current.push(shakeTimer);

    // ===== STAGE 3: 揭盅 =====
    const revealTimer = window.setTimeout(() => {
      setCupPhase('revealing');
      sound.playDiceReveal();

      // Directly set the final calculated dice values under the rising cup
      setDice(finalResult.dice);
    }, revealDelay);
    timeoutsRef.current.push(revealTimer);

    // ===== CONCLUSION: Settle outcomes =====
    const completeTimer = window.setTimeout(() => {
      setCupPhase('idle');
      setIsRolling(false);
      setCurrentEval(finalResult);

      // Settle payouts
      const result = calculateSibaResult(
        finalResult,
        currentBets,
        rerollHistory
      );
      setLastResult(result);

      // Update user balance with winnings & check house bonus
      let finalPayout = result.totalWon;
      let bonusWon = 0;
      if (result.totalWon > 0) {
        const bonus = checkHouseBonus(result.totalBet);
        if (bonus.triggered) {
          bonusWon = bonus.bonusAmount;
          finalPayout += bonusWon;
          notifyHouseBonus(bonus, '十八仔');
        }
      }

      onUpdateBalance((prev: number) => prev + finalPayout);

      // Check Hidden Collectibles Silently (Differentiated triggers & Chip thresholds)
      const totalSibaBet = currentBets.reduce((s, b) => s + b.amount, 0);
      if (finalResult.isEighteen && totalSibaBet >= 500) {
        unlockHiddenCollectible('col-siba-eighteen');
      }
      if (finalResult.isBG && totalSibaBet >= 300) {
        unlockHiddenCollectible('col-siba-bg');
      }
      if (finalResult.isFourKind) {
        unlockHiddenCollectible('col-siba-four-same');
      }
      if (actualRerolls >= 2 && result.totalWon > 0 && totalSibaBet >= 300) {
        unlockHiddenCollectible('col-siba-reroll');
      }
      if (result.totalWon >= 5000 && totalSibaBet >= 1000) {
        unlockHiddenCollectible('col-siba-big-win');
      }
      if (finalResult.points === 12 && result.totalWon > 0 && totalSibaBet >= 300) {
        unlockHiddenCollectible('col-siba-two-pairs');
      }

      // Update stats
      setStats((prev) => {
        const rolls = prev.rolls + 1;
        const wins = result.totalWon > 0 ? prev.wins + 1 : prev.wins;
        const totalBet = prev.totalBet + result.totalBet;
        const totalWon = prev.totalWon + result.totalWon;
        const bgCount = finalResult.isBG ? prev.bgCount + 1 : prev.bgCount;
        const eighteenCount = finalResult.isEighteen ? prev.eighteenCount + 1 : prev.eighteenCount;
        const fourKindCount = finalResult.isFourKind ? prev.fourKindCount + 1 : prev.fourKindCount;
        const highestWin = Math.max(prev.highestWin, result.totalWon);
        return {
          rolls,
          wins,
          totalBet,
          totalWon,
          bgCount,
          eighteenCount,
          fourKindCount,
          highestWin,
        };
      });

      // Add to history road
      setHistory((prev) => [result, ...prev.slice(0, 49)]);

      // Record Global Career Round
      recordCareerRound({
        gameId: 'siba',
        betAmount: result.totalBet,
        winAmount: result.totalWon,
        multiplier: finalResult.isFourKind ? 10 : finalResult.isEighteen ? 3 : 2,
      });

      // Audio & Toast notification
      const isWin = result.totalWon > 0;
      if (isWin) {
        sound.playWin();
      } else {
        sound.playLoss();
      }

      const winningHits = result.winningBets.map((b) => b.label).join('、');
      const toastTitle = isWin
        ? finalResult.isEighteen
          ? '🎉 狂開十八仔 (12點)！'
          : finalResult.isFourKind
          ? '🔥 命中四一色特別獎！'
          : finalResult.isBG
          ? '⚡ 命中 BG 逼機 (3點)！'
          : '十八仔大贏！'
        : '本輪未中獎';

      const toastDesc = isWin
        ? `開出 ${finalResult.categoryLabel}！命中了 ${winningHits}`
        : `開出 ${finalResult.categoryLabel} (${finalResult.dice.join('-')})，再接再厲！`;

      setWinToast({
        title: toastTitle,
        amount: finalPayout,
        extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
        description: isWin
          ? `${toastDesc}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`
          : toastDesc,
        isWin,
      });

      // Clear active bets
      setCurrentBets([]);
      setBetHistoryStack([]);
    }, completeDelay);
    timeoutsRef.current.push(completeTimer);
  }, [balance, currentBets, isRolling, onUpdateBalance]);

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
        if (!isRolling && lastBets.length > 0) {
          handleRebet();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRolling, currentBets, lastBets, handleRoll, handleClearBets, handleDoubleBets, handleRebet]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-1.5 sm:gap-2.5 overflow-hidden select-none relative">
      {/* Mobile View Mode Switcher (骰碗動畫視角 vs 完整下注盤面 - 手機專屬) */}
      <div className="lg:hidden w-full flex items-center p-1 rounded-xl bg-stone-950/90 border border-amber-500/30 shrink-0">
        <button
          id="btn-siba-tab-bowl"
          onClick={() => setSibaMobileTab('bowl')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            sibaMobileTab === 'bowl'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>骰碗動畫視角</span>
        </button>
        <button
          id="btn-siba-tab-table"
          onClick={() => setSibaMobileTab('table')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
            sibaMobileTab === 'table'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-black shadow-md'
              : 'text-stone-300 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>完整下注盤面 {currentBets.length > 0 && `(${currentBets.length}注)`}</span>
        </button>
      </div>

      {/* ==================== LEFT COLUMN: VISUAL AREA (Maximized on Mobile/Tablet) ==================== */}
      <div
        id="game-visual-area"
        className={`${
          sibaMobileTab === 'bowl' ? 'flex flex-col w-full' : 'hidden lg:flex'
        } ${
          isDesktopCollapsed ? 'lg:flex-1' : 'lg:w-[62%] xl:w-[65%]'
        } h-full min-h-0 rounded-2xl bg-[#0b0d14] border border-amber-500/20 shadow-2xl p-2 sm:p-3 justify-between items-center relative overflow-hidden transition-all duration-700`}
      >
        {/* Floating 2-Second Auto-Fading Win Toast inside #game-visual-area */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* Top Active Bets Status Bar Badge */}
        {totalBetAmount > 0 && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-950/90 border border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-in zoom-in-95">
            <CasinoChip amount={totalBetAmount} size="xs" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] text-stone-400 font-bold uppercase">
                賭桌當前押注
              </span>
              <span className="font-mono font-black text-xs text-amber-300">
                ${totalBetAmount.toLocaleString()} ({currentBets.length} 處)
              </span>
            </div>
          </div>
        )}



        {/* Center: Authentic Black-Glazed Ceramic Bowl (黑釉瓷碗) Stage */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden min-h-[160px] sm:min-h-[200px]">
          <CeramicBowl
            dice={dice}
            isRolling={isRolling}
            cupPhase={cupPhase}
            evaluation={currentEval}
            rerollCount={rerollCount}
          />
        </div>

        {/* Mobile Quick Bets Bar: Direct on-screen betting for bowl view */}
        <div className="w-full flex flex-col gap-1 my-1 lg:hidden shrink-0">
          <div className="flex items-center justify-between text-[11px] px-1 text-stone-300 font-bold">
            <span className="flex items-center gap-1 text-amber-300">
              <Info className="w-3 h-3 text-amber-400" />
              <span>快速下注 (點擊即押注 ${selectedChip})</span>
            </span>
            <button
              onClick={() => setSibaMobileTab('table')}
              className="text-[10px] text-amber-400 underline underline-offset-2 flex items-center gap-0.5"
            >
              <span>完整盤面</span>
              <ChevronDown className="w-2.5 h-2.5 rotate-270" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 w-full text-[10px] font-bold">
            {/* Big */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('big', '大 (9-12)', '1:1', 1)}
              className="py-1.5 px-1 rounded-lg bg-amber-950/80 border border-amber-500/70 text-amber-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">大 (9-12)</span>
              <span className="font-mono text-[9px] text-amber-300">1:1</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'big');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-amber-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* Small */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('small', '小 (4-8)', '1:1', 1)}
              className="py-1.5 px-1 rounded-lg bg-blue-950/80 border border-blue-500/70 text-blue-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">小 (4-8)</span>
              <span className="font-mono text-[9px] text-blue-300">1:1</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'small');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-blue-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* 6 點 */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('point_6', '6 點', '1:5', 5)}
              className="py-1.5 px-1 rounded-lg bg-purple-950/80 border border-purple-500/70 text-purple-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">6 點</span>
              <span className="font-mono text-[9px] text-purple-300">1:5</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'point_6');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-purple-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* 7 點 */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('point_7', '7 點', '1:4', 4)}
              className="py-1.5 px-1 rounded-lg bg-indigo-950/80 border border-indigo-500/70 text-indigo-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">7 點</span>
              <span className="font-mono text-[9px] text-indigo-300">1:4</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'point_7');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-indigo-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* 8 點 */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('point_8', '8 點', '1:4', 4)}
              className="py-1.5 px-1 rounded-lg bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">8 點</span>
              <span className="font-mono text-[9px] text-emerald-300">1:4</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'point_8');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-emerald-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* 9 點 */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('point_9', '9 點', '1:4', 4)}
              className="py-1.5 px-1 rounded-lg bg-teal-950/80 border border-teal-500/70 text-teal-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">9 點</span>
              <span className="font-mono text-[9px] text-teal-300">1:4</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'point_9');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-teal-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* BG */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('bg', '逼機 (BG)', '1:8', 8)}
              className="py-1.5 px-1 rounded-lg bg-rose-950/80 border border-rose-500/70 text-rose-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">逼機 (BG)</span>
              <span className="font-mono text-[9px] text-rose-300">1:8</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'bg');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-rose-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
            {/* 18 */}
            <button
              disabled={isRolling}
              onClick={() => handlePlaceBet('eighteen_special', '十八 (18)', '1:15', 15)}
              className="py-1.5 px-1 rounded-lg bg-amber-950/90 border border-yellow-400/80 text-yellow-200 active:scale-95 flex flex-col items-center justify-center relative cursor-pointer"
            >
              <span className="text-[11px]">十八仔 (18)</span>
              <span className="font-mono text-[9px] text-yellow-300">1:15</span>
              {(() => {
                const b = currentBets.find((x) => x.type === 'eighteen_special');
                return b ? (
                  <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-yellow-400 text-stone-950 text-[9px] font-black font-mono">
                    ${b.amount >= 1000 ? `${b.amount / 1000}k` : b.amount}
                  </span>
                ) : null;
              })()}
            </button>
          </div>
        </div>

        {/* Bottom Quick Odds Bar */}
        <div className="w-full mt-1 px-2.5 py-1 rounded-xl bg-[#07090e]/90 border border-stone-800/80 text-[10px] text-stone-400 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1 text-amber-300 font-bold shrink-0">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>十八仔賠率標準:</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-stone-300 text-[10px] shrink-0">
            <span>
              大點 (9-12) <b className="text-amber-400">1:1</b>
            </span>
            <span>
              小點 (4-8) <b className="text-blue-400">1:1</b>
            </span>
            <span>
              BG 逼機 (3) <b className="text-rose-400">1:8</b>
            </span>
            <span>
              十八/四一色 <b className="text-amber-300">1:15</b>
            </span>
            <span>
              指定點數 <b className="text-emerald-400">1:4~1:6</b>
            </span>
          </div>
        </div>

        {/* COMPACT MOBILE & TABLET ACTION DOCK (手機與平板專屬快捷操作列) */}
        <div className="w-full flex items-center justify-between gap-1 sm:gap-2 px-2 py-1.5 mt-1 bg-stone-900/95 rounded-xl border border-stone-800/90 shadow-xl shrink-0 lg:hidden">
          {/* Quick Chip Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 shrink-0 max-w-[110px] sm:max-w-none">
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

          <button
            id="btn-mobile-siba-roll"
            disabled={isRolling || currentBets.length === 0}
            onClick={handleRoll}
            className={`flex-1 min-h-[44px] py-1.5 px-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-manipulation ${
              isRolling
                ? 'bg-stone-800 text-amber-300 border border-amber-500/40 cursor-wait animate-pulse'
                : currentBets.length > 0
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
            }`}
          >
            <RotateCcw className={`w-4 h-4 ${isRolling ? 'animate-spin text-amber-300' : 'text-stone-950'}`} />
            <span>
              {isRolling
                ? '擲骰中...'
                : currentBets.length > 0
                ? `擲骰 ($${totalBetAmount.toLocaleString()})`
                : '請先下注'}
            </span>
          </button>

          {/* Quick Clear / Undo / 2X if bets present */}
          {!isRolling && currentBets.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {betHistoryStack.length > 0 && (
                <button
                  onClick={handleUndoBet}
                  className="p-2 min-h-[44px] min-w-[34px] rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-bold border border-stone-700 flex items-center justify-center active:scale-95"
                  title="撤銷上一筆押注"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleClearBets}
                className="p-2 min-h-[44px] min-w-[34px] rounded-xl bg-stone-800 text-rose-400 hover:text-rose-300 text-xs font-bold border border-stone-700 flex items-center justify-center active:scale-95"
                title="清除全部押注"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
              {balance >= totalBetAmount && (
                <button
                  onClick={handleDoubleBets}
                  className="px-2 py-1.5 min-h-[44px] rounded-xl bg-purple-950/80 text-purple-300 border border-purple-500/50 text-[11px] font-bold touch-manipulation active:scale-95"
                  title="注碼加倍 (2X)"
                >
                  2X
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl bg-stone-950 text-stone-200 hover:text-amber-400 border border-stone-700 flex items-center gap-1.5 text-xs font-bold shrink-0 active:scale-95 touch-manipulation"
            title="開啟十八仔下注選單與盤路"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span className="hidden min-[360px]:inline">盤面</span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* ==================== RIGHT COLUMN: BETTING TABLE & SIDEBAR ==================== */}
      <div
        className={`${
          sibaMobileTab === 'table' ? 'flex flex-col w-full h-full' : 'hidden lg:flex'
        } transition-all duration-300 ${
          isDesktopCollapsed
            ? 'lg:w-11 lg:h-full lg:justify-center lg:items-center'
            : 'lg:w-[38%] xl:w-[35%] h-full flex flex-col justify-between gap-1.5 sm:gap-2'
        } overflow-hidden shrink-0 relative`}
      >
        {isDesktopCollapsed ? (
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="w-10 h-36 rounded-xl bg-stone-900/90 border border-amber-500/40 text-amber-400 hover:text-white flex flex-col items-center justify-center gap-2 hover:bg-stone-800 shadow-xl transition-all cursor-pointer"
            title="展開十八仔下注面板"
          >
            <PanelRightOpen className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold" style={{ writingMode: 'vertical-rl' }}>
              展開下注面板
            </span>
          </button>
        ) : (
          <div className="w-full h-full flex flex-col justify-between gap-1.5 sm:gap-2 overflow-hidden relative">
            <div className="absolute top-1.5 right-1.5 z-20">
              <button
                onClick={() => setIsDesktopCollapsed(true)}
                className="p-1 rounded-lg bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-700/80 cursor-pointer shadow-md"
                title="收起選單以最大化骰碗視野"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 1. Siba Bead Road & Trend Stats */}
            <div className="rounded-xl bg-[#0c0f18] border border-amber-500/20 p-2 shadow-md shrink-0 flex flex-col gap-1.5 pr-8">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>十八仔珠盤路 ({history.length})</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                  <span className="hidden sm:inline">
                    勝率:{' '}
                    <b className="text-amber-400">
                      {stats.rolls > 0
                        ? `${Math.round((stats.wins / stats.rolls) * 100)}%`
                        : '0%'}
                    </b>
                  </span>
                  <span>
                    十八: <b className="text-amber-400">{stats.eighteenCount}</b>
                  </span>
                  <span>
                    BG: <b className="text-rose-400">{stats.bgCount}</b>
                  </span>
                </div>
              </div>

              {/* Bead Plate Pills Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                {history.length === 0 ? (
                  <span className="text-[10px] text-stone-500 italic py-1">
                    暫無開骰紀錄，檯面下注後擲骰開盤...
                  </span>
                ) : (
                  history.slice(0, 14).map((h, i) => {
                    const isTopReward = h.isEighteen || h.isFourKind;
                    return (
                      <div
                        key={`hist-${i}-${h.timestamp}`}
                        className={`shrink-0 h-7 min-w-[28px] px-1.5 rounded-full text-[10px] font-mono font-black border flex items-center justify-center gap-0.5 shadow-sm transition-transform hover:scale-110 cursor-default ${
                          isTopReward
                            ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-stone-950 border-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse'
                            : h.isBG
                            ? 'bg-rose-950 text-rose-300 border-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.4)]'
                            : h.isBig
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                            : 'bg-blue-950/80 text-blue-300 border-blue-500/60'
                        }`}
                        title={`${h.categoryLabel} 骰子:[${h.dice.join(', ')}] • 淨利: $${h.netProfit.toLocaleString()}`}
                      >
                        <span>
                          {h.isEighteen
                            ? '18'
                            : h.isFourKind
                            ? '豹'
                            : h.isBG
                            ? 'BG'
                            : `${h.points}${h.isBig ? '大' : '小'}`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. Betting Table Grid */}
            <SibaBettingTable
              currentBets={currentBets}
              selectedChip={selectedChip}
              onPlaceBet={handlePlaceBet}
              onRemoveBetSpot={handleRemoveBetSpot}
              disabled={isRolling}
            />

            {/* 3. Chip Selector */}
            <div className="rounded-xl bg-[#0c0e14] border border-amber-500/20 p-1.5 sm:p-2 shadow-lg shrink-0">
              <ChipSelector
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                disabled={isRolling}
                balance={balance}
              />
            </div>

            {/* 4. Action Control Panel */}
            <div className="rounded-xl bg-[#0e111a] border border-amber-500/30 p-2 shadow-xl shrink-0 flex flex-col gap-1.5 select-none">
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  id="btn-siba-undo"
                  disabled={isRolling || betHistoryStack.length === 0}
                  onClick={handleUndoBet}
                  className={`py-1.5 px-1 rounded-lg border border-stone-700 bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isRolling || betHistoryStack.length === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer active:scale-95'
                  }`}
                  title="撤銷上一筆下注 (快捷鍵: Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>撤銷</span>
                </button>

                <button
                  id="btn-siba-clear"
                  disabled={isRolling || currentBets.length === 0}
                  onClick={handleClearBets}
                  className={`py-1.5 px-1 rounded-lg border border-stone-700 bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isRolling || currentBets.length === 0
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer active:scale-95'
                  }`}
                  title="清除所有下注 (快捷鍵: C)"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>清除</span>
                </button>

                <button
                  id="btn-siba-double"
                  disabled={isRolling || currentBets.length === 0 || balance < totalBetAmount}
                  onClick={handleDoubleBets}
                  title={balance < totalBetAmount ? '籌碼不足' : '下注加倍 2X (快捷鍵: X)'}
                  className={`py-1.5 px-1 rounded-lg border border-stone-700 bg-stone-900/90 text-amber-300 hover:text-amber-200 hover:bg-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                    isRolling || currentBets.length === 0 || balance < totalBetAmount
                      ? 'opacity-40 cursor-not-allowed'
                      : 'cursor-pointer active:scale-95'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>加倍 2X</span>
                </button>

                {(() => {
                  const lastTotal = lastBets.reduce((acc, b) => acc + b.amount, 0);
                  const isInsufficient = balance < lastTotal;
                  return (
                    <button
                      id="btn-siba-rebet"
                      disabled={isRolling || lastBets.length === 0 || isInsufficient}
                      onClick={handleRebet}
                      title={isInsufficient ? '籌碼不足' : '同額續注 (快捷鍵: R)'}
                      className={`py-1.5 px-1 rounded-lg border border-stone-700 bg-stone-900/90 text-emerald-300 hover:text-emerald-200 hover:bg-stone-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        isRolling || lastBets.length === 0 || isInsufficient
                          ? 'opacity-40 cursor-not-allowed'
                          : 'cursor-pointer active:scale-95'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>重下</span>
                    </button>
                  );
                })()}
              </div>

              <button
                id="btn-siba-roll"
                disabled={isRolling || currentBets.length === 0}
                onClick={handleRoll}
                className={`w-full min-h-[44px] py-2 px-3 rounded-xl font-black text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 transition-all ${
                  isRolling
                    ? 'bg-stone-800 text-amber-300 border border-amber-500/40 cursor-wait animate-pulse'
                    : currentBets.length > 0
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-[0.98] cursor-pointer'
                    : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                }`}
                title={currentBets.length > 0 ? '擲骰開碗 (快捷鍵: 空白鍵 Space)' : '請在上方檯面下注'}
              >
                <RotateCcw
                  className={`w-4 h-4 ${
                    isRolling ? 'animate-spin text-amber-300' : 'text-stone-950'
                  }`}
                />
                <span>
                  {isRolling
                    ? '擲骰揭曉中 (ROLLING)...'
                    : currentBets.length > 0
                    ? `擲骰開碗 (ROLL - $${totalBetAmount.toLocaleString()})`
                    : '請先在檯面下注 (PLACE BETS)'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MOBILE & TABLET SLIDE-UP COLLAPSIBLE DRAWER ==================== */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex-1 w-full" onClick={() => setIsDrawerOpen(false)} />
          <div className="w-full max-h-[88vh] overflow-hidden flex flex-col bg-[#0b0e14] border-t-2 border-amber-500/60 rounded-t-3xl shadow-[0_-15px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="p-3 bg-stone-950/95 border-b border-stone-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-300 leading-tight">
                    十八仔下注與盤路選單
                  </h3>
                  <span className="text-[11px] text-stone-400 font-mono">
                    已押注: ${totalBetAmount.toLocaleString()} • 餘額: ${balance.toLocaleString()}
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

            {/* Drawer Scrollable Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-2.5">
              {/* Bead Road */}
              <div className="rounded-xl bg-[#0c0f18] border border-amber-500/20 p-2 shadow-md shrink-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>開骰盤路 ({history.length})</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-400">
                    <span>十八: <b className="text-amber-400">{stats.eighteenCount}</b></span>
                    <span>BG: <b className="text-rose-400">{stats.bgCount}</b></span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                  {history.length === 0 ? (
                    <span className="text-[10px] text-stone-500 italic py-1">暫無開骰紀錄...</span>
                  ) : (
                    history.slice(0, 14).map((h, i) => {
                      const isTopReward = h.isEighteen || h.isFourKind;
                      return (
                        <div
                          key={`drawer-hist-${i}-${h.timestamp}`}
                          className={`shrink-0 h-7 min-w-[28px] px-1.5 rounded-full text-[10px] font-mono font-black border flex items-center justify-center gap-0.5 ${
                            isTopReward
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 border-amber-200'
                              : h.isBG
                              ? 'bg-rose-950 text-rose-300 border-rose-500/80'
                              : h.isBig
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                              : 'bg-blue-950/80 text-blue-300 border-blue-500/60'
                          }`}
                        >
                          <span>{h.isEighteen ? '18' : h.isFourKind ? '豹' : h.isBG ? 'BG' : `${h.points}${h.isBig ? '大' : '小'}`}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Drawer Safe Mode: Chip Denomination Switcher & Mandatory Confirm Exit Button */}
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
                  此選單僅供切換籌碼幣值與查看珠盤路。選定欲使用的籌碼面額後，請點擊下方「確定退出」按鈕，返回檯面進行押注與擲骰開碗。
                </p>

                {/* Chip Selector */}
                <div className="w-full">
                  <ChipSelector
                    selectedChip={selectedChip}
                    onSelectChip={setSelectedChip}
                    disabled={isRolling}
                    balance={balance}
                  />
                </div>

                {/* Confirm & Exit Button */}
                <button
                  id="btn-siba-drawer-confirm"
                  onClick={() => {
                    sound.playChip();
                    setIsDrawerOpen(false);
                    toastService.info(`已設定下注籌碼面額：$${selectedChip.toLocaleString()}`);
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-stone-950" />
                  <span>確定退出 (使用 ${selectedChip.toLocaleString()} 籌碼)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
