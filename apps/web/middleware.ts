import { NextResponse, type NextRequest } from "next/server";

const sessionCookieName = "zook_session";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/platform/:path*"],
};
