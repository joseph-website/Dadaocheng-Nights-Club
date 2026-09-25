import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SlotSymbolId, SlotWinResult, SlotStats, SlotSpinHistoryItem } from '../../types/slot';
import { getRandomSymbol, calculateSlotWin, SLOT_SYMBOLS } from '../../utils/slot';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { isTurboMode } from '../../utils/turbo';
import { SlotReel } from './SlotReel';
import { SlotPaytable } from './SlotPaytable';
import { SlotLever } from './SlotLever';
import { WinToast, WinToastData } from '../common/WinToast';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import { CasinoChip } from '../common/CasinoChip';
import {
  Sparkles,
  Trophy,
  Flame,
  Zap,
  Pause,
  Plus,
  Minus,
  Square,
  RefreshCw,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
  Shield,
  CheckCircle2,
} from 'lucide-react';

interface SlotMachineProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  soundEnabled: boolean;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEY_SLOT_STATS = 'casino_slot_stats_v1';
const STORAGE_KEY_SLOT_HISTORY = 'casino_slot_history_v1';
const BET_OPTIONS = [100, 500, 1000, 2500, 5000, 10000];

export const SlotMachine: React.FC<SlotMachineProps> = ({
  balance,
  onUpdateBalance,
  onRoundBusyChange,
}) => {
  // 3 Reels current symbols
  const [reels, setReels] = useState<[SlotSymbolId, SlotSymbolId, SlotSymbolId]>([
    'seven',
    'bar',
    'seven',
  ]);

  // Individual reel spinning states
  const [spinningReels, setSpinningReels] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);

  const isAnySpinning = spinningReels.some(Boolean);

  // Selected bet per spin
  const [betAmount, setBetAmount] = useState<number>(1000);

  // Lever pulled animation state
  const [isLeverPulled, setIsLeverPulled] = useState(false);

  // Last win result
  const [lastResult, setLastResult] = useState<SlotWinResult | null>(null);

  // Auto-fading Win Toast
  const [winToast, setWinToast] = useState<WinToastData | null>(null);

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);

  // Auto spin configuration
  const [autoSpinRemaining, setAutoSpinRemaining] = useState<number>(0);
  const isAutoSpinning = autoSpinRemaining > 0;

  // Lifetime Stats
  const [stats, setStats] = useState<SlotStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SLOT_STATS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      spins: 0,
      wins: 0,
      totalBet: 0,
      totalWon: 0,
      jackpots: 0,
      highestWin: 0,
    };
  });

  // Recent Spin History
  const [history, setHistory] = useState<SlotSpinHistoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SLOT_HISTORY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  });

  const autoSessionRef = useRef<{
    active: boolean;
    totalSpins: number;
    completedSpins: number;
    totalBet: number;
    totalWon: number;
  }>({
    active: false,
    totalSpins: 0,
    completedSpins: 0,
    totalBet: 0,
    totalWon: 0,
  });
  const autoSpinRemainingRef = useRef<number>(0);
  const autoSpinNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  const balanceRef = useRef(balance);
  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  // Save stats & history
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SLOT_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SLOT_HISTORY, JSON.stringify(history));
  }, [history]);

  // Listen to global reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({
        spins: 0,
        wins: 0,
        totalBet: 0,
        totalWon: 0,
        jackpots: 0,
        highestWin: 0,
      });
      setHistory([]);
      setLastResult(null);
      autoSpinRemainingRef.current = 0;
      autoSessionRef.current.active = false;
      if (autoSpinNextTimerRef.current) {
        clearTimeout(autoSpinNextTimerRef.current);
        autoSpinNextTimerRef.current = null;
      }
      setAutoSpinRemaining(0);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, []);

  // Sync round busy state (spinning or auto-spinning) to parent for clean bankruptcy timing and forfeit warning
  useEffect(() => {
    const isBusy = isAnySpinning || autoSpinRemaining > 0;
    onRoundBusyChange?.(isBusy, isBusy ? betAmount : 0);
  }, [isAnySpinning, autoSpinRemaining, betAmount, onRoundBusyChange]);

  // Audio tick timer for rolling sound during spins
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startSpin = useCallback(() => {
    if (isAnySpinning) return;

    if (balanceRef.current < betAmount) {
      sound.playLoss();
      autoSpinRemainingRef.current = 0;
      autoSessionRef.current.active = false;
      setAutoSpinRemaining(0);
      toastService.warn(
        `🚨 籌碼不足！單次旋轉需 ${betAmount.toLocaleString()} 點，當前可用籌碼餘額為 ${balanceRef.current.toLocaleString()} 點。`
      );
      return;
    }

    if (autoSessionRef.current.active) {
      autoSessionRef.current.totalBet += betAmount;
    }

    // Deduct bet from shared balance
    onRoundBusyChange?.(true, betAmount);
    const currentBalance = balanceRef.current;
    onUpdateBalance(currentBalance - betAmount);
    dispatchBetAction({ gameId: 'slot', betType: 'spin', amount: betAmount });
    setLastResult(null);

    // Pull lever visual and audio (0.35s 3D spring rebound)
    setIsLeverPulled(true);
    sound.playLever();
    setTimeout(() => setIsLeverPulled(false), 350);

    // Start all 3 reels spinning
    setSpinningReels([true, true, true]);

    // Target outcomes
    const target1 = getRandomSymbol();
    const target2 = getRandomSymbol();
    const target3 = getRandomSymbol();
    const finalReels: [SlotSymbolId, SlotSymbolId, SlotSymbolId] = [
      target1,
      target2,
      target3,
    ];

    // Sound ticking loop
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    spinIntervalRef.current = setInterval(() => {
      sound.playReelTick();
    }, 100);

    const isTurbo = isTurboMode();
    const t1 = isTurbo ? 250 : 850;
    const t2 = isTurbo ? 450 : 1250;
    const t3 = isTurbo ? 650 : 1650;

    // Stop Reel 1
    setTimeout(() => {
      setReels((prev) => [target1, prev[1], prev[2]]);
      setSpinningReels([false, true, true]);
      sound.playReelStop(0);
    }, t1);

    // Stop Reel 2
    setTimeout(() => {
      setReels((prev) => [target1, target2, prev[2]]);
      setSpinningReels([false, false, true]);
      sound.playReelStop(1);
    }, t2);

    // Stop Reel 3
    setTimeout(() => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }

      setReels(finalReels);
      setSpinningReels([false, false, false]);
      sound.playReelStop(2);

      // Evaluate outcome
      const result = calculateSlotWin(finalReels, betAmount);
      setLastResult(result);

      if (autoSessionRef.current.active) {
        autoSessionRef.current.completedSpins += 1;
        autoSessionRef.current.totalWon += result.winAmount;
      }

      if (result.isWin) {
        let finalWin = result.winAmount;
        let bonusWon = 0;
        const bonus = checkHouseBonus(betAmount);
        if (bonus.triggered) {
          bonusWon = bonus.bonusAmount;
          finalWin += bonusWon;
          notifyHouseBonus(bonus, '老虎機');
        }

        if (autoSessionRef.current.active) {
          autoSessionRef.current.totalWon += bonusWon;
        }

        // Credit win to global balance
        onUpdateBalance(balanceRef.current + finalWin);

        if (result.isJackpot) {
          sound.playBigWin();
          sound.playCoinPayout();
        } else {
          sound.playWin();
          sound.playCoinPayout();
        }

        // Pop up individual Win Toast only if NOT part of an ongoing auto-spin session
        if (!autoSessionRef.current.active && !isAutoSpinning) {
          setWinToast({
            id: Date.now(),
            title: result.title,
            amount: finalWin,
            extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
            multiplier: result.multiplier,
            subtitle: `${result.description}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
            isJackpot: result.isJackpot,
          });
        }

        // Check Hidden Table Collectibles (Differentiated triggers & Chip thresholds)
        if (result.isJackpot || (finalReels[0] === 'seven' && finalReels[1] === 'seven' && finalReels[2] === 'seven')) {
          unlockHiddenCollectible('col-slot-777');
        }
        if (finalReels[0] === 'bell' && finalReels[1] === 'bell' && finalReels[2] === 'bell' && betAmount >= 500) {
          unlockHiddenCollectible('col-slot-bells');
        }
        if (finalReels[0] === 'cherry' && finalReels[1] === 'cherry' && finalReels[2] === 'cherry' && betAmount >= 500) {
          unlockHiddenCollectible('col-slot-cherries');
        }
        if (finalReels[0] === 'bar' && finalReels[1] === 'bar' && finalReels[2] === 'bar') {
          unlockHiddenCollectible('col-slot-diamonds');
        }
        if (result.winAmount >= 10000) {
          unlockHiddenCollectible('col-slot-big-win');
        }
      }

      // Check spins count achievement (at least 50 spins with minimum 200 bet)
      if (stats.spins >= 49 && betAmount >= 200) {
        unlockHiddenCollectible('col-slot-spins');
      }

      // Update statistics
      setStats((prev) => ({
        spins: prev.spins + 1,
        wins: result.isWin ? prev.wins + 1 : prev.wins,
        totalBet: prev.totalBet + betAmount,
        totalWon: prev.totalWon + result.winAmount,
        jackpots: result.isJackpot ? prev.jackpots + 1 : prev.jackpots,
        highestWin: Math.max(prev.highestWin, result.winAmount),
      }));

      // Append to Spin History
      const histItem: SlotSpinHistoryItem = {
        id: `slot-spin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        bet: betAmount,
        reels: finalReels,
        isWin: result.isWin,
        winAmount: result.winAmount,
        multiplier: result.multiplier,
        title: result.title,
        description: result.description,
        isJackpot: result.isJackpot,
      };
      setHistory((prev) => [histItem, ...prev.slice(0, 49)]);

      // Record Global Career Round
      recordCareerRound({
        gameId: 'slot',
        betAmount,
        winAmount: result.winAmount,
        multiplier: result.multiplier,
      });

      // Check auto spin progression using authoritative ref
      if (autoSessionRef.current.active && autoSpinRemainingRef.current > 0) {
        autoSpinRemainingRef.current -= 1;
        const nextRemaining = autoSpinRemainingRef.current;
        setAutoSpinRemaining(nextRemaining);

        // If this was the last auto-spin, show consolidated session summary
        if (nextRemaining <= 0) {
          const session = autoSessionRef.current;
          session.active = false;
          const netProfit = session.totalWon - session.totalBet;
          const isGain = netProfit > 0;
          const isEven = netProfit === 0;

          setWinToast({
            id: `slot-auto-summary-${Date.now()}`,
            title: isGain
              ? '🎉 自動連轉結算：大獲利！'
              : isEven
              ? '⚖️ 自動連轉結算：收支打平'
              : '📊 自動連轉結算：淨虧損',
            amount: session.totalWon,
            netProfit,
            totalBet: session.totalBet,
            totalWon: session.totalWon,
            isSummary: true,
            multiplier: session.totalBet > 0 ? Number((session.totalWon / session.totalBet).toFixed(2)) : 1,
            subtitle: `共完成 ${session.completedSpins} 轉 | 總投入 ${session.totalBet.toLocaleString()} 點 | 總回收 ${session.totalWon.toLocaleString()} 點`,
            isJackpot: netProfit >= 5000,
          });
        }
      } else {
        // If user stopped mid-spin or session is inactive, ensure state is 0 and do not proceed
        autoSpinRemainingRef.current = 0;
        setAutoSpinRemaining(0);
      }
    }, t3);
  }, [betAmount, isAnySpinning, onUpdateBalance, stats.spins]);

  // Trigger next auto-spin round with a small buffer delay
  useEffect(() => {
    if (autoSpinRemaining > 0 && !isAnySpinning && autoSessionRef.current.active) {
      const bufferDelay = isTurboMode() ? 250 : 800;
      autoSpinNextTimerRef.current = setTimeout(() => {
        if (autoSessionRef.current.active && autoSpinRemainingRef.current > 0) {
          startSpin();
        }
      }, bufferDelay);
      return () => {
        if (autoSpinNextTimerRef.current) {
          clearTimeout(autoSpinNextTimerRef.current);
          autoSpinNextTimerRef.current = null;
        }
      };
    }
  }, [autoSpinRemaining, isAnySpinning, startSpin]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      if (autoSpinNextTimerRef.current) clearTimeout(autoSpinNextTimerRef.current);
    };
  }, []);

  const handleMaxBet = () => {
    sound.playClick();
    const maxAffordable = BET_OPTIONS.filter((b) => b <= balance).pop() || 100;
    setBetAmount(maxAffordable);
  };

  const handleStopAutoSpin = useCallback(() => {
    sound.playClick();
    autoSpinRemainingRef.current = 0;
    autoSessionRef.current.active = false;
    if (autoSpinNextTimerRef.current) {
      clearTimeout(autoSpinNextTimerRef.current);
      autoSpinNextTimerRef.current = null;
    }
    setAutoSpinRemaining(0);
    toastService.info('已停止自動連轉');
  }, []);

  const handleToggleAutoSpin = (count: number) => {
    sound.playClick();
    if (autoSpinRemainingRef.current > 0 || autoSessionRef.current.active) {
      handleStopAutoSpin();
    } else {
      const totalRequired = betAmount * count;
      if (balance < totalRequired) {
        sound.playLoss();
        toastService.warn(
          `🚨 籌碼不足以進行 ${count} 次連轉！單次押注 ${betAmount.toLocaleString()} 點 × ${count} 次需 ${totalRequired.toLocaleString()} 點，當前可用籌碼僅 ${balance.toLocaleString()} 點。`
        );
        return;
      }
      autoSessionRef.current = {
        active: true,
        totalSpins: count,
        completedSpins: 0,
        totalBet: 0,
        totalWon: 0,
      };
      autoSpinRemainingRef.current = count;
      setAutoSpinRemaining(count);
      if (!isAnySpinning) {
        startSpin();
      }
    }
  };

  // Keyboard shortcut Space to spin or stop auto-spin
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
        if (autoSpinRemaining > 0) {
          handleStopAutoSpin();
        } else if (!isAnySpinning) {
          startSpin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoSpinRemaining, handleStopAutoSpin, isAnySpinning, startSpin]);

  // Reusable Sidebar / Drawer Content Component
  const renderSidebarContent = (isDrawer = false) => (
    <div className="flex flex-col gap-2">
      {/* 1. TOP: Fixed Multiplier Paytable */}
      <SlotPaytable winPatternId={lastResult?.winPatternId} />

      {/* 2. BET SELECTION PANEL */}
      <div className="p-2.5 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-stone-200">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>單次下注面額 (BET):</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CasinoChip amount={betAmount} size="xs" />
            <span className="font-mono text-amber-400 text-sm sm:text-base font-black">
              {betAmount.toLocaleString()} 點
            </span>
          </div>
        </div>

        {/* Quick preset chips */}
        <div className="grid grid-cols-6 gap-1.5">
          {BET_OPTIONS.map((val) => {
            const isSelected = betAmount === val;
            const isInsufficient = balance < val;
            return (
              <button
                key={val}
                disabled={isAnySpinning || isInsufficient}
                onClick={() => {
                  if (isInsufficient) return;
                  sound.playClick();
                  setBetAmount(val);
                }}
                className={`chip-btn min-h-[38px] py-1 px-0.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition-all select-none flex flex-col items-center justify-center ${
                  isAnySpinning
                    ? 'opacity-50 cursor-not-allowed bg-stone-900/90 text-stone-600 border-stone-800'
                    : isInsufficient
                    ? 'opacity-35 cursor-not-allowed bg-stone-900/40 text-stone-500 border-stone-800/50'
                    : isSelected
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] scale-105 font-black cursor-pointer'
                    : 'bg-stone-900/90 text-stone-200 border-stone-800 hover:border-amber-500/40 hover:bg-stone-800 cursor-pointer'
                }`}
                title={isInsufficient ? `籌碼不足 (需要 ${val} 點)` : undefined}
              >
                <span>{val >= 1000 ? `${val / 1000}k` : val}</span>
                {isInsufficient && (
                  <span className="text-[8px] font-normal text-rose-400 leading-none">不足</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Adjusters & Max Bet */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            disabled={isAnySpinning || betAmount <= 100}
            onClick={() => {
              sound.playClick();
              setBetAmount((prev) => Math.max(100, prev - 500));
            }}
            className="flex-1 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>-500 點</span>
          </button>

          <button
            disabled={isAnySpinning || betAmount >= balance}
            onClick={() => {
              sound.playClick();
              setBetAmount((prev) => Math.min(balance, prev + 500));
            }}
            className="flex-1 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+500 點</span>
          </button>

          <button
            disabled={isAnySpinning}
            onClick={handleMaxBet}
            className="px-3 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-xs sm:text-sm font-black cursor-pointer disabled:opacity-40"
          >
            MAX
          </button>
        </div>
      </div>

      {/* 3. IN DRAWER SAFE MODE: MANDATORY CONFIRM EXIT BUTTON (NO SPIN BUTTON TO PREVENT ACCIDENTAL SPINS) */}
      {isDrawer ? (
        <div className="p-3 rounded-xl bg-[#0c0e17] border border-amber-500/30 shadow-xl flex flex-col gap-2.5 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-stone-300 pb-2 border-b border-stone-800">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>安全防誤觸模式已啟用</span>
            </span>
            <span className="font-mono text-amber-400 font-bold">
              目前注金: ${betAmount.toLocaleString()}
            </span>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed">
            此選單僅供切換注額與查看賠率表。選定欲押注金額後，請點擊下方「確定退出」返回拉霸機台進行拉桿或旋轉。
          </p>

          <button
            id="btn-slot-drawer-confirm"
            onClick={() => {
              sound.playChip();
              setIsDrawerOpen(false);
              toastService.info(`已設定拉霸注金：$${betAmount.toLocaleString()}`);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <CheckCircle2 className="w-5 h-5 text-stone-950" />
            <span>確定退出 (使用 ${betAmount.toLocaleString()} 注金)</span>
          </button>
        </div>
      ) : (
        /* Desktop Only: Spin & Auto-spin controls */
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#0c0e17] border border-amber-500/30 shadow-xl flex flex-col gap-1.5 shrink-0">
          <button
            id="btn-slot-spin"
            disabled={!isAutoSpinning && (isAnySpinning || balance < betAmount)}
            onClick={() => {
              if (isAutoSpinning) {
                handleStopAutoSpin();
              } else if (!isAnySpinning) {
                startSpin();
              }
            }}
            className={`w-full min-h-[50px] py-2.5 rounded-xl font-black text-base sm:text-lg tracking-wider uppercase shadow-xl transition-all flex items-center justify-center gap-2 ${
              isAutoSpinning
                ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 hover:from-rose-600 hover:to-rose-500 text-white border-2 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)] cursor-pointer active:scale-98 animate-pulse'
                : isAnySpinning
                ? 'bg-stone-800 text-amber-300 border border-amber-500/40 cursor-wait'
                : balance >= betAmount
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-[0.98] cursor-pointer'
                : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
            }`}
          >
            {isAutoSpinning ? (
              <>
                <Square className="w-5 h-5 fill-current text-white" />
                <span>停止連轉 (剩餘 {autoSpinRemaining} 次)</span>
              </>
            ) : isAnySpinning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>SPINNING...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>旋轉開獎 (SPIN)</span>
              </>
            )}
          </button>

          {/* Auto Spin Presets */}
          <div className="flex items-center justify-between gap-1.5 min-h-[28px]">
            <div className="flex items-center gap-1.5 text-xs text-stone-300 font-bold">
              <span>自動連轉:</span>
              {isAutoSpinning ? (
                <span className="text-xs font-mono text-amber-400 font-bold animate-pulse">
                  剩餘 {autoSpinRemaining}
                </span>
              ) : (
                <span className="text-[11px] font-mono text-stone-500">次數</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {[5, 10, 25].map((count) => {
                const isCurrentSessionPreset =
                  isAutoSpinning && autoSessionRef.current.active && autoSessionRef.current.totalSpins === count;
                const isDisabled = isAutoSpinning
                  ? !isCurrentSessionPreset
                  : isAnySpinning || balance < betAmount * count;

                return (
                  <button
                    key={count}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isCurrentSessionPreset) {
                        handleStopAutoSpin();
                      } else if (!isAutoSpinning && !isAnySpinning) {
                        handleToggleAutoSpin(count);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                      isCurrentSessionPreset
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_10px_rgba(225,29,72,0.6)] border border-rose-400 animate-pulse cursor-pointer'
                        : isDisabled
                        ? 'bg-stone-900/40 text-stone-600 border border-stone-800/50 cursor-not-allowed opacity-40'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 cursor-pointer'
                    }`}
                  >
                    {isCurrentSessionPreset ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>停止</span>
                      </>
                    ) : (
                      <span>{count} 次</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. LIFETIME STATS CARD */}
      <div className="p-2 rounded-xl bg-[#0c0e14] border border-amber-500/20 shadow-xl flex flex-col gap-0.5 shrink-0">
        <div className="flex items-center justify-between border-b border-stone-800 pb-0.5">
          <div className="flex items-center gap-1 text-stone-300 font-bold text-xs">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>老虎機戰績 (STATS)</span>
          </div>
          <button
            onClick={() => {
              setStats({
                spins: 0,
                wins: 0,
                totalBet: 0,
                totalWon: 0,
                jackpots: 0,
                highestWin: 0,
              });
            }}
            className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors"
          >
            清空
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
            <div className="text-[9px] text-stone-400">總轉數</div>
            <div className="font-mono font-black text-xs text-stone-100">{stats.spins}</div>
          </div>
          <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
            <div className="text-[9px] text-emerald-400">中獎次數</div>
            <div className="font-mono font-black text-xs text-emerald-400">{stats.wins}</div>
          </div>
          <div className="p-0.5 rounded-lg bg-stone-900/80 border border-stone-800">
            <div className="text-[9px] text-amber-400">JACKPOT</div>
            <div className="font-mono font-black text-xs text-amber-400">{stats.jackpots}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-2.5 overflow-hidden select-none animate-fade-in relative">
      {/* LEFT COLUMN: Golden Arcade Slot Cabinet (Maximized on Mobile/Tablet) */}
      <div
        id="game-visual-area"
        className={`w-full ${
          isDesktopCollapsed ? 'lg:flex-1' : 'lg:w-[62%] xl:w-[65%]'
        } h-full min-h-0 flex flex-col rounded-2xl bg-gradient-to-b from-[#1a1202] via-[#241703] to-[#120a01] border-3 border-amber-500/80 shadow-[0_0_40px_rgba(0,0,0,0.9)] overflow-hidden p-2 sm:p-3 relative justify-between transition-all duration-700`}
      >
        {/* Floating 2-Second Auto-Fading Win Toast located internally inside #game-visual-area */}
        <WinToast toast={winToast} onDismiss={() => setWinToast(null)} />

        {/* Background decorative corner flourishes */}
        <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-400/30 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/30 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-400/30 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/30 rounded-br-xl pointer-events-none" />

        {/* 1. TOP MARQUEE JACKPOT SIGN */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-stone-950 via-amber-950/80 to-stone-950 border-2 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black font-serif tracking-widest text-amber-300 drop-shadow flex items-center gap-1.5">
                <span>NOCTURNAL 777 夜行拉霸機</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-mono animate-pulse">
                  200X JACKPOT
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                可用籌碼餘額
              </span>
              <span className="font-mono font-black text-amber-300 text-xs sm:text-sm">
                {balance.toLocaleString()} 點
              </span>
            </div>
          </div>
        </div>

        {/* 2. REEL DISPLAY CABINET STAGE & PULL LEVER */}
        <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 my-auto py-1 flex-1 overflow-hidden">
          {/* Main 3 Reels Bezel Enclosure */}
          <div className="flex-1 max-w-xl p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-black border-4 border-amber-500/70 shadow-[0_0_35px_rgba(0,0,0,0.9)] relative">
            {/* LED Bulb Border along the cabinet */}
            <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex gap-1.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      isAnySpinning
                        ? i % 2 === 0
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                        : 'bg-amber-400/80 shadow-[0_0_4px_#fbbf24]'
                    } transition-colors duration-150`}
                  />
                ))}
              </div>
              <div className="text-[9px] font-mono font-bold text-amber-300/80 uppercase tracking-widest">
                WIN LINE CENTER
              </div>
              <div className="flex gap-1.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      isAnySpinning
                        ? i % 2 !== 0
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                        : 'bg-amber-400/80 shadow-[0_0_4px_#fbbf24]'
                    } transition-colors duration-150`}
                  />
                ))}
              </div>
            </div>

            {/* 3 Physical Reels Stage */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 relative">
              {/* Center Payline Laser Arrows */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-30 text-amber-400 text-xs font-bold animate-pulse">
                ▶
              </div>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-30 text-amber-400 text-xs font-bold animate-pulse">
                ◀
              </div>

              <SlotReel
                targetSymbol={reels[0]}
                isSpinning={spinningReels[0]}
                reelIndex={0}
              />
              <SlotReel
                targetSymbol={reels[1]}
                isSpinning={spinningReels[1]}
                reelIndex={1}
              />
              <SlotReel
                targetSymbol={reels[2]}
                isSpinning={spinningReels[2]}
                reelIndex={2}
              />
            </div>

            {/* Bottom Cabinet Coin Tray Decoration with Active Dropped Bet Chip & Amount Badge */}
            <div className="mt-1.5 pt-1 border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-400 px-2 font-mono">
              <div className="flex items-center gap-2">
                <span>單次押注:</span>
                <div className="flex items-center gap-1">
                  <CasinoChip amount={betAmount} size="xs" />
                  <span className="px-1.5 py-0.2 rounded bg-black/90 border border-amber-400 text-amber-300 font-mono font-bold text-[9px]">
                    {betAmount.toLocaleString()} 點
                  </span>
                </div>
              </div>
              <span className="text-stone-500 hidden sm:inline">3D 機械拉桿可點擊拉動</span>
            </div>
          </div>

          {/* Interactive Mechanical 3D Pull Lever on Right Side of Cabinet */}
          <div className="hidden md:flex flex-col items-center">
            <SlotLever
              isPulled={isLeverPulled}
              disabled={isAnySpinning || balance < betAmount}
              onPull={startSpin}
            />
          </div>
        </div>

        {/* 3. BOTTOM WIN / STATUS BANNER */}
        <div className="relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur border border-amber-500/30 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-stone-200">開獎結算:</span>
            {lastResult ? (
              <span
                className={`text-xs sm:text-sm font-black font-mono px-2 py-0.5 rounded ${
                  lastResult.isWin
                    ? lastResult.isJackpot
                      ? 'bg-amber-400 text-stone-950 animate-bounce'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {lastResult.isWin
                  ? `WIN +${lastResult.winAmount.toLocaleString()} 點 (${lastResult.multiplier}X)`
                  : '未中獎'}
              </span>
            ) : isAnySpinning ? (
              <span className="text-xs font-bold text-amber-300 animate-pulse">
                滾軸旋轉中... 祝您好運！
              </span>
            ) : (
              <span className="text-xs text-stone-400">
                請設定注金並點擊「旋轉」或「拉桿」開始遊戲
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-stone-300">
            <span className="text-[11px] text-stone-400">本局注金:</span>
            <span className="font-black text-amber-400">{betAmount.toLocaleString()} 點</span>
          </div>
        </div>

        {/* COMPACT MOBILE & TABLET ACTION DOCK (手機與平板專屬快捷操作列) */}
        <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2 py-1.5 mt-1 bg-stone-900/95 rounded-xl border border-stone-800/90 shadow-xl shrink-0 lg:hidden relative z-20">
          <div className="flex items-center gap-1.5 bg-stone-950/90 px-2 py-1.5 rounded-lg border border-stone-800 shrink-0">
            <CasinoChip amount={betAmount} size="xs" />
            <div className="flex items-baseline gap-0.5 font-mono font-bold text-xs text-amber-300">
              ${betAmount >= 1000 ? `${betAmount / 1000}k` : betAmount}
            </div>
          </div>

          <button
            id="btn-mobile-slot-spin"
            disabled={!isAutoSpinning && (isAnySpinning || balance < betAmount)}
            onClick={() => {
              if (isAutoSpinning) {
                handleStopAutoSpin();
              } else if (!isAnySpinning) {
                startSpin();
              }
            }}
            className={`flex-1 min-h-[44px] py-1.5 px-3 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-manipulation ${
              isAutoSpinning
                ? 'bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 text-white border-2 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)] animate-pulse'
                : isAnySpinning
                ? 'bg-stone-800 text-amber-300 border border-amber-500/40 cursor-wait'
                : balance >= betAmount
                ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
            }`}
          >
            {isAutoSpinning ? (
              <>
                <Square className="w-4 h-4 fill-current text-white" />
                <span>停止 ({autoSpinRemaining})</span>
              </>
            ) : isAnySpinning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>旋轉中...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>旋轉開獎</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl bg-stone-950 text-stone-200 hover:text-amber-400 border border-stone-700 flex items-center gap-1.5 text-xs font-bold shrink-0 active:scale-95 touch-manipulation"
            title="開啟倍率表與下注選單"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span className="hidden min-[360px]:inline">下注選單</span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* DESKTOP COLLAPSED STRIP */}
      {isDesktopCollapsed && (
        <div className="hidden lg:flex flex-col items-center justify-between p-2 bg-[#0c0e14] border border-stone-800 rounded-2xl w-11 shrink-0">
          <button
            onClick={() => setIsDesktopCollapsed(false)}
            className="w-8 h-8 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-700 flex items-center justify-center cursor-pointer transition-colors"
            title="展開下注與賠率面板"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <div className="[writing-mode:vertical-lr] rotate-180 text-[11px] font-mono tracking-widest text-stone-400 font-bold flex items-center gap-2">
            <span>下注與賠率面板</span>
            <CasinoChip amount={betAmount} size="xs" />
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-400/80 animate-pulse" />
        </div>
      )}

      {/* DESKTOP EXPANDED SIDEBAR */}
      {!isDesktopCollapsed && (
        <div className="hidden lg:flex w-[38%] xl:w-[35%] h-full flex-col justify-between gap-1.5 overflow-y-auto pr-0.5 shrink-0 transition-all">
          <div className="flex items-center justify-between px-1 shrink-0">
            <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>賠率與下注控制</span>
            </span>
            <button
              onClick={() => setIsDesktopCollapsed(true)}
              className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 cursor-pointer"
              title="收納側邊欄 (最大化機台視角)"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>
          {renderSidebarContent(false)}
        </div>
      )}

      {/* MOBILE & TABLET SLIDE-UP DRAWER (手機與平板收納式下注選單) */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          <div
            className="absolute inset-0"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative z-10 w-full max-h-[85vh] bg-[#0c0e14] border-t-2 border-amber-500/60 rounded-t-3xl shadow-2xl p-4 flex flex-col gap-3 overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-black text-amber-300">賠率表與下注面板</span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-900 text-stone-400 hover:text-white flex items-center justify-center border border-stone-700"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </div>
  );
};
