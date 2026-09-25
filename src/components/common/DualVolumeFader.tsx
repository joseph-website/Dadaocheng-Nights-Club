import React, { useState, useEffect, useRef } from 'react';
import { Music, Volume2, VolumeX, Sliders, Disc } from 'lucide-react';
import { bgmEngine } from '../../utils/bgmEngine';
import { sound } from '../../utils/audio';

interface DualVolumeFaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  soundVolume: number;
  onChangeSoundVolume: (vol: number) => void;
  variant?: 'vertical' | 'horizontal';
}

export const DualVolumeFader: React.FC<DualVolumeFaderProps> = ({
  soundEnabled,
  onToggleSound,
  soundVolume,
  onChangeSoundVolume,
  variant = 'horizontal',
}) => {
  const [bgmVolume, setBgmVolume] = useState<number>(bgmEngine.getVolume());
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(bgmEngine.getIsPlaying());

  useEffect(() => {
    const unsub = bgmEngine.subscribe(() => {
      setBgmVolume(bgmEngine.getVolume());
      setIsBgmPlaying(bgmEngine.getIsPlaying());
    });
    return unsub;
  }, []);

  const handleBgmVolumeChange = (newVal: number) => {
    bgmEngine.setVolume(newVal);
    setBgmVolume(newVal);
  };

  // Block wheel scrolling entirely to prevent accidental adjustment
  const handleWheelPrevent = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (variant === 'vertical') {
    return (
      <div
        id="audio-console-dual-fader"
        onWheel={handleWheelPrevent}
        className="flex items-center gap-6 p-4 rounded-2xl bg-stone-950/90 border border-amber-500/30 shadow-xl select-none"
      >
        {/* Fader 1: BGM */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-mono font-bold text-amber-300">
            {Math.round(bgmVolume * 100)}%
          </span>
          <div className="relative h-32 w-8 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-center p-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={bgmVolume}
              onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
              onWheel={handleWheelPrevent}
              className="h-28 w-1.5 appearance-none bg-stone-800 rounded-lg cursor-pointer accent-amber-400 -rotate-90 origin-center"
            />
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-300">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>背景音樂</span>
          </div>
        </div>

        {/* Fader 2: SFX */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-mono font-bold text-amber-300">
            {soundEnabled ? `${Math.round(soundVolume * 100)}%` : '靜音'}
          </span>
          <div className="relative h-32 w-8 bg-stone-900 rounded-xl border border-stone-800 flex items-center justify-center p-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!soundEnabled}
              value={soundEnabled ? soundVolume : 0}
              onChange={(e) => onChangeSoundVolume(parseFloat(e.target.value))}
              onWheel={handleWheelPrevent}
              className="h-28 w-1.5 appearance-none bg-stone-800 rounded-lg cursor-pointer accent-amber-400 -rotate-90 origin-center disabled:opacity-30"
            />
          </div>
          <button
            type="button"
            onClick={onToggleSound}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>遊戲音效</span>
          </button>
        </div>
      </div>
    );
  }

  // Horizontal Master Console
  return (
    <div
      id="audio-console-dual-fader"
      onWheel={handleWheelPrevent}
      className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-800 space-y-3.5 select-none"
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-stone-200 tracking-wide">音控台推桿 (僅限拖曳)</span>
        </div>
        <span className="text-[10px] text-stone-500 font-mono">滑鼠滾輪已鎖定防誤觸</span>
      </div>

      {/* 1. BGM Track Fader */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-200 font-bold">
            <Music className="w-3.5 h-3.5 text-amber-400" />
            <span>【背景音樂】雨聲與 Lo-Fi 和弦</span>
          </div>
          <span className="font-mono font-bold text-amber-300 text-xs">
            {Math.round(bgmVolume * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              bgmEngine.togglePlay();
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              isBgmPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-stone-800 text-stone-400 hover:text-white'
            }`}
          >
            {isBgmPlaying ? '播放中' : '已暫停'}
          </button>
          <div className="flex-1 relative flex items-center">
            <input
              id="slider-bgm-fader"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={bgmVolume}
              onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
              onWheel={handleWheelPrevent}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* 2. SFX Game Sound Fader */}
      <div className="space-y-1.5 pt-1.5 border-t border-stone-800/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-stone-200 font-bold">
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>【遊戲音效】下注、籌碼、拉霸與開獎</span>
          </div>
          <span className="font-mono font-bold text-amber-300 text-xs">
            {soundEnabled ? `${Math.round(soundVolume * 100)}%` : '已靜音'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                : 'bg-stone-800 text-stone-400 hover:text-white'
            }`}
          >
            {soundEnabled ? '靜音' : '開啟'}
          </button>
          <div className="flex-1 relative flex items-center">
            <input
              id="slider-sfx-fader"
              type="range"
              min="0"
              max="1"
              step="0.01"
              disabled={!soundEnabled}
              value={soundEnabled ? soundVolume : 0}
              onChange={(e) => onChangeSoundVolume(parseFloat(e.target.value))}
              onWheel={handleWheelPrevent}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-400 shadow-inner disabled:opacity-30"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
