import { AdminPanel } from '@/components/admin/AdminPanel';
import './admin.css';
export const metadata = {
  title: 'Работы — SXCRED',
  robots: { index: false, follow: false },
};
export default function AdminPage() {
  return <AdminPanel />;
}
