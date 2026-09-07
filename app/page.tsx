import { Portfolio } from '@/components/portfolio/Portfolio';
import { publicWorks } from '@/lib/server/projects';
export const dynamic = 'force-dynamic';
export default async function Home() { return <Portfolio projects={await publicWorks()} />; }
