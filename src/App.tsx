/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { INITIAL_BALANCE } from './utils/constants';
import { sound } from './utils/audio';
import { toastService } from './utils/toast';
import { recordCareerRound } from './utils/careerStats';
import { CasinoToastContainer } from './components/common/CasinoToastContainer';

import { LobbyView } from './components/lobby/LobbyView';

// Dynamic Code Splitting for Games to ensure ultra-fast initial lobby load
const RouletteTable = lazy(() => import('./components/roulette/RouletteTable').then(m => ({ default: m.RouletteTable })));
const BlackjackTable = lazy(() => import('./components/blackjack/BlackjackTable').then(m => ({ default: m.BlackjackTable })));
const SlotMachine = lazy(() => import('./components/slot/SlotMachine').then(m => ({ default: m.SlotMachine })));
const SibaGame = lazy(() => import('./components/siba/SibaGame').then(m => ({ default: m.SibaGame })));
const PokerTable = lazy(() => import('./components/poker/PokerTable').then(m => ({ default: m.PokerTable })));
const CrapsGame = lazy(() => import('./components/craps/CrapsGame').then(m => ({ default: m.CrapsGame })));
const PlinkoGame = lazy(() => import('./components/plinko/PlinkoGame').then(m => ({ default: m.PlinkoGame })));
const ClawMachine = lazy(() => import('./components/claw/ClawMachine').then(m => ({ default: m.ClawMachine })));
const TraditionalPinballGame = lazy(() => import('./components/pinball/TraditionalPinballGame').then(m => ({ default: m.TraditionalPinballGame })));

import { InventoryModal } from './components/inventory/InventoryModal';
import { ResetConfirmModal } from './components/common/ResetConfirmModal';
import { SystemSettingsModal } from './components/common/SystemSettingsModal';
import { CareerStatsModal } from './components/common/CareerStatsModal';
import { HotkeysModal } from './components/common/HotkeysModal';
import { TableNPCWidget } from './components/common/TableNPCWidget';
import { ToastAuraIndicator } from './components/common/ToastAuraIndicator';
import { LeaveTableDeliveryModal } from './components/common/LeaveTableDeliveryModal';
import { LeaveTableForfeitModal } from './components/common/LeaveTableForfeitModal';
import { GameRulesModal, GameTableId } from './components/common/GameRulesModal';
import { BankruptcyAlertModal } from './components/common/BankruptcyAlertModal';
import { GameOverModal } from './components/common/GameOverModal';
import { CurtainCallOverlay } from './components/common/CurtainCallOverlay';
import { PrologueModal } from './components/common/PrologueModal';
import { CashOutModal } from './components/common/CashOutModal';
import { CollectibleItem } from './types/inventory';
import { initStorageNotifier } from './utils/storageNotifier';
import { isAuraActive } from './utils/aura';
import {
  resetAllCasinoData,
  resetAllInventoryAndAchievements,
  getTotalInventoryCount,
  getPendingDeliveries,
  claimPendingDeliveries,
} from './utils/inventory';

import {
  Sparkles,
  Download,
  Info,
  RotateCcw,
  Volume2,
  VolumeX,
  Package,
  Coins,
  Settings,
  HelpCircle,
  Menu,
  Pin,
  PinOff,
  ChevronDown,
  ChevronUp,
  Music,
  Zap,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { VinylPlayer } from './components/common/VinylPlayer';
import { MinimalistTicker } from './components/common/MinimalistTicker';
import { isTurboMode, setTurboMode } from './utils/turbo';

const STORAGE_KEYS = {
  BALANCE: 'nocturnal_club_balance_v1',
  ACTIVE_TAB: 'casino_hub_active_tab_v1',
};

export type ActiveGameTab =
  | 'lobby'
  | 'roulette'
  | 'slot'
  | 'plinko'
  | 'blackjack'
  | 'poker'
  | 'siba'
  | 'craps'
  | 'claw'
  | 'pinball';

export const GAME_TABS: { id: ActiveGameTab; name: string; shortName: string; icon: string }[] = [
  { id: 'lobby', name: '大廳櫃台', shortName: '大廳', icon: '🏛️' },
  { id: 'roulette', name: '歐式輪盤', shortName: '輪盤', icon: '🎡' },
  { id: 'slot', name: '老虎機', shortName: '拉霸', icon: '🍒' },
  { id: 'blackjack', name: '21點', shortName: '21點', icon: '♠️' },
  { id: 'poker', name: '德州撲克', shortName: '德撲', icon: '🃏' },
  { id: 'siba', name: '十八仔', shortName: '十八仔', icon: '🎲' },
  { id: 'craps', name: '花旗骰', shortName: '花旗骰', icon: '🎲' },
  { id: 'pinball', name: '打彈珠', shortName: '打彈珠', icon: '🔴' },
  { id: 'plinko', name: '彈珠台', shortName: '彈珠', icon: '🎯' },
  { id: 'claw', name: '夾娃娃機', shortName: '娃娃機', icon: '🕹️' },
];

export default function App() {
  // Active game module: Default to 'lobby'
  const [activeGame, setActiveGame] = useState<ActiveGameTab>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
    if (
      saved === 'lobby' ||
      saved === 'roulette' ||
      saved === 'slot' ||
      saved === 'plinko' ||
      saved === 'blackjack' ||
      saved === 'poker' ||
      saved === 'siba' ||
      saved === 'craps' ||
      saved === 'claw' ||
      saved === 'pinball'
    ) {
      return saved as ActiveGameTab;
    }
    return 'lobby';
  });

  // Leave-Table Item Delivery Modal Interceptor state
  const [pendingLeaveModal, setPendingLeaveModal] = useState<{
    isOpen: boolean;
    targetTab: ActiveGameTab;
    items: CollectibleItem[];
    sourceGameName: string;
  } | null>(null);

  // Leave-Table Active Round Forfeit Warning Interceptor state
  const [pendingForfeitModal, setPendingForfeitModal] = useState<{
    isOpen: boolean;
    targetTab: ActiveGameTab;
    sourceGameId: string;
    sourceGameName: string;
    sourceGameIcon?: string;
    targetGameName: string;
    targetGameIcon?: string;
    forfeitAmount: number;
  } | null>(null);

  // Global Virtual Chips Balance (shared across Roulette, Blackjack, Slot, Sic Bo)
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BALANCE) ?? localStorage.getItem('european_roulette_balance_v1');
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
    return INITIAL_BALANCE;
  });

  // Toast Aura state
  const [auraActive, setAuraActive] = useState<boolean>(() => isAuraActive());
  useEffect(() => {
    const handleAura = () => setAuraActive(isAuraActive());
    window.addEventListener('casino_aura_updated', handleAura);
    return () => window.removeEventListener('casino_aura_updated', handleAura);
  }, []);

  // Global selected chip denomination (shared across tables)
  const [selectedChip, setSelectedChip] = useState<number>(100);

  // ==================== GLOBAL APP STATE ====================
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState<number>(sound.volume);
  const [turboMode, setTurboModeState] = useState(() => isTurboMode());

  // Listen for turbo changes from settings modal or hotkeys
  useEffect(() => {
    const handleTurboEvent = (e: any) => {
      setTurboModeState(Boolean(e.detail?.enabled));
    };
    window.addEventListener('casino_turbo_change', handleTurboEvent);
    return () => {
      window.removeEventListener('casino_turbo_change', handleTurboEvent);
    };
  }, []);

  const handleToggleTurbo = useCallback(() => {
    const next = !turboMode;
    setTurboModeState(next);
    setTurboMode(next);
    sound.playClick();
    toastService.info(next ? '⚡ 急速模式已啟用 (跳過漫長開彩物理等待)' : '⏳ 已恢復標準真實物理節奏');
  }, [turboMode]);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);
  const [isCareerStatsModalOpen, setIsCareerStatsModalOpen] = useState(false);
  const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isPrologueOpen, setIsPrologueOpen] = useState(() => {
    return !localStorage.getItem('nocturnal_prologue_viewed');
  });
  const [isCashOutOpen, setIsCashOutOpen] = useState(false);
  const [isBankruptcyAlertOpen, setIsBankruptcyAlertOpen] = useState(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState(false);
  const [isCurtainClosing, setIsCurtainClosing] = useState(false);
  const [isCurtainOpening, setIsCurtainOpening] = useState(false);
  const [lobbyTab, setLobbyTab] = useState<'counter' | 'blackmarket' | 'pawnshop' | 'collection'>('counter');
  const [isUnderBankruptcyPawn, setIsUnderBankruptcyPawn] = useState(false);
  const [inventoryCount, setInventoryCount] = useState({ total: 0, redeemablesCount: 0, collectiblesCount: 0 });
  const [isGameRoundBusy, setIsGameRoundBusy] = useState(false);
  const [currentGameBetAtStake, setCurrentGameBetAtStake] = useState(0);

  const handleRoundBusyChange = useCallback((isBusy: boolean, currentBet = 0) => {
    setIsGameRoundBusy(isBusy);
    setCurrentGameBetAtStake(isBusy ? currentBet : 0);
  }, []);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Minimalist Lounge UI: Unified Top Bar & Dropdown Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerPinned, setIsDrawerPinned] = useState(() => {
    return localStorage.getItem('casino_top_drawer_pinned') === 'true';
  });
  const topBarRef = React.useRef<HTMLDivElement>(null);
  const drawerLeaveTimerRef = React.useRef<any>(null);

  const handleTopMouseEnter = useCallback(() => {
    if (drawerLeaveTimerRef.current) {
      clearTimeout(drawerLeaveTimerRef.current);
      drawerLeaveTimerRef.current = null;
    }
  }, []);

  const handleTopMouseLeave = useCallback(() => {
    if (drawerLeaveTimerRef.current) clearTimeout(drawerLeaveTimerRef.current);
    drawerLeaveTimerRef.current = setTimeout(() => {
      if (!isDrawerPinned) {
        setIsDrawerOpen(false);
      }
    }, 450);
  }, [isDrawerPinned]);

  const handleToggleDrawer = useCallback(() => {
    sound.playClick();
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const handleTogglePin = useCallback(() => {
    setIsDrawerPinned((prev) => {
      const next = !prev;
      localStorage.setItem('casino_top_drawer_pinned', next.toString());
      if (next) setIsDrawerOpen(false);
      return next;
    });
    sound.playClick();
    toastService.info(!isDrawerPinned ? '📌 頂部選單已釘選固定' : '✨ 頂部選單已切換為極簡膠囊模式 (點擊或懸浮展開)');
  }, [isDrawerPinned]);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target as Node)) {
        if (!isDrawerPinned && isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDrawerOpen, isDrawerPinned]);

  // Auto-Save Storage Interceptor & Event Listener
  useEffect(() => {
    initStorageNotifier();

    let saveTimer: any = null;
    const handleStorageSave = () => {
      setIsAutoSaving(true);
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        setIsAutoSaving(false);
      }, 1300);
    };

    window.addEventListener('casino-storage-saved', handleStorageSave);
    window.addEventListener('storage', handleStorageSave);

    return () => {
      window.removeEventListener('casino-storage-saved', handleStorageSave);
      window.removeEventListener('storage', handleStorageSave);
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  const handleChangeVolume = useCallback((vol: number) => {
    sound.setVolume(vol);
    setSoundVolume(vol);
  }, []);

  // Update inventory count
  const refreshInventoryCount = useCallback(() => {
    setInventoryCount(getTotalInventoryCount());
  }, []);

  useEffect(() => {
    refreshInventoryCount();
  }, [balance, activeGame, isInventoryModalOpen, refreshInventoryCount]);

  // Bankruptcy & Game Over Monitoring Engine
  useEffect(() => {
    // 1. Never trigger bankruptcy check while any game round is in progress or bets are placed on table
    const isBusy = isGameRoundBusy || currentGameBetAtStake > 0;
    if (isBusy) {
      if (isBankruptcyAlertOpen) {
        setIsBankruptcyAlertOpen(false);
      }
      return;
    }

    // 2. Check bankruptcy when balance <= 99 (below minimum bet 100 點 across all tables)
    if (balance <= 99) {
      if (
        !isUnderBankruptcyPawn &&
        !isBankruptcyAlertOpen &&
        !isGameOverOpen &&
        !isCurtainClosing
      ) {
        // If in lobby, show immediately. If on an active game table, provide a 2500ms grace period
        // so that in-flight bets, deals, dice rolls, spins, or settled payouts resolve completely without premature transfer!
        const delayMs = activeGame === 'lobby' ? 0 : 2500;
        const timer = setTimeout(() => {
          if (
            !isGameRoundBusy &&
            currentGameBetAtStake === 0 &&
            balance <= 99 &&
            !isUnderBankruptcyPawn &&
            !isGameOverOpen &&
            !isCurtainClosing
          ) {
            // Check player's assets (redeemables and collectibles)
            claimPendingDeliveries();
            const counts = getTotalInventoryCount();
            if (counts.redeemablesCount === 0 && counts.collectiblesCount === 0) {
              // Condition C: Completely broke with zero assets -> Direct Game Over curtain call!
              setIsCurtainClosing(true);
            } else {
              // Condition A or B: Has redeemables or collectibles -> Show Bankruptcy Alert Modal
              setIsBankruptcyAlertOpen(true);
            }
          }
        }, delayMs);

        return () => clearTimeout(timer);
      }
    } else {
      // Balance is healthy (>= 100)
      if (isUnderBankruptcyPawn) {
        setIsUnderBankruptcyPawn(false);
        toastService.success('🎉 應急資金已入帳！賭桌鎖定已解除，隨時可前往各大賭桌！');
      }
      if (isBankruptcyAlertOpen) {
        setIsBankruptcyAlertOpen(false);
      }
    }
  }, [
    balance,
    isGameRoundBusy,
    currentGameBetAtStake,
    activeGame,
    isUnderBankruptcyPawn,
    isBankruptcyAlertOpen,
    isGameOverOpen,
    isCurtainClosing,
  ]);

  // Browser window tab closure / refresh safeguard during active bet
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameRoundBusy || currentGameBetAtStake > 0) {
        e.preventDefault();
        e.returnValue = '賭局正在進行中，若中途離場將沒收下注籌碼！';
        return '賭局正在進行中，若中途離場將沒收下注籌碼！';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGameRoundBusy, currentGameBetAtStake]);

  // Handle Bankruptcy Alert Confirmation -> Smart routing to Counter (Redeemables) or Pawn Shop (Collectibles)
  const handleConfirmBankruptcyAlert = useCallback(() => {
    setIsBankruptcyAlertOpen(false);

    // If there are pending table deliveries, intercept and show LeaveTableDeliveryModal!
    const pending = getPendingDeliveries();
    if (pending.length > 0) {
      const currentTabInfo = GAME_TABS.find((t) => t.id === activeGame);
      setPendingLeaveModal({
        isOpen: true,
        targetTab: 'lobby',
        items: pending,
        sourceGameName: currentTabInfo?.name || '現場賭桌',
      });
      setLobbyTab('pawnshop');
      setIsUnderBankruptcyPawn(true);
      return;
    }

    // Ensure any items are permanently claimed into the player's collection
    claimPendingDeliveries();
    refreshInventoryCount();

    const counts = getTotalInventoryCount();

    if (counts.redeemablesCount > 0) {
      // Condition A: Has redeemable tokens from claw machine -> Transfer to Lobby VIP Counter
      setActiveGame('lobby');
      setLobbyTab('counter');
      setIsUnderBankruptcyPawn(false);
      toastService.info('🎁 行囊中持有娃娃機代幣券！請在 VIP 櫃台進行 1:1 兌現以重返賭桌。');
    } else if (counts.collectiblesCount > 0) {
      // Condition B: Has collectibles -> Transfer to Underground Pawn Shop
      setActiveGame('lobby');
      setLobbyTab('pawnshop');
      setIsUnderBankruptcyPawn(true);
      toastService.info('💼 已轉移至地下當鋪救濟所，請典當珍品以獲取 80% 應急周轉金，或點擊離場結算。');
    } else {
      // Condition C: Completely broke -> Direct Game Over Curtain
      setIsCurtainClosing(true);
    }
  }, [activeGame, refreshInventoryCount]);

  // Handle Player refusing to pawn in bankruptcy mode or explicitly clicking leave / game over
  const handleTriggerGameOver = useCallback(() => {
    claimPendingDeliveries();
    refreshInventoryCount();
    setIsUnderBankruptcyPawn(false);
    setIsBankruptcyAlertOpen(false);
    setIsCurtainClosing(true);
  }, [refreshInventoryCount]);

  // Callback when curtain closing animation finishes
  const handleCurtainsClosed = useCallback(() => {
    setIsGameOverOpen(true);
  }, []);

  // Handle Restart Game from Game Over screen
  const handleRestartGame = useCallback(() => {
    resetAllCasinoData();
    window.dispatchEvent(new CustomEvent('casino_full_reset'));
    setBalance(INITIAL_BALANCE);
    setActiveGame('lobby');
    setLobbyTab('counter');
    setIsGameOverOpen(false);
    setIsCurtainClosing(false);
    setIsCurtainOpening(true);
    setIsUnderBankruptcyPawn(false);
    setIsBankruptcyAlertOpen(false);
    refreshInventoryCount();
    toastService.success('🔄 歡迎重新開始！已為您清空歷史戰績與圖鑑，並重新發放 20,000 點 VIP 籌碼！');

    setTimeout(() => {
      setIsCurtainOpening(false);
    }, 2400);
  }, [refreshInventoryCount]);

  // Global Keyboard Shortcuts (Hotkeys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      // 1. Esc: Close open modals/panels without leaving the current game table
      if (e.key === 'Escape') {
        if (
          isInventoryModalOpen ||
          isResetModalOpen ||
          isSystemModalOpen ||
          isCareerStatsModalOpen ||
          isHotkeysModalOpen ||
          isRulesModalOpen
        ) {
          setIsInventoryModalOpen(false);
          setIsResetModalOpen(false);
          setIsSystemModalOpen(false);
          setIsCareerStatsModalOpen(false);
          setIsHotkeysModalOpen(false);
          setIsRulesModalOpen(false);
          sound.playClick();
          return;
        }
      }

      // 2. T: Toggle Turbo Mode
      if (key === 'T') {
        e.preventDefault();
        handleToggleTurbo();
        return;
      }

      // 3. M: Toggle sound mute
      if (key === 'M') {
        e.preventDefault();
        const next = !soundEnabled;
        sound.enabled = next;
        setSoundEnabled(next);
        sound.playClick();
        toastService.info(next ? '🔊 音效已開啟' : '🔇 音效已靜音');
        return;
      }

      // 4. B: Toggle Backpack (Inventory)
      if (key === 'B') {
        e.preventDefault();
        sound.playClick();
        setIsInventoryModalOpen((prev) => !prev);
        return;
      }

      // 5. S: Toggle Career VIP Stats (Only if not in active round or game is not blackjack player_turn)
      if (key === 'S' && activeGame !== 'blackjack') {
        e.preventDefault();
        sound.playClick();
        setIsCareerStatsModalOpen((prev) => !prev);
        return;
      }

      // 6. 1-5: Quick select chip denominations (Unified: 100, 200, 500, 1000, 2000)
      const chipMap: { [k: string]: number } = {
        '1': 100,
        '2': 200,
        '3': 500,
        '4': 1000,
        '5': 2000,
      };
      if (chipMap[e.key]) {
        e.preventDefault();
        setSelectedChip(chipMap[e.key]);
        sound.playChip();
        toastService.info(`已切換籌碼面額: $${chipMap[e.key].toLocaleString()}`);
        return;
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    activeGame,
    soundEnabled,
    handleToggleTurbo,
    isInventoryModalOpen,
    isResetModalOpen,
    isSystemModalOpen,
    isCareerStatsModalOpen,
    isHotkeysModalOpen,
    isRulesModalOpen,
  ]);

  // Listen for casino_open_rules event
  useEffect(() => {
    const handleOpenRules = () => {
      sound.playClick();
      setIsRulesModalOpen(true);
    };
    window.addEventListener('casino_open_rules', handleOpenRules);
    return () => {
      window.removeEventListener('casino_open_rules', handleOpenRules);
    };
  }, []);

  // Sync balance to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BALANCE, balance.toString());
  }, [balance]);

  // Sync active game tab
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, activeGame);
  }, [activeGame]);

  // Trigger Reset Modal safeguard
  const handleOpenResetModal = () => {
    sound.playClick();
    setIsResetModalOpen(true);
  };

  // Perform confirmed hard reset of balance, game stats, and all inventories/achievements
  const handlePerformReset = () => {
    if (isGameRoundBusy || currentGameBetAtStake > 0) return;

    // Hard reset all casino stats, game counters, inventories, redeemables, collectibles, and achievements
    resetAllCasinoData();
    window.dispatchEvent(new CustomEvent('casino_full_reset'));
    setBalance(INITIAL_BALANCE);
    refreshInventoryCount();

    // Reset table busy flags and in-flight bets
    setIsGameRoundBusy(false);
    setCurrentGameBetAtStake(0);
    setIsUnderBankruptcyPawn(false);
    setIsBankruptcyAlertOpen(false);
    setIsGameOverOpen(false);
    setIsCurtainClosing(false);
    setIsCurtainOpening(false);
    setPendingLeaveModal(null);
    setPendingForfeitModal(null);
    setIsResetModalOpen(false);
    setIsSystemModalOpen(false);

    // Transfer player back to the Lobby (VIP Counter)
    setActiveGame('lobby');
    setLobbyTab('counter');

    sound.playWin();
    toastService.success('🔄 已重置為 $20,000 初始籌碼！已為您清空所有遊戲累計資料與背包，並已將您轉移回大廳。');
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sound.enabled = next;
    setSoundEnabled(next);
  };

  // Tab change handler with Leave-Table Interceptor
  const handleRequestTabChange = useCallback(
    (targetTab: ActiveGameTab) => {
      if (targetTab === activeGame) {
        setIsDrawerOpen(false);
        return;
      }

      // 1. Check if current table has an active round or placed bets
      // Note: 打彈珠 (pinball) 與彈珠台 (plinko) 離場無懲罰，保留彈珠庫存，直接放行離開
      const isExemptFromForfeit = activeGame === 'plinko' || activeGame === 'pinball';
      const isCurrentBusy = !isExemptFromForfeit && (isGameRoundBusy || currentGameBetAtStake > 0);
      const currentAtStake = isExemptFromForfeit ? 0 : currentGameBetAtStake;

      if (isCurrentBusy) {
        sound.playLoss();
        const currentTabInfo = GAME_TABS.find((t) => t.id === activeGame);
        const targetTabInfo = GAME_TABS.find((t) => t.id === targetTab);
        setPendingForfeitModal({
          isOpen: true,
          targetTab,
          sourceGameId: activeGame,
          sourceGameName: currentTabInfo?.name || '現場賭桌',
          sourceGameIcon: currentTabInfo?.icon || '♠️',
          targetGameName: targetTabInfo?.name || '目標賭桌',
          targetGameIcon: targetTabInfo?.icon || '🏛️',
          forfeitAmount: currentAtStake,
        });
        setIsDrawerOpen(false);
        return;
      }

      // Prevent entering game tables if balance is below 100
      if (balance <= 99 && targetTab !== 'lobby') {
        sound.playLoss();
        const counts = getTotalInventoryCount();
        if (counts.redeemablesCount > 0) {
          toastService.error('🚨 當前籌碼低於 100 點，賭桌已暫時鎖定！您身上持有代幣券，請前往大廳 VIP 櫃台進行 1:1 兌換籌碼！');
        } else if (counts.collectiblesCount > 0) {
          toastService.error('🚨 當前籌碼低於 100 點，賭桌已暫時鎖定！請在地下當鋪典當珍品以獲取周轉金，或點擊「結束遊戲結算」。');
        } else {
          toastService.error('🚨 當前籌碼低於 100 點且無可用資產，請確認結束遊戲結算！');
        }
        return;
      }

      const pending = getPendingDeliveries();
      if (pending.length > 0) {
        const currentTabInfo = GAME_TABS.find((t) => t.id === activeGame);
        setPendingLeaveModal({
          isOpen: true,
          targetTab,
          items: pending,
          sourceGameName: currentTabInfo?.name || '現場賭桌',
        });
        return;
      }

      sound.playChip();
      setIsGameRoundBusy(false);
      setCurrentGameBetAtStake(0);
      setActiveGame(targetTab);
      setIsDrawerOpen(false);
    },
    [activeGame, balance, isGameRoundBusy, currentGameBetAtStake, isUnderBankruptcyPawn]
  );

  // Handle user confirming forfeit and leaving table
  const handleConfirmForfeitAndLeave = useCallback(() => {
    if (!pendingForfeitModal) return;
    const { targetTab, sourceGameId, sourceGameName, forfeitAmount } = pendingForfeitModal;

    // Execute forfeit
    window.dispatchEvent(new CustomEvent('casino_forfeit_round', { detail: { sourceGameId } }));

    sound.playLoss();
    if (forfeitAmount > 0) {
      toastService.warn(`🚨 已強制離場！【${sourceGameName}】本局下注的 $${forfeitAmount.toLocaleString()} 點籌碼已全數沒收！`, '警告');
      recordCareerRound({
        gameId: sourceGameId,
        betAmount: forfeitAmount,
        winAmount: 0,
        multiplier: 0,
      });
    } else {
      toastService.warn(`⚠️ 已強制終止【${sourceGameName}】進行中賭局並離開。`, '警告');
    }

    setIsGameRoundBusy(false);
    setCurrentGameBetAtStake(0);
    setPendingForfeitModal(null);

    // After forfeit, check if pending deliveries exist
    const pending = getPendingDeliveries();
    if (pending.length > 0) {
      setPendingLeaveModal({
        isOpen: true,
        targetTab,
        items: pending,
        sourceGameName,
      });
      return;
    }

    sound.playChip();
    setActiveGame(targetTab);
    setIsDrawerOpen(false);
  }, [pendingForfeitModal]);

  // Handle user cancelling forfeit and returning to table
  const handleCancelForfeit = useCallback(() => {
    sound.playClick();
    setPendingForfeitModal(null);
  }, []);

  // Confirm leave table delivery and proceed with navigation
  const handleConfirmLeaveTableDelivery = useCallback(() => {
    claimPendingDeliveries();
    refreshInventoryCount();
    if (pendingLeaveModal) {
      sound.playChip();
      setIsGameRoundBusy(false);
      setCurrentGameBetAtStake(0);
      setActiveGame(pendingLeaveModal.targetTab);
      setPendingLeaveModal(null);
      setIsDrawerOpen(false);
      if (balance <= 99 || isUnderBankruptcyPawn) {
        const counts = getTotalInventoryCount();
        if (counts.redeemablesCount > 0) {
          setLobbyTab('counter');
          setIsUnderBankruptcyPawn(false);
          toastService.info('🎁 您持有代幣券，已引導至大廳 VIP 櫃台進行 1:1 兌現！');
        } else {
          setLobbyTab('pawnshop');
          setIsUnderBankruptcyPawn(true);
          toastService.info('💼 已轉移至地下當鋪救濟所，您剛收到的珍藏品已收入行囊，可立即典當以獲取周轉金！');
        }
      }
    }
  }, [pendingLeaveModal, refreshInventoryCount, balance, isUnderBankruptcyPawn]);

  return (
    <div className="h-screen min-h-[100dvh] max-h-[100dvh] w-screen bg-[#07090e] text-stone-100 flex flex-col font-sans antialiased overflow-hidden select-none selection:bg-amber-500 selection:text-black relative">
      {/* ================= Unified Minimalist Floating Command Bar ================= */}
      <div
        id="unified-top-command-bar"
        ref={topBarRef}
        onMouseEnter={handleTopMouseEnter}
        onMouseLeave={handleTopMouseLeave}
        className="fixed top-1.5 left-1.5 right-1.5 sm:top-2.5 sm:left-4 sm:right-4 z-40 flex flex-col pointer-events-auto"
      >
        {/* Main Floating Capsule */}
        <div className="h-[42px] sm:h-[48px] px-2 sm:px-3.5 rounded-2xl bg-[#090c15]/95 hover:bg-[#0c0f1b]/98 backdrop-blur-xl border border-amber-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex items-center justify-between gap-1.5 sm:gap-3 transition-all duration-300">
          {/* [Left Dock]: Brand + Highlighted Gold Balance Badge + Auto-Save Dot */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              id="brand-logo-btn"
              onClick={() => handleRequestTabChange('lobby')}
              className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group text-left border-none bg-transparent p-0 transition-transform active:scale-95"
              title="點擊返回大廳櫃台"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-yellow-600 p-0.5 shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-stone-950 rounded-[9px] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div className="hidden lg:flex flex-col leading-tight">
                <span className="text-xs font-black text-white tracking-wide">大稻賭埕之夜</span>
                <span className="text-[8px] text-amber-400 font-mono font-bold tracking-wider">CASINO NIGHT</span>
              </div>
            </button>

            {/* Prominent Golden Chip Asset Card */}
            <div
              id="hud-chip-balance"
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-gradient-to-r from-amber-950/90 via-yellow-950/70 to-stone-950 border sm:border-2 border-amber-400/90 shadow-[0_0_16px_rgba(245,158,11,0.4)]"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 flex items-center justify-center shadow-xs shrink-0">
                <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-stone-950" />
              </div>
              <span className="font-mono font-black text-xs sm:text-sm text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 tracking-tight">
                {balance.toLocaleString()}
              </span>
              {/* Subtle green pulse auto-save dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full ml-0.5 transition-all ${
                  isAutoSaving ? 'bg-emerald-400 shadow-[0_0_6px_#34d399] animate-ping' : 'bg-emerald-500/70'
                }`}
                title={isAutoSaving ? '已自動存檔' : '全數據即時自動存檔保護中'}
              />
            </div>
          </div>

          {/* [Center Dock]: Pinned Horizontal Tabs OR Dynamic Game Selector Pill */}
          {isDrawerPinned ? (
            <div className="flex-1 flex justify-center overflow-x-auto scrollbar-none px-1">
              <nav className="flex items-center bg-stone-950/90 p-0.5 rounded-xl border border-stone-800/80 shadow-inner max-w-full overflow-x-auto scrollbar-none gap-1">
                {GAME_TABS.map((tab) => {
                  const isActive = activeGame === tab.id;
                  return (
                    <button
                      key={tab.id}
                      id={`tab-btn-${tab.id}`}
                      onClick={() => handleRequestTabChange(tab.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black'
                          : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
                      }`}
                    >
                      {tab.shortName || tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          ) : (
            <div className="flex items-center justify-center min-w-0">
              <button
                id="btn-trigger-game-dropdown"
                onClick={handleToggleDrawer}
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-xl border transition-all cursor-pointer shadow-md active:scale-95 max-w-[130px] sm:max-w-none truncate ${
                  isDrawerOpen
                    ? 'bg-amber-500 text-stone-950 border-amber-300 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-950/80 hover:bg-stone-900 border-amber-500/40 text-amber-300 hover:text-amber-200'
                }`}
                title="點擊展開/收合所有遊戲導覽"
              >
                <span className="text-xs sm:text-sm font-bold flex items-center gap-1 truncate">
                  <span>{GAME_TABS.find((t) => t.id === activeGame)?.icon}</span>
                  <span className="truncate">{GAME_TABS.find((t) => t.id === activeGame)?.name || '遊戲選擇'}</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                    isDrawerOpen ? 'rotate-180 text-stone-950' : 'text-amber-400'
                  }`}
                />
              </button>
            </div>
          )}

          {/* [Right Dock]: Vinyl Music Player + Help + Backpack + System Settings + Pin */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <VinylPlayer variant="compact" onOpenSystemSettings={() => setIsSystemModalOpen(true)} />

            {/* Table Spectator NPC (if on game table) */}
            {activeGame !== 'lobby' && (
              <div className="hidden xl:block">
                <TableNPCWidget
                  gameId={activeGame}
                  gameName={GAME_TABS.find((t) => t.id === activeGame)?.name || '賭桌'}
                  balance={balance}
                  onUpdateBalance={(newBal) => {
                    setBalance(newBal);
                    refreshInventoryCount();
                  }}
                />
              </div>
            )}

            {/* Rules & Help (Visible on tablet/desktop, accessible via system settings on mobile) */}
            <button
              id="btn-global-game-rules"
              onClick={() => {
                sound.playClick();
                setIsRulesModalOpen(true);
              }}
              className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/50 text-xs font-bold transition-all cursor-pointer active:scale-95 items-center gap-1 min-h-[38px] min-w-[38px] justify-center"
              title="開啟玩法規則與功能說明"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-xs">說明</span>
            </button>

            {/* Backpack */}
            <button
              id="btn-global-inventory"
              onClick={() => {
                sound.playClick();
                setIsInventoryModalOpen(true);
              }}
              className="relative p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px]"
              title="開啟玩家專屬背包"
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-xs">背包</span>
              {inventoryCount.total > 0 && (
                <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse">
                  {inventoryCount.total}
                </span>
              )}
            </button>

            {/* Quick Turbo Mode Toggle Button (Desktop/Tablet quick toggle; on mobile in System Modal) */}
            <button
              id="btn-global-turbo-mode"
              onClick={handleToggleTurbo}
              className={`hidden sm:flex p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 items-center justify-center gap-1 min-h-[38px] min-w-[38px] ${
                turboMode
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700'
              }`}
              title={
                turboMode
                  ? '⚡ 急速模式：已開啟 (點擊關閉 / 快捷鍵 T)'
                  : '⚡ 急速模式：已關閉 (點擊開啟 / 快捷鍵 T)'
              }
            >
              <Zap
                className={`w-3.5 h-3.5 ${
                  turboMode ? 'fill-amber-400 text-amber-400 animate-pulse' : 'text-stone-400'
                }`}
              />
              <span className="hidden md:inline text-xs">
                {turboMode ? '急速 ON' : '急速 OFF'}
              </span>
            </button>

            {/* System Settings */}
            <button
              id="btn-global-system-settings"
              onClick={() => {
                sound.playClick();
                setIsSystemModalOpen(true);
              }}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-200 border border-stone-700 hover:border-amber-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1 min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px]"
              title="開啟系統功能與音控台"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline text-xs">系統</span>
            </button>

            {/* Cash Out & Session Settlement Button (Desktop/Tablet quick button; on mobile in System Modal) */}
            <button
              id="btn-global-cash-out"
              onClick={() => {
                sound.playClick();
                setIsCashOutOpen(true);
              }}
              className="hidden sm:flex p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-gradient-to-r from-amber-600/80 to-rose-600/80 hover:from-amber-500 hover:to-rose-500 text-white border border-amber-400/60 text-xs font-bold transition-all cursor-pointer active:scale-95 items-center justify-center gap-1 min-h-[38px] min-w-[38px] shadow-[0_0_10px_rgba(245,158,11,0.25)]"
              title="結算今晚戰績並離場"
            >
              <LogOut className="w-3.5 h-3.5 text-yellow-300" />
              <span className="hidden md:inline text-xs font-black">離場</span>
            </button>

            {/* Pin Toggle (Hidden on mobile < sm where dropdown tap is natural) */}
            <button
              id="btn-toggle-pin-drawer"
              onClick={handleTogglePin}
              className={`hidden sm:flex p-1.5 rounded-xl border text-xs transition-all cursor-pointer active:scale-95 min-h-[38px] min-w-[38px] items-center justify-center ${
                isDrawerPinned
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-stone-900/90 hover:bg-stone-800 text-stone-400 hover:text-white border-stone-700'
              }`}
              title={isDrawerPinned ? '解除釘選 (改為極簡膠囊模式)' : '釘選頂部導覽列 (常駐顯示)'}
            >
              {isDrawerPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dropdown Floating Game Drawer (Smooth Animated Dropdown Card) */}
        {!isDrawerPinned && isDrawerOpen && (
          <div
            id="game-dropdown-drawer"
            className="mt-1.5 p-2 sm:p-2.5 rounded-2xl bg-[#0a0d18]/98 backdrop-blur-2xl border border-amber-500/35 shadow-[0_15px_45px_rgba(0,0,0,0.95)] flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50"
          >
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
              {GAME_TABS.map((tab) => {
                const isActive = activeGame === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`drawer-tab-btn-${tab.id}`}
                    onClick={() => {
                      handleRequestTabChange(tab.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 touch-manipulation min-h-[44px] ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 shadow-[0_0_14px_rgba(245,158,11,0.6)] font-black'
                        : 'text-stone-300 hover:text-white hover:bg-stone-800/90 border border-stone-800/80 hover:border-amber-500/30'
                    }`}
                  >
                    <span className="text-base sm:text-sm">{tab.icon}</span>
                    <span className="text-[11px] sm:text-xs md:text-sm">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Spectator NPC in Drawer for smaller screens */}
            {activeGame !== 'lobby' && (
              <div className="xl:hidden ml-auto shrink-0">
                <TableNPCWidget
                  gameId={activeGame}
                  gameName={GAME_TABS.find((t) => t.id === activeGame)?.name || '賭桌'}
                  balance={balance}
                  onUpdateBalance={(newBal) => {
                    setBalance(newBal);
                    refreshInventoryCount();
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= Main Dynamic Stage (Center) ================= */}
      <main className="flex-1 min-h-0 h-full w-full overflow-y-auto lg:overflow-hidden p-1.5 sm:p-2.5 pt-13 sm:pt-14 relative flex flex-col justify-between">
        {/* Ambient Slow Neon Breathing Lighting Background */}
        <div className="absolute inset-0 pointer-events-none neon-breathing-bg bg-[radial-gradient(ellipse_at_50%_35%,_rgba(245,158,11,0.06),_transparent_75%)]" />

        {/* Full-Page Toast Lucky Aura: Encircles the ENTIRE game workspace including betting area */}
        {auraActive && activeGame !== 'lobby' && (
          <div
            id="page-toast-aura-glow"
            className="absolute inset-2 sm:inset-2.5 top-13 sm:top-14 rounded-2xl pointer-events-none z-40 toast-aura-page-glow animate-in fade-in duration-500"
          />
        )}

        {/* ==================== 0. LOBBY COUNTER & TRADING HUB VIEW ==================== */}
        {activeGame === 'lobby' && (
          <div className="w-full h-full overflow-hidden animate-fade-in">
            <LobbyView
              balance={balance}
              initialTab={lobbyTab}
              isBankruptcyMode={isUnderBankruptcyPawn}
              onTriggerGameOver={handleTriggerGameOver}
              onUpdateBalance={(newBal) => setBalance(newBal)}
              onSelectGame={(game) => handleRequestTabChange(game)}
            />
          </div>
        )}

        {/* ==================== GAME TABLES (DYNAMIC CODE-SPLIT WITH SUSPENSE) ==================== */}
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-stone-400 bg-[#090b10]">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              <span className="text-xs font-mono tracking-widest text-amber-300/80 uppercase">Entering Room...</span>
            </div>
          }
        >
          {/* ==================== 1. EUROPEAN ROULETTE VIEW ==================== */}
          {activeGame === 'roulette' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <RouletteTable
                balance={balance}
                onUpdateBalance={(newBal) => {
                  setBalance(newBal);
                  refreshInventoryCount();
                }}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
                onResetBalance={handleOpenResetModal}
              />
            </div>
          )}

          {/* ==================== 2. BLACKJACK VIEW ==================== */}
          {activeGame === 'blackjack' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <BlackjackTable
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                onResetBalance={handleOpenResetModal}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 3. SLOT MACHINE VIEW ==================== */}
          {activeGame === 'slot' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <SlotMachine
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 4. SI-BŌ-Á (十八仔) VIEW ==================== */}
          {activeGame === 'siba' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <SibaGame
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 5. TEXAS HOLD'EM 1V1 (德州撲克) VIEW ==================== */}
          {activeGame === 'poker' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <PokerTable
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                onResetBalance={handleOpenResetModal}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 6. CRAPS (花旗骰) VIEW ==================== */}
          {activeGame === 'craps' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <CrapsGame
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 7. PLINKO (彈珠台) VIEW ==================== */}
          {activeGame === 'plinko' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <PlinkoGame
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                selectedChip={selectedChip}
                onSelectChip={setSelectedChip}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 8. CLAW MACHINE (夾娃娃機) VIEW ==================== */}
          {activeGame === 'claw' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <ClawMachine
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                onNavigateToLobby={() => {
                  handleRequestTabChange('lobby');
                }}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}

          {/* ==================== 9. TRADITIONAL PINBALL (夜市打彈珠) VIEW ==================== */}
          {activeGame === 'pinball' && (
            <div className="w-full h-full overflow-hidden animate-fade-in">
              <TraditionalPinballGame
                balance={balance}
                onUpdateBalance={(newBal) => setBalance(newBal)}
                onNavigateToLobby={() => {
                  handleRequestTabChange('lobby');
                }}
                soundEnabled={soundEnabled}
                onRoundBusyChange={handleRoundBusyChange}
              />
            </div>
          )}
        </Suspense>
      </main>

      {/* Global Inventory Modal */}
      <InventoryModal
        isOpen={isInventoryModalOpen}
        onClose={() => {
          setIsInventoryModalOpen(false);
          refreshInventoryCount();
        }}
        balance={balance}
        onUpdateBalance={(newBal) => setBalance(newBal)}
        onNavigateToLobby={() => {
          handleRequestTabChange('lobby');
        }}
      />

      {/* Hard Reset Confirmation Safeguard Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handlePerformReset}
      />

      {/* System Settings Modal */}
      <SystemSettingsModal
        isOpen={isSystemModalOpen}
        onClose={() => setIsSystemModalOpen(false)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        soundVolume={soundVolume}
        onChangeVolume={handleChangeVolume}
        onTriggerReset={() => setIsResetModalOpen(true)}
        onOpenCareerStats={() => setIsCareerStatsModalOpen(true)}
        onOpenHotkeys={() => setIsHotkeysModalOpen(true)}
        onOpenPrologue={() => setIsPrologueOpen(true)}
      />

      {/* VIP Career Stats Modal */}
      <CareerStatsModal
        isOpen={isCareerStatsModalOpen}
        onClose={() => setIsCareerStatsModalOpen(false)}
        currentBalance={balance}
      />

      {/* Global Hotkeys Guide Modal */}
      <HotkeysModal
        isOpen={isHotkeysModalOpen}
        onClose={() => setIsHotkeysModalOpen(false)}
      />

      {/* Global Non-Blocking Toast Notification Container */}
      <CasinoToastContainer />

      {/* Leave-Table Active Round Forfeit Warning Interceptor Modal */}
      {pendingForfeitModal && (
        <LeaveTableForfeitModal
          isOpen={pendingForfeitModal.isOpen}
          sourceGameId={pendingForfeitModal.sourceGameId}
          sourceGameName={pendingForfeitModal.sourceGameName}
          sourceGameIcon={pendingForfeitModal.sourceGameIcon}
          targetGameName={pendingForfeitModal.targetGameName}
          targetGameIcon={pendingForfeitModal.targetGameIcon}
          forfeitAmount={pendingForfeitModal.forfeitAmount}
          onCancel={handleCancelForfeit}
          onConfirmForfeit={handleConfirmForfeitAndLeave}
        />
      )}

      {/* Leave-Table Item Delivery Modal Interceptor */}
      {pendingLeaveModal && (
        <LeaveTableDeliveryModal
          isOpen={pendingLeaveModal.isOpen}
          pendingItems={pendingLeaveModal.items}
          sourceGameName={pendingLeaveModal.sourceGameName}
          onConfirm={handleConfirmLeaveTableDelivery}
        />
      )}

      {/* Global Table Game Rules & Features Modal (各桌玩法說明、功能導覽與倍率表) */}
      <GameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        defaultGameId={activeGame === 'lobby' ? 'roulette' : (activeGame as GameTableId)}
      />

      {/* Bankruptcy Warning Alert Modal */}
      <BankruptcyAlertModal
        isOpen={isBankruptcyAlertOpen}
        balance={balance}
        collectiblesCount={inventoryCount.collectiblesCount}
        redeemablesCount={inventoryCount.redeemablesCount}
        onConfirm={handleConfirmBankruptcyAlert}
      />

      {/* Theatrical Curtain Call Closing & Opening Animation (淘汰閉幕拉簾動畫) */}
      <CurtainCallOverlay
        isClosing={isCurtainClosing}
        onCurtainsClosed={handleCurtainsClosed}
        isOpening={isCurtainOpening}
      />

      {/* Game Over Career Settlement Modal with Screenshot & Restart */}
      <GameOverModal
        isOpen={isGameOverOpen}
        finalBalance={balance}
        onRestart={handleRestartGame}
      />

      {/* Prologue Introduction Modal (首次進入俱樂部背景故事導覽) */}
      <PrologueModal
        isOpen={isPrologueOpen}
        onClose={() => {
          localStorage.setItem('nocturnal_prologue_viewed', 'true');
          setIsPrologueOpen(false);
        }}
      />

      {/* Cash Out Session Summary Modal (隨時離場結算今晚戰績) */}
      <CashOutModal
        isOpen={isCashOutOpen}
        onClose={() => setIsCashOutOpen(false)}
        currentBalance={balance}
        inventoryCount={inventoryCount.total}
        onResetSession={() => {
          setIsCashOutOpen(false);
          handleOpenResetModal();
        }}
      />

      {/* Minimalist Lounge Bottom Marquee Ticker (黑市動態跑馬燈與黑膠曲目資訊 - 手機版隱藏讓出空間) */}
      <div className="hidden sm:contents">
        <MinimalistTicker
          onOpenBlackMarket={() => {
            handleRequestTabChange('lobby');
            setLobbyTab('blackmarket');
          }}
        />
      </div>
    </div>
  );
}
