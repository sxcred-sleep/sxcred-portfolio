import * as session from '@/app/api/admin/session/route';
import * as projects from '@/app/api/admin/projects/route';
import * as clients from '@/app/api/admin/clients/route';
import * as contacts from '@/app/api/admin/contacts/route';
import * as uploads from '@/app/api/admin/uploads/route';
import { GET as media } from '@/app/api/media/[id]/route';
import { publicWorks } from '@/lib/server/projects';
import { getClients } from '@/lib/server/clients';
import { getContacts } from '@/lib/server/contacts';
import { failure, json } from '@/lib/server/runtime';

type Handler = (request: Request) => Promise<Response>;
const routes: Record<string, Record<string, Handler>> = {
  '/api/admin/session': session,
  '/api/admin/projects': projects,
  '/api/admin/clients': clients,
  '/api/admin/contacts': contacts,
  '/api/admin/uploads': uploads,
  '/api/public': {
    GET: async () => {
      const [projects, roster, settings] = await Promise.all([publicWorks(), getClients(), getContacts()]);
      return json({ projects, clients: roster.clients, contacts: settings.contacts });
    },
  },
};

const worker = {
  async fetch(request: Request): Promise<Response> {
    try {
      const path = new URL(request.url).pathname.replace(/\/+$/, '');
      const mediaMatch = /^\/api\/media\/([a-f0-9-]{36})$/.exec(path);
      const handlers = mediaMatch ? { GET: (request: Request) => media(request, { params: Promise.resolve({ id: mediaMatch[1] }) }) } : routes[path];
      if (!handlers) return json({ error: 'Не найдено.' }, 404);
      const handler = (handlers as Record<string, Handler>)[request.method];
      if (!handler) return json({ error: 'Метод не поддерживается.' }, 405, { Allow: Object.keys(handlers).join(', ') });
      return await handler(request);
    } catch (error) {
      return failure(error);
    }
  },
};
export default worker;
