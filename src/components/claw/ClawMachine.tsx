import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import {
  addRedeemableItem,
  getRandomClawVoucher,
  addPlayerLuckyCharms,
  getPlayerLuckyCharms,
  unlockHiddenCollectible,
} from '../../utils/inventory';
import { RedeemableItem } from '../../types/inventory';
import {
  Sparkles,
  Zap,
  ArrowLeft,
  ArrowRight,
  Gift,
  Gamepad2,
  Package,
  Coins,
  Crosshair,
} from 'lucide-react';

interface ClawMachineProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onNavigateToLobby: () => void;
  soundEnabled?: boolean;
  onRoundBusyChange?: (isBusy: boolean, currentBet?: number) => void;
}

const COST_PER_PLAY = 100;

// Drop Chute Location: Left side (X = 10%)
// Chute occupies left 2% to 18% (width 16%), exact horizontal center is 10%
const CHUTE_CENTER_X = 10;
const CHUTE_BOUNDARY_X = 18;
const MIN_CLAW_X = 10;
const MAX_CLAW_X = 90;

// 2D Toy Item definition (Flat Orthographic with natural scattered offsets & tilts)
export interface ToyItem2D {
  id: string;
  name: string;
  icon: string;
  x: number; // Cabinet horizontal position %
  y: number; // Cabinet vertical surface position %
  rotation?: number; // Tilt angle in degrees (-28deg ~ +28deg)
  scale?: number; // Slight size variation (0.92 ~ 1.08)
  color: string;
  hitRadius: number; // Effective collision radius in %
}

const TOY_TEMPLATES = [
  { name: '幸運金柴犬', icon: '🐕', color: 'from-amber-400 to-amber-600' },
  { name: '招財粉紅豬', icon: '🐷', color: 'from-pink-400 to-pink-600' },
  { name: '冰原金冠企鵝', icon: '🐧', color: 'from-sky-400 to-indigo-600' },
  { name: '夢幻星彩獨角獸', icon: '🦄', color: 'from-purple-400 to-pink-500' },
  { name: '英倫泰迪熊', icon: '🧸', color: 'from-amber-600 to-amber-800' },
  { name: '開運福氣金貓', icon: '🐱', color: 'from-yellow-400 to-amber-500' },
  { name: '璀璨水晶兔', icon: '🐰', color: 'from-rose-400 to-rose-600' },
  { name: '黑白太空熊貓', icon: '🐼', color: 'from-stone-300 to-stone-600' },
  { name: '仙境魔法九尾狐', icon: '🦊', color: 'from-orange-400 to-red-600' },
  { name: '招財翡翠蛙', icon: '🐸', color: 'from-emerald-400 to-emerald-600' },
  { name: '幽冥星辰小精靈', icon: '👻', color: 'from-indigo-300 to-purple-500' },
  { name: '帝皇尊爵金扭蛋', icon: '🔮', color: 'from-yellow-300 to-amber-500' },
  { name: '甜心粉紅熊', icon: '🐻', color: 'from-pink-300 to-rose-500' },
  { name: '神秘紫晶貓頭鷹', icon: '🦉', color: 'from-indigo-400 to-indigo-700' },
  { name: '陽光黃金小鴨', icon: '🐥', color: 'from-yellow-300 to-orange-400' },
  { name: '神聖祥瑞青龍', icon: '🐲', color: 'from-emerald-400 to-teal-700' },
  { name: '萌萌呆水豚', icon: '🦫', color: 'from-amber-700 to-stone-800' },
  { name: '極光小海豹', icon: '🦭', color: 'from-sky-300 to-blue-500' },
  { name: '元氣金毛幼犬', icon: '🐶', color: 'from-yellow-400 to-amber-600' },
  { name: '幸運草小羊駝', icon: '🦙', color: 'from-lime-400 to-emerald-600' },
  { name: '深海七彩海豚', icon: '🐬', color: 'from-cyan-400 to-blue-600' },
  { name: '王者黃金雄獅', icon: '🦁', color: 'from-amber-500 to-red-600' },
  { name: '頑皮松鼠小花', icon: '🐿️', color: 'from-orange-400 to-amber-700' },
  { name: '開運福祿錦鯉', icon: '🐟', color: 'from-rose-500 to-amber-500' },
];

// Generate 32 naturally scattered, lively plushies in organic clusters across the cabinet playfield
function generateInitial2DToys(): ToyItem2D[] {
  const list: ToyItem2D[] = [];

  // Define 32 organic scatter anchor points with built-in slight offsets, varied heights, tilts, and scales
  const rawAnchors = [
    // Top-Back Layer (y: 57% ~ 64%) - Stacked higher behind
    { x: 25, y: 60, rot: -14, scale: 0.95 },
    { x: 33, y: 58, rot: 18, scale: 0.94 },
    { x: 41, y: 61, rot: -8, scale: 0.96 },
    { x: 49, y: 57, rot: 22, scale: 0.93 },
    { x: 57, y: 59, rot: -16, scale: 0.95 },
    { x: 65, y: 58, rot: 12, scale: 0.94 },
    { x: 73, y: 61, rot: -20, scale: 0.96 },
    { x: 81, y: 58, rot: 15, scale: 0.93 },
    { x: 89, y: 60, rot: -10, scale: 0.95 },

    // Middle-Upper Layer (y: 66% ~ 72%) - Naturally staggered
    { x: 23, y: 69, rot: 16, scale: 0.98 },
    { x: 30, y: 67, rot: -22, scale: 1.0 },
    { x: 38, y: 70, rot: 8, scale: 0.97 },
    { x: 46, y: 66, rot: -15, scale: 1.02 },
    { x: 54, y: 71, rot: 19, scale: 0.98 },
    { x: 62, y: 67, rot: -12, scale: 1.01 },
    { x: 70, y: 70, rot: 24, scale: 0.97 },
    { x: 78, y: 66, rot: -18, scale: 1.02 },
    { x: 86, y: 69, rot: 14, scale: 0.99 },

    // Middle-Lower Layer (y: 74% ~ 79%) - Interlocking cluster
    { x: 27, y: 76, rot: -10, scale: 1.02 },
    { x: 35, y: 78, rot: 15, scale: 1.0 },
    { x: 43, y: 75, rot: -20, scale: 1.04 },
    { x: 51, y: 78, rot: 12, scale: 1.01 },
    { x: 59, y: 74, rot: -14, scale: 1.03 },
    { x: 67, y: 78, rot: 18, scale: 1.0 },
    { x: 75, y: 75, rot: -16, scale: 1.04 },
    { x: 83, y: 78, rot: 21, scale: 1.01 },
    { x: 91, y: 75, rot: -8, scale: 1.02 },

    // Front Floor Layer (y: 81% ~ 85%) - Resting at the front edge
    { x: 24, y: 84, rot: 22, scale: 1.05 },
    { x: 33, y: 83, rot: -18, scale: 1.04 },
    { x: 45, y: 84, rot: 16, scale: 1.06 },
    { x: 57, y: 83, rot: -24, scale: 1.05 },
    { x: 69, y: 84, rot: 14, scale: 1.06 },
    { x: 80, y: 83, rot: -12, scale: 1.05 },
    { x: 88, y: 84, rot: 20, scale: 1.04 },
  ];

  rawAnchors.forEach((pt, idx) => {
    const tpl = TOY_TEMPLATES[idx % TOY_TEMPLATES.length];
    // Add micro jitter to make every reload look organic
    const jitterX = (Math.sin(idx * 4.3) * 1.6);
    const jitterY = (Math.cos(idx * 3.1) * 1.2);
    list.push({
      id: `toy-scatter-${idx}-${Date.now()}`,
      name: tpl.name,
      icon: tpl.icon,
      x: Number((pt.x + jitterX).toFixed(1)),
      y: Number((pt.y + jitterY).toFixed(1)),
      rotation: pt.rot,
      scale: pt.scale,
      color: tpl.color,
      hitRadius: 4.6,
    });
  });

  return list;
}

function generateSingleReplacementToy(index: number): ToyItem2D {
  const tpl = TOY_TEMPLATES[Math.floor(Math.random() * TOY_TEMPLATES.length)];
  const randomX = 24 + Math.random() * 66;
  const randomY = 58 + Math.random() * 26;
  return {
    id: `toy-restock-${Date.now()}-${index}`,
    name: tpl.name,
    icon: tpl.icon,
    x: Number(randomX.toFixed(1)),
    y: Number(randomY.toFixed(1)),
    rotation: Math.round(Math.random() * 46 - 23),
    scale: Number((0.95 + Math.random() * 0.1).toFixed(2)),
    color: tpl.color,
    hitRadius: 4.6,
  };
}

export const ClawMachine: React.FC<ClawMachineProps> = ({
  balance,
  onUpdateBalance,
  onNavigateToLobby,
  onRoundBusyChange,
}) => {
  // Coin-First Activation State
  const [isCoinInserted, setIsCoinInserted] = useState<boolean>(false);

  // Initial Claw Position: Exactly above the left drop chute (CHUTE_CENTER_X = 13%)
  const [clawX, setClawX] = useState<number>(CHUTE_CENTER_X);

  // Animation flag & state
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Sync busy state with parent
  useEffect(() => {
    const isBusy = isAnimating || isCoinInserted;
    onRoundBusyChange?.(isBusy, isCoinInserted ? COST_PER_PLAY : 0);
  }, [isAnimating, isCoinInserted, onRoundBusyChange]);

  // Dynamic Glass Cabinet DOM reference and live measured height for responsive claw drop
  const cabinetRef = useRef<HTMLDivElement>(null);
  const [cabinetHeight, setCabinetHeight] = useState<number>(480);

  // Live Linear vertical cable length in exact pixels (12px = retracted at top)
  const [cableLengthPx, setCableLengthPx] = useState<number>(12);
  
  // STRICT CLAW OPEN/CLOSED STATE
  // .claw-closed: Left & Right prongs closed / vertical grip (0 deg)
  // .claw-open: Left & Right prongs flared outward wide (35 deg)
  const [isClawClosed, setIsClawClosed] = useState<boolean>(true);
  const [heldToy, setHeldToy] = useState<ToyItem2D | null>(null);

  // Slipping / Dropping Animation variables
  const [cinematicDrop, setCinematicDrop] = useState<{
    toy: ToyItem2D;
    x: number;
    variation: 'plunge' | 'spiral' | 'tease';
  } | null>(null);
  const [droppingToy, setDroppingToy] = useState<ToyItem2D | null>(null);
  const [chuteGlow, setChuteGlow] = useState<boolean>(false);

  // 2D Toys array
  const [toys, setToys] = useState<ToyItem2D[]>(() => generateInitial2DToys());

  // Result message
  const [resultMessage, setResultMessage] = useState<string>(
    '請點擊「投幣 ($100)」啟動機台'
  );
  const [, setLastWonVoucher] = useState<RedeemableItem | null>(null);

  // Storage Keys
  const STORAGE_KEY_CLAW_STATS = 'casino_claw_stats_v1';
  const STORAGE_KEY_CLAW_HISTORY = 'casino_claw_history_v1';

  // Statistics
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('casino_claw_stats_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      plays: 0,
      wins: 0,
      misses: 0,
      totalValueWon: 0,
    };
  });

  // Detailed History
  const [history, setHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('casino_claw_history_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // Player Lucky Charms state
  const [luckyCharms, setLuckyCharms] = useState<number>(() => getPlayerLuckyCharms());

  useEffect(() => {
    const handleSync = () => setLuckyCharms(getPlayerLuckyCharms());
    window.addEventListener('casino_inventory_changed', handleSync);
    return () => window.removeEventListener('casino_inventory_changed', handleSync);
  }, []);

  // Save Stats & History
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLAW_STATS, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLAW_HISTORY, JSON.stringify(history));
  }, [history]);

  // Listen to global reset
  useEffect(() => {
    const handleFullReset = () => {
      setStats({ plays: 0, wins: 0, misses: 0, totalValueWon: 0 });
      setHistory([]);
    };
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => window.removeEventListener('casino_full_reset', handleFullReset);
  }, []);

  const isBusy = isAnimating;
  const canControl = isCoinInserted && !isBusy;
  const isOperatingRef = useRef<boolean>(false);

  // =========================================================================
  // CONTINUOUS 60FPS VECTOR TRANSLATION ENGINE (requestAnimationFrame)
  // Total span from Min (13%) to Max (88%) = 75% in EXACTLY 3.0 seconds (3000ms)
  // Velocity = 75% / 3000ms = 0.025% per millisecond (25% per second)
  // =========================================================================
  const TOTAL_DISTANCE = MAX_CLAW_X - MIN_CLAW_X; // 75%
  const SPEED_PER_MS = TOTAL_DISTANCE / 3000; // 0.025 %/ms

  const vxRef = useRef<number>(0); // Velocity direction: -1 (left), 0 (stopped), +1 (right)
  const animMoveFrameRef = useRef<number | null>(null);
  const lastMoveTimestampRef = useRef<number | null>(null);
  const clawXRef = useRef<number>(CHUTE_CENTER_X);
  const moveStartPosRef = useRef<number>(CHUTE_CENTER_X);

  // Sync ref with state
  useEffect(() => {
    clawXRef.current = clawX;
  }, [clawX]);

  // Responsive ResizeObserver: continuously track glass cabinet height for 100% accurate drop depth
  useEffect(() => {
    if (!cabinetRef.current) return;
    const el = cabinetRef.current;
    const updateDimensions = () => {
      if (el) {
        setCabinetHeight(el.clientHeight || 480);
      }
    };
    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    window.addEventListener('resize', updateDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const updateSmoothPosition = useCallback((timestamp: number) => {
    if (vxRef.current === 0) {
      lastMoveTimestampRef.current = null;
      animMoveFrameRef.current = null;
      return;
    }

    if (lastMoveTimestampRef.current !== null) {
      const deltaMs = Math.min(100, timestamp - lastMoveTimestampRef.current);
      const moveDelta = vxRef.current * SPEED_PER_MS * deltaMs;
      const nextX = Math.max(MIN_CLAW_X, Math.min(MAX_CLAW_X, clawXRef.current + moveDelta));
      clawXRef.current = nextX;
      setClawX(nextX);
    }

    lastMoveTimestampRef.current = timestamp;
    if (vxRef.current !== 0) {
      animMoveFrameRef.current = requestAnimationFrame(updateSmoothPosition);
    }
  }, [SPEED_PER_MS]);

  // Arcade Joystick Direction State ('neutral' | 'left' | 'right')
  const [joystickDir, setJoystickDir] = useState<'neutral' | 'left' | 'right'>('neutral');

  const startMoving = useCallback(
    (direction: number) => {
      if (!isCoinInserted || isOperatingRef.current || isAnimating) return;
      if (vxRef.current !== direction) {
        sound.playClick();
      }
      setJoystickDir(direction < 0 ? 'left' : 'right');
      vxRef.current = direction;
      moveStartPosRef.current = clawXRef.current;
      lastMoveTimestampRef.current = null;
      if (animMoveFrameRef.current) cancelAnimationFrame(animMoveFrameRef.current);
      animMoveFrameRef.current = requestAnimationFrame(updateSmoothPosition);
    },
    [isCoinInserted, isAnimating, updateSmoothPosition]
  );

  const stopMoving = useCallback(() => {
    const prevVx = vxRef.current;
    vxRef.current = 0;
    setJoystickDir('neutral');
    lastMoveTimestampRef.current = null;
    if (animMoveFrameRef.current) {
      cancelAnimationFrame(animMoveFrameRef.current);
      animMoveFrameRef.current = null;
    }
    // If it was a quick tap (moved less than 1.0%), nudge by 1.5% so clicks feel responsive
    if (prevVx !== 0) {
      const movedDist = Math.abs(clawXRef.current - moveStartPosRef.current);
      if (movedDist < 1.0) {
        const nudgedX = Math.max(MIN_CLAW_X, Math.min(MAX_CLAW_X, clawXRef.current + prevVx * 1.5));
        clawXRef.current = nudgedX;
        setClawX(nudgedX);
      }
    }
  }, []);

  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingJoystickRef = useRef(false);

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canControl) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    isDraggingJoystickRef.current = true;
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingJoystickRef.current || !joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const dx = e.clientX - centerX;

    if (Math.abs(dx) < 6) {
      stopMoving();
      setJoystickDir('neutral');
      return;
    }

    if (dx < 0) {
      startMoving(-1);
    } else {
      startMoving(1);
    }
  };

  const handleJoystickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingJoystickRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    stopMoving();
  };

  // Global safety listener for pointer release
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (vxRef.current !== 0) {
        stopMoving();
      }
    };
    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      if (animMoveFrameRef.current) cancelAnimationFrame(animMoveFrameRef.current);
    };
  }, [stopMoving]);

  // Collision detection: Check if clawX hits any toy's hitbox
  const findCollidedToy = useCallback(() => {
    const currentX = clawXRef.current;
    if (currentX <= CHUTE_BOUNDARY_X) return null; // Over chute area

    const candidates = toys.filter((t) => Math.abs(t.x - currentX) <= t.hitRadius);
    if (candidates.length === 0) return null;

    // Pick closest or topmost (smallest y)
    candidates.sort((a, b) => a.y - b.y);
    return candidates[0];
  }, [toys]);

  // Helper function for async timeline pauses
  const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // 1. INSERT COIN ACTION
  const handleInsertCoin = useCallback(() => {
    if (isBusy || isCoinInserted) return;

    if (balance < COST_PER_PLAY) {
      sound.playLoss();
      toastService.warn('籌碼餘額不足 $100，請先至大廳櫃台兌現或在各遊戲獲取！');
      return;
    }

    sound.playChip();
    sound.playCoinPayout();
    onRoundBusyChange?.(true, COST_PER_PLAY);
    onUpdateBalance(balance - COST_PER_PLAY);
    dispatchBetAction({ gameId: 'claw', betType: 'coin', amount: COST_PER_PLAY });
    setIsCoinInserted(true);
    setResultMessage('機台已啟動，請移動爪子瞄準目標後按下「下爪」！');
  }, [isBusy, isCoinInserted, balance, onUpdateBalance]);

  // 2. DROP CLAW ACTION - Strict State Machine Timeline
  const handleDropClaw = useCallback(async () => {
    if (!isCoinInserted || isBusy || isOperatingRef.current) return;

    // Mark as operating & disable all controls immediately
    isOperatingRef.current = true;
    setIsAnimating(true);
    stopMoving();

    setStats((prev) => ({ ...prev, plays: prev.plays + 1 }));
    recordCareerRound({
      gameId: 'claw',
      betAmount: COST_PER_PLAY,
      winAmount: 0,
    });
    setLastWonVoucher(null);
    setChuteGlow(false);
    setCinematicDrop(null);

    const isDirectDropOnChute = clawXRef.current <= CHUTE_BOUNDARY_X;
    const targetToy = findCollidedToy();
    const dropStartX = clawXRef.current;

    // Dynamic drop depth calculation based on live measured cabinet container dimensions:
    const currentCabinetH = cabinetRef.current?.clientHeight || cabinetHeight || 480;
    // Floor level cable length: touches bottom shelf (shelf height is 24px, refined claw assembly is ~86px, top rail anchor is ~24px)
    const maxFloorCablePx = Math.max(50, currentCabinetH - 128);

    let targetCablePx = maxFloorCablePx;
    if (targetToy && !isDirectDropOnChute) {
      // Toys are distributed in the bottom stage base (which occupies h-[68%] of the cabinet)
      const stageBaseTopPx = currentCabinetH * 0.32;
      const stageBaseHeightPx = currentCabinetH * 0.68;
      const toyCenterYPx = stageBaseTopPx + stageBaseHeightPx * (targetToy.y / 100);
      // To grip the toy with prongs enveloping the prize:
      const toyGripCablePx = toyCenterYPx - 88;
      targetCablePx = Math.max(40, Math.min(maxFloorCablePx, toyGripCablePx));
    }

    // Distance-based transport success calculation:
    // Distance from chute (range ~ 0 to 80).
    // Close to chute (X ~ 25): base success ~ 58% (drop chance ~ 42%)
    // Far from chute (X ~ 90): success ~ 42% (drop chance ~ 58%, slightly higher drop chance as distance increases)
    const distFromChute = Math.max(0, dropStartX - CHUTE_CENTER_X);
    const maxDist = MAX_CLAW_X - CHUTE_CENTER_X; // ~ 75
    const distRatio = Math.min(1, distFromChute / Math.max(1, maxDist));
    // Success rate slightly decreases with distance: from 0.58 down to 0.42 (a slight, fair drop boost)
    const successRate = 0.58 - distRatio * 0.16;
    const willSucceedTransport = Math.random() < successRate;

    // =========================================================================
    // STEP 1: [頂部開爪 0.5 秒]
    // 狀態瞬間切換為 .claw-open (向外張開 35 度)，停頓 0.5 秒
    // =========================================================================
    setIsClawClosed(false);
    setHeldToy(null);
    setCableLengthPx(12);
    setResultMessage('爪子張開瞄準中...');
    await waitMs(500);

    // =========================================================================
    // STEP 2: [平滑下沉 1.0 秒]
    // 保持 .claw-open (張開)，鋼索平滑向下延伸至檯面物品處 (動態適配當前容器高度)
    // =========================================================================
    setResultMessage(
      isDirectDropOnChute
        ? '爪子探向落物洞口...'
        : targetToy
        ? `爪子探向【${targetToy.name}】...`
        : '爪子探底中...'
    );

    // 1000ms duration linear descending animation (maintains .claw-open)
    await new Promise<void>((resolve) => {
      const startTime = performance.now();
      const duration = 1000;
      const initialCable = 12;
      const deltaCable = targetCablePx - initialCable;
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        setCableLengthPx(initialCable + progress * deltaCable);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setCableLengthPx(targetCablePx);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    // =========================================================================
    // STEP 3: [觸底抓取 0.5 秒]
    // 探底或碰到物品時，狀態瞬間切換為 .claw-closed (閉合)，停頓 0.5 秒包覆物品
    // =========================================================================
    setIsClawClosed(true);

    if (targetToy && !isDirectDropOnChute) {
      setHeldToy(targetToy);
      setResultMessage(`雙爪已抓取【${targetToy.name}】！`);
    } else {
      setHeldToy(null);
      setResultMessage('爪子閉合抓取');
    }
    await waitMs(500);

    // =========================================================================
    // STEP 4: [上升回程 1.0 秒]
    // 保持 .claw-closed (閉合)，鋼索收回升至頂部
    // =========================================================================
    setIsClawClosed(true);
    setResultMessage('爪子升回頂部中...');

    // 1000ms duration linear ascending animation (maintains .claw-closed)
    await new Promise<void>((resolve) => {
      const startTime = performance.now();
      const duration = 1000;
      const initialCable = 12;
      const deltaCable = targetCablePx - initialCable;
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        setCableLengthPx(targetCablePx - progress * deltaCable);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setCableLengthPx(12);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    // =========================================================================
    // STEP 5: [橫移回洞口]
    // 【全程嚴格保持 .claw-closed (閉合)】！
    // 即使觸發中途掉落（物品消失/掉落特寫），爪子也絕對不變更狀態，繼續握緊橫移！
    // =========================================================================
    setIsClawClosed(true); // STRICT: Stays closed
    let isHoldingToy = Boolean(targetToy && !isDirectDropOnChute);
    const shouldSlip = isHoldingToy && !willSucceedTransport;

    setResultMessage(
      isHoldingToy && targetToy
        ? `夾持【${targetToy.name}】返回洞口中...`
        : '返回洞口中...'
    );

    if (shouldSlip) {
      // 5A: Move to 50% midpoint
      const midX = dropStartX + (CHUTE_CENTER_X - dropStartX) * 0.5;
      const leg1Duration = Math.max(150, (Math.abs(dropStartX - midX) / (MAX_CLAW_X - MIN_CLAW_X)) * 3000);

      await new Promise<void>((resolve) => {
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / leg1Duration);
          const currentX = dropStartX + (midX - dropStartX) * progress;
          setClawX(currentX);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setClawX(midX);
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

      // 5B: PAUSE GANTRY & TRIGGER CINEMATIC DROP FX FOR EXACTLY 2.0s
      // Toy slips from grip, BUT claw itself STAYS STRICTLY CLOSED (.claw-closed)
      isHoldingToy = false;
      setHeldToy(null);
      setIsClawClosed(true); // STRICT: MUST REMAIN CLOSED
      sound.playDropFail();
      setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      setHistory((prev) => [
        {
          id: `claw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          cost: COST_PER_PLAY,
          isWin: false,
          toyName: targetToy?.name,
          prizeValue: 0,
          resultTitle: `💦 中途滑落【${targetToy?.name || '公仔'}】`,
          resultDetail: '抓力未達極限，公仔於半空中滑脫',
        },
        ...prev.slice(0, 49),
      ]);
      setResultMessage(`抓力不足！【${targetToy!.name}】滑落了！`);

      // Pick a random drop animation variation
      const variations: Array<'plunge' | 'spiral' | 'tease'> = ['plunge', 'spiral', 'tease'];
      const chosenVariation = variations[Math.floor(Math.random() * variations.length)];

      // Trigger Cinematic Drop View with Manga Vertical Speedlines & Falling Animation
      setCinematicDrop({
        toy: targetToy!,
        x: midX,
        variation: chosenVariation,
      });

      // 2.0s Pause during which the gantry is frozen and cinematic animation plays
      await waitMs(2000);

      // Dismiss cinematic overlay, claw remains strictly closed, gantry resumes
      setCinematicDrop(null);
      setIsClawClosed(true); // STRICT: Still closed

      // Update the dropped toy's resting position to where it actually fell
      if (targetToy) {
        // Calculate organic bounce/tumble resting coordinate
        const newX = Math.max(22, Math.min(90, midX + (Math.random() * 4 - 2)));
        const newY = Math.min(84, Math.max(72, targetToy.y + (Math.random() * 4 - 2)));
        const newRot = Math.floor(Math.random() * 60 - 30);
        setToys((prev) =>
          prev.map((t) =>
            t.id === targetToy.id
              ? { ...t, x: Number(newX.toFixed(1)), y: Number(newY.toFixed(1)), rotation: newRot }
              : t
          )
        );
      }

      setResultMessage('爪子繼續返回洞口...');

      // 5C: RESUME GANTRY FROM MIDPOINT TO CHUTE (Claw still closed)
      const leg2Duration = Math.max(150, (Math.abs(midX - CHUTE_CENTER_X) / (MAX_CLAW_X - MIN_CLAW_X)) * 3000);
      await new Promise<void>((resolve) => {
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / leg2Duration);
          const currentX = midX + (CHUTE_CENTER_X - midX) * progress;
          setClawX(currentX);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setClawX(CHUTE_CENTER_X);
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    } else {
      // Direct smooth horizontal transport to chute (Claw stays strictly closed)
      const totalDist = Math.abs(dropStartX - CHUTE_CENTER_X);
      const transportDuration = Math.max(250, (totalDist / (MAX_CLAW_X - MIN_CLAW_X)) * 3000);

      await new Promise<void>((resolve) => {
        const startTime = performance.now();
        const step = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / transportDuration);
          const currentX = dropStartX + (CHUTE_CENTER_X - dropStartX) * progress;
          setClawX(currentX);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setClawX(CHUTE_CENTER_X);
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    }

    // =========================================================================
    // STEP 6: [洞口放物]
    // 抵達洞口正上方：
    // 1. 切換為 .claw-open (張開 1.0 秒釋放)
    // 2. 切換為 .claw-closed (閉合 1.0 秒)
    // 3. 恢復待機鎖定
    // =========================================================================
    setIsClawClosed(false); // Switch to .claw-open over chute

    if (isHoldingToy && targetToy) {
      // Successful drop into chute!
      setHeldToy(null);
      setDroppingToy(targetToy);
      setChuteGlow(true);
      sound.playWin();
      sound.playCoinPayout();

      const voucherCandidate = getRandomClawVoucher();
      const addedItem = addRedeemableItem({
        name: voucherCandidate.name,
        value: voucherCandidate.value,
        icon: voucherCandidate.icon,
        description: voucherCandidate.description,
        source: '夾娃娃機',
      });

      // 5% chance to win Bartender's Lucky Charm
      const wonLuckyCharm = Math.random() < 0.05;
      if (wonLuckyCharm) {
        addPlayerLuckyCharms(1);
      }

      // Check Collectible Unlocks
      if (voucherCandidate.value >= 1000) {
        unlockHiddenCollectible('col-claw-gripper');
      }
      if (stats.wins + 1 >= 3) {
        unlockHiddenCollectible('col-claw-egg');
      }

      setLastWonVoucher(addedItem);
      setStats((prev) => ({
        ...prev,
        wins: prev.wins + 1,
        totalValueWon: prev.totalValueWon + voucherCandidate.value,
      }));
      setHistory((prev) => [
        {
          id: `claw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          cost: COST_PER_PLAY,
          isWin: true,
          toyName: targetToy.name,
          prizeName: wonLuckyCharm
            ? `${voucherCandidate.name} + 🪬夜行幸運符`
            : voucherCandidate.name,
          prizeValue: voucherCandidate.value,
          resultTitle: `🎯 成功夾取【${targetToy.name}】${wonLuckyCharm ? ' 附帶【夜行幸運符】！' : ''}`,
          resultDetail: wonLuckyCharm
            ? `獲得兌幣券【${voucherCandidate.name}】($${voucherCandidate.value.toLocaleString()}) 及【老查理的黑市幸運符】！`
            : `獲得兌幣券【${voucherCandidate.name}】($${voucherCandidate.value.toLocaleString()} 籌碼)`,
        },
        ...prev.slice(0, 49),
      ]);

      if (wonLuckyCharm) {
        toastService.success('🪬 幸運大爆發！額外夾獲【老查理的夜行幸運符】，可至吧台兌換專屬獎勵！');
        setResultMessage(
          `恭喜夾中【${targetToy.name}】，獲得【${voucherCandidate.name}】與【🪬夜行幸運符】！`
        );
      } else {
        setResultMessage(
          `恭喜夾中【${targetToy.name}】，獲得【${voucherCandidate.name}】($${voucherCandidate.value.toLocaleString()} 籌碼)！`
        );
      }

      // Restock replacement toy
      setToys((prev) => {
        const remaining = prev.filter((t) => t.id !== targetToy.id);
        return [...remaining, generateSingleReplacementToy(prev.length)];
      });
    } else if (shouldSlip) {
      setResultMessage('物品已於中途脫落，爪子已回正。');
    } else {
      sound.playLoss();
      setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
      setHistory((prev) => [
        {
          id: `claw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          cost: COST_PER_PLAY,
          isWin: false,
          prizeValue: 0,
          resultTitle: '💨 空爪回程',
          resultDetail: '未命中目標公仔，投幣 $100',
        },
        ...prev.slice(0, 49),
      ]);
      setResultMessage('空爪回程，未夾取到物品。');
    }

    await waitMs(1000);

    // Switch back to .claw-closed
    setIsClawClosed(true);
    setDroppingToy(null);

    await waitMs(1000);

    // Reset all variables & lock machine back to coin-required standby state
    setIsClawClosed(true);
    setCableLengthPx(12);
    setHeldToy(null);
    setChuteGlow(false);
    setIsCoinInserted(false);
    setIsAnimating(false);
    isOperatingRef.current = false;
    setResultMessage('請點擊「投幣 ($100)」開始下一局');
  }, [
    isCoinInserted,
    isBusy,
    findCollidedToy,
    stopMoving,
    onUpdateBalance,
    toys,
    cabinetHeight,
  ]);

  // Keep latest handlers in ref so keyboard event listener never needs to re-bind
  const keyboardHandlersRef = useRef({
    startMoving,
    stopMoving,
    handleInsertCoin,
    handleDropClaw,
    isCoinInserted,
    isBusy: isAnimating || isOperatingRef.current,
  });

  useEffect(() => {
    keyboardHandlersRef.current = {
      startMoving,
      stopMoving,
      handleInsertCoin,
      handleDropClaw,
      isCoinInserted,
      isBusy: isAnimating || isOperatingRef.current,
    };
  });

  // Keyboard shortcut listener (Attached ONCE on mount, smoothly handles hold & release)
  useEffect(() => {
    const activeKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        isBusy,
        isCoinInserted,
        handleInsertCoin,
        handleDropClaw,
        startMoving,
      } = keyboardHandlersRef.current;
      if (isBusy) return;

      if (!isCoinInserted) {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleInsertCoin();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (!activeKeys.has('left')) {
          activeKeys.add('left');
          startMoving(-1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (!activeKeys.has('right')) {
          activeKeys.add('right');
          startMoving(1);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDropClaw();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const { stopMoving, startMoving } = keyboardHandlersRef.current;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        activeKeys.delete('left');
        if (activeKeys.has('right')) {
          startMoving(1);
        } else {
          stopMoving();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        activeKeys.delete('right');
        if (activeKeys.has('left')) {
          startMoving(-1);
        } else {
          stopMoving();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div
      id="claw-machine-container"
      className="w-full h-full flex flex-col lg:flex-row gap-3 overflow-hidden select-none"
    >
      {/* ================= LEFT / CENTER: ARCADE CABINET ================= */}
      <div
        id="claw-cabinet-2d"
        className={`flex-1 min-h-0 h-full flex flex-col justify-between bg-stone-950 border-2 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.85)] p-3 relative overflow-hidden transition-all duration-300 ${
          isCoinInserted
            ? 'border-fuchsia-500 shadow-[0_0_30px_rgba(217,70,239,0.25)]'
            : 'border-stone-800'
        }`}
      >
        {/* 1. TOP MARQUEE HEADER */}
        <div className="w-full shrink-0 flex items-center justify-between px-4 py-2.5 rounded-xl bg-stone-900/90 border border-fuchsia-500/30 z-30 shadow-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-all ${
                isCoinInserted
                  ? 'bg-gradient-to-tr from-fuchsia-500 to-pink-500 animate-pulse'
                  : 'bg-stone-800 text-stone-500'
              }`}
            >
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-pink-200 to-amber-300">
                夾娃娃機
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Machine Power Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                isCoinInserted
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'bg-stone-900 border-stone-700 text-stone-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCoinInserted ? 'bg-emerald-400 animate-ping' : 'bg-stone-600'
                }`}
              />
              <span>{isCoinInserted ? '已通電' : '待投幣'}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-fuchsia-500/30 text-xs">
              <span className="text-stone-400">單次:</span>
              <span className="font-black font-mono text-amber-400">$100</span>
            </div>
          </div>
        </div>

        {/* ================= 2. GLASS CABINET & PLAYFIELD ================= */}
        <div
          ref={cabinetRef}
          className="flex-1 min-h-0 w-full my-2 relative rounded-2xl border-2 border-fuchsia-500/30 bg-[#0d0716] overflow-hidden shadow-inner flex flex-col justify-between"
        >
          
          {/* Flat Back Wall */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#160b24] to-[#0a0412] z-0 pointer-events-none" />

          {/* Side Frame Borders */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-stone-900 border-r border-stone-700 z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-3 bg-stone-900 border-l border-stone-700 z-20 pointer-events-none" />

          {/* TOP HORIZONTAL STEEL RAIL */}
          <div className="relative w-full h-10 shrink-0 z-20 px-3 pt-2">
            <div className="w-full h-3 bg-stone-700 rounded border border-stone-500 shadow-sm relative flex items-center">
              <div className="w-full h-[1px] bg-fuchsia-400/60" />
            </div>

            {/* Mobile Top Gantry Trolley (Smooth 60FPS Translation via clawX%) */}
            <div
              className="absolute top-1 w-12 h-5 rounded-md bg-stone-800 border-2 border-stone-400 shadow-md flex items-center justify-center pointer-events-none z-20 transition-none"
              style={{
                left: `${clawX}%`,
                transform: 'translateX(-50%) translateZ(0)',
                willChange: 'left',
              }}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isCoinInserted ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'
                }`}
              />
            </div>
          </div>

          {/* SUSPENSION STEEL CABLE & RED ACRYLIC JAPANESE 2-PRONG CLAW */}
          <div
            className="absolute top-6 pointer-events-none z-25 flex flex-col items-center transition-none"
            style={{
              left: `${clawX}%`,
              transform: 'translateX(-50%) translateZ(0)',
              willChange: 'left',
            }}
          >
            {/* Linear Straight Steel Cable (Dynamically sized in pixels for responsive drop) */}
            <div
              className="w-0.5 bg-stone-300 shadow-sm transition-none"
              style={{
                height: `${cableLengthPx}px`,
              }}
            />

            {/* ================= CLAW HEAD (#claw-head) ================= */}
            <div
              id="claw-head"
              className="relative flex flex-col items-center -mt-0.5"
            >
              {/* Top Mounting Collar & Centered Silver Ring */}
              <div className="flex flex-col items-center -mb-0.5 z-30">
                {/* Silver Ring & Red Accents */}
                <div className="flex items-center justify-center -mb-0.5">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-rose-600/40 shadow-sm" />
                </div>
                {/* White Top Collar */}
                <div className="w-3.5 h-1.2 rounded-t bg-gradient-to-b from-stone-100 to-stone-300 border-t border-x border-stone-400 shadow-sm mt-0.5" />
              </div>

              {/* Main Rounded White Housing */}
              <div className="w-16 h-8 rounded-xl bg-gradient-to-b from-white via-[#f8fafc] to-[#e2e8f0] border-2 border-stone-300 shadow-[0_3px_10px_rgba(0,0,0,0.4)] flex flex-col items-center justify-center relative overflow-hidden px-1.5 z-20">
                
                {/* Top Corner Screw Hole Accents */}
                <div className="absolute top-1 left-1.5 w-1.2 h-1.2 rounded-full bg-stone-300 border border-stone-400 flex items-center justify-center">
                  <div className="w-0.6 h-[0.5px] bg-stone-500" />
                </div>
                <div className="absolute top-1 right-1.5 w-1.2 h-1.2 rounded-full bg-stone-300 border border-stone-400 flex items-center justify-center">
                  <div className="w-0.6 h-[0.5px] bg-stone-500" />
                </div>

                {/* Central Electronic Black Screen with 'amazing' Label (Matching Photo) */}
                <div className="w-11.5 h-3.8 rounded bg-stone-950 border border-stone-700 shadow-inner flex items-center justify-between px-1.5 relative overflow-hidden">
                  
                  {/* Left Red Vertical Tick Marks */}
                  <div className="flex flex-col gap-0.5">
                    <span className="w-1 h-[1px] bg-rose-500 rounded-full" />
                    <span className="w-1 h-[1px] bg-rose-500 rounded-full" />
                  </div>

                  {/* 'amazing' Wordmark */}
                  <span className="text-[7px] font-mono font-black tracking-wider text-slate-100 select-none drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                    amazing
                  </span>

                  {/* Right Red Vertical Tick Marks */}
                  <div className="flex flex-col gap-0.5">
                    <span className="w-1 h-[1px] bg-rose-500 rounded-full" />
                    <span className="w-1 h-[1px] bg-rose-500 rounded-full" />
                  </div>
                </div>

                {/* Bottom Red Sensor/Button & Power LED */}
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2.5 h-0.6 rounded-full bg-rose-500 shadow-sm" />
                  <div
                    className={`w-1 h-1 rounded-full ${
                      isCoinInserted ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'
                    }`}
                  />
                </div>
              </div>

              {/* ================= RED TRANSLUCENT ACRYLIC CLAW ARMS (.claw-arm) ================= */}
              <div className="relative w-[74px] h-[66px] -mt-1 pointer-events-none z-10 overflow-visible">
                
                {/* Left Claw Arm (.claw-arm.left) */}
                <div
                  className={`claw-arm left absolute inset-0 transition-transform duration-300 ${
                    isClawClosed
                      ? 'claw-closed rotate-0'
                      : 'claw-open rotate-[28deg]'
                  }`}
                  style={{
                    transformOrigin: '32% 10.87%',
                  }}
                >
                  <svg viewBox="0 0 100 92" className="w-full h-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)] overflow-visible">
                    <defs>
                      <linearGradient id="photoRubyLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
                        <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.88" />
                        <stop offset="80%" stopColor="#e11d48" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#be123c" stopOpacity="0.95" />
                      </linearGradient>
                      <linearGradient id="silverBracket" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="50%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#64748b" />
                      </linearGradient>
                    </defs>

                    {/* Left Hinge Joint attached to Head */}
                    <circle cx="32" cy="10" r="3.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />

                    {/* 
                      Left Arm Two-Stage Ruby Acrylic:
                      Hinge (32, 10) -> Outer Elbow (8, 42) -> Bottom Tip (48, 88)
                    */}
                    <path
                      d="M32 10 L8 42 L48 88"
                      fill="none"
                      stroke="url(#photoRubyLeft)"
                      strokeWidth="6.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Acrylic Surface Gloss Reflection Line */}
                    <path
                      d="M31 12 L10 41 L44 82"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />

                    {/* Silver Metal Tip Reinforcement Bracket with 2 Rivet Dots (Matching Photo) */}
                    <path
                      d="M38 77 L48 88"
                      fill="none"
                      stroke="url(#silverBracket)"
                      strokeWidth="7.6"
                      strokeLinecap="round"
                    />
                    <circle cx="40" cy="80" r="1.2" fill="#334155" />
                    <circle cx="45" cy="85" r="1.2" fill="#334155" />
                  </svg>
                </div>

                {/* Right Claw Arm (.claw-arm.right) */}
                <div
                  className={`claw-arm right absolute inset-0 transition-transform duration-300 ${
                    isClawClosed
                      ? 'claw-closed rotate-0'
                      : 'claw-open -rotate-[28deg]'
                  }`}
                  style={{
                    transformOrigin: '68% 10.87%',
                  }}
                >
                  <svg viewBox="0 0 100 92" className="w-full h-full drop-shadow-[0_3px_6px_rgba(0,0,0,0.4)] overflow-visible">
                    <defs>
                      <linearGradient id="photoRubyRight" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fb7185" stopOpacity="0.95" />
                        <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.88" />
                        <stop offset="80%" stopColor="#e11d48" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#be123c" stopOpacity="0.95" />
                      </linearGradient>
                    </defs>

                    {/* Right Hinge Joint attached to Head */}
                    <circle cx="68" cy="10" r="3.5" fill="#e2e8f0" stroke="#475569" strokeWidth="1" />

                    {/* 
                      Right Arm Two-Stage Ruby Acrylic:
                      Hinge (68, 10) -> Outer Elbow (92, 42) -> Bottom Tip (52, 88)
                    */}
                    <path
                      d="M68 10 L92 42 L52 88"
                      fill="none"
                      stroke="url(#photoRubyRight)"
                      strokeWidth="6.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Acrylic Surface Gloss Reflection Line */}
                    <path
                      d="M69 12 L90 41 L56 82"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.85"
                    />

                    {/* Silver Metal Tip Reinforcement Bracket with 2 Rivet Dots (Matching Photo) */}
                    <path
                      d="M62 77 L52 88"
                      fill="none"
                      stroke="url(#silverBracket)"
                      strokeWidth="7.6"
                      strokeLinecap="round"
                    />
                    <circle cx="60" cy="80" r="1.2" fill="#334155" />
                    <circle cx="55" cy="85" r="1.2" fill="#334155" />
                  </svg>
                </div>
              </div>

              {/* HELD TOY ATTACHED UNDER CLAW */}
              {heldToy && (
                <div className="absolute top-[38px] flex flex-col items-center pointer-events-none z-15">
                  <div
                    className={`w-11.5 h-11.5 rounded-full bg-gradient-to-b ${heldToy.color} border-2 border-white/60 shadow-lg flex items-center justify-center`}
                  >
                    <span className="text-2xl select-none">{heldToy.icon}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-black/90 text-[8px] font-bold text-amber-300 whitespace-nowrap shadow mt-0.5 border border-amber-400/40">
                    {heldToy.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ================= 3. STAGE BASE & CINEMATIC OVERLAYS ================= */}
          <div className="relative w-full h-[68%] shrink-0 overflow-hidden">
            
            {/* LEFT DROP CHUTE (落物洞口 - Perfectly Center-Aligned to CHUTE_CENTER_X 10% at 100% Responsive Widths) */}
            <div
              id="drop-chute-2d"
              style={{
                left: '2%',
                width: '16%',
              }}
              className={`absolute bottom-0 h-40 max-h-[75%] rounded-t-xl border-2 border-dashed z-10 flex flex-col justify-between p-1.5 overflow-hidden transition-all duration-300 ${
                chuteGlow
                  ? 'bg-emerald-950/70 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                  : 'bg-stone-950/80 border-fuchsia-500/40'
              }`}
            >
              <div className="flex items-center justify-center gap-1 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[11px] font-black text-rose-400 whitespace-nowrap">
                  落物洞口
                </span>
              </div>

              {/* Dropping Toy falling into chute */}
              {droppingToy && (
                <div className="flex-1 flex flex-col items-center justify-center animate-bounce">
                  <div
                    className={`w-11.5 h-11.5 rounded-full bg-gradient-to-b ${droppingToy.color} border-2 border-white/60 shadow-md flex items-center justify-center`}
                  >
                    <span className="text-2xl select-none">{droppingToy.icon}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 mt-1">中獎入洞！</span>
                </div>
              )}

              <div className="w-full text-center pb-0.5">
                <span className="text-[9px] text-stone-400">PRIZE DROP</span>
              </div>
            </div>

            {/* ================= 4. CINEMATIC DROP FX OVERLAY (機台中央特寫 + 漫畫速度線與多樣化下墜動態) ================= */}
            {cinematicDrop && (
              <div
                id="cinematic-drop-overlay"
                className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/80 backdrop-blur-[3px] p-2 sm:p-4 transition-all duration-200 overflow-hidden"
              >
                {/* Visual Impact Flash */}
                <div className="absolute inset-0 bg-rose-500/20 pointer-events-none flash-pulse" />

                {/* Background Fast Streaming Speedlines (Across Screen) */}
                <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden speedlines-rush">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <line x1="12" y1="0" x2="12" y2="100" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="15,10" />
                    <line x1="28" y1="0" x2="28" y2="100" stroke="#fb7185" strokeWidth="1.2" strokeDasharray="20,15" />
                    <line x1="48" y1="0" x2="48" y2="100" stroke="#ffffff" strokeWidth="1.8" strokeDasharray="12,12" />
                    <line x1="68" y1="0" x2="68" y2="100" stroke="#fb7185" strokeWidth="1.2" strokeDasharray="20,15" />
                    <line x1="88" y1="0" x2="88" y2="100" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="15,10" />
                  </svg>
                </div>

                {/* Visual Viewport Card Centered in Playfield (Auto-scaled to fit without clipping) */}
                <div className="w-[300px] max-w-[95%] max-h-[92%] rounded-2xl bg-stone-950/95 border-2 border-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.85)] p-3 backdrop-blur-xl flex flex-col gap-2 relative overflow-hidden animate-in zoom-in-90 fade-in duration-200 z-10">
                  
                  {/* Viewport Header with Warning Tag & Flashing Indicator */}
                  <div className="flex items-center justify-between border-b border-rose-500/40 pb-1.5 z-10 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-4" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-rose-300 tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400 fill-amber-400 animate-bounce" />
                          抓力失衡・
                          {cinematicDrop.variation === 'spiral'
                            ? '迴旋滑落'
                            : cinematicDrop.variation === 'tease'
                            ? '晃動鬆脫'
                            : '極速墜落'}
                        </span>
                        <span className="text-[8.5px] font-mono text-rose-400/80">
                          {cinematicDrop.variation === 'spiral'
                            ? 'SPIRAL SLIP'
                            : cinematicDrop.variation === 'tease'
                            ? 'TEASE & DROP'
                            : 'PLUNGE DROP'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-500 text-[9px] font-black text-amber-300 animate-pulse tracking-wide shadow-sm">
                      ⚡ IMPACT DROP
                    </span>
                  </div>

                  {/* Close-Up Stage with Dynamic Vertical & Radial Manga Speedlines */}
                  <div className="relative w-full h-44 sm:h-48 rounded-xl bg-gradient-to-b from-[#2a0c22] via-[#140411] to-[#070106] border border-rose-500/50 overflow-hidden flex flex-col items-center justify-between p-2 shadow-inner shrink-0">
                    
                    {/* SVG Anime Dynamic Speedlines & Radial Burst */}
                    <div className="absolute inset-0 pointer-events-none opacity-75 overflow-hidden speedlines-rush">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* High-speed vertical rush streaks */}
                        <line x1="6" y1="0" x2="6" y2="100" stroke="#f43f5e" strokeWidth="2.2" strokeDasharray="12,8" opacity="0.9" />
                        <line x1="16" y1="0" x2="16" y2="100" stroke="#fb7185" strokeWidth="1" strokeDasharray="16,8" opacity="0.7" />
                        <line x1="26" y1="0" x2="26" y2="100" stroke="#f43f5e" strokeWidth="3" strokeDasharray="25,12" opacity="0.9" />
                        <line x1="38" y1="0" x2="38" y2="100" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="14,14" opacity="0.85" />
                        <line x1="62" y1="0" x2="62" y2="100" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="14,14" opacity="0.85" />
                        <line x1="74" y1="0" x2="74" y2="100" stroke="#f43f5e" strokeWidth="3" strokeDasharray="25,12" opacity="0.9" />
                        <line x1="84" y1="0" x2="84" y2="100" stroke="#fb7185" strokeWidth="1" strokeDasharray="16,8" opacity="0.7" />
                        <line x1="94" y1="0" x2="94" y2="100" stroke="#f43f5e" strokeWidth="2.2" strokeDasharray="12,8" opacity="0.9" />
                        {/* Angled rush lines from claw tip */}
                        <line x1="50" y1="15" x2="5" y2="100" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="10,8" opacity="0.6" />
                        <line x1="50" y1="15" x2="95" y2="100" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="10,8" opacity="0.6" />
                      </svg>
                    </div>

                    {/* Viewfinder Target Brackets with Neon Glow */}
                    <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />
                    <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />
                    <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)] pointer-events-none" />

                    {/* Top Acrylic Red Claw Head and Arms in Viewport (Micro-recoil vibration) */}
                    <div className="w-full flex flex-col items-center pt-0.5 z-10 claw-slip-wobble">
                      <div className="w-13 h-5 rounded-lg bg-gradient-to-b from-white to-slate-200 border border-stone-300 flex items-center justify-center shadow-md">
                        <div className="w-9 h-2.5 rounded bg-black flex items-center justify-center px-1">
                          <span className="text-[6px] font-mono text-slate-100 font-bold tracking-wider">amazing</span>
                        </div>
                      </div>
                      <div className="relative w-18 h-12 -mt-1 pointer-events-none">
                        <svg viewBox="0 0 100 92" className="w-full h-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                          {/* Left Arm Diamond Angle */}
                          <circle cx="32" cy="10" r="3.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                          <path d="M32 10 L8 42 L48 88" fill="none" stroke="#e11d48" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M31 12 L10 41 L44 82" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                          <path d="M38 77 L48 88" fill="none" stroke="#cbd5e1" strokeWidth="7.5" strokeLinecap="round" />
                          <circle cx="40" cy="80" r="1.2" fill="#334155" />
                          <circle cx="45" cy="85" r="1.2" fill="#334155" />

                          {/* Right Arm Diamond Angle */}
                          <circle cx="68" cy="10" r="3.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
                          <path d="M68 10 L92 42 L52 88" fill="none" stroke="#e11d48" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M69 12 L90 41 L56 82" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                          <path d="M62 77 L52 88" fill="none" stroke="#cbd5e1" strokeWidth="7.5" strokeLinecap="round" />
                          <circle cx="60" cy="80" r="1.2" fill="#334155" />
                          <circle cx="55" cy="85" r="1.2" fill="#334155" />
                        </svg>
                      </div>
                    </div>

                    {/* Dramatic Slipping & Falling Toy Animation (with 3 distinct animation classes) */}
                    <div
                      className={`relative z-20 flex flex-col items-center -mt-2 ${
                        cinematicDrop.variation === 'spiral'
                          ? 'tumble-spiral-fall'
                          : cinematicDrop.variation === 'tease'
                          ? 'tease-slow-drop'
                          : 'dramatic-plunge'
                      }`}
                    >
                      {/* Sonic rush speed cone & motion trail */}
                      <div className="w-9 h-14 bg-gradient-to-t from-rose-500/60 via-amber-400/30 to-transparent blur-[3px] -mb-9 pointer-events-none" />
                      
                      {/* Falling prize sphere */}
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-b ${cinematicDrop.toy.color} border-2 border-white shadow-[0_0_35px_rgba(244,63,94,0.95)] flex items-center justify-center`}
                      >
                        <span className="text-2xl select-none filter drop-shadow-md">{cinematicDrop.toy.icon}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-black/90 text-[11px] font-black text-amber-300 whitespace-nowrap shadow mt-1 border border-amber-400/60 tracking-wider">
                        {cinematicDrop.toy.name}
                      </span>
                    </div>

                    {/* Bottom Status & Live Grip Meter */}
                    <div className="w-full flex items-center justify-between text-[9.5px] text-stone-400 z-10 border-t border-rose-500/30 pt-1 bg-black/40 px-2 rounded-b-lg shrink-0">
                      <span className="text-rose-400 font-black tracking-wide flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        {cinematicDrop.variation === 'spiral'
                          ? '夾爪傾斜・螺旋翻滾滑出'
                          : cinematicDrop.variation === 'tease'
                          ? '晃動鬆開・二次加速墜地'
                          : '抓力臨界點突破・加速下墜中'}
                      </span>
                      <span className="text-stone-300 font-mono font-bold shrink-0">GRIP: 0%</span>
                    </div>
                  </div>

                  {/* Dynamic Progress Indicator Bar */}
                  <div className="w-full h-1.5 bg-stone-900 rounded-full overflow-hidden border border-stone-800 shrink-0">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-full animate-out slide-out-to-left duration-2000 fill-mode-forwards shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STAGE FLOOR SHELF */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-stone-900 border-t-2 border-stone-700 flex items-center px-4 justify-between" />

            {/* 2D TOYS DISTRIBUTION ON THE FLOOR (Packed Plushie Pile with 3-Layer Depth & Organic Tilts) */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {toys.map((toy) => (
                <div
                  key={toy.id}
                  className="absolute pointer-events-auto transition-transform hover:scale-120 cursor-pointer group"
                  style={{
                    left: `${toy.x}%`,
                    top: `${toy.y}%`,
                    transform: `translate(-50%, -50%) rotate(${toy.rotation || 0}deg) scale(${toy.scale || 1})`,
                    zIndex: Math.round(toy.y * 10),
                  }}
                >
                  <div className="relative flex flex-col items-center">
                    {/* Dynamic Ground Shadow */}
                    <div className="absolute -bottom-1.5 w-10 h-2.5 rounded-full bg-black/60 blur-[1.5px]" />
                    
                    {/* Plushie Prize Ball */}
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-b ${toy.color} border-2 border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-200 group-hover:border-amber-300 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.6)]`}
                    >
                      <span className="text-2xl select-none filter drop-shadow-sm">{toy.icon}</span>
                    </div>

                    {/* Hover Name Tag */}
                    <span className="absolute -top-6 px-2 py-0.5 rounded-md bg-black/90 text-[10px] font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg pointer-events-none border border-amber-400/40 z-30">
                      {toy.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= 4. PHYSICAL CONTROLLER PANEL (街機仿真控制台) ================= */}
        <div
          id="arcade-controller-panel"
          className="w-full shrink-0 flex flex-col gap-2 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-b from-[#1b1528] via-[#130f1e] to-[#0b0814] border-2 border-fuchsia-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.85)] z-30 relative overflow-hidden"
        >
          {/* Top Carbon Fiber Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 opacity-80" />

          {/* Machine Telemetry LCD Display */}
          <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-black/90 border border-fuchsia-500/40 shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full flex items-center justify-center">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCoinInserted
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                />
              </div>
              <p className="text-[11px] sm:text-xs font-mono font-bold text-stone-200 truncate">
                {resultMessage}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Track X Coordinate Display */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-[10px] font-mono">
                <Crosshair className="w-3 h-3 text-cyan-400" />
                <span className="text-stone-400">X:</span>
                <span className="font-bold text-cyan-300 font-mono">
                  {clawX.toFixed(0)}%
                </span>
              </div>

              {/* Status Pill */}
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider ${
                  !isCoinInserted
                    ? 'bg-stone-800 text-stone-400 border border-stone-700'
                    : isOperatingRef.current || isAnimating
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                }`}
              >
                {!isCoinInserted
                  ? 'STANDBY'
                  : isOperatingRef.current || isAnimating
                  ? 'BUSY'
                  : 'READY'}
              </span>
            </div>
          </div>

          {/* Arcade Control Deck Stage */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            
            {/* 1. LEFT ZONE (~1/3 WIDTH): 街機搖桿 (Arcade Joystick) & 左右方向鍵 (Left/Right Buttons) */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-[36%] justify-center sm:justify-start">
              
              {/* === 3D ARCADE BALL-TOP JOYSTICK (HORIZONTAL TILTING) === */}
              <div
                id="arcade-joystick-unit"
                ref={joystickContainerRef}
                onPointerDown={handleJoystickPointerDown}
                onPointerMove={handleJoystickMove}
                onPointerUp={handleJoystickPointerUp}
                onPointerCancel={handleJoystickPointerUp}
                className={`relative w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#2a2438] via-[#1a1526] to-[#0f0c18] border-2 border-stone-600 shadow-[inset_0_3px_8px_rgba(0,0,0,0.8),0_6px_16px_rgba(0,0,0,0.6)] flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none transition-transform shrink-0 ${
                  canControl ? 'opacity-100' : 'opacity-60 cursor-not-allowed'
                }`}
                title="街機左右搖桿：可點擊拖曳或使用鍵盤 [A][D] / [←][→] 控制"
              >
                {/* Outer Chrome Bezel Ring */}
                <div className="absolute inset-1 rounded-full border border-stone-500/40 pointer-events-none" />

                {/* LEFT & RIGHT LED Indicators on the Bezel */}
                {/* LEFT LED */}
                <div
                  className={`absolute left-1.5 w-2 h-2 rounded-full transition-all ${
                    joystickDir === 'left'
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] scale-150'
                      : 'bg-stone-700'
                  }`}
                />
                {/* RIGHT LED */}
                <div
                  className={`absolute right-1.5 w-2 h-2 rounded-full transition-all ${
                    joystickDir === 'right'
                      ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,1)] scale-150'
                      : 'bg-stone-700'
                  }`}
                />

                {/* Black Rubber Dust Washer (防塵墊圈) */}
                <div className="w-13 h-13 rounded-full bg-gradient-to-b from-[#111] to-[#222] border-2 border-stone-800 shadow-inner flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-full bg-black shadow-inner" />
                </div>

                {/* Animated Tilting Stick Shaft & Glossy Ball-Top */}
                <div
                  className="absolute pointer-events-none flex flex-col items-center justify-center transition-transform duration-100 ease-out"
                  style={{
                    transform:
                      joystickDir === 'left'
                        ? 'translate(-12px, 0px) rotateZ(-24deg) rotateY(-20deg)'
                        : joystickDir === 'right'
                        ? 'translate(12px, 0px) rotateZ(24deg) rotateY(20deg)'
                        : 'translate(0px, 0px) rotateX(0deg) rotateY(0deg)',
                    transformOrigin: '50% 80%',
                    willChange: 'transform',
                  }}
                >
                  {/* Glossy Ruby Sanwa-Style Ball Top (圓形紅色球頭) */}
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#991b1b] via-[#dc2626] to-[#f87171] border-2 border-rose-300 shadow-[0_6px_14px_rgba(0,0,0,0.8),inset_0_-4px_8px_rgba(0,0,0,0.6),inset_0_4px_8px_rgba(255,255,255,0.7)] flex items-center justify-center">
                    {/* Specular Highlight Gloss Dot */}
                    <div className="absolute top-1.5 left-2 w-3 h-1.5 rounded-full bg-white/70 rotate-[-30deg] blur-[0.4px]" />
                    <div className="absolute top-3.5 left-1.5 w-1 h-1 rounded-full bg-white/60" />
                  </div>

                  {/* Chrome Metal Shaft (金屬軸心) */}
                  <div className="w-2.5 h-4.5 -mt-1 bg-gradient-to-r from-stone-400 via-stone-200 to-stone-500 border-x border-stone-600 rounded-b shadow" />
                </div>
              </div>

              {/* === LEFT & RIGHT DIRECTIONAL BUTTONS (左右方向鍵) === */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* LEFT Button (◀) */}
                <button
                  id="btn-claw-left"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                    startMoving(-1);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {}
                    stopMoving();
                  }}
                  onPointerCancel={stopMoving}
                  disabled={!canControl}
                  className={`w-12 h-11 sm:w-13 sm:h-12 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none touch-none shadow-md ${
                    joystickDir === 'left'
                      ? 'bg-cyan-500 border-cyan-300 text-stone-950 scale-95 shadow-[0_0_14px_rgba(6,182,212,0.7)]'
                      : 'bg-stone-800 hover:bg-stone-700 active:bg-cyan-600 border-stone-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title="按住向左持續移動 (A / ←)"
                >
                  <div className="flex items-center gap-0.5">
                    <ArrowLeft className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black">左</span>
                  </div>
                  <span className="text-[8px] font-mono leading-none text-stone-400 font-bold">A / ←</span>
                </button>

                {/* RIGHT Button (▶) */}
                <button
                  id="btn-claw-right"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                    startMoving(1);
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {}
                    stopMoving();
                  }}
                  onPointerCancel={stopMoving}
                  disabled={!canControl}
                  className={`w-12 h-11 sm:w-13 sm:h-12 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none touch-none shadow-md ${
                    joystickDir === 'right'
                      ? 'bg-cyan-500 border-cyan-300 text-stone-950 scale-95 shadow-[0_0_14px_rgba(6,182,212,0.7)]'
                      : 'bg-stone-800 hover:bg-stone-700 active:bg-cyan-600 border-stone-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title="按住向右持續移動 (D / →)"
                >
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs font-black">右</span>
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-[8px] font-mono leading-none text-stone-400 font-bold">D / →</span>
                </button>
              </div>
            </div>

            {/* 2. RIGHT ZONE: 投幣 (Insert Coin) & 街機下爪大按鈕 (Jumbo Drop Button) */}
            <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-center sm:justify-end">
              
              {/* ARCADE COIN SLOT BUTTON */}
              <button
                id="btn-claw-coin"
                onClick={handleInsertCoin}
                disabled={isCoinInserted || isBusy || balance < COST_PER_PLAY}
                className={`h-12 sm:h-13 px-3.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer shadow-md select-none ${
                  !isCoinInserted
                    ? 'bg-gradient-to-b from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.5)] active:scale-95 animate-pulse'
                    : 'bg-stone-900 text-stone-500 border-stone-700 opacity-50 cursor-not-allowed'
                }`}
                title="投幣 $100 啟動機台 (快捷鍵: C / 空白鍵)"
              >
                <div className="flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-black whitespace-nowrap">
                    {isCoinInserted ? '已投幣' : '投幣 ($100)'}
                  </span>
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-stone-800 font-black">
                  INSERT COIN
                </span>
              </button>

              {/* JUMBO SANWA-STYLE ARCADE "下爪 CATCH" PUSH BUTTON */}
              <button
                id="btn-claw-drop"
                onClick={handleDropClaw}
                disabled={!canControl}
                className={`relative w-22 h-12 sm:w-26 sm:h-13 rounded-2xl flex flex-col items-center justify-center border-2 transition-all cursor-pointer select-none touch-none ${
                  canControl
                    ? 'bg-gradient-to-b from-[#f43f5e] via-[#e11d48] to-[#be123c] hover:from-[#fb7185] hover:to-[#e11d48] active:scale-92 active:translate-y-1 text-white border-rose-300 shadow-[0_6px_20px_rgba(244,63,94,0.6),inset_0_2px_4px_rgba(255,255,255,0.6)] animate-pulse'
                    : 'bg-stone-800 text-stone-500 border-stone-700 opacity-40 cursor-not-allowed shadow-none'
                }`}
                title="按下落爪 (快捷鍵: 空白鍵 / Enter)"
              >
                {/* Button Bezel Gloss Ring */}
                <div className="absolute inset-0.5 rounded-xl border border-white/30 pointer-events-none" />
                <div className="flex items-center gap-1 z-10">
                  <Zap className="w-4 h-4 fill-white shrink-0" />
                  <span className="text-xs sm:text-sm font-black tracking-wider">下爪</span>
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-rose-200/90 font-black z-10">
                  CATCH
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDEBAR: REWARD PROBABILITIES ================= */}
      <div className="w-full lg:w-80 h-auto lg:h-full shrink-0 flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar">
        {/* 1. Prize Probabilities List */}
        <div className="flex-1 p-4 rounded-2xl bg-stone-900/90 border border-fuchsia-500/30 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-800 mb-3">
              <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-fuchsia-400" />
                <span>機台獎勵庫</span>
              </h3>
              <span className="text-xs text-stone-400 font-medium">考驗出爪時機</span>
            </div>

            <div className="space-y-2">
              {/* BARTENDER'S LUCKY CHARM */}
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-purple-950/80 to-amber-950/80 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-bounce">🪬</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-amber-300">老查理的夜行幸運符</h4>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                        獨家掉落
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-200/90 font-mono block">
                      酒吧專用 • 神秘密契兌換
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold block">
                    ?%
                  </span>
                  <span className="text-[9px] text-stone-400 font-mono mt-0.5 block">
                    持有: <strong className="text-emerald-400 font-bold">{luckyCharms}</strong> 枚
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎟️</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">$100 幸運兌幣券</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">等值 $100 籌碼</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-stone-700 text-stone-200 font-mono text-[11px] font-bold">
                  50%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎫</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">$200 銀級兌幣券</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">等值 $200 籌碼</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-stone-700 text-stone-200 font-mono text-[11px] font-bold">
                  30%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-stone-800/80 border border-amber-500/30 flex items-center justify-between shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏆</span>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">$500 金級兌幣券</h4>
                    <span className="text-[10px] text-amber-400 font-mono">等值 $500 籌碼</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                  15%
                </span>
              </div>

              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-fuchsia-500/40 flex items-center justify-between shadow-[0_0_12px_rgba(217,70,239,0.15)]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <div>
                    <h4 className="text-xs font-bold text-fuchsia-300">$1,000 鑽石特大獎</h4>
                    <span className="text-[10px] text-fuchsia-400 font-mono">等值 $1,000 籌碼</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-fuchsia-950 border border-fuchsia-500/50 text-fuchsia-300 font-mono text-[11px] font-bold">
                  5%
                </span>
              </div>
            </div>
          </div>

          {/* Quick instructions & inventory link */}
          <div className="pt-3 border-t border-stone-800 space-y-2 mt-2">
            <div className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <p className="font-bold text-stone-300 flex items-center gap-1">
                <span>💡</span> 夾取秘訣
              </p>
              <p>• 靠近左側洞口的目標運送距離短，成功入洞機率較高！</p>
              <p>• 距離洞口越遠的目標，運送途中的掉落風險會稍微提高。</p>
              <p>• 夾中之兌幣券存入背包，請返回大廳櫃台 1:1 兌換籌碼。</p>
            </div>

            <button
              onClick={onNavigateToLobby}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 active:scale-98 text-stone-950 font-black text-xs shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Package className="w-4 h-4 text-stone-950" />
              <span>返回大廳櫃台兌換籌碼</span>
            </button>
          </div>
        </div>

        {/* 2. Real-Time Gameplay Record */}
        <div className="p-3 rounded-2xl bg-stone-900/90 border border-fuchsia-500/30 shadow-xl flex items-center justify-around text-center">
          <div>
            <span className="text-[10px] text-stone-400 block">總遊玩次數</span>
            <span className="text-base font-black font-mono text-white">
              {stats.plays}
            </span>
          </div>
          <div className="w-[1px] h-7 bg-stone-800" />
          <div>
            <span className="text-[10px] text-stone-400 block">成功夾中</span>
            <span className="text-base font-black font-mono text-emerald-400">
              {stats.wins}
            </span>
          </div>
          <div className="w-[1px] h-7 bg-stone-800" />
          <div>
            <span className="text-[10px] text-stone-400 block">累計獲獎價值</span>
            <span className="text-base font-black font-mono text-amber-300">
              ${stats.totalValueWon.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
