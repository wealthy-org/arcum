import React, { useEffect, useRef } from 'react';

interface GuillocheCanvasProps {
  className?: string;
}

interface Strand {
  rank: number;
  weight: number;
}

const FREQS = [36, 34, 32, 30, 28, 26, 24, 22, 20, 18];

// 100 harmonic strands replicating banknote guilloche / security engraving
const STRANDS: Strand[] = Array.from({ length: 100 }, (_, i) => {
  const rank = i + 1;
  return {
    rank,
    weight: 0.1 / Math.pow(rank, 0.9),
  };
});

function parseColorToRgb(input: string): [number, number, number] {
  const str = input.trim();
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  const match = str.match(/[\d.]+/g);
  if (match && match.length >= 3) {
    return [+match[0], +match[1], +match[2]];
  }
  return [13, 42, 33];
}

export const GuillocheCanvas: React.FC<GuillocheCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 768px)');

    let width = 0;
    let height = 0;
    let dpr = 1;

    const handleResize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    let animFrame = 0;
    let time = 0;
    let lastStamp = performance.now();
    let isVisible = true;

    // Dynamic interpolated state
    let cx = 0.63;
    let cy = 0.5;
    let r = 0.5;
    let alphaVal = 1;
    let fieldVal = 1;
    let vignetteVal = 0.35;
    const groundRgb: [number, number, number] = [13, 42, 33];
    const lineRgb: [number, number, number] = [230, 223, 200];

    const rgba = (rgb: [number, number, number], a: number) =>
      `rgba(${0 | rgb[0]},${0 | rgb[1]},${0 | rgb[2]},${a})`;

    const render = (now: number) => {
      animFrame = requestAnimationFrame(render);
      if (!isVisible) return;

      const isReduced = prefersReducedMotion.matches;
      const isMobile = mobileQuery.matches;

      const delta = Math.min(0.1, Math.max(0, (now - lastStamp) / 1000));
      lastStamp = now;
      if (!isReduced) {
        time += delta;
      }

      // Read target styling from root CSS variables
      const computed = getComputedStyle(document.documentElement);
      const rawGround = computed.getPropertyValue('--surplus-ground') || '#0d2a21';
      const rawLine = computed.getPropertyValue('--surplus-line') || '#e6dfc8';
      const targetGround = parseColorToRgb(rawGround);
      const targetLine = parseColorToRgb(rawLine);

      const targetCx = parseFloat(computed.getPropertyValue('--scene-cx')) || (isMobile ? 0.5 : 0.63);
      const targetCy = parseFloat(computed.getPropertyValue('--scene-cy')) || (isMobile ? 0.25 : 0.5);
      const targetR = parseFloat(computed.getPropertyValue('--scene-r')) || (isMobile ? 0.58 : 0.5);
      const targetAlpha = parseFloat(computed.getPropertyValue('--scene-alpha')) || 1.0;
      const targetField = parseFloat(computed.getPropertyValue('--scene-field')) || 1.0;
      const targetVignette = parseFloat(computed.getPropertyValue('--scene-vignette')) || 0.35;

      // Exponential smooth lerp between palettes & coordinates (3.8 speed)
      const lerp = 1 - Math.exp(-3.8 * delta);
      cx += (targetCx - cx) * lerp;
      cy += (targetCy - cy) * lerp;
      r += (targetR - r) * lerp;
      alphaVal += (targetAlpha - alphaVal) * lerp;
      fieldVal += (targetField - fieldVal) * lerp;
      vignetteVal += (targetVignette - vignetteVal) * lerp;

      for (let c = 0; c < 3; c++) {
        groundRgb[c] += (targetGround[c] - groundRgb[c]) * lerp;
        lineRgb[c] += (targetLine[c] - lineRgb[c]) * lerp;
      }

      // 1. Clear with Dynamic Interpolated Ground Color
      ctx.fillStyle = rgba(groundRgb, 1);
      ctx.fillRect(0, 0, width, height);

      // 2. Horizontal Atmospheric Field Mesh (the scanlines / security paper texture)
      const fieldAlpha = 0.06 * fieldVal;
      if (fieldAlpha > 0.004) {
        ctx.lineWidth = 0.75;
        ctx.strokeStyle = rgba(lineRgb, fieldAlpha);

        const stepY = isMobile ? 6 : 7;
        const stepX = isMobile ? 14 : 10;
        const nWave = Math.sin((time / 29) * Math.PI * 2);

        ctx.beginPath();
        for (let s = -stepY; s < height + stepY; s += stepY) {
          const rRatio = s / stepY;
          const iPhase = 0.37 * rRatio + 0.03 * time;
          const lAmp = 1.6 + 1.2 * Math.sin(0.05 * rRatio + time / 37);

          for (let eX = 0; eX <= width + stepX; eX += stepX) {
            const tY =
              s +
              lAmp * Math.sin(0.011 * eX + iPhase) +
              0.8 * nWave * Math.sin(0.003 * eX + 0.02 * rRatio);
            if (eX === 0) ctx.moveTo(eX, tY);
            else ctx.lineTo(eX, tY);
          }
        }
        ctx.stroke();
      }

      // 3. 100-Strand Multi-Tier Harmonic Guilloche Rosette
      const C = (isMobile ? width : Math.min(width, 1.25 * height)) * r;
      const centerX = width * cx;
      const centerY = height * cy;
      const totalStrands = STRANDS.length;
      const steps = isMobile ? 300 : 520;
      const D = (time / 151) * Math.PI * 2;
      const q = (time / 37) * Math.PI * 2;

      for (let i = 0; i < totalStrands; i++) {
        const strand = STRANDS[i];
        const nNorm = 1 - (strand.rank - 1) / (totalStrands - 1);
        const tier = Math.min(9, Math.floor((strand.rank - 1) / 10));
        const freq = FREQS[tier];
        const subIndex = (strand.rank - 1) % 10;
        const dir = tier % 2 ? 1 : -1;

        const rot = D * dir * (1 + 0.07 * tier);
        const phase = (subIndex / 10) * ((2 * Math.PI) / freq) * 3 + 0.05 * q * dir;

        const baseRad = C * (0.2 + 0.66 * nNorm);
        const amp = C * (0.004 + 0.12 * Math.sqrt(strand.weight));

        const strandAlpha = alphaVal * 0.3 * (0.4 + 0.6 * 1.0);
        if (strandAlpha < 0.01) continue;

        ctx.strokeStyle = rgba(lineRgb, Math.min(isMobile ? 0.42 : 0.8, strandAlpha));
        ctx.lineWidth = 0.75;

        const fullCircle = 2 * Math.PI;
        ctx.beginPath();
        for (let step = 0; step <= steps; step++) {
          const theta = (step / steps) * fullCircle;
          const currRad = baseRad + amp * Math.sin(freq * theta + phase);
          const px = centerX + currRad * Math.cos(theta + rot);
          const py = centerY + currRad * Math.sin(theta + rot);

          if (step === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }

      // 4. Rotating Ambient Light Beam
      const lightAngle = (time / 83) * Math.PI * 2;
      const lightX = width * (0.5 + 0.5 * Math.cos(lightAngle));
      const lightY = height * (0.5 + 0.5 * Math.sin(lightAngle));
      const lightGrad = ctx.createLinearGradient(lightX, lightY, width - lightX, height - lightY);
      lightGrad.addColorStop(0, rgba(lineRgb, 0.045));
      lightGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.fillStyle = lightGrad;
      ctx.fillRect(0, 0, width, height);

      // 5. Radial Edge Vignette
      if (vignetteVal > 0.01) {
        const radGrad = ctx.createRadialGradient(
          0.55 * width,
          0.5 * height,
          0.3 * Math.min(width, height),
          0.5 * width,
          0.5 * height,
          0.78 * Math.max(width, height)
        );
        radGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        radGrad.addColorStop(1, `rgba(0, 0, 0, ${0.42 * vignetteVal})`);
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
      }
    };

    animFrame = requestAnimationFrame(render);

    const handleVisibility = () => {
      isVisible = !document.hidden;
      lastStamp = performance.now();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-world="true"
      className={className || 'fixed inset-0 w-full h-full pointer-events-none z-0'}
    />
  );
};
