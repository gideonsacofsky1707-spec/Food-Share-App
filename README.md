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
- [`0009_messages.sql`](./supabase/migrations/0009_messages.sql) —
  `messages` table + RLS scoped to accepted-claim participants, and a
  trigger that notifies whichever participant didn't send a given
  message. Required before the chat on `/claims/[id]` will work.
- [`0010_enable_realtime.sql`](./supabase/migrations/0010_enable_realtime.sql) —
  adds `messages` and `notifications` to the `supabase_realtime`
  publication (idempotently). Required before the chat thread and the nav
  bell update live instead of only on page load.
- [`0011_realtime_function_grants.sql`](./supabase/migrations/0011_realtime_function_grants.sql) —
  broadens `user_is_accepted_claim_participant`'s EXECUTE grant to
  `anon`. A debugging hardening step, not expected to change behavior on
  its own - see "Debugging a stalled subscription" below.
- [`0012_ensure_realtime_publication.sql`](./supabase/migrations/0012_ensure_realtime_publication.sql) —
  `0010`'s `ALTER PUBLICATION` turned out not to have taken effect
  (confirmed via the `pg_publication_tables` query below coming back
  completely empty). This creates the `supabase_realtime` publication if
  it doesn't exist at all, then adds `messages`/`notifications` - covers
  both possible explanations without needing to know which one it was.
- [`0013_map_pins.sql`](./supabase/migrations/0013_map_pins.sql) —
  `get_active_listing_map_pins()`, a public `SECURITY DEFINER` function
  returning *rounded* coordinates (~111m) for every active listing.
  Required before `/browse`'s map view will show any pins.
- [`0014_ratings.sql`](./supabase/migrations/0014_ratings.sql) — `ratings`
  table + RLS, `mark_claim_collected()` (either party flips an accepted
  claim to `completed` and the listing to `collected`), and a trigger that
  keeps `users.rating_avg`/`rating_count` in sync. Also widens
  `user_is_accepted_claim_participant()` and
  `get_listing_private_location()` to cover `completed` claims, not just
  `accepted` ones. Required before "Mark as collected" on `/claims/[id]`
  or rating counts on `/profile` will work.
- [`0015_reports_and_blocks.sql`](./supabase/migrations/0015_reports_and_blocks.sql),
  [`0016_report_history_and_admin.sql`](./supabase/migrations/0016_report_history_and_admin.sql) —
  reporting/blocking + a minimal admin/ban system.
- [`0017_push_subscriptions.sql`](./supabase/migrations/0017_push_subscriptions.sql) —
  `push_subscriptions` table for real Web Push (see "Push notifications"
  below). Required before `PushPermissionPrompt` can store a subscription.
- [`0018_reensure_realtime_publication.sql`](./supabase/migrations/0018_reensure_realtime_publication.sql) —
  re-applies `0012`: the Replication page in the dashboard was found
  showing no tables in `supabase_realtime` at all, despite `0012` existing
  specifically to make that state impossible to end up in from a code
  change. Same idempotent create-publication-if-missing /
  add-table-if-missing logic as `0012` - see "Debugging a stalled
  subscription" below for what could put a project back in that state
  outside of the migrations themselves.

## Project structure

```
src/
  app/                       # routes (App Router)
  app/auth/actions.ts        # server actions: sign up, log in, log out, profile updates
  app/listings/               # listing CRUD pages + server actions (owner-only)
  app/listings/[id]/requests/ # owner's incoming requests for one listing
  app/browse/                 # public listing browse + detail pages (+ "Request" action)
  app/requests/                # claimer's "my requests" page
  app/claims/actions.ts       # server actions: request, accept, decline, send message
  app/claims/[id]/             # chat thread for one accepted claim
  app/notifications/           # notifications page + "mark read" action
  components/                  # shared UI components
  components/listings/         # listing form + Places Autocomplete address field
  components/browse/           # list/map toggle, list view, map view (List/Map on /browse)
  components/google-maps-script.tsx      # shared <script> loader (Autocomplete + map both use it)
  components/claims/chat-thread.tsx     # client component: live message list
  components/notification-bell.tsx      # client component: live unread badge
  lib/supabase/               # Supabase client (browser + server + middleware)
  lib/format.ts               # shared display formatting (e.g. dates)
  lib/google-geocoding.ts     # server-side address -> lat/lng + area label
  lib/listings.ts             # shared "public" column list for listings queries
  types/                      # shared TypeScript types, incl. database.ts (schema types)
supabase/migrations/          # SQL to run against your Supabase project
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
The nav's `NotificationBell` (a client component; `NavHeader` itself stays
a server component and passes it the server-computed initial count) shows
the unread count and subscribes to `postgres_changes` INSERT events
scoped to `user_id=eq.<current user>`, incrementing live as new
notifications arrive - no polling. Clicking a notification marks it read
and navigates to the linked claim/listing in one step.

### Mobile nav

`NavHeader` builds its link list once and renders it twice: a `hidden
sm:flex` row for wider screens, and inside `MobileNavToggle` (a client
component, `src/components/mobile-nav-toggle.tsx`) for narrow ones - a
hamburger button that reveals the same links stacked in a dropdown,
closing itself on either another click or a link tap. `NotificationBell`
is rendered exactly once, outside both variants, so toggling between
layouts at the `sm` breakpoint never opens a second realtime subscription
for the same user.

### Map view

`/browse` has a List/Map toggle (`BrowseViewToggle`, client-side state
only - the list itself is rendered server-side and passed in as an
already-resolved prop, so it's never re-hydrated and can't hit the
timezone-hydration bug `ChatThread` did). Map view (`ListingsMap`) plots
a pin per active listing using the Google Maps JS API, clustering nearby
pins via `@googlemaps/markerclusterer`; clicking an individual pin shows
a preview card (photo, title, quantity) linking to `/browse/[id]`.

On mount, `ListingsMap` tries `navigator.geolocation.getCurrentPosition()`
(5s timeout) to center on the viewer's device location at a
neighborhood-level zoom; if that's denied, times out, or the browser
doesn't support it, it falls back to the average of the currently-shown
pins' coordinates, and only falls back further to a hardcoded
center-of-the-US at a country-wide zoom if there are no pins either. This
resolves before the map is constructed, so the initial view is never the
old flash-of-the-whole-country default. (If there are 2+ pins, `fitBounds`
still runs afterward as before, zooming to fit every currently-shown pin -
unrelated to and unaffected by this.)

Pins use **rounded** coordinates (~111m, `round(lat/lng, 3)`), not the
real ones - PROJECT.md is explicit that map view should show
"approximate pins (exact address hidden until claimed)", and raw lat/lng
is exactly as precise as a street address. `get_active_listing_map_pins()`
is `SECURITY DEFINER` (same reason as `get_listing_private_location`:
`location` is column-revoked from anon/authenticated) but unlike that
function, it's callable by anyone and only ever returns the rounded
version, for every active listing rather than gating on
ownership/acceptance.

`AddressAutocomplete` and `ListingsMap` share one script loader
(`GoogleMapsScript`, fixed `id="google-maps-js"`) rather than each
injecting their own `<script src="…api/js">` tag - Google's JS API logs
a warning (and can misbehave) if it's ever loaded more than once on the
same page, which would otherwise happen the moment a user navigates
between a listing form and `/browse` within one session.

### Chat

`/claims/[id]` is a simple thread tied to one accepted claim - reachable
from wherever the pickup address is shown (`/requests`, the listing
owner's `/listings/[id]/requests`, and `/browse/[id]` for the claimer).
Access is gated the same way as location privacy: a
`user_is_accepted_claim_participant()` SECURITY DEFINER function (same
escape hatch as `user_owns_listing`/`user_has_claim_on_listing`) backs
both the SELECT and INSERT policies on `messages`, so only the claimer or
the listing's owner can read or post in a given claim's thread, and only
once it's `accepted` or `completed` (widened from just `accepted` by
0014_ratings.sql, so the thread doesn't disappear the moment either party
marks it collected). The message list (`ChatThread`, a client component)
subscribes to `postgres_changes` INSERT events scoped to
`claim_id=eq.<this claim>` and appends new messages live; sending is still
a plain server action + redirect, so no client-side send logic is needed.

#### Realtime relies on RLS - don't relax it to "fix" a subscription

Supabase Realtime's `postgres_changes` re-checks each change against the
*same* SELECT policies as a normal query, using the subscribing client's
JWT. Neither policy needed to change for this to be safe - both were
already scoped to `auth.uid()` before realtime existed for these tables
(`user_id = auth.uid()` on `notifications`,
`user_is_accepted_claim_participant(claim_id, auth.uid())` on `messages`).
If a subscription ever seems to "not receive" an update, the fix is almost
always that the row genuinely isn't visible to that user under RLS (check
with the same query a normal page load would run) - not to loosen the
policy, which would leak other users' rows to every subscriber instead.

#### Debugging a stalled subscription

`ChatThread` and `NotificationBell` both log their subscription status
(`console.log("[chat-thread] subscription status:", ...)` /
`[notification-bell] ...`) - open the browser console and look for
`SUBSCRIBED` after the page loads. Anything else (`CHANNEL_ERROR`,
`TIMED_OUT`) means the channel never actually attached, and the logged
`err` usually says why. These are marked `// TEMP debug logging` and
should come back out once live delivery is confirmed working end to end.

If the status never even logs, or logs `CHANNEL_ERROR` with no useful
detail, check from the database side - run in the SQL editor:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
```

`messages` and `notifications` should both be listed (that's what
`0010_enable_realtime.sql` adds). If either is missing, that migration
was never applied - Realtime otherwise never broadcasts changes for that
table at all, no matter how correct the RLS or the client code is.

**If the publication comes back completely empty again** (not just
missing these two tables - the Replication page showing nothing at all),
re-run `0018_reensure_realtime_publication.sql`. Nothing in this repo's
own migrations (`0013`-`0017`) touches `supabase_realtime` or
drops/recreates the `messages`/`notifications` tables, so a code change
in this repo isn't a plausible explanation for that on its own - a table
being dropped and recreated does silently drop its publication
membership, but that hasn't happened here per the migration history.
More likely causes, in roughly descending order of likelihood:

1. `0012` (or now `0018`) was written/documented but never actually
   executed against the live project - the same gap this project has hit
   before with other "documented in a migration file, not yet run
   against Supabase" and "documented in `.env.example`, not yet set in
   Vercel" steps. Worth treating as the default explanation until ruled
   out, since it requires no external event at all.
2. Someone toggled a table off (or the whole publication) from the
   dashboard's Database -> Replication UI - that writes `ALTER
   PUBLICATION ... DROP TABLE` (or drops the publication) directly,
   completely outside of migration history, so it wouldn't show up in
   `git log` no matter how carefully you look.
3. The project was restored from a backup/PITR snapshot, or paused and
   resumed, from a point before `0012` had been applied - restoring
   database *contents* doesn't necessarily restore custom Realtime
   publication config the same way, depending on how the restore was
   performed.

There's no way to tell these apart from the SQL migration history alone -
Supabase's dashboard/project activity log (Settings -> ... or contacting
Supabase support for the project's audit log, if available on the plan)
is the only place that would show *which* of these actually happened.

### Ratings

Either the listing owner or the claimer can mark an `accepted` claim
collected from `/claims/[id]` (`MarkCollectedForm`, confirm-before-submit
like `DeleteListingForm`) - `mark_claim_collected()` flips the claim to
`completed` and the listing to `collected` together, and notifies
whichever of the two didn't click it. Once `completed`, each participant
who hasn't yet rated the other sees `RatingForm` (1-5 stars + optional
comment) in place of it; whoever already has just sees their own score
back. "Open chat" links on `/requests` and `/listings/[id]/requests`
relabel to "Open chat & rate" once completed, so there's a durable way
back to that prompt beyond the one-time notification.

Rating access is gated by `claim_other_participant()`, a `SECURITY
DEFINER` function that returns the *other* side of a claim only once it's
`completed` - a rating's INSERT policy requires `ratee_id` to equal that
function's result for the current claim and rater, which in one check
enforces the claim is actually done, the rater was actually part of it,
and the ratee is actually the other participant (not an arbitrary user).
"Only one rating per person per claim" is a plain unique index on
`(claim_id, rater_id)`, not an app-level check - a duplicate insert fails
with a Postgres unique-violation (`23505`), which `submitRatingAction`
turns into a plain error message the same way `requestClaimAction` does
for double-claiming a listing.

`users.rating_avg`/`rating_count` (shown on `/profile`) are maintained by
a trigger on `ratings` that recomputes both from every row for that
`ratee_id` after each insert - not incremented in place - so they can
never drift out of sync with the underlying ratings even if a row were
ever corrected or removed by hand later.
