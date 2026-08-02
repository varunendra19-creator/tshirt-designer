# Campus Mode — Go-Live & Deployment Guide

Everything needed to take the store from `localhost` to **live at https://campusmode.in**, indexed by Google. Work top to bottom; tick the checklist at the end.

> The whole app is built and safe to deploy **as-is** — with no optional keys it runs in **Cash-on-Delivery** mode with emails disabled (nothing breaks). Add the optional keys whenever you're ready.

---

## 1. Before you deploy

- [ ] **Revoke the shared Supabase `sbp_…` management token** (Supabase → Account → Access Tokens). It was only for building; production never needs it.
- [ ] **Fill in merchant details** in `src/lib/marketing.ts`: `LEGAL_ENTITY`, GSTIN, `SUPPORT_EMAIL`, `SUPPORT_PHONE` (currently placeholders used on the policy/contact pages).
- [ ] **Replace placeholder product photos** — several products use stock/pexels URLs. Edit each in **Admin → Products → Edit → Images** (first image = primary). Real photos = better conversions *and* image SEO.
- [ ] Confirm the production domain in code is correct: `SITE_URL`/`metadataBase` = `https://campusmode.in` (in `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`). Change these if the domain differs.

---

## 2. Deploy (Vercel — recommended for Next.js)

1. Push `feature/store-buildout` and merge to `main` (or deploy the branch directly).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import this Git repo.
3. Framework preset auto-detects **Next.js**. No build config needed (build: `next build`, output handled by Vercel).
4. Add the **Environment Variables** below (Production scope).
5. **Deploy.** You'll get a `*.vercel.app` URL to smoke-test before pointing the domain.

> Any host that runs Next.js 14 works (Netlify, Render, a Node server). Vercel is simplest because it's first-party.

---

## 3. Environment variables

Set these in your host's project settings (Vercel → Settings → Environment Variables). **Never commit them.**

### Required (site + DB)
| Name | Secret? | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | same page (anon/public key) |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | same page (service_role key) — server only |
| `ADMIN_EMAILS` | — | comma list of admin emails (fallback to `profiles.role`) |

### Optional — online payments (empty ⇒ COD only, UI hides "Pay online")
| Name | Secret? | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | **secret** | use `sk_test_…` first, then live |
| `STRIPE_PUBLISHABLE_KEY` | public | `pk_test_…` / `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | **secret** | from the webhook you create in step 5 |

### Optional — transactional email (empty ⇒ emails skipped, no error)
| Name | Secret? | Notes |
|---|---|---|
| `RESEND_API_KEY` **or** `BREVO_API_KEY` | **secret** | pick one provider |
| `EMAIL_FROM` | — | e.g. `Campus Mode <orders@campusmode.in>` |

---

## 4. Supabase configuration

- [ ] **Auth → URL Configuration**: set **Site URL** = `https://campusmode.in` and add it (plus your `*.vercel.app` preview URL) to **Redirect URLs**. Password-reset & email-verification links use this.
- [ ] **Auth → Providers → Email**: enable "Confirm email" if you want verification on signup. Customize the email templates (and add SMTP if you want them from your own domain).
- [ ] **Auth → Providers → Google**: enable it + add your Google OAuth client ID/secret (the Google login button is already wired; it just needs the provider on).
- [ ] All tables already have **RLS** enabled with the right policies (nothing to do). The SQL that built them is in `supabase/*.sql` for reference.

---

## 5. Stripe (only if using online payments)

- [ ] In Stripe (Test mode first) → **Developers → Webhooks → Add endpoint**:
  - URL: `https://campusmode.in/api/webhooks/stripe`
  - Events: `checkout.session.completed` (and `charge.refunded` for dashboard refunds).
  - Copy the **Signing secret** → that's `STRIPE_WEBHOOK_SECRET`.
- [ ] Test with Stripe test cards, confirm the order flips to **paid** and stock commits, then swap test keys for live keys and repeat the webhook step in Live mode.

## 5b. Email deliverability (only if using email)

- [ ] Verify your sending domain in Resend/Brevo and add the **SPF + DKIM** DNS records they give you — otherwise order/shipping emails land in spam.

---

## 6. Domain

- [ ] Point `campusmode.in` at your host (Vercel → Settings → Domains → add domain → follow the DNS/CNAME/A-record instructions).
- [ ] Confirm HTTPS is active (Vercel provisions the certificate automatically). The app already sends HSTS + security headers.

---

## 7. Google (and other search engines) — get indexed

- [ ] **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)): add `campusmode.in` as a **Domain** property, verify via DNS TXT record.
- [ ] **Submit the sitemap**: in Search Console → Sitemaps → add `https://campusmode.in/sitemap.xml`. (It already lists home, shop, sale, all `/category/*`, all `/products/*`, blog and policy pages.)
- [ ] **Request indexing** for the homepage and a few key category/product URLs (URL Inspection → Request indexing) to kick-start crawling.
- [ ] **Validate structured data**: run a product URL through the [Rich Results Test](https://search.google.com/test/rich-results) — you should see valid **Product**, **Offer**, **BreadcrumbList** (and **AggregateRating** only once real reviews exist).
- [ ] **Bing Webmaster Tools**: add the site + import from Search Console (covers Bing/DuckDuckGo).
- [ ] Optional: set up **Google Merchant Center** + a product feed if you want free Shopping listings.

`robots.txt` already allows crawling of public pages and blocks `/admin`, `/api`, `/cart`, `/checkout`, `/account`.

---

## 8. Post-launch smoke test

- [ ] Place a **COD order** end-to-end → it appears in **Admin → Orders**.
- [ ] Mark it **processing → shipped** (add tracking) → confirm the customer sees tracking on **My Account** (and gets the shipping email if email is on).
- [ ] Apply a coupon (`CAMPUS10`) at checkout → discount applies.
- [ ] Open the custom designer, add art, **Add to Cart** → design saves.
- [ ] Visit `/sitemap.xml` and `/robots.txt` on the live domain → both load.

---

## Go-live checklist (quick version)
- [ ] `sbp_` token revoked · merchant details filled · real photos in
- [ ] Deployed · env vars set · domain live on HTTPS
- [ ] Supabase Site/Redirect URLs + providers configured
- [ ] (If paid) Stripe webhook registered + tested · (If email) domain verified
- [ ] Search Console verified + sitemap submitted + rich results valid
- [ ] COD order + designer smoke-tested on the live site

Once these are ticked, you're live and crawlable. 🎉
