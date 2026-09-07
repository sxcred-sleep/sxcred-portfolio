'use client';
/* oxlint-disable jsx-a11y/media-has-caption -- Uploaded videos showcase visual design; no caption track is supplied by the author. */
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Project } from '@/data/projects';
import { ProjectArt } from './ProjectArt';
export function ProjectViewer({ projects, index, open, onClose, onProject }: { projects: Project[]; index: number; open: boolean; onClose: () => void; onProject: (index: number) => void }) {
  const [gallery, setGallery] = useState({ project: index, slide: 0, failed: false });
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const project = projects[index];
  const total = project.images.length || 2;
  const currentSlide = gallery.project === index ? Math.min(gallery.slide, total - 1) : 0;
  const failed = gallery.project === index && gallery.failed;
  const changeSlide = (direction: number) => setGallery({ project: index, slide: (currentSlide + direction + total) % total, failed: false });
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="portfolio-viewer" showCloseButton={false} onKeyDown={event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); changeSlide(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); changeSlide(-1); }
    }}>
      <div className="viewer-top"><span className="mono">SXCRED / АРХИВ {String(index + 1).padStart(2, '0')}</span><DialogClose className="viewer-close">Закрыть <X size={21} /></DialogClose></div>
      <div className="viewer-layout"><div className="viewer-info">
        <span className="mono red">{project.placeholder ? 'ДЕМОНСТРАЦИОННЫЙ ПРОЕКТ' : project.category}</span>
        <DialogTitle className="viewer-title">{project.title}</DialogTitle><DialogDescription className="viewer-description">{project.description}</DialogDescription>
        <dl><div><dt>Направление</dt><dd>{project.category}</dd></div>{project.year && <div><dt>Год</dt><dd>{project.year}</dd></div>}{project.client && <div><dt>Клиент</dt><dd>{project.client}</dd></div>}</dl>
      </div><div className="viewer-gallery">
        <div className="viewer-image" onTouchStart={event => { swipe.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null; }} onTouchEnd={event => {
          const start = swipe.current; swipe.current = null; if (!start) return;
          const dx = event.changedTouches[0].clientX - start.x; const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) changeSlide(dx < 0 ? 1 : -1);
        }}>
          {/* Media are local, pre-optimized files; this viewer preserves their original proportions. */}
          {/* oxlint-disable-next-line next/no-img-element */}
          {project.images.length > 0 && !failed ? project.images[currentSlide].type === 'video' ? <video key={project.images[currentSlide].src} src={project.images[currentSlide].src} controls playsInline preload="metadata" aria-label={project.images[currentSlide].alt} onError={() => setGallery({ project: index, slide: currentSlide, failed: true })} /> : <img key={project.images[currentSlide].src} src={project.images[currentSlide].src} alt={project.images[currentSlide].alt} onError={() => setGallery({ project: index, slide: currentSlide, failed: true })} /> : <ProjectArt project={project} detail={currentSlide > 0} />}
          {failed && <output className="image-error">Изображение недоступно. Попробуйте следующий кадр.</output>}
        </div>
        <div className="gallery-controls"><button onClick={() => changeSlide(-1)} aria-label="Предыдущее изображение"><ArrowLeft /></button><span className="mono" aria-live="polite">{String(currentSlide + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span><button onClick={() => changeSlide(1)} aria-label="Следующее изображение"><ArrowRight /></button></div>
        <div className="gallery-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(currentSlide + 1) / total})` }} /></div>
      </div></div>
      <div className="viewer-bottom"><button onClick={() => onProject((index - 1 + projects.length) % projects.length)}><ArrowLeft size={18} /><span>Предыдущая работа</span></button><span className="mono">{index + 1} ИЗ {projects.length}</span><button onClick={() => onProject((index + 1) % projects.length)}><span>Следующая работа</span><ArrowRight size={18} /></button></div>
    </DialogContent>
  </Dialog>;
}
