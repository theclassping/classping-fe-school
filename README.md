# ClassPing School Portal

The React/Next.js school portal for ClassPing. Its dashboard UI is migrated from
the approved prototype in `classping-frontend/classping-school`, while the
existing API proxy remains the integration point for the Django backend.

## Getting started

Install dependencies, copy the environment template, and run the development
server:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a school
user account. Auth cookies are set by the server-side login route; authenticated
browser requests then use `/api/proxy/*` so backend credentials are never
exposed to client-side code.

For local UI review without an account, set `SCHOOL_PROTOTYPE_PREVIEW=true`.
This bypass is accepted only by the development server; production builds still
require authentication.

## Migrated routes

- `/dashboard` — responsive overview, priorities, weekly worktime, and summaries
- `/dashboard/students` — backend-connected student management
- `/dashboard/activities` — prototype activity workflow
- `/dashboard/assessment` — prototype assessment workflow
- `/dashboard/payments` — backend-connected payment list plus recording dialog
- `/dashboard/profile` — editable school profile prototype
- `/dashboard/settings` — backend-connected staff, class, and user settings

Profile settings, notifications, prototype activities, assessment entries, and
weekly worktime are currently persisted in browser storage. They are structured
as React components so each can be replaced with its matching backend endpoint
without another UI rewrite.

## Quality checks

```bash
npm run lint
npm run build -- --webpack
```

## Deploy on Vercel

1. Import `theclassping/classping-fe-school` into Vercel.
2. Set `DJANGO_API_URL` for each Vercel environment. For development/staging,
   use `https://classping-backend-development.onrender.com`.
3. Keep the framework preset as Next.js and deploy.
4. Verify login, `/dashboard/students`, and `/dashboard/payments` against the
   selected backend environment.

Do not prefix `DJANGO_API_URL` with `NEXT_PUBLIC_`; it is server-only.
