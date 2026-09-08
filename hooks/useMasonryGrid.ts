import { useLayoutEffect, useRef } from 'react';

// Keep DOM/keyboard order while giving each column its own vertical cursor.
export function useMasonryGrid(items: readonly unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!grid || typeof ResizeObserver === 'undefined') return;
    const cards = Array.from(grid.children) as HTMLElement[];
    let frame = 0;
    const layout = () => {
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const gap = mobile ? 34 : 40;
      const bottoms = [0, 0];
      grid.dataset.masonry = 'true';
      cards.forEach((card, index) => {
        const column = mobile ? 0 : index % 2;
        card.style.left = column ? 'calc((100% + 28px) / 2)' : '0px';
        card.style.top = `${bottoms[column]}px`;
        bottoms[column] += card.offsetHeight + gap;
      });
      grid.style.height = `${Math.max(0, ...bottoms) - (cards.length ? gap : 0)}px`;
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    });
    layout();
    observer.observe(grid);
    cards.forEach(card => observer.observe(card));
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete grid.dataset.masonry;
      grid.style.removeProperty('height');
      cards.forEach(card => {
        card.style.removeProperty('left');
        card.style.removeProperty('top');
      });
    };
  }, [items]);
  return ref;
}
