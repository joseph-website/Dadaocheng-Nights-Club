import React, { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  Gem,
  ArrowRight,
  ShieldAlert,
  Coins,
  Ticket,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import {
  getPlayerCollectibles,
  calculatePawnAmount,
  getPendingDeliveries,
  getRedeemableItems,
} from '../../utils/inventory';

interface BankruptcyAlertModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  balance: number;
  collectiblesCount: number;
  redeemablesCount: number;
}

export const BankruptcyAlertModal: React.FC<BankruptcyAlertModalProps> = ({
  isOpen,
  onConfirm,
  balance,
  collectiblesCount,
  redeemablesCount,
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playLoss();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onConfirm();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onConfirm]);

  const playerCollectibles = useMemo(() => {
    if (!isOpen) return [];
    const saved = getPlayerCollectibles();
    const pending = getPendingDeliveries();
    const combined = [...saved];
    for (const p of pending) {
      if (!combined.some((c) => c.id === p.id)) {
        combined.push(p);
      }
    }
    return combined;
  }, [isOpen]);

  const redeemableItems = useMemo(() => {
    if (!isOpen) return [];
    return getRedeemableItems();
  }, [isOpen]);

  const totalRedeemableValue = useMemo(() => {
    return redeemableItems.reduce((sum, item) => sum + (item?.value ?? 0), 0);
  }, [redeemableItems]);

  const totalPawnPotential = useMemo(() => {
    return playerCollectibles.reduce(
      (sum, item) => sum + calculatePawnAmount(item.basePrice),
      0
    );
  }, [playerCollectibles]);

  if (!isOpen) return null;

  const hasRedeemables = redeemablesCount > 0 || redeemableItems.length > 0;
  const hasCollectibles = collectiblesCount > 0 || playerCollectibles.length > 0;

  return (
    <div
      id="modal-bankruptcy-alert-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={onConfirm}
    >
      <div
        id="modal-bankruptcy-alert-container"
        className="w-full max-w-lg bg-[#0e1017] border-2 border-rose-500/70 rounded-2xl shadow-[0_0_60px_rgba(244,63,94,0.35),0_25px_50px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 text-stone-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with High-Visibility Emergency Badges */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-rose-950/90 via-stone-900 to-rose-950/90 border-b border-rose-500/40">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0 shadow-lg">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-rose-200 tracking-wide">
                籌碼告急 &bull; 賭桌暫時鎖定
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/50 font-mono font-bold">
                BANKRUPTCY ALERT
              </span>
            </div>
            {/* MANDATORY WARNING TEXT */}
            <p className="text-xs text-rose-300/90 font-medium pt-0.5">
              當前籌碼低於 100 點，所有賭桌已暫時鎖定
            </p>
          </div>
        </div>

        {/* 2. Body Content: Visual Hierarchy of Financial Status */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Financial Contrast Cards: Current Funds vs Redeemable / Pawn Recovery */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left Card: Current Balance (< 100) */}
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-rose-500/30 flex flex-col justify-between gap-1 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400">當前可用籌碼</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                  低於 $100
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-mono font-black text-rose-400">
                  ${balance.toLocaleString()}
                </span>
                <span className="text-xs text-stone-500 font-mono">點</span>
              </div>
            </div>

            {/* Right Card: Dynamic Recovery Asset Preview (Redeemables takes priority) */}
            {hasRedeemables ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/80 via-stone-900 to-yellow-950/60 border-2 border-amber-400/80 flex flex-col justify-between gap-1 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    持有代幣道具總值
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                    1:1 兌現
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
                    +${totalRedeemableValue.toLocaleString()}
                  </span>
                  <span className="text-xs text-amber-400/80 font-mono font-bold">點</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/80 via-stone-900 to-indigo-950/60 border-2 border-purple-400/80 flex flex-col justify-between gap-1 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    典當預計回饋資金
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-400/20 text-purple-300 font-bold border border-purple-400/40">
                    80% 周轉金
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-300 to-indigo-300">
                    {totalPawnPotential > 0 ? `+$${totalPawnPotential.toLocaleString()}` : '$0'}
                  </span>
                  <span className="text-xs text-purple-400/80 font-mono font-bold">點</span>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Action & Guide Section */}
          {hasRedeemables ? (
            <div className="p-4 rounded-xl bg-[#11141e] border border-amber-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs text-stone-200">
                    可兌現代幣道具 ({redeemableItems.length} 件待兌換)
                  </span>
                </div>
                <span className="text-[10px] text-amber-300 font-mono">
                  前往大廳 VIP 櫃台兌換籌碼
                </span>
              </div>

              {/* Preview List of redeemable items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {redeemableItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="text-stone-300 font-medium truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 shrink-0 text-right">
                      +${item.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed pt-1 border-t border-stone-800">
                💡 <strong>救濟指引</strong>：娃娃機獲得的代幣道具不可典當或出售，請直接前往大廳 <strong>VIP 櫃台</strong> 進行 1:1 兌現，兌換為籌碼後即可重新解鎖賭桌！
              </p>
            </div>
          ) : hasCollectibles ? (
            <div className="p-4 rounded-xl bg-[#11141e] border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gem className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-xs text-stone-200">
                    可典當珍品預覽 ({playerCollectibles.length} 件可質押)
                  </span>
                </div>
                <span className="text-[10px] text-purple-300 font-mono">
                  質押可立即注入周轉金
                </span>
              </div>

              {/* Preview Chips list of pawnable items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {playerCollectibles.slice(0, 4).map((item) => {
                  const pawnVal = calculatePawnAmount(item.basePrice);
                  return (
                    <div
                      key={item.id}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-900/90 border border-stone-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <span className="text-stone-300 font-medium truncate">{item.name}</span>
                      </div>
                      <span className="font-mono font-bold text-purple-300 shrink-0 text-right">
                        +${pawnVal.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-stone-400 leading-relaxed pt-1 border-t border-stone-800">
                💡 <strong>救濟指引</strong>：前往地下當鋪質押珍品後，籌碼達 $100 以上賭桌將立即解除鎖定；若決定不典當，亦可於當鋪隨時手動選擇離場結算。
              </p>
            </div>
          ) : null}
        </div>

        {/* 3. Action Footer */}
        <div className="p-4 bg-stone-950/90 border-t border-stone-800 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            id="btn-goto-pawn-confirm"
            type="button"
            onClick={() => {
              sound.playClick();
              onConfirm();
            }}
            className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-stone-950 font-black text-sm tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            {hasRedeemables ? (
              <>
                <Coins className="w-4 h-4" />
                <span>前往 VIP 櫃台兌換籌碼 (按 ESC / 點擊進入)</span>
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4" />
                <span>前往地下當鋪質押回血 (按 ESC / 點擊進入)</span>
              </>
            )}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

