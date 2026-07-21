# Food-Share-App

A peer-to-peer app for giving away surplus/leftover food to people nearby — free, not a marketplace.

See [PROJECT.md](./PROJECT.md) for the full spec, data models, and build order.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage)

## Getting started

```bash
npm install
cp .env.example .env.local # fill in your Supabase + Google Maps keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` needs the **Places API** and **Geocoding
API** enabled in Google Cloud Console (used for the pickup address field on
the listing form).

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
- [`0004_listing_location_privacy.sql`](./supabase/migrations/0004_listing_location_privacy.sql) —
  locks the `location` and `exact_address` columns down to the listing's
  owner (via a SECURITY DEFINER function), so browsing the public feed
  never leaks a precise pin or street address. Required before creating or
  viewing listings with the address field.

## Project structure

```
src/
  app/                    # routes (App Router)
  app/auth/actions.ts     # server actions: sign up, log in, log out, profile updates
  app/listings/           # listing CRUD pages + server actions (owner-only)
  app/browse/             # public listing browse + detail pages
  components/             # shared UI components
  components/listings/    # listing form + Places Autocomplete address field
  lib/supabase/           # Supabase client (browser + server + middleware)
  lib/format.ts           # shared display formatting (e.g. dates)
  lib/google-geocoding.ts # server-side address -> lat/lng + area label
  lib/listings.ts         # shared "public" column list for listings queries
  types/                  # shared TypeScript types, incl. database.ts (schema types)
supabase/migrations/       # SQL to run against your Supabase project
```

### Listing location privacy

`approx_location_label` (e.g. "Mission District, San Francisco") is public
and shown on `/browse`. The real coordinates and full street address are
not selectable by anon/authenticated roles at all - reading them requires
calling the `get_listing_private_location` Postgres function, which only
returns a row for the listing's owner. Milestone 5 (claims) will extend
that function to also allow an accepted claimer; see the `TODO` in
`0004_listing_location_privacy.sql`.
