import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { sound } from '../../utils/audio';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  // ESC key listener
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

  return (
    <div
      id="modal-reset-confirm-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none cursor-pointer"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
      title="點擊背景空白處即可取消"
    >
      <div
        id="modal-reset-confirm-container"
        className="w-full max-w-md bg-[#12080a] border-2 border-rose-500/60 rounded-2xl shadow-[0_0_50px_rgba(225,29,72,0.3),0_10px_30px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-rose-900/40 bg-rose-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-rose-200 tracking-wide">
              警告：將重置所有進度
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-stone-400 hover:text-white bg-stone-900/80 hover:bg-stone-800 transition-colors cursor-pointer text-xs"
            title="點擊或按 ESC 關閉"
          >
            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30">
            <p className="text-sm text-rose-300 leading-relaxed font-semibold">
              此操作將會把籌碼恢復為{' '}
              <span className="text-amber-400 font-mono font-bold">$20,000</span>，並
              <span className="text-rose-400 font-black underline decoration-2 mx-1">
                【清空背包內所有道具、成就與所有遊戲之累計資訊】
              </span>
              ，同時將您立即轉移回大廳！確定要執行嗎？
            </p>
          </div>

          <p className="text-xs text-stone-400 leading-relaxed">
            為維護防刷機制與數據真實性，重置全局籌碼將同步清空彈珠台累計投球數、老虎機轉次、輪盤歷史、花旗骰、21點、德州撲克等所有遊戲累計統計數據與背包道具，並重新導向大廳櫃台。
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-5 border-t border-stone-800 bg-[#0a0507] flex items-center justify-end gap-3">
          <button
            id="btn-cancel-reset"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-confirm-reset"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>確認重置</span>
          </button>
        </div>
      </div>
    </div>
  );
};
