# Food-Share-App

A peer-to-peer app for giving away surplus/leftover food to people nearby — free, not a marketplace.

See [PROJECT.md](./PROJECT.md) for the full spec, data models, and build order.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage)

## Getting started

```bash
npm install
cp .env.example .env.local # fill in your Supabase project URL + anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Database setup

Run each migration once, in order, in your project's Supabase SQL editor
(or via `supabase db push`), before using the corresponding feature:

- [`0001_users_and_avatars.sql`](./supabase/migrations/0001_users_and_avatars.sql) —
  `users` table, an auto-provisioning trigger, and an `avatars` storage
  bucket. Required before signing up.
- [`0002_listings.sql`](./supabase/migrations/0002_listings.sql) — `listings`
  table and a `listing-photos` storage bucket. Required before creating
  listings.
- [`0003_public_active_listings.sql`](./supabase/migrations/0003_public_active_listings.sql) —
  lets anyone (not just the owner) read `active` listings. Required
  before `/browse` will show anything.

## Project structure

```
src/
  app/                 # routes (App Router)
  app/auth/actions.ts  # server actions: sign up, log in, log out, profile updates
  app/listings/        # listing CRUD pages + server actions (owner-only)
  app/browse/          # public listing browse + detail pages
  components/          # shared UI components
  lib/supabase/        # Supabase client (browser + server + middleware)
  lib/format.ts        # shared display formatting (e.g. dates)
  types/               # shared TypeScript types, incl. database.ts (schema types)
supabase/migrations/    # SQL to run against your Supabase project
```
