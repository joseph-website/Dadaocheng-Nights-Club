import React from 'react';
import { Sparkles, ArrowRight, Shield, Coins, Gem, Wine, X } from 'lucide-react';
import { INITIAL_BALANCE } from '../../utils/constants';

interface PrologueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrologueModal: React.FC<PrologueModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90dvh] flex flex-col bg-gradient-to-b from-[#161a26] to-[#0d1017] border border-amber-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden text-stone-200"
      >
        {/* Top Atmosphere Accent Banner */}
        <div className="relative h-24 sm:h-28 bg-gradient-to-r from-purple-950 via-[#1e1b4b] to-amber-950/40 p-4 sm:p-6 flex flex-col justify-end border-b border-amber-500/20 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/70 border border-stone-700 text-stone-400 hover:text-white transition-all cursor-pointer"
            title="關閉導覽"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute top-3 left-4 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            CASINO PROLOGUE
          </div>
          <h2 className="text-lg sm:text-xl font-black text-amber-400 tracking-wide flex items-center gap-2">
            <span>夜幕初臨 · 大稻賭埕之夜</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-300 mt-0.5 sm:mt-1">隱匿於都市霓虹深處的地下高層交會所</p>
        </div>

        {/* Narrative & Guide Content */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            推開沉重黃銅暗門，喧鬧的都市雨夜瞬間被隔絕在身後。調酒的冰塊撞擊聲與賭桌籌碼的脆響交織，這裡是專屬夜行冒險者的秘密領地。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1 sm:pt-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col gap-1 sm:gap-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>1. 博弈贏籌碼</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-normal">
                輪盤、21點、彈珠台、德州撲克等多元遊戲，測試您的膽識與直覺。
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col gap-1 sm:gap-1.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                <Gem className="w-4 h-4 text-purple-400" />
                <span>2. 黑市與當鋪</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-normal">
                搜集稀世珍藏、在黑市套現，資金吃緊時亦可前往當鋪質押週轉。
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-stone-900/80 border border-stone-800 flex flex-col gap-1 sm:gap-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Wine className="w-4 h-4 text-emerald-400" />
                <span>3. 吧台品酩交友</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-normal">
                聆聽爵士黑膠，向老查理打聽都市傳奇情報，獲得幸運微醺祝福。
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-[11px] text-stone-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              隨時點擊右上角【離場結算】保存成績
            </span>
            <span className="text-amber-400 font-mono font-bold">起始資金：${INITIAL_BALANCE.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-stone-950/80 border-t border-stone-800/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all transform active:scale-98 cursor-pointer"
          >
            <span>推開暗門 · 進入大廳</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
