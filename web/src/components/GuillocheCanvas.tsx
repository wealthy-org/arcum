import React, { useEffect, useRef } from 'react';

interface GuillocheCanvasProps {
  className?: string;
}

export const GuillocheCanvas: React.FC<GuillocheCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

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

    let animationFrameId = 0;
    let time = 0;
    let lastStamp = performance.now();

    // 10 harmonic strands representing tokenized equity option volatility surfaces
    const strands = [
      { r: 0.18, freq: 12, speed: 0.25, width: 0.75, alpha: 0.35 },
      { r: 0.24, freq: 16, speed: -0.2, width: 0.75, alpha: 0.4 },
      { r: 0.30, freq: 20, speed: 0.18, width: 0.75, alpha: 0.45 },
      { r: 0.36, freq: 24, speed: -0.15, width: 0.75, alpha: 0.5 },
      { r: 0.42, freq: 28, speed: 0.12, width: 0.75, alpha: 0.45 },
      { r: 0.48, freq: 32, speed: -0.1, width: 0.8, alpha: 0.4 },
      { r: 0.54, freq: 36, speed: 0.08, width: 0.8, alpha: 0.35 },
      { r: 0.60, freq: 40, speed: -0.06, width: 0.75, alpha: 0.3 },
      { r: 0.66, freq: 44, speed: 0.05, width: 0.75, alpha: 0.25 },
      { r: 0.72, freq: 48, speed: -0.04, width: 0.75, alpha: 0.2 },
    ];

    const render = (now: number) => {
      animationFrameId = requestAnimationFrame(render);
      const delta = Math.min(0.1, Math.max(0, (now - lastStamp) / 1000));
      lastStamp = now;
      time += delta;

      // Deep Pine Ground #0d2a21
      ctx.fillStyle = '#0d2a21';
      ctx.fillRect(0, 0, width, height);

      // Center of spirograph slightly offset to right, matching Surplus
      const centerX = width * 0.55;
      const centerY = height * 0.48;
      const baseRadius = Math.min(width, height) * 0.65;

      // Subtle atmospheric wave lines
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(230, 223, 200, 0.04)';
      const waveSpacing = 8;
      ctx.beginPath();
      for (let y = 0; y < height; y += waveSpacing) {
        const offset = Math.sin(y * 0.02 + time * 0.3) * 6;
        ctx.moveTo(0, y + offset);
        ctx.lineTo(width, y + offset);
      }
      ctx.stroke();

      // Multi-Strand Guilloche Spirograph
      const steps = 400;
      const tau = Math.PI * 2;

      for (const strand of strands) {
        ctx.lineWidth = strand.width;
        ctx.strokeStyle = `rgba(230, 223, 200, ${strand.alpha})`;

        const rot = time * strand.speed;
        const R = baseRadius * strand.r;
        const waveAmp = R * 0.09;

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * tau;
          const r = R + Math.sin(theta * strand.freq + time * 0.6) * waveAmp;
          const x = centerX + r * Math.cos(theta + rot);
          const y = centerY + r * Math.sin(theta + rot);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Center pulsating seal dot
      const sealPulse = Math.sin(time * 2) * 1.5;
      ctx.fillStyle = '#e0482c'; // Surplus vermilion seal red
      ctx.beginPath();
      ctx.arc(centerX - baseRadius * 0.28, centerY + baseRadius * 0.18, 5 + sealPulse, 0, tau);
      ctx.fill();

      // Atmospheric vignette
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.3,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className || 'fixed inset-0 w-full h-full pointer-events-none z-0'}
    />
  );
};
