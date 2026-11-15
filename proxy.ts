import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req: NextRequest & { auth?: unknown }) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isOnLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // api/plex/files/chunk : envois de fichiers volumineux. Le proxy copierait leur corps en mémoire
  // (10 Mo max, tronqué au-delà) ; la route vérifie elle-même la session.
  matcher: ["/((?!login|api/auth|api/plex/files/chunk|_next/static|_next/image|favicon.ico).*)"],
};