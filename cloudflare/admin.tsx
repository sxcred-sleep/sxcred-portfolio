import { useEffect } from 'react';
import { AdminPanel } from '@/components/admin/AdminPanel';
import '@/app/admin/admin.css';

export default function Admin({ path }: { path: string }) {
  const view = path === '/admin/clients' ? 'clients' : path === '/admin/contacts' ? 'contacts' : 'works';
  useEffect(() => {
    document.title = `${view === 'clients' ? 'Стримеры' : view === 'contacts' ? 'Контакты' : 'Работы'} — SXCRED`;
  }, [view]);
  return <AdminPanel view={view} />;
}
