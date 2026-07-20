# Food Share App — Project Spec

## 1. Concept
A peer-to-peer app for people to give away surplus/leftover food to others nearby — free, not a marketplace. Think: someone made too much soup, has extra garden vegetables, or is moving and needs to clear out their pantry.

**Core loop:** User posts a listing → nearby users browse/discover it → someone claims it → both parties arrange pickup via in-app chat → item marked collected → optional rating.

## 2. Tech Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Next.js API routes (or Supabase Edge Functions if logic grows)
- **Database + Auth + Storage:** Supabase (Postgres + PostGIS for geo queries, built-in Auth, Storage for photos)
- **Maps:** Mapbox GL JS (or Google Maps JS SDK)
- **Hosting:** Vercel (frontend) + Supabase (backend/db)
- **Notifications:** Web Push (via Supabase + service worker) for MVP; native push later if the app is wrapped/rebuilt natively

## 3. Data Models

### users
- id (uuid, PK, matches Supabase auth.users.id)
- display_name (text)
- avatar_url (text, nullable)
- phone (text, nullable, for optional verification)
- created_at (timestamp)
- rating_avg (numeric, default 0)
- rating_count (integer, default 0)
- is_verified (boolean, default false)

### listings
- id (uuid, PK)
- owner_id (uuid, FK → users)
- title (text)
- description (text)
- photo_url (text)
- quantity (text, e.g. "serves 4", "1 bag")
- best_by (timestamp, nullable)
- pickup_window_start (timestamp)
- pickup_window_end (timestamp)
- location (geography point, via PostGIS)
- approx_location_label (text, e.g. neighborhood name — shown before claim)
- exact_address (text, nullable — revealed only after claim is accepted)
- status (enum: active, claimed, collected, expired, removed)
- created_at (timestamp)

### claims
- id (uuid, PK)
- listing_id (uuid, FK → listings)
- claimer_id (uuid, FK → users)
- status (enum: requested, accepted, declined, completed, cancelled)
- created_at (timestamp)

### messages
- id (uuid, PK)
- claim_id (uuid, FK → claims)
- sender_id (uuid, FK → users)
- body (text)
- created_at (timestamp)

### ratings
- id (uuid, PK)
- claim_id (uuid, FK → claims)
- rater_id (uuid, FK → users)
- ratee_id (uuid, FK → users)
- score (integer, 1-5)
- comment (text, nullable)
- created_at (timestamp)

### reports
- id (uuid, PK)
- reporter_id (uuid, FK → users)
- reported_user_id (uuid, FK → users, nullable)
- reported_listing_id (uuid, FK → listings, nullable)
- reason (text)
- status (enum: open, reviewed, resolved)
- created_at (timestamp)

## 4. Core User Flows

**Sign up / login**
- Email or phone-based auth via Supabase Auth
- Set display name + optional avatar on first login

**Create a listing**
- Upload photo, add title/description, quantity, best-by date, pickup window, approximate location (auto-filled from device location, editable)
- Publish → status = active

**Browse listings**
- List view (default) sorted by distance/recency
- Map view showing approximate pins (exact address hidden until claimed)
- Filter by distance radius

**Claim a listing**
- Tap "Request" → creates a claim (status: requested)
- Owner accepts/declines
- On accept: exact pickup address revealed to claimer, in-app chat opens

**Arrange pickup**
- Simple threaded chat tied to the claim
- Either party can cancel

**Complete + rate**
- Owner or claimer marks as collected
- Both parties prompted to rate each other (1-5 stars + optional comment)

**Report/block**
- Report button on any listing or user profile
- Blocked users don't see each other's listings

## 5. Trust & Safety Requirements (non-negotiable for MVP)
- Terms of Service + liability waiver acceptance required at signup ("food shared at your own risk")
- Food safety guidance shown inline when creating a listing (don't list food left at room temp >2 hrs, label allergens if known, etc.)
- Exact address never shown publicly — only after a claim is accepted
- Reporting/blocking must ship in v1, not be deferred

## 6. Build Order (for Claude Code sessions — one milestone per session)
1. Project scaffold: Next.js + TypeScript + Tailwind + Supabase connection
2. Auth: sign up, login, profile creation/edit
3. Listings: create, edit, delete, list view of own listings
4. Browse: public list view of active listings sorted by distance (basic list first, no map yet)
5. Claim flow: request → accept/decline → status updates
6. Messaging: simple chat tied to a claim
7. Map view: replace/augment list view with Mapbox pins
8. Ratings: post-collection rating flow, display avg rating on profile
9. Reporting/blocking
10. Polish: PWA manifest, push notifications, empty states, loading states

## 7. Out of Scope for MVP
- Payments (this app is donation/free-sharing only)
- Business/restaurant accounts (peer-to-peer only for v1)
- Native mobile apps (PWA first; native later if validated)
- Delivery/courier integration
