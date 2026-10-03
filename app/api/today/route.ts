import { today } from "@/lib/paipan";

export async function GET() {
  return Response.json(await today());
}
