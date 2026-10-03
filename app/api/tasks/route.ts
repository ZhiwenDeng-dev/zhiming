import { currentUser, unauthorized } from "@/lib/auth";
import { tasksOf } from "@/lib/claude";

// 当前账号进行中/排队中的推算，前端全局状态条轮询
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return Response.json(tasksOf(user.id));
}
