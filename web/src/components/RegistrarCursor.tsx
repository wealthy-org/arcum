import React, { useEffect, useRef, useMemo } from 'react';

export const RegistrarCursor: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const eyesGroupRef = useRef<SVGGElement | null>(null);

  // 16-lobe wax seal curve matching Surplus exact geometry
  const sealPath = useMemo(() => {
    const points: string[] = [];
    for (let t = 0; t <= 96; t++) {
      const a = (t / 96) * Math.PI * 2;
      const r = 10 + 0.85 * Math.cos(16 * a);
      points.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
    }
    return `M${points.join('L')}Z`;
  }, []);

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const container = containerRef.current;
    if (!container || !finePointerQuery.matches) return;

    const root = document.documentElement;
    root.dataset.registrar = '';

    let lastX = -100;
    let lastY = -100;
    let velX = 0;
    let velY = 0;
    let eyeX = 0;
    let eyeY = 0;
    let lean = 0;
    let animFrame = 0;
    let isPhysicsActive = false;
    let currentState = 'rest';
    let lastInteractionTime = performance.now();

    const setState = (nextState: string) => {
      if (nextState !== currentState) {
        currentState = nextState;
        container.dataset.state = nextState;
      }
    };

    // Physics step for eye tracking and body lean angle
    const updatePhysics = () => {
      eyeX += (Math.max(-2.2, Math.min(2.2, 0.08 * velX)) - eyeX) * 0.2;
      eyeY += (Math.max(-1.8, Math.min(1.8, 0.08 * velY)) - eyeY) * 0.2;
      lean += (Math.max(-14, Math.min(14, 0.6 * velX)) - lean) * 0.15;
      velX *= 0.82;
      velY *= 0.82;

      if (eyesGroupRef.current) {
        eyesGroupRef.current.setAttribute(
          'transform',
          `translate(${eyeX.toFixed(2)} ${eyeY.toFixed(2)})`
        );
      }
      container.style.setProperty('--lean', `${lean.toFixed(2)}deg`);

      if (Math.abs(velX) + Math.abs(velY) + Math.abs(lean) > 0.05) {
        animFrame = requestAnimationFrame(updatePhysics);
      } else {
        isPhysicsActive = false;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;

      velX += e.clientX - lastX;
      velY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      container.style.transform = `translate3d(${lastX}px, ${lastY}px, 0)`;
      container.dataset.hidden = 'false';
      lastInteractionTime = performance.now();
      container.dataset.idle = 'awake';

      // Detect element type under cursor
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[disabled], [aria-disabled="true"]')) {
        setState('locked');
      } else if (
        target?.closest?.(
          'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'
        )
      ) {
        setState('text');
      } else if (
        target?.closest?.(
          'a[href], button, [role="button"], [role="tab"], [role="option"], label, select, summary, [data-press], .stamp-btn, .yYMW7q_stamp'
        )
      ) {
        setState('press');
      } else {
        setState('rest');
      }

      if (!isPhysicsActive) {
        isPhysicsActive = true;
        animFrame = requestAnimationFrame(updatePhysics);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      container.dataset.down = 'true';

      if (currentState === 'press' || currentState === 'rest') {
        // Create wax seal impression ripple at click point
        const ripple = document.createElement('div');
        ripple.className = '_20DMMW_impression';
        ripple.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 900);
      }
    };

    const handlePointerUp = () => {
      container.dataset.down = 'false';
    };

    const handlePointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) {
        container.dataset.hidden = 'true';
      }
    };

    // Idle timer (awake -> still -> doze)
    const idleInterval = window.setInterval(() => {
      const elapsed = performance.now() - lastInteractionTime;
      container.dataset.idle = elapsed > 24000 ? 'doze' : elapsed > 5000 ? 'still' : 'awake';
    }, 1000);

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('pointerout', handlePointerOut);

    return () => {
      cancelAnimationFrame(animFrame);
      clearInterval(idleInterval);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointerout', handlePointerOut);
      delete root.dataset.registrar;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="_20DMMW_registrar"
      data-hidden="true"
      data-state="rest"
      data-idle="awake"
      aria-hidden="true"
    >
      <div className="_20DMMW_body">
        <svg viewBox="-12 -12 24 24" width="24" height="24" className="_20DMMW_seal">
          <path d={sealPath} className="_20DMMW_disc" />
          <circle r="7.4" className="_20DMMW_inner" />
          <g ref={eyesGroupRef}>
            <g className="_20DMMW_eyes">
              <circle cx="-3.1" cy="-1.2" r="1.15" />
              <circle cx="3.1" cy="-1.2" r="1.15" />
            </g>
            <g className="_20DMMW_shut">
              <path d="M-4.3 -1.1 L-1.9 -1.1 M1.9 -1.1 L4.3 -1.1" />
            </g>
            <path className="_20DMMW_mouth" d="M-1.6 2.6 Q0 3.7 1.6 2.6" />
          </g>
        </svg>
        <span className="_20DMMW_caret" />
      </div>
    </div>
  );
};
