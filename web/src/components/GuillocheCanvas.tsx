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

    // Surplus color tokens: ground #0d2a21, line #e6dfc8
    const groundRgb: [number, number, number] = [13, 42, 33];
    const lineRgb: [number, number, number] = [230, 223, 200];
    const rgba = (rgb: [number, number, number], alpha: number) =>
      `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

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

      // Base coordinate parameters
      // Desktop: center at 63% width, 50% height. Mobile: 50% width, 25% height
      const cx = isMobile ? 0.5 : 0.63;
      const cy = isMobile ? 0.25 : 0.5;
      const r = isMobile ? 0.58 : 0.5;
      const alphaVal = 1;
      const fieldVal = 1;
      const vignetteVal = 0.35;

      // 1. Clear with Deep Forest Green Ground
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
