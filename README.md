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

Auth and the profile page depend on a `users` table, an auto-provisioning
trigger, and an `avatars` storage bucket. Run
[`supabase/migrations/0001_users_and_avatars.sql`](./supabase/migrations/0001_users_and_avatars.sql)
once in your project's Supabase SQL editor (or via `supabase db push`)
before signing up.

## Project structure

```
src/
  app/              # routes (App Router)
  app/auth/actions.ts  # server actions: sign up, log in, log out, profile updates
  components/       # shared UI components
  lib/supabase/     # Supabase client (browser + server + middleware)
  types/            # shared TypeScript types, incl. database.ts (schema types)
supabase/migrations/  # SQL to run against your Supabase project
```
