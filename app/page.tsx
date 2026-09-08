import { Portfolio } from '@/components/portfolio/Portfolio';
import { publicWorks } from '@/lib/server/projects';
import { getClients } from '@/lib/server/clients';
import { getContacts } from '@/lib/server/contacts';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [projects, roster, settings] = await Promise.all([publicWorks(), getClients(), getContacts()]);
  return <Portfolio projects={projects} clients={roster.clients} contacts={settings.contacts} />;
}
