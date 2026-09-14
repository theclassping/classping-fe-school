import { NextRequest, NextResponse } from "next/server";

import { REFRESH_COOKIE, clearSessionCookies } from "@/lib/session";

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (refreshToken) {
      await fetch(`${DJANGO_API_URL}/api/auth/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
        cache: "no-store",
      });
    }

    const response = NextResponse.json({
      success: true,
    });

    clearSessionCookies(response);

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    const response = NextResponse.json({
      success: true,
    });

    clearSessionCookies(response);

    return response;
  }
}