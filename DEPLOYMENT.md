# AI SOFT STUDIO — Render Deployment

This repository is deployed as a Next.js application on Render. Keep the existing Render service connected to the `main` branch.

## Render service

- Service: `aisoftstudio12`
- URL: https://aisoftstudio12.onrender.com
- Build command: `bun install && bun run build`
- Start command: `bun run start`
- Runtime: Node.js 20+

Do not switch this service to the legacy Express/Vite `server.ts`; the deployed application uses Next.js route handlers under `app/api`.

## Required environment variables

Configure these in Render → service → Environment. Never paste secret values into source control or chat.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin database access |
| `OPENAI_API_KEY` | AI responses for website chat, API and WhatsApp |
| `OPENAI_MODEL` | Optional model override; default is `gpt-4o-mini` |
| `META_APP_ID` | Meta app ID (server) |
| `META_APP_SECRET` | Meta app secret (server only) |
| `META_EMBEDDED_SIGNUP_CONFIG_ID` | Embedded Signup config ID (server) |
| `META_WEBHOOK_VERIFY_TOKEN` | Random verification token configured in Meta Webhooks |
| `WHATSAPP_TOKEN_ENCRYPTION_KEY` | 32-byte key encoded as 64 hex characters or base64 |
| `NEXT_PUBLIC_META_APP_ID` | Same Meta app ID, used by Facebook JS SDK |
| `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | Same Embedded Signup config ID, used by browser |
| `META_GRAPH_API_VERSION` | Optional; defaults to `v23.0` |
| `NEXT_PUBLIC_META_GRAPH_API_VERSION` | Browser SDK version; defaults to `v23.0` |

For billing, add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Payment orders are not activated until a signed Razorpay webhook confirms capture.

## Supabase

The application uses Supabase Auth and tenant-scoped tables. Each customer is assigned a separate organization/workspace. Row Level Security is enabled on tenant data. The service-role key is server-only and must never use a `NEXT_PUBLIC_` prefix.

The agency data model includes AI bots, knowledge sources, leads, subscriptions, plans, payments, API keys, automation flows/runs, audit logs, WhatsApp connections and encrypted connection secrets.

New Auth users are provisioned with a workspace and owner membership by the database trigger. Platform roles are stored in `public.profiles.role`; `admin` is the platform administrator role.

## Meta webhooks

Configure the WhatsApp webhook callback as:

`https://aisoftstudio12.onrender.com/api/whatsapp/webhook`

Use the exact value of `META_WEBHOOK_VERIFY_TOKEN` as the Meta verify token. Subscribe the Meta app to the WhatsApp `messages` field. The webhook validates Meta's `X-Hub-Signature-256` using `META_APP_SECRET`, routes events by Phone Number ID, and reads the encrypted customer token server-side.

The Embedded Signup button requires both `NEXT_PUBLIC_META_APP_ID` and `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`. Server-side code exchange also requires `META_APP_ID`, `META_APP_SECRET`, and `META_EMBEDDED_SIGNUP_CONFIG_ID`.

## Razorpay webhook

Configure the webhook callback as:

`https://aisoftstudio12.onrender.com/api/webhooks/payment`

Subscribe to `payment.captured` and `order.paid`. Set the same webhook secret in Render as `RAZORPAY_WEBHOOK_SECRET`.

## Customer API

API keys are created in the customer dashboard and shown once. The OpenAI-compatible endpoint is:

`POST https://aisoftstudio12.onrender.com/api/v1/chat/completions`

Send `Authorization: Bearer ass_live_...` and a JSON body containing `bot_id` and `messages`.

## Website widget

Add the generated snippet from the customer dashboard to the website. The widget loads `/widget.js` and opens the tenant's public chat page.

## Deploy and verify

1. Push changes to `main`.
2. Confirm a new Render deploy starts for the latest commit.
3. Check Render build and runtime logs.
4. Test sign-up, sign-in, workspace isolation, bot creation, public chat, API key usage and webhook delivery.
5. Test Meta Embedded Signup with a Meta test business before onboarding production customers.

Do not report a channel as connected until Meta has verified its account and the token has been stored successfully. Do not report a payment as active until a signed provider webhook confirms it.
