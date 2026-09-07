import { login, logout, signedIn } from '@/lib/server/auth';
import { failure, json, readJson, runtime } from '@/lib/server/runtime';
export async function GET(request: Request) {
  try {
    return json({
      authenticated: await signedIn(request),
      configured: !!runtime().ADMIN_PASSWORD_HASH,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    return json({ authenticated: true }, 200, {
      'Set-Cookie': await login(request, (await readJson(request)).password),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    return json({ authenticated: false }, 200, {
      'Set-Cookie': await logout(request),
    });
  } catch (error) {
    return failure(error);
  }
}
