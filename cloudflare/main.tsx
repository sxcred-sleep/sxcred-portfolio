/* oxlint-disable next/no-html-link-for-pages -- This Cloudflare entry is a static SPA, without the Next router. */
import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Project } from '@/data/projects';
import type { ManagedClient } from '@/data/clients';
import type { Contact } from '@/data/contacts';
import '@/app/globals.css';

const Portfolio = lazy(() => import('@/components/portfolio/Portfolio').then(module => ({ default: module.Portfolio })));
const Admin = lazy(() => import('./admin'));
type PublicData = { projects: Project[]; clients: ManagedClient[]; contacts: Contact[] };

function Loading() {
  return <output style={{ display: 'block', padding: '2rem' }}>Загрузка…</output>;
}

function Home() {
  const [data, setData] = useState<PublicData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/public', { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Failed to load portfolio');
        return response.json() as Promise<PublicData>;
      })
      .then(setData)
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <main style={{ padding: '2rem' }}><p role="alert">Не удалось загрузить портфолио.</p><button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Повторить</button></main>;
  return data ? <Portfolio {...data} /> : <Loading />;
}

const path = window.location.pathname.replace(/\/+$/, '') || '/';
const adminPaths = ['/admin', '/admin/clients', '/admin/contacts'];
createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<Loading />}>
    {path === '/' ? <Home /> : adminPaths.includes(path) ? <Admin path={path} /> : <main style={{ padding: '2rem' }}><h1>Страница не найдена</h1><a href="/">На главную</a></main>}
  </Suspense>,
);
