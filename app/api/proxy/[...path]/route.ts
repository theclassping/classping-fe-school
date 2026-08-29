import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DJANGO_API_URL = process.env.DJANGO_API_URL;

async function proxyRequest(
    request: NextRequest,
    path: string[],
) {
    if (!DJANGO_API_URL) {
        return NextResponse.json(
            {
                detail: "DJANGO_API_URL is not configured",
            },
            { status: 500 },
        );
    }

    const cookieStore = await cookies();

    const accessToken = cookieStore.get("access_token")?.value;

    console.log(
        "API PROXY:",
        request.method,
        request.nextUrl.pathname,
        "hasToken:",
        !!accessToken,
    );

    if (!accessToken) {
        return NextResponse.json(
            {
                detail: "Authentication credentials were not provided.",
            },
            { status: 401 },
        );
    }

    const djangoUrl =
        `${DJANGO_API_URL}/api/${path.join("/")}/` +
        request.nextUrl.search;

    console.log("Forwarding to:", djangoUrl);

    const headers = new Headers();

    headers.set(
        "Authorization",
        `Bearer ${accessToken}`,
    );

    const contentType =
        request.headers.get("content-type");

    if (contentType) {
        headers.set("Content-Type", contentType);
    }

    const body =
        request.method === "GET" ||
            request.method === "HEAD"
            ? undefined
            : await request.arrayBuffer();

    try {
        const response = await fetch(djangoUrl, {
            method: request.method,
            headers,
            body,
            cache: "no-store",
        });

        console.log(
            "Django response:",
            response.status,
            request.method,
            request.nextUrl.pathname,
        );

        const responseBody =
            await response.arrayBuffer();

        const responseHeaders = new Headers();

        const responseContentType =
            response.headers.get("content-type");

        if (responseContentType) {
            responseHeaders.set(
                "Content-Type",
                responseContentType,
            );
        }

        return new NextResponse(responseBody, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (error) {
        console.error(
            "API proxy error:",
            error,
        );

        return NextResponse.json(
            {
                detail: "Unable to connect to Django API",
            },
            { status: 502 },
        );
    }
}

export async function GET(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function POST(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function PUT(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function PATCH(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function DELETE(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}
