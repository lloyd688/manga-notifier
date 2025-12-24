import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        // Default password is "1234" if env not set
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

        if (password === ADMIN_PASSWORD) {
            const response = NextResponse.json({ success: true });

            // Set HttpOnly cookie for auth
            response.cookies.set("auth_token", "authenticated", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 60 * 60 * 24 * 7, // 1 week
                path: "/",
            });

            return response;
        }

        return NextResponse.json(
            { success: false, message: "รหัสผ่านไม่ถูกต้อง" },
            { status: 401 }
        );
    } catch (error) {
        return NextResponse.json(
            { success: false, message: "เกิดข้อผิดพลาด" },
            { status: 500 }
        );
    }
}
