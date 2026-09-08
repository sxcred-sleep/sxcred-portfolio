'use client';

import { useEffect } from 'react';

const SURFACE = '.portfolio, .portfolio-viewer, .mobile-menu';
const NATIVE_CURSOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), button:disabled, [aria-disabled="true"]';
const SEGMENTS = 16;

export function CursorTrail({ paused }: { paused: boolean }) {
  useEffect(() => {
    if (paused) return;
    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)');
    const namespace = 'http://www.w3.org/2000/svg';
    const layer = document.createElementNS(namespace, 'svg');
    layer.classList.add('cursor-trail');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('focusable', 'false');
    const paths = Array.from({ length: SEGMENTS - 1 }, (_, index) => {
      const path = document.createElementNS(namespace, 'path');
      const strength = 1 - index / (SEGMENTS - 1);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'white');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-width', String(.3 + 3 * strength));
      path.setAttribute('opacity', String(.5 * strength * strength));
      layer.appendChild(path);
      return path;
    });
    const dot = document.createElementNS(namespace, 'circle');
    dot.classList.add('cursor-trail-dot');
    dot.setAttribute('r', '4');
    dot.setAttribute('fill', 'white');
    layer.appendChild(dot);
    document.body.appendChild(layer);

    const points = Array.from({ length: SEGMENTS }, () => ({ x: 0, y: 0 }));
    let x = 0;
    let y = 0;
    let frame = 0;
    let previousTime = 0;
    let visible = false;
    let pointerKnown = false;
    const hide = () => {
      visible = false;
      layer.classList.remove('is-visible');
      document.documentElement.classList.remove('cursor-dot-active');
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    };
    const draw = (time: number) => {
      const elapsed = previousTime ? Math.min(time - previousTime, 40) : 16.67;
      previousTime = time;
      const follow = 1 - Math.pow(.58, elapsed / 16.67);
      points[0].x = x;
      points[0].y = y;
      let remaining = 0;
      for (let index = 1; index < points.length; index++) {
        const point = points[index];
        const previous = points[index - 1];
        point.x += (previous.x - point.x) * follow;
        point.y += (previous.y - point.y) * follow;
        remaining += Math.abs(point.x - x) + Math.abs(point.y - y);
      }
      // Quadratic segments form a continuous, tapered ink-like trail.
      paths.forEach((path, index) => {
        const point = points[index];
        const next = points[index + 1];
        const previous = points[Math.max(0, index - 1)];
        path.setAttribute('d', `M ${(previous.x + point.x) / 2} ${(previous.y + point.y) / 2} Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`);
      });
      // Stop requesting frames once the trail has caught up with the dot.
      frame = remaining > .2 ? requestAnimationFrame(draw) : 0;
      if (!frame) previousTime = 0;
    };
    const updateTarget = (target: Element | null) => {
      if (!preference.matches || !target?.closest(SURFACE) || target.closest(NATIVE_CURSOR)) {
        hide();
        return;
      }
      if (!visible) {
        points.forEach(point => { point.x = x; point.y = y; });
        paths.forEach(path => path.removeAttribute('d'));
        visible = true;
        layer.classList.add('is-visible');
        document.documentElement.classList.add('cursor-dot-active');
      }
      // The dot follows the real pointer immediately; only the trail lags.
      dot.setAttribute('cx', String(x));
      dot.setAttribute('cy', String(y));
      dot.setAttribute('r', target.closest('a[href], button') ? '6' : '4');
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const forgetPointer = () => { pointerKnown = false; hide(); };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') { forgetPointer(); return; }
      pointerKnown = true;
      x = event.clientX;
      y = event.clientY;
      updateTarget(event.target instanceof Element ? event.target : null);
    };
    const scroll = () => {
      // Keep viewport coordinates; only the content beneath the pointer changes.
      if (pointerKnown) updateTarget(document.elementFromPoint(x, y));
    };
    const leave = (event: PointerEvent) => { if (!event.relatedTarget) forgetPointer(); };
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Tab') forgetPointer(); };
    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerout', leave);
    document.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', forgetPointer);
    window.addEventListener('blur', forgetPointer);
    document.addEventListener('scroll', scroll, { passive: true, capture: true });
    preference.addEventListener('change', forgetPointer);
    return () => {
      hide();
      layer.remove();
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerout', leave);
      document.removeEventListener('keydown', keyboard);
      document.removeEventListener('visibilitychange', forgetPointer);
      window.removeEventListener('blur', forgetPointer);
      document.removeEventListener('scroll', scroll, true);
      preference.removeEventListener('change', forgetPointer);
    };
  }, [paused]);

  return null;
}
