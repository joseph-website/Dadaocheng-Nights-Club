import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  Disc,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { bgmEngine } from '../../utils/bgmEngine';
import { sound } from '../../utils/audio';
import { getLobbyActiveNPCs } from '../../utils/inventory';
import { motion, AnimatePresence } from 'motion/react';

interface TickerItem {
  id: string;
  tag: string;
  text: string;
  color: string;
  tagBg?: string;
  isNpcWanted?: boolean;
}

const BASE_SYSTEM_TICKERS: TickerItem[] = [
  { id: 't-club', text: '🍸 大稻賭埕之夜：雨夜微醺爵士與頂級高額百家博弈', tag: '賭埕', color: 'text-amber-300' },
  { id: 't-pawn', text: '💎 黑市情報：【至尊純金籌碼】可於地下當鋪以高達 $100,000 典當折現', tag: '黑市', color: 'text-yellow-300' },
  { id: 't-roulette', text: '👑 幸運頭條：某貴賓於【歐式輪盤】直注 35:1 贏得單局 $360,000 巨獎！', tag: '頭條', color: 'text-amber-400' },
  { id: 't-slot', text: '🍒 機台快訊：【夜行拉霸機】黃金 777 累積彩池正處於高爆發週期', tag: '拉霸', color: 'text-rose-300' },
  { id: 't-claw', text: '🕹️ 夾機傳聞：抓力極限挑戰，抓中兌換券可至大廳櫃台直接兌換等值籌碼', tag: '夾機', color: 'text-cyan-300' },
  { id: 't-siba', text: '🎲 廟口十八仔：擲出「一色豹子」可獲 4 倍全額通殺賠率', tag: '骰子', color: 'text-emerald-300' },
  { id: 't-blackjack', text: '♠️ 21點牌桌：支援分牌、雙倍下注與 3:2 天牌 Blackjack', tag: '牌桌', color: 'text-blue-300' },
  { id: 't-sys', text: '🛡️ 本地安全協議：離線全自動存檔，隨時隨地安全暢玩', tag: '系統', color: 'text-stone-300' },
];

export const MinimalistTicker: React.FC = () => {
  const [bgmName, setBgmName] = useState<string>(bgmEngine.getCurrentTrackName());
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(bgmEngine.getIsPlaying());
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('casino_ticker_collapsed') === 'true';
  });

  const [npcTickerVersion, setNpcTickerVersion] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down'>('up');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to BGM status updates
  useEffect(() => {
    const unsub = bgmEngine.subscribe(() => {
      setBgmName(bgmEngine.getCurrentTrackName());
      setIsBgmPlaying(bgmEngine.getIsPlaying());
    });
    return unsub;
  }, []);

  // Listen to inventory / NPC refresh events
  useEffect(() => {
    const handleInventoryChange = () => {
      setNpcTickerVersion((v) => v + 1);
    };
    window.addEventListener('casino_inventory_changed', handleInventoryChange);
    return () => {
      window.removeEventListener('casino_inventory_changed', handleInventoryChange);
    };
  }, []);

  // Periodically refresh active NPC intel every 15s
  useEffect(() => {
    const npcTimer = setInterval(() => {
      setNpcTickerVersion((v) => v + 1);
    }, 15000);
    return () => clearInterval(npcTimer);
  }, []);

  // Dynamically assemble ticker items: Real-time NPC Black Market Buyout Intel + System Tips
  const allTickerItems = useMemo<TickerItem[]>(() => {
    try {
      const activeNpcs = getLobbyActiveNPCs();
      const npcItems: TickerItem[] = [];

      for (const npc of activeNpcs) {
        if (npc.targetCollectibleId && npc.wantedDialogue) {
          const multText = `${npc.targetMultiplier || 3.0}X`;
          npcItems.push({
            id: `npc-${npc.id}-wanted`,
            tag: `${npc.name}`,
            text: `${npc.avatar} ${npc.wantedDialogue.replace(/^[「]/, '').replace(/[」]$/, '')}`,
            color: 'text-amber-300 font-bold',
            tagBg: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-300 border-amber-500/50',
            isNpcWanted: true,
          });
        } else if (npc.forSaleItem) {
          npcItems.push({
            id: `npc-${npc.id}-sale`,
            tag: `${npc.name}現貨`,
            text: `${npc.avatar} 私人黑市現貨：【${npc.forSaleItem.collectible.name}】正在熱賣中`,
            color: 'text-yellow-300',
            tagBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
            isNpcWanted: true,
          });
        }
      }

      // Interleave or combine: NPC intel first, followed by system tips
      if (npcItems.length > 0) {
        return [...npcItems, ...BASE_SYSTEM_TICKERS];
      }
    } catch {
      // ignore
    }
    return BASE_SYSTEM_TICKERS;
  }, [npcTickerVersion]);

  // Safe index bounds
  const safeIndex = currentIndex % allTickerItems.length;
  const currentItem = allTickerItems[safeIndex] || allTickerItems[0];

  // 4.5-second ultra-smooth auto-advance timer
  useEffect(() => {
    if (isCollapsed || isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSlideDirection('up');
      setCurrentIndex((prev) => (prev + 1) % allTickerItems.length);
    }, 4500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCollapsed, isPaused, allTickerItems.length]);

  const toggleCollapse = () => {
    sound.playClick();
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('casino_ticker_collapsed', next.toString());
      return next;
    });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setSlideDirection('up');
    setCurrentIndex((prev) => (prev + 1) % allTickerItems.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setSlideDirection('down');
    setCurrentIndex((prev) => (prev - 1 + allTickerItems.length) % allTickerItems.length);
  };

  // When collapsed: show clean floating pill on bottom right + subtle bottom click bar
  if (isCollapsed) {
    return (
      <>
        <div
          id="ticker-collapsed-bottom-bar"
          onClick={toggleCollapse}
          className="hidden sm:block h-[4px] hover:h-[8px] shrink-0 bg-stone-950/90 border-t border-amber-500/30 cursor-pointer transition-all duration-200 z-20 group relative overflow-hidden"
          title="點擊展開即時情報跑馬燈"
        >
          <div className="absolute inset-x-0 top-0 h-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>

        <button
          id="btn-expand-ticker-floating"
          onClick={toggleCollapse}
          className="hidden sm:flex fixed bottom-2.5 right-3 sm:bottom-3 sm:right-4 z-30 items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d101a]/95 hover:bg-[#151928] border border-amber-500/50 hover:border-amber-400 text-amber-300 shadow-[0_4px_20px_rgba(0,0,0,0.8),0_0_10px_rgba(245,158,11,0.3)] backdrop-blur-md cursor-pointer transition-all transform hover:scale-105 active:scale-95 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200"
          title="點擊展開即時動態情報列"
        >
          <TrendingUp className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px] tracking-wide">動態情報</span>
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300">
            <ChevronUp className="w-3 h-3" />
          </span>
        </button>
      </>
    );
  }

  return (
    <footer
      id="minimalist-bottom-ticker"
      className="hidden sm:flex h-[30px] shrink-0 border-t border-amber-500/20 bg-[#06080e]/95 backdrop-blur-md px-3 items-center justify-between gap-3 text-[11px] text-stone-400 select-none overflow-hidden z-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Left: Dynamic Intel Slide with Ultra-Smooth Motion */}
      <div className="flex-1 flex items-center gap-2 overflow-hidden min-w-0">
        {/* Ticker Tag Badge (No 1/8 clutter) */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-[10px] font-black shrink-0 shadow-xs">
          <TrendingUp className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
          <span className="hidden sm:inline">即時情報</span>
        </div>

        {/* Ultra-Smooth Motion Carousel with Slide & Spring easing */}
        <div className="flex-1 overflow-hidden relative h-[24px] flex items-center min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${safeIndex}-${currentItem.id}`}
              initial={{
                opacity: 0,
                y: slideDirection === 'up' ? 14 : -14,
                scale: 0.98,
                filter: 'blur(3px)',
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: 'blur(0px)',
                transition: {
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1], // Springy cubic-bezier
                },
              }}
              exit={{
                opacity: 0,
                y: slideDirection === 'up' ? -14 : 14,
                scale: 0.98,
                filter: 'blur(3px)',
                transition: {
                  duration: 0.35,
                  ease: [0.7, 0, 0.84, 0],
                },
              }}
              className="flex items-center gap-2 text-[11px] sm:text-xs truncate font-medium tracking-wide text-stone-200"
            >
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${
                  currentItem.tagBg ||
                  'bg-stone-800/90 text-amber-400 border-stone-700/60'
                }`}
              >
                {currentItem.tag}
              </span>
              <span className={`truncate ${currentItem.color}`}>
                {currentItem.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick Stepper Arrows (Previous / Next) */}
        <div className="hidden md:flex items-center gap-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
          <button
            onClick={handlePrev}
            className="p-0.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300 cursor-pointer transition-colors"
            title="上一條情報"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={handleNext}
            className="p-0.5 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-300 cursor-pointer transition-colors"
            title="下一條情報"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right: Playing Track Status & Collapse Button */}
      <div className="shrink-0 flex items-center gap-2 font-mono text-[10px]">
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${
            isBgmPlaying
              ? 'bg-amber-950/50 border-amber-500/40 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
              : 'bg-stone-900 border-stone-800 text-stone-500'
          }`}
        >
          <Disc
            className={`w-3 h-3 ${
              isBgmPlaying ? 'text-amber-400 animate-[spin_4s_linear_infinite]' : 'text-stone-500'
            }`}
          />
          <span className="max-w-[130px] truncate">{bgmName}</span>
        </div>

        {/* Minimize Button */}
        <button
          id="btn-collapse-ticker"
          onClick={toggleCollapse}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
          title="收合情報列 (可隨時從右下角快速展開)"
        >
          <span className="hidden lg:inline text-[9px]">收合</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </footer>
  );
};
