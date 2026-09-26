import React, { useState, useEffect, useCallback } from 'react';
import {
  RedeemableItem,
  CollectibleItem,
  BlackMarketNPC,
  Rarity,
  PawnedItemRecord,
} from '../../types/inventory';
import {
  getRedeemableItems,
  redeemSingleItem,
  redeemAllItems,
  getPlayerCollectibles,
  sellCollectibleToNPC,
  sellAllCollectiblesToNPC,
  buyCollectibleFromNPC,
  getLobbyActiveNPCs,
  refreshLobbyActiveNPCs,
  ALL_COLLECTIBLES,
  getNPCItemValuation,
  getPawnedItems,
  pawnCollectibleItem,
  redeemPawnedItem,
  calculatePawnAmount,
  unlockHiddenCollectible,
} from '../../utils/inventory';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';
import { PawnShopView } from './PawnShopView';
import { BarLoungeView } from './BarLoungeView';
import {
  Sparkles,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Coins,
  ArrowRight,
  TrendingUp,
  Package,
  Award,
  Gem,
  Flame,
  ShieldCheck,
  Zap,
  HelpCircle,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Store,
  DollarSign,
  UserCheck,
  Building2,
  Lock,
  Unlock,
  Wine,
  LogOut,
} from 'lucide-react';

interface LobbyViewProps {
  balance: number;
  initialTab?: 'counter' | 'blackmarket' | 'pawnshop' | 'collection' | 'bar';
  isBankruptcyMode?: boolean;
  onTriggerGameOver?: () => void;
  onOpenCashOut?: () => void;
  onUpdateBalance: (newBalance: number | ((prev: number) => number)) => void;
  onSelectGame: (
    game: 'roulette' | 'slot' | 'pinball' | 'plinko' | 'blackjack' | 'poker' | 'siba' | 'craps' | 'claw'
  ) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  balance,
  initialTab,
  isBankruptcyMode = false,
  onTriggerGameOver,
  onOpenCashOut,
  onUpdateBalance,
  onSelectGame,
}) => {
  // Inventory state
  const [redeemables, setRedeemables] = useState<RedeemableItem[]>(getRedeemableItems);
  const [collectibles, setCollectibles] = useState<CollectibleItem[]>(getPlayerCollectibles);
  const [pawnedItems, setPawnedItems] = useState<PawnedItemRecord[]>(getPawnedItems);
  const [activeNPCs, setActiveNPCs] = useState<BlackMarketNPC[]>(getLobbyActiveNPCs);
  const [selectedNPCIndex, setSelectedNPCIndex] = useState<number>(0);
  const [selectedCollectible, setSelectedCollectible] = useState<CollectibleItem | null>(null);
  const [selectedTab, setSelectedTab] = useState<'counter' | 'blackmarket' | 'pawnshop' | 'collection' | 'bar'>(
    initialTab || 'counter'
  );

  // Sync tab if initialTab changes
  useEffect(() => {
    if (initialTab) {
      setSelectedTab(initialTab);
    }
  }, [initialTab]);

  // NPC countdown timer (180 seconds cycle)
  const [timeLeft, setTimeLeft] = useState<number>(180);

  // Manual Refresh Cooldown Timer (180 seconds CD)
  const [manualRefreshCooldown, setManualRefreshCooldown] = useState<number>(() => {
    const lastRefresh = localStorage.getItem('casino_vip_last_manual_refresh');
    if (!lastRefresh) return 0;
    const elapsed = Math.floor((Date.now() - parseInt(lastRefresh, 10)) / 1000);
    return Math.max(0, 180 - elapsed);
  });

  // Floating celebration toast for chip gains
  const [toastMessage, setToastMessage] = useState<{
    amount: number;
    title: string;
    description: string;
  } | null>(null);

  // Active chosen NPC
  const activeNPC = activeNPCs[selectedNPCIndex] || activeNPCs[0];

  // Load inventory on mount and sync state
  const reloadData = useCallback(() => {
    setRedeemables(getRedeemableItems());
    setCollectibles(getPlayerCollectibles());
    setPawnedItems(getPawnedItems());
    setActiveNPCs(getLobbyActiveNPCs());
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Listen to global inventory changes
  useEffect(() => {
    const handleInvChange = () => {
      setRedeemables(getRedeemableItems());
      setCollectibles(getPlayerCollectibles());
      setPawnedItems(getPawnedItems());
    };
    const handleFullReset = () => {
      reloadData();
      setManualRefreshCooldown(0);
      setSelectedCollectible(null);
    };
    window.addEventListener('casino_inventory_changed', handleInvChange);
    window.addEventListener('casino_full_reset', handleFullReset);
    return () => {
      window.removeEventListener('casino_inventory_changed', handleInvChange);
      window.removeEventListener('casino_full_reset', handleFullReset);
    };
  }, [reloadData]);

  // 180-second Countdown & auto-refresh timer for Black Market NPC & Cooldown Check
  useEffect(() => {
    const checkTimer = () => {
      const npcs = getLobbyActiveNPCs();
      if (npcs && npcs.length > 0) {
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((npcs[0].expiresAt - now) / 1000));

        if (remainingSeconds <= 0) {
          const newNPCs = refreshLobbyActiveNPCs();
          setActiveNPCs(newNPCs);
          setTimeLeft(180);
        } else {
          setTimeLeft(remainingSeconds);
        }
      }

      // Check manual refresh cooldown
      const lastRefresh = localStorage.getItem('casino_vip_last_manual_refresh');
      if (lastRefresh) {
        const elapsed = Math.floor((Date.now() - parseInt(lastRefresh, 10)) / 1000);
        const cdLeft = Math.max(0, 180 - elapsed);
        setManualRefreshCooldown(cdLeft);
      } else {
        setManualRefreshCooldown(0);
      }
    };

    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handler for manual VIP refresh with 180s Cooldown
  const handleManualVIPRefresh = useCallback(() => {
    if (manualRefreshCooldown > 0) return;
    sound.playClick();
    const newNpcs = refreshLobbyActiveNPCs();
    setActiveNPCs(newNpcs);
    setSelectedNPCIndex(0);
    setSelectedCollectible(null);
    localStorage.setItem('casino_vip_last_manual_refresh', String(Date.now()));
    setManualRefreshCooldown(180);
    triggerToast(0, '貴賓名單已刷新', '黑市貴賓廊迎來了新出沒的神秘買家！(冷卻時間：180秒)');
  }, [manualRefreshCooldown]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Total redeemable value
  const totalRedeemableValue = redeemables.reduce((sum, item) => sum + item.value, 0);

  // Target item for the active NPC
  const targetItem = ALL_COLLECTIBLES.find((c) => c.id === activeNPC?.targetCollectibleId);
  const playerHasTargetItem = Boolean(
    collectibles.some((c) => c.id === activeNPC?.targetCollectibleId)
  );

  // Show Toast
  const triggerToast = (amount: number, title: string, description: string) => {
    setToastMessage({ amount, title, description });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // 1. Redeem Single Item at Counter 1:1
  const handleRedeemSingle = (item: RedeemableItem) => {
    sound.playCoinPayout();
    const { amount, remaining } = redeemSingleItem(item.id);
    const newBalance = balance + amount;
    onUpdateBalance(newBalance);
    setRedeemables(remaining);
    triggerToast(amount, '櫃台 1:1 兌現成功', `【${item.name}】已成功換為 $${amount.toLocaleString()} 籌碼！`);
    if (balance < 100 && newBalance >= 100) {
      toastService.success('🎉 籌碼已補充達 $100 以上，各賭桌鎖定狀態已解除！');
    }
  };

  // 2. Redeem All Items at Counter 1:1 (一鍵兌換籌碼)
  const handleRedeemAll = () => {
    if (redeemables.length === 0) return;
    sound.playBigWin();
    sound.playCoinPayout();
    const { totalAmount, count } = redeemAllItems();
    const newBalance = balance + totalAmount;
    onUpdateBalance(newBalance);
    setRedeemables([]);
    triggerToast(
      totalAmount,
      '一鍵全數兌換成功！',
      `共清空 ${count} 張兌幣券，已全數 1:1 注入 $${totalAmount.toLocaleString()} 籌碼！`
    );
    if (balance < 100 && newBalance >= 100) {
      toastService.success('🎉 籌碼已全數補足，各大賭桌已解除鎖定，歡迎重返牌桌！');
    }
  };

  // 3. Sell Target Collectible to Black Market NPC (Extra High Multiplier)
  const handleSellTargetToNPC = () => {
    if (!activeNPC || !targetItem) return;
    sound.playBigWin();
    sound.playWin();
    const multiplier = activeNPC.targetMultiplier || activeNPC.multiplier;
    const { chipsEarned, remaining } = sellCollectibleToNPC(targetItem.id, multiplier);
    onUpdateBalance(balance + chipsEarned);
    setCollectibles(remaining);
    setSelectedCollectible(null);

    try {
      const sales = Number(localStorage.getItem('casino_npc_sales_count') || '0') + 1;
      localStorage.setItem('casino_npc_sales_count', String(sales));
      if (sales >= 5) {
        unlockHiddenCollectible('col-lobby-intel');
      }
    } catch {
      // ignore
    }

    triggerToast(
      chipsEarned,
      `🤝 黑市交易完成！`,
      `【${targetItem.name}】以 ${multiplier}X 溢價賣給 ${activeNPC.name}，獲得 $${chipsEarned.toLocaleString()} 籌碼！`
    );
  };

  // Check VIP Cat collectible when balance reaches 100,000
  useEffect(() => {
    if (balance >= 100000) {
      unlockHiddenCollectible('col-lobby-vip-cat');
    }
  }, [balance]);

  // 4. Sell Selected Collectible to Black Market NPC
  const handleSellSelectedToNPC = (item: CollectibleItem) => {
    if (!activeNPC) return;
    const valuation = getNPCItemValuation(activeNPC, item);

    sound.playBigWin();
    const { chipsEarned, remaining } = sellCollectibleToNPC(item.id, valuation.multiplier);
    onUpdateBalance(balance + chipsEarned);
    setCollectibles(remaining);
    setSelectedCollectible(null);

    try {
      const sales = Number(localStorage.getItem('casino_npc_sales_count') || '0') + 1;
      localStorage.setItem('casino_npc_sales_count', String(sales));
      if (sales >= 5) {
        unlockHiddenCollectible('col-lobby-intel');
      }
    } catch {
      // ignore
    }

    triggerToast(
      chipsEarned,
      `🤝 珍品轉讓成功！`,
      `【${item.name}】以 ${valuation.label} 賣給 ${activeNPC.name}，獲得 $${chipsEarned.toLocaleString()} 籌碼！`
    );
  };

  // 4b. Sell All Collectibles in Bag to Current Black Market NPC
  const handleSellAllToNPC = () => {
    if (!activeNPC || collectibles.length === 0) return;

    sound.playBigWin();
    const { totalChips, soldCount } = sellAllCollectiblesToNPC(activeNPC);
    onUpdateBalance(balance + totalChips);
    setCollectibles([]);
    setSelectedCollectible(null);

    try {
      const sales = Number(localStorage.getItem('casino_npc_sales_count') || '0') + soldCount;
      localStorage.setItem('casino_npc_sales_count', String(sales));
      if (sales >= 5) {
        unlockHiddenCollectible('col-lobby-intel');
      }
    } catch {
      // ignore
    }

    triggerToast(
      totalChips,
      `💎 珍品全數售出！`,
      `成功將 ${soldCount} 件珍品全數賣給【${activeNPC.name}】，合計獲得 $${totalChips.toLocaleString()} 籌碼！`
    );
  };

  // 5. Buy Marked-up Private Collectible from Black Market NPC (2x ~ 4x markup)
  const handleBuyCollectibleFromNPC = (npc: BlackMarketNPC) => {
    if (!npc.forSaleItem || npc.forSaleItem.isSoldOut) return;
    const cost = npc.forSaleItem.price;
    if (balance < cost) {
      sound.playLoss();
      triggerToast(
        0,
        '籌碼不足',
        `購買【${npc.forSaleItem.collectible.name}】需要 $${cost.toLocaleString()} 籌碼，您當前持有 $${balance.toLocaleString()}。`
      );
      return;
    }

    sound.playChip();
    onUpdateBalance(balance - cost);
    const result = buyCollectibleFromNPC(npc.id);
    if (result.success && result.item) {
      sound.playWin();
      triggerToast(
        result.item.basePrice,
        '黑市私貨收購成功！',
        `以 $${cost.toLocaleString()} 籌碼向【${npc.name}】購入了【${result.item.name}】！已存入您的珍品庫。`
      );
      setCollectibles(getPlayerCollectibles());
      setActiveNPCs(getLobbyActiveNPCs());
    } else {
      triggerToast(0, '收購失敗', result.message);
    }
  };

  // 6. Underground Pawn Shop Handlers (地下當鋪：80%典當/100%贖回)
  const handlePawnItem = (item: CollectibleItem) => {
    sound.playCoinPayout();
    const res = pawnCollectibleItem(item.id);
    if (res.success) {
      sound.playBigWin();
      onUpdateBalance(balance + res.pawnAmount);
      setCollectibles(getPlayerCollectibles());
      setPawnedItems(getPawnedItems());
      triggerToast(
        res.pawnAmount,
        '💼 典當質押成功 (獲得應急金)',
        `已將【${item.name}】典當給地下當鋪，獲得 80% 應急金 $${res.pawnAmount.toLocaleString()} 籌碼！`
      );
    } else {
      sound.playLoss();
      triggerToast(0, '典當失敗', res.message);
    }
  };

  const handleRedeemItem = (item: CollectibleItem) => {
    if (balance < item.basePrice) {
      sound.playLoss();
      triggerToast(0, '籌碼不足', `贖回【${item.name}】需要支付原價 $${item.basePrice.toLocaleString()} 籌碼！`);
      return;
    }

    sound.playCoinPayout();
    const res = redeemPawnedItem(item.id, balance);
    if (res.success) {
      sound.playBigWin();
      onUpdateBalance(balance - res.cost);
      setCollectibles(getPlayerCollectibles());
      setPawnedItems(getPawnedItems());
      triggerToast(
        -res.cost,
        '💎 珍品贖回成功！',
        `已支付原價 $${res.cost.toLocaleString()} 贖回【${item.name}】，珍品已歸還背包並重新照亮陳列館！`
      );
    } else {
      sound.playLoss();
      triggerToast(0, '贖回失敗', res.message);
    }
  };

  // 7. Interactive Chat Dialogue with Black Market NPC
  const [npcCustomDialogue, setNpcCustomDialogue] = useState<string | null>(null);
  const handleChatWithLobbyNPC = () => {
    if (!activeNPC) return;
    sound.playClick();
    const idles = activeNPC.idleReactions || [activeNPC.greeting];
    const quote = idles[Math.floor(Math.random() * idles.length)];
    setNpcCustomDialogue(quote);
    setTimeout(() => {
      setNpcCustomDialogue(null);
    }, 6000);
  };

  // Rarity color helpers
  const getRarityBadge = (rarity: Rarity) => {
    switch (rarity) {
      case 'legendary':
        return (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/50 font-black text-[10px]">
            傳奇
          </span>
        );
      case 'epic':
        return (
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/50 font-bold text-[10px]">
            史詩
          </span>
        );
      case 'rare':
        return (
          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/50 font-bold text-[10px]">
            稀有
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded bg-stone-500/20 text-stone-300 border border-stone-400/50 text-[10px]">
            普通
          </span>
        );
    }
  };

  return (
    <div
      id="lobby-view"
      className="relative w-full h-full flex flex-col justify-between gap-2.5 overflow-hidden animate-fade-in p-1 select-none"
    >
      {/* Floating Gain Toast Overlay */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-top-4 duration-300">
          <div className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-2 border-yellow-200 text-stone-950 shadow-[0_0_30px_rgba(245,158,11,0.8)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-950 flex items-center justify-center text-xl shrink-0 shadow-inner">
              💰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">{toastMessage.title}</span>
                <span className="font-mono font-black text-base bg-stone-950 text-amber-300 px-2 py-0.5 rounded-lg">
                  +${toastMessage.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs font-semibold text-stone-900 mt-0.5">
                {toastMessage.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP PROMOTIONAL LOBBY HERO BANNER (Height: ~75px) */}
      <div className="w-full shrink-0 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-stone-900/90 to-purple-950/80 border border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.6)] flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center text-xl">
              🏦
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white tracking-wider flex items-center gap-1.5">
                賭場大廳中央交易所 <span className="text-amber-400 text-xs font-mono font-bold">(CENTRAL EXCHANGE)</span>
              </h2>
            </div>
            <p className="text-xs text-stone-300">
              在賭桌中觸發神秘條件即可收穫稀有珍品，亦可在夾娃娃機夾取代幣向櫃台兌換籌碼！
            </p>
          </div>
        </div>

        {/* Quick Lobby Category Tabs */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-stone-800 gap-1">
          <button
            id="btn-tab-counter"
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedTab('counter');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'counter'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>【櫃台兌換處】({redeemables.length})</span>
          </button>

          <button
            id="btn-tab-blackmarket"
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedTab('blackmarket');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'blackmarket'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>
              【黑市貴賓廊】({activeNPCs.length} 位)
            </span>
          </button>

          <button
            id="btn-tab-bar"
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedTab('bar');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'bar'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Wine className="w-4 h-4 text-amber-300" />
            <span>【夜行酒吧】(老查理)</span>
          </button>

          <button
            id="btn-tab-pawnshop"
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedTab('pawnshop');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'pawnshop'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>【地下當鋪】({pawnedItems.length})</span>
          </button>

          <button
            id="btn-tab-collection"
            type="button"
            onClick={() => {
              sound.playClick();
              setSelectedTab('collection');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedTab === 'collection'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-black'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Award className="w-4 h-4 text-purple-400" />
            <span>【珍品陳列館】({collectibles.length}/{ALL_COLLECTIBLES.length})</span>
          </button>

          {onOpenCashOut && (
            <button
              id="btn-lobby-open-cashout"
              type="button"
              onClick={() => {
                sound.playClick();
                onOpenCashOut();
              }}
              className="ml-auto px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-md font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
              title="結算今夜戰績並生成離場報告"
            >
              <LogOut className="w-4 h-4 text-yellow-300" />
              <span>🚪 離場結算</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN TRADING STAGE (Height: flex-1) */}
      <div className="w-full flex-1 min-h-0 flex gap-3 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* TAB 1: COUNTER REDEMPTION VIEW (櫃台兌換處 - #lobby-counter) */}
        {/* ========================================================================= */}
        {selectedTab === 'counter' && (
          <div id="lobby-counter" className="w-full h-full flex flex-col gap-2 overflow-hidden">
            {/* Low Balance / Bankruptcy Emergency Redemption Prompt Banner */}
            {balance < 100 && redeemables.length > 0 && (
              <div className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-stone-900 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-200 font-bold">
                  <span className="text-base animate-pulse">⚠️</span>
                  <span>
                    您當前籌碼低於 $100 門檻賭桌暫時鎖定中！請兌換下方代幣道具（共可獲 +${totalRedeemableValue.toLocaleString()} 籌碼）以重啟各大賭桌！
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRedeemAll}
                  className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shrink-0 cursor-pointer shadow active:scale-95 transition-all"
                >
                  ⚡ 一鍵全數兌現
                </button>
              </div>
            )}

            <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-y-auto lg:overflow-hidden">
            {/* Left: Redeemable Tokens Inventory */}
            <div className="w-full lg:w-[60%] min-h-[300px] lg:min-h-0 h-full rounded-2xl bg-[#0c0e16] border border-amber-500/20 shadow-xl p-3 flex flex-col justify-between overflow-hidden shrink-0 lg:shrink">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-sm text-stone-100">
                    大廳代幣背包 (持有數量: {redeemables.length} 件)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">總可兌換籌碼:</span>
                  <span className="font-mono text-base font-black text-amber-300">
                    ${totalRedeemableValue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar my-2 pr-1 flex flex-col gap-2">
                {redeemables.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500">
                    <span className="text-4xl mb-2">🛍️</span>
                    <p className="text-sm font-bold text-stone-400">目前背包尚無兌幣道具</p>
                    <p className="text-xs text-stone-500 mt-1 max-w-sm">
                      前往「夾娃娃機」挑戰（每局 $100）即可夾取價值 $100 ~ $2,000 的代幣道具！
                    </p>
                    <button
                      type="button"
                      onClick={() => onSelectGame('claw')}
                      className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                    >
                      <Zap className="w-4 h-4" />
                      <span>立即前往夾娃娃機 ➔</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {redeemables.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 flex items-center justify-between gap-2 shadow-md transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-stone-200 truncate">
                              {item.name}
                            </h4>
                            <p className="text-[10px] text-stone-400 font-mono truncate">
                              {item.source}
                            </p>
                            <span className="text-xs font-mono font-black text-amber-300">
                              面額: ${item.value.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRedeemSingle(item)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shrink-0 cursor-pointer shadow-md active:scale-95 transition-all"
                          title="單張 1:1 兌換"
                        >
                          1:1 兌換
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Quick Action: 一鍵兌換籌碼按鈕 */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs text-stone-400 hidden sm:inline">
                  櫃台遵循 1:1 標準兌換比例，直接充值進您的籌碼總餘額。
                </span>

                <button
                  id="btn-lobby-redeem-all"
                  type="button"
                  disabled={redeemables.length === 0}
                  onClick={handleRedeemAll}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all"
                >
                  <Coins className="w-4 h-4" />
                  <span>一鍵兌換籌碼 (${totalRedeemableValue.toLocaleString()})</span>
                </button>
              </div>
            </div>

            {/* Right: Active Black Market VIPs in the Lobby (正在大廳的黑市貴賓) */}
            <div
              id="lobby-active-vips-panel"
              className="w-full lg:w-[40%] min-h-[300px] lg:min-h-0 h-full rounded-2xl bg-[#0c0e16] border border-rose-500/30 shadow-xl p-3 flex flex-col justify-between overflow-hidden shrink-0 lg:shrink"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-rose-400 fill-rose-400/30" />
                  <h3 className="font-black text-sm sm:text-base text-stone-100 flex items-center gap-1.5">
                    <span>現正駐留的黑市貴賓</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-mono font-bold">
                      {activeNPCs.length} 位
                    </span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-stone-800 text-xs font-mono text-amber-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>{formatTime(timeLeft)}</span>
                  </span>

                  <button
                    id="btn-refresh-lobby-npcs"
                    type="button"
                    disabled={manualRefreshCooldown > 0}
                    onClick={handleManualVIPRefresh}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition-all select-none ${
                      manualRefreshCooldown > 0
                        ? 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed opacity-75'
                        : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-700 hover:border-amber-400 cursor-pointer active:scale-95'
                    }`}
                    title={
                      manualRefreshCooldown > 0
                        ? `手動刷新冷卻中 (剩餘 ${manualRefreshCooldown} 秒)`
                        : '立即手動刷新在場貴賓 (冷卻時間：180秒)'
                    }
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${
                        manualRefreshCooldown > 0 ? 'text-stone-500' : 'text-amber-400'
                      }`}
                    />
                    {manualRefreshCooldown > 0 ? (
                      <span className="font-bold text-xs text-stone-400">{manualRefreshCooldown}s</span>
                    ) : (
                      <span className="text-xs font-bold text-amber-300">刷新</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Active VIPs List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar my-2 space-y-2.5 pr-0.5">
                {activeNPCs.map((npc, idx) => {
                  const targetCol = ALL_COLLECTIBLES.find((c) => c.id === npc.targetCollectibleId);
                  const playerHasTarget = Boolean(
                    collectibles.some((c) => c.id === npc.targetCollectibleId)
                  );
                  const sigMultiplier = npc.targetMultiplier || npc.multiplier;
                  const hasPrivateStock = Boolean(npc.forSaleItem && !npc.forSaleItem.isSoldOut);

                  return (
                    <div
                      key={npc.id + idx}
                      className="p-3 rounded-xl bg-gradient-to-br from-[#180d15] via-stone-900/90 to-[#0f0a12] border border-rose-500/30 hover:border-amber-500/50 shadow-md transition-all space-y-2.5"
                    >
                      {/* VIP Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-900/80 to-stone-900 border border-rose-400/50 flex items-center justify-center text-2xl shrink-0 shadow">
                            {npc.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-rose-100 truncate">{npc.name}</h4>
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/30 truncate">
                                {npc.title}
                              </span>
                            </div>
                            <span className="text-xs text-stone-300 truncate block mt-0.5">
                              偏好賭桌: <span className="text-amber-300 font-bold">{npc.favoriteGame}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs text-stone-400 block">溢價收購</span>
                          <span className="font-mono font-black text-sm text-amber-300">
                            ★ {sigMultiplier}X
                          </span>
                        </div>
                      </div>

                      {/* Wanted Bounty & Quick Action */}
                      {targetCol && (
                        <div className="p-2 rounded-lg bg-black/60 border border-amber-500/40 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-2xl shrink-0">{targetCol.icon}</span>
                            <div className="min-w-0">
                              <span className="text-xs text-amber-300 font-bold block truncate">
                                🎯 今日懸賞: {targetCol.name}
                              </span>
                              <span className="text-xs text-stone-300 font-mono">
                                溢價收購: ${(targetCol.basePrice * sigMultiplier).toLocaleString()} 籌碼
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {playerHasTarget ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedNPCIndex(idx);
                                  setSelectedTab('blackmarket');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 font-black text-xs shadow cursor-pointer active:scale-95 animate-pulse"
                              >
                                立即出售
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelectGame(targetCol.gameId)}
                                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold border border-stone-700 hover:border-amber-400 cursor-pointer active:scale-95"
                              >
                                前往尋寶
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Private Stock Badge or Direct Chat/Trade Link */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/60">
                        {hasPrivateStock ? (
                          <span className="text-xs text-purple-300 font-bold flex items-center gap-1">
                            <span>🛍️</span>
                            <span>特供私貨: {npc.forSaleItem?.collectible.name} (${npc.forSaleItem?.price.toLocaleString()})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400 italic truncate max-w-[200px]">
                            {npc.greeting.slice(0, 22)}...
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedNPCIndex(idx);
                            setSelectedTab('blackmarket');
                          }}
                          className="text-xs text-rose-300 hover:text-rose-200 font-bold flex items-center gap-1 cursor-pointer underline underline-offset-2 shrink-0 py-0.5"
                        >
                          <span>進入貴賓廳洽商 ➔</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom: Compact Anti-Abuse & Exchange Notice (一般提醒尺寸) */}
              <div className="pt-2 border-t border-stone-800 shrink-0">
                <div className="p-2 rounded-xl bg-stone-900/80 border border-stone-800/80 flex items-start gap-2 text-xs text-stone-300 leading-snug">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-stone-100">大廳提示：</strong>代幣券於左側櫃台 1:1 兌現；珍品可向黑市貴賓享 1.5x~3x 溢價售出。重置籌碼將同步重置道具以防刷弊。
                  </span>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BLACK MARKET NPC LOUNGE (黑市貴賓廊 - #lobby-npc-lounge) */}
        {/* ========================================================================= */}
        {selectedTab === 'blackmarket' && activeNPC && (
          <div id="lobby-npc-lounge" className="w-full h-full flex flex-col gap-2.5 overflow-hidden animate-fade-in">
            {/* 1. TOP: Streamlined Horizontal NPC Selector Bar */}
            <div
              id="lobby-npc-selector-bar"
              className="w-full shrink-0 px-3.5 py-2 rounded-xl bg-[#12080f]/90 border border-rose-500/30 shadow-md flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar"
            >
              {/* Active NPCs Pill Selector */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-xs font-black text-stone-300 shrink-0 hidden sm:inline mr-1">
                  在場貴賓:
                </span>
                {activeNPCs.map((npc, idx) => {
                  const isSelected = selectedNPCIndex === idx;
                  const signatureMultiplier = npc.targetMultiplier ? `${npc.targetMultiplier}X` : `${npc.multiplier}X`;
                  const hasPrivateStock = Boolean(npc.forSaleItem && !npc.forSaleItem.isSoldOut);

                  return (
                    <button
                      key={npc.id + idx}
                      id={`npc-card-${npc.id}`}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedNPCIndex(idx);
                        setSelectedCollectible(null);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 ${
                        isSelected
                          ? 'bg-gradient-to-r from-rose-950 via-amber-950/80 to-stone-900 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)] text-white font-black'
                          : 'bg-stone-900/90 border-stone-800 hover:border-rose-500/40 text-stone-300 hover:text-white'
                      }`}
                    >
                      <span className="text-lg shrink-0">{npc.avatar}</span>
                      <span className={isSelected ? 'text-amber-300 font-black' : 'text-stone-200 font-bold'}>{npc.name}</span>
                      <span className="text-xs text-amber-400 font-mono font-black">★{signatureMultiplier}</span>
                      {hasPrivateStock && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200 text-[10px] font-black border border-purple-400/50 animate-pulse">
                          🛍️ 私貨
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Countdown Timer & Manual Refresh */}
              <div className="flex items-center gap-2 shrink-0 border-l border-stone-800 pl-3">
                <span className="px-2.5 py-1 rounded-lg bg-black/60 border border-stone-800 text-xs font-mono text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="font-bold">{formatTime(timeLeft)}</span>
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setSelectedTab('bar');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                  title="移步夜行酒吧，花 $300 請貴賓喝一杯或品嚐特調探聽情報"
                >
                  <Wine className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">夜行酒吧請客</span>
                </button>

                <button
                  id="btn-refresh-npcs"
                  type="button"
                  disabled={manualRefreshCooldown > 0}
                  onClick={handleManualVIPRefresh}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-all select-none ${
                    manualRefreshCooldown > 0
                      ? 'bg-stone-900/60 border-stone-800 text-stone-500 cursor-not-allowed opacity-75'
                      : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-700 hover:border-amber-400 cursor-pointer active:scale-95'
                  }`}
                  title={
                    manualRefreshCooldown > 0
                      ? `手動刷新冷卻中 (剩餘 ${manualRefreshCooldown} 秒)`
                      : '立即手動刷新黑市貴賓 (冷卻時間：180秒)'
                  }
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 ${
                      manualRefreshCooldown > 0 ? 'text-stone-500' : 'text-amber-400'
                    }`}
                  />
                  {manualRefreshCooldown > 0 ? (
                    <span className="font-bold text-xs text-stone-400">{manualRefreshCooldown}s</span>
                  ) : (
                    <span className="text-xs font-bold text-amber-300">刷新名單</span>
                  )}
                </button>
              </div>
            </div>

            {/* 2. BOTTOM: Streamlined 2-Column Trade Deck */}
            <div className="w-full flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-y-auto lg:overflow-hidden">
              {/* Left Column: Active NPC Buyer Profile & Contracts */}
              <div className="w-full lg:w-[45%] h-auto lg:h-full shrink-0 rounded-2xl bg-gradient-to-b from-[#16080e] via-[#0e0509] to-[#070204] border border-rose-500/30 shadow-lg p-3 flex flex-col justify-between overflow-hidden gap-2.5">
                {/* NPC Header & Speech */}
                <div
                  onClick={handleChatWithLobbyNPC}
                  className="p-2.5 rounded-xl bg-black/60 hover:bg-rose-950/25 border border-rose-500/30 transition-all flex flex-col gap-2 shrink-0 cursor-pointer"
                  title="點擊交談互動"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-900 to-stone-900 border border-rose-400/60 flex items-center justify-center text-2xl shadow">
                        {activeNPC.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base text-rose-100">{activeNPC.name}</h3>
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                            {activeNPC.title}
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-0.5">
                          偏好賭桌: <span className="text-amber-300 font-bold">{activeNPC.favoriteGame}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-stone-400 block">基礎收購率</span>
                      <span className="font-mono font-black text-base text-amber-300">
                        {(activeNPC.multiplier * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs italic text-rose-100 font-serif leading-relaxed">
                    "{npcCustomDialogue || activeNPC.greeting}"
                  </div>
                </div>

                {/* TARGET WANTED BOUNTY & OPTIONAL PRIVATE SALE */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 rounded-xl bg-stone-950/90 border border-amber-500/30 flex flex-col gap-3">
                  {/* 1. TARGET BOUNTY CARD */}
                  {targetItem && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          ★ NPC 今日指定懸賞 (天價收購)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold">
                          {(activeNPC.targetMultiplier * 100).toFixed(0)}% ({activeNPC.targetMultiplier}X)
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 ${
                          playerHasTargetItem
                            ? 'bg-amber-950/50 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                            : 'bg-stone-900/80 border-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-3xl shrink-0">{targetItem.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-stone-100 truncate">{targetItem.name}</h4>
                              {getRarityBadge(targetItem.rarity)}
                            </div>
                            <span className="text-xs text-amber-400 font-mono block mt-0.5">
                              來源: 【{targetItem.gameName}】
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs text-stone-400 line-through block">
                            原價 ${targetItem.basePrice.toLocaleString()}
                          </span>
                          <span className="font-mono font-black text-sm text-amber-300">
                            ${Math.round(targetItem.basePrice * activeNPC.targetMultiplier).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      {playerHasTargetItem ? (
                        <button
                          id="btn-sell-target-npc"
                          type="button"
                          onClick={handleSellTargetToNPC}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-xs sm:text-sm shadow-md cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
                        >
                          <Flame className="w-4 h-4 fill-stone-950" />
                          <span>
                            立即天價出售 (得 ${Math.round(targetItem.basePrice * activeNPC.targetMultiplier).toLocaleString()} 籌碼)
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectGame(targetItem.gameId)}
                          className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-98"
                        >
                          <span>前往【{targetItem.gameName}】尋寶 ➔</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 2. OPTIONAL PRIVATE SALE ITEM (Low Probability) */}
                  {activeNPC.forSaleItem && (
                    <div className="space-y-2 pt-2.5 border-t border-purple-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-purple-400" />
                          ★ 特供黑市私貨 (現貨出讓)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/40 text-xs font-mono font-bold">
                          {activeNPC.forSaleItem.markupMultiplier}X 溢價
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-950/40 via-stone-900/70 to-black/90 border border-purple-500/40 space-y-2">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-3xl shrink-0">{activeNPC.forSaleItem.collectible.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-stone-100 truncate">
                                  {activeNPC.forSaleItem.collectible.name}
                                </h4>
                                {getRarityBadge(activeNPC.forSaleItem.collectible.rarity)}
                              </div>
                              <span className="text-xs text-purple-300 font-mono block mt-0.5">
                                來源: 【{activeNPC.forSaleItem.collectible.gameName}】
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs text-stone-400 block line-through">
                              原價 ${activeNPC.forSaleItem.collectible.basePrice.toLocaleString()}
                            </span>
                            <span className="font-mono font-black text-sm text-amber-300">
                              特供 ${activeNPC.forSaleItem.price.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {activeNPC.forSaleItem.isSoldOut ? (
                          <div className="w-full py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-500 font-bold text-xs text-center">
                            <span>🔒 本輪特供已售罄</span>
                          </div>
                        ) : (
                          <button
                            id={`btn-buy-npc-${activeNPC.id}`}
                            type="button"
                            onClick={() => handleBuyCollectibleFromNPC(activeNPC)}
                            disabled={balance < activeNPC.forSaleItem.price}
                            className={`w-full py-2 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                              balance >= activeNPC.forSaleItem.price
                                ? 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow cursor-pointer active:scale-98'
                                : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4" />
                            {balance >= activeNPC.forSaleItem.price ? (
                              <span>收購現貨 (${activeNPC.forSaleItem.price.toLocaleString()} 籌碼)</span>
                            ) : (
                              <span>籌碼不足 (${activeNPC.forSaleItem.price.toLocaleString()})</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Player's Inventory & Streamlined Direct Sale */}
              <div className="w-full lg:w-[55%] h-auto min-h-[280px] lg:h-full rounded-2xl bg-[#0c0e14] border border-amber-500/20 shadow-md p-3 flex flex-col justify-between overflow-hidden gap-2">
                {/* Header with Quick Bulk Sell */}
                <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-sm text-stone-100">
                      珍品背包 ({collectibles.length} 件)
                    </span>
                  </div>

                  {collectibles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSellAllToNPC}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                      title="將背包內所有珍品按此 NPC 估價一次全數售出"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        一鍵全賣給此 NPC (+${collectibles
                          .reduce((sum, item) => sum + getNPCItemValuation(activeNPC, item).buyoutPrice, 0)
                          .toLocaleString()})
                      </span>
                    </button>
                  )}
                </div>

                {/* Collectibles Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 flex flex-col gap-2">
                  {collectibles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-500">
                      <span className="text-3xl mb-1.5">💎</span>
                      <p className="text-sm font-bold text-stone-300">目前背包尚無珍品</p>
                      <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                        在 7 款賭桌中對局達成隱藏條件即可獲得珍品，再帶來黑市高價兌現！
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {collectibles.map((col) => {
                        const isTarget = col.id === activeNPC.targetCollectibleId;
                        const valuation = getNPCItemValuation(activeNPC, col);

                        return (
                          <div
                            key={col.id}
                            className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                              isTarget
                                ? 'bg-amber-950/40 border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-2xl shrink-0">{col.icon}</span>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs sm:text-sm text-stone-200 truncate">{col.name}</h4>
                                  <span className="text-xs text-stone-400 block truncate">{col.gameName}</span>
                                </div>
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded font-bold shrink-0 ${valuation.badgeClass}`}>
                                {valuation.label}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 border-t border-stone-800/60">
                              <div className="text-xs font-mono leading-tight">
                                <span className="text-stone-400 block text-[11px]">收購報價</span>
                                <span className={`font-bold text-sm ${valuation.priceClass}`}>
                                  ${valuation.buyoutPrice.toLocaleString()}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSellSelectedToNPC(col)}
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow cursor-pointer active:scale-95 transition-all"
                              >
                                出售
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Tip */}
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
                  <span>💡 只要珍品在背包中即不會重複掉落；售出變現後可在賭桌再次獲得！</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COLLECTIBLES & ACHIEVEMENTS SHOWCASE (珍品陳列館) */}
        {/* ========================================================================= */}
        {selectedTab === 'collection' && (
          <div className="w-full h-full rounded-2xl bg-[#0c0e16] border border-purple-500/30 shadow-xl p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-stone-100">
                    賭場七大遊戲隱藏珍品陳列館 (COLLECTION HALL)
                  </h3>
                  <p className="text-xs text-stone-400">
                    賭桌暗藏 42 款特殊成就珍品，保持神秘探索樂趣！
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-purple-950/80 border border-purple-400/50 text-xs font-mono font-bold text-purple-200">
                  持有中: {collectibles.length} / 典當中: {pawnedItems.length} / 總收錄: {ALL_COLLECTIBLES.length}
                </span>
              </div>
            </div>

            {/* All Collectibles Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {ALL_COLLECTIBLES.map((item) => {
                  const isOwned = collectibles.some((c) => c.id === item.id);
                  const pawnRecord = pawnedItems.find((p) => p.item.id === item.id);
                  const isPawned = Boolean(pawnRecord);

                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 transition-all ${
                        isOwned
                          ? 'bg-gradient-to-b from-stone-900/90 to-stone-950 border-amber-500/40 shadow-md hover:border-amber-400'
                          : isPawned
                          ? 'bg-stone-950/90 border-stone-800/90 opacity-60 filter grayscale-[40%] hover:opacity-80'
                          : 'bg-stone-950/60 border-stone-800/80 opacity-40 filter grayscale'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl ${isOwned ? '' : isPawned ? 'filter grayscale-[30%]' : 'filter grayscale'}`}>
                            {isOwned || isPawned ? item.icon : '❓'}
                          </span>
                          <div>
                            <div className="flex items-center gap-1">
                              <h4
                                className={`font-bold text-xs ${
                                  isOwned ? 'text-amber-200' : isPawned ? 'text-stone-300' : 'text-stone-500'
                                }`}
                              >
                                {isOwned || isPawned ? item.name : '未解鎖神秘珍品'}
                              </h4>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {item.gameName}
                            </span>
                          </div>
                        </div>
                        {isOwned ? (
                          getRarityBadge(item.rarity)
                        ) : isPawned ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                            📜 典當中
                          </span>
                        ) : null}
                      </div>

                      <p className="text-[10px] text-stone-400 leading-tight line-clamp-2 italic">
                        {isOwned || isPawned ? item.flavorText : '在該賭桌探索對局中隨機探索或幸運時刻解鎖獲得！'}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[11px] font-mono">
                        <span className="text-stone-500">
                          {isPawned ? '典當贖回價:' : '基礎價值:'}
                        </span>
                        <span className={`font-bold ${isPawned ? 'text-amber-400/90' : 'text-amber-400'}`}>
                          ${item.basePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
              <span>共收錄 7 大賭桌各 6 款隱藏珍品；典當物品在陳列館中保持暗態保留資訊，可至地下當鋪隨時贖回。</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: UNDERGROUND PAWN SHOP (地下當鋪) */}
        {/* ========================================================================= */}
        {selectedTab === 'pawnshop' && (
          <PawnShopView
            collectibles={collectibles}
            pawnedItems={pawnedItems}
            balance={balance}
            isBankruptcyMode={isBankruptcyMode}
            onTriggerGameOver={onTriggerGameOver}
            onPawnItem={handlePawnItem}
            onRedeemItem={handleRedeemItem}
            onSelectGame={onSelectGame}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 5: NOCTURNE BAR LOUNGE (夜行酒吧 - 酒保老查理) */}
        {/* ========================================================================= */}
        {selectedTab === 'bar' && (
          <BarLoungeView
            balance={balance}
            onUpdateBalance={onUpdateBalance}
            activeNPCs={activeNPCs}
            onSelectGame={onSelectGame}
          />
        )}
      </div>

      {/* 3. BOTTOM QUICK GAME LAUNCHER STRIP (Height: ~60px) */}
      <div className="w-full shrink-0 p-2 rounded-2xl bg-[#0a0c12] border border-amber-500/20 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 pl-2 text-xs font-bold text-stone-300 shrink-0">
          <Play className="w-4 h-4 text-amber-400 fill-current" />
          <span>快速啟動遊戲:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => onSelectGame('roulette')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🎡</span>
            <span>歐式輪盤</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('slot')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🍒</span>
            <span>老虎機</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('blackjack')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>♠️</span>
            <span>21點</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('poker')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🃏</span>
            <span>德州撲克</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('siba')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🎲</span>
            <span>十八仔</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('craps')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🎲</span>
            <span>花旗骰</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('pinball')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🔴</span>
            <span>打彈珠</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('plinko')}
            className="px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <span>🎯</span>
            <span>彈珠台</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectGame('claw')}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <span>🕹️</span>
            <span>夾娃娃機</span>
          </button>
        </div>
      </div>
    </div>
  );
};
