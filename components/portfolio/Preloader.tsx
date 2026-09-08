'use client';

import { useEffect, useState } from 'react';
import { site } from '@/data/site';

export function Preloader() {
  const [phase, setPhase] = useState<'loading' | 'leaving' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let finished = false;
    let completed = 0;
    let exitTimer: ReturnType<typeof setTimeout>;
    const started = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const images: HTMLImageElement[] = [];
    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      setProgress(100);
      exitTimer = setTimeout(() => {
        setPhase('leaving');
        exitTimer = setTimeout(() => setPhase('done'), reducedMotion ? 0 : 600);
      }, Math.max(0, (reducedMotion ? 0 : 850) - (performance.now() - started)));
    };
    const settled = () => {
      if (cancelled || finished) return;
      completed += 1;
      setProgress(Math.round(completed / 3 * 100));
      if (completed === 3) finish();
    };

    // Only wait for the first screen: videos and the archive load independently.
    for (const src of ['/media/sxcred-manga-logo.png', '/media/claymore-poster.jpg']) {
      const image = new Image();
      images.push(image);
      image.onload = settled;
      image.onerror = settled;
      image.src = src;
    }
    void document.fonts.ready.then(settled, settled);
    const deadline = setTimeout(finish, 3200);
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      images.forEach(image => { image.onload = null; image.onerror = null; });
    };
  }, []);

  if (phase === 'done') return null;
  return <div className="site-preloader" data-phase={phase}>
    <div className="preloader-meta mono" aria-hidden="true"><span>ПОРТФОЛИО / {site.year}</span></div>
    <div className="preloader-center">
      <div className="preloader-wordmark" aria-hidden="true">SXCRED<span>*</span></div>
      <div className="preloader-caption mono"><output>Загружаю портфолио</output><span aria-hidden="true">{String(progress).padStart(2, '0')}%</span></div>
      <div className="preloader-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
    </div>
    <div className="preloader-footer mono" aria-hidden="true"><span>DOTA 2 / ДИЗАЙН / ВИЗУАЛЬНАЯ КУЛЬТУРА</span><span className="preloader-mark">↗</span></div>
    <noscript><style>{'.site-preloader { display: none !important; }'}</style></noscript>
  </div>;
}
