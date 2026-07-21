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
- [`0005_claims.sql`](./supabase/migrations/0005_claims.sql) — `claims`
  table, RLS, and the `accept_claim` function that also flips the listing
  to `claimed` and declines competing requests. Extends
  `get_listing_private_location` to also allow an accepted claimer.
  Required before requesting a listing.
- [`0006_fix_public_listings_policy.sql`](./supabase/migrations/0006_fix_public_listings_policy.sql) —
  idempotently re-applies the `0003` public-read policy. Run this if
  `/browse` only ever shows the signed-in viewer's own listings.
- [`0007_fix_listings_claims_recursion.sql`](./supabase/migrations/0007_fix_listings_claims_recursion.sql) —
  breaks a circular RLS dependency between `listings` and `claims`
  (each had a policy querying the other) by moving the cross-table checks
  into `SECURITY DEFINER` functions. Run this if creating a listing fails
  with "infinite recursion detected in policy for relation listings".
- [`0008_notifications.sql`](./supabase/migrations/0008_notifications.sql) —
  `notifications` table + RLS, and triggers on `claims` that create a
  notification when a listing is requested (owner notified) and when a
  request is accepted or declined (claimer notified). Required before the
  notification bell in the nav will show anything.

## Project structure

```
src/
  app/                    # routes (App Router)
  app/auth/actions.ts     # server actions: sign up, log in, log out, profile updates
  app/listings/           # listing CRUD pages + server actions (owner-only)
  app/listings/[id]/requests/ # owner's incoming requests for one listing
  app/browse/             # public listing browse + detail pages (+ "Request" action)
  app/requests/           # claimer's "my requests" page
  app/claims/actions.ts   # server actions: request, accept, decline
  app/notifications/      # notifications page + "mark read" action
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
returns a row for the listing's owner or (as of 0005_claims.sql) a claimer
whose request has been accepted.

### Claim flow

A signed-in, non-owner visitor can request an active listing from
`/browse/[id]`. The owner sees incoming requests at
`/listings/[id]/requests` and can accept or decline; accepting flips the
listing to `claimed` and auto-declines any other pending requests on it
(via the `accept_claim` Postgres function, so both writes are atomic).
Claimers track their requests at `/requests`.

### Notifications

Notification rows are created entirely by Postgres triggers on
`claims` (request -> notify owner, accept/decline -> notify claimer) -
there's no client-side insert path (`notifications` has no INSERT policy;
only the trigger functions, running SECURITY DEFINER, can write to it).
The bell in the nav shows an unread count read on each page load; there's
no realtime subscription, by design - clicking a notification marks it
read and navigates to the linked claim/listing in one step.
