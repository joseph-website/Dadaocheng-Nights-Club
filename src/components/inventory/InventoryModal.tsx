import React, { useState, useEffect } from 'react';
import { RedeemableItem, CollectibleItem, Rarity, PawnedItemRecord } from '../../types/inventory';
import {
  getRedeemableItems,
  getPlayerCollectibles,
  getPawnedItems,
  redeemPawnedItem,
  calculatePawnAmount,
  ALL_COLLECTIBLES,
  getPlayerLuckyCharms,
} from '../../utils/inventory';
import { sound } from '../../utils/audio';
import {
  X,
  Package,
  Ticket,
  Trophy,
  ArrowRight,
  Clock,
  Coins,
  Store,
  Gem,
  Building2,
  Lock,
  Unlock,
  Sparkles,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onUpdateBalance: (newBalance: number) => void;
  onNavigateToLobby: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  balance,
  onUpdateBalance,
  onNavigateToLobby,
}) => {
  const [activeTab, setActiveTab] = useState<'redeemables' | 'collectibles' | 'pawned'>('redeemables');
  const [redeemables, setRedeemables] = useState<RedeemableItem[]>([]);
  const [collectibles, setCollectibles] = useState<CollectibleItem[]>([]);
  const [pawnedItems, setPawnedItems] = useState<PawnedItemRecord[]>([]);
  const [luckyCharms, setLuckyCharms] = useState<number>(() => getPlayerLuckyCharms());
  const [collectibleViewMode, setCollectibleViewMode] = useState<'owned' | 'catalog'>('owned');
  const [catalogGameFilter, setCatalogGameFilter] = useState<string>('all');

  // Reload inventory whenever modal opens or global changes occur
  useEffect(() => {
    const refresh = () => {
      setRedeemables(getRedeemableItems());
      setCollectibles(getPlayerCollectibles());
      setPawnedItems(getPawnedItems());
      setLuckyCharms(getPlayerLuckyCharms());
    };

    if (isOpen) {
      refresh();
    }

    window.addEventListener('casino_inventory_changed', refresh);
    return () => {
      window.removeEventListener('casino_inventory_changed', refresh);
    };
  }, [isOpen]);

  // ESC key listener for instant close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalVoucherValue = (redeemables || []).reduce((acc, curr) => acc + (curr?.value ?? 0), 0);
  const totalPawnedLoan = (pawnedItems || []).reduce((acc, curr) => acc + (curr?.pawnAmount ?? 0), 0);

  // Group redeemables by face value
  const groupedVouchers: Record<
    number,
    { value: number; count: number; name: string; icon: string; items: RedeemableItem[] }
  > = {};

  redeemables.forEach((item) => {
    if (!groupedVouchers[item.value]) {
      groupedVouchers[item.value] = {
        value: item.value,
        count: 0,
        name: item.name,
        icon: item.icon,
        items: [],
      };
    }
    groupedVouchers[item.value].count += 1;
    groupedVouchers[item.value].items.push(item);
  });

  const voucherGroups = Object.values(groupedVouchers).sort((a, b) => b.value - a.value);

  const getRarityBadge = (rarity: Rarity) => {
    switch (rarity) {
      case 'legendary':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'rare':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-stone-700/30 text-stone-300 border-stone-600/40';
    }
  };

  const getRarityName = (rarity: Rarity) => {
    switch (rarity) {
      case 'legendary':
        return '傳奇';
      case 'epic':
        return '史詩';
      case 'rare':
        return '稀有';
      default:
        return '普通';
    }
  };

  const handleRedeemPawn = (item: CollectibleItem) => {
    const res = redeemPawnedItem(item.id, balance);
    if (res.success) {
      sound.playBigWin();
      sound.playCoinPayout();
      onUpdateBalance(balance - res.cost);
      setPawnedItems(getPawnedItems());
      setCollectibles(getPlayerCollectibles());
    } else {
      sound.playLoss();
    }
  };

  return (
    <div
      id="modal-inventory-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none cursor-pointer"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
      title="點擊背景空白處即可直接關閉"
    >
      <div
        id="inventory-modal"
        className="w-full max-w-2xl bg-[#0d111a] border-2 border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(245,158,11,0.25)] flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                玩家專屬隨身背包 <span className="text-xs font-mono font-normal text-amber-400/80">(Inventory)</span>
              </h2>
              <p className="text-xs text-stone-400">
                收納娃娃機夾取兌幣券、各賭桌隱藏成就珍品與地下當鋪抵押紀錄
              </p>
            </div>
          </div>

          <button
            id="btn-close-inventory"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
            title="點擊或按 ESC 關閉"
          >
            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Live Stat Header Strip (Unified Status Bar, NOT buttons) */}
        <div className="px-5 py-2.5 bg-[#07090e] border-b border-stone-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-stone-400 font-medium">當前錢包籌碼:</span>
              <span className="font-mono font-black text-sm sm:text-base text-amber-300">
                ${balance.toLocaleString()}
              </span>
            </div>

            <div className="h-4 w-px bg-stone-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-stone-400">
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>兌幣券總值:</span>
              <span className="font-mono font-bold text-emerald-300">
                ${totalVoucherValue.toLocaleString()}
              </span>
              <span className="text-stone-500 font-mono">({redeemables.length}張)</span>
            </div>

            <div className="h-4 w-px bg-stone-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-stone-400">
              <Gem className="w-4 h-4 text-purple-400" />
              <span>珍品持有:</span>
              <span className="font-mono font-bold text-purple-300">
                {collectibles.length} / {ALL_COLLECTIBLES.length}
              </span>
              {pawnedItems.length > 0 && (
                <span className="text-amber-400/90 text-[11px] font-mono">
                  (典當中 {pawnedItems.length})
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-stone-800 hidden sm:block" />

            <div className="flex items-center gap-1.5 text-stone-400">
              <span className="text-sm">🪬</span>
              <span>幸運符:</span>
              <span className="font-mono font-bold text-amber-300">
                {luckyCharms}
              </span>
              <span className="text-stone-500 font-mono">枚</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Clear, distinct clickable tabs */}
        <div className="flex items-center border-b border-stone-800 bg-[#080b12] px-5 gap-2 pt-2">
          <button
            id="tab-inventory-redeemables"
            onClick={() => {
              sound.playClick();
              setActiveTab('redeemables');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 transition-all cursor-pointer ${
              activeTab === 'redeemables'
                ? 'bg-[#0d111a] border-amber-400 text-amber-300 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <Ticket className="w-4 h-4 text-emerald-400" />
            <span>兌幣道具 ({redeemables.length})</span>
            {totalVoucherValue > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                ${totalVoucherValue.toLocaleString()}
              </span>
            )}
          </button>

          <button
            id="tab-inventory-collectibles"
            onClick={() => {
              sound.playClick();
              setActiveTab('collectibles');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 transition-all cursor-pointer ${
              activeTab === 'collectibles'
                ? 'bg-[#0d111a] border-amber-400 text-amber-300 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <Trophy className="w-4 h-4 text-purple-400" />
            <span>蒐集珍品 ({collectibles.length})</span>
          </button>

          <button
            id="tab-inventory-pawned"
            onClick={() => {
              sound.playClick();
              setActiveTab('pawned');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-t-2 transition-all cursor-pointer ${
              activeTab === 'pawned'
                ? 'bg-[#0d111a] border-amber-400 text-amber-300 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-900/40'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>地下當鋪存根 ({pawnedItems.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TAB 1: REDEEMABLE VOUCHERS */}
          {activeTab === 'redeemables' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-stone-900/80 to-stone-900/60 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                    🎟️
                  </div>
                  <div>
                    <span className="text-xs text-stone-400">當前持有效兌幣券</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black font-mono text-amber-400">
                        ${totalVoucherValue.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-300 font-medium">共 {redeemables.length} 張</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="btn-modal-go-lobby"
                    onClick={() => {
                      onClose();
                      onNavigateToLobby();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 text-xs sm:text-sm font-black shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all cursor-pointer active:scale-95"
                  >
                    <Store className="w-4 h-4" />
                    <span>前往大廳櫃台 1:1 兌換籌碼</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lucky Charm Alert Banner (if owned) */}
              {luckyCharms > 0 && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/70 via-amber-950/50 to-stone-900 border border-amber-500/40 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-bounce">🪬</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                        <span>老查理的夜行幸運符 ({luckyCharms} 枚)</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                          專屬兌換
                        </span>
                      </h4>
                      <p className="text-xs text-stone-300">
                        夾娃娃機掉落之夜行幸運符。相傳至【酒吧吧台】奉予老查理，將可觸發一場神祕驚喜！
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLobby();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>前往酒吧</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Notice Banner */}
              <div className="px-4 py-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-stone-300 flex items-center gap-2">
                <span className="text-amber-400 font-bold">💡 交易提示:</span>
                <span>兌幣券需至【大廳櫃台】辦理 1:1 等值籌碼兌現（支援單張兌現或一鍵全數兌換）。</span>
              </div>

              {/* Vouchers Grouped List */}
              {voucherGroups.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-stone-500 space-y-3 border border-dashed border-stone-800 rounded-xl bg-stone-900/20">
                  <div className="text-4xl opacity-50">🕹️</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-stone-400">目前背包尚無兌幣券</p>
                    <p className="text-xs text-stone-400">
                      可前往「夾娃娃機」試試身手，夾取高達 $2,000 的各式面額兌幣券！
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {voucherGroups.map((group) => (
                    <div
                      key={group.value}
                      className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-stone-800/90 border border-stone-700 flex items-center justify-center text-2xl shrink-0">
                          {group.icon}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            {group.name}
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                              x{group.count}
                            </span>
                          </h4>
                          <p className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                            面額: ${group.value.toLocaleString()} 籌碼 / 張
                          </p>
                          <p className="text-xs text-stone-400">
                            小計: ${(group.value * group.count).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700 text-amber-300 text-xs font-mono font-bold whitespace-nowrap">
                        大廳 1:1 兌換
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COLLECTIBLES & ACHIEVEMENTS */}
          {activeTab === 'collectibles' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-stone-900/80 to-stone-900/60 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-2xl">
                    🏆
                  </div>
                  <div>
                    <span className="text-xs text-stone-400">已蒐藏之娛樂城成就珍品</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-purple-300 font-mono">
                        {collectibles.length} / {ALL_COLLECTIBLES.length} 件珍品
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        (可賣給黑市情報商或質押給地下當鋪)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLobby();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 text-purple-100 text-xs sm:text-sm font-bold border border-purple-500/50 transition-colors cursor-pointer active:scale-95"
                  >
                    <span>前往黑市 / 當鋪辦理</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Switcher: Owned vs Catalog */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2">
                <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800">
                  <button
                    onClick={() => setCollectibleViewMode('owned')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectibleViewMode === 'owned'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>已獲得珍品 ({collectibles.length})</span>
                  </button>
                  <button
                    onClick={() => setCollectibleViewMode('catalog')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      collectibleViewMode === 'catalog'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>珍品全圖鑑 ({collectibles.length}/{ALL_COLLECTIBLES.length})</span>
                  </button>
                </div>

                {collectibleViewMode === 'catalog' && (
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {[
                      { id: 'all', label: '全部' },
                      { id: 'roulette', label: '輪盤' },
                      { id: 'slot', label: '老虎機' },
                      { id: 'pinball', label: '夜市打彈珠' },
                      { id: 'plinko', label: '彈珠台' },
                      { id: 'blackjack', label: '21點' },
                      { id: 'poker', label: '德州撲克' },
                      { id: 'siba', label: '十八仔' },
                      { id: 'craps', label: '花旗骰' },
                      { id: 'claw', label: '夾娃娃機' },
                      { id: 'lobby', label: '大廳與酒館' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setCatalogGameFilter(g.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          catalogGameFilter === g.id
                            ? 'bg-purple-950/80 text-purple-200 border border-purple-600'
                            : 'bg-stone-900/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* VIEW 1: OWNED COLLECTIBLES */}
              {collectibleViewMode === 'owned' && (
                <>
                  {collectibles.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center text-stone-500 space-y-3 border border-dashed border-stone-800 rounded-xl bg-stone-900/20">
                      <div className="text-4xl opacity-50">🏛️</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-stone-400">目前背包尚無解鎖之珍品</p>
                        <p className="text-xs text-stone-400 max-w-md">
                          在 8 大遊戲（輪盤、老虎機、彈珠台、21點、德州撲克、十八仔、花旗骰、夾娃娃機）達成特定事蹟將神秘自動解鎖！可切換至【珍品全圖鑑】查看詳細獲得條件。
                        </p>
                      </div>
                      <button
                        onClick={() => setCollectibleViewMode('catalog')}
                        className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 cursor-pointer"
                      >
                        📖 查看 48 件珍品全圖鑑與獲得條件
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {collectibles.map((item, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-purple-500/40 transition-all flex flex-col justify-between gap-2.5 shadow-xs"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-stone-800/90 border border-stone-700 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                  {item.name}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-bold border shrink-0 ${getRarityBadge(
                                    item.rarity
                                  )}`}
                                >
                                  {getRarityName(item.rarity)}
                                </span>
                              </div>
                              <span className="text-xs text-amber-400 font-medium">
                                來源: {item.gameName}
                              </span>
                              <p className="text-xs text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                                {item.flavorText}
                              </p>
                            </div>
                          </div>

                          {item.unlockConditionText && (
                            <div className="px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200">
                              <span className="text-purple-400 font-semibold">🎯 達成條件：</span>
                              <span>{item.unlockConditionText}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2.5 border-t border-stone-800/80 text-xs">
                            <span className="text-stone-400">
                              基準黑市價:{' '}
                              <span className="text-amber-400 font-mono font-bold">
                                ${item.basePrice.toLocaleString()}
                              </span>
                            </span>
                            {item.unlockedAt && (
                              <span className="flex items-center gap-1 text-stone-400 font-mono text-xs">
                                <Clock className="w-3 h-3" />
                                {new Date(item.unlockedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* VIEW 2: CATALOG (ALL COLLECTIBLES & HINTS) */}
              {collectibleViewMode === 'catalog' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALL_COLLECTIBLES.filter(
                    (item) => catalogGameFilter === 'all' || item.gameId === catalogGameFilter
                  ).map((item) => {
                    const ownedRecord = collectibles.find((c) => c.id === item.id);
                    const isUnlocked = !!ownedRecord;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          isUnlocked
                            ? 'bg-purple-950/20 border-purple-500/50 shadow-xs'
                            : 'bg-stone-900/60 border-stone-800/80 opacity-90'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center text-3xl shrink-0 shadow-inner ${
                              isUnlocked
                                ? 'bg-stone-800 border border-purple-500/50'
                                : 'bg-stone-900 border border-stone-800 opacity-60'
                            }`}
                          >
                            {item.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <h4
                                className={`text-xs sm:text-sm font-bold truncate ${
                                  isUnlocked ? 'text-white' : 'text-stone-300'
                                }`}
                              >
                                {item.name}
                              </h4>
                              <div className="flex items-center gap-1">
                                {isUnlocked ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-600 text-emerald-300 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>已解鎖</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-800/80 border border-stone-700 text-stone-400 flex items-center gap-0.5">
                                    <Lock className="w-3 h-3" />
                                    <span>未解鎖</span>
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRarityBadge(
                                    item.rarity
                                  )}`}
                                >
                                  {getRarityName(item.rarity)}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs text-amber-400/90 font-medium">
                              項目: {item.gameName}
                            </span>
                            <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                              {item.flavorText}
                            </p>
                          </div>
                        </div>

                        {/* Unlock Condition Highlight */}
                        <div
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-sans ${
                            isUnlocked
                              ? 'bg-emerald-950/30 border border-emerald-800/50 text-emerald-200'
                              : 'bg-stone-950/80 border border-stone-800 text-stone-400'
                          }`}
                        >
                          <span className="font-bold text-amber-400">
                            {isUnlocked ? '🎯 達成條件：' : '🔒 獲得條件：'}
                          </span>
                          <span>
                            {isUnlocked
                              ? item.unlockConditionText || '已達成傳奇戰績'
                              : '？？？（隱藏條件，請在對局中探索或向酒館情報商人打聽）'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
                          <span className="text-stone-400">
                            基準黑市價:{' '}
                            <span className="text-amber-400 font-mono font-bold">
                              ${item.basePrice.toLocaleString()}
                            </span>
                          </span>
                          {ownedRecord?.unlockedAt ? (
                            <span className="flex items-center gap-1 text-emerald-400 font-mono text-xs">
                              <Clock className="w-3 h-3" />
                              {new Date(ownedRecord.unlockedAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-stone-500 text-[11px]">可於酒吧購買情報</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAWNED ITEMS */}
          {activeTab === 'pawned' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-950/50 via-stone-900/80 to-stone-900/60 border border-amber-500/40">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                    📜
                  </div>
                  <div>
                    <span className="text-xs text-stone-400">地下當鋪質押中珍品</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-amber-300 font-mono">
                        {pawnedItems.length} 件抵押物
                      </span>
                      <span className="text-xs text-stone-300 font-mono">
                        (已領取借款: ${totalPawnedLoan.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateToLobby();
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-black transition-all cursor-pointer active:scale-95 shadow-md"
                >
                  <Building2 className="w-4 h-4" />
                  <span>前往大廳【地下當鋪】專區</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Notice */}
              <div className="px-4 py-2.5 rounded-xl bg-stone-900/90 border border-stone-800 text-xs text-stone-300 flex items-center gap-2">
                <span className="text-amber-400 font-bold">📜 當鋪規則:</span>
                <span>典當可獲得原價 80% 應急金（進位至百位）；隨時可以 100% 原價全額贖回！</span>
              </div>

              {/* Pawned list */}
              {pawnedItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-stone-500 space-y-3 border border-dashed border-stone-800 rounded-xl bg-stone-900/20">
                  <div className="text-4xl opacity-50">💼</div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-stone-400">目前當鋪無任何典當存根</p>
                    <p className="text-xs text-stone-400 max-w-sm">
                      若輸光籌碼需翻本，可將珍品典當給地下當鋪換取 80% 現金，日後贏回隨時贖回！
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pawnedItems.map((record) => {
                    const item = record?.item;
                    if (!item) return null;
                    const redeemCost = record?.redeemCost ?? item.basePrice ?? 0;
                    const pawnAmount = record?.pawnAmount ?? calculatePawnAmount(item.basePrice ?? 0);
                    const canRedeem = balance >= redeemCost;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col justify-between gap-3 shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-3xl shrink-0 opacity-80">
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs sm:text-sm font-bold text-stone-300 truncate">
                                {item.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0">
                                典當中
                              </span>
                            </div>
                            <span className="text-xs text-stone-400 font-medium">
                              來源: {item.gameName}
                            </span>
                            <div className="mt-1 flex flex-col gap-0.5 text-xs">
                              <span className="text-emerald-400 font-mono">
                                已領應急金: +${pawnAmount.toLocaleString()}
                              </span>
                              <span className="text-amber-400 font-mono font-bold">
                                贖回原價需: ${redeemCost.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-stone-800 text-xs">
                          <span className="text-stone-400 font-mono text-xs">
                            {record.pawnedAt ? new Date(record.pawnedAt).toLocaleDateString() : '近期'} 質押
                          </span>

                          <button
                            type="button"
                            disabled={!canRedeem}
                            onClick={() => handleRedeemPawn(item)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                              canRedeem
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer shadow active:scale-95'
                                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                            }`}
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>
                              {canRedeem
                                ? `贖回 ($${redeemCost.toLocaleString()})`
                                : '籌碼不足'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-[#0a0d14] flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span>當前錢包籌碼:</span>
            <span className="text-amber-400 font-mono font-bold text-sm">
              ${balance.toLocaleString()}
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95 flex items-center gap-1.5"
          >
            <span>關閉背包 (Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

