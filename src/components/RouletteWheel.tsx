import React, { useEffect, useRef, useState, useMemo } from 'react';
import { WHEEL_NUMBERS, getNumberColor } from '../utils/constants';
import { sound } from '../utils/audio';
import { isTurboMode } from '../utils/turbo';

interface RouletteWheelProps {
  isSpinning: boolean;
  targetNumber: number | null;
  onSpinComplete: () => void;
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  isSpinning,
  targetNumber,
  onSpinComplete,
}) => {
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [ballRadius, setBallRadius] = useState(143);
  const [highlightNumber, setHighlightNumber] = useState<number | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [ballFinalAngle, setBallFinalAngle] = useState<number | null>(null);

  const prevWheelRotationRef = useRef(0);
  const prevBallRotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const spinStartTimeRef = useRef<number | null>(null);
  const isSpinningRef = useRef(false);
  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlices = WHEEL_NUMBERS.length; // 37
  const sliceAngle = 360 / totalSlices;

  // Polar to Cartesian conversion helper for SVG: 0 deg = Top (12 o'clock), 90 deg = Right (3 o'clock)
  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.sin(angleInRadians),
      y: centerY - radius * Math.cos(angleInRadians),
    };
  };

  const describeArc = (
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    startAngle: number,
    endAngle: number
  ) => {
    const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
    const endOuter = polarToCartesian(x, y, outerRadius, endAngle);
    const startInner = polarToCartesian(x, y, innerRadius, startAngle);
    const endInner = polarToCartesian(x, y, innerRadius, endAngle);

    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M',
      startOuter.x,
      startOuter.y,
      'A',
      outerRadius,
      outerRadius,
      0,
      arcSweep,
      1,
      endOuter.x,
      endOuter.y,
      'L',
      endInner.x,
      endInner.y,
      'A',
      innerRadius,
      innerRadius,
      0,
      arcSweep,
      0,
      startInner.x,
      startInner.y,
      'Z',
    ].join(' ');
  };

  // Build slices data for SVG (0 deg = Top)
  const slices = useMemo(() => {
    return WHEEL_NUMBERS.map((num, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = (index + 1) * sliceAngle;
      const colorType = getNumberColor(num);

      let fillColor = '#121212';
      let strokeColor = '#2a2a2a';
      let textColor = '#ffffff';

      if (colorType === 'green') {
        fillColor = '#059669'; // Emerald
        strokeColor = '#34d399';
        textColor = '#ecfdf5';
      } else if (colorType === 'red') {
        fillColor = '#dc2626'; // Crimson
        strokeColor = '#f87171';
        textColor = '#fef2f2';
      } else {
        fillColor = '#18181b'; // Dark Obsidian
        strokeColor = '#3f3f46';
        textColor = '#f4f4f5';
      }

      return {
        num,
        index,
        startAngle,
        endAngle,
        centerAngle: startAngle + sliceAngle / 2,
        colorType,
        fillColor,
        strokeColor,
        textColor,
      };
    });
  }, [sliceAngle]);

  useEffect(() => {
    // If not spinning, clean up any animation frame or timers and reset state
    if (!isSpinning || targetNumber === null) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      isSpinningRef.current = false;
      return;
    }

    // Prevent duplicate spin loop if already actively animating
    if (isSpinningRef.current) {
      return;
    }

    isSpinningRef.current = true;
    setHighlightNumber(null);
    setBallFinalAngle(null);
    setCameraZoom(1);
    sound.playSpinStart();

    // Find target index in wheel
    const rawTargetIndex = WHEEL_NUMBERS.indexOf(targetNumber);
    const targetIndex = rawTargetIndex >= 0 ? rawTargetIndex : 0;
    const pocketCenterInWheel = (targetIndex + 0.5) * sliceAngle;

    // 1. Pick a random resting angle for the ball (0 to 360 deg)
    const randomStopAngle = Math.random() * 360;
    setBallFinalAngle(randomStopAngle);

    // 2. Compute Wheel Rotation:
    // (pocketCenterInWheel + targetWheelAngle) % 360 === randomStopAngle
    const desiredWheelNominal = ((randomStopAngle - pocketCenterInWheel) % 360 + 360) % 360;
    const currentWheelMod = ((prevWheelRotationRef.current % 360) + 360) % 360;
    let extraWheel = desiredWheelNominal - currentWheelMod;
    if (extraWheel <= 0) {
      extraWheel += 360;
    }
    const wheelBaseRotations = 360 * 5; // 5 full revolutions
    const targetWheelAngle = prevWheelRotationRef.current + wheelBaseRotations + extraWheel;
    const startWheelRotation = prevWheelRotationRef.current;
    const wheelDelta = targetWheelAngle - startWheelRotation;

    // 3. Compute Ball Rotation (counter-clockwise / negative angle direction):
    const startBallRotation = prevBallRotationRef.current;
    const desiredBallNominal = ((randomStopAngle % 360) + 360) % 360;
    const currentBallMod = ((startBallRotation % 360) + 360) % 360;
    let extraBall = currentBallMod - desiredBallNominal;
    if (extraBall <= 0) {
      extraBall += 360;
    }
    const ballBaseRevolutions = 360 * 8; // 8 full revolutions
    const targetBallAngle = startBallRotation - (ballBaseRevolutions + extraBall);
    const ballTotalDelta = targetBallAngle - startBallRotation;

    const duration = isTurboMode() ? 1200 : 4200; // Turbo mode: 1.2s rapid spin; Standard: 4.2s realistic ball roll
    spinStartTimeRef.current = performance.now();

    let lastTickTime = 0;

    // Complete / settle helper
    const finalizeSpin = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      prevWheelRotationRef.current = targetWheelAngle;
      prevBallRotationRef.current = targetBallAngle;
      setWheelRotation(targetWheelAngle);
      setBallRotation(targetBallAngle);
      setBallRadius(114);
      setHighlightNumber(targetNumber);
      setCameraZoom(1.05);
      isSpinningRef.current = false;
      sound.playTick(1600);

      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      settleTimerRef.current = setTimeout(() => {
        setCameraZoom(1);
        onSpinCompleteRef.current?.();
      }, 400);
    };

    // Watchdog fallback timer to guarantee spin never gets stuck
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      if (isSpinningRef.current) {
        finalizeSpin();
      }
    }, duration + 1200);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - (spinStartTimeRef.current || currentTime);
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);

      // 1. Wheel Deceleration (Smooth cubic ease-out)
      const wheelEaseOut = 1 - Math.pow(1 - progress, 3.0);
      const currentWheel = startWheelRotation + wheelDelta * wheelEaseOut;
      setWheelRotation(currentWheel);

      // 2. Exact angular position of target pocket at current wheel rotation
      const currentPocketWorldAngle = targetBallAngle + (currentWheel - targetWheelAngle);

      // 3. Multi-phase physical ball trajectory:
      let calculatedRadius = 143;
      let calculatedBallAngle = 0;

      if (progress < 0.50) {
        // Phase 1: High-speed outer ball track roll
        const p1 = progress / 0.50;
        const p1Ease = 1 - Math.pow(1 - p1, 1.5);
        calculatedBallAngle = startBallRotation + (ballTotalDelta * 0.65) * p1Ease;
        calculatedRadius = 143 + Math.sin(progress * 36) * 0.4;
        setCameraZoom(1);
      } else if (progress < 0.76) {
        // Phase 2: Deceleration & descending down conical slope toward the wheel rotor
        const p2 = (progress - 0.50) / 0.26;
        const s2 = 3 * p2 * p2 - 2 * p2 * p2 * p2; // smoothstep descent
        const p2Ease = 1 - Math.pow(1 - p2, 2.0);

        // Smooth transition from 65% total turns to exact pocket angle at p2 = 1
        const remainingTurnOffset = ballTotalDelta * 0.35 * (1 - p2Ease);
        calculatedBallAngle = currentPocketWorldAngle + remainingTurnOffset;

        const radialBounce = Math.sin(p2 * Math.PI * 3) * (1 - p2) * 2;
        calculatedRadius = 143 - 29 * s2 + radialBounce;

        const zoomAlpha = Math.max(0, (progress - 0.65) / 0.11);
        setCameraZoom(1 + zoomAlpha * 0.08);
      } else {
        // Phase 3: Settling into target pocket petal without sharp hitch or phase jump
        const p3 = (progress - 0.76) / 0.24;
        const hopDamp = Math.pow(1 - p3, 2.2);

        // Sinusoidal bounce: at p3=0 hopAngleOffset is 0, at p3=1 hopAngleOffset is 0
        const hopAngleOffset = Math.sin(p3 * Math.PI * 3) * sliceAngle * 0.35 * hopDamp;
        const hopRadial = Math.abs(Math.sin(p3 * Math.PI * 3)) * 3.5 * hopDamp;

        calculatedBallAngle = currentPocketWorldAngle + hopAngleOffset;
        calculatedRadius = 114 + hopRadial;
        setCameraZoom(1.08);
      }

      setBallRotation(calculatedBallAngle);
      setBallRadius(calculatedRadius);

      // Dynamic audio ticks
      let tickInterval = 50;
      if (progress < 0.50) {
        tickInterval = 45 + progress * 140;
      } else if (progress < 0.76) {
        tickInterval = 80 + (progress - 0.50) * 320;
      } else if (progress < 0.94) {
        tickInterval = 90;
      } else {
        tickInterval = 170;
      }

      if (currentTime - lastTickTime > tickInterval && progress < 0.96) {
        const pitch =
          progress < 0.50
            ? 1150 + (1 - progress) * 600
            : progress < 0.76
            ? 950 + Math.random() * 300
            : 800 + Math.random() * 250;
        sound.playTick(pitch);
        lastTickTime = currentTime;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        finalizeSpin();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      // Component unmount cleanup
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [isSpinning, targetNumber, sliceAngle]);

  return (
    <div className="relative flex flex-col items-center justify-center p-1 sm:p-2 select-none w-full">
      {/* Outer Neon Glow Ring Frame with Dynamic Dramatic Camera Zoom */}
      <div
        className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] lg:w-[360px] lg:h-[360px] xl:w-[390px] xl:h-[390px] rounded-full p-2 bg-radial from-stone-900 via-neutral-950 to-black border-2 border-amber-500/40 shadow-[0_0_35px_rgba(245,158,11,0.25)] flex items-center justify-center shrink-0 transition-transform duration-300 ease-out"
        style={{
          transform: `scale(${cameraZoom})`,
          boxShadow: isSpinning
            ? '0 0 45px rgba(245, 158, 11, 0.4), inset 0 0 25px rgba(0,0,0,0.8)'
            : '0 0 35px rgba(245, 158, 11, 0.25)',
        }}
      >
        {/* Dynamic Ball Landing Laser Target Reticle (Follows the ball landing spot!) */}
        {highlightNumber !== null && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-300"
            style={{
              transform: `rotate(${ballRotation}deg)`,
            }}
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                transform: `translateY(-114px)`,
              }}
            >
              {/* Pulsing Target Ring */}
              <div className="w-8 h-8 rounded-full border-2 border-amber-400/90 shadow-[0_0_15px_#fde047] animate-ping opacity-60" />
              <div className="absolute w-7 h-7 rounded-full border border-yellow-300/80 shadow-[0_0_8px_#f59e0b]" />
            </div>
          </div>
        )}

        {/* Outer Wooden Rim Effect */}
        <div className="absolute inset-1 rounded-full border-[5px] border-[#2b1810] shadow-inner"></div>
        <div className="absolute inset-2.5 rounded-full border border-amber-500/30"></div>

        {/* SVG Wheel (No transition-transform so rAF handles frame updates instantly without jitter) */}
        <div className="relative w-full h-full flex items-center justify-center">
          <svg
            viewBox="-160 -160 320 320"
            className="w-full h-full"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              willChange: 'transform',
            }}
          >
            <defs>
              {/* Gold gradient for turret */}
              <radialGradient id="goldTurret" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#eab308" />
                <stop offset="80%" stopColor="#854d0e" />
                <stop offset="100%" stopColor="#422006" />
              </radialGradient>

              {/* Pocket metallic separator gradient */}
              <linearGradient id="pocketSeparator" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e5e7eb" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#4b5563" />
              </linearGradient>
            </defs>

            {/* Slices */}
            {slices.map((slice) => {
              const pathData = describeArc(0, 0, 78, 146, slice.startAngle, slice.endAngle);
              const isTargetWinner = highlightNumber === slice.num;
              const textPos = polarToCartesian(0, 0, 114, slice.centerAngle);
              const textAngle = slice.centerAngle;

              return (
                <g key={`slice-${slice.num}-${slice.index}`}>
                  <path
                    d={pathData}
                    fill={slice.fillColor}
                    stroke={isTargetWinner ? '#fef08a' : '#27272a'}
                    strokeWidth={isTargetWinner ? '2' : '0.75'}
                    className="transition-colors duration-300"
                    style={{
                      filter: isTargetWinner
                        ? 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.9))'
                        : undefined,
                    }}
                  />
                  {/* Number text */}
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    fill={isTargetWinner ? '#ffffff' : slice.textColor}
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="central"
                    transform={`rotate(${textAngle}, ${textPos.x}, ${textPos.y})`}
                    style={{
                      textShadow: isTargetWinner ? '0 0 8px rgba(255,255,255,1)' : '0 1px 2px #000',
                    }}
                  >
                    {slice.num}
                  </text>
                </g>
              );
            })}

            {/* Inner separators & frets */}
            <circle cx="0" cy="0" r="147" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="78" fill="none" stroke="#ca8a04" strokeWidth="2" />
            <circle cx="0" cy="0" r="74" fill="#09090b" stroke="#713f12" strokeWidth="1" />

            {/* 8 Casino Diamond Deflectors (Fret Pins on the Cone Track) */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((ang) => {
              const defPos = polarToCartesian(0, 0, 138, ang);
              return (
                <polygon
                  key={`diamond-deflector-${ang}`}
                  points={`
                    ${defPos.x},${defPos.y - 3.5} 
                    ${defPos.x + 2.2},${defPos.y} 
                    ${defPos.x},${defPos.y + 3.5} 
                    ${defPos.x - 2.2},${defPos.y}
                  `}
                  fill="#fef08a"
                  stroke="#854d0e"
                  strokeWidth="0.6"
                  style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                />
              );
            })}

            {/* Central 8-spoke Golden Turret */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={`spoke-${angle}`}
                x1="0"
                y1="0"
                x2={Math.sin((angle * Math.PI) / 180) * 60}
                y2={-Math.cos((angle * Math.PI) / 180) * 60}
                stroke="#ca8a04"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}

            {/* Turret Center Dome */}
            <circle cx="0" cy="0" r="28" fill="url(#goldTurret)" stroke="#713f12" strokeWidth="2" />
            <circle cx="0" cy="0" r="12" fill="#fef08a" opacity="0.6" />
            <circle cx="0" cy="0" r="6" fill="#ca8a04" />
          </svg>

          {/* Realistic 3D Ivory Ball with Motion Physics */}
          <div
            className="absolute pointer-events-none"
            style={{
              transform: `rotate(${ballRotation}deg)`,
              willChange: 'transform',
            }}
          >
            {/* Outer Drop Shadow on Bowl */}
            <div
              className="relative"
              style={{
                transform: `translateY(-${ballRadius}px)`,
                willChange: 'transform',
              }}
            >
              {/* Ball Ambient Shadow */}
              <div className="absolute top-1 left-0.5 w-4 h-4 rounded-full bg-black/60 blur-[1.5px] pointer-events-none" />

              {/* Ivory Ceramic Ball Body */}
              <div className="relative w-4 h-4 rounded-full bg-gradient-to-tr from-[#d4d4d8] via-[#ffffff] to-[#fafafa] border border-stone-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.9),inset_0_-2px_4px_rgba(100,100,100,0.5),inset_0_2px_4px_rgba(255,255,255,1)] flex items-center justify-center">
                {/* Specular White Highlight Dot */}
                <div className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white blur-[0.2px] rotate-[-25deg]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Result Banner Under Wheel */}
      <div className="mt-3 h-9 flex items-center justify-center">
        {highlightNumber !== null ? (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-bounce">
            <span className="text-xs text-stone-400 font-medium">開出號碼:</span>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${
                getNumberColor(highlightNumber) === 'green'
                  ? 'bg-emerald-600 ring-2 ring-emerald-400'
                  : getNumberColor(highlightNumber) === 'red'
                  ? 'bg-rose-600 ring-2 ring-rose-400'
                  : 'bg-zinc-800 ring-2 ring-zinc-500'
              }`}
            >
              {highlightNumber}
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase">
              {getNumberColor(highlightNumber) === 'green'
                ? '綠色 (ZERO)'
                : getNumberColor(highlightNumber) === 'red'
                ? '紅色 (RED)'
                : '黑色 (BLACK)'}
            </span>
          </div>
        ) : isSpinning ? (
          <div className="text-xs text-amber-400/90 font-medium flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            輪盤飛速旋轉中...
          </div>
        ) : (
          <div className="text-xs text-stone-500 font-medium">請在下方下注區放置籌碼後點擊旋轉</div>
        )}
      </div>
    </div>
  );
};
