import React, { useState, useEffect } from 'react';
import {
  Settings,
  RotateCcw,
  X,
  Keyboard,
  Trophy,
  ShieldCheck,
  Check,
  Zap,
  BookOpen,
} from 'lucide-react';
import { sound } from '../../utils/audio';
import { isTurboMode, setTurboMode } from '../../utils/turbo';
import { toastService } from '../../utils/toast';
import { DualVolumeFader } from './DualVolumeFader';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  soundVolume: number;
  onChangeVolume: (vol: number) => void;
  onTriggerReset: () => void;
  onOpenCareerStats: () => void;
  onOpenHotkeys: () => void;
  onOpenPrologue?: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  soundVolume,
  onChangeVolume,
  onTriggerReset,
  onOpenCareerStats,
  onOpenHotkeys,
  onOpenPrologue,
}) => {
  const [turbo, setTurbo] = useState(() => isTurboMode());

  // Listen for turbo changes from global hotkeys or external triggers
  useEffect(() => {
    const handleTurboChange = (e: any) => {
      setTurbo(Boolean(e.detail?.enabled));
    };
    window.addEventListener('casino_turbo_change', handleTurboChange);
    return () => {
      window.removeEventListener('casino_turbo_change', handleTurboChange);
    };
  }, []);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTurbo(isTurboMode());
    }
  }, [isOpen]);

  // ESC key listener for instant dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-system-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none cursor-pointer"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
      title="點擊背景空白處即可直接關閉"
    >
      <div
        id="modal-system-settings-container"
        className="w-full max-w-md bg-[#0f111a] border-2 border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2),0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 text-stone-200 flex flex-col max-h-[90vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-[#141824]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[9px] flex items-center justify-center">
                <Settings className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">系統功能設定</h3>
              <p className="text-[10px] text-stone-400 font-mono">SYSTEM SETTINGS</p>
            </div>
          </div>
          <button
            id="btn-close-system-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-stone-300 hover:text-white bg-stone-900/80 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/40 transition-all cursor-pointer text-xs"
            title="點擊或按 ESC 關閉"
          >
            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar">
          {/* 1. 音效與黑膠音樂音量推桿 (Dual Volume Console - BGM & SFX) */}
          <DualVolumeFader
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            soundVolume={soundVolume}
            onChangeSoundVolume={onChangeVolume}
          />

          {/* 2. VIP 貴賓生涯統計總覽 (Career Stats) */}
          <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100">VIP 生涯統計總覽</h4>
                <p className="text-xs text-stone-400">查看投注總量、歷史最大贏額與圖鑑</p>
              </div>
            </div>

            <button
              id="btn-modal-open-career-stats"
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
                onOpenCareerStats();
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              檢視數據
            </button>
          </div>

          {/* 3. 鍵盤快捷鍵指南 (Hotkeys Guide) */}
          <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-cyan-500/40 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-100">鍵盤快捷鍵指南</h4>
                <p className="text-xs text-stone-400">Space 鍵行動、1~5 籌碼面額、T 鍵急速模式</p>
              </div>
            </div>

            <button
              id="btn-modal-open-hotkeys"
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
                onOpenHotkeys();
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              查看快捷鍵
            </button>
          </div>

          {/* 3.5 俱樂部前言劇情 (Prologue Story) */}
          {onOpenPrologue && (
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-purple-500/40 transition-colors flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-100">重溫導入劇情</h4>
                  <p className="text-xs text-stone-400">重新閱讀大稻賭埕之夜的背景設定與新手指南</p>
                </div>
              </div>

              <button
                id="btn-modal-open-prologue"
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                  onOpenPrologue();
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/50 font-bold text-xs cursor-pointer transition-all active:scale-95"
              >
                閱讀劇情
              </button>
            </div>
          )}

          {/* 4. 急速模式開關 (Turbo Mode) */}
          <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                  turbo
                    ? 'bg-amber-500/20 text-amber-400 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'bg-stone-800/60 text-stone-500 border-stone-700'
                }`}
              >
                <Zap className={`w-5 h-5 ${turbo ? 'fill-amber-400' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-stone-100">急速模式 (Turbo Mode)</h4>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                      turbo
                        ? 'bg-amber-400 text-stone-950 shadow-xs'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {turbo ? '已開啟 ON' : '已關閉 OFF'}
                  </span>
                </div>
                <p className="text-xs text-stone-400">大幅縮短輪盤、老虎機、骰盅等開彩等待時間</p>
              </div>
            </div>

            <button
              id="btn-modal-toggle-turbo"
              type="button"
              onClick={() => {
                const next = !turbo;
                setTurbo(next);
                setTurboMode(next);
                sound.playClick();
                toastService.info(
                  next ? '⚡ 急速模式已啟用 (跳過漫長開彩物理等待)' : '⏳ 已恢復標準真實物理節奏'
                );
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                turbo
                  ? 'bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-stone-800'
              }`}
              title={turbo ? '點擊關閉急速模式' : '點擊開啟急速模式'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-stone-950 shadow-lg ring-0 transition duration-200 ease-in-out ${
                  turbo ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 5. 重置籌碼 $20,000 (Reset $20K) */}
          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 hover:border-rose-500/50 transition-colors flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-200">重置 $20,000 初始籌碼</h4>
                <p className="text-xs text-rose-400/80">防呆機制 (清空所有資料並返回大廳)</p>
              </div>
            </div>

            <button
              id="btn-modal-trigger-reset"
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
                onTriggerReset();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold text-xs cursor-pointer transition-all active:scale-95"
            >
              重置餘額
            </button>
          </div>
        </div>

        {/* Footer: Easy Full-Width / Large Dismiss Button */}
        <div className="px-5 py-3 border-t border-stone-800/80 bg-black/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">純本地離線存儲</span>
          </div>

          <button
            id="btn-confirm-close-system"
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex-1 sm:flex-initial px-6 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-black text-xs cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.35)] transition-all active:scale-95 text-center flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>完成設定並關閉 (Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
