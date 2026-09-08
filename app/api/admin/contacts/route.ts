import { requireAdmin } from '@/lib/server/auth';
import { getContacts, saveContacts } from '@/lib/server/contacts';
import { failure, json, readJson } from '@/lib/server/runtime';

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return json(await getContacts());
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(request, true);
    return json(await saveContacts(await readJson(request)));
  } catch (error) {
    return failure(error);
  }
}
