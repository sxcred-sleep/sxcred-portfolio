import { AdminPanel } from '@/components/admin/AdminPanel';
import '../admin.css';
export const metadata = {
  title: 'Контакты — SXCRED',
  robots: { index: false, follow: false },
};
export default function ContactsPage() {
  return <AdminPanel view="contacts" />;
}
