# wacrm — CRM Template for WhatsApp

> Self-hostable CRM for WhatsApp® — shared inbox, contacts,
> sales pipelines, broadcasts, and no-code automations.



[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase)](https://supabase.com)

This is a self-hosted WhatsApp CRM application.

## Features

- **Shared inbox** on the official WhatsApp Business API — multiple
  agents working one number, per-conversation assignment, status, and
  notes.
- **Contacts + tags + custom fields**, CSV import, deduplication.
- **Sales pipelines** (Kanban) with deals linked to conversations.
- **Broadcasts** with Meta-approved templates, delivery + read
  tracking, per-recipient variable substitution.
- **No-code automations** — triggers on inbound messages, new
  contacts, keywords, or schedule; conditional branches, waits,
  tags, webhooks. Visual builder.
- **Real-time dashboard** — response times, daily volume, pipeline
  value, cross-module activity feed.
- **Team accounts** — invite teammates by link, role-based access
  (owner / admin / agent / viewer), ownership transfer. Every install
  is account-scoped, so one shared inbox can be staffed by a whole
  team. Solo use stays single-user with zero setup.
- **Account management** — email, password, avatar, global sign-out.

## Technology Stack

This project is built with modern, production-ready technologies:

- **Frontend & Backend** — Next.js 16 with React 19 and TypeScript
- **Styling** — Tailwind CSS for responsive, maintainable UI
- **Database & Auth** — Supabase (PostgreSQL with Row-Level Security)
- **Messaging** — Official Meta WhatsApp Business API
- **Security** — AES-256-GCM encryption, RLS on all tables, HMAC-verified webhooks, Content Security Policy, rate limiting

## Quick Start

```bash
git clone https://github.com/parthkavad54/WACRM.git
cd WACRM
npm install
cp .env.local.example .env.local   # fill in Supabase + Meta credentials
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login` (or
`/dashboard` if already signed in).

## Stack

- **App** — Next.js 16 (App Router), React 19, TypeScript, Tailwind v4.
- **Data** — Supabase (Postgres + Auth + Storage + RLS).
- **WhatsApp** — Meta Cloud API (official WhatsApp Business API).

## Contributing

This is a personal project and not currently accepting contributions. See [CONTRIBUTING.md](./CONTRIBUTING.md) for more details.

## License

[MIT](./LICENSE).
