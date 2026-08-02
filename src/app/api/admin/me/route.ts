import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

// Used by the admin shell to gate the UI: 200 = admin, 401 = log in, 403 = not admin.
export async function GET(req: Request) {
  const { err, user, role } = await requireAdmin(req);
  if (err) return err;
  return NextResponse.json({ admin: true, role, email: user!.email });
}
