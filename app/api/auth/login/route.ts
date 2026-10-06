import { NextRequest, NextResponse } from "next/server";

import { isSessionUser, setSessionCookies } from "@/lib/session";

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${DJANGO_API_URL}/api/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          detail: data.detail || "Invalid email or password",
        },
        { status: response.status }
      );
    }

    const accessToken = data.access;
    const refreshToken = data.refresh;

    if (typeof accessToken !== "string" || !accessToken ||
        typeof refreshToken !== "string" || !refreshToken || !isSessionUser(data.user)) {
      return NextResponse.json(
        {
          detail: "Invalid authentication response from server",
        },
        { status: 500 }
      );
    }

    const nextResponse = NextResponse.json({
      success: true,
      user: data.user,
    });
    nextResponse.headers.set("Cache-Control", "no-store");

    setSessionCookies(nextResponse, { access: accessToken, refresh: refreshToken }, data.user);

    return nextResponse;
  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        detail: "Unable to connect to authentication server",
      },
      { status: 500 }
    );
  }
}
