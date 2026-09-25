import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CollectibleItem } from '../../types/inventory';
import { sellCollectibleToNPC } from '../../utils/inventory';
import { sound } from '../../utils/audio';
import { Sparkles, Package, X, Coins, Check, Gem } from 'lucide-react';

interface ItemUnlockToastProps {
  onOpenInventory?: () => void;
  balance?: number;
  onUpdateBalance?: (newBalance: number) => void;
}

export const ItemUnlockToast: React.FC<ItemUnlockToastProps> = ({
  onOpenInventory,
  balance = 0,
  onUpdateBalance,
}) => {
  const [unlockedItem, setUnlockedItem] = useState<CollectibleItem | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleUnlocked = (e: Event) => {
      const customEvent = e as CustomEvent<{ item: CollectibleItem; sourceGame?: string }>;
      if (!customEvent.detail || !customEvent.detail.item) return;

      const item = customEvent.detail.item;
      setUnlockedItem(item);
      setFeedbackMessage(null);
      setIsVisible(true);
      sound.playWin();

      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Auto dismiss after 12 seconds if no interaction
      dismissTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 12000);
    };

    window.addEventListener('casino_collectible_unlocked', handleUnlocked);
    return () => {
      window.removeEventListener('casino_collectible_unlocked', handleUnlocked);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  if (!isVisible || !unlockedItem) return null;

  const instantPrice = Math.round(unlockedItem.basePrice * 0.8);

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          label: '傳奇極品',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
          glow: 'from-amber-500 via-yellow-400 to-amber-600',
        };
      case 'epic':
        return {
          label: '史詩珍藏',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-[0_0_10px_rgba(168,85,247,0.5)]',
          glow: 'from-purple-600 via-pink-500 to-amber-500',
        };
      case 'rare':
        return {
          label: '稀有寶物',
          bg: 'bg-blue-500/20 text-blue-300 border-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.5)]',
          glow: 'from-blue-600 via-cyan-400 to-indigo-500',
        };
      default:
        return {
          label: '精選典藏',
          bg: 'bg-stone-500/20 text-stone-300 border-stone-400/60',
          glow: 'from-stone-600 via-stone-400 to-amber-500',
        };
    }
  };

  const badge = getRarityBadge(unlockedItem.rarity);

  // Short immersive dealer story dialogues (WITHOUT mentioning unlocking conditions)
  const getDealerStory = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return '荷官神色肅穆，雙手恭敬呈上一只金絲鑲嵌的天鵝絨黑匣：「貴客今日氣勢如虹，依大稻賭埕慣例，特將這件鎮館珍品贈予閣下。」';
      case 'epic':
        return '荷官微微躬身，微笑著遞上一件特製包裝的典藏禮盒：「閣下此局運籌帷幄，令人嘆服。這份賭場精選珍寶，請務必收下。」';
      case 'rare':
        return '荷官微笑致意，輕輕推來一只精緻禮盒：「見證了精彩的一局，賭場特為貴客準備了一份專屬紀念珍藏。」';
      default:
        return '荷官微笑著遞上一份紀念贈禮：「手氣正旺！這件賭場特別紀念物贈予您，增添今日好運。」';
    }
  };

  // Instant on-the-spot cash in (80% instant buy rate)
  const handleInstantSell = () => {
    if (!unlockedItem) return;
    sound.playBigWin();
    sound.playCoinPayout();

    const { chipsEarned } = sellCollectibleToNPC(unlockedItem.id, 0.8);
    if (onUpdateBalance) {
      onUpdateBalance(balance + chipsEarned);
    }

    setFeedbackMessage(`🤝 已現場折讓變現 +${chipsEarned.toLocaleString()} 點籌碼！`);

    setTimeout(() => {
      setIsVisible(false);
    }, 1800);
  };

  // Stash in bag to sell at Lobby Black Market for higher price
  const handleKeepInBag = () => {
    sound.playClick();
    setFeedbackMessage('🎒 已收入珍品背包！可隨時至大廳黑市尋找最高溢價買家。');

    setTimeout(() => {
      setIsVisible(false);
    }, 1600);
  };

  return createPortal(
    <div
      id="item-unlock-floating-toast"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100000] max-w-xl w-[94vw] sm:w-[500px] pointer-events-auto select-none animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div className="relative rounded-2xl bg-[#0b0e14]/98 border-2 border-amber-400/80 shadow-[0_15px_40px_rgba(0,0,0,0.95),0_0_25px_rgba(245,158,11,0.35)] backdrop-blur-md p-3.5 sm:p-4 overflow-hidden flex flex-col gap-2.5">
        {/* Top Shimmer Strip */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${badge.glow} animate-pulse`} />

        {/* Ambient background glow */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {feedbackMessage ? (
          /* Quick confirmation message */
          <div className="py-4 flex items-center justify-center gap-2 text-amber-200 font-bold text-sm animate-in fade-in zoom-in-95">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>{feedbackMessage}</span>
          </div>
        ) : (
          <>
            {/* Header: Dealer Presentation */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤵</span>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-amber-300">荷官特別致贈</span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsVisible(false)}
                className="p-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors cursor-pointer shrink-0"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dealer Atmospheric Story snippet */}
            <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-[11px] text-amber-100/90 leading-relaxed font-sans italic">
              {getDealerStory(unlockedItem.rarity)}
            </div>

            {/* Item Showcase Row */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-black/50 border border-stone-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-black to-purple-950/40 border border-amber-400/50 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                  <span>{unlockedItem.icon}</span>
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-amber-400 text-stone-950 text-[9px]">
                    <Sparkles className="w-2.5 h-2.5" />
                  </div>
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-xs sm:text-sm text-stone-100 truncate">
                    {unlockedItem.name}
                  </h4>
                  <p className="text-[10px] text-stone-400 italic line-clamp-1 mt-0.5">
                    "{unlockedItem.flavorText}"
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono">
                <span className="text-[10px] text-stone-400 block">基礎估值</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 block">
                  {unlockedItem.basePrice.toLocaleString()} 點
                </span>
              </div>
            </div>

            {/* Action Buttons: 現場折價變現 vs 收進包包 */}
            <div className="flex items-center gap-2 pt-1 border-t border-stone-800/80">
              <button
                type="button"
                onClick={handleInstantSell}
                className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title={`現場折價 80% 立即變現 ${instantPrice.toLocaleString()} 點籌碼`}
              >
                <Coins className="w-3.5 h-3.5 fill-current" />
                <span>現場變現 (+{instantPrice.toLocaleString()} 點)</span>
              </button>

              <button
                type="button"
                onClick={handleKeepInBag}
                className="flex-1 py-2 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="收入珍品背包，去大廳黑市可賣出最高倍率"
              >
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span>收進包包 (大廳賣高價)</span>
              </button>

              {onOpenInventory && (
                <button
                  type="button"
                  onClick={() => {
                    setIsVisible(false);
                    onOpenInventory();
                  }}
                  className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-800 cursor-pointer transition-colors shrink-0"
                  title="開啟背包"
                >
                  <Gem className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
