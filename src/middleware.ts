import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("auth_token");
    const isLoginPage = request.nextUrl.pathname === "/login";

    // If no token and not on login page, redirect to login
    if (!token && !isLoginPage) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // If token exists and on login page, redirect to home
    if (token && isLoginPage) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (login/logout must be public)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - uploads (uploaded images)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
    ],
};
