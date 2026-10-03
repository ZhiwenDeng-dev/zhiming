import { AuthError, login, logout, register } from "@/lib/auth";

export async function POST(req: Request) {
  const { action, username = "", password = "" } = await req.json();
  try {
    if (action === "logout") {
      await logout();
      return Response.json({ ok: true });
    }
    const user = action === "register" ? await register(username, password) : await login(username, password);
    return Response.json({ user });
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
