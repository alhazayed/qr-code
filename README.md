# ⬡ QRTrack

A production SaaS platform for generating branded, trackable QR codes with real-time analytics.

**Live:** https://qr-code-nine-smoky.vercel.app

---

## Stack

- **Frontend / Backend:** Next.js 14 (App Router)
- **Database + Auth + Realtime:** Supabase
- **Payments:** Stripe
- **Hosting:** Vercel

---

## Features

### QR Code Generation
- Create trackable QR codes for any URL
- Each code gets a unique scan URL routed through the server
- Server-side plan enforcement (free: 3, starter: 25, pro: unlimited)
- Admin account bypasses all limits

### QR Code Designer
- 4 dot styles: Square, Rounded, Circle, Diamond
- Independent corner square + corner dot styles
- Solid color or gradient (2 colors, 4 directions)
- Custom background color
- 4 Logo/Brand QR modes:
  - Center — logo in middle
  - Tinted — dots colored from logo pixels
  - Immersed — logo bleeds through dots
  - Shaped — dots appear only within logo outline (transparent PNG)
- Text label below QR
- Export 1200×1200px PNG
- Designs saved per QR code in database

### Scan Tracking
- Every scan records: timestamp, IP, country, user agent
- Atomic scan counter via Supabase RPC
- Real-time updates via Supabase Realtime

### User Dashboard
- Auto-refresh every 30s with countdown bar
- Manual refresh button
- Per-code analytics: total / month / week / today
- Peak hour + best day + top country + week trend %
- 30-day bar chart
- 24-hour heatmap
- Country breakdown with bars
- Device type breakdown
- Full scan log

### Admin Dashboard (/admin)
- Overview: MRR, ARR, conversion rate, sparkline charts
- Users tab: all users, plan, codes, revenue per user
- Scans tab: country + device tables, hourly patterns
- Codes tab: all QR codes sorted by performance
- Accessible only to admin email

### Auth & Sessions
- Email + password via Supabase Auth
- Session persists via localStorage (survives page refresh)
- httpOnly cookie for middleware route protection
- Each user sees only their own data (Supabase RLS)

### Billing (Stripe)
- Checkout for Starter ($9/mo) and Pro ($29/mo)
- Webhook handles activation, upgrades, cancellations
- Customer Portal for self-service billing

---

## Environment Variables

Set these in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://cvzxpheodzrsjvqjkjbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_APP_URL=https://qr-code-nine-smoky.vercel.app

# Stripe (add when ready to accept payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Project Structure

```
app/
  page.tsx                    ← Landing page
  login/page.tsx              ← Sign in
  register/page.tsx           ← Sign up
  pricing/page.tsx            ← Pricing
  dashboard/page.tsx          ← User dashboard
  admin/page.tsx              ← Admin panel
  api/
    scan/[id]/route.ts        ← Records scan + redirects
    codes/route.ts            ← Creates QR code (plan-enforced)
    auth/login/route.ts       ← Sets session cookie
    auth/logout/route.ts      ← Clears session cookie
    stripe/checkout/route.ts  ← Creates Stripe checkout
    stripe/webhook/route.ts   ← Handles Stripe events
    stripe/portal/route.ts    ← Opens billing portal

components/
  CreateModal.tsx             ← New QR code form
  DetailPanel.tsx             ← QR analytics + designer trigger
  QRDesignerModal.tsx         ← Full design studio
  QRCanvas.tsx                ← Canvas renderer component
  QRCard.tsx                  ← Card in grid view

lib/
  supabase.ts                 ← Supabase client + types
  supabase-server.ts          ← Server-side Supabase helper
  qr-render.ts                ← Canvas QR rendering engine

middleware.ts                 ← Route protection
```

---

## Admin Account

- Email: `alhazayed@gmail.com`
- Plan: Pro (unlimited everything)
- Access: `/dashboard` + `/admin`
