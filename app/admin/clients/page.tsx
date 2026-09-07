import { AdminPanel } from '@/components/admin/AdminPanel';
import '../admin.css';
export const metadata = {
  title: 'Стримеры — SXCRED',
  robots: { index: false, follow: false },
};
export default function ClientsPage() {
  return <AdminPanel view="clients" />;
}
