'use client';
import { useEffect, useRef, useState } from 'react';
export function LoopVideo({ kind, paused, priority = false }: { kind: 'cat' | 'claymore'; paused: boolean; priority?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => {
      if (paused || preference.matches || !visible || document.hidden) video.pause();
      else void video.play().catch(() => { /* Keep the poster if autoplay is unavailable. */ });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { rootMargin: '80px' });
    observer.observe(video);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    update();
    return () => { observer.disconnect(); preference.removeEventListener('change', update); document.removeEventListener('visibilitychange', update); video.pause(); };
  }, [paused]);
  return <video ref={ref} className={`loop-video ${kind}-video`} muted loop playsInline preload={priority ? 'auto' : 'none'} poster={`/media/${kind}-poster.${kind === 'cat' ? 'webp' : 'jpg'}`} width={kind === 'cat' ? 360 : 1280} height={kind === 'cat' ? 282 : 858} aria-label={kind === 'cat' ? 'Рыжий кот катается на гироскутере' : 'Анимированный персонаж Claymore с мечом'}><source src={`/media/${kind}.mp4`} type="video/mp4" /></video>;
}
export function AnimatedCat({ paused, place }: { paused: boolean; place: 'hero' | 'contact' }) {
  return <div className={`cat-track cat-track-${place} ${paused ? 'cat-paused' : ''}`} aria-hidden="true"><div className="cat-rider"><TransparentCat paused={paused} /></div></div>;
}

function TransparentCat({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const update = () => setPlaying(visible && !paused && !preference.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }, { rootMargin: '80px' });
    observer.observe(element.closest('.cat-track') ?? element);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [paused]);
  // Animated WebP retains real alpha in Chrome, Firefox and Safari. Swapping
  // to its transparent still frame respects pause and reduced-motion settings.
  // oxlint-disable-next-line next/no-img-element
  return <img ref={ref} className="cat-image" src={playing && !paused ? '/media/cat-transparent.webp' : '/media/cat-transparent-poster.webp'} alt="" width={256} height={202} decoding="async" draggable={false} />;
}
