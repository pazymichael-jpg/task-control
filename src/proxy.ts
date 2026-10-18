import { NextRequest, NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

// Public routes.
const OPEN = ["/login", "/api/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
