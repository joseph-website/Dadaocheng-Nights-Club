import React, { useState, useEffect } from 'react';
import {
  Keyboard,
  X,
  Layers,
  Sparkles,
  Command,
} from 'lucide-react';
import { sound } from '../../utils/audio';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
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

  const hotkeysList = [
    {
      category: '通用操作 (Global)',
      keys: [
        { key: 'Space', desc: '主要行動：旋轉 / 發牌 / 投球 / 拉霸 / 擲骰 / 夾娃娃下爪' },
        { key: '1 ~ 5', desc: '快速切換籌碼面額 ($100 / $200 / $500 / $1,000 / $2,000)' },
        { key: 'T', desc: '⚡ 快速切換急速模式 (Turbo Mode ON / OFF)' },
        { key: 'M', desc: '快速切換 靜音 / 開啟音效' },
        { key: 'B', desc: '開啟 / 關閉 珍品背包與當鋪' },
        { key: 'S', desc: '開啟 / 關閉 VIP 貴賓生涯統計 (除21點操作回合外)' },
        { key: 'Esc', desc: '快速關閉當前開啟的彈出視窗與下拉選單' },
      ],
    },
    {
      category: '桌面下注通用 (輪盤 / 十八仔 / 骰寶 / 花旗骰 / 21點押注期)',
      keys: [
        { key: 'Space', desc: '開始開彩 / 擲骰 / 啟動旋轉' },
        { key: 'C', desc: '清除所有下注 (Clear)' },
        { key: 'X', desc: '將當前賭桌下注金額翻倍 (Double 2x)' },
        { key: 'R', desc: '重複上一輪所有下注 (Rebet)' },
      ],
    },
    {
      category: '21點行動期 (Blackjack)',
      keys: [
        { key: 'H', desc: '要牌 (Hit)' },
        { key: 'S', desc: '停牌 (Stand)' },
        { key: 'D 或 X', desc: '雙倍下注 (Double Down)' },
        { key: 'P', desc: '分牌 (Split，當兩張牌點數相同時)' },
        { key: 'U', desc: '投降 (Surrender，保留一半本金退場)' },
      ],
    },
    {
      category: '德州撲克專用 (Texas Hold\'em)',
      keys: [
        { key: 'Space', desc: '開始手牌 / 過牌 (Check) / 跟注 (Call)' },
        { key: 'F', desc: '棄牌 (Fold)' },
        { key: 'R 或 X', desc: '加注 (Raise)' },
        { key: 'A', desc: '全壓 (All-in)' },
      ],
    },
    {
      category: '街機與休閒遊戲 (夾娃娃機 / 老虎機 / 彈珠台 / 打彈珠)',
      keys: [
        { key: 'Space', desc: '投幣 / 釋放爪子 / 開始拉霸 / 彈珠發射' },
        { key: '← → 或 A D', desc: '夾娃娃機爪子左右移動控制' },
      ],
    },
  ];

  return (
    <div
      id="modal-hotkeys-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none cursor-pointer"
      onClick={() => {
        sound.playClick();
        onClose();
      }}
      title="點擊背景空白處即可直接關閉"
    >
      <div
        id="modal-hotkeys-container"
        className="w-full max-w-lg bg-[#0d1017] border-2 border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25),0_20px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 duration-200 text-stone-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-gradient-to-r from-[#111928] via-[#142338] to-[#111928]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[9px] flex items-center justify-center">
                <Keyboard className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">鍵盤快捷鍵指南</h3>
              <p className="text-[10px] text-cyan-400/80 font-mono">KEYBOARD SHORTCUTS</p>
            </div>
          </div>
          <button
            id="btn-close-hotkeys-modal"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 hover:border-cyan-500/40 transition-all cursor-pointer text-xs"
            title="點擊或按 ESC 關閉"
          >
            <span className="text-[10px] font-mono text-stone-400 hidden sm:inline">ESC</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {hotkeysList.map((sec) => (
            <div key={sec.category} className="space-y-2">
              <h4 className="text-xs font-bold text-amber-400/90 flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5" />
                <span>{sec.category}</span>
              </h4>
              <div className="space-y-1.5">
                {sec.keys.map((k) => (
                  <div
                    key={k.key}
                    className="p-2 rounded-xl bg-stone-900/80 border border-stone-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-stone-300 font-medium">{k.desc}</span>
                    <kbd className="px-2.5 py-1 rounded-lg bg-stone-950 border border-cyan-500/40 text-cyan-300 font-mono font-black text-xs shadow-inner shrink-0">
                      {k.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-[#121622] flex items-center justify-between text-xs text-stone-400">
          <span>支援任意頁面即時鍵盤操作</span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
          >
            關閉指南 (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
