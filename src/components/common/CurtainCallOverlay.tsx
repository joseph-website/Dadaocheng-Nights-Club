import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { sound } from '../../utils/audio';

interface CurtainCallOverlayProps {
  isClosing: boolean;
  onCurtainsClosed?: () => void;
  isOpening?: boolean;
}

export const CurtainCallOverlay: React.FC<CurtainCallOverlayProps> = ({
  isClosing,
  onCurtainsClosed,
  isOpening = false,
}) => {
  const [showEmblem, setShowEmblem] = useState(false);

  useEffect(() => {
    if (isClosing) {
      sound.playLoss();
      setShowEmblem(false);

      // Show center theatrical emblem once curtains meet
      const timerEmblem = setTimeout(() => {
        setShowEmblem(true);
      }, 2200);

      // Trigger career settlement modal after full dramatic curtain call
      const timerClosed = setTimeout(() => {
        if (onCurtainsClosed) {
          onCurtainsClosed();
        }
      }, 4000);

      return () => {
        clearTimeout(timerEmblem);
        clearTimeout(timerClosed);
      };
    } else {
      setShowEmblem(false);
    }
  }, [isClosing, onCurtainsClosed]);

  const isActive = isClosing || isOpening;

  return (
    <AnimatePresence>
      {isActive && (
        <div
          id="theatrical-curtain-container"
          className="fixed inset-0 z-[45] pointer-events-auto select-none overflow-hidden"
        >
          {/* Background Ambient Dark Dimmer */}
          <motion.div
            key="curtain-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xs"
          />

          {/* 1. LEFT VELVET CURTAIN (左右對開 / 合攏紅絲絨金邊大幕) */}
          <motion.div
            key="left-curtain"
            initial={isOpening ? { x: '0%' } : { x: '-100%' }}
            animate={isClosing ? { x: '0%' } : { x: '-100%' }}
            exit={{ x: '-100%' }}
            transition={{
              duration: 2.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute top-0 bottom-0 left-0 w-1/2 z-10"
            style={{
              background:
                'repeating-linear-gradient(90deg, #250205 0px, #58080f 30px, #7f121b 60px, #250205 90px, #120103 120px)',
              boxShadow: 'inset -25px 0 60px rgba(0, 0, 0, 0.95), 15px 0 40px rgba(0, 0, 0, 0.98)',
            }}
          >
            {/* Fabric Fold Depth Highlights */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/75 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

            {/* Golden Bottom Fringe / Tassels */}
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-r from-amber-500 via-yellow-200 to-amber-600 border-t border-amber-300 shadow-[0_-2px_12px_rgba(245,158,11,0.6)] flex items-center justify-around opacity-90">
              <div className="w-full h-full bg-[repeating-linear-gradient(90deg,#b45309_0px,#fde047_6px,#78350f_12px)] opacity-80" />
            </div>

            {/* Center Edge Gold Trim */}
            <div className="absolute top-0 bottom-0 right-0 w-3 bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 border-l border-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.9)]" />
          </motion.div>

          {/* 2. RIGHT VELVET CURTAIN */}
          <motion.div
            key="right-curtain"
            initial={isOpening ? { x: '0%' } : { x: '100%' }}
            animate={isClosing ? { x: '0%' } : { x: '100%' }}
            exit={{ x: '100%' }}
            transition={{
              duration: 2.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute top-0 bottom-0 right-0 w-1/2 z-10"
            style={{
              background:
                'repeating-linear-gradient(90deg, #120103 0px, #250205 30px, #7f121b 60px, #58080f 90px, #250205 120px)',
              boxShadow: 'inset 25px 0 60px rgba(0, 0, 0, 0.95), -15px 0 40px rgba(0, 0, 0, 0.98)',
            }}
          >
            {/* Fabric Fold Depth Highlights */}
            <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-transparent to-black/75 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none" />

            {/* Golden Bottom Fringe / Tassels */}
            <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-r from-amber-600 via-yellow-200 to-amber-500 border-t border-amber-300 shadow-[0_-2px_12px_rgba(245,158,11,0.6)] flex items-center justify-around opacity-90">
              <div className="w-full h-full bg-[repeating-linear-gradient(90deg,#78350f_0px,#fde047_6px,#b45309_12px)] opacity-80" />
            </div>

            {/* Center Edge Gold Trim */}
            <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 border-r border-yellow-200 shadow-[0_0_20px_rgba(245,158,11,0.9)]" />
          </motion.div>

          {/* 3. TOP THEATRE VALANCE (PELMET DRAPERY) */}
          <motion.div
            key="top-pelmet"
            initial={isOpening ? { y: '0%' } : { y: '-100%' }}
            animate={isClosing ? { y: '0%' } : { y: '-100%' }}
            exit={{ y: '-100%' }}
            transition={{
              duration: 1.0,
              ease: 'easeOut',
            }}
            className="absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b from-[#1c0205] via-[#45070e] to-[#250205] border-b-2 border-amber-400 shadow-[0_15px_35px_rgba(0,0,0,0.95)] z-20 flex items-center justify-center"
          >
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600" />
            <div className="flex items-center gap-3 px-6 py-1.5 rounded-full bg-black/60 border border-amber-400/50 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-serif font-black text-amber-200 tracking-widest text-xs sm:text-sm uppercase drop-shadow">
                THE NOCTURNAL CLUB &bull; CURTAIN CALL
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </div>
          </motion.div>

          {/* 4. CENTER THEATRICAL EMBLEM (Smoothly floats in after curtains meet) */}
          <AnimatePresence>
            {isClosing && showEmblem && (
              <motion.div
                key="center-emblem"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 text-center pointer-events-none"
              >
                {/* Spotlight Glow */}
                <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-500/20 blur-3xl absolute pointer-events-none animate-pulse" />

                <div className="relative px-6 py-5 rounded-3xl bg-[#090b10]/95 border-2 border-amber-400/80 shadow-[0_0_60px_rgba(0,0,0,0.98),0_0_35px_rgba(245,158,11,0.4)] backdrop-blur-md max-w-md w-full flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-red-900 p-0.5 shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-center">
                    <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-3xl">
                      🎭
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase font-mono tracking-widest">
                      STAGE FINALE &bull; 終場閉幕
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-amber-200 tracking-wider">
                      大稻賭埕之夜 &bull; 幕落時刻
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed pt-1">
                      喧囂漸歇，燈火微暗。閣下於這場長夜中的每一筆博弈與榮耀，俱已載入賭埕名冊...
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-[11px] text-amber-400 font-mono font-bold animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>正在匯整賭王生涯結算報告...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
};

