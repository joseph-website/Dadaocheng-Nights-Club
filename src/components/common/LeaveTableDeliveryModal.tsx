import React from 'react';
import { createPortal } from 'react-dom';
import { CollectibleItem } from '../../types/inventory';
import { sound } from '../../utils/audio';
import { Sparkles, Package, Check, Award } from 'lucide-react';

interface LeaveTableDeliveryModalProps {
  isOpen: boolean;
  pendingItems: CollectibleItem[];
  sourceGameName?: string;
  onConfirm: () => void;
}

export const LeaveTableDeliveryModal: React.FC<LeaveTableDeliveryModalProps> = ({
  isOpen,
  pendingItems,
  sourceGameName,
  onConfirm,
}) => {
  if (!isOpen || pendingItems.length === 0) return null;

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          label: '傳奇極品',
          badgeClass:
            'bg-amber-500/20 text-amber-300 border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
          borderClass: 'border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
        };
      case 'epic':
        return {
          label: '史詩珍藏',
          badgeClass:
            'bg-purple-500/20 text-purple-300 border-purple-400/80 shadow-[0_0_12px_rgba(168,85,247,0.5)]',
          borderClass: 'border-purple-400/80 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
        };
      case 'rare':
        return {
          label: '稀有寶物',
          badgeClass:
            'bg-blue-500/20 text-blue-300 border-blue-400/80 shadow-[0_0_12px_rgba(59,130,246,0.5)]',
          borderClass: 'border-blue-400/80',
        };
      default:
        return {
          label: '精選典藏',
          badgeClass: 'bg-stone-500/20 text-stone-300 border-stone-400/80',
          borderClass: 'border-stone-700',
        };
    }
  };

  const totalBaseValue = pendingItems.reduce((sum, item) => sum + item.basePrice, 0);

  const handleClaim = () => {
    sound.playWin();
    sound.playCoinPayout();
    onConfirm();
  };

  return createPortal(
    <div
      id="leave-table-delivery-modal-overlay"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        id="leave-table-delivery-modal"
        className="w-full max-w-lg bg-[#0c0f17] border-2 border-amber-400/90 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.4)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Top Shimmer Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600 animate-pulse" />

        {/* NPC Presentation Header */}
        <div className="px-5 pt-5 pb-3 border-b border-stone-800/80 bg-gradient-to-b from-stone-900/90 to-transparent flex items-start gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-200 shrink-0">
            <span>🤵</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-amber-300 flex items-center gap-1.5">
                <span>賭桌巡場主管攔截</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40">
                  {sourceGameName || '現場賭桌'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-stone-300 mt-1 font-serif italic leading-relaxed">
              「等一下！剛才你在這檯子上氣場大發...這東西是你在剛才對局留下的吧？巡場幫你保管好，現在原封不動交還給你！」
            </p>
          </div>
        </div>

        {/* Acquired Items Display */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span className="flex items-center gap-1 font-bold text-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              本次離桌交付道具 (共 {pendingItems.length} 件):
            </span>
            <span className="font-mono text-stone-300">
              市場估值: <b className="text-emerald-400 font-bold">${totalBaseValue.toLocaleString()}</b>
            </span>
          </div>

          {pendingItems.map((item) => {
            const rarityInfo = getRarityBadge(item.rarity);
            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl bg-stone-900/90 border-2 ${rarityInfo.borderClass} flex items-center justify-between gap-3 shadow-md relative overflow-hidden`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 via-black to-purple-950/40 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                    <span>{item.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-stone-100 truncate">{item.name}</h4>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${rarityInfo.badgeClass}`}>
                        {rarityInfo.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 italic line-clamp-1 mt-0.5 font-sans">
                      "{item.flavorText}"
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="text-[10px] text-stone-400 block">基礎估值</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 block">
                    ${item.basePrice.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              收下後道具將正式存入您的【專屬背包】，可隨時至大廳黑市尋找高溢價 NPC 賣出高達 300% 天價！
            </span>
          </div>
        </div>

        {/* Footer: ONLY 1 Action Button (確定收下) */}
        <div className="p-4 sm:p-5 border-t border-stone-800 bg-black/50">
          <button
            id="btn-confirm-leave-table-delivery"
            type="button"
            onClick={handleClaim}
            className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
          >
            <Check className="w-5 h-5 text-stone-950 stroke-[3]" />
            <span>確定收下</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
