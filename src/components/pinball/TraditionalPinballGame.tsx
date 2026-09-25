import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ShoppingCart,
  CircleDot,
  Info,
  Award,
  MoveLeft,
  MoveRight,
  MoveUp,
  Zap,
  Trophy,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { BALL_PACKAGES, BallPackage } from '../plinko/PlinkoControls';
import { recordCareerRound } from '../../utils/careerStats';
import { dispatchBetAction } from '../../utils/tableIntel';
import { unlockHiddenCollectible } from '../../utils/inventory';

const STORAGE_KEYS = {
  BALLS: 'plinko_balls_inventory_v1',
};

interface PinballGameProps {
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  soundEnabled?: boolean;
  onRoundBusyChange?: (isBusy: boolean) => void;
  onNavigateToLobby?: () => void;
}

interface PinballHole {
  id: number;
  x: number;
  y: number;
  radius: number;
  points: number; // 10 ~ 300 points (各孔洞依標示點數直接計分)
  payout: number; // 獲得籌碼 = points
  label: string;  // '300', '200', '150', '100', '70', '60', '50', '40', '30', '20', '10'
  type?: 'crown' | 'chevron' | 'field' | 'tray';
}

interface PinBall {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  hasExitedTube?: boolean;
  inHole?: boolean;
  wonHole?: PinballHole;
  holeStayFrames?: number;
  scoreProcessed?: boolean;
  scale?: number;
  alpha?: number;
  launchPull?: number;
  stuckFrames?: number;
  lastX?: number;
  lastY?: number;
  deflectorCooldown?: number;
  railCooldown?: number;
}

export interface PinballWindmill {
  id: number;
  x: number;
  y: number;
  radius: number;
  bladeCount: number;
  angle: number;
  angularVelocity: number;
  colors: string[];
}

export interface PinballSpringKicker {
  id: number;
  x: number;
  y: number;
  length: number;
  angle: number; // 彈簧擋板基線朝向 (弧度)
  kickAngle: number; // 彈射向量角度 (朝向斜上方)
  kickPower: number; // 彈射推力 (speed ~ 5.5 - 11.0)
  compression: number; // 0 = 伸展, 1 = 完全壓縮
  sparkTimer: number; // 撞擊閃爍/震動計時
  label: string; // 彈簧標籤
  isArc?: boolean; // 是否為外凸微拱圓弧彈簧 (Convex Arc Kicker)
  arcHeight?: number; // 拱高 (像素)
}

export interface PinballSlingshotTriangle {
  id: number;
  p1: { x: number; y: number }; // 頂部頂點 (靠牆)
  p2: { x: number; y: number }; // 內側擊球面下端點 (位於斜桿交界)
  p3: { x: number; y: number }; // 外側底座角 (同時貼緊側面牆壁與斜桿起始處)
  cp: { x: number; y: number }; // 外凸弧形彈性邊控制點 (使反彈向量呈現寬角度散佈，徹底消除固定掉入10分孔)
  kickAngle: number; // 朝向中高空的強力發射主向量
  kickPower: number;
  compression: number; // 0 ~ 1 橡皮筋壓縮動畫
  sparkTimer: number;
  label: string;
}

export interface PinballRoundBumper {
  id: number;
  x: number;
  y: number;
  radius: number;
  kickPower: number;
  hitTimer: number; // 撞擊閃爍與縮放動畫 (0 ~ 15)
  label: string;
}

// 復古夜市黃銅釘板孔洞台 (放大盤面寬 420x650，精準孔徑 5.6/6.2px，滿載 54 孔經典配置)
// 排除右側發射軌道 (有效盤面 x: 26 ~ 362，正中央中軸為 x = 194)
// 全盤面孔洞嚴格關於 x = 194 左右鏡像對稱 (x' = 388 - x)，視覺張力澎湃，原汁原味重現！
export const VINTAGE_PINBALL_HOLES: PinballHole[] = [
  // 1. 頂部迎球排 (移除兩側50分孔，40分與30分往中央微調拉開與風車距離，頂弧自然順暢引流)
  { id: 1, x: 194, y: 78, radius: 5.6, points: 60, payout: 60, label: '60' },
  { id: 4, x: 154, y: 92, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 5, x: 234, y: 92, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 6, x: 118, y: 108, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 7, x: 270, y: 108, radius: 5.6, points: 30, payout: 30, label: '30' },

  // 2. 雙大耳/雙鑽石四孔區 (兩耳各4孔：上側30分、下側50分、外側30分、內側20分，稍微拉開間距極致順暢；雙耳中軸2孔)
  // 左鑽石 (上30, 下50, 外30, 內20)
  { id: 8, x: 130, y: 150, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 12, x: 130, y: 198, radius: 5.6, points: 50, payout: 50, label: '50' },
  { id: 10, x: 106, y: 174, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 11, x: 154, y: 174, radius: 5.6, points: 20, payout: 20, label: '20' },
  // 右鑽石 (388 - x 嚴格鏡像：上30, 下50, 外30, 內20)
  { id: 14, x: 258, y: 150, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 18, x: 258, y: 198, radius: 5.6, points: 50, payout: 50, label: '50' },
  { id: 17, x: 282, y: 174, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 16, x: 234, y: 174, radius: 5.6, points: 20, payout: 20, label: '20' },
  // 雙耳中軸 (位在圓形不規則彈簧正下方通道)
  { id: 20, x: 194, y: 172, radius: 5.6, points: 150, payout: 150, label: '150', type: 'crown' },
  { id: 21, x: 194, y: 198, radius: 5.6, points: 30, payout: 30, label: '30' },

  // 3. 中層 150 冠孔大獎王座與護衛翼 (原150與上方圓形彈簧下之40分孔對調)
  { id: 22, x: 194, y: 236, radius: 5.6, points: 40, payout: 40, label: '40' },
  // 150 護衛雙 90 分孔
  { id: 23, x: 172, y: 268, radius: 5.6, points: 90, payout: 90, label: '90' },
  { id: 24, x: 216, y: 268, radius: 5.6, points: 90, payout: 90, label: '90' },
  // 兩翼分流孔
  { id: 25, x: 82, y: 240, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 26, x: 306, y: 240, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 27, x: 120, y: 252, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 28, x: 268, y: 252, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 29, x: 72, y: 276, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 30, x: 316, y: 276, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 31, x: 112, y: 284, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 32, x: 276, y: 284, radius: 5.6, points: 40, payout: 40, label: '40' },

  // 4. 中腹 100 冠孔與兩翼大展 (7孔)
  { id: 33, x: 194, y: 328, radius: 5.6, points: 100, payout: 100, label: '100', type: 'crown' },
  { id: 34, x: 154, y: 338, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 35, x: 234, y: 338, radius: 5.6, points: 40, payout: 40, label: '40' },
  { id: 36, x: 108, y: 344, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 37, x: 280, y: 344, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 38, x: 72, y: 352, radius: 5.6, points: 20, payout: 20, label: '20' },
  { id: 39, x: 316, y: 352, radius: 5.6, points: 20, payout: 20, label: '20' },

  // 5. 底層 200 冠孔、雙 300 終極特獎區與中央心形孔群 (13孔)
  { id: 40, x: 194, y: 412, radius: 5.6, points: 200, payout: 200, label: '200', type: 'crown' },
  { id: 43, x: 118, y: 446, radius: 5.6, points: 300, payout: 300, label: '300', type: 'chevron' },
  { id: 47, x: 270, y: 446, radius: 5.6, points: 300, payout: 300, label: '300', type: 'chevron' },
  { id: 41, x: 164, y: 448, radius: 5.6, points: 70, payout: 70, label: '70' },
  { id: 42, x: 224, y: 448, radius: 5.6, points: 70, payout: 70, label: '70' },
  { id: 44, x: 194, y: 468, radius: 5.6, points: 80, payout: 80, label: '80' },
  { id: 45, x: 168, y: 488, radius: 5.6, points: 70, payout: 70, label: '70' },
  { id: 46, x: 220, y: 488, radius: 5.6, points: 70, payout: 70, label: '70' },
  { id: 48, x: 194, y: 508, radius: 5.6, points: 100, payout: 100, label: '100', type: 'crown' },
  { id: 49, x: 54, y: 444, radius: 5.6, points: 20, payout: 20, label: '20' },
  { id: 50, x: 334, y: 444, radius: 5.6, points: 20, payout: 20, label: '20' },
  { id: 51, x: 84, y: 466, radius: 5.6, points: 30, payout: 30, label: '30' },
  { id: 60, x: 304, y: 466, radius: 5.6, points: 30, payout: 30, label: '30' },

  // 6. 底部 8 格導流斜槽與雙 20 槽 (8孔)
  { id: 52, x: 64, y: 524, radius: 5.6, points: 10, payout: 10, label: '10', type: 'tray' },
  { id: 53, x: 100, y: 538, radius: 5.6, points: 20, payout: 20, label: '20', type: 'tray' },
  { id: 54, x: 136, y: 552, radius: 5.6, points: 30, payout: 30, label: '30', type: 'tray' },
  { id: 55, x: 324, y: 524, radius: 5.6, points: 10, payout: 10, label: '10', type: 'tray' },
  { id: 56, x: 288, y: 538, radius: 5.6, points: 20, payout: 20, label: '20', type: 'tray' },
  { id: 57, x: 252, y: 552, radius: 5.6, points: 30, payout: 30, label: '30', type: 'tray' },
  { id: 58, x: 186, y: 588, radius: 5.6, points: 20, payout: 20, label: '20', type: 'tray' },
  { id: 59, x: 202, y: 588, radius: 5.6, points: 20, payout: 20, label: '20', type: 'tray' },
];

export const TraditionalPinballGame: React.FC<PinballGameProps> = ({
  balance,
  onUpdateBalance,
  soundEnabled = true,
  onRoundBusyChange,
  onNavigateToLobby,
}) => {
  // Shared Ball Inventory state with PlinkoGame
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
    return 0;
  });

  // Plunger Pull State
  const [springPull, setSpringPull] = useState<number>(0); // 0 - 100
  const [pullDirection, setPullDirection] = useState<'up' | 'down'>('up');
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [lastWin, setLastWin] = useState<{ points: number; payout: number; label: string } | null>(null);
  const [sessionTotalScore, setSessionTotalScore] = useState<number>(0);

  // Machine Nudge & TILT State
  const [nudgeOffset, setNudgeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nudgeCount, setNudgeCount] = useState<number>(0);
  const [isTilted, setIsTilted] = useState<boolean>(false);
  const [tiltCooldownRemaining, setTiltCooldownRemaining] = useState<number>(0);
  const [lastLaunchPull, setLastLaunchPull] = useState<number | null>(null);

  // Refs for high-speed animation loop
  const springPullRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const pullStartTimestampRef = useRef<number | null>(null);
  const isLaunchingRef = useRef<boolean>(false);
  const lastLaunchTimestampRef = useRef<number>(0);
  const sessionLaunchesRef = useRef<number>(0);
  const sessionWonRef = useRef<number>(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const plungerRodRef = useRef<HTMLDivElement>(null);

  // Nudge tracking
  const nudgeTimestampsRef = useRef<number[]>([]);
  const tiltTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pin grid coordinates
  const pegs = useRef<Array<{ x: number; y: number }>>([]);
  const activeBallsRef = useRef<PinBall[]>([]);
  const ballsCountRef = useRef(ballsCount);
  ballsCountRef.current = ballsCount;

  // 6 座夜市經典旋轉風車 (最上方兩座風車內移至 x: 70 與 318，半徑 16.5px，外側騰出 14.3px 順暢落球走道，兼具外緣滑落與風車旋轉樂趣)
  const windmillsRef = useRef<PinballWindmill[]>([
    {
      id: 1,
      x: 70,
      y: 135,
      radius: 16.5,
      bladeCount: 4,
      angle: 0,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
    {
      id: 2,
      x: 318,
      y: 135,
      radius: 16.5,
      bladeCount: 4,
      angle: Math.PI / 4,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
    {
      id: 3,
      x: 130,
      y: 318,
      radius: 17,
      bladeCount: 4,
      angle: 0,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
    {
      id: 4,
      x: 258,
      y: 318,
      radius: 17,
      bladeCount: 4,
      angle: Math.PI / 4,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
    {
      id: 5,
      x: 96,
      y: 406,
      radius: 16.5,
      bladeCount: 4,
      angle: 0,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
    {
      id: 6,
      x: 292,
      y: 406,
      radius: 16.5,
      bladeCount: 4,
      angle: Math.PI / 4,
      angularVelocity: 0,
      colors: ['#ef4444', '#facc15', '#3b82f6', '#10b981'],
    },
  ]);

  // 3 大向斜上方強力彈射彈簧機構 (嚴格座標檢驗，左右嚴格鏡像對稱 x' = 388 - x):
  // 1. 左側彈簧 (x: 70, y: 206, length: 30, angle: -0.58)
  // 2. 右側彈簧 (x: 318, y: 206, length: 30, angle: 0.58)
  // 3. 中央拱形彈簧 (x: 194, y: 368, length: 32, kickPower: 16.0，大威力噴射彈回中上層)
  const springKickersRef = useRef<PinballSpringKicker[]>([
    {
      id: 1,
      x: 70,
      y: 206,
      length: 30, // 維持原尺寸 30px
      angle: -0.58, // 機械迎球傾角 (-33.2°)，其物理法線為朝向右上方 (-56.8°)
      kickAngle: -Math.PI / 2, // 預設值 (反彈方向已完全改由表面法線與真實物理碰撞定律決定)
      kickPower: 10.5, // 彈簧主動推進衝量
      compression: 0,
      sparkTimer: 0,
      label: 'LEFT AIR KICKER',
    },
    {
      id: 2,
      x: 318, // 嚴格鏡像校正為 x: 318 (388 - 70 = 318)
      y: 206,
      length: 30, // 維持原尺寸 30px
      angle: 0.58, // 機械迎球傾角 (+33.2°)，其物理法線為朝向左上方 (-123.2°)
      kickAngle: -Math.PI / 2, // 預設值 (反彈方向已完全改由表面法線與真實物理碰撞定律決定)
      kickPower: 11.5, // 適度提升衝量補償右側落差較小之重力動能，確保噴射推進高度與左側彈簧均衡
      compression: 0,
      sparkTimer: 0,
      label: 'RIGHT AIR KICKER',
    },
    {
      id: 3,
      x: 194,
      y: 368,
      length: 32,
      angle: 0,
      kickAngle: -Math.PI / 2,
      kickPower: 15.0, // 中央大弧形彈簧彈力衝量
      compression: 0,
      sparkTimer: 0,
      label: 'CENTER ARC KICKER',
      isArc: true,
      arcHeight: 6.5,
    },
  ]);

  // 頂部中央圓形不規則彈跳彈簧 (Top Round Pop Bumper)
  // 座標 (x: 194, y: 142, radius: 13.5)，位於頂部發射落球匯流核心，360 度不規則暴彈！
  const roundBumperRef = useRef<PinballRoundBumper>({
    id: 1,
    x: 194,
    y: 142,
    radius: 13.5,
    kickPower: 8.8,
    hitTimer: 0,
    label: 'TOP BUMPER',
  });

  // 下方長桿兩側靠牆三角弧形彈性區 (Convex Arc Slingshots)
  // 依要求縮短寬度，將底部定位基準點 (p2) 精準定於 20 分孔 (左:54, 444 / 右:334, 444) 正下方斜桿表面
  // 左右兩側寬度由 37px 縮短為 27px，完全釋放 10 分孔空間，兼顧彈跳流暢度
  const slingshotTrianglesRef = useRef<PinballSlingshotTriangle[]>([
    {
      id: 1,
      p1: { x: 27, y: 495 },   // 頂端點：緊貼左側牆壁 (x=27)
      p2: { x: 54, y: 566 },   // 內側斜邊下端點：精準定位於 20 分孔 (x:54, y:444) 正下方斜桿表面
      p3: { x: 27, y: 560 },   // 外下角頂點：貼左牆 (x=27) 與左下斜桿起點 (y=560) 的交會角
      cp: { x: 47, y: 524 },   // 外凸圓弧控制點：向中場微微外凸，形成彈性發射弧面
      kickAngle: -0.92, // 朝東北偏上 (約 -53 度)
      kickPower: 9.0,
      compression: 0,
      sparkTimer: 0,
      label: 'LEFT SLINGSHOT',
    },
    {
      id: 2,
      p1: { x: 361, y: 495 },  // 頂端點：緊貼右側牆壁 (x=361)
      p2: { x: 334, y: 566 },  // 內側斜邊下端點：精準定位於 20 分孔 (x:334, y:444) 正下方斜桿表面
      p3: { x: 361, y: 560 },  // 外下角頂點：貼右牆 (x=361) 與右下斜桿起點 (y=560) 的交會角
      cp: { x: 341, y: 524 },  // 外凸圓弧控制點：向中場微微外凸 (388 - 47 = 341，嚴格鏡像對稱)
      kickAngle: -2.22, // 朝西北偏上 (約 -127 度)
      kickPower: 9.0,
      compression: 0,
      sparkTimer: 0,
      label: 'RIGHT SLINGSHOT',
    },
  ]);

  // 發射通道出管口單向金屬逆止活門 (One-Way Wire Gate / Anti-Return Flap)
  // 發射時隨彈珠出管順暢頂開 (openAngle > 0)，彈珠出管後受重力與回位彈簧緊閉，盤面彈珠撞擊時自然反彈回盤面內部，物理上徹底杜絕掉回發射管與穿牆瞬移破圖
  const oneWayGateRef = useRef<{
    openAngle: number; // 0 = 閉合擋板狀態, > 0 = 出管頂開狀態
    sparkTimer: number;
  }>({
    openAngle: 0,
    sparkTimer: 0,
  });

  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const onUpdateBalanceRef = useRef(onUpdateBalance);
  onUpdateBalanceRef.current = onUpdateBalance;

  const onRoundBusyChangeRef = useRef(onRoundBusyChange);
  onRoundBusyChangeRef.current = onRoundBusyChange;

  // Synchronize shared balls count with localStorage events
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

  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.key === STORAGE_KEYS.BALLS) {
        try {
          const saved = localStorage.getItem(STORAGE_KEYS.BALLS);
          if (saved) {
            const val = parseInt(saved, 10);
            if (!isNaN(val) && val >= 0) {
              setBallsCount(val);
              ballsCountRef.current = val;
            }
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('casino-storage-saved', handleStorageChange);
    return () => {
      window.removeEventListener('casino-storage-saved', handleStorageChange);
    };
  }, []);

  // 經典疏釘優化陣列 (方案A: 52 顆關鍵導向與梅花交錯排釘，既保有 60 孔大盤澎湃視覺張力，又徹底杜絕卡球與夾角陷阱)
  useEffect(() => {
    const rawList: Array<{ x: number; y: number }> = [];

    const addPeg = (x: number, y: number) => {
      if (Math.abs(x - 194) < 1) {
        rawList.push({ x: 194, y });
      } else {
        rawList.push({ x, y });
        rawList.push({ x: 388 - x, y });
      }
    };

    // 1. 頂部經典圓弧拱形分流排釘陣 (以兩側風車 (70, 135) 與 (318, 135) 內上側為基點，呈完美等距圓弧排開，共 9 根精準對稱)
    // 圓弧幾何：圓心 (194, 177.5)，半徑 R ≈ 127.5，相鄰釘距均勻維持 33.1px，宛如精工拱橋般流暢分流
    addPeg(194, 50);  // 圓弧天頂尖兵釘 (θ = -90°，正中迎球分流)
    addPeg(161, 54);  // 圓弧次高分流釘 (θ = -105° / 鏡像 227，位於 60 分與 40 分孔上方)
    addPeg(128, 65);  // 圓弧中腰分流釘 (θ = -120° / 鏡像 260，微幅外移打散左側 30 分孔落球聚集)
    addPeg(102, 89);  // 圓弧次外分流釘 (θ = -135° / 鏡像 286，適度分流右側小力道出管球，將部分落球導向 Pop Bumper)
    addPeg(88, 102);  // 圓弧基底錨點釘 (左右鏡像 88 & 300，與風車保持 37.5px 寬裕動態通道，間隙 18px，徹底消除葉片與釘子反覆乒乓死循環)
    addPeg(146, 118); // 圓形彈簧右上/左上迎球導流釘 (左右對稱 146 & 242)：引導右側 40%~65% 中力道落球向左下方折射，大幅增加從右側碰撞球形彈簧的機會

    // 2. 雙大耳/雙鑽石四孔區定位釘 (圍繞 4 格鑽石孔，內部走道完全淨空無卡珠)
    addPeg(104, 150); // 鑽石外上翼
    addPeg(156, 150); // 鑽石內上翼 (通往 Pop Bumper 緩衝道)
    addPeg(104, 198); // 鑽石外下翼
    addPeg(156, 198); // 鑽石內下翼
    addPeg(166, 160); // 球型彈簧兩翼導流裙釘 (左右鏡像 166 & 222，將通道拓寬至 56px，消除阻礙使右側來球能順暢碰撞彈簧右腰)

    // 3. 中盤梅花排釘陣 (Classic Quincunx: 大幅提升中段隨機性與反彈層次，解決隨機性不足問題)
    addPeg(154, 234); // 150 冠王座左右兩翼護衛分流釘
    addPeg(98, 236);  // 中層外翼引導釘
    addPeg(194, 282); // 雙 90 分護衛孔下方尖兵釘 (正中央撞擊點，引發左右不規則偏轉)
    addPeg(146, 282); // 中層風車迎球引流釘 (左右對稱 146 & 242，移開正上方遮蔽，與外孔構成天然倒八字漏斗，導引落球精準灌入中層風車)
    addPeg(100, 298); // 走道階梯向內折射分流釘 (左右對稱 100 & 288，將外側落球以 45 度角彈向中層風車，顯著提升風車旋轉機率)
    addPeg(156, 304); // 100 冠孔上方斜向導引釘
    addPeg(68, 318);  // 外側走廊安全緩衝釘

    // 4. 中腹 100 冠孔與中央大弧形彈簧兩翼 (y: 340 ~ 390)
    addPeg(168, 360); // 100 冠孔下方分流釘
    addPeg(142, 372); // 中央大弧形彈簧兩翼安全導向釘
    addPeg(98, 368);  // 外側走道分流釘

    // 4.5. 最外兩側通道階梯式分流釘陣 (左右嚴格對稱：左 42/48/50，右 346/340/338)
    // 專門打破 90%+ 大力道被風車甩向外壁的「高速滑梯效應」，將貼壁滾球向內折射直衝左側彈簧！
    addPeg(34, 168);  // 【方案B・外壁導流碰珠釘】：貼緊外壁 (左右對稱 34 & 354)，將沿外壁高速下衝的大力道球精準以 45 度向內反彈至 (70, 206) 彈簧正面！
    addPeg(48, 246);  // 外側中階分流釘 (左右對稱 48 & 340，位於第1根側導流桿上方，將落球分岔為「彈向內場」或「沿外壁減速下滑」)
    addPeg(50, 338);  // 外側下階分流釘 (左右對稱 50 & 338，位於兩根側導流桿中間區間，徹底打散持續貼壁滾動的線性軌跡)

    // 5. 下方雙 300 終極特獎區梅花防護與心形分流釘陣 (y: 410 ~ 495)
    addPeg(153, 409); // 200 分孔左側斜上方分流釘 (左右對稱 153 & 235，精準座落於左側 70 分孔 (164, 448) 11 點半方向 / 右側 70 分孔 12 點半方向)
    addPeg(54, 418);  // 下方兩側風車外側 20 分孔正上方護衛分流釘 (左右對稱 54 & 334，高於孔位26px，阻絕外側落球直接墜入20分孔)
    addPeg(118, 420); // 雙 300 大獎孔正上方高位防護擋釘 (高於孔位26px，阻絕垂直直線電梯直墜)
    addPeg(96, 446);  // 300 孔外側護衛釘 (左右鏡像 96 & 292，與內移之風車保持安全旋轉空間，徹底拔除唇邊門神釘杜絕籃板助攻)
    addPeg(144, 444); // 300 孔內側護衛釘 (左右鏡像 144 & 244)
    addPeg(194, 442); // 200 冠孔下方中軸分流釘
    addPeg(182, 495); // 下方心形孔群導引釘

    // 6. 底部長斜桿與斜槽導流釘 (y: 500 ~ 560)
    addPeg(80, 508);  // 斜槽入口階梯導釘
    addPeg(116, 524); // 斜槽階梯分流釘
    addPeg(154, 536); // 下方斜桿入口引流釘
    addPeg(176, 542); // 底部雙 20 槽兩翼外向菱形分流釘 (左右對稱 176 & 212，將正中落球向外推移，打破雙 20 槽壟斷並活化斜槽外格)
    addPeg(194, 552); // 底部雙 20 槽上方中央尖兵分流釘

    // 10. Strict Anti-Blocking, Windmill Clearance & Smooth Rolling Validator:
    // 嚴格檢驗：絕不允許任何釘子擋在風車旋轉半徑內、孔洞上方通道或距離孔中心過近，並杜絕雙釘間隙卡球現象
    const validatedPegs = rawList.filter((p) => {
      if (p.x < 32 || p.x > 356 || p.y < 45 || p.y > 610) return false;

      // 檢查是否與任何風車機構重疊（保留安全旋轉空間）
      for (const w of windmillsRef.current) {
        const distToWindmill = Math.hypot(p.x - w.x, p.y - w.y);
        if (distToWindmill < w.radius + 8) {
          return false;
        }
      }

      // 檢查是否與彈射彈簧機構重疊（保留彈射震動空間）
      for (const k of springKickersRef.current) {
        const distToKicker = Math.hypot(p.x - k.x, p.y - k.y);
        if (distToKicker < k.length / 2 + 7) {
          return false;
        }
      }

      // 檢查是否與頂部圓形彈簧重疊
      const rb = roundBumperRef.current;
      if (rb && rb.radius > 0 && Math.hypot(p.x - rb.x, p.y - rb.y) < rb.radius + 8) {
        return false;
      }

      // 檢查是否與三角彈性彈射區重疊（確保三角內部與橡皮筋彈射周圍淨空）
      for (const s of slingshotTrianglesRef.current) {
        // Point in triangle bounding box check
        const minX = Math.min(s.p1.x, s.p2.x, s.p3.x) - 5;
        const maxX = Math.max(s.p1.x, s.p2.x, s.p3.x) + 5;
        const minY = Math.min(s.p1.y, s.p2.y, s.p3.y) - 5;
        const maxY = Math.max(s.p1.y, s.p2.y, s.p3.y) + 5;
        if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
          return false;
        }
      }

      // 確保斜向導流長軌道上方完全無阻擋釘 (left: 26, 560 to 178, 592; right: 360, 560 to 214, 592)
      if (p.x >= 24 && p.x <= 180 && p.y >= 548 && p.y <= 600) {
        const t = Math.max(0, Math.min(1, ((p.x - 26) * 152 + (p.y - 560) * 32) / (152 * 152 + 32 * 32)));
        const distToRail = Math.hypot(p.x - (26 + t * 152), p.y - (560 + t * 32));
        if (distToRail < 11) return false;
      }
      if (p.x >= 210 && p.x <= 362 && p.y >= 548 && p.y <= 600) {
        const t = Math.max(0, Math.min(1, ((p.x - 360) * (-146) + (p.y - 560) * 32) / (146 * 146 + 32 * 32)));
        const distToRail = Math.hypot(p.x - (360 + t * (-146)), p.y - (560 + t * 32));
        if (distToRail < 11) return false;
      }

      for (const h of VINTAGE_PINBALL_HOLES) {
        // Distance check (保持孔周圍充足進球空間)
        const dist = Math.hypot(p.x - h.x, p.y - h.y);
        if (dist < 14.8) return false;
        // Check 20px vertical entrance corridor directly above hole (雙 300 孔 id:43, 47 設有防護擋釘，允許其在正上方攔截電梯直落)
        if (p.y < h.y && p.y > h.y - 20 && Math.abs(p.x - h.x) < 10.2) {
          if (h.id === 43 || h.id === 47) {
            // 允許 300 孔正上方防護擋釘存在
          } else {
            return false;
          }
        }
        // Check score label tag area directly below hole
        if (p.y >= h.y + h.radius && p.y <= h.y + h.radius + 13 && Math.abs(p.x - h.x) < 11.5) {
          return false;
        }
      }
      return true;
    });

    // 11. Anti-Wedge Spacing Pass: 消除釘距在 9.5px~17.5px 之間的卡球陷阱區
    const cleanPegs: Array<{ x: number; y: number }> = [];
    for (const p of validatedPegs) {
      const isWedge = cleanPegs.some((existing) => {
        const d = Math.hypot(p.x - existing.x, p.y - existing.y);
        return d >= 9.5 && d < 17.5;
      });
      if (!isWedge) {
        cleanPegs.push(p);
      }
    }

    pegs.current = cleanPegs;
  }, []);

  // Silky-Smooth Spring Pull Charging Animation:
  // Direct zero-lag DOM updates for high-frame-rate tactile feel
  useEffect(() => {
    let id: number;
    if (isPulling) {
      const startTime = performance.now();
      let lastStateUpdate = 0;

      const loop = (now: number) => {
        const elapsed = now - startTime;
        // 2000ms period (1000ms 0->100%, 1000ms 100->0%)
        const cycle = elapsed % 2000;
        let pull: number;
        let dir: 'up' | 'down';

        if (cycle <= 1000) {
          pull = (cycle / 1000) * 100;
          dir = 'up';
        } else {
          pull = 100 - ((cycle - 1000) / 1000) * 100;
          dir = 'down';
        }

        pull = Math.max(0, Math.min(100, pull));
        springPullRef.current = pull;

        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${Math.max(2, pull)}%`;
        }
        if (plungerRodRef.current) {
          plungerRodRef.current.style.height = `${14 + (pull / 100) * 20}px`;
        }

        if (now - lastStateUpdate > 30) {
          lastStateUpdate = now;
          setSpringPull(pull);
          setPullDirection(dir);
        }

        id = requestAnimationFrame(loop);
      };
      id = requestAnimationFrame(loop);
    } else {
      setSpringPull(0);
      springPullRef.current = 0;
      setPullDirection('up');
      if (progressBarRef.current) {
        progressBarRef.current.style.width = '0%';
      }
      if (plungerRodRef.current) {
        plungerRodRef.current.style.height = '14px';
      }
    }
    return () => cancelAnimationFrame(id);
  }, [isPulling]);

  // Machine Nudge / Tilt Feature:
  const nudgeMachine = useCallback((direction: 'left' | 'right' | 'up') => {
    if (isTilted) {
      sound.playDropFail();
      toastService.warn('🚨 機台處於 TILT 鎖定狀態，暫時無法晃動！');
      return;
    }

    const now = Date.now();
    nudgeTimestampsRef.current = nudgeTimestampsRef.current.filter((t) => now - t < 2500);
    nudgeTimestampsRef.current.push(now);
    const count = nudgeTimestampsRef.current.length;
    setNudgeCount(count);

    if (count >= 3) {
      setIsTilted(true);
      setTiltCooldownRemaining(3);
      sound.playLoss();
      toastService.error('🚨 TILT! 搖晃機台過度！觸發震盪防弊警報，機台鎖定 3 秒！');

      let remaining = 3;
      if (tiltTimerRef.current) clearInterval(tiltTimerRef.current);
      tiltTimerRef.current = setInterval(() => {
        remaining -= 1;
        setTiltCooldownRemaining(remaining);
        if (remaining <= 0) {
          if (tiltTimerRef.current) clearInterval(tiltTimerRef.current);
          setIsTilted(false);
          setNudgeCount(0);
          nudgeTimestampsRef.current = [];
          toastService.info('🟢 機台震動警報已解除，恢復正常。');
        }
      }, 1000);

      setNudgeOffset({ x: (Math.random() - 0.5) * 14, y: -8 });
      setTimeout(() => setNudgeOffset({ x: 0, y: 0 }), 160);
      return;
    }

    sound.playPop();

    const recoilX = direction === 'left' ? -7 : direction === 'right' ? 7 : 0;
    const recoilY = direction === 'up' ? -7 : 3;
    setNudgeOffset({ x: recoilX, y: recoilY });
    setTimeout(() => {
      setNudgeOffset({ x: -recoilX * 0.4, y: -recoilY * 0.4 });
      setTimeout(() => setNudgeOffset({ x: 0, y: 0 }), 80);
    }, 80);

    activeBallsRef.current.forEach((b) => {
      if (!b.active) return;

      // 嚴格落袋定局防護：已入孔或已結算之彈珠代表已進落球槽，不受機台搖晃干擾，徹底根絕雙重給分與籌碼漏洞
      if (b.inHole || b.scoreProcessed) return;

      if (!b.inHole) {
        if (direction === 'left') {
          b.vx -= 1.8 + (Math.random() - 0.5) * 0.4;
          b.vy -= 0.15;
        } else if (direction === 'right') {
          b.vx += 1.8 + (Math.random() - 0.5) * 0.4;
          b.vy -= 0.15;
        } else if (direction === 'up') {
          b.vy -= 2.2 + Math.random() * 0.5;
          b.vx += (Math.random() - 0.5) * 0.6;
        }
      }
    });

    if (count === 2) {
      toastService.warn('⚠️ 機台晃動感應劇烈！再晃一次將觸發 TILT 鎖死！');
    }
  }, [isTilted]);

  useEffect(() => {
    return () => {
      if (tiltTimerRef.current) clearInterval(tiltTimerRef.current);
    };
  }, []);

  // Keyboard Controls:
  // - Spacebar: Charge & launch plunger (player must actively control hold & release)
  // - Key A / Left: Nudge left
  // - Key D / Right: Nudge right
  // - Key W / Up: Nudge up
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
        if (ballsCountRef.current <= 0 || isLaunchingRef.current || isPullingRef.current) return;
        isPullingRef.current = true;
        pullStartTimestampRef.current = performance.now();
        setIsPulling(true);
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        e.preventDefault();
        nudgeMachine('left');
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        e.preventDefault();
        nudgeMachine('right');
      } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        nudgeMachine('up');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isPullingRef.current) {
        e.preventDefault();
        const launchPull = springPullRef.current;
        isPullingRef.current = false;
        setIsPulling(false);
        launchMarble(launchPull);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nudgeMachine]);

  // Handle purchasing shared ball packages
  const handleBuyBalls = (pkg: BallPackage) => {
    if (balanceRef.current < pkg.cost) {
      sound.playLoss();
      toastService.warn(`🚨 籌碼不足！購買 ${pkg.balls} 顆彈珠需要 $${pkg.cost.toLocaleString()} 籌碼。`);
      return;
    }

    const nextBal = balanceRef.current - pkg.cost;
    balanceRef.current = nextBal;
    onUpdateBalanceRef.current(nextBal);

    updateBallsCount(ballsCountRef.current + pkg.balls);
    sound.playChip();
    toastService.success(`🛒 成功購買 ${pkg.balls} 顆彈珠！(扣除 $${pkg.cost.toLocaleString()} 籌碼，與彈珠台共用)`);
  };

  // Launch steel marble with player-controlled authentic physics
  const launchMarble = (customPull?: number) => {
    const now = Date.now();

    if (isLaunchingRef.current || now - lastLaunchTimestampRef.current < 450) {
      return;
    }

    const ballInChamber = activeBallsRef.current.some(
      (b) => b.active && b.x > 364 && b.y > 200
    );
    if (ballInChamber) {
      return;
    }

    if (ballsCountRef.current <= 0) {
      toastService.warn('彈珠數量為 0！請先在右側購買彈珠套餐即可發射。');
      return;
    }

    isLaunchingRef.current = true;
    lastLaunchTimestampRef.current = now;

    // Direct active player control
    const effectivePull = typeof customPull === 'number' ? customPull : springPullRef.current;
    setLastLaunchPull(Math.round(effectivePull));

    updateBallsCount(ballsCountRef.current - 1);
    sound.playPop();

    sessionLaunchesRef.current += 1;
    if (sessionLaunchesRef.current >= 30) {
      unlockHiddenCollectible('col-pinball-soda');
    }

    dispatchBetAction({
      gameId: 'pinball',
      betType: 'launch',
      amount: 50,
      label: '發射彈珠',
    });

    // Calibrated deterministic speed for realistic wooden board with gravity = 0.13:
    // Plunger is at y: 575. Track throat exit is at x: 337, y: 108.
    // 嚴格消除隨機擾動 (移除 speedJitter & initialVx)，確保相同力道下彈珠飛行軌跡 100% 一致與高度可重複性
    const pullRatio = Math.max(0, Math.min(1, effectivePull / 100));
    const launchVelocity = 12.0 + pullRatio * 10.0;
    const initialVx = 0; // 發射管中央垂直平順上升，杜絕在管內隨機撞壁

    const newBall: PinBall = {
      id: `${Date.now()}_${Math.random()}`,
      x: 379, // 正好位於發射管道中央 (370 ~ 388)
      y: 575,
      vx: initialVx,
      vy: -launchVelocity,
      active: true,
      hasExitedTube: false,
      scale: 1,
      alpha: 1,
      launchPull: effectivePull,
      stuckFrames: 0,
    };

    activeBallsRef.current.push(newBall);
    setSpringPull(0);
    springPullRef.current = 0;
    if (onRoundBusyChangeRef.current) onRoundBusyChangeRef.current(true);

    setTimeout(() => {
      isLaunchingRef.current = false;
    }, 380);
  };

  // Main Canvas Physics & Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let wasBusy = false;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // 放大盤面尺寸至 420 x 650，給予足夠空間降低孔洞密度與流暢滾球體驗
    const displayWidth = 420;
    const displayHeight = 650;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    // 縮小彈珠尺寸至 4.2px (原 6.5px)，在寬敞盤面中靈活穿梭
    const marbleRadius = 4.2;
    // 適中自然重力加速度 (0.13)，兼顧彈跳節奏與落下速度
    const gravity = 0.13;

    // Board Geometry (放大盤面幾何)
    const archCenterX = 210;
    const archCenterY = 195;
    const archOuterRadius = 184;
    const innerRailRadius = 154;
    const archTrackRadius = archOuterRadius - marbleRadius; // 179.8

    // Throat Exit Point at upper curve (angle ≈ -34.4°)
    const throatExitAngle = -0.60;
    const throatExitX = archCenterX + innerRailRadius * Math.cos(throatExitAngle); // ≈ 337
    const throatExitY = archCenterY + innerRailRadius * Math.sin(throatExitAngle); // ≈ 108

    const trayTopY = 540;
    const trayBottomY = 605;

    const render = () => {
      if (!running) return;

      // 1. Authentic Golden Brass Plate & Vintage Night Market Frame (Image 3)
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Solid Metallic Golden Brass Plate Surface (實體照片黃銅板質感)
      const brassGrad = ctx.createLinearGradient(0, 0, displayWidth, displayHeight);
      brassGrad.addColorStop(0, '#fef08a');
      brassGrad.addColorStop(0.2, '#fde047');
      brassGrad.addColorStop(0.5, '#eab308');
      brassGrad.addColorStop(0.85, '#ca8a04');
      brassGrad.addColorStop(1, '#a16207');
      ctx.fillStyle = brassGrad;
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Fine horizontal brushed metal sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let y = 10; y < displayHeight; y += 8) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(displayWidth - 20, y);
        ctx.stroke();
      }

      // Outer Classic Taiwan Night Market Blue Wooden Frame (如照片藍色外框)
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1e3a8a';
      ctx.strokeRect(5, 5, displayWidth - 10, displayHeight - 10);

      // Inner Red Trim Accent
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#dc2626';
      ctx.strokeRect(10, 10, displayWidth - 20, displayHeight - 20);

      // Top Vintage Header Bezel (標語移至最上層玻璃貼紙呈現)
      ctx.save();
      ctx.fillStyle = '#2d180d';
      ctx.strokeStyle = '#5c2d12';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(40, 12, displayWidth - 80, 18, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Left Border Vintage Warning: 「重疊也算分數」
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.font = '900 7px sans-serif';
      ctx.textAlign = 'center';
      const leftText = '重疊也算分數';
      for (let i = 0; i < leftText.length; i++) {
        ctx.fillText(leftText[i], 16, 170 + i * 11);
      }
      ctx.restore();

      // Right Launcher Border Vintage Slogan: 「每局10元 四顆球分數加總」
      ctx.save();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      const rightText = '四顆球分數加總';
      for (let i = 0; i < rightText.length; i++) {
        ctx.fillText(rightText[i], 406, 200 + i * 13);
      }
      ctx.restore();

      // 2. Carved Top Arch Dome
      ctx.save();
      ctx.beginPath();
      ctx.arc(archCenterX, archCenterY, archOuterRadius, -Math.PI, 0, false);
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(archCenterX, archCenterY, archOuterRadius - 3, -Math.PI, 0, false);
      ctx.strokeStyle = 'rgba(60, 25, 8, 0.25)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Launch Lane Curved Inner Rail
      ctx.beginPath();
      ctx.arc(archCenterX, archCenterY, innerRailRadius, throatExitAngle, 0, false);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Guidance dashes along the arch curve
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.arc(archCenterX, archCenterY, (archOuterRadius + innerRailRadius) / 2, -Math.PI * 0.7, throatExitAngle, false);
      ctx.strokeStyle = 'rgba(180, 110, 40, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // 出管口單向金屬逆止活門 (One-Way Wire Gate / Anti-Return Flap)
      // 依據出球旋轉角度 openAngle 動態渲染，黃銅樞紐與鍍鉻彈性簧片，出球順暢開啟、掉落自然阻擋
      const gateRadCos = Math.cos(throatExitAngle);
      const gateRadSin = Math.sin(throatExitAngle);
      const gatePivotX = archCenterX + innerRailRadius * gateRadCos; // 337.1
      const gatePivotY = archCenterY + innerRailRadius * gateRadSin; // 108.1
      const gateOuterX = archCenterX + archOuterRadius * gateRadCos; // 361.9
      const gateOuterY = archCenterY + archOuterRadius * gateRadSin; // 91.1
      const currentGateAngle = oneWayGateRef.current.openAngle;

      ctx.save();
      // 黃銅旋轉樞軸 (Pivot Rivet)
      ctx.beginPath();
      ctx.arc(gatePivotX, gatePivotY, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#b45309';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // 單向活板簧片 (Wire Gate Blade)
      ctx.save();
      ctx.translate(gatePivotX, gatePivotY);
      // 當彈珠推開門時，簧片向外弧順時針微翹 (openAngle > 0)
      ctx.rotate(-currentGateAngle * 0.45);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gateOuterX - gatePivotX, gateOuterY - gatePivotY);
      ctx.strokeStyle = currentGateAngle > 0.05 ? '#38bdf8' : '#e2e8f0';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.shadowColor = currentGateAngle > 0.05 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = currentGateAngle > 0.05 ? 6 : 2;
      ctx.stroke();
      ctx.restore();

      // 活門受擊火花效果
      if (oneWayGateRef.current.sparkTimer > 0) {
        ctx.beginPath();
        const midX = (gatePivotX + gateOuterX) / 2;
        const midY = (gatePivotY + gateOuterY) / 2;
        ctx.arc(midX, midY, 5 + oneWayGateRef.current.sparkTimer, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();

      // 3. Launch Lane Rails & Playfield Left Wall
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(26, archCenterY);
      ctx.lineTo(26, 612);
      ctx.stroke();

      // Launch Lane Inner Divider Wall
      ctx.beginPath();
      ctx.moveTo(364, archCenterY);
      ctx.lineTo(364, 575);
      ctx.stroke();

      // Launch Lane Right Outer Wall
      ctx.beginPath();
      ctx.moveTo(394, archCenterY);
      ctx.lineTo(394, 612);
      ctx.stroke();

      // 4. 左右側導流短橫桿 (右側3根；左側2根交錯對應於右側短桿中間的區間高度，引流防直墜)
      const rightDeflectorWires = [
        { x1: 364, y1: 248, x2: 346, y2: 265 },
        { x1: 364, y1: 330, x2: 346, y2: 347 },
        { x1: 364, y1: 420, x2: 346, y2: 437 },
      ];
      const leftDeflectorWires = [
        { x1: 26, y1: 289, x2: 44, y2: 306 },
        { x1: 26, y1: 375, x2: 44, y2: 392 },
      ];
      [...rightDeflectorWires, ...leftDeflectorWires].forEach((w) => {
        // Wall Rivet
        ctx.beginPath();
        ctx.arc(w.x1, w.y1, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#78350f';
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Spring Deflector Wire (平滑圓頭收尾，不畫額外擋板圓球)
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.stroke();
      });

      // 4. Vintage Pinball Scoring Holes (依圖3實體孔洞與分數標籤)
      VINTAGE_PINBALL_HOLES.forEach((hole) => {
        // Outer Brass Bevel Ring
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius + 2.0, 0, Math.PI * 2);
        ctx.fillStyle = '#92400e';
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Deep Inner Hole Cutout
        const holeGrad = ctx.createRadialGradient(hole.x - 2, hole.y - 2, 1, hole.x, hole.y, hole.radius);
        holeGrad.addColorStop(0, '#261b11');
        holeGrad.addColorStop(0.6, '#140c06');
        holeGrad.addColorStop(1, '#050302');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Shadow Ring
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Authentic White Paper Sticker Badge with Red Bold Score Numbers (僅保留分數，無冗贅文字)
        const tagW = hole.points >= 100 ? 21 : 15;
        const tagH = 9.0;
        const tagX = hole.x - tagW / 2;
        const tagY = hole.y + hole.radius + 1.2;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 2);
        ctx.fill();
        ctx.stroke();

        // Red bold score point text
        ctx.fillStyle = '#dc2626';
        ctx.font = '900 7.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${hole.points}`, hole.x, tagY + tagH / 2 + 0.5);
        ctx.restore();
      });

      // 5. Bottom Diagonal Slanted Rails & Collection Bed (最下兩條長橫桿：緊貼外壁，阻擋彈珠並順暢引流至正下方緊鄰的雙 20 分孔)
      // Left slanted guide rail: 起點緊貼左側木壁 (26, 560)，斜向下阻擋並精確引導至左 20 孔左側 (178, 592)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(26, 560);
      ctx.lineTo(178, 592);
      ctx.stroke();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Right slanted guide rail: 起點緊貼右側導軌壁 (360, 560)，斜向下阻擋並精確引導至右 20 孔右側 (214, 592)
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(360, 560);
      ctx.lineTo(214, 592);
      ctx.stroke();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bottom Bed Board (底部堅固實木底板：位於 y=614，完整避開兩孔下方分數標籤，字體絕不被遮擋)
      ctx.strokeStyle = '#5c2d12';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(26, 614);
      ctx.lineTo(364, 614);
      ctx.stroke();

      // 6. Brass Nail Pegs (實體金屬釘陣)
      pegs.current.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x + 1, p.y + 1.5, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(60, 25, 8, 0.35)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x - 0.8, p.y - 0.8, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      // 6.5. Retro Night Market Rotating Windmills (夜市旋轉彩色風車機構)
      windmillsRef.current.forEach((w) => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.rotate(w.angle);

        // Mounting outer guide ring on playfield
        ctx.beginPath();
        ctx.arc(0, 0, w.radius + 1.2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(60, 25, 8, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4 Pinwheel curved blades
        const step = (Math.PI * 2) / w.bladeCount;
        for (let i = 0; i < w.bladeCount; i++) {
          ctx.save();
          ctx.rotate(i * step);

          // Curved aerofoil paddle
          ctx.beginPath();
          ctx.moveTo(2.5, -2.5);
          ctx.lineTo(w.radius - 2.5, -3.8);
          ctx.quadraticCurveTo(w.radius + 1.2, 0, w.radius - 2.5, 3.8);
          ctx.lineTo(2.5, 2.5);
          ctx.closePath();

          ctx.fillStyle = w.colors[i % w.colors.length];
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Reflective curved shine on blade
          ctx.beginPath();
          ctx.moveTo(3.5, -1.2);
          ctx.lineTo(w.radius - 3.2, -1.8);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          ctx.restore();
        }

        // Central Polished Brass Rivet Pin
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.strokeStyle = '#854d0e';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Rivet highlight
        ctx.beginPath();
        ctx.arc(-0.8, -0.8, 1.0, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      });

      // 6.6. Retro Diagonal Spring Slingshot Kickers (夜市斜上方金屬強力彈簧機構)
      springKickersRef.current.forEach((k) => {
        ctx.save();
        ctx.translate(k.x, k.y);
        ctx.rotate(k.angle);

        const halfL = k.length / 2;
        const comp = k.compression; // 0 ~ 1
        const pushBack = comp * 3.5; // 撞擊時向下壓縮

        // 1. Base Mounting Bracket
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-halfL - 2, 4, k.length + 4, 6, 2);
        ctx.fill();
        ctx.stroke();

        // 2. Twin Coiled Steel Springs (雙重緊繃彈簧圈)
        const springPositions = [-halfL * 0.55, halfL * 0.55];
        springPositions.forEach((sx) => {
          ctx.strokeStyle = k.sparkTimer > 0 ? '#fef08a' : '#cbd5e1';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          const topY = -1 + pushBack;
          const bottomY = 5;
          const turns = 4;
          const stepY = (bottomY - topY) / turns;
          ctx.moveTo(sx, bottomY);
          for (let c = 0; c < turns; c++) {
            const my = bottomY - (c + 0.5) * stepY;
            const ny = bottomY - (c + 1) * stepY;
            ctx.lineTo(c % 2 === 0 ? sx - 3.2 : sx + 3.2, my);
            ctx.lineTo(sx, ny);
          }
          ctx.stroke();
        });

        // 3. Polished Steel Strike Bumper Face (打擊擋板)
        const bumperY = -4 + pushBack;
        ctx.save();
        if (k.sparkTimer > 0) {
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 10;
        }
        // Bumper Bar Gradient
        const bumpGrad = ctx.createLinearGradient(0, bumperY - (k.isArc ? 8 : 3), 0, bumperY + 3);
        bumpGrad.addColorStop(0, k.sparkTimer > 0 ? '#fffbeb' : '#f8fafc');
        bumpGrad.addColorStop(0.5, k.sparkTimer > 0 ? '#fde047' : '#94a3b8');
        bumpGrad.addColorStop(1, k.sparkTimer > 0 ? '#eab308' : '#475569');
        ctx.fillStyle = bumpGrad;
        ctx.strokeStyle = k.sparkTimer > 0 ? '#ea580c' : '#334155';
        ctx.lineWidth = 1.2;

        if (k.isArc && k.arcHeight) {
          // 圓弧形拱起擋板 (Convex Arc Bumper Face)
          const arcH = k.arcHeight;
          ctx.beginPath();
          ctx.moveTo(-halfL, bumperY + 2);
          ctx.quadraticCurveTo(0, bumperY - arcH, halfL, bumperY + 2);
          ctx.quadraticCurveTo(0, bumperY - arcH + 4.5, -halfL, bumperY + 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // 傳統直線擋板
          ctx.beginPath();
          ctx.roundRect(-halfL, bumperY - 2.5, k.length, 5, 2.5);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();

        // 4. Directional Accent Arrows on Bumper (指示朝斜上方彈射的三角形箭頭標記)
        ctx.fillStyle = k.sparkTimer > 0 ? '#dc2626' : '#ea580c';
        ctx.beginPath();
        const arrowTipY = (k.isArc && k.arcHeight) ? (bumperY - k.arcHeight - 2) : (bumperY - 5);
        ctx.moveTo(0, arrowTipY);
        ctx.lineTo(-3, arrowTipY + 3);
        ctx.lineTo(3, arrowTipY + 3);
        ctx.closePath();
        ctx.fill();

        // 5. Strike Spark Burst (撞擊瞬間金屬火花)
        if (k.sparkTimer > 0) {
          ctx.save();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.4;
          for (let s = 0; s < 6; s++) {
            const spAngle = (Math.PI * 2 * s) / 6 + (k.sparkTimer * 0.2);
            const r1 = 5;
            const r2 = 9 + (k.sparkTimer % 3) * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(spAngle) * r1, bumperY + Math.sin(spAngle) * r1);
            ctx.lineTo(Math.cos(spAngle) * r2, bumperY + Math.sin(spAngle) * r2);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
      });

      // 6.7. Vintage Classic Slingshot Triangles (長斜桿兩側大型三角彈性彈射區 - 方案 C)
      slingshotTrianglesRef.current.forEach((s) => {
        ctx.save();
        const comp = s.compression; // 0 ~ 1
        // Active strike face: vector from p1 (top) to p2 (inner bottom)
        const fdx = s.p2.x - s.p1.x;
        const fdy = s.p2.y - s.p1.y;
        const flen = Math.hypot(fdx, fdy);
        const fnx = -fdy / flen; // Inward/outward normal
        const fny = fdx / flen;

        // 1. Triangular Wooden/Brass Base Plate with Convex Arc Face
        ctx.beginPath();
        ctx.moveTo(s.p1.x, s.p1.y);
        ctx.quadraticCurveTo(s.cp.x, s.cp.y, s.p2.x, s.p2.y);
        ctx.lineTo(s.p3.x, s.p3.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(120, 53, 15, 0.45)';
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 2. Interior Warning Graphic Decal (經典復古閃電/箭頭標記)
        const centerX = (s.p1.x + s.p2.x + s.p3.x + s.cp.x) / 4;
        const centerY = (s.p1.y + s.p2.y + s.p3.y + s.cp.y) / 4;
        ctx.save();
        ctx.fillStyle = s.sparkTimer > 0 ? '#fef08a' : '#ea580c';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 3. High-Tension White/Yellow Elastic Rubber Band (面朝中場的外凸弧形彈性橡皮面)
        // 撞擊觸發時，橡皮面往內側凹陷，隨後急速暴彈回位
        const dentSign = s.id === 1 ? -1 : 1;
        const dynCpX = s.cp.x + (dentSign * Math.abs(fnx)) * (comp * 3.5);
        const dynCpY = s.cp.y + (fny) * (comp * 3.5);

        ctx.beginPath();
        ctx.moveTo(s.p1.x, s.p1.y);
        ctx.quadraticCurveTo(dynCpX, dynCpY, s.p2.x, s.p2.y);
        ctx.strokeStyle = s.sparkTimer > 0 ? '#fef08a' : '#ffffff';
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        if (s.sparkTimer > 0) {
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 12;
        }
        ctx.stroke();

        // Outer rubber rim
        ctx.beginPath();
        ctx.moveTo(s.p1.x, s.p1.y);
        ctx.lineTo(s.p3.x, s.p3.y);
        ctx.lineTo(s.p2.x, s.p2.y);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 4. Heavy Brass Posts at all 3 vertices (三顆黃銅固定大柱)
        [s.p1, s.p2, s.p3].forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x + 0.8, pt.y + 1.2, 3.8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(60, 25, 8, 0.4)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3.8, 0, Math.PI * 2);
          ctx.fillStyle = '#fef08a';
          ctx.fill();
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Highlight
          ctx.beginPath();
          ctx.arc(pt.x - 1, pt.y - 1, 1.0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });

        // 5. Strike Spark Burst on Slingshot
        if (s.sparkTimer > 0) {
          ctx.save();
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          for (let sp = 0; sp < 8; sp++) {
            const angle = (Math.PI * 2 * sp) / 8 + (s.sparkTimer * 0.3);
            const r1 = 6;
            const r2 = 12 + (s.sparkTimer % 3) * 3;
            ctx.beginPath();
            ctx.moveTo(s.cp.x + Math.cos(angle) * r1, s.cp.y + Math.sin(angle) * r1);
            ctx.lineTo(s.cp.x + Math.cos(angle) * r2, s.cp.y + Math.sin(angle) * r2);
            ctx.stroke();
          }
          ctx.restore();
        }

        ctx.restore();
      });

      // 6.8. Vintage Round Pop Bumper (正中間上方頂端圓形不規則彈跳彈簧)
      const rb = roundBumperRef.current;
      if (rb && rb.radius > 0) {
        ctx.save();
        const rbScale = rb.hitTimer > 0 ? 1.0 + (rb.hitTimer / 15) * 0.18 : 1.0;
        const curR = rb.radius * rbScale;

        // Drop shadow
        ctx.beginPath();
        ctx.arc(rb.x + 1.2, rb.y + 1.8, curR + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(40, 15, 5, 0.45)';
        ctx.fill();

        // Outer Brass Flange Ring
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, curR + 1.2, 0, Math.PI * 2);
        ctx.fillStyle = rb.hitTimer > 0 ? '#fef08a' : '#b45309';
        ctx.fill();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Middle Chrome Coiled Spring Ring (360度環形緊繃彈簧圈)
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, curR - 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = rb.hitTimer > 0 ? '#ffffff' : '#cbd5e1';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Inner Glowing Bumper Cap
        const rbCapGrad = ctx.createRadialGradient(rb.x - curR * 0.3, rb.y - curR * 0.3, 1, rb.x, rb.y, curR - 3.5);
        if (rb.hitTimer > 0) {
          rbCapGrad.addColorStop(0, '#ffffff');
          rbCapGrad.addColorStop(0.4, '#fde047');
          rbCapGrad.addColorStop(1, '#ea580c');
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 16;
        } else {
          rbCapGrad.addColorStop(0, '#fef08a');
          rbCapGrad.addColorStop(0.5, '#eab308');
          rbCapGrad.addColorStop(1, '#9a3412');
        }
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, curR - 3.5, 0, Math.PI * 2);
        ctx.fillStyle = rbCapGrad;
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Center Star / Lightning Symbol
        ctx.fillStyle = rb.hitTimer > 0 ? '#dc2626' : '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', rb.x, rb.y);

        // Hit Burst Sparks
        if (rb.hitTimer > 0) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 1.6;
          for (let sp = 0; sp < 8; sp++) {
            const spAngle = (Math.PI * 2 * sp) / 8 + (rb.hitTimer * 0.25);
            const r1 = curR + 2;
            const r2 = curR + 7 + (rb.hitTimer % 3) * 3;
            ctx.beginPath();
            ctx.moveTo(rb.x + Math.cos(spAngle) * r1, rb.y + Math.sin(spAngle) * r1);
            ctx.lineTo(rb.x + Math.cos(spAngle) * r2, rb.y + Math.sin(spAngle) * r2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // Subtle Glass Case Glare (復古玻璃罩反光)
      ctx.save();
      const glassGrad = ctx.createLinearGradient(0, 0, displayWidth, displayHeight);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      glassGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
      glassGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.0)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(26, 30, 338, 580);
      ctx.restore();

      // 7. Physical Plunger Spring & Chamber in Launch Tube (x: 379)
      const currentPull = springPullRef.current;
      const plungerRestY = 575;
      const plungerCompressedY = plungerRestY + (currentPull / 100) * 20;

      // Spring coils
      ctx.save();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const coilTop = plungerCompressedY + 6;
      const coilBottom = 612;
      const coilTurns = 6;
      const coilStep = (coilBottom - coilTop) / coilTurns;
      ctx.moveTo(379, coilBottom);
      for (let c = 0; c < coilTurns; c++) {
        const yMid = coilBottom - (c + 0.5) * coilStep;
        const yNext = coilBottom - (c + 1) * coilStep;
        ctx.lineTo(c % 2 === 0 ? 374 : 384, yMid);
        ctx.lineTo(379, yNext);
      }
      ctx.stroke();

      // Plunger Steel Strike Plate
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.fillRect(373, plungerCompressedY, 12, 5);
      ctx.strokeRect(373, plungerCompressedY, 12, 5);

      // Idle ball resting on plunger tip when chamber is ready
      const activeInChamber = activeBallsRef.current.some((b) => b.active && b.x > 364 && b.y > 250);
      if (!activeInChamber && ballsCountRef.current > 0) {
        const idleBallY = plungerCompressedY - marbleRadius;
        const idleGrad = ctx.createRadialGradient(377, idleBallY - 2, 1, 379, idleBallY, marbleRadius);
        idleGrad.addColorStop(0, '#ffffff');
        idleGrad.addColorStop(0.3, '#f1f5f9');
        idleGrad.addColorStop(0.8, '#94a3b8');
        idleGrad.addColorStop(1, '#475569');

        ctx.beginPath();
        ctx.arc(379, idleBallY, marbleRadius, 0, Math.PI * 2);
        ctx.fillStyle = idleGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(376.5, idleBallY - 2.5, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.restore();

      // Draw TILT! warning overlay on table if active
      if (isTilted) {
        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(10, 10, displayWidth - 20, displayHeight - 20);

        ctx.font = 'black 36px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText('T I L T !', displayWidth / 2, displayHeight / 2 - 20);

        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText(`晃動過度警報 (${tiltCooldownRemaining}s)`, displayWidth / 2, displayHeight / 2 + 16);
        ctx.restore();
      }

      // Update Windmills Rotation and Natural Drag (風車旋轉動力學 - 提升轉速上限與靈敏度，增加物理隨機性)
      windmillsRef.current.forEach((w) => {
        w.angle += w.angularVelocity;
        w.angularVelocity *= 0.9955;
        if (Math.abs(w.angularVelocity) < 0.0003) {
          w.angularVelocity = 0;
        }
      });

      // Update Spring Kickers Animation (彈簧迅速回彈復位與火花消退)
      springKickersRef.current.forEach((k) => {
        if (k.compression > 0) {
          k.compression = Math.max(0, k.compression - 0.12);
        }
        if (k.sparkTimer > 0) {
          k.sparkTimer -= 1;
        }
      });

      // Update Slingshot Triangles Animation (三角橡皮迅速彈回與火花消退)
      slingshotTrianglesRef.current.forEach((s) => {
        if (s.compression > 0) {
          s.compression = Math.max(0, s.compression - 0.14);
        }
        if (s.sparkTimer > 0) {
          s.sparkTimer -= 1;
        }
      });

      // Update Round Pop Bumper Hit Animation
      if (roundBumperRef.current.hitTimer > 0) {
        roundBumperRef.current.hitTimer -= 1;
      }

      // Update One-Way Wire Gate Animation (出管單向活板門迅速回位復原與火花消退)
      if (oneWayGateRef.current.openAngle > 0) {
        oneWayGateRef.current.openAngle = Math.max(0, oneWayGateRef.current.openAngle - 0.12);
      }
      if (oneWayGateRef.current.sparkTimer > 0) {
        oneWayGateRef.current.sparkTimer -= 1;
      }

      // 8. Update & Draw Steel Balls (Enhanced Physics Engine with Sub-Stepping & Windmills)
      const currentBalls = activeBallsRef.current;
      const nextBalls: PinBall[] = [];
      const SUB_STEPS = 6;
      const dt = 1 / SUB_STEPS;

      currentBalls.forEach((b) => {
        if (!b.active) return;

        // Anti-Stuck Watchdog: active and sensitive to avoid marbles freezing anywhere on the slope
        if (typeof b.lastX === 'number' && typeof b.lastY === 'number') {
          const moved = Math.hypot(b.x - b.lastX, b.y - b.lastY);
          if (moved < 0.15 && !b.inHole && b.hasExitedTube && b.y < trayBottomY) {
            b.stuckFrames = (b.stuckFrames || 0) + 1;
            if (b.stuckFrames > 12) {
              b.vx += (Math.random() - 0.5) * 1.8;
              b.vy += 1.2;
              b.stuckFrames = 0;
            }
          } else {
            b.stuckFrames = 0;
          }
        }
        b.lastX = b.x;
        b.lastY = b.y;

        // Decrement frame cooldown timers for sound effects
        if (b.deflectorCooldown && b.deflectorCooldown > 0) {
          b.deflectorCooldown--;
        }
        if (b.railCooldown && b.railCooldown > 0) {
          b.railCooldown--;
        }

        // Hole landing & resting animation
        if (b.inHole) {
          b.vx = 0;
          b.vy = 0;
          if (b.wonHole) {
            b.x = b.wonHole.x;
            b.y = b.wonHole.y;
          }
          if ((b.holeStayFrames || 0) > 0) {
            b.holeStayFrames = (b.holeStayFrames || 0) - 1;
          } else {
            b.scale = (b.scale || 1) * 0.94;
            b.alpha = (b.alpha || 1) - 0.04;
            if (b.alpha <= 0.05) {
              b.active = false;
            }
          }
        } else {
          // Helper: Process hole win, calculate payouts and track 4-Ball Night Market Round
          const awardHoleScore = (h: PinballHole) => {
            if (b.scoreProcessed) return;
            b.scoreProcessed = true;
            b.inHole = true;
            b.wonHole = h;
            b.x = h.x;
            b.y = h.y;
            b.vx = 0;
            b.vy = 0;
            b.holeStayFrames = 55;

            setLastWin({
              points: h.points,
              payout: h.payout,
              label: h.label,
            });
            sessionWonRef.current += h.payout;
            setSessionTotalScore((prev) => prev + h.points);

            const newBalance = balanceRef.current + h.payout;
            balanceRef.current = newBalance;
            onUpdateBalanceRef.current(newBalance);

            recordCareerRound({
              gameId: 'pinball',
              betAmount: 50,
              winAmount: h.payout,
              multiplier: 1,
            });

            if (h.points === 300) {
              sound.playBigWin();
              toastService.success(`🎉 狂賀！彈珠落入【300分】特獎孔！獲得 $${h.payout} 籌碼！`);
              unlockHiddenCollectible('col-pinball-jackpot');
            } else if (h.points >= 150) {
              sound.playWin();
              toastService.success(`🔥 恭喜！命中【${h.points}分】大獎孔！獲得 $${h.payout} 籌碼！`);
            } else if (h.points >= 70) {
              sound.playWin();
              toastService.success(`✨ 漂亮！命中【${h.points}分】孔！獲得 $${h.payout} 籌碼！`);
            } else {
              sound.playPop();
              toastService.info(`🎯 落入【${h.points}分】孔，獲得 $${h.payout} 籌碼。`);
            }
          };

          // Perform sub-steps for ultra-smooth physical collision resolution without clipping or stuck states
          for (let step = 0; step < SUB_STEPS; step++) {
            if (!b.active || b.inHole) break;

            // Gravity & velocity integration
            b.vy += gravity * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;

            // Rolling friction on wood (適度阻尼，保留撞釘節奏感)
            b.vx *= Math.pow(0.993, dt);
            b.vy *= Math.pow(0.995, dt);

            // Realistic terminal velocity limit on inclined slope (平滑限速 6.8，避免墜落過急或異常加速)
            if (b.vy > 6.8) {
              b.vy = 6.8;
            }

            // Anti-stuck watchdog: 若彈珠在盤面上或橫桿上失去動能 (speed < 0.22 超過 35 個 sub-step)，自動施加自然重力輕推脫困
            if (b.hasExitedTube && !b.inHole) {
              const speed = Math.hypot(b.vx, b.vy);
              if (speed < 0.22) {
                b.stuckFrames = (b.stuckFrames || 0) + 1;
                if (b.stuckFrames > 35) {
                  b.vy = Math.max(b.vy, 0.8);
                  b.vx += (b.x <= 196 ? 0.4 : -0.4) + (Math.random() - 0.5) * 0.2;
                  b.stuckFrames = 0;
                }
              } else {
                b.stuckFrames = 0;
              }
            }

            // 1. Inside Launch Channel (ONLY when ball has NOT exited tube)
            if (!b.hasExitedTube) {
              // Straight vertical tube section
              if (b.y >= archCenterY) {
                if (b.x > 388) {
                  b.x = 388;
                  b.vx = -Math.abs(b.vx) * 0.25;
                }
                if (b.x < 370) {
                  b.x = 370;
                  b.vx = Math.abs(b.vx) * 0.25;
                }
                // Weak launch refund (彈珠未達頂端完全回落到底部)
                if (b.vy > 0 && b.y >= 570) {
                  b.active = false;
                  updateBallsCount(ballsCountRef.current + 1);
                  toastService.info('⚪ 彈珠未能翻過頂弧已順管滑回歸還！可嘗試調整發射蓄力。');
                  break;
                }
              } else {
                // Curved arch hood section (y < archCenterY)
                const dx = b.x - archCenterX;
                const dy = b.y - archCenterY;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx);

                // Exit Detection: passing throat exit angle (-0.60 rad) or left of throat exit x
                if (angle < throatExitAngle || (b.x <= throatExitX && b.y <= throatExitY)) {
                  b.hasExitedTube = true;
                  // 順暢頂開單向逆止活門進入盤面
                  oneWayGateRef.current.openAngle = 1.0;
                } else {
                  // Outer curved wall (hood): Smooth forward guidance along arc, NEVER bounces backward!
                  if (dist >= archTrackRadius) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    b.x = archCenterX + nx * archTrackRadius;
                    b.y = archCenterY + ny * archTrackRadius;

                    // Forward tangent vector along curve (counter-clockwise towards exit)
                    const tx = ny;
                    const ty = -nx;
                    const vn = b.vx * nx + b.vy * ny;
                    const vt = b.vx * tx + b.vy * ty;

                    // Transfer outward normal momentum smoothly into forward tangent speed
                    const forwardSpeed = Math.max(Math.abs(vt), vn > 0 ? vt + vn * 0.25 : vt);
                    b.vx = tx * forwardSpeed * 0.98;
                    b.vy = ty * forwardSpeed * 0.98;
                  }

                  // Inner rail separator in curve
                  const innerLimit = innerRailRadius + marbleRadius;
                  if (dist <= innerLimit) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    b.x = archCenterX + nx * innerLimit;
                    b.y = archCenterY + ny * innerLimit;
                    const vn = b.vx * nx + b.vy * ny;
                    if (vn < 0) {
                      b.vx -= 1.15 * vn * nx;
                      b.vy -= 1.15 * vn * ny;
                    }
                  }
                }
              }
            } else {
              // 2. Playfield Dynamics (Ball is in main arena)

              // 2.0 出管口單向金屬逆止活門 (One-Way Wire Gate Collision)
              // 當盤面彈珠被彈簧、釘子或風車反彈往右上方衝擊喉口時，單向門呈閉合狀態，將彈珠自然彈回盤面內部，物理上徹底阻絕逆流入管！
              // 簧片末端防卡機制：優化切向引流與頂端阻力，當彈珠落在活門表面時順勢往左下方盤面順暢滑落，絕不卡死
              const gateRadCos = Math.cos(throatExitAngle);
              const gateRadSin = Math.sin(throatExitAngle);
              const gx1 = archCenterX + innerRailRadius * gateRadCos; // 337.1
              const gy1 = archCenterY + innerRailRadius * gateRadSin; // 108.1
              const gx2 = archCenterX + archOuterRadius * gateRadCos; // 361.9
              const gy2 = archCenterY + archOuterRadius * gateRadSin; // 91.1
              const gdx = gx2 - gx1;
              const gdy = gy2 - gy1;
              const glenSq = gdx * gdx + gdy * gdy; // 900
              const glen = Math.sqrt(glenSq); // 30.0
              const rawGt = ((b.x - gx1) * gdx + (b.y - gy1) * gdy) / glenSq;
              const gt = Math.max(0, Math.min(1, rawGt));
              const gpx = gx1 + gt * gdx;
              const gpy = gy1 + gt * gdy;
              const gdist = Math.hypot(b.x - gpx, b.y - gpy);

              // 活門法線 (朝發射管內部方向：dx > 0, dy > 0，即向右下方逆流方向)
              const bkNx = -gateRadSin; // 0.5646
              const bkNy = gateRadCos;  // 0.8253
              const sDist = (b.x - gpx) * bkNx + (b.y - gpy) * bkNy;

              // 僅在活門閉合且彈珠企圖逆向衝入發射管 (vn > 0.1) 時進行實體阻擋，出管進行中的彈珠絕不受干擾
              if (oneWayGateRef.current.openAngle <= 0.15 && gdist < marbleRadius + 2.8 && sDist < marbleRadius + 1.5) {
                // 彈珠由盤面衝向逆止活門
                const vn = b.vx * bkNx + b.vy * bkNy;
                if (vn > 0.1) {
                  // 在外弧末端 (gt > 0.82) 輕柔引導，避免與外牆夾角卡球
                  const tipDamp = gt > 0.82 ? Math.max(0.2, (1.0 - gt) / 0.18) : 1.0;
                  b.x = gpx - bkNx * (marbleRadius + 1.2 * tipDamp);
                  b.y = gpy - bkNy * (marbleRadius + 1.2 * tipDamp);

                  // 彈性金屬反彈，將彈珠自然擊回盤面中上方
                  b.vx -= 1.5 * vn * bkNx + bkNx * 0.35;
                  b.vy -= 1.5 * vn * bkNy + bkNy * 0.35;

                  // 簧片末端微調：沿活門切向朝左下方盤面注入自然順暢滑脫推力，杜絕任何懸停或卡死
                  const tgx = -gdx / glen; // -0.8253 (朝左下進入中場)
                  const tgy = -gdy / glen; // +0.5646
                  b.vx += tgx * 0.45;
                  b.vy += tgy * 0.45;

                  oneWayGateRef.current.sparkTimer = 5;
                  if (!b.railCooldown || b.railCooldown <= 0) {
                    sound.playPop();
                    b.railCooldown = 15;
                  }
                }
              }

              // Outer curved ceiling (y < archCenterY)
              if (b.y < archCenterY) {
                const dx = b.x - archCenterX;
                const dy = b.y - archCenterY;
                const dist = Math.hypot(dx, dy);

                if (dist >= archTrackRadius) {
                  const nx = dx / dist;
                  const ny = dy / dist;
                  b.x = archCenterX + nx * archTrackRadius;
                  b.y = archCenterY + ny * archTrackRadius;

                  const tx = ny;
                  const ty = -nx;
                  const vn = b.vx * nx + b.vy * ny;
                  const vt = b.vx * tx + b.vy * ty;

                  // 頂部圓弧平滑導流：沿著木框切向平滑導引，保留切向動量，無斷點階躍，保證相同力道軌跡完全一致
                  const forwardSpeed = vt > 0 ? (vn > 0 ? vt + vn * 0.18 : vt) : vt;
                  const normalBounce = vn > 0 ? -vn * 0.25 : 0;
                  b.vx = tx * forwardSpeed * 0.988 + nx * normalBounce;
                  b.vy = ty * forwardSpeed * 0.988 + ny * normalBounce;

                  // 順著弧頂自然滑動時保持靜音，僅在強烈垂直高撞 (vn > 2.0) 且冷卻後發出清脆輕響
                  if (vn > 2.0 && (!b.railCooldown || b.railCooldown <= 0)) {
                    sound.playPop();
                    b.railCooldown = 18;
                  }
                }

                // Inner divider rail (separates arena from launch tube for angle between throatExitAngle and 0)
                // 連續堅固剛體隔板：杜絕任何穿透漏入管內
                const angle = Math.atan2(dy, dx);
                if (angle >= throatExitAngle && angle <= 0.05) {
                  const arenaLimit = innerRailRadius - marbleRadius;
                  if (dist >= arenaLimit) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    b.x = archCenterX + nx * arenaLimit;
                    b.y = archCenterY + ny * arenaLimit;
                    const vn = b.vx * nx + b.vy * ny;
                    if (vn > 0) {
                      b.vx -= 1.4 * vn * nx;
                      b.vy -= 1.4 * vn * ny;
                      if (vn > 1.4 && (!b.railCooldown || b.railCooldown <= 0)) {
                        sound.playPop();
                        b.railCooldown = 18;
                      }
                    }
                  }
                }
              }

              // Left playfield wall (x: 27)
              if (b.x - marbleRadius < 27) {
                b.x = 27 + marbleRadius;
                b.vx = Math.abs(b.vx) * 0.6 + 0.2;
                sound.playPop();
              }

              // Right playfield divider wall (x: 360, separates arena from launch tube)
              // 雙面剛體隔板物理：盤面內的球絕不穿入右側；若在極端情況下出現在右側，平滑落球歸還絕不硬瞬移
              if (b.y >= archCenterY && b.y < trayTopY) {
                if (b.x <= 360) {
                  if (b.x + marbleRadius > 360) {
                    b.x = 360 - marbleRadius;
                    b.vx = -Math.abs(b.vx) * 0.6 - 0.2;
                    sound.playPop();
                  }
                } else if (b.x > 360 && b.x < 370) {
                  // 隔板右側厚度區，向發射管右側平滑推出
                  b.x = 370 + marbleRadius;
                  b.vx = Math.abs(b.vx) * 0.4 + 0.1;
                }
              }

              // Three Right-Wall Spring Deflector Wires (最右側短橫桿：末端完全開放無擋板，球滾到桿尖端自然滑脫下落)
              // 簧片末端阻力微調：優化尖端滾脫力學 (t >= 0.78 漸進卸除法線頂推力，並在末端主動賦予滑落速度)，絕不卡在尖端
              if (b.x > 330 && b.x <= 365 && b.y >= 235 && b.y <= 460) {
                const deflectorWires = [
                  { x1: 364, y1: 248, x2: 346, y2: 265 },
                  { x1: 364, y1: 330, x2: 346, y2: 347 },
                  { x1: 364, y1: 420, x2: 346, y2: 437 },
                ];
                for (let w of deflectorWires) {
                  const dx = w.x2 - w.x1;
                  const dy = w.y2 - w.y1;
                  const len = Math.hypot(dx, dy);
                  const t = ((b.x - w.x1) * dx + (b.y - w.y1) * dy) / (len * len);

                  // 關鍵防卡機制：若球已滑過桿尖端 (t >= 0.88) 或在橫桿後方 (t < 0)，完全不予阻擋，讓其自由下落
                  if (t < 0 || t >= 0.88) {
                    continue;
                  }

                  const px = w.x1 + t * dx;
                  const py = w.y1 + t * dy;
                  const dist = Math.hypot(b.x - px, b.y - py);
                  if (dist < marbleRadius + 1.8) {
                    // Normal pointing up-left
                    const nx = -dy / len;
                    const ny = dx / len;

                    // 尖端阻力漸減卸載：當球滑至尖端 (t > 0.72) 時，大幅降低向上的頂托力，避免抗衡重力造成卡球懸停
                    const tipSupport = t > 0.72 ? Math.max(0.15, (0.88 - t) / 0.16) : 1.0;
                    b.x = px + nx * (marbleRadius + 1.2 * tipSupport);
                    b.y = py + ny * (marbleRadius + 1.2 * tipSupport);

                    // Tangent pointing down-left along slope towards tip
                    const tx = dx / len;
                    const ty = dy / len;

                    const vn = b.vx * nx + b.vy * ny;
                    if (vn < 0) {
                      b.vx -= vn * nx * tipSupport;
                      b.vy -= vn * ny * tipSupport;
                    }

                    // 自然滑落物理：沿桿身自然下滑，並在接近末端時給予充足的滾脫初速度，順暢下墜
                    const vt = b.vx * tx + b.vy * ty;
                    const boostSpeed = t > 0.65 ? 1.6 : 0.8;
                    const naturalVt = Math.max(boostSpeed, vt * 0.94 + 0.35);
                    b.vx = tx * naturalVt;
                    b.vy = ty * naturalVt;

                    // 消除沿桿身滑動時連續發出的吵雜聲音：僅在初次碰觸或間隔冷卻後發出清脆輕響
                    if (!b.deflectorCooldown || b.deflectorCooldown <= 0) {
                      sound.playPop();
                      b.deflectorCooldown = 18; // 約 18 幀 (0.3 秒) 內不重複響起
                    }
                    break;
                  }
                }
              }

              // Two Left-Wall Spring Deflector Wires (左壁兩根導流短橫桿：交錯對應右側短桿中間高度，向右下方自然滾脫)
              // 簧片末端阻力微調：優化尖端卸載與滑落初速度
              if (b.x >= 24 && b.x <= 58 && b.y >= 275 && b.y <= 415) {
                const leftDeflectorWires = [
                  { x1: 26, y1: 289, x2: 44, y2: 306 },
                  { x1: 26, y1: 375, x2: 44, y2: 392 },
                ];
                for (let w of leftDeflectorWires) {
                  const dx = w.x2 - w.x1;
                  const dy = w.y2 - w.y1;
                  const len = Math.hypot(dx, dy);
                  const t = ((b.x - w.x1) * dx + (b.y - w.y1) * dy) / (len * len);

                  if (t < 0 || t >= 0.88) {
                    continue;
                  }

                  const px = w.x1 + t * dx;
                  const py = w.y1 + t * dy;
                  const dist = Math.hypot(b.x - px, b.y - py);
                  if (dist < marbleRadius + 1.8) {
                    // Normal pointing up-right into arena
                    const nx = dy / len;
                    const ny = -dx / len;

                    const tipSupport = t > 0.72 ? Math.max(0.15, (0.88 - t) / 0.16) : 1.0;
                    b.x = px + nx * (marbleRadius + 1.2 * tipSupport);
                    b.y = py + ny * (marbleRadius + 1.2 * tipSupport);

                    // Tangent pointing down-right along slope towards tip
                    const tx = dx / len;
                    const ty = dy / len;

                    const vn = b.vx * nx + b.vy * ny;
                    if (vn < 0) {
                      b.vx -= vn * nx * tipSupport;
                      b.vy -= vn * ny * tipSupport;
                    }

                    const vt = b.vx * tx + b.vy * ty;
                    const boostSpeed = t > 0.65 ? 1.6 : 0.8;
                    const naturalVt = Math.max(boostSpeed, vt * 0.94 + 0.35);
                    b.vx = tx * naturalVt;
                    b.vy = ty * naturalVt;

                    if (!b.deflectorCooldown || b.deflectorCooldown <= 0) {
                      sound.playPop();
                      b.deflectorCooldown = 18;
                    }
                    break;
                  }
                }
              }

              // 3. Dynamic Windmills Collision & Angular Deflection (風車偏折機構：全面升級實體葉片寬度與全葉片動態掃掠檢測，徹底根絕剛好穿過縫隙的現象)
              windmillsRef.current.forEach((w) => {
                const dx = b.x - w.x;
                const dy = b.y - w.y;
                const dist = Math.hypot(dx, dy);
                const maxReach = w.radius + marbleRadius;

                if (dist < maxReach && dist > 0.001) {
                  // 3.1. 中央黃銅鉚釘實心軸心碰撞 (防止彈珠穿心穿模)
                  const hubRadius = 3.6;
                  if (dist < hubRadius + marbleRadius) {
                    const hnx = dx / dist;
                    const hny = dy / dist;
                    const hOverlap = (hubRadius + marbleRadius) - dist;
                    b.x += hnx * hOverlap;
                    b.y += hny * hOverlap;
                    const hvn = b.vx * hnx + b.vy * hny;
                    if (hvn < 0) {
                      b.vx -= 1.35 * hvn * hnx;
                      b.vy -= 1.35 * hvn * hny;
                      sound.playPop();
                    }
                    return;
                  }

                  // 3.2. 全葉片實體寬度與動態掃掠檢測 (巡檢所有葉片，並包含扇形厚度與旋轉掃掠動量)
                  const stepAngle = (Math.PI * 2) / w.bladeCount;
                  let bestHit: { cDist: number; nx: number; ny: number; proj: number; bladeCos: number; bladeSin: number; overlap: number } | null = null;

                  for (let i = 0; i < w.bladeCount; i++) {
                    const bladeAngle = w.angle + i * stepAngle;
                    const bladeCos = Math.cos(bladeAngle);
                    const bladeSin = Math.sin(bladeAngle);

                    const proj = Math.max(0, Math.min(w.radius, dx * bladeCos + dy * bladeSin));
                    const closestX = w.x + proj * bladeCos;
                    const closestY = w.y + proj * bladeSin;
                    const cDist = Math.hypot(b.x - closestX, b.y - closestY);

                    // 實體夜市風車葉片外擴厚度 (從根部 2.2px 到尖端 3.8px) + 高速旋轉時的動態掃掠捕集半徑 (避免子步間穿漏)
                    const paddleHalfWidth = 2.0 + (proj / w.radius) * 1.8;
                    const spinSweepBonus = Math.min(2.4, Math.abs(w.angularVelocity) * 3.8);
                    const effectiveHitDist = marbleRadius + paddleHalfWidth + spinSweepBonus;

                    if (cDist < effectiveHitDist && cDist > 0.001) {
                      const overlap = effectiveHitDist - cDist;
                      if (!bestHit || overlap > bestHit.overlap) {
                        bestHit = {
                          cDist,
                          nx: (b.x - closestX) / cDist,
                          ny: (b.y - closestY) / cDist,
                          proj,
                          bladeCos,
                          bladeSin,
                          overlap,
                        };
                      }
                    }
                  }

                  if (bestHit) {
                    const { nx, ny, proj, bladeCos, bladeSin, overlap } = bestHit;
                    b.x += nx * overlap;
                    b.y += ny * overlap;

                    const r = Math.max(4.0, proj);
                    const bladeLinearVx = -w.angularVelocity * r * bladeSin;
                    const bladeLinearVy = w.angularVelocity * r * bladeCos;

                    const relVx = b.vx - bladeLinearVx;
                    const relVy = b.vy - bladeLinearVy;
                    const vn = relVx * nx + relVy * ny;

                    if (vn < 0) {
                      const torque = (bladeCos * relVy - bladeSin * relVx);
                      w.angularVelocity += (torque / (r * 1.5)) * 0.82;
                      if (Math.abs(w.angularVelocity) > 0.98) {
                        w.angularVelocity = Math.sign(w.angularVelocity) * 0.98;
                      }

                      // 溫和柔順的撥球轉向，融入風車高速葉片切向速度
                      const kick = Math.max(1.4, Math.abs(vn) * 0.68);
                      b.vx = bladeLinearVx * 0.52 + nx * kick;
                      b.vy = bladeLinearVy * 0.52 + ny * kick + 0.15;
                      sound.playPop();
                    }
                  }
                }
              });

              // 3.5. Spring Slingshot Kickers Collision & Diagonal Upward Launch (向斜上方彈射彈簧機構)
              // 升級膠囊型圓頭碰撞模型（Capsule Endcap Collision）：
              // 1. 桿身中央段 (0.12 <= t <= 0.88)：正向強力光學鏡面反射 + 彈簧法向脈衝；
              // 2. 兩端圓頭 (t < 0.12 或 t > 0.88)：以端點為圓心的半球型徑向彈性碰撞，解決從「側面」進入時的突兀硬轉折與抽搐！
              springKickersRef.current.forEach((k) => {
                const halfL = k.length / 2;
                const cosA = Math.cos(k.angle);
                const sinA = Math.sin(k.angle);
                // Endpoints of the bumper bar
                const x1 = k.x - halfL * cosA;
                const y1 = k.y - halfL * sinA;
                const x2 = k.x + halfL * cosA;
                const y2 = k.y + halfL * sinA;

                const dx = x2 - x1;
                const dy = y2 - y1;
                const lenSq = dx * dx + dy * dy;
                const t = Math.max(0, Math.min(1, ((b.x - x1) * dx + (b.y - y1) * dy) / lenSq));
                const closeX = x1 + t * dx;
                const closeY = y1 + t * dy;
                const dist = Math.hypot(b.x - closeX, b.y - closeY);
                const hitRadius = marbleRadius + 5.4;

                if (dist < hitRadius && dist > 0.001) {
                  // 判斷是否為桿身側面端點
                  const isEndcap = t < 0.12 || t > 0.88;

                  // 彈簧主要正面法線 (指向斜上方: -dy, dx)
                  const barLen = Math.hypot(dx, dy);
                  const mainNx = -dy / barLen;
                  const mainNy = dx / barLen;

                  // 局部接觸法線 (指向球心)
                  let contactNx = (b.x - closeX) / dist;
                  let contactNy = (b.y - closeY) / dist;

                  // 判斷接觸面為「正面打擊面」或「背面固定座」:
                  // 在彈簧本體旋轉座標系中，正面打擊面朝向 -y，背面固定座朝向 +y
                  const relX = b.x - k.x;
                  const relY = b.y - k.y;
                  const localY = -relX * sinA + relY * cosA;
                  const isFrontFace = localY <= 0.5;

                  // 將彈珠推離彈簧表面避免沾黏
                  b.x = closeX + contactNx * (hitRadius + 1.2);
                  b.y = closeY + contactNy * (hitRadius + 1.2);

                  const vn = b.vx * contactNx + b.vy * contactNy;

                  if (isFrontFace) {
                    // 【正面接觸：觸發彈簧壓縮、閃光與主動彈射推進衝量】
                    k.compression = 1.0;
                    k.sparkTimer = 18;

                    if (vn < 0) {
                      const restitution = isEndcap ? 0.72 : (k.isArc ? 0.78 : 0.75);
                      const friction = 0.04;

                      // 切向速度 (沿表面切線方向，守恆並扣除微量摩擦)
                      const vtX = b.vx - vn * contactNx;
                      const vtY = b.vy - vn * contactNy;

                      // 彈簧主動彈射衝量 (沿接觸法線方向垂直噴射)
                      const springImpulse = isEndcap ? (k.kickPower * 0.35) : (k.kickPower * (k.isArc ? 0.90 : 0.85));

                      // 法向最終反彈速度 = 彈性鏡面反射 + 彈簧垂直衝量
                      const normalExitSpeed = -vn * restitution + springImpulse;

                      // 合成真實物理反射向量
                      b.vx = vtX * (1 - friction) + contactNx * normalExitSpeed;
                      b.vy = vtY * (1 - friction) + contactNy * normalExitSpeed;

                      sound.playSpringBoing();
                    }
                  } else {
                    // 【背面接觸：固定底座被動剛體阻擋，不觸發彈簧衝量，自然滑落絕不反向向下暴彈】
                    if (vn < 0) {
                      const passiveRestitution = 0.35;
                      const friction = 0.06;

                      const vtX = b.vx - vn * contactNx;
                      const vtY = b.vy - vn * contactNy;

                      // 僅做輕微剛體阻擋反射
                      const normalExitSpeed = -vn * passiveRestitution;
                      b.vx = vtX * (1 - friction) + contactNx * normalExitSpeed;
                      b.vy = vtY * (1 - friction) + contactNy * normalExitSpeed;

                      sound.playPop();
                    }
                  }
                }
              });

              // 3.5. Vintage Round Pop Bumper Collision (正中間上方最頂端圓形彈簧)
              const rb = roundBumperRef.current;
              if (rb && rb.radius > 0) {
                const rdx = b.x - rb.x;
                const rdy = b.y - rb.y;
                const rdist = Math.hypot(rdx, rdy);
                const rHitRadius = rb.radius + marbleRadius + 1.2;

                if (rdist < rHitRadius && rdist > 0.001) {
                  const rnx = rdx / rdist;
                  const rny = rdy / rdist;

                  // 啟動彈簧縮放震盪與火花
                  rb.hitTimer = 15;

                  // 推離圓形彈簧表面防止黏滯
                  b.x = rb.x + rnx * (rHitRadius + 1.5);
                  b.y = rb.y + rny * (rHitRadius + 1.5);

                  // 物理法向彈性彈射：沿法線方向強勁推進
                  const baseAngle = Math.atan2(rny, rnx);
                  b.vx = Math.cos(baseAngle) * rb.kickPower;
                  b.vy = Math.sin(baseAngle) * rb.kickPower;

                  // 若彈跳向上衝擊過緩，額外補充電磁脈衝
                  if (b.vy > -2.0) {
                    b.vy = -Math.abs(b.vy) * 0.7 - 2.8;
                  }

                  sound.playSpringBoing();
                }
              }

              // 3.6. Slingshot Triangles Elastic Rubber Collision (下方長桿兩側弧形彈性區碰撞與確定性散射反彈)
              slingshotTrianglesRef.current.forEach((s) => {
                // 1. Active Elastic Strike Arc (p1 -> cp -> p2，外凸弧形二次貝茲彈性發射邊)
                // 離散取樣圓弧尋找最近點與精確局部法線，使反彈方向根據撞擊高度大幅散佈
                let minDist = Infinity;
                let bestT = 0;
                let bestX = s.p1.x;
                let bestY = s.p1.y;
                let bestNx = 0;
                let bestNy = 0;

                const SAMPLES = 10;
                for (let i = 0; i <= SAMPLES; i++) {
                  const u = i / SAMPLES;
                  const invU = 1 - u;
                  // 二次貝茲曲線上點座標
                  const qx = invU * invU * s.p1.x + 2 * invU * u * s.cp.x + u * u * s.p2.x;
                  const qy = invU * invU * s.p1.y + 2 * invU * u * s.cp.y + u * u * s.p2.y;
                  const d = Math.hypot(b.x - qx, b.y - qy);
                  if (d < minDist) {
                    minDist = d;
                    bestT = u;
                    bestX = qx;
                    bestY = qy;
                    // 一階導數切線向量 (dq/du)
                    const tx = 2 * (1 - u) * (s.cp.x - s.p1.x) + 2 * u * (s.p2.x - s.cp.x);
                    const ty = 2 * (1 - u) * (s.cp.y - s.p1.y) + 2 * u * (s.p2.y - s.cp.y);
                    const tlen = Math.hypot(tx, ty);
                    // 朝向中場的法線 (左側 nx > 0, 右側 nx < 0)
                    const sideSign = s.id === 1 ? 1 : -1;
                    const rawNx = -ty / tlen;
                    const rawNy = tx / tlen;
                    if (rawNx * sideSign > 0) {
                      bestNx = rawNx;
                      bestNy = rawNy;
                    } else {
                      bestNx = -rawNx;
                      bestNy = -rawNy;
                    }
                  }
                }

                const rubberHitRadius = marbleRadius + 5.2;

                if (minDist < rubberHitRadius && minDist > 0.001) {
                  s.compression = 1.0;
                  s.sparkTimer = 20;

                  // 將彈珠推出橡皮表面
                  b.x = bestX + bestNx * (rubberHitRadius + 1.2);
                  b.y = bestY + bestNy * (rubberHitRadius + 1.2);

                  // 依弧形局部法線方向結合鏡面反射，產生精確物理散射：
                  const baseArcAngle = Math.atan2(bestNy, bestNx);
                  const launchAngle = Math.min(-0.28, Math.max(-2.86, baseArcAngle));

                  b.vx = Math.cos(launchAngle) * s.kickPower;
                  b.vy = Math.sin(launchAngle) * s.kickPower;

                  sound.playSpringBoing();
                  return;
                }

                // 2. Brass post vertex bumps (三顆頂柱邊角輕微彈跳)
                [s.p1, s.p2, s.p3].forEach((pt) => {
                  const pdx = b.x - pt.x;
                  const pdy = b.y - pt.y;
                  const pdist = Math.hypot(pdx, pdy);
                  const postHitRadius = marbleRadius + 3.6;
                  if (pdist < postHitRadius && pdist > 0.001) {
                    const pnx = pdx / pdist;
                    const pny = pdy / pdist;
                    b.x = pt.x + pnx * (postHitRadius + 0.8);
                    b.y = pt.y + pny * (postHitRadius + 0.8);
                    const pvn = b.vx * pnx + b.vy * pny;
                    if (pvn < 0) {
                      b.vx -= 1.35 * pvn * pnx;
                      b.vy -= 1.35 * pvn * pny;
                      sound.playPop();
                    }
                  }
                });
              });

              // 4. Scoring Holes Detection (獎孔判定)
              for (let i = 0; i < VINTAGE_PINBALL_HOLES.length; i++) {
                const h = VINTAGE_PINBALL_HOLES[i];
                const dx = b.x - h.x;
                const dy = b.y - h.y;
                const dist = Math.hypot(dx, dy);
                const speed = Math.hypot(b.vx, b.vy);

                // 300分特獎孔專屬：立體凸緣孔唇防禦機制 (Lip Rejection)
                // 杜絕高速球強行砸入或掠過時直接被吸入！非端正且平緩慢速(speed < 2.1)之彈珠會被金屬孔唇彈跳開，進球窗口微調開敞 (0.78 vs 0.92)
                if (h.points === 300) {
                  const captureMargin = h.radius * 0.78;
                  if (dist < h.radius + marbleRadius * 0.75) {
                    if (speed > 2.15 && dist > captureMargin * 0.5) {
                      // 高速衝入或擦邊球：金屬孔唇產生真實彈跳反射，彈離 300 孔
                      const rnx = dx / (dist || 1);
                      const rny = dy / (dist || 1);
                      const rvn = b.vx * rnx + b.vy * rny;
                      if (rvn < 0) {
                        b.vx -= 1.3 * rvn * rnx;
                        b.vy -= 1.3 * rvn * rny;
                        sound.playPop();
                      }
                      continue;
                    }
                    if (dist < captureMargin) {
                      awardHoleScore(h);
                      break;
                    }
                  }
                  continue;
                }

                if (dist < h.radius + marbleRadius * 0.8) {
                  // Fast slide-by at edge
                  if (speed > 3.0 && dist > h.radius * 0.42) {
                    b.vx += ((h.x - b.x) / dist) * 0.22;
                    b.vy += ((h.y - b.y) / dist) * 0.22;
                    continue;
                  }
                  if (dist < h.radius * 0.92) {
                    awardHoleScore(h);
                    break;
                  }
                }
              }

              if (b.inHole) break;

              // 5. Peg Collisions (自 y: 35 起全盤面釘子實體碰撞，徹底修復頂部 y <= 60 穿釘 Bug)
              if (b.y >= 35 && b.y < 610) {
                pegs.current.forEach((p) => {
                  const dx = b.x - p.x;
                  const dy = b.y - p.y;
                  const dist = Math.hypot(dx, dy);
                  const minDist = marbleRadius + 3.0;
                  if (dist < minDist && dist > 0.001) {
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const overlap = minDist - dist;

                    b.x += nx * overlap;
                    b.y += ny * overlap;

                    // Deflect naturally off pin apex (頂尖撞擊自然分流)
                    if (ny < -0.65 && Math.abs(nx) < 0.35) {
                      b.vx += (nx >= 0 ? 0.35 : -0.35);
                      b.vy += 0.12;
                    }

                    const vn = b.vx * nx + b.vy * ny;
                    if (vn < 0) {
                      const restitution = 0.55;
                      const vtX = b.vx - vn * nx;
                      const vtY = b.vy - vn * ny;
                      b.vx = vtX * 0.94 - vn * nx * restitution;
                      b.vy = vtY * 0.94 - vn * ny * restitution + 0.08;
                      sound.playPop();
                    }
                  }
                });
              }

              // 6. Slanted Lower Rails (最下兩條長橫桿：實體阻擋功能，彈跳與自然沿斜線滾動，滑落至正下方緊鄰的雙 20 分孔)
              // Left rail: from (26, 560) to (178, 592)
              if (b.x >= 24 && b.x <= 180 && b.y >= 545 && b.y <= 602) {
                const rx1 = 26;
                const ry1 = 560;
                const rx2 = 178;
                const ry2 = 592;
                const rdx = rx2 - rx1; // 152
                const rdy = ry2 - ry1; // 32
                const rlen = Math.hypot(rdx, rdy);
                const t = ((b.x - rx1) * rdx + (b.y - ry1) * rdy) / (rlen * rlen);

                // 僅在橫桿實體長度內阻擋，超過末端 (t > 0.98) 立即放行滾入 20 分孔
                if (t >= 0 && t <= 0.98) {
                  const px = rx1 + t * rdx;
                  const py = ry1 + t * rdy;
                  const dist = Math.hypot(b.x - px, b.y - py);
                  const blockRadius = marbleRadius + 2.4;

                  if (dist < blockRadius) {
                    // Upward normal vector pointing up-left into playfield (ny is strictly negative, guaranteed blocking)
                    const nx = rdy / rlen;
                    const ny = -rdx / rlen;
                    b.x = px + nx * blockRadius;
                    b.y = py + ny * blockRadius;

                    // Tangent vector down the slope toward center
                    const tx = rdx / rlen;
                    const ty = rdy / rlen;
                    const vn = b.vx * nx + b.vy * ny;
                    const vt = b.vx * tx + b.vy * ty;

                    // 碰擊實體阻擋反彈 (輕微木桿彈跳)
                    const bounceVn = vn < 0 ? -vn * 0.15 : 0;
                    // 沿著斜桿自然均勻滑行至中央出口，限制速度上限避免任何異常暴衝
                    const rollVt = Math.min(2.8, Math.max(0.8, Math.abs(vt) * 0.88 + 0.3));
                    b.vx = tx * rollVt + nx * bounceVn;
                    b.vy = ty * rollVt + ny * bounceVn;

                    // 僅在初次掉落顯著撞擊橫桿時發出一次清脆撞擊聲，沿桿身滾動時保持平滑靜音
                    if (vn < -1.2 && (!b.railCooldown || b.railCooldown <= 0)) {
                      sound.playPop();
                      b.railCooldown = 40; // 滾動期間絕不重複觸發
                    }
                  }
                }
              }

              // Right rail: from (360, 560) to (214, 592)
              if (b.x >= 212 && b.x <= 362 && b.y >= 545 && b.y <= 602) {
                const rx1 = 360;
                const ry1 = 560;
                const rx2 = 214;
                const ry2 = 592;
                const rdx = rx2 - rx1; // -146
                const rdy = ry2 - ry1; // 32
                const rlen = Math.hypot(rdx, rdy);
                const t = ((b.x - rx1) * rdx + (b.y - ry1) * rdy) / (rlen * rlen);

                // 僅在橫桿實體長度內阻擋，超過末端 (t > 0.98) 立即放行滾入 20 分孔
                if (t >= 0 && t <= 0.98) {
                  const px = rx1 + t * rdx;
                  const py = ry1 + t * rdy;
                  const dist = Math.hypot(b.x - px, b.y - py);
                  const blockRadius = marbleRadius + 2.4;

                  if (dist < blockRadius) {
                    // Upward normal vector pointing up-right into playfield (ny is strictly negative, guaranteed blocking)
                    const nx = -rdy / rlen;
                    const ny = rdx / rlen;
                    b.x = px + nx * blockRadius;
                    b.y = py + ny * blockRadius;

                    // Tangent vector down the slope toward center (points left and down)
                    const tx = rdx / rlen;
                    const ty = rdy / rlen;
                    const vn = b.vx * nx + b.vy * ny;
                    const vt = b.vx * tx + b.vy * ty;

                    // 碰擊實體阻擋反彈 (輕微木桿彈跳)
                    const bounceVn = vn < 0 ? -vn * 0.15 : 0;
                    // 沿著斜桿自然均勻滑行至中央出口，限制速度上限避免任何異常暴衝
                    const rollVt = Math.min(2.8, Math.max(0.8, Math.abs(vt) * 0.88 + 0.3));
                    b.vx = tx * rollVt + nx * bounceVn;
                    b.vy = ty * rollVt + ny * bounceVn;

                    // 僅在初次掉落顯著撞擊橫桿時發出一次清脆撞擊聲，沿桿身滾動時保持平滑靜音
                    if (vn < -1.2 && (!b.railCooldown || b.railCooldown <= 0)) {
                      sound.playPop();
                      b.railCooldown = 40; // 滾動期間絕不重複觸發
                    }
                  }
                }
              }

              // 7. Bottom Catch into Parallel Dual 20-Point Holes
              // 彈珠順著斜桿滾出，直接精確滑入正下方緊鄰的雙 20 分孔
              if (!b.inHole && b.y >= 584 && b.x >= 174 && b.x <= 218) {
                const bottom20Holes = VINTAGE_PINBALL_HOLES.filter((h) => h.id === 58 || h.id === 59);
                const targetHole = b.x <= 196 ? bottom20Holes[0] : (bottom20Holes[1] || bottom20Holes[0]);
                awardHoleScore(targetHole);
                break;
              }

              // 底部萬全防護：若彈珠落至最底槽床 (y >= 608)，自動由下方 20 分孔接住結算，絕不留存卡死
              if (!b.inHole && b.y >= 608 && b.x <= 364) {
                const bottom20Holes = VINTAGE_PINBALL_HOLES.filter((h) => h.id === 58 || h.id === 59);
                const targetHole = b.x <= 196 ? bottom20Holes[0] : (bottom20Holes[1] || bottom20Holes[0]);
                awardHoleScore(targetHole);
                break;
              }
            }

            if (b.y > displayHeight + 20) {
              b.active = false;
              break;
            }
          }
        }

        if (b.active) {
          nextBalls.push(b);
        }

        // Draw Polished Silver Chrome Marble
        ctx.save();
        const currentScale = b.scale || 1;
        const currentAlpha = b.alpha || 1;
        ctx.globalAlpha = currentAlpha;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
        ctx.shadowBlur = 4 * currentScale;
        ctx.shadowOffsetY = 2 * currentScale;

        const ballGrad = ctx.createRadialGradient(
          b.x - 2 * currentScale,
          b.y - 2 * currentScale,
          1,
          b.x,
          b.y,
          marbleRadius * currentScale
        );
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, '#f1f5f9');
        ballGrad.addColorStop(0.8, '#94a3b8');
        ballGrad.addColorStop(1, '#475569');

        ctx.beginPath();
        ctx.arc(b.x, b.y, marbleRadius * currentScale, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.restore();

        if (!b.inHole) {
          ctx.beginPath();
          ctx.arc(b.x - 2.5, b.y - 2.5, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }
      });

      activeBallsRef.current = nextBalls;

      // Topmost Glass Pane Sheen Reflection & Vintage Sticker Pasted On Outside Glass (像貼在玻璃上一樣)
      ctx.save();
      // 1. Subtle diagonal glass glare across upper table
      const topGlassGrad = ctx.createLinearGradient(10, 10, displayWidth * 0.8, displayHeight * 0.6);
      topGlassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
      topGlassGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.02)');
      topGlassGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.09)');
      topGlassGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.01)');
      topGlassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topGlassGrad;
      ctx.fillRect(10, 10, displayWidth - 20, displayHeight - 20);

      // 2. Vintage Sticker Pasted Directly On Top Glass (請勿拍打 玻璃會爆炸)
      const stickerX = 36;
      const stickerY = 12;
      const stickerW = displayWidth - 72;
      const stickerH = 20;

      // Drop shadow on glass beneath sticker
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Vintage yellow paper backing
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.roundRect(stickerX, stickerY, stickerW, stickerH, 4);
      ctx.fill();

      // Clear shadow for crisp sticker borders and typography
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Outer Red Border
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(stickerX, stickerY, stickerW, stickerH, 4);
      ctx.stroke();

      // Inner Fine Red Border
      ctx.strokeStyle = 'rgba(185, 28, 28, 0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(stickerX + 2, stickerY + 2, stickerW - 4, stickerH - 4, 2);
      ctx.stroke();

      // Red bold warning text
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ 請 勿 拍 打  玻 璃 會 爆 炸 ★', displayWidth / 2, stickerY + stickerH / 2 + 0.5);

      // Glossy reflection highlight on top half of glass sticker
      const glossGrad = ctx.createLinearGradient(stickerX, stickerY, stickerX, stickerY + stickerH / 2);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.roundRect(stickerX + 1, stickerY + 1, stickerW - 2, stickerH / 2 - 1, [3, 3, 0, 0]);
      ctx.fill();
      ctx.restore();

      if (nextBalls.length > 0) {
        wasBusy = true;
      } else if (wasBusy) {
        wasBusy = false;
        if (onRoundBusyChangeRef.current) {
          onRoundBusyChangeRef.current(false);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isTilted, tiltCooldownRemaining, updateBallsCount]);

  return (
    <div
      id="traditional-pinball-container"
      className="w-full h-full flex flex-col items-center justify-between p-2 sm:p-2.5 md:p-3 bg-[#0a0c12] text-stone-100 select-none overflow-y-auto lg:overflow-hidden"
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-stone-800/80 pb-1.5 mb-1.5 shrink-0">
        <div className="flex items-center gap-2">
          {onNavigateToLobby && (
            <button
              onClick={onNavigateToLobby}
              className="p-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-amber-400 text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>大廳</span>
            </button>
          )}
          <h2 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-1.5">
            <span>🔴 夜市打彈珠</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block">剩餘彈珠 (共用庫存)</span>
            <span className="text-xs sm:text-sm font-mono font-black text-amber-400 flex items-center justify-end gap-1">
              <CircleDot className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {ballsCount} 顆
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block">籌碼餘額</span>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">${balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Left: Pinball Machine Canvas, Right: Operator Controls) */}
      <div className="w-full max-w-5xl flex-1 flex flex-col lg:flex-row items-center lg:items-center justify-center gap-2.5 sm:gap-4 min-h-0">
        {/* LEFT COLUMN: Pinball Machine Game Table */}
        <div className="w-full max-w-[390px] sm:max-w-[420px] lg:max-w-[395px] xl:max-w-[420px] shrink-0 flex flex-col items-center">
          {/* Machine Cabinet Frame with Realistic Tilt/Nudge Spring Shake */}
          <div
            id="pinball-cabinet-frame"
            style={{
              transform: `translate(${nudgeOffset.x}px, ${nudgeOffset.y}px)`,
              transition: nudgeOffset.x === 0 && nudgeOffset.y === 0 ? 'transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
            }}
            className="relative rounded-2xl border-4 border-[#78350f] shadow-[0_16px_40px_rgba(0,0,0,0.9)] overflow-hidden bg-[#1e140d] w-full flex justify-center max-h-[calc(100vh-80px)]"
          >
            <canvas
              ref={canvasRef}
              width={420}
              height={650}
              className="block w-full h-auto max-h-[calc(100vh-88px)] object-contain"
            />

            {/* Interactive Spring Plunger on Canvas Right Margin */}
            <div
              id="pinball-plunger-area"
              className="absolute bottom-2 right-[9px] w-7 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
              title="按住拉桿蓄力 (1秒往返循環)"
              onPointerDown={(e) => {
                if (ballsCount <= 0 || isLaunchingRef.current) return;
                e.preventDefault();
                isPullingRef.current = true;
                pullStartTimestampRef.current = performance.now();
                setIsPulling(true);
                try {
                  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                if (isPullingRef.current) {
                  const launchPull = springPullRef.current;
                  isPullingRef.current = false;
                  setIsPulling(false);
                  launchMarble(launchPull);
                }
                try {
                  (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                } catch {
                  // ignore
                }
              }}
            >
              {/* Spring Plunger Rod */}
              <div
                ref={plungerRodRef}
                className={`w-1.5 bg-gradient-to-r from-stone-400 via-stone-200 to-stone-500 rounded-full ${
                  isPulling ? 'transition-none' : 'transition-all duration-200'
                }`}
                style={{ height: `${14 + (springPull / 100) * 20}px` }}
              />
              {/* Wooden Knob Handle */}
              <div
                className={`w-6 h-6 rounded-md bg-gradient-to-b from-[#ca8a04] via-[#854d0e] to-[#451a03] border border-amber-300/60 shadow-[0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center transition-transform ${
                  isPulling ? 'scale-110 shadow-[0_0_12px_rgba(234,179,8,0.8)]' : 'hover:scale-105'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-200/70" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operator Control Console (所有操作選項整合於右側) */}
        <div className="w-full max-w-[420px] lg:flex-1 lg:max-w-[460px] flex flex-col gap-2.5 sm:gap-3">
          {/* Card 1: Last Win & Hole Score Banner (純孔洞位置計分) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-2.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-[10px] text-stone-400 block font-bold">落入孔洞與得分紀錄</span>
                <span className="text-xs sm:text-sm font-mono font-bold text-stone-200">
                  {lastWin ? (
                    <span className="text-amber-300">
                      【{lastWin.label}分】孔 • 獲得 ${lastWin.payout} 籌碼
                    </span>
                  ) : (
                    <span className="text-stone-500 italic">尚未發射彈珠（各孔依標記分數直接計分）</span>
                  )}
                </span>
              </div>
            </div>
            {lastWin && (
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black border ${
                  lastWin.points >= 300
                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                    : lastWin.points >= 150
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : lastWin.points >= 70
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {lastWin.points >= 300 ? '👑 300分特獎' : lastWin.points >= 150 ? '🔥 大獎' : `+${lastWin.points}分`}
              </span>
            )}
          </div>

          {/* Card 2: 搖晃機台微動控制 (移動至右側，所有操作集中於右邊) */}
          <div className="w-full bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 rounded-xl p-2.5 flex flex-col gap-2 shadow-lg">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-stone-300 font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                機台搖晃微動 (Nudge)
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isTilted
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                    : nudgeCount >= 2
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {isTilted
                  ? `🚨 TILT! 鎖死 (${tiltCooldownRemaining}s)`
                  : nudgeCount >= 2
                  ? `⚠️ 震盪警告 (${nudgeCount}/3)`
                  : '🟢 感應正常'}
              </span>
            </div>

            {/* 3 Physical Nudge Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={isTilted}
                onClick={() => nudgeMachine('left')}
                className="py-2 px-2 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700/80 active:scale-95 text-stone-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="拍擊機台左側 (快捷鍵: A 或 左方向鍵)"
              >
                <MoveLeft className="w-3.5 h-3.5 text-amber-400" />
                <span>拍左 (A)</span>
              </button>

              <button
                type="button"
                disabled={isTilted}
                onClick={() => nudgeMachine('up')}
                className="py-2 px-2 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700/80 active:scale-95 text-stone-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="向上頂撞機台 (快捷鍵: W 或 上方向鍵)"
              >
                <MoveUp className="w-3.5 h-3.5 text-amber-400" />
                <span>頂上 (W)</span>
              </button>

              <button
                type="button"
                disabled={isTilted}
                onClick={() => nudgeMachine('right')}
                className="py-2 px-2 rounded-lg bg-stone-950 hover:bg-stone-800 border border-stone-700/80 active:scale-95 text-stone-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="拍擊機台右側 (快捷鍵: D 或 右方向鍵)"
              >
                <span>拍右 (D)</span>
                <MoveRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
            <div className="text-[10px] text-stone-400 leading-tight">
              輕拍機台可微調滾動路徑，亦有機會將剛落孔彈珠震出再戰！連續劇烈拍擊 3 次將觸發 TILT 鎖死。
            </div>
          </div>

          {/* Card 3: Silky-Smooth Spring Plunger Power Gauge HUD */}
          <div className="bg-gradient-to-b from-stone-900 via-[#151822] to-stone-950 border-2 border-amber-500/40 rounded-2xl p-3 shadow-xl flex flex-col gap-2.5">
            {/* Force Readout & Real-Time Strategy Guidance */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    springPull > 88
                      ? 'bg-rose-500 animate-ping shadow-[0_0_12px_rgba(244,63,94,1)]'
                      : springPull > 70
                      ? 'bg-amber-400 animate-pulse'
                      : springPull > 50
                      ? 'bg-yellow-400'
                      : springPull > 28
                      ? 'bg-emerald-400'
                      : 'bg-stone-500'
                  }`}
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">
                      彈簧蓄力儀表 (Power Gauge)
                    </span>
                    {lastLaunchPull !== null && (
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        前次發射力道：{lastLaunchPull}%
                      </span>
                    )}
                    {isPulling && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                          pullDirection === 'up'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {pullDirection === 'up' ? '▲ 蓄力上升' : '▼ 折返下降'}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold">
                    {springPull === 0 ? (
                      <span className="text-stone-400">
                        待機中 (長按下方按鈕或空白鍵蓄力，鬆手擊發{lastLaunchPull !== null ? `，上次蓄力 ${lastLaunchPull}%` : ''})
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold">
                        ⚡ 當前蓄力：{Math.round(springPull)}% ({pullDirection === 'up' ? '蓄力增強中' : '折返減弱中'}) — 鬆開擊發！
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Large Numeric Percentage Display */}
              <div className="flex items-baseline gap-1 bg-stone-950 px-3 py-1 rounded-xl border border-stone-800 shadow-inner shrink-0">
                <span
                  className={`font-mono text-xl sm:text-2xl font-black ${
                    springPull > 88
                      ? 'text-rose-400'
                      : springPull > 70
                      ? 'text-amber-400'
                      : springPull > 50
                      ? 'text-yellow-400'
                      : springPull > 0
                      ? 'text-emerald-400'
                      : 'text-stone-400'
                  }`}
                >
                  {Math.round(springPull)}
                </span>
                <span className="font-mono text-xs text-stone-400 font-bold">%</span>
              </div>
            </div>

            {/* Zero-Lag High-Visibility Multi-Stage Progress Bar */}
            <div className="relative w-full h-4 bg-stone-950 rounded-full border border-stone-800 overflow-hidden p-0.5 shadow-inner">
              <div
                ref={progressBarRef}
                className={`h-full rounded-full ${
                  isPulling ? 'transition-none' : 'transition-all duration-200'
                } ${
                  springPull > 88
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                    : springPull > 70
                    ? 'bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500'
                    : springPull > 50
                    ? 'bg-gradient-to-r from-emerald-500 to-yellow-400'
                    : springPull > 0
                    ? 'bg-emerald-500'
                    : 'bg-stone-600'
                }`}
                style={{ width: `${Math.max(2, springPull)}%` }}
              />
            </div>

            {/* Player-Driven Active Launch Button */}
            <div className="flex items-center gap-2 pt-1">
              <button
                id="btn-pinball-launch"
                disabled={ballsCount <= 0}
                onPointerDown={(e) => {
                  if (ballsCount <= 0 || isLaunchingRef.current) return;
                  e.preventDefault();
                  isPullingRef.current = true;
                  pullStartTimestampRef.current = performance.now();
                  setIsPulling(true);
                  try {
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if (isPullingRef.current) {
                    const launchPull = springPullRef.current;
                    isPullingRef.current = false;
                    setIsPulling(false);
                    launchMarble(launchPull);
                  }
                  try {
                    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                className={`touch-none flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer select-none active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPulling
                    ? 'bg-amber-400 text-stone-950 scale-98 shadow-[0_0_24px_rgba(251,191,36,0.9)]'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-md'
                }`}
              >
                {ballsCount <= 0 ? (
                  <span>⚠️ 請先在下方購買彈珠即可發射</span>
                ) : isPulling ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 animate-spin" />
                    蓄力中 ({Math.round(springPull)}% {pullDirection === 'up' ? '▲上升' : '▼折返'}) — 鬆開擊發！
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4" />
                    按住按鈕蓄力 / 空白鍵蓄力 • 鬆手立即發射 (扣 1 顆彈珠)
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Card 3: Nudge Table Strategy & Keyboard Hints */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-xl p-2.5 flex flex-col gap-1 text-[11px] text-stone-400">
            <div className="flex items-center gap-1.5 text-stone-300 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>操作說明：</span>
            </div>
            <p className="leading-relaxed">
              • <strong className="text-amber-300">手動蓄力</strong>：按住發射按鈕或鍵盤空白鍵，蓄力條將以每秒 0%~100% 循環往返，鬆開瞬間決定發射力道！
            </p>
            <p className="leading-relaxed">
              • <strong className="text-amber-300">機台搖晃 (A / D / W 鍵)</strong>：在彈珠落下碰撞釘板時，適時輕拍機台左側、右側或頂撞機台微調滑落軌跡，挑戰 300分、200分及150分等高倍孔！請注意：短時間內連續拍擊 3 次將觸發 TILT 防弊警報。
            </p>
          </div>

          {/* Card 4: Ball Packages Purchase (Shares inventory with Plinko) */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-col gap-2 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-stone-300 font-bold">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span>購買彈珠套餐 (與金字塔彈珠台共用庫存)：</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BALL_PACKAGES.map((pkg) => (
                <button
                  key={pkg.balls}
                  type="button"
                  onClick={() => handleBuyBalls(pkg)}
                  className="p-1.5 rounded-lg text-xs font-bold border border-amber-500/40 bg-stone-950 hover:bg-amber-500/20 text-amber-300 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                >
                  <span className="font-black">{pkg.label}</span>
                  <span className="font-mono text-stone-400 text-[10px]">(${pkg.cost})</span>
                  {pkg.discount && (
                    <span className="text-[9px] px-1 py-0.2 bg-rose-500/20 text-rose-300 rounded font-normal">
                      {pkg.discount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
