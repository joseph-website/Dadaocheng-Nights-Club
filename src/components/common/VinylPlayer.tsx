import React, { useState, useEffect, useRef } from 'react';
import { Disc, Play, Pause, Music, FolderOpen, Radio, Sparkles, Volume2 } from 'lucide-react';
import { bgmEngine, PRESET_SYNTH_TRACKS } from '../../utils/bgmEngine';
import { sound } from '../../utils/audio';
import { toastService } from '../../utils/toast';

interface VinylPlayerProps {
  variant?: 'compact' | 'full' | 'hud';
  onOpenSystemSettings?: () => void;
}

export const VinylPlayer: React.FC<VinylPlayerProps> = ({
  variant = 'compact',
  onOpenSystemSettings,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(bgmEngine.getIsPlaying());
  const [trackName, setTrackName] = useState<string>(bgmEngine.getCurrentTrackName());
  const [trackId, setTrackId] = useState<string>(bgmEngine.getCurrentTrackId());
  const [showTrackMenu, setShowTrackMenu] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = bgmEngine.subscribe(() => {
      setIsPlaying(bgmEngine.getIsPlaying());
      setTrackName(bgmEngine.getCurrentTrackName());
      setTrackId(bgmEngine.getCurrentTrackId());
    });
    return unsubscribe;
  }, []);

  // Global event cleanup: Listen for outside clicks and ESC key to close track menu
  useEffect(() => {
    if (!showTrackMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTrackMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTrackMenu(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showTrackMenu]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    const playing = bgmEngine.togglePlay();
    if (playing) {
      toastService.info(`🎵 正在播放：${bgmEngine.getCurrentTrackName()}`);
    }
  };

  const handleSelectTrack = (id: string) => {
    sound.playClick();
    bgmEngine.selectTrack(id);
    setShowTrackMenu(false);
    toastService.info(`🎵 切換曲目：${bgmEngine.getCurrentTrackName()}`);
  };

  const handleCustomFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const title = await bgmEngine.loadCustomAudioFile(file);
        sound.playWin();
        toastService.success(`🎶 已載入自訂音樂：${title}`);
        if (!bgmEngine.getIsPlaying()) {
          bgmEngine.play();
        }
        setShowTrackMenu(false);
      } catch (err) {
        toastService.error('載入音訊檔案失敗，請確保為標準 MP3/WAV/AAC 檔案。');
      }
    }
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Compact Mini HUD Vinyl Widget
  if (variant === 'hud') {
    return (
      <div
        ref={containerRef}
        id="vinyl-bgm-player"
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
        className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-950/85 border border-amber-500/30 hover:border-amber-400/70 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all select-none cursor-pointer"
        onClick={handleTogglePlay}
        title={isPlaying ? '點擊暫停背景音樂' : '點擊播放夜行氛圍音樂 (Web Audio 合成)'}
      >
        {/* Hidden Local Audio File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
          className="hidden"
          onChange={handleCustomFileChange}
        />

        {/* Realistic Spinning Vinyl Disc Visual */}
        <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
          {/* Tonearm Needle */}
          <div
            className={`absolute -top-1 -right-0.5 w-3 h-4 origin-top-right transition-transform duration-500 z-10 pointer-events-none ${
              isPlaying ? 'rotate-[24deg]' : 'rotate-0 opacity-40'
            }`}
          >
            <div className="w-[1.5px] h-3 bg-amber-300 shadow-xs ml-auto" />
            <div className="w-1.5 h-1 bg-amber-400 rounded-full ml-auto" />
          </div>

          {/* Vinyl Disc Body */}
          <div
            className={`w-7 h-7 rounded-full bg-radial from-stone-900 via-stone-950 to-black border border-stone-700 shadow-md flex items-center justify-center ${
              isPlaying ? 'animate-[spin_4.5s_linear_infinite]' : ''
            }`}
            style={{
              boxShadow: isPlaying ? '0 0 10px rgba(245,158,11,0.35)' : 'none',
            }}
          >
            {/* Vinyl Grooves Texture */}
            <div className="w-5 h-5 rounded-full border border-stone-800/80 flex items-center justify-center">
              {/* Center Album Art / Spindle */}
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xs">
                <div className="w-0.5 h-0.5 rounded-full bg-stone-950" />
              </div>
            </div>
          </div>
        </div>

        {/* Track Title & Play Indicator (Hidden on mobile < sm to keep top bar compact & comfortable) */}
        <div className="hidden sm:flex flex-col min-w-0 pr-1 max-w-[120px] sm:max-w-[160px]">
          <div className="flex items-center gap-1">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPlaying
                  ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse'
                  : 'bg-stone-600'
              }`}
            />
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              {isPlaying ? 'BGM PLAYING' : 'BGM PAUSED'}
            </span>
          </div>
          <span className="text-xs font-bold text-stone-200 truncate leading-tight tracking-tight">
            {trackName}
          </span>
        </div>

        {/* Quick Track Switcher Dropdown Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            sound.playClick();
            setShowTrackMenu(!showTrackMenu);
          }}
          className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-amber-300 transition-colors cursor-pointer"
          title="切換曲目或載入本機 MP3"
        >
          <Music className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu */}
        {showTrackMenu && (
          <div
            className="absolute top-full right-0 mt-2 w-56 p-2 rounded-xl bg-[#10131d] border border-amber-500/40 shadow-2xl z-50 animate-in zoom-in-95 space-y-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-mono text-stone-400 uppercase border-b border-stone-800 flex items-center justify-between">
              <span>黑膠音源選擇</span>
              <span className="text-amber-400">Web Audio / MP3</span>
            </div>

            {PRESET_SYNTH_TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTrack(t.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  trackId === t.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="truncate">{t.name}</div>
                  <div className="text-[10px] text-stone-400 font-normal truncate">{t.description}</div>
                </div>
                {trackId === t.id && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
              </button>
            ))}

            <div className="pt-1 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer border border-dashed border-amber-500/40"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>📁 載入本機 MP3 音樂檔...</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full / Header Version
  return (
    <div
      ref={containerRef}
      id="vinyl-bgm-player"
      onMouseEnter={(e) => e.stopPropagation()}
      onMouseLeave={(e) => e.stopPropagation()}
      className="relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-stone-950 via-[#10131e] to-stone-950 border border-amber-500/30 hover:border-amber-400/60 shadow-lg select-none transition-all"
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/*"
        className="hidden"
        onChange={handleCustomFileChange}
      />

      {/* Turntable Disc & Tonearm */}
      <div
        className="relative w-8 h-8 shrink-0 flex items-center justify-center cursor-pointer group"
        onClick={handleTogglePlay}
        title={isPlaying ? '點擊暫停背景音樂' : '點擊播放背景音樂'}
      >
        {/* Tonearm */}
        <div
          className={`absolute -top-1 -right-1 w-3.5 h-5 origin-top-right transition-transform duration-500 z-10 pointer-events-none ${
            isPlaying ? 'rotate-[26deg]' : 'rotate-0 opacity-40'
          }`}
        >
          <div className="w-[1.5px] h-3.5 bg-amber-300 shadow-xs ml-auto" />
          <div className="w-1.5 h-1 bg-amber-400 rounded-full ml-auto" />
        </div>

        {/* Spinning Vinyl */}
        <div
          className={`w-8 h-8 rounded-full bg-stone-950 border border-stone-700 shadow-md flex items-center justify-center group-hover:scale-105 transition-transform ${
            isPlaying ? 'animate-[spin_4.5s_linear_infinite]' : ''
          }`}
          style={{
            boxShadow: isPlaying ? '0 0 12px rgba(245,158,11,0.45)' : 'none',
          }}
        >
          <div className="w-6 h-6 rounded-full border border-stone-800 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xs">
              <div className="w-1 h-1 rounded-full bg-stone-950" />
            </div>
          </div>
        </div>
      </div>

      {/* Track Info & Toggle - hidden on xs to save space, visible on sm and up */}
      <div
        className="hidden sm:flex flex-col min-w-0 max-w-[100px] md:max-w-[150px] cursor-pointer"
        onClick={handleTogglePlay}
      >
        <div className="flex items-center gap-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPlaying
                ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse'
                : 'bg-stone-600'
            }`}
          />
          <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold">
            {isPlaying ? 'VINYL BGM' : 'PAUSED'}
          </span>
        </div>
        <span className="text-xs font-bold text-stone-200 truncate leading-tight tracking-tight">
          {trackName}
        </span>
      </div>

      {/* Play/Pause Button */}
      <button
        id="btn-vinyl-toggle-play"
        type="button"
        onClick={handleTogglePlay}
        className={`p-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer active:scale-95 ${
          isPlaying
            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
            : 'bg-stone-800 text-stone-400 hover:text-white'
        }`}
        title={isPlaying ? '暫停' : '播放'}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* Track Menu Button */}
      <div className="relative">
        <button
          id="btn-vinyl-track-menu"
          type="button"
          onClick={() => {
            sound.playClick();
            setShowTrackMenu(!showTrackMenu);
          }}
          className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors cursor-pointer"
          title="切換曲目或載入 MP3"
        >
          <Music className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu */}
        {showTrackMenu && (
          <div
            className="absolute top-full right-0 mt-2 w-60 p-2 rounded-xl bg-[#0e111a] border border-amber-500/40 shadow-2xl z-50 animate-in zoom-in-95 space-y-1 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[10px] font-mono text-stone-400 uppercase border-b border-stone-800 flex items-center justify-between">
              <span>黑膠音源設定</span>
              <span className="text-amber-400">Synth / Local MP3</span>
            </div>

            {PRESET_SYNTH_TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTrack(t.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  trackId === t.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="truncate mr-2">
                  <div className="truncate">{t.name}</div>
                  <div className="text-[10px] text-stone-400 font-normal truncate">{t.description}</div>
                </div>
                {trackId === t.id && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
              </button>
            ))}

            <div className="pt-1.5 border-t border-stone-800">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer border border-dashed border-amber-500/40"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>📁 載入本機 MP3 音樂檔...</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
