import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, LogOut, ShieldAlert, Coins } from 'lucide-react';
import { sound } from '../../utils/audio';

export interface LeaveTableForfeitModalProps {
  isOpen: boolean;
  sourceGameId: string;
  sourceGameName: string;
  sourceGameIcon?: string;
  targetGameName: string;
  targetGameIcon?: string;
  forfeitAmount: number;
  onCancel: () => void;
  onConfirmForfeit: () => void;
}

export const LeaveTableForfeitModal: React.FC<LeaveTableForfeitModalProps> = ({
  isOpen,
  sourceGameName,
  sourceGameIcon = '♠️',
  targetGameName,
  targetGameIcon = '🏛️',
  forfeitAmount,
  onCancel,
  onConfirmForfeit,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      id="leave-table-forfeit-modal-overlay"
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        id="leave-table-forfeit-modal"
        className="w-full max-w-lg bg-[#0e111a] border-2 border-red-500/80 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(239,68,68,0.3)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Top Warning Accent Line */}
        <div
          id="forfeit-modal-accent-line"
          className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"
        />

        {/* Modal Header */}
        <div
          id="forfeit-modal-header"
          className="px-6 pt-6 pb-4 border-b border-stone-800/80 bg-stone-900/60 flex items-start gap-4"
        >
          <div
            id="forfeit-modal-icon-container"
            className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black tracking-wider">
                警告
              </span>
              <h3
                id="forfeit-modal-title"
                className="text-lg font-black text-amber-200 flex items-center gap-1.5"
              >
                <span>賭局進行中：中途離場將沒收賭注</span>
              </h3>
            </div>
            <p id="forfeit-modal-subtitle" className="text-xs text-stone-400 mt-1">
              偵測到當前賭局尚未結算，中途切換賭桌將被視為主動棄權。
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div id="forfeit-modal-body" className="p-6 space-y-4">
          {/* Transition Route Indication */}
          <div
            id="forfeit-modal-route-box"
            className="flex items-center justify-between p-3 rounded-2xl bg-stone-950/80 border border-stone-800 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-stone-400">當前賭桌:</span>
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <span>{sourceGameIcon}</span>
                <span>{sourceGameName}</span>
              </span>
            </div>
            <div className="text-stone-500 font-mono">➔</div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400">目標賭桌:</span>
              <span className="font-bold text-stone-200 flex items-center gap-1">
                <span>{targetGameIcon}</span>
                <span>{targetGameName}</span>
              </span>
            </div>
          </div>

          {/* Forfeit Amount Warning Box */}
          <div
            id="forfeit-modal-amount-box"
            className="p-4 rounded-2xl bg-red-950/30 border border-red-500/40 space-y-2 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>本局中途離場沒收籌碼金額</span>
            </div>

            <div
              id="forfeit-modal-amount-display"
              className="text-3xl font-black font-mono text-red-400 tracking-tight flex items-center justify-center gap-2"
            >
              <Coins className="w-7 h-7 text-amber-400" />
              <span>${forfeitAmount.toLocaleString()}</span>
              <span className="text-sm font-sans font-normal text-stone-400">點籌碼</span>
            </div>

            <p id="forfeit-modal-rule-desc" className="text-xs text-stone-300 leading-relaxed pt-1">
              大稻賭埕現場守則：於牌局、開骰或輪盤旋轉期間擅自離席，原局下注之籌碼將直接沒收充公，不予保留或折現退款。
            </p>
          </div>

          {/* User Hint */}
          <div
            id="forfeit-modal-hint-box"
            className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed"
          >
            💡 <b className="text-amber-300">防護提示：</b>若本局尚未發牌或擲骰，您可點選下方「返回賭桌繼續對決」，並在賭桌上點擊【清除下注】安全退回籌碼後再離開。
          </div>
        </div>

        {/* Modal Actions */}
        <div
          id="forfeit-modal-actions"
          className="px-6 py-4 border-t border-stone-800/80 bg-stone-900/40 flex flex-col sm:flex-row items-center justify-end gap-3"
        >
          {/* Confirm Forfeit & Leave Button */}
          <button
            id="btn-confirm-forfeit-leave"
            type="button"
            onClick={() => {
              sound.playLoss();
              onConfirmForfeit();
            }}
            className="w-full sm:w-auto order-2 sm:order-1 px-4 py-2.5 rounded-xl text-xs font-bold text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/60 border border-red-600/50 hover:border-red-500 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>執意離場 (沒收賭注)</span>
          </button>

          {/* Stay & Continue Button (Primary safe action) */}
          <button
            id="btn-cancel-leave-table"
            type="button"
            onClick={() => {
              sound.playClick();
              onCancel();
            }}
            className="w-full sm:w-auto order-1 sm:order-2 px-5 py-2.5 rounded-xl text-xs font-black text-stone-950 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-stone-950" />
            <span>返回賭桌繼續對決 (推薦)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
