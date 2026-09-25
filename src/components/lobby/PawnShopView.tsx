import React from 'react';
import { CollectibleItem, PawnedItemRecord } from '../../types/inventory';
import { calculatePawnAmount } from '../../utils/inventory';
import {
  Building2,
  Lock,
  Unlock,
  Coins,
  Gem,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface PawnShopViewProps {
  balance?: number;
  currentBalance?: number;
  collectibles?: CollectibleItem[];
  pawnedItems?: PawnedItemRecord[];
  isBankruptcyMode?: boolean;
  onTriggerGameOver?: () => void;
  onPawnItem: (item: CollectibleItem) => void;
  onRedeemItem: (item: CollectibleItem) => void;
  onSelectGame?: (
    game: 'roulette' | 'slot' | 'plinko' | 'blackjack' | 'poker' | 'siba' | 'craps' | 'claw'
  ) => void;
}

export const PawnShopView: React.FC<PawnShopViewProps> = ({
  balance: balanceProp,
  currentBalance,
  collectibles = [],
  pawnedItems = [],
  isBankruptcyMode = false,
  onTriggerGameOver,
  onPawnItem,
  onRedeemItem,
  onSelectGame,
}) => {
  const balance = balanceProp ?? currentBalance ?? 0;
  const isLocked = balance < 100;

  // Calculate total pawnable potential
  const totalPawnableValue = (collectibles || []).reduce(
    (sum, item) => sum + calculatePawnAmount(item?.basePrice ?? 0),
    0
  );

  // Total required redemption funds
  const totalRedeemCost = (pawnedItems || []).reduce((sum, item) => sum + (item?.redeemCost ?? 0), 0);

  return (
    <div
      id="lobby-pawn-shop"
      className="w-full h-full flex flex-col gap-2.5 overflow-hidden animate-fade-in"
    >
      {/* 1. Header Banner with Pawn Rules & Summary */}
      <div
        className={`w-full shrink-0 px-4 py-2.5 rounded-xl border shadow-md flex flex-wrap items-center justify-between gap-2 ${
          isBankruptcyMode || isLocked
            ? 'bg-gradient-to-r from-rose-950/90 via-stone-900/90 to-rose-950/80 border-rose-500/60'
            : 'bg-gradient-to-r from-amber-950/70 via-stone-900/90 to-stone-950 border border-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl shadow ${
              isBankruptcyMode || isLocked
                ? 'bg-gradient-to-br from-rose-600 to-stone-900 border-rose-400'
                : 'bg-gradient-to-br from-amber-600 to-stone-900 border-amber-400/60'
            }`}
          >
            💼
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`font-black text-sm sm:text-base flex items-center gap-1.5 ${
                  isBankruptcyMode || isLocked ? 'text-rose-200' : 'text-amber-200'
                }`}
              >
                <span>{isBankruptcyMode || isLocked ? '🚨 破產緊急救濟質押所' : '地下當鋪救濟所'}</span>
                <span className="text-xs font-mono text-amber-400 font-bold">(UNDERGROUND PAWN SHOP)</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  isBankruptcyMode || isLocked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                }`}
              >
                {isBankruptcyMode || isLocked
                  ? '當前籌碼低於 100 點，賭桌已暫時鎖定'
                  : '80% 破產應急質押 &bull; 100% 原價贖回'}
              </span>
            </div>
            <p className="text-xs text-stone-300">
              {isBankruptcyMode || isLocked
                ? '當前籌碼低於 100 點時，賭桌將暫時鎖定。請於左側典當珍品以獲取 80% 周轉金解除鎖定；若決定不典當，請點擊右側手動離場結算。'
                : '臨時缺乏籌碼時可將珍品典當換取 80% 應急金（進位至百位）；日後隨時支付原價即可贖回，典當期間陳列館保留資訊但為暗掉狀態！'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* If player broke or in bankruptcy mode: show prominent Leave/GameOver button */}
          {(isBankruptcyMode || isLocked) && onTriggerGameOver && (
            <button
              id="btn-pawn-trigger-gameover"
              type="button"
              onClick={onTriggerGameOver}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white border border-rose-400 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] active:scale-95"
            >
              <span>🚪 黯然離場 (結束長夜)</span>
            </button>
          )}

          {!isLocked && onSelectGame && (
            <button
              type="button"
              onClick={() => onSelectGame('roulette')}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow active:scale-95"
            >
              <span>🎲 重返賭桌</span>
            </button>
          )}

          <div className="px-3 py-1 rounded-xl bg-black/60 border border-stone-800 text-right">
            <span className="text-[10px] text-stone-400 block">目前質押中珍品</span>
            <span className="font-mono text-xs sm:text-sm font-black text-amber-300">
              {pawnedItems.length} 件 (需 ${totalRedeemCost.toLocaleString()} 贖回)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Pawn & Redeem Stage */}
      <div className="w-full flex-1 min-h-0 flex gap-3 overflow-hidden">
        {/* Left Column: Available Collectibles to Pawn (背包可質押珍品) */}
        <div className="w-1/2 h-full rounded-2xl bg-[#0c0e16] border border-amber-500/20 shadow-xl p-3 flex flex-col justify-between overflow-hidden gap-2">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Gem className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-sm text-stone-100">
                可質押珍品 ({collectibles.length} 件)
              </span>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              可獲最高應急金: <strong className="text-amber-300 font-black text-sm">${totalPawnableValue.toLocaleString()}</strong>
            </span>
          </div>

          {/* List of items that can be pawned */}
          <div className="flex-1 overflow-y-auto custom-scrollbar my-1 pr-1 space-y-2">
            {collectibles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-500">
                <span className="text-4xl mb-2">💎</span>
                <p className="text-sm font-bold text-stone-200">背包中目前無可質押之珍品</p>
                <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed">
                  {isLocked
                    ? '您的籌碼已低於 $100 且身上無多餘珍品可供質押。感謝您於大稻賭埕之夜的精彩博弈！'
                    : '在各大賭桌對局中觸發神秘條件即可獲得珍品；或至夾娃娃機夾取珍品扭蛋！'}
                </p>
                {isLocked && onTriggerGameOver && (
                  <button
                    type="button"
                    onClick={onTriggerGameOver}
                    className="mt-4 py-2.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <span>🚪 確認離場 &bull; 產出賭王生涯結算報告</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {collectibles.map((item) => {
                  const pawnAmount = calculatePawnAmount(item.basePrice);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 flex flex-col justify-between gap-2 shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl shrink-0">{item.icon}</span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-stone-200 truncate">{item.name}</h4>
                            <span className="text-xs text-stone-400 font-mono block truncate">
                              【{item.gameName}】
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-stone-800/80 flex items-center justify-between">
                        <div className="text-xs font-mono">
                          <span className="text-stone-500 block text-[10px]">原估值 ${item.basePrice.toLocaleString()}</span>
                          <span className="font-black text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                            質押得: +${pawnAmount.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onPawnItem(item)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-xs shadow cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>質押典當</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom helper info */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
            <span>💡 典當金額為基礎價格 80%（無條件進位至百位數）。</span>
          </div>
        </div>

        {/* Right Column: Currently Pawned Items / Ticket Stub (當鋪保管庫 / 贖回台) */}
        <div className="w-1/2 h-full rounded-2xl bg-[#0c0e16] border border-rose-500/20 shadow-xl p-3 flex flex-col justify-between overflow-hidden gap-2">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm text-stone-100">
                當票保管庫 / 贖回台 ({pawnedItems.length} 件)
              </span>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              當前可用籌碼: <strong className="text-amber-300 font-bold">${balance.toLocaleString()}</strong>
            </span>
          </div>

          {/* Pawned items list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar my-1 pr-1 space-y-2">
            {pawnedItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-500">
                <span className="text-3xl mb-1.5">📜</span>
                <p className="text-sm font-bold text-stone-300">目前當鋪內無典當物</p>
                <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                  若手頭緊湊，可於左側質押背包珍品，暫時換取籌碼繼續翻本！
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pawnedItems.map((record) => {
                  const item = record?.item;
                  if (!item) return null;
                  const redeemCost = record?.redeemCost ?? item.basePrice ?? 0;
                  const pawnAmount = record?.pawnAmount ?? calculatePawnAmount(item.basePrice ?? 0);
                  const canRedeem = balance >= redeemCost;

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 flex flex-col justify-between gap-2 shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl shrink-0 filter opacity-80">{item.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-stone-300 truncate">{item.name}</h4>
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                質押中
                              </span>
                            </div>
                            <span className="text-xs text-stone-500 font-mono block truncate">
                              曾借出: ${pawnAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-stone-800/80 flex items-center justify-between">
                        <div className="text-xs font-mono">
                          <span className="text-stone-500 block">贖回原價</span>
                          <span className="font-bold text-sm text-amber-300">
                            ${redeemCost.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!canRedeem}
                          onClick={() => onRedeemItem(item)}
                          className={`px-3 py-1.5 rounded-lg font-black text-xs shadow flex items-center gap-1 transition-all ${
                            canRedeem
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 cursor-pointer active:scale-95'
                              : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                          }`}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>{canRedeem ? '支付贖回' : '籌碼不足'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom helper info */}
          <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400 shrink-0">
            <span>💡 支付原價 100% 即可隨時贖回珍品，陳列館將即刻重新照亮！</span>
          </div>
        </div>
      </div>
    </div>
  );
};
