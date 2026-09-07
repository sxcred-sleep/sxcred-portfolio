'use client';
/* oxlint-disable next/no-img-element -- Local media are pre-optimized; explicit dimensions reserve layout. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, ArrowUp, Plus, Minus, Pause, Play, Menu, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import type { ManagedClient } from '@/data/clients';
import type { Project } from '@/data/projects';
import { navigation, services, site } from '@/data/site';
import { AnimatedCat, LoopVideo } from './Media';
import { ProjectArt } from './ProjectArt';
import { ProjectViewer } from './ProjectViewer';

function Chapter({ number, title }: { number: string; title: string }) {
  return <div className="chapter-line"><span className="mono">ГЛАВА {number}</span><span className="chapter-rule" /><span className="mono">{title}</span></div>;
}
export function Portfolio({ projects, clients }: { projects: Project[]; clients: ManagedClient[] }) {
  const [paused, setPaused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [service, setService] = useState<number | null>(0);
  const [projectIndex, setProjectIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const clickedProject = useRef<HTMLElement | null>(null);
  const pushed = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elements = root.current?.querySelectorAll('.reveal');
    if (!elements) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.09 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const sync = () => {
      const id = location.hash.startsWith('#project/') ? location.hash.slice(9) : '';
      const found = projects.findIndex(project => project.id === id);
      setViewerOpen(found !== -1);
      if (found !== -1) setProjectIndex(found);
      else { pushed.current = false; clickedProject.current?.focus({ preventScroll: true }); }
    };
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [projects]);
  const openProject = (index: number) => {
    clickedProject.current = document.activeElement as HTMLElement;
    window.history.pushState(null, '', `#project/${projects[index].id}`);
    pushed.current = true; setProjectIndex(index); setViewerOpen(true);
  };
  const closeProject = useCallback(() => {
    setViewerOpen(false);
    if (pushed.current) window.history.back();
    else window.history.replaceState(null, '', '#work');
    clickedProject.current?.focus({ preventScroll: true });
  }, []);
  const nextProject = (index: number) => { window.history.replaceState(null, '', `#project/${projects[index].id}`); setProjectIndex(index); };
  return <div id="top" ref={root} className={`portfolio ${paused ? 'motion-paused' : ''}`}>
    <a className="skip-link" href="#main">Перейти к содержимому</a>
    <header className="site-header">
      <a href="#top" className="wordmark" aria-label="SXCRED, в начало">SXCRED<span>®</span></a>
      <nav className="desktop-nav" aria-label="Основная навигация">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}<sup>{item.number}</sup></a>)}</nav>
      <div className="header-actions"><button className="motion-toggle" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Включить анимацию' : 'Приостановить анимацию'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}<span>Анимация</span></button>
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}><DialogTrigger className="menu-trigger" aria-label="Открыть меню"><Menu /></DialogTrigger><DialogContent className="mobile-menu" showCloseButton={false}><div className="mobile-menu-head"><DialogTitle>SXCRED®</DialogTitle><DialogClose aria-label="Закрыть меню"><X /></DialogClose></div><DialogDescription className="sr-only">Навигация по главам портфолио</DialogDescription><nav aria-label="Мобильная навигация">{navigation.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><span className="mono">{item.number}</span>{item.label}<ArrowUpRight /></a>)}</nav><span className="mono">ПОРТФОЛИО / {site.year}</span></DialogContent></Dialog></div>
    </header>
    <main id="main">
      <section className="cover" aria-labelledby="hero-title">
        <div className="cover-meta mono"><span>НЕЗАВИСИМЫЙ ДИЗАЙНЕР</span><span>ПОРТФОЛИО / {site.year}</span></div>
        <div className="cover-frame" aria-hidden="true" /><span className="cover-chapter mono">00 / НАЧАЛО</span>
        <h1 id="hero-title" className="cover-title">SXCRED<span className="title-star">*</span></h1>
        <div className="cover-character"><LoopVideo kind="claymore" paused={paused || viewerOpen || menuOpen} priority /></div>
        <div className="cover-copy"><span className="hero-profession">ДИЗАЙНЕР В МИРЕ DOTA 2</span><p>{site.intro}</p><a className="solid-button" href="#work">Смотреть работы<ArrowDown size={18} /></a></div>
        <div className="cover-side mono">ВИЗУАЛЬНЫЙ УРОН.<br />БЕЗ КОМПРОМИССОВ.</div>
        <AnimatedCat place="hero" paused={paused || viewerOpen || menuOpen} />
        <div className="cover-bottom mono"><span>DOTA 2 / СТРИМЫ / ВИЗУАЛЬНАЯ КУЛЬТУРА</span><span>ЛИСТ 001 <ArrowDown size={14} /></span></div>
      </section>
      <section id="work" className="work-section section-pad">
        <Chapter number="01" title="АРХИВ РАБОТ" />
        <div className="work-heading reveal"><h2>ВЫБРАННЫЕ<br /><span className="outline-type">РАБОТЫ</span><sup>({String(projects.length).padStart(2, '0')})</sup></h2><p>Каждая работа:<br />отдельная история.</p></div>
        {projects.every(project => project.placeholder) && <div className="archive-notice"><span className="red">*</span> Архив пополняется. Пока здесь демонстрационные обложки.</div>}
        <div className="work-grid">{projects.map((project, index) => <article key={project.id} className={`project-card project-${project.layout} reveal`}>
          <button className="project-open" onClick={() => openProject(index)} aria-label={`Открыть проект: ${project.title}`}>
            {project.images.length ? project.images[0].type === 'video' ? <video src={`${project.images[0].src}#t=0.1`} muted playsInline preload="metadata" aria-label={project.images[0].alt} /> : <img src={project.images[0].src} alt={project.images[0].alt} loading="lazy" width={1200} height={800} /> : <ProjectArt project={project} />}
            <span className="project-view">Смотреть <ArrowUpRight size={18} /></span>
          </button>
          <div className="project-caption"><div><span className="mono">{String(index + 1).padStart(2, '0')} / {project.category}</span><h3><button onClick={() => openProject(index)}>{project.title}</button></h3></div><ArrowUpRight size={24} aria-hidden="true" /></div>
        </article>)}</div>
        <div className="archive-end mono"><span>КОНЕЦ ПОДБОРКИ</span><span>ПРОДОЛЖЕНИЕ СЛЕДУЕТ ↗</span></div>
      </section>
      <section id="clients" className="clients-section section-pad">
        <Chapter number="02" title="В ОДНОЙ КОМАНДЕ" />
        <div className="clients-intro reveal"><span className="roster-word" aria-hidden="true">PARTY</span><h2>ТЕ, С КЕМ<br />НА ОДНОЙ ВОЛНЕ.</h2></div>
        <div className="client-roster">{clients.map((client, index) => <article className="client-cell reveal" key={client.id}>
          <div className="client-cell-top mono"><span>ИГРОК / {String(index + 1).padStart(2, '0')}</span><span>↗</span></div>
          <div className={`client-avatar avatar-${index}`} aria-label={client.avatar ? undefined : `Место для аватара ${client.name}`}>
            {client.avatar ? <img src={client.avatar} alt={client.name} loading="lazy" width={400} height={400} /> : <><span className="avatar-letter">{client.name.slice(0, 1).toUpperCase()}</span><span className="mono avatar-label">АВАТАР СКОРО</span></>}
          </div>
          <div className="client-name"><h3>{client.link ? <a href={client.link} target="_blank" rel="noreferrer">{client.name}</a> : client.name}</h3><span className="mono">{client.workType || client.category}</span></div>
        </article>)}</div><p className="clients-note">Разные стили игры. Один подход к визуалу.</p>
      </section>
      <section id="services" className="services-section section-pad">
        <Chapter number="03" title="ЧТО Я ДЕЛАЮ" /><h2 className="section-title reveal">МОЙ <span className="outline-type">АРСЕНАЛ.</span></h2>
        <div className="service-list">{services.map((item, index) => <div className={`service-row ${service === index ? 'service-active' : ''} reveal`} key={item.title}>
          <h3><button aria-expanded={service === index} aria-controls={`service-${index}`} onClick={() => setService(service === index ? null : index)}><span className="mono service-number">0{index + 1}</span><span className="service-title">{item.title}</span><span className="mono service-english">{item.english}</span>{service === index ? <Minus /> : <Plus />}</button></h3>
          <div id={`service-${index}`} className="service-description" hidden={service !== index}><p>{item.description}</p></div>
        </div>)}</div>
      </section>
      <section id="about" className="about-section section-pad">
        <Chapter number="04" title="ЗА КАДРОМ" />
        <div className="about-layout"><div className="about-art reveal"><span className="about-art-index mono">SXCRED / ЛИЧНОЕ ДЕЛО</span><img src="/media/claymore-poster.jpg" alt="Чёрно-белая иллюстрация персонажа Claymore" loading="lazy" width={1264} height={848} /><span className="about-art-caption">БОЛЬШЕ,<br />ЧЕМ ПИКСЕЛИ.</span></div><div className="about-copy reveal"><h2>ИГРАЮ<br />НА СТОРОНЕ<br /><span className="outline-type">ДИЗАЙНА.</span></h2><p className="about-lead">{site.about}</p><p>{site.aboutDetail}</p><dl className="about-facts"><div><dt>НИКНЕЙМ</dt><dd>SXCRED</dd></div><div><dt>ОСНОВНОЙ ФОКУС</dt><dd>DOTA 2 / GAMING</dd></div><div><dt>СПЕЦИАЛИЗАЦИЯ</dt><dd>ВИЗУАЛЬНЫЙ ДИЗАЙН</dd></div></dl></div></div>
      </section>
      <section id="contact" className="contact-section section-pad">
        <Chapter number="05" title="ФИНАЛЬНАЯ ГЛАВА" />
        <div className="contact-heading reveal"><h2>{site.contactLine.map((line, index) => <span key={line} className={index === 1 ? 'outline-type' : ''}>{line}</span>)}</h2><ArrowUpRight className="contact-arrow" strokeWidth={1} aria-hidden="true" /></div>
        <div className="contact-details"><p>Есть идея? Давай дадим ей форму.<br /><span className="muted">Контакты появятся здесь чуть позже.</span></p><div className="contact-links">{site.contacts.map(contact => contact.url ? <a href={contact.url} key={contact.label} target={contact.url.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{contact.label}<ArrowUpRight size={16} /></a> : <span className="contact-placeholder" key={contact.label} aria-label={`${contact.label}: ссылка будет добавлена`}>{contact.label}<span className="mono">СКОРО</span></span>)}</div></div>
        <AnimatedCat place="contact" paused={paused || viewerOpen || menuOpen} />
        <div className="contact-tail mono"><span>СПАСИБО ЗА ПРОСМОТР. GG.</span><span>ДАЛЬШЕ ТВОЯ ИСТОРИЯ.</span></div>
      </section>
    </main>
    <footer className="footer"><a href="#top" className="wordmark">SXCRED<span>®</span></a><span className="mono">© {site.year} SXCRED</span><a href="#top" className="back-top">Наверх <ArrowUp size={16} /></a></footer>
    <ProjectViewer projects={projects} index={projectIndex} open={viewerOpen} onClose={closeProject} onProject={nextProject} />
  </div>;
}
