import { currentUser, unauthorized } from "@/lib/auth";
import { listProfiles } from "@/lib/store";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return Response.json({ user, profiles: await listProfiles(user.id) });
}
