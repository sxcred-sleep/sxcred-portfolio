import { Portfolio } from '@/components/portfolio/Portfolio';
import { publicWorks } from '@/lib/server/projects';
import { getClients } from '@/lib/server/clients';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const [projects, roster] = await Promise.all([publicWorks(), getClients()]);
  return <Portfolio projects={projects} clients={roster.clients} />;
}
