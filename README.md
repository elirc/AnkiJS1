# Recall

Recall is a local-first spaced-repetition PWA with quick capture, inbox triage, and offline study. IndexedDB is the source of truth on the device; Supabase is an optional sync target.

## Run locally

```bash
npm install
npm run dev
```

The app works without Supabase credentials in local-only mode.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor or via the Supabase CLI.
3. Enable email OTP magic links in Supabase Auth.
4. Copy `.env.example` to `.env` and set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Scripts

```bash
npm run dev
npm test
npm run build
npm run preview
```

## Deploy

Build with `npm run build` and deploy `dist/` to any static host. Service workers and the share target require HTTPS outside local development.

## Notes

- Capture, study, rating, undo, export, and import all operate on local IndexedDB.
- Sync is disabled when signed out or when Supabase env vars are absent.
- The PWA manifest includes a GET share target at `/capture`.
