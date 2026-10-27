# RootLand – launch steps

The store runs on your self-hosted Supabase (Coolify): customer accounts, orders, stock, reviews and the admin.
Every order is cash on delivery; nothing is paid online.

## 1. Account emails (required before customers sign up)
Sign-up confirmation and "forgot password" emails need a mailbox that can send (SMTP).
In Coolify → the Supabase service → **Environment Variables**, set:

| Variable | Value |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | from your email provider |
| `SMTP_ADMIN_EMAIL` | the sender address, e.g. info@rootland.store |
| `SMTP_SENDER_NAME` | RootLand |
| `GOTRUE_SITE_URL` | https://rootland.store |
| `ADDITIONAL_REDIRECT_URLS` | `https://rootland.store/**,http://localhost:3000/**` |

Leave `ENABLE_EMAIL_AUTOCONFIRM` off. Staff access only works for confirmed emails, so turning it on would let anyone claim a staff email.
Click **Redeploy**, then create a test account on the site and check the confirmation email arrives.

## 2. Your owner account
`rootland.store@gmail.com` is already the owner in Staff.
- After step 1: on the site, **Sign in → Create account** with that email, open the confirmation link, then go to `/admin`.
- Before step 1 works: Supabase Studio → **Authentication → Users → Add user → Create new user**, enter the email and a strong password, tick **Auto Confirm User**, then sign in at `/admin`. This confirms that one account only.

## 3. Database (already done)
Applied: `supabase/migrations/20261026120000_rootland_store.sql`, `20261026130000_coupon_rule.sql`, `20261026140000_review_fit_vote.sql`, `20261027120000_scroll_speed.sql`, and `supabase/seed.sql` (2 hoodies, stock copied from the old Firebase store, store settings).
For later changes, run new files from `supabase/migrations/` in Studio → **SQL Editor**, in name order.

## 4. Check the store settings (Admin → Store settings)
- Scroll speed (mouse wheel and trackpad; 25% of normal now)
- WhatsApp number, phone, contact email and social links
- Delivery fee and delivery time for each of the 27 governorates (from your Bosta account)
- Free delivery threshold (3,000 EGP now)
- Pre-orders on or off, open pre-orders per size, and the pre-order notes
- Meta Pixel, TikTok Pixel and GA4 IDs (empty = off)
- Click **Save settings**

## 5. Add your team (Admin → Staff)
Enter each person's email and a role: Owner, Orders team, Content team or Marketing team.
They create an account with that email (or sign in) and confirm it; their access starts the next time they open `/admin`.

## 6. Put the site live
Build on a computer that has `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (they are built into the site):
`npm install --legacy-peer-deps` then `npm run build`.
Netlify → your site → **Deploys** → drag the `dist` folder onto the page. Routing is already set up (`_redirects`).

## 7. Test before announcing
1. As a guest, place a cash-on-delivery order. Check the confirmation page, then track it with the order number and mobile number.
2. Create an account, place an order while signed in, and check it under **Account → Orders**. Change your password on the account page.
3. Use **Forgot password** in the sign-in window, open the email link and set a new password.
4. Admin → Orders: move an order through Confirmed → Preparing → With the courier (add the Bosta tracking number) → Delivered. Cancel another order and check its stock comes back in Inventory.
5. Admin → Discount codes: create a code and use it at checkout.
6. Check the site in Arabic and English on a phone.

## Not included yet
- **Online payment (Paymob):** needs a small server function that keeps the Paymob secret keys; postponed.
- **Emails to you for new orders:** keep `/admin` open, new orders appear live with a notice.
- **Continue with Google:** needs Google OAuth keys in Coolify (`GOTRUE_EXTERNAL_GOOGLE_*`).
