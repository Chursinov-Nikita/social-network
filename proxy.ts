import { auth } from "@/auth";
import { NextResponse } from "next/server";

const AUTH_PAGES = ["/login", "/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!isAuthPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    "/login",
    "/register",
    "/chat/:path*",
    "/friends/:path*",
    "/notifications/:path*",
    "/profile/:path*",
  ],
};
