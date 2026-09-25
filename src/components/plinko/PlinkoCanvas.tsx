import React, { useEffect, useRef, useCallback } from 'react';
import { PlinkoBall, PLINKO_MULTIPLIERS, PLINKO_ROWS, PLINKO_SLOTS_COUNT } from '../../types/plinko';
import { sound } from '../../utils/audio';
import { isTurboMode } from '../../utils/turbo';

interface PlinkoCanvasProps {
  balls: PlinkoBall[];
  onBallLanded: (ball: PlinkoBall, slotIndex: number) => void;
  activeSlotHighlight: number | null;
}

interface Peg {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  radius: number;
  lastHit: number;
}

interface SlotBound {
  index: number;
  multiplier: number;
  left: number;
  right: number;
  center: number;
  width: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

export const PlinkoCanvas: React.FC<PlinkoCanvasProps> = ({
  balls,
  onBallLanded,
  activeSlotHighlight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const pegsRef = useRef<Peg[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const activeBallsRef = useRef<PlinkoBall[]>([]);
  const slotBoundsRef = useRef<SlotBound[]>([]);
  const dimensionsRef = useRef<{
    width: number;
    height: number;
    pegSpacing: number;
    topY: number;
    slotTopY: number;
    slotFloorY: number;
  }>({
    width: 600,
    height: 520,
    pegSpacing: 45,
    topY: 40,
    slotTopY: 420,
    slotFloorY: 490,
  });

  const onBallLandedRef = useRef(onBallLanded);
  useEffect(() => {
    onBallLandedRef.current = onBallLanded;
  }, [onBallLanded]);

  // Set of all ball IDs ever spawned to strictly prevent re-spawning
  const spawnedBallIdsRef = useRef<Set<string>>(new Set());

  // Sync activeBalls with new incoming ball props
  useEffect(() => {
    const currentIds = new Set(activeBallsRef.current.map((b) => b.id));
    balls.forEach((b) => {
      if (!currentIds.has(b.id) && !spawnedBallIdsRef.current.has(b.id) && b.state === 'falling') {
        spawnedBallIdsRef.current.add(b.id);
        const { width, topY, pegSpacing } = dimensionsRef.current;
        const ballRadius = Math.max(5.5, Math.min(8, pegSpacing * 0.18));

        const newBall: PlinkoBall = {
          ...b,
          x: width / 2,
          y: topY - 14,
          vx: 0,
          vy: 4.5,
          radius: ballRadius,
          currentRow: 0,
          alpha: 1,
          step: 0,
          stepProgress: 0,
        };
        activeBallsRef.current.push(newBall);
      }
    });

    if (balls.length === 0 && activeBallsRef.current.length === 0) {
      spawnedBallIdsRef.current.clear();
    }
  }, [balls]);

  // Build Geometric Grid of Pegs and Slots with Exact Galton Pyramidal Alignment:
  // - Board Width W is divided into 11 equal columns of width S = W / 11 (matching the 11-slot Grid)
  // - Row 0 (第1層): 1 peg at CenterX = 5.5 * S
  // - Row 1 (第2層): 2 pegs at CenterX ± 0.5 * S
  // ...
  // - Row 9 (第10層): 10 pegs (c = 0..9) at CenterX + (c - 4.5) * S = (c + 1) * S (exactly 1/11, 2/11 ... 10/11 of W!)
  // - 11 Slots at Bottom:
  //   Left Rail: X = 0
  //   10 Internal Dividers: X = 1*S, 2*S ... 10*S (exactly beneath the 10 pegs of Row 9!)
  //   Right Rail: X = W
  //   Slot k (k = 0..10) has Left = k * S, Center = (k + 0.5) * S, Right = (k + 1) * S
  const updateGeometry = useCallback((width: number, height: number) => {
    const centerX = width / 2;

    // 11 equal columns matching the CSS repeat(11, 1fr) grid
    const pegSpacing = width / 11;

    const topY = height * 0.07;
    const topPegMargin = height * 0.13;
    const bottomPegMargin = height * 0.76;
    const rowHeight = (bottomPegMargin - topPegMargin) / (PLINKO_ROWS - 1);
    const slotTopY = height * 0.80;
    const slotFloorY = height * 0.98;

    dimensionsRef.current = {
      width,
      height,
      pegSpacing,
      topY,
      slotTopY,
      slotFloorY,
    };

    // 1. Generate 10 Rows of Pegs (Row 0: 1 peg, Row 1: 2 pegs, ..., Row 9: 10 pegs)
    const pegs: Peg[] = [];
    const pegRadius = Math.max(3.5, Math.min(5.5, pegSpacing * 0.11));

    for (let r = 0; r < PLINKO_ROWS; r++) {
      const pegsInRow = r + 1; // Row 0 -> 1 peg, Row 9 -> 10 pegs
      const rowY = topPegMargin + r * rowHeight;

      for (let c = 0; c < pegsInRow; c++) {
        // Horizontal offset centered at centerX:
        // For N pegs: c goes 0 to N-1. Center offset is (c - (N-1)/2) * S
        const x = centerX + (c - (pegsInRow - 1) / 2) * pegSpacing;
        pegs.push({
          id: `peg-${r}-${c}`,
          row: r,
          col: c,
          x,
          y: rowY,
          radius: pegRadius,
          lastHit: 0,
        });
      }
    }
    pegsRef.current = pegs;

    // 2. Generate 11 Bottom Slots (Indexes 0..10)
    // Slot k has left = k * S, right = (k + 1) * S, center = (k + 0.5) * S
    // For k = 0..9, the slot right boundary (which is slot k+1 left boundary)
    // is (k + 1) * S, which exactly matches Row 9 peg j = k!
    const slots: SlotBound[] = [];
    for (let k = 0; k < PLINKO_SLOTS_COUNT; k++) {
      const left = k * pegSpacing;
      const right = (k + 1) * pegSpacing;
      const center = (k + 0.5) * pegSpacing;

      slots.push({
        index: k,
        multiplier: PLINKO_MULTIPLIERS[k] ?? 1,
        left,
        right,
        center,
        width: pegSpacing,
      });
    }
    slotBoundsRef.current = slots;
  }, []);

  // Handle Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;

      canvasRef.current.width = w * dpr;
      canvasRef.current.height = h * dpr;
      canvasRef.current.style.width = `${w}px`;
      canvasRef.current.style.height = `${h}px`;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      updateGeometry(w, h);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateGeometry]);

  // Main 60FPS Physics, Galton Trajectory & Particle Render Loop
  useEffect(() => {
    let animId: number;

    const spawnParticles = (x: number, y: number, color: string, count = 8) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.4 + Math.random() * 2.6;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          color,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 14,
          size: 2 + Math.random() * 2.5,
        });
      }
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const { width, height, pegSpacing, topY, slotTopY, slotFloorY } = dimensionsRef.current;
      const centerX = width / 2;
      const now = Date.now();

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Funnel Wall Guides / Outer Pyramid Acrylic Rails
      // Row 0 peg is at (centerX, row0Y).
      // Row 9 pegs are at centerX + (j - 4.5) * S, so outermost pegs are:
      // Leftmost peg (Row 9 col 0): centerX - 4.5 * S = 1 * S
      // Rightmost peg (Row 9 col 9): centerX + 4.5 * S = 10 * S
      // Outer Rails start at top funnel mouth: centerX ± 0.9 * S at topY
      // Then slope down to anchor precisely through outer slot 0 & slot 10 bounds (0 and width at slotTopY)
      // and continue vertically to slotFloorY (forming the outer walls of the 100x slots).
      ctx.save();
      const leftGuideStartX = centerX - pegSpacing * 0.9;
      const rightGuideStartX = centerX + pegSpacing * 0.9;
      const leftGuideEndX = 1.5;
      const rightGuideEndX = width - 1.5;

      // Wall glow / accent aura
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;

      // Outer Guide - Left Rail (Seamlessly connected to Slot 0 outer wall)
      ctx.beginPath();
      ctx.moveTo(leftGuideStartX, topY);
      ctx.lineTo(leftGuideEndX, slotTopY);
      ctx.lineTo(leftGuideEndX, slotFloorY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Outer Guide - Right Rail (Seamlessly connected to Slot 10 outer wall)
      ctx.beginPath();
      ctx.moveTo(rightGuideStartX, topY);
      ctx.lineTo(rightGuideEndX, slotTopY);
      ctx.lineTo(rightGuideEndX, slotFloorY);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Top corner rivets / brackets
      ctx.fillStyle = '#fde68a';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(leftGuideStartX, topY, 3, 0, Math.PI * 2);
      ctx.arc(rightGuideStartX, topY, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 2. Draw Top Funnel Spout (Aligned with Row 0 single center peg)
      const funnelGrad = ctx.createLinearGradient(centerX - 18, topY - 20, centerX + 18, topY);
      funnelGrad.addColorStop(0, '#78350f');
      funnelGrad.addColorStop(0.5, '#f59e0b');
      funnelGrad.addColorStop(1, '#78350f');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX - 18, 0);
      ctx.lineTo(centerX + 18, 0);
      ctx.lineTo(centerX + 9, topY);
      ctx.lineTo(centerX - 9, topY);
      ctx.closePath();
      ctx.fillStyle = funnelGrad;
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Funnel Ring Aperture (Centered directly above Row 0 single peg)
      ctx.beginPath();
      ctx.ellipse(centerX, topY, 9, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1c1917';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 3. Draw 11 Bottom Slots & Divider Pillars
      // The 10 internal divider lines start from (slot.left, slotTopY) down to (slot.left, slotFloorY)
      // for slots index 1..10, which matches exactly under the 10 pegs of Row 9!
      const slots = slotBoundsRef.current;
      ctx.save();
      slots.forEach((slot) => {
        const isHit = activeSlotHighlight === slot.index;
        const isJackpot = slot.multiplier >= 100;
        const isHigh = slot.multiplier >= 7 && slot.multiplier < 100;
        const isMid = slot.multiplier >= 0.7 && slot.multiplier < 7;

        // Slot Background Chamber
        const slotBoxGrad = ctx.createLinearGradient(slot.left, slotTopY, slot.left, slotFloorY);
        if (isHit) {
          slotBoxGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
          slotBoxGrad.addColorStop(1, 'rgba(245, 158, 11, 0.6)');
        } else if (isJackpot) {
          slotBoxGrad.addColorStop(0, 'rgba(225, 29, 72, 0.15)');
          slotBoxGrad.addColorStop(1, 'rgba(159, 18, 57, 0.45)');
        } else if (isHigh) {
          slotBoxGrad.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
          slotBoxGrad.addColorStop(1, 'rgba(180, 83, 9, 0.35)');
        } else if (isMid) {
          slotBoxGrad.addColorStop(0, 'rgba(30, 41, 59, 0.1)');
          slotBoxGrad.addColorStop(1, 'rgba(15, 23, 42, 0.3)');
        } else {
          slotBoxGrad.addColorStop(0, 'rgba(15, 23, 42, 0.05)');
          slotBoxGrad.addColorStop(1, 'rgba(2, 6, 23, 0.2)');
        }

        ctx.fillStyle = slotBoxGrad;
        ctx.fillRect(slot.left + 1, slotTopY, slot.width - 2, slotFloorY - slotTopY);

        // Divider Posts (Rendered for the 10 internal boundaries, exactly under the 10 pegs of Row 9)
        if (slot.index > 0) {
          ctx.beginPath();
          ctx.moveTo(slot.left, slotTopY);
          ctx.lineTo(slot.left, slotFloorY);
          ctx.strokeStyle = isHit ? '#fef08a' : 'rgba(148, 163, 184, 0.4)';
          ctx.lineWidth = isHit ? 2.5 : 1.5;
          ctx.stroke();

          // Top divider cap rivet directly beneath Row 9 peg
          ctx.fillStyle = isHit ? '#fef08a' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(slot.left, slotTopY, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Multiplier Text Label in Slot
        ctx.font = isJackpot || isHigh ? 'bold 11px monospace' : '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isHit
          ? '#ffffff'
          : isJackpot
          ? '#fda4af'
          : isHigh
          ? '#fde68a'
          : isMid
          ? '#cbd5e1'
          : '#64748b';
        ctx.fillText(`${slot.multiplier}x`, slot.center, slotFloorY - 10);
      });
      ctx.restore();

      // 4. Draw Metallic Pegs
      const pegs = pegsRef.current;
      pegs.forEach((peg) => {
        const isGlowing = now - peg.lastHit < 220;
        const glowFactor = isGlowing ? (220 - (now - peg.lastHit)) / 220 : 0;

        ctx.save();
        if (glowFactor > 0) {
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius + 8 * glowFactor, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(245, 158, 11, ${0.45 * glowFactor})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius + 3.5 * glowFactor, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(254, 240, 138, ${0.8 * glowFactor})`;
          ctx.fill();
        }

        const pegGrad = ctx.createRadialGradient(
          peg.x - peg.radius * 0.3,
          peg.y - peg.radius * 0.3,
          peg.radius * 0.1,
          peg.x,
          peg.y,
          peg.radius
        );

        if (glowFactor > 0) {
          pegGrad.addColorStop(0, '#ffffff');
          pegGrad.addColorStop(0.5, '#fef08a');
          pegGrad.addColorStop(1, '#d97706');
        } else {
          pegGrad.addColorStop(0, '#ffffff');
          pegGrad.addColorStop(0.4, '#e2e8f0');
          pegGrad.addColorStop(0.8, '#64748b');
          pegGrad.addColorStop(1, '#334155');
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fillStyle = pegGrad;
        ctx.shadowColor = glowFactor > 0 ? '#f59e0b' : 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = glowFactor > 0 ? 8 : 2;
        ctx.fill();
        ctx.restore();
      });

      // 5. Physics & Dynamic Galton Animation for Falling Balls (tempo: 6 frames normal / 4 frames turbo)
      const turbo = isTurboMode();
      const stepFramesNormal = 6;
      const stepFramesTurbo = 4;
      const stepFrames = turbo ? stepFramesTurbo : stepFramesNormal;

      const topPegMargin = height * 0.13;
      const bottomPegMargin = height * 0.76;
      const rowHeight = (bottomPegMargin - topPegMargin) / (PLINKO_ROWS - 1);

      const getPegPos = (r: number, k: number) => {
        const pegsInRow = r + 1;
        const x = centerX + (k - (pegsInRow - 1) / 2) * pegSpacing;
        const y = topPegMargin + r * rowHeight;
        return { x, y };
      };

      const remainingBalls: PlinkoBall[] = [];

      for (let i = 0; i < activeBallsRef.current.length; i++) {
        const ball = activeBallsRef.current[i];
        if (ball.state === 'settled') continue;

        // State A: Descending inside Bottom Multiplier Slot
        if (ball.state === 'entering_slot') {
          ball.vy = Math.min(15, ball.vy + 1.2);
          ball.y += ball.vy;

          const slot = slots[ball.targetSlotIndex] || slots[5];
          // Rapid centering ball in the slot
          ball.x += (slot.center - ball.x) * 0.24;
          ball.vx *= 0.6;

          // Bounce softly between slot divider walls if touching
          const slotLeftWall = slot.left + ball.radius + 1.5;
          const slotRightWall = slot.right - ball.radius - 1.5;
          if (ball.x < slotLeftWall) {
            ball.x = slotLeftWall;
            ball.vx = Math.abs(ball.vx) * 0.3;
          } else if (ball.x > slotRightWall) {
            ball.x = slotRightWall;
            ball.vx = -Math.abs(ball.vx) * 0.3;
          }

          // Smooth fade out as ball approaches floor
          const enterY = ball.enterSlotY || slotTopY;
          const progress = Math.min(1, Math.max(0, (ball.y - enterY) / (slotFloorY - enterY)));
          ball.alpha = 1 - progress * 0.92;

          // Trigger Land Event at floor
          if (ball.y >= slotFloorY - 4) {
            ball.state = 'landed';
            spawnParticles(slot.center, slotFloorY - 6, '#f59e0b', 14);

            if (onBallLandedRef.current) {
              onBallLandedRef.current(ball, ball.targetSlotIndex);
            }
            ball.state = 'settled';
            continue;
          }
        } else {
          // State B: Galton Board Pin-by-Pin Trajectory
          const decisions = ball.pathDecisions || [];
          const step = ball.step ?? 0;

          // Compute k for previous rows: k_r = sum_{j=0}^{step-2} decisions[j]
          let kPrev = 0;
          for (let j = 0; j < Math.min(step - 1, decisions.length); j++) {
            kPrev += decisions[j] ?? 0;
          }

          let startX = centerX;
          let startY = topY - 14;
          let endX = centerX;
          let endY = topPegMargin;
          let bounceSide = 0;

          if (step === 0) {
            // Drop from top spout into Row 0 single center peg
            startX = centerX;
            startY = topY - 14;
            const peg0 = getPegPos(0, 0);
            endX = peg0.x;
            endY = peg0.y;
            bounceSide = 0;
          } else if (step >= 1 && step <= 9) {
            // Transition from Row (step - 1) to Row (step)
            const rPrev = step - 1;
            const rCurr = step;
            const startPeg = getPegPos(rPrev, kPrev);
            const decision = decisions[rPrev] ?? 0;
            const kCurr = kPrev + decision;
            const endPeg = getPegPos(rCurr, kCurr);

            startX = startPeg.x;
            startY = startPeg.y;
            endX = endPeg.x;
            endY = endPeg.y;
            bounceSide = decision === 0 ? -1 : 1;
          } else {
            // Step 10: Transition from Row 9 peg into mouth of slot ball.targetSlotIndex
            const startPeg = getPegPos(9, kPrev);
            const decision = decisions[9] ?? 0;
            const targetSlot = ball.targetSlotIndex;
            const slot = slots[targetSlot] || slots[5];

            startX = startPeg.x;
            startY = startPeg.y;
            endX = slot.center;
            endY = slotTopY;
            bounceSide = decision === 0 ? -1 : 1;
          }

          // Advance progress
          const dt = 1 / stepFrames;
          ball.stepProgress = (ball.stepProgress ?? 0) + dt;
          const t = Math.min(1, ball.stepProgress);

          const prevX = ball.x;
          const prevY = ball.y;

          if (step === 0) {
            // Straight vertical drop with gravity acceleration
            ball.x = centerX;
            ball.y = startY + (endY - startY) * (t * t);
          } else {
            // Parabolic Galton bounce arc
            ball.x = (1 - t) * startX + t * endX + Math.sin(t * Math.PI) * bounceSide * (pegSpacing * 0.16);
            ball.y = startY + (endY - startY) * Math.pow(t, 1.35) - Math.sin(t * Math.PI) * (rowHeight * 0.15);
          }

          ball.vx = ball.x - prevX;
          ball.vy = ball.y - prevY;

          // Check step completion
          if (t >= 1) {
            if (step === 0) {
              // Struck Row 0 Peg
              const peg = pegs[0];
              if (peg) {
                peg.lastHit = now;
                spawnParticles(peg.x, peg.y, '#f59e0b', 5);
              }
              sound.playPegHit(0);
              ball.step = 1;
              ball.stepProgress = 0;
              ball.currentRow = 1;
            } else if (step >= 1 && step <= 9) {
              // Struck Row (step) Peg
              const rCurr = step;
              const decision = decisions[rCurr - 1] ?? 0;
              const kCurr = kPrev + decision;
              const pegIdx = (rCurr * (rCurr + 1)) / 2 + kCurr;
              const peg = pegs[pegIdx];
              if (peg) {
                peg.lastHit = now;
                spawnParticles(peg.x, peg.y, '#f59e0b', 5);
              }
              sound.playPegHit(rCurr);
              ball.step = step + 1;
              ball.stepProgress = 0;
              ball.currentRow = rCurr + 1;
            } else {
              // Reached mouth of slot
              ball.step = 11;
              ball.state = 'entering_slot';
              ball.enterSlotY = slotTopY;
              ball.x = endX;
              ball.y = slotTopY;
              ball.vy = 6.0;
              ball.vx = bounceSide * 0.7;
            }
          }
        }

        // Render Active Ball with Spherical Radial Glow
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, ball.alpha));

        // Motion Glow Trail
        ctx.beginPath();
        ctx.arc(ball.x - ball.vx * 1.2, ball.y - ball.vy * 1.2, ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fill();

        // Outer Neon Glow
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius + 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
        ctx.fill();

        // 3D Spherical Radial Gradient
        const ballGrad = ctx.createRadialGradient(
          ball.x - ball.radius * 0.35,
          ball.y - ball.radius * 0.35,
          ball.radius * 0.1,
          ball.x,
          ball.y,
          ball.radius
        );
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.3, '#fca5a5');
        ballGrad.addColorStop(0.7, '#dc2626');
        ballGrad.addColorStop(1, '#7f1d1d');

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();

        remainingBalls.push(ball);
      }
      activeBallsRef.current = remainingBalls;

      // 6. Render Sparks and Particle Effects
      const nextParticles: Particle[] = [];
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.11;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.alpha > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 5;
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      });
      particlesRef.current = nextParticles;

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        id="plinko-canvas"
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
};
