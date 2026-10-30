# Deployment Guide - Vercel

This is a complete guide to deploy **WACRM** on Vercel.

## Prerequisites

Before deploying, you need:

1. **Vercel Account** — Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account** — Your code must be on GitHub (it already is at `parthkavad54/WACRM`)
3. **Supabase Project** — Database & authentication backend
4. **Meta App** — WhatsApp Business API credentials
5. **Encryption Key** — For securing WhatsApp tokens

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your credentials from **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (keep secret!)
3. Run all migrations from `supabase/migrations/` directory in Supabase SQL editor

## Step 2: Generate Encryption Key

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output — this is your `ENCRYPTION_KEY`.

## Step 3: Get Meta App Credentials

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create or select your app
3. Get your `META_APP_SECRET` from **App Settings → Basic**

## Step 4: Deploy on Vercel

### Option A: Connect GitHub (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Paste your GitHub repo: `https://github.com/parthkavad54/WACRM.git`
4. Click **Import**
5. Set up environment variables (next step)
6. Click **Deploy**

### Option B: Deploy via CLI

```bash
npm install -g vercel
vercel login
cd c:\Users\HELLO\Desktop\projects\wacrm
vercel
```

## Step 5: Configure Environment Variables

In Vercel Dashboard → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ENCRYPTION_KEY` | Generated 64-char hex key |
| `META_APP_SECRET` | Your Meta app secret |
| `NEXT_PUBLIC_SITE_URL` | Your Vercel domain (e.g., `https://wacrm.vercel.app`) |

**Important:** Make sure `SUPABASE_SERVICE_ROLE_KEY` is added as a **Secret** (locked icon), not a public variable.

## Step 6: Configure WhatsApp Webhook

After deployment:

1. Get your Vercel domain (e.g., `https://wacrm-parthkavad54.vercel.app`)
2. In Meta for Developers → App Settings → Webhooks:
   - **Callback URL:** `https://your-domain.com/api/whatsapp/webhook`
   - **Verify Token:** Any random string (save it)
3. Add to Vercel environment variables:
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — The token you just created

## Step 7: Test the Deployment

Once deployed:

1. Visit your Vercel domain
2. Sign up a new account
3. Go to **Settings → WhatsApp Config**
4. Paste your WhatsApp credentials
5. Test by sending a WhatsApp message to your number

## Troubleshooting

### Build Fails
- Check that all dependencies installed locally with `npm install`
- Verify Node.js version matches: `"engines": { "node": ">=20.0.0" }`

### Environment Variables Not Working
- Make sure variables are added in Vercel Dashboard, not just locally
- Redeploy after adding variables: Click **Deployments → Select latest → Redeploy**

### WhatsApp Webhook Not Triggering
- Verify callback URL is correct (check Vercel logs)
- Confirm `META_APP_SECRET` matches your Meta app
- Check that `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches Meta configuration

### Database Connection Failed
- Confirm `NEXT_PUBLIC_SUPABASE_URL` and keys are correct
- Check that Supabase project is active
- Verify migrations have been run

## Useful Commands

```bash
# View Vercel deployment logs
vercel logs

# Set environment variable locally (for testing)
$env:NEXT_PUBLIC_SUPABASE_URL="your-url"

# Build locally to test
npm run build

# Start production build locally
npm run start
```

## Production Checklist

- [ ] Supabase project created and configured
- [ ] All migrations applied to database
- [ ] Encryption key generated
- [ ] Meta app credentials obtained
- [ ] Environment variables set in Vercel
- [ ] GitHub repository linked to Vercel
- [ ] Domain configured (custom or Vercel default)
- [ ] WhatsApp webhook configured
- [ ] Test signup and WhatsApp message
- [ ] Check error logs in Vercel Dashboard

## Next Steps

After deployment:

1. Set a custom domain in Vercel **Settings → Domains**
2. Enable auto-redeployments on GitHub push
3. Set up monitoring: Vercel Analytics, error tracking (Sentry optional)
4. Back up Supabase regularly

For more help, see Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
