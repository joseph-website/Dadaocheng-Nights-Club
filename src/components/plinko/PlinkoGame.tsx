import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PlinkoBall, PlinkoHistoryItem, PlinkoStats, PLINKO_MULTIPLIERS, PLINKO_ROWS } from '../../types/plinko';
import { PlinkoCanvas } from './PlinkoCanvas';
import { PlinkoControls, BallPackage, BALL_PACKAGES } from './PlinkoControls';
import { WinToast, WinToastData } from '../common/WinToast';
import { ToastAuraIndicator } from '../common/ToastAuraIndicator';
import { sound } from '../../utils/audio';
import { unlockHiddenCollectible } from '../../utils/inventory';
import { toastService } from '../../utils/toast';
import { checkHouseBonus, notifyHouseBonus, isAuraActive } from '../../utils/aura';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { isTurboMode } from '../../utils/turbo';
import {
  CircleDot,
  Play,
  Square,
  ShoppingCart,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  Zap,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

interface PlinkoGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const STORAGE_KEYS = {
  STATS: 'plinko_stats_v2',
  HISTORY: 'plinko_history_v2',
  BALLS: 'plinko_balls_inventory_v1',
};

const BALL_BASE_PRICE = 50; // 基本價 50 元/球

export const PlinkoGame: React.FC<PlinkoGameProps> = ({
  balance,
  onUpdateBalance,
  onRoundBusyChange,
}) => {
  // Ball Inventory state
  const [ballsCount, setBallsCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BALLS);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0) return val;
      }
    } catch {
      // ignore
    }
    return 0; // Default 0 balls
  });

  const [activeBalls, setActiveBalls] = useState<PlinkoBall[]>([]);
  const [history, setHistory] = useState<PlinkoHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stats, setStats] = useState<PlinkoStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      return saved
        ? JSON.parse(saved)
        : { totalDrops: 0, totalWagered: 0, totalWon: 0, maxMultiplier: 0, wins: 0 };
    } catch {
      return { totalDrops: 0, totalWagered: 0, totalWon: 0, maxMultiplier: 0, wins: 0 };
    }
  });

  const [winToast, setWinToast] = useState<WinToastData | null>(null);
  const [activeSlotHighlight, setActiveSlotHighlight] = useState<number | null>(null);

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);

  // Auto-drop states
  const [isAutoDropping, setIsAutoDropping] = useState(false);
  const [isAutoSessionActive, setIsAutoSessionActive] = useState(false);
  const [autoDropTarget, setAutoDropTarget] = useState<number | 'all'>(0);
  const [remainingAutoDrops, setRemainingAutoDrops] = useState<number>(0);

  // Interval timer ref to prevent any stacking
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mobile & Tablet Collapsible Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // Desktop Collapsible Sidebar state
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Auto-drop session tracking for final summary toast
  const autoSessionRef = useRef<{
    id: string;
    active: boolean;
    targetCount: number | 'all';
    totalLaunched: number;
    totalLanded: number;
    totalBet: number;
    totalPayout: number;
  }>({
    id: '',
    active: false,
    targetCount: 0,
    totalLaunched: 0,
    totalLanded: 0,
    totalBet: 0,
    totalPayout: 0,
  });

  // Fresh refs for closure safety
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const ballsCountRef = useRef(ballsCount);

  // Track streak of drops without >= 2.5x multiplier to guarantee excitement
  const dropsSinceBigWinRef = useRef(0);

  // Set of all landed ball IDs to strictly guard against duplicate landing events
  const landedBallIdsRef = useRef<Set<string>>(new Set());

  // Centralized ball inventory updater
  const updateBallsCount = useCallback((nextCount: number) => {
    const validCount = Math.max(0, nextCount);
    ballsCountRef.current = validCount;
    setBallsCount(validCount);
    try {
      localStorage.setItem(STORAGE_KEYS.BALLS, validCount.toString());
    } catch {
      // ignore
    }
  }, []);

  // Sync busy state to parent
  useEffect(() => {
    const isBusy = activeBalls.length > 0 || isAutoDropping || isAutoSessionActive;
    onRoundBusyChange?.(isBusy, activeBalls.length * BALL_BASE_PRICE);
  }, [activeBalls.length, isAutoDropping, isAutoSessionActive, onRoundBusyChange]);

  // Handle purchasing ball packages
  const handleBuyBalls = (pkg: BallPackage) => {
    if (balanceRef.current < pkg.cost) {
      sound.playLoss();
      toastService.warn(`🚨 籌碼不足！購買 ${pkg.balls} 顆彈珠需要 $${pkg.cost.toLocaleString()} 籌碼。`);
      return;
    }

    const nextBal = balanceRef.current - pkg.cost;
    balanceRef.current = nextBal;
    onUpdateBalance(nextBal);

    updateBallsCount(ballsCountRef.current + pkg.balls);

    sound.playChip();
    toastService.success(`🛒 成功購買 ${pkg.balls} 顆彈珠！(扣除 $${pkg.cost.toLocaleString()} 籌碼)`);
  };

  // 10-row binominal decision path with strict normal distribution & user guarantee rules
  const createBallPath = (): { decisions: number[]; targetSlot: number } => {
    // 1. 保底狀況發生時：連續 15 次未開出 >= 2.5x 時啟動
    //    7x 佔 15%、2.5x 佔 35%，剩下 50% 由中間五格進行常態分佈，保底球絕對不會出現 100x
    if (dropsSinceBigWinRef.current >= 15 && Math.random() < 0.45) {
      const rand = Math.random();
      let targetSlot: number;

      if (rand < 0.15) {
        // 7x: 15% (Slot 1: 7.5%, Slot 9: 7.5%)
        targetSlot = Math.random() < 0.5 ? 1 : 9;
      } else if (rand < 0.50) {
        // 2.5x: 35% (Slot 2: 17.5%, Slot 8: 17.5%)
        targetSlot = Math.random() < 0.5 ? 2 : 8;
      } else {
        // 剩下 50% 由中間五格 (3, 4, 5, 6, 7) 依常態分佈比率進行分配
        // 10 階二項分佈自然權重: 120, 210, 252, 210, 120 (總合 912)
        const midRand = (rand - 0.50) / 0.50; // 正規化至 [0, 1)
        if (midRand < 120 / 912) {
          targetSlot = 3;
        } else if (midRand < (120 + 210) / 912) {
          targetSlot = 4;
        } else if (midRand < (120 + 210 + 252) / 912) {
          targetSlot = 5;
        } else if (midRand < (120 + 210 + 252 + 210) / 912) {
          targetSlot = 6;
        } else {
          targetSlot = 7;
        }
      }

      const decisions = new Array(PLINKO_ROWS).fill(0);
      const indices = Array.from({ length: PLINKO_ROWS }, (_, i) => i).sort(() => Math.random() - 0.5);
      for (let i = 0; i < targetSlot; i++) {
        decisions[indices[i]] = 1;
      }
      return { decisions, targetSlot };
    }

    // 2. 常態落球：落球機率嚴格維持依常態分佈（高爾頓二項分佈，每層嚴格 50% / 50%）
    const decisions: number[] = [];
    let rightCount = 0;
    for (let r = 0; r < PLINKO_ROWS; r++) {
      const d = Math.random() < 0.5 ? 0 : 1;
      decisions.push(d);
      if (d === 1) rightCount++;
    }
    return { decisions, targetSlot: rightCount };
  };

  // Launch a single ball (consumes 1 ball from inventory)
  const dropSingleBall = useCallback(() => {
    if (ballsCountRef.current <= 0) {
      sound.playLoss();
      toastService.warn(`🚨 彈珠庫存不足！請先在上方購買彈珠。`);
      return false;
    }

    // Deduct 1 ball from inventory
    updateBallsCount(ballsCountRef.current - 1);

    sound.playChip();
    dispatchBetAction({ gameId: 'plinko', betType: 'drop', amount: BALL_BASE_PRICE });

    const { decisions, targetSlot } = createBallPath();

    const currentSessionId = autoSessionRef.current.active ? autoSessionRef.current.id : undefined;

    const newBall: PlinkoBall = {
      id: `ball-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 6,
      color: '#ef4444',
      bet: BALL_BASE_PRICE, // Base price is 50
      currentRow: 0,
      pathDecisions: decisions,
      targetSlotIndex: targetSlot,
      state: 'falling',
      createdAt: Date.now(),
      alpha: 1,
      sessionId: currentSessionId,
    };

    if (autoSessionRef.current.active) {
      autoSessionRef.current.totalLaunched += 1;
      autoSessionRef.current.totalBet += BALL_BASE_PRICE;
    }

    setActiveBalls((prev) => [...prev, newBall]);
    return true;
  }, []);

  // Stop auto drop timer safely
  const stopAutoDropTimer = useCallback(() => {
    if (autoIntervalRef.current) {
      clearInterval(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
    setIsAutoDropping(false);
    setRemainingAutoDrops(0);
  }, []);

  // Check and trigger Auto-Drop Summary Toast when all launched balls have landed
  const checkAutoSessionCompletion = useCallback(() => {
    const session = autoSessionRef.current;
    if (
      session.active &&
      !autoIntervalRef.current &&
      session.totalLaunched > 0 &&
      session.totalLanded >= session.totalLaunched
    ) {
      const netProfit = session.totalPayout - session.totalBet;
      const isProfitable = netProfit > 0;
      const avgMultiplier =
        session.totalBet > 0 ? (session.totalPayout / session.totalBet).toFixed(2) : '1.00';

      setWinToast({
        id: `plinko-session-summary-${Date.now()}`,
        title: isProfitable
          ? `🎉 連續投球完成 (${session.totalLanded} 顆)`
          : `🎯 連續投球結算 (${session.totalLanded} 顆)`,
        amount: session.totalPayout,
        netProfit: netProfit,
        multiplier: parseFloat(avgMultiplier),
        subtitle: `總價值 $${session.totalBet.toLocaleString()} • 總回收 $${session.totalPayout.toLocaleString()}`,
        isJackpot: session.totalPayout >= session.totalBet * 3,
      });

      if (isProfitable) {
        sound.playWin();
      }

      autoSessionRef.current = {
        id: '',
        active: false,
        targetCount: 0,
        totalLaunched: 0,
        totalLanded: 0,
        totalBet: 0,
        totalPayout: 0,
      };
      setIsAutoSessionActive(false);
    }
  }, []);

  // Toggle Auto-drop
  const handleToggleAutoDrop = (mode?: 'toggle' | 'all' | 10 | 50) => {
    // If running, any click halts the active session
    if (isAutoDropping) {
      stopAutoDropTimer();
      sound.playClick();
      checkAutoSessionCompletion();
      return;
    }

    if (mode === 'toggle') {
      return;
    }

    if (ballsCountRef.current <= 0) {
      sound.playLoss();
      toastService.warn(`🚨 彈珠庫存不足！請先在上方購買彈珠。`);
      return;
    }

    const requestedTarget = mode === 'all' ? 'all' : (mode ?? 10);
    // Capped strictly at available inventory to prevent exceeding actual balls
    const target = requestedTarget === 'all' ? 'all' : Math.min(requestedTarget, ballsCountRef.current);

    setAutoDropTarget(target);
    setRemainingAutoDrops(typeof target === 'number' ? target : ballsCountRef.current);
    setIsAutoDropping(true);
    setIsAutoSessionActive(true);

    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    autoSessionRef.current = {
      id: sessionId,
      active: true,
      targetCount: target,
      totalLaunched: 0,
      totalLanded: 0,
      totalBet: 0,
      totalPayout: 0,
    };

    // Drop first ball immediately
    const firstDropped = dropSingleBall();
    if (!firstDropped) {
      stopAutoDropTimer();
      setIsAutoDropping(false);
      setIsAutoSessionActive(false);
      return;
    }

    if (typeof target === 'number') {
      setRemainingAutoDrops(target - 1);
    }

    // Interval cadence: 200ms normal / 120ms turbo
    const intervalTime = isTurboMode() ? 120 : 200;
    autoIntervalRef.current = setInterval(() => {
      const activeSession = autoSessionRef.current;
      const targetVal = activeSession.targetCount;

      // Check target count reached
      if (typeof targetVal === 'number' && activeSession.totalLaunched >= targetVal) {
        stopAutoDropTimer();
        checkAutoSessionCompletion();
        return;
      }

      // Check ball inventory sufficiency
      if (ballsCountRef.current <= 0) {
        sound.playLoss();
        toastService.warn('🚨 彈珠已全部投出！');
        stopAutoDropTimer();
        checkAutoSessionCompletion();
        return;
      }

      const dropped = dropSingleBall();
      if (!dropped) {
        stopAutoDropTimer();
        checkAutoSessionCompletion();
        return;
      }

      if (typeof targetVal === 'number') {
        const left = targetVal - activeSession.totalLaunched;
        setRemainingAutoDrops(Math.max(0, left));
        if (left <= 0) {
          stopAutoDropTimer();
          checkAutoSessionCompletion();
        }
      } else {
        setRemainingAutoDrops(ballsCountRef.current);
      }
    }, intervalTime);
  };

  // Ball Landed in Bottom Multiplier Bin
  const handleBallLanded = useCallback(
    (ball: PlinkoBall, slotIndex: number) => {
      // Guard strictly against any duplicate landing events for the same ball ID
      if (landedBallIdsRef.current.has(ball.id)) {
        return;
      }
      landedBallIdsRef.current.add(ball.id);

      const multiplier = PLINKO_MULTIPLIERS[slotIndex] ?? 1;
      const payout = Math.round(BALL_BASE_PRICE * multiplier);

      // Sound & Highlight Slot
      if (multiplier >= 2.5) {
        dropsSinceBigWinRef.current = 0;
      } else {
        dropsSinceBigWinRef.current += 1;
      }

      if (multiplier >= 7) {
        sound.playBigWin();
      } else if (multiplier >= 1) {
        sound.playWin();
      } else {
        sound.playPlinkoSlot(multiplier);
      }

      setActiveSlotHighlight(slotIndex);
      setTimeout(() => {
        setActiveSlotHighlight(null);
      }, 450);

      // Check house bonus if profit is made (multiplier > 1)
      let finalPayout = payout;
      let bonusWon = 0;
      if (multiplier > 1) {
        const bonus = checkHouseBonus(BALL_BASE_PRICE);
        if (bonus.triggered) {
          bonusWon = bonus.bonusAmount;
          finalPayout += bonusWon;
          notifyHouseBonus(bonus, '彈珠台');
        }
      }

      // Update Balance with won chips!
      const updatedBal = balanceRef.current + finalPayout;
      balanceRef.current = updatedBal;
      onUpdateBalance(updatedBal);

      // Track in Auto Drop Session if active and ball belongs strictly to this session
      const isCurrentAutoSessionBall =
        autoSessionRef.current.active &&
        !!ball.sessionId &&
        ball.sessionId === autoSessionRef.current.id;

      if (isCurrentAutoSessionBall) {
        autoSessionRef.current.totalLanded += 1;
        autoSessionRef.current.totalPayout += finalPayout;
      }

      // Show individual Win Toast only if NOT part of an auto-drop session
      if (!isCurrentAutoSessionBall && !isAutoDropping) {
        setWinToast({
          id: `plinko-toast-${Date.now()}`,
          title:
            multiplier >= 100
              ? '🎯 彈珠台 100x 終極大獎！'
              : multiplier >= 7
              ? `🎯 彈珠台 ${multiplier}x 高額倍率中獎！`
              : multiplier >= 1
              ? '🎯 彈珠台 獲利回本！'
              : '🎯 彈珠台 落入分牌槽',
          amount: finalPayout,
          extraBonusAmount: bonusWon > 0 ? bonusWon : undefined,
          multiplier,
          subtitle: `彈珠 (基本價$50) × ${multiplier}x = 獲得 $${finalPayout.toLocaleString()}${bonusWon > 0 ? ` (含莊家加碼 +$${bonusWon.toLocaleString()})` : ''}`,
          isJackpot: multiplier >= 7,
        });
      }

      // Update History Tape
      const histItem: PlinkoHistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        bet: BALL_BASE_PRICE,
        multiplier,
        payout: finalPayout,
        slotIndex,
      };
      setHistory((prev) => [histItem, ...prev.slice(0, 14)]);

      // Update Stats
      setStats((prev) => ({
        totalDrops: prev.totalDrops + 1,
        totalWagered: prev.totalWagered + BALL_BASE_PRICE,
        totalWon: prev.totalWon + finalPayout,
        maxMultiplier: Math.max(prev.maxMultiplier, multiplier),
        wins: prev.wins + (multiplier >= 1 ? 1 : 0),
      }));

      // Record Global Career Round
      recordCareerRound({
        gameId: 'plinko',
        betAmount: BALL_BASE_PRICE,
        winAmount: finalPayout,
        multiplier,
      });

      // Check Hidden Collectibles Silently
      if (multiplier >= 100) {
        unlockHiddenCollectible('col-plinko-100x');
      }
      if (multiplier >= 25) {
        unlockHiddenCollectible('col-plinko-wing');
      }
      if (finalPayout >= 5000) {
        unlockHiddenCollectible('col-plinko-jackpot');
      }
      if (multiplier >= 5 && multiplier <= 15) {
        unlockHiddenCollectible('col-plinko-triple-hit');
      }
      if (stats.totalDrops >= 49) {
        unlockHiddenCollectible('col-plinko-veteran');
      }

      // Remove from active balls
      setActiveBalls((prev) => prev.filter((b) => b.id !== ball.id));

      // Check if this was the last ball of the auto-drop session
      checkAutoSessionCompletion();
    },
    [isAutoDropping, onUpdateBalance, checkAutoSessionCompletion, stats.totalDrops]
  );

  const handleResetStats = () => {
    const emptyStats: PlinkoStats = {
      totalDrops: 0,
      totalWagered: 0,
      totalWon: 0,
      maxMultiplier: 0,
      wins: 0,
    };
    setStats(emptyStats);
    setHistory([]);
    localStorage.removeItem(STORAGE_KEYS.STATS);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  };

  // Keyboard shortcut Space to drop ball
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        if (!isAutoDropping && !isAutoSessionActive) {
          dropSingleBall();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropSingleBall, isAutoDropping, isAutoSessionActive]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
      }
    };
  }, []);

  const hasBalls = ballsCount > 0;

  return (
    <div
      id="plinko-game-container"
      className="relative w-full h-full flex flex-col lg:flex-row gap-2 sm:gap-2.5 p-1.5 sm:p-2 bg-[#0a0c12] select-none overflow-hidden"
    >
      {/* Toast Aura Indicator */}
      <ToastAuraIndicator />

      {/* Win Toast Notification */}
      {winToast && <WinToast data={winToast} onClose={() => setWinToast(null)} />}

      {/* LEFT COLUMN: Canvas & Symmetrical Bottom Multipliers (Full height & width on mobile/tablet, flex-1 on desktop) */}
      <div className="w-full lg:flex-1 h-full min-h-0 flex flex-col justify-between items-center bg-stone-950/70 rounded-2xl border-2 border-stone-800/80 p-1.5 sm:p-2 shadow-2xl relative min-w-0 overflow-hidden">
        {/* 1. TOP STATS / RECENT HITS TAPE */}
        <div className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 bg-stone-900/80 rounded-xl border border-stone-800/80 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-[11px] sm:text-xs font-bold text-stone-300">近期落點:</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none max-w-[75%] touch-pan-x">
            {history.length === 0 ? (
              <span className="text-[10px] sm:text-[11px] text-stone-500 italic">尚未投球</span>
            ) : (
              history.map((item) => {
                const isJackpot = item.multiplier >= 100;
                const isHigh = item.multiplier >= 7 && item.multiplier < 100;
                const isMid = item.multiplier >= 0.7 && item.multiplier < 7;

                return (
                  <div
                    key={item.id}
                    className={`px-1.5 sm:px-2 py-0.5 h-5.5 sm:h-6.5 flex items-center justify-center rounded-lg text-[10px] sm:text-xs font-mono font-black shrink-0 transition-all border ${
                      isJackpot
                        ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] animate-pulse scale-105'
                        : isHigh
                        ? 'bg-amber-900/90 text-amber-200 border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                        : isMid
                        ? 'bg-stone-900 text-stone-200 border-stone-800'
                        : 'bg-stone-950 text-stone-400 border-stone-900'
                    }`}
                  >
                    {item.multiplier}x
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. PLINKO 10-ROW PYRAMID CANVAS (Maximizes available space) */}
        <div className="flex-1 w-full relative min-h-0 overflow-hidden flex items-center justify-center my-0.5 sm:my-1">
          <PlinkoCanvas
            balls={activeBalls}
            onBallLanded={handleBallLanded}
            activeSlotHighlight={activeSlotHighlight}
          />
        </div>

        {/* 3. BOTTOM MULTIPLIER BINS (11 Symmetrical Slots in 11-column Grid matching Canvas 100%) */}
        <div className="w-full grid grid-cols-11 gap-0 px-0 pt-0.5 sm:pt-1 pb-0.5 z-10 shrink-0">
          {PLINKO_MULTIPLIERS.map((m, idx) => {
            const isHit = activeSlotHighlight === idx;
            const isJackpot = m >= 100;
            const isHigh = m >= 7 && m < 100;
            const isMid = m >= 0.7 && m < 7;

            return (
              <div
                key={`slot-${idx}-${m}`}
                className="w-full px-[0.5px] sm:px-[1.5px] flex items-center justify-center"
              >
                <div
                  className={`w-full flex flex-col items-center justify-center py-1 sm:py-2 rounded-md sm:rounded-lg border transition-all duration-150 select-none ${
                    isHit
                      ? 'scale-105 sm:scale-110 -translate-y-0.5 sm:-translate-y-1 shadow-[0_0_16px_rgba(255,255,255,0.95)] bg-gradient-to-t from-amber-400 to-white text-stone-950 font-black border-white ring-1 sm:ring-2 ring-amber-300'
                      : isJackpot
                      ? 'bg-gradient-to-t from-rose-950 via-rose-900 to-red-600/90 text-rose-100 border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.4)] font-black animate-pulse'
                      : isHigh
                      ? 'bg-gradient-to-t from-amber-950 via-amber-900 to-amber-600/90 text-amber-100 border-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.3)] font-black'
                      : isMid
                      ? 'bg-gradient-to-t from-stone-900 via-stone-800 to-stone-700/90 text-stone-200 border-stone-700/80 font-bold'
                      : 'bg-gradient-to-t from-slate-950 via-slate-900 to-slate-800 text-slate-300 border-slate-700/60 font-semibold'
                  }`}
                >
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs md:text-sm font-mono font-black tracking-tighter sm:tracking-tight leading-none">
                    {m}x
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. COMPACT MOBILE & TABLET BOTTOM QUICK ACTION DOCK (收納式下注欄 - 手機與平板專屬) */}
        <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 px-2 py-1.5 mt-1 bg-stone-900/95 rounded-xl border border-stone-800/90 shadow-xl shrink-0 lg:hidden">
          {/* Left: Ball Counter Badge + Quick +10 */}
          <div className="flex items-center gap-1.5 bg-stone-950/90 px-2 sm:px-2.5 py-1.5 rounded-lg border border-stone-800 shrink-0">
            <CircleDot className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="flex items-baseline gap-1">
              <span className="font-mono font-black text-amber-400 text-sm sm:text-base leading-none">
                {ballsCount}
              </span>
              <span className="text-[10px] text-stone-400">顆</span>
            </div>
            <button
              onClick={() => {
                sound.playChip();
                const pkg10 = BALL_PACKAGES[0];
                if (balance >= pkg10.cost) {
                  handleBuyBalls(pkg10);
                } else {
                  setIsDrawerOpen(true);
                }
              }}
              className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 touch-manipulation active:scale-95"
              title="快速購買 10 顆彈珠 ($500)"
            >
              +10
            </button>
          </div>

          {/* Center: Main Launch / Drop Button */}
          <button
            id="btn-mobile-drop-ball"
            disabled={!hasBalls && !isAutoDropping}
            onClick={() => {
              if (isAutoDropping) {
                handleToggleAutoDrop('toggle');
              } else if (hasBalls) {
                dropSingleBall();
              } else {
                setIsDrawerOpen(true);
              }
            }}
            className={`flex-1 min-h-[44px] px-2 sm:px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 shadow-lg touch-manipulation active:scale-95 ${
              isAutoDropping
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white animate-pulse border border-rose-400'
                : hasBalls
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-stone-800 text-stone-400 border border-stone-700'
            }`}
          >
            {isAutoDropping ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>停止連投 ({remainingAutoDrops})</span>
              </>
            ) : hasBalls ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>投擲彈珠</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>點此購球</span>
              </>
            )}
          </button>

          {/* Right: Drawer Menu Trigger Button */}
          <button
            id="btn-toggle-plinko-drawer"
            onClick={() => {
              sound.playClick();
              setIsDrawerOpen((prev) => !prev);
            }}
            className={`px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 touch-manipulation active:scale-95 shrink-0 ${
              isAutoSessionActive
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/80 ring-1 ring-amber-400/50'
                : 'bg-stone-950 text-stone-200 border-stone-700 hover:border-amber-500/50'
            }`}
            title="開啟下注與商城收納式選單"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden min-[360px]:inline">下注選單</span>
            <ChevronUp className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN: Controls Panel on Desktop (Can be toggled / collapsed as well) */}
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
              className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700/60 cursor-pointer shadow-md"
              title="收起控制面板以最大化彈珠台畫面"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
            <PlinkoControls
              balance={balance}
              ballsCount={ballsCount}
              onBuyBalls={handleBuyBalls}
              onDropBall={dropSingleBall}
              isAutoDropping={isAutoDropping}
              isAutoSessionActive={isAutoSessionActive}
              onToggleAutoDrop={handleToggleAutoDrop}
              autoDropTarget={autoDropTarget}
              remainingAutoDrops={remainingAutoDrops}
              stats={stats}
              onResetStats={handleResetStats}
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
                    彈珠下注與商城選單
                  </h3>
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
            <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3">
              <PlinkoControls
                balance={balance}
                ballsCount={ballsCount}
                onBuyBalls={handleBuyBalls}
                onDropBall={() => {
                  dropSingleBall();
                }}
                isAutoDropping={isAutoDropping}
                isAutoSessionActive={isAutoSessionActive}
                onToggleAutoDrop={handleToggleAutoDrop}
                autoDropTarget={autoDropTarget}
                remainingAutoDrops={remainingAutoDrops}
                stats={stats}
                onResetStats={handleResetStats}
                onClose={() => setIsDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
