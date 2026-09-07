'use client';
import { useEffect, useRef } from 'react';
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
  return <div className={`cat-track cat-track-${place} ${paused ? 'cat-paused' : ''}`} aria-hidden="true"><div className="cat-rider"><LoopVideo kind="cat" paused={paused} /></div></div>;
}
