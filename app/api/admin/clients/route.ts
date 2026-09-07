import { requireAdmin } from '@/lib/server/auth';
import { getClients, saveClients } from '@/lib/server/clients';
import { failure, json, readJson } from '@/lib/server/runtime';
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return json(await getClients());
  } catch (error) {
    return failure(error);
  }
}
export async function PUT(request: Request) {
  try {
    await requireAdmin(request, true);
    return json(await saveClients(await readJson(request)));
  } catch (error) {
    return failure(error);
  }
}
