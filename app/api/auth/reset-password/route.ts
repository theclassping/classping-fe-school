import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookies } from "@/lib/session";

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export async function POST(request: NextRequest) {
  if (!DJANGO_API_URL) {
    return NextResponse.json(
      { detail: "Server autentikasi belum dikonfigurasi." },
      { status: 503 },
    );
  }

  try {
    const body = await request.text();
    const response = await fetch(`${DJANGO_API_URL.replace(/\/$/, "")}/api/auth/reset-password/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    const data = await response.text();
    const result = new NextResponse(data, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok) clearSessionCookies(result);
    return result;
  } catch {
    return NextResponse.json(
      { detail: "Tidak dapat menghubungi server autentikasi." },
      { status: 502 },
    );
  }
}
