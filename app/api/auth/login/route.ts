import { NextRequest, NextResponse } from "next/server";

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

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          detail: "Invalid authentication response from server",
        },
        { status: 500 }
      );
    }

    const nextResponse = NextResponse.json({
      success: true,
    });

    nextResponse.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });

    nextResponse.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

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