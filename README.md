# VidyaNova

VidyaNova is a local AIML department ERP and placement-preparation prototype. It combines student and faculty workspaces with a basic administrator overview.

## Run locally

Use Node.js 22.18+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. Sign in with one of the [sample accounts](DEMO_ACCOUNTS.md). Use the USN or staff ID and the fictional date of birth in YYYY-MM-DD format. Sign out before switching accounts. Faculty assignments and assessments are scoped to the selected section. Reload to see changes from another browser session.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Use `npm run dev` for the frontend and API together. After a build, `npm run preview` also serves the local API. Static-only hosting cannot authenticate users because sign-in and persistence require the Node server.

## Source layout

- `src/features/` contains student, quiz, coding, faculty and authentication screens.
- `src/components/` contains shared cards, tables, progress bars and dialogs.
- `src/services/` contains the domain models, API contracts, service adapters, seed data and in-memory Zustand state. The local API is in `server/api.ts`.
- `src/main.tsx` defines the routes, role guards and shared workspace navigation.

## Demonstration scope

Five student accounts and two staff accounts share a local Node server. The server uses an HTTP-only session cookie, checks account roles, and stores records separately by account in `.vidyanova-data/records.json` by default. Set `VIDYANOVA_DATA_DIR` to test against another data directory. Login sessions expire or end when the server restarts. Test attempts use an absolute, persisted deadline. Assignment, resume and reference-file uploads store filenames only. Coding Lab uses local Monaco assets and a deterministic simulated judge. It never executes a submission. The academic SGPA uses equal subject weights.

Figma's Starter-plan rate limit prevented a standalone original-logo export and limited screenshot verification. The application therefore uses the VidyaNova wordmark and styles the existing screens from available Figma screenshots and layer metadata. A supplied logo can be installed as `public/vidyanova-logo.png` with `VITE_BRAND_LOGO_URL=/vidyanova-logo.png` in `.env.local`.

## Backend integration

`VITE_API_URL` in `.env.example` reserves the service URL. The bundled account API is intended for local testing. Use stronger credentials or institutional sign-in and a transactional database before deployment. A production deployment requires server-side authentication and authorization, multi-student records, durable upload storage, authoritative assessment deadlines and submission idempotency, and an isolated code-judge service. Keep authentication credentials and sensitive academic records out of browser storage.
