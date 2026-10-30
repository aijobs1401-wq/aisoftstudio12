import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ApiContext = {
  client: SupabaseClient;
  user: { id: string; email?: string };
  profile: any;
  organizationId: string;
  membershipRole: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY || '';

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!supabaseUrl || !key) throw new Error('Server admin database credentials are not configured.');
  return createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

function botShape(bot: any) {
  return {
    id: bot.id,
    workspaceId: bot.organization_id,
    name: bot.name,
    welcomeMessage: bot.welcome_message,
    personality: bot.personality,
    language: bot.language,
    primaryColor: bot.primary_color,
    secondaryColor: bot.secondary_color,
    status: bot.status,
    knowledgeSources: bot.knowledge_sources || [],
    createdAt: bot.created_at,
  };
}

async function contextFor(request: NextRequest, bodyWorkspaceId = ''): Promise<ApiContext> {
  if (!supabaseUrl || !publicKey) throw new Error('Supabase URL or publishable key is missing on the server.');
  const bearer = request.headers.get('authorization') || '';
  const accessToken = bearer.replace(/^Bearer\s+/i, '');
  if (!accessToken) throw new Error('Sign in is required.');
  const client = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(accessToken);
  if (authError || !authData.user) throw new Error('Your session is invalid or expired. Please sign in again.');
  const user = authData.user;
  const [{ data: profile }, { data: memberships, error: memberError }] = await Promise.all([
    client.from('profiles').select('id,email,full_name,display_name,role').eq('id', user.id).maybeSingle(),
    client.from('organization_members').select('organization_id,role').eq('user_id', user.id),
  ]);
  if (memberError) throw new Error(memberError.message);
  const requestedOrg = request.nextUrl.searchParams.get('workspaceId') || bodyWorkspaceId || null;
  const membership = (memberships || []).find((m: any) => m.organization_id === requestedOrg) || (memberships || [])[0];
  if (!membership) throw new Error('No workspace is assigned to this account yet.');
  if (requestedOrg && membership.organization_id !== requestedOrg) throw new Error('You do not have access to this workspace.');
  return { client, user, profile: profile || {}, organizationId: membership.organization_id, membershipRole: membership.role };
}

function isPlatformAdmin(ctx: ApiContext) {
  return ctx.profile?.role === 'admin' || ctx.profile?.role === 'master_admin';
}

async function requireAdmin(ctx: ApiContext) {
  if (!isPlatformAdmin(ctx)) throw new Error('Platform administrator access is required.');
  return serviceClient();
}

function encryptionKey() {
  const raw = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY || '';
  let key: Buffer;
  if (/^[0-9a-f]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('WHATSAPP_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.');
  return key;
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
}

function decryptToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(':');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored WhatsApp token has an invalid encrypted format.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64')), decipher.final()]).toString('utf8');
}

async function processRazorpayWebhook(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const signature = request.headers.get('x-razorpay-signature') || '';
  if (!secret) return json({ error: 'RAZORPAY_WEBHOOK_SECRET is not configured.' }, 503);
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return json({ error: 'Invalid Razorpay webhook signature.' }, 401);
  }
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'Invalid Razorpay webhook JSON.' }, 400); }
  const adminDb = serviceClient();
  const eventKey = String(event.id || `razorpay-${event.event || 'event'}-${Date.now()}`);
  const { data: accepted } = await adminDb.from('webhook_events').upsert({
    event_key: eventKey, payload: event, processing_status: 'pending',
  }, { onConflict: 'event_key', ignoreDuplicates: true }).select('event_key').maybeSingle();
  if (!accepted) return json({ status: 'duplicate_ignored' });
  if (!['payment.captured','order.paid'].includes(event.event)) {
    await adminDb.from('webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
    return json({ status: 'ignored_event' });
  }
  const paymentEntity = event.payload?.payment?.entity || {};
  const orderId = paymentEntity.order_id || event.payload?.order?.entity?.id;
  if (!orderId) {
    await adminDb.from('webhook_events').update({ processing_status: 'failed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
    return json({ error: 'Razorpay event did not include an order ID.' }, 400);
  }
  const { data: payment } = await adminDb.from('payments').select('*').eq('provider_order_id', orderId).maybeSingle();
  if (!payment) {
    await adminDb.from('webhook_events').update({ processing_status: 'failed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
    return json({ error: 'Payment order was not found in this platform.' }, 404);
  }
  await adminDb.from('payments').update({ status: 'captured', provider_payment_id: paymentEntity.id || null }).eq('id', payment.id);
  const { data: plan } = await adminDb.from('plans').select('*').eq('name', payment.plan_name).maybeSingle();
  await adminDb.from('subscriptions').upsert({
    organization_id: payment.organization_id,
    plan_id: plan?.id || null,
    plan_name: payment.plan_name || plan?.name || 'Starter',
    status: 'active',
    bots_limit: plan?.bots_limit || 1,
    messages_limit: plan?.messages_limit || 1000,
    messages_used: 0,
    api_limit: plan?.api_limit || 500,
    api_used: 0,
    renew_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id' });
  await adminDb.from('audit_logs').insert({
    organization_id: payment.organization_id, action: 'payment.captured',
    entity_type: 'payment', entity_id: payment.id,
    details: { order_id: orderId, payment_id: paymentEntity.id || null, plan_name: payment.plan_name },
  });
  await adminDb.from('webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
  return json({ status: 'ok' });
}

async function processWhatsAppWebhook(request: NextRequest) {
  if (request.method === 'GET') {
    const mode = request.nextUrl.searchParams.get('hub.mode');
    const token = request.nextUrl.searchParams.get('hub.verify_token') || '';
    const challenge = request.nextUrl.searchParams.get('hub.challenge') || '';
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
    if (mode === 'subscribe' && expected && token === expected) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return json({ error: 'Webhook verification token mismatch.' }, 403);
  }

  const rawBody = await request.text();
  const appSecret = process.env.META_APP_SECRET || '';
  const signature = request.headers.get('x-hub-signature-256') || '';
  if (!appSecret) return json({ error: 'META_APP_SECRET is not configured.' }, 503);
  const expectedSignature = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return json({ error: 'Invalid Meta webhook signature.' }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: 'Invalid webhook JSON.' }, 400); }
  const adminDb = serviceClient();
  const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const { data: connection } = await adminDb.from('whatsapp_connections').select('*')
        .eq('phone_number_id', phoneNumberId).maybeSingle();
      if (!connection) continue;
      await adminDb.from('whatsapp_connections').update({ last_webhook_at: new Date().toISOString() }).eq('id', connection.id);

      for (const inbound of value.messages || []) {
        const eventKey = inbound.id || `wa-${phoneNumberId}-${inbound.timestamp || Date.now()}`;
        const { data: acceptedEvent } = await adminDb.from('webhook_events').upsert({
          event_key: eventKey, payload: { phone_number_id: phoneNumberId, message: inbound },
          processing_status: 'pending',
        }, { onConflict: 'event_key', ignoreDuplicates: true }).select('event_key').maybeSingle();
        if (!acceptedEvent) continue;

        const sender = String(inbound.from || '');
        if (!sender) continue;
        const profileName = value.contacts?.find((item: any) => item.wa_id === sender)?.profile?.name || 'WhatsApp contact';
        const { data: existingContact } = await adminDb.from('contacts').select('*')
          .eq('organization_id', connection.organization_id).eq('wa_id', sender).maybeSingle();
        let contact = existingContact;
        if (!contact) {
          const { data } = await adminDb.from('contacts').insert({
            organization_id: connection.organization_id, wa_id: sender, name: profileName,
          }).select('*').single();
          contact = data;
        }
        if (!contact) continue;
        const now = new Date().toISOString();
        const { data: conversation } = await adminDb.from('conversations').upsert({
          organization_id: connection.organization_id, connection_id: connection.id,
          contact_id: contact.id, status: 'open', last_message_at: now,
        }, { onConflict: 'organization_id,contact_id,connection_id' }).select('*').single();
        if (!conversation) continue;

        const textBody = inbound.text?.body || inbound.button?.text || inbound.interactive?.button_reply?.title || inbound.interactive?.list_reply?.title || '[Unsupported message type]';
        await adminDb.from('messages').insert({
          organization_id: connection.organization_id, conversation_id: conversation.id,
          meta_message_id: inbound.id || null, direction: 'inbound', message_type: inbound.type || 'text',
          body: textBody, delivery_status: 'received',
        });

        const [{ data: aiSettings }, { data: activeBot }, { data: subscription }, { data: flows }] = await Promise.all([
          adminDb.from('whatsapp_ai_settings').select('*').eq('organization_id', connection.organization_id).maybeSingle(),
          adminDb.from('ai_bots').select('*').eq('organization_id', connection.organization_id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
          adminDb.from('subscriptions').select('messages_limit,messages_used').eq('organization_id', connection.organization_id).maybeSingle(),
          adminDb.from('automation_flows').select('*').eq('organization_id', connection.organization_id).eq('status', 'active'),
        ]);
        const openAiKey = process.env.OPENAI_API_KEY || '';
        const matchingFlow = (flows || []).find((flow: any) => {
          if (flow.trigger_type === 'incoming_message') return true;
          if (flow.trigger_type === 'keyword_match') {
            const keyword = String(flow.definition?.keyword || '').trim().toLowerCase();
            return Boolean(keyword && textBody.toLowerCase().includes(keyword));
          }
          return false;
        });
        const flowReply = matchingFlow?.definition?.actions?.find((action: any) => action.type === 'send_reply')?.text;
        const aiEnabled = Boolean(aiSettings?.enabled || activeBot);
        const quotaReached = Boolean(subscription && subscription.messages_used >= subscription.messages_limit);
        if (inbound.type !== 'text' || (!flowReply && (!aiEnabled || !openAiKey || quotaReached))) {
          await adminDb.from('webhook_events').update({ processing_status: 'processed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
          continue;
        }

        const { data: secret } = await adminDb.from('whatsapp_connection_secrets').select('token_ciphertext')
          .eq('connection_id', connection.id).maybeSingle();
        if (!secret?.token_ciphertext) {
          await adminDb.from('webhook_events').update({ processing_status: 'failed', processed_at: new Date().toISOString() }).eq('event_key', eventKey);
          continue;
        }
        const accessToken = decryptToken(secret.token_ciphertext);
        let reply = String(flowReply || '');
        let aiSucceeded = false;
        if (!reply) {
          const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: aiSettings?.enabled
                  ? (aiSettings.system_prompt || `You are ${aiSettings.bot_name}. Reply in the customer's language. Keep messages concise, factual and helpful. Never invent prices or order status.`)
                  : `You are ${activeBot?.name || 'AI Soft Studio assistant'}. ${activeBot?.personality || 'Be helpful, concise and professional.'} Reply in the customer's language. Never invent prices, policies or order status. Use this knowledge base:\\n${(activeBot?.knowledge_sources || []).map((item: any) => `${item.title}: ${item.content}`).join('\\n')}`,
                },
                { role: 'user', content: textBody },
              ],
              temperature: 0.4,
            }),
          });
          const aiData = await aiResponse.json().catch(() => ({}));
          aiSucceeded = aiResponse.ok;
          reply = aiResponse.ok ? String(aiData.choices?.[0]?.message?.content || '') : '';
        }
        let sendSucceeded = false;
        if (reply) {
          const sendResponse = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: sender, type: 'text', text: { body: reply } }),
          });
          const sendData = await sendResponse.json().catch(() => ({}));
          sendSucceeded = sendResponse.ok;
          if (sendSucceeded) {
            await adminDb.from('messages').insert({
              organization_id: connection.organization_id, conversation_id: conversation.id,
              meta_message_id: sendData.messages?.[0]?.id || null, direction: 'outbound',
              message_type: 'text', body: reply, delivery_status: 'sent',
            });
          }
        }
        if (matchingFlow) {
          await adminDb.from('automation_runs').insert({
            organization_id: connection.organization_id, flow_id: matchingFlow.id,
            status: sendSucceeded ? 'completed' : 'failed',
            input: { message: textBody, from: sender },
            output: { reply }, started_at: now, completed_at: new Date().toISOString(),
            error: sendSucceeded ? null : 'WhatsApp send failed or returned no reply.',
          });
        }
        if (aiSucceeded && sendSucceeded && subscription) {
          await adminDb.from('subscriptions').update({
            messages_used: Number(subscription.messages_used || 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq('organization_id', connection.organization_id);
        }
        await adminDb.from('webhook_events').update({
          processing_status: sendSucceeded || (!matchingFlow && !aiSucceeded) ? 'processed' : 'failed',
          processed_at: new Date().toISOString(),
        }).eq('event_key', eventKey);
      }

      for (const status of value.statuses || []) {
        if (status.id) await adminDb.from('messages').update({ delivery_status: status.status || 'sent' }).eq('meta_message_id', status.id);
      }
    }
  }
  return json({ status: 'ok' });
}

async function listConversations(client: SupabaseClient, organizationId: string) {
  const { data: rows, error } = await client.from('conversations').select('*')
    .eq('organization_id', organizationId).order('last_message_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const ids = (rows || []).map((row: any) => row.id);
  const contactIds = [...new Set((rows || []).map((row: any) => row.contact_id).filter(Boolean))];
  const [{ data: contacts }, { data: messages }] = await Promise.all([
    contactIds.length ? client.from('contacts').select('*').in('id', contactIds) : Promise.resolve({ data: [] } as any),
    ids.length ? client.from('messages').select('*').in('conversation_id', ids).order('occurred_at') : Promise.resolve({ data: [] } as any),
  ]);
  const contactMap = new Map((contacts || []).map((c: any) => [c.id, c] as const));
  const messagesByConversation = new Map<string, any[]>();
  for (const message of messages || []) {
    const list = messagesByConversation.get(message.conversation_id) || [];
    list.push({
      id: message.id,
      sender: message.direction === 'inbound' ? 'customer' : 'bot',
      text: message.body || '',
      timestamp: message.occurred_at,
    });
    messagesByConversation.set(message.conversation_id, list);
  }
  return (rows || []).map((row: any) => {
    const contact: any = contactMap.get(row.contact_id) || {};
    return {
      id: row.id,
      workspaceId: row.organization_id,
      customerName: contact.name || 'WhatsApp contact',
      customerPhone: contact.wa_id || '',
      channel: row.connection_id ? 'whatsapp' : 'web_widget',
      status: row.status === 'pending' ? 'human_handover' : row.status,
      messages: messagesByConversation.get(row.id) || [],
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
    };
  });
}

async function handle(request: NextRequest, params: Promise<{ path: string[] }>) {
  const path = (await params).path || [];
  const route = path.join('/');
  const method = request.method;
  if (route === 'whatsapp/webhook') return processWhatsAppWebhook(request);
  if (route === 'webhooks/payment') return processRazorpayWebhook(request);
  const body = method === 'GET' || method === 'DELETE' ? {} : await request.json().catch(() => ({}));

  // Public chatbot discovery and chat endpoints are intentionally separate from dashboard auth.
  if (route.startsWith('chatbots/')) {
    const parts = route.split('/');
    const botId = parts[1];
    const action = parts[2];
    const adminDb = serviceClient();
    const { data: bot, error: botError } = await adminDb.from('ai_bots').select('*').eq('id', botId).maybeSingle();
    if (botError || !bot || bot.status !== 'active') return json({ error: 'Chatbot not found or inactive.' }, 404);
    if (action === 'public' && method === 'GET') {
      return json({
        id: bot.id, name: bot.name, welcomeMessage: bot.welcome_message,
        primaryColor: bot.primary_color, secondaryColor: bot.secondary_color, status: bot.status,
      });
    }
    if (action === 'chat' && method === 'POST') {
      const message = String((body as any).message || '').trim().slice(0, 4000);
      if (!message) return json({ error: 'Message is required.' }, 400);
      const apiKey = process.env.OPENAI_API_KEY || '';
      if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured on the server.' }, 503);
      const visitorId = String((body as any).customerPhone || (body as any).customerEmail || `web-${randomBytes(8).toString('hex')}`);
      let contact: any;
      const { data: existingContact } = await adminDb.from('contacts').select('*')
        .eq('organization_id', bot.organization_id).eq('wa_id', visitorId).maybeSingle();
      if (existingContact) contact = existingContact;
      else {
        const { data: newContact, error: contactError } = await adminDb.from('contacts')
          .insert({ organization_id: bot.organization_id, wa_id: visitorId, name: String((body as any).customerName || 'Website visitor') })
          .select('*').single();
        if (contactError) return json({ error: contactError.message }, 500);
        contact = newContact;
      }
      let conversationId = String((body as any).conversationId || '');
      let conversation: any = null;
      if (conversationId) {
        const { data } = await adminDb.from('conversations').select('*').eq('id', conversationId)
          .eq('organization_id', bot.organization_id).maybeSingle();
        conversation = data;
      }
      if (!conversation) {
        const { data, error } = await adminDb.from('conversations').insert({
          organization_id: bot.organization_id, contact_id: contact.id, status: 'open', last_message_at: new Date().toISOString(),
        }).select('*').single();
        if (error) return json({ error: error.message }, 500);
        conversation = data;
        conversationId = data.id;
      }
      const { data: history } = await adminDb.from('messages').select('direction,body')
        .eq('conversation_id', conversationId).order('occurred_at', { ascending: true }).limit(20);
      const knowledge = Array.isArray(bot.knowledge_sources) ? bot.knowledge_sources
        .map((item: any) => `[${item.type || 'INFO'}] ${item.title || ''}: ${item.content || ''}`).join('\\n') : '';
      const messages = [
        { role: 'system', content: `You are ${bot.name}. ${bot.personality || 'Be helpful and accurate.'} Reply in the customer's language. Use the knowledge base; do not invent prices, order status, or policies. If unsure, offer a human handover.\\nKnowledge:\\n${knowledge}` },
        ...(history || []).map((item: any) => ({ role: item.direction === 'inbound' ? 'user' : 'assistant', content: item.body || '' })),
        { role: 'user', content: message },
      ];
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.4 }),
      });
      const aiData = await aiResponse.json().catch(() => ({}));
      if (!aiResponse.ok) return json({ error: aiData.error?.message || 'AI provider request failed.' }, 502);
      const reply = String(aiData.choices?.[0]?.message?.content || 'I will connect you with a team member.');
      const now = new Date().toISOString();
      const { data: savedMessages, error: saveError } = await adminDb.from('messages').insert([
        { organization_id: bot.organization_id, conversation_id: conversationId, direction: 'inbound', message_type: 'text', body: message, delivery_status: 'received', occurred_at: now },
        { organization_id: bot.organization_id, conversation_id: conversationId, direction: 'outbound', message_type: 'text', body: reply, delivery_status: 'sent', occurred_at: new Date(Date.now() + 1).toISOString() },
      ]).select('*');
      if (saveError) return json({ error: saveError.message }, 500);
      await adminDb.from('conversations').update({ last_message_at: now }).eq('id', conversationId);
      if ((body as any).customerEmail || (body as any).customerPhone) {
        await adminDb.from('leads').insert({
          organization_id: bot.organization_id, bot_id: bot.id,
          name: String((body as any).customerName || 'Website visitor'),
          email: (body as any).customerEmail || null, phone: (body as any).customerPhone || null,
          interest: message.slice(0, 250), source: 'website', status: 'new',
        });
      }
      return json({
        conversationId,
        reply,
        messages: (savedMessages || []).map((item: any) => ({
          id: item.id, sender: item.direction === 'inbound' ? 'customer' : 'bot',
          text: item.body, timestamp: item.occurred_at,
        })),
      });
    }
    return json({ error: 'Method not allowed.' }, 405);
  }

  if (route === 'v1/chat/completions' && method === 'POST') {
    const rawKey = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!rawKey.startsWith('ass_live_')) return json({ error: { message: 'A valid AI Soft Studio API key is required.' } }, 401);
    const adminDb = serviceClient();
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const { data: apiKey, error: keyError } = await adminDb.from('organization_api_keys')
      .select('id,organization_id').eq('key_hash', keyHash).is('revoked_at', null).maybeSingle();
    if (keyError || !apiKey) return json({ error: { message: 'Invalid or revoked API key.' } }, 401);
    const { data: subscription } = await adminDb.from('subscriptions').select('api_limit,api_used')
      .eq('organization_id', apiKey.organization_id).maybeSingle();
    if (subscription && subscription.api_used >= subscription.api_limit) {
      return json({ error: { message: 'API quota exceeded. Upgrade the workspace plan to continue.' } }, 429);
    }
    const botId = String((body as any).bot_id || (body as any).botId || '');
    let botQuery = adminDb.from('ai_bots').select('*').eq('organization_id', apiKey.organization_id).eq('status', 'active');
    if (botId) botQuery = botQuery.eq('id', botId) as any;
    const { data: bot } = await botQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!bot) return json({ error: { message: 'No active AI bot is available for this API key.' } }, 404);
    const openAiKey = process.env.OPENAI_API_KEY || '';
    if (!openAiKey) return json({ error: { message: 'AI provider is not configured on the server.' } }, 503);
    const suppliedMessages = Array.isArray((body as any).messages) ? (body as any).messages.slice(-20) : [];
    const knowledge = (bot.knowledge_sources || []).map((item: any) => `${item.title}: ${item.content}`).join('\\n');
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are ${bot.name}. ${bot.personality}. Reply in the customer's language. Never invent prices, policies or order status. Knowledge base:\\n${knowledge}` },
          ...suppliedMessages.filter((item: any) => ['user','assistant'].includes(item.role) && typeof item.content === 'string'),
        ],
        temperature: 0.4,
      }),
    });
    const aiData = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) return json({ error: { message: aiData.error?.message || 'AI provider request failed.' } }, 502);
    await adminDb.from('organization_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
    if (subscription) await adminDb.from('subscriptions').update({ api_used: Number(subscription.api_used || 0) + 1, updated_at: new Date().toISOString() }).eq('organization_id', apiKey.organization_id);
    return json({
      id: `chatcmpl-${randomBytes(12).toString('hex')}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      choices: [{ index: 0, message: aiData.choices?.[0]?.message || { role: 'assistant', content: '' }, finish_reason: aiData.choices?.[0]?.finish_reason || 'stop' }],
      usage: aiData.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    });
  }

  const ctx = await contextFor(request, String((body as any).workspaceId || ''));
  const orgId = ctx.organizationId;
  const client = ctx.client;
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');

  if (route === 'workspaces' && method === 'GET') {
    const { data: memberships, error } = await client.from('organization_members').select('organization_id,role').eq('user_id', ctx.user.id);
    if (error) throw new Error(error.message);
    const ids = (memberships || []).map((item: any) => item.organization_id);
    const { data: orgs, error: orgError } = ids.length
      ? await client.from('organizations').select('id,name,slug,status,created_at').in('id', ids)
      : { data: [], error: null } as any;
    if (orgError) throw new Error(orgError.message);
    const { data: subs } = ids.length ? await client.from('subscriptions').select('organization_id,plan_name').in('organization_id', ids) : { data: [] } as any;
    return json((orgs || []).map((org: any) => ({
      id: org.id, name: org.name, plan: subs?.find((s: any) => s.organization_id === org.id)?.plan_name || 'Starter',
      status: org.status, createdAt: org.created_at,
    })));
  }

  if (route === 'bots' && method === 'GET') {
    const { data, error } = await client.from('ai_bots').select('*').eq('organization_id', workspaceId || orgId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return json((data || []).map(botShape));
  }
  if (route === 'bots' && method === 'POST') {
    const { data, error } = await client.from('ai_bots').insert({
      organization_id: orgId, name: (body as any).name || 'New AI Assistant',
      welcome_message: (body as any).welcomeMessage || 'Hello! How can I help you today?',
      personality: (body as any).personality || 'Helpful, polite and professional assistant.',
      language: (body as any).language || 'multi', status: 'active', created_by: ctx.user.id,
    }).select('*').single();
    if (error) throw new Error(error.message);
    await client.from('audit_logs').insert({ organization_id: orgId, actor_id: ctx.user.id, action: 'bot.created', entity_type: 'ai_bot', entity_id: data.id });
    return json(botShape(data), 201);
  }
  if (path[0] === 'bots' && path[1] && path[2] === 'knowledge' && method === 'POST') {
    const { data: bot, error } = await client.from('ai_bots').select('*').eq('id', path[1]).eq('organization_id', orgId).single();
    if (error) throw new Error(error.message);
    const sources = [...(bot.knowledge_sources || []), { id: randomBytes(8).toString('hex'), type: (body as any).type || 'faq', title: (body as any).title, content: (body as any).content }];
    const { data, error: updateError } = await client.from('ai_bots').update({ knowledge_sources: sources, updated_at: new Date().toISOString() }).eq('id', path[1]).select('*').single();
    if (updateError) throw new Error(updateError.message);
    return json(botShape(data));
  }
  if (path[0] === 'bots' && path[1] && path[2] === 'knowledge' && path[3] && method === 'DELETE') {
    const { data: bot, error } = await client.from('ai_bots').select('*').eq('id', path[1]).eq('organization_id', orgId).single();
    if (error) throw new Error(error.message);
    const sources = (bot.knowledge_sources || []).filter((item: any) => item.id !== path[3]);
    const { data, error: updateError } = await client.from('ai_bots').update({ knowledge_sources: sources, updated_at: new Date().toISOString() }).eq('id', path[1]).select('*').single();
    if (updateError) throw new Error(updateError.message);
    return json(botShape(data));
  }
  if (path[0] === 'bots' && path[1] && method === 'PUT') {
    const updates: any = {};
    if ((body as any).name !== undefined) updates.name = (body as any).name;
    if ((body as any).welcomeMessage !== undefined) updates.welcome_message = (body as any).welcomeMessage;
    if ((body as any).personality !== undefined) updates.personality = (body as any).personality;
    if ((body as any).language !== undefined) updates.language = (body as any).language;
    updates.updated_at = new Date().toISOString();
    const { data, error } = await client.from('ai_bots').update(updates).eq('id', path[1]).eq('organization_id', orgId).select('*').single();
    if (error) throw new Error(error.message);
    return json(botShape(data));
  }
  if (path[0] === 'bots' && path[1] && method === 'DELETE') {
    const { error } = await client.from('ai_bots').delete().eq('id', path[1]).eq('organization_id', orgId);
    if (error) throw new Error(error.message);
    return json({ success: true });
  }

  if (route === 'automations' && method === 'GET') {
    const { data, error } = await client.from('automation_flows').select('*')
      .eq('organization_id', workspaceId || orgId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return json((data || []).map((flow: any) => ({
      id: flow.id, workspaceId: flow.organization_id, name: flow.name,
      triggerType: flow.trigger_type, definition: flow.definition, status: flow.status, createdAt: flow.created_at,
    })));
  }
  if (route === 'automations' && method === 'POST') {
    const definition = (body as any).definition && typeof (body as any).definition === 'object' ? (body as any).definition : {};
    const triggerType = ['incoming_message','keyword_match','new_lead'].includes((body as any).triggerType) ? (body as any).triggerType : 'incoming_message';
    if (triggerType === 'keyword_match' && !String(definition.keyword || '').trim()) return json({ error: 'A keyword is required for keyword-match workflows.' }, 400);
    const { data, error } = await client.from('automation_flows').insert({
      organization_id: orgId, name: String((body as any).name || 'New automation'),
      trigger_type: triggerType, definition, status: (body as any).status === 'active' ? 'active' : 'draft',
      created_by: ctx.user.id,
    }).select('*').single();
    if (error) throw new Error(error.message);
    await client.from('audit_logs').insert({ organization_id: orgId, actor_id: ctx.user.id, action: 'automation.created', entity_type: 'automation_flow', entity_id: data.id });
    return json({ id: data.id, workspaceId: data.organization_id, name: data.name, triggerType: data.trigger_type, definition: data.definition, status: data.status, createdAt: data.created_at }, 201);
  }
  if (path[0] === 'automations' && path[1] && method === 'PUT') {
    const updates: any = { updated_at: new Date().toISOString() };
    if ((body as any).name !== undefined) updates.name = String((body as any).name);
    if ((body as any).status !== undefined) updates.status = ['active','paused','draft'].includes((body as any).status) ? (body as any).status : 'draft';
    if ((body as any).definition !== undefined) updates.definition = (body as any).definition;
    const { data, error } = await client.from('automation_flows').update(updates).eq('id', path[1]).eq('organization_id', orgId).select('*').single();
    if (error) throw new Error(error.message);
    return json({ id: data.id, workspaceId: data.organization_id, name: data.name, triggerType: data.trigger_type, definition: data.definition, status: data.status, createdAt: data.created_at });
  }
  if (path[0] === 'automations' && path[1] && method === 'DELETE') {
    const { error } = await client.from('automation_flows').delete().eq('id', path[1]).eq('organization_id', orgId);
    if (error) throw new Error(error.message);
    return json({ success: true });
  }

  if (route === 'conversations' && method === 'GET') return json(await listConversations(client, workspaceId || orgId));
  if (path[0] === 'conversations' && path[1] && path[2] === 'reply' && method === 'POST') {
    const reply = String((body as any).text || '').trim().slice(0, 4000);
    if (!reply) return json({ error: 'Reply text is required.' }, 400);
    const { data: conversation, error } = await client.from('conversations').select('*').eq('id', path[1]).eq('organization_id', orgId).single();
    if (error) throw new Error(error.message);
    const { error: messageError } = await client.from('messages').insert({
      organization_id: orgId, conversation_id: conversation.id, direction: 'outbound',
      message_type: 'text', body: reply, delivery_status: 'queued',
    });
    if (messageError) throw new Error(messageError.message);
    const { data, error: updateError } = await client.from('conversations').update({ status: 'pending', last_message_at: new Date().toISOString() }).eq('id', path[1]).select('*').single();
    if (updateError) throw new Error(updateError.message);
    return json(data);
  }
  if (route === 'leads' && method === 'GET') {
    const { data, error } = await client.from('leads').select('*').eq('organization_id', workspaceId || orgId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return json((data || []).map((lead: any) => ({ ...lead, workspaceId: lead.organization_id, createdAt: lead.created_at, interest: lead.interest || '' })));
  }
  if (route === 'channels' && method === 'GET') {
    const { data, error } = await client.from('whatsapp_connections').select('*').eq('organization_id', workspaceId || orgId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return json((data || []).map((channel: any) => ({
      id: channel.id, workspaceId: channel.organization_id, type: 'whatsapp',
      status: channel.connection_status, phoneNumberId: channel.phone_number_id,
      displayPhoneNumber: channel.display_phone_number, name: channel.verified_name, createdAt: channel.created_at,
    })));
  }
  if (route === 'whatsapp/embedded-signup' && method === 'POST') {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';
    const code = String((body as any).code || '').trim();
    const phoneNumberId = String((body as any).phoneNumberId || '').trim();
    const wabaId = String((body as any).wabaId || '').trim();
    if (!appId || !appSecret) return json({ error: 'META_APP_ID and META_APP_SECRET must be configured on the server.' }, 503);
    if (!code || !phoneNumberId || !wabaId) return json({ error: 'Embedded Signup code, Phone Number ID and WABA ID are required.' }, 400);
    const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
    const tokenUrl = new URL(`https://graph.facebook.com/${version}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenData.access_token) return json({ error: tokenData.error?.message || 'Meta authorization code exchange failed.' }, 400);
    const accessToken = String(tokenData.access_token);
    const phoneResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,whatsapp_business_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const phoneData = await phoneResponse.json().catch(() => ({}));
    if (!phoneResponse.ok) return json({ error: phoneData.error?.message || 'Meta could not verify the selected WhatsApp number.' }, 400);
    if (phoneData.whatsapp_business_account?.id && phoneData.whatsapp_business_account.id !== wabaId) {
      return json({ error: 'The selected Phone Number ID does not belong to the WABA returned by Embedded Signup.' }, 400);
    }
    const subscribeResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(wabaId)}/subscribed_apps`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    const subscribeData = await subscribeResponse.json().catch(() => ({}));
    if (!subscribeResponse.ok) return json({ error: subscribeData.error?.message || 'Could not subscribe the Meta app to this WABA webhook.' }, 400);
    let tokenCiphertext: string;
    try { tokenCiphertext = encryptToken(accessToken); }
    catch (error: any) { return json({ error: error.message }, 503); }
    const { data: connection, error } = await client.from('whatsapp_connections').upsert({
      organization_id: orgId, phone_number_id: phoneNumberId, waba_id: wabaId,
      display_phone_number: phoneData.display_phone_number || null,
      verified_name: phoneData.verified_name || null, connection_status: 'connected', updated_at: new Date().toISOString(),
    }, { onConflict: 'phone_number_id' }).select('*').single();
    if (error) throw new Error(error.message);
    const adminDb = serviceClient();
    const { error: secretError } = await adminDb.from('whatsapp_connection_secrets').upsert({
      connection_id: connection.id, token_ciphertext, token_key_version: 1, updated_at: new Date().toISOString(),
      token_expires_at: tokenData.expires_in ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString() : null,
    });
    if (secretError) throw new Error(secretError.message);
    return json({ id: connection.id, type: 'whatsapp', status: 'connected', displayPhoneNumber: connection.display_phone_number });
  }

  if (route === 'channels/whatsapp' && method === 'POST') {
    const phoneNumberId = String((body as any).phoneNumberId || '').trim();
    const accessToken = String((body as any).accessToken || '').trim();
    if (!phoneNumberId || !accessToken) return json({ error: 'Phone Number ID and access token are required.' }, 400);
    let tokenCiphertext: string;
    try { tokenCiphertext = encryptToken(accessToken); }
    catch (error: any) { return json({ error: error.message }, 503); }
    const version = process.env.META_GRAPH_API_VERSION || 'v23.0';
    const metaResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(phoneNumberId)}?fields=display_phone_number,verified_name,whatsapp_business_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const metaData = await metaResponse.json().catch(() => ({}));
    if (!metaResponse.ok) return json({ error: metaData.error?.message || 'Meta could not verify this WhatsApp Phone Number ID and token.' }, 400);
    const wabaId = metaData.whatsapp_business_account?.id || (body as any).wabaId || null;
    if (!wabaId) return json({ error: 'Meta verified the phone number but did not return its WhatsApp Business Account ID. Use Embedded Signup or provide the WABA ID.' }, 400);
    const { data: connection, error } = await client.from('whatsapp_connections').upsert({
      organization_id: orgId, phone_number_id: phoneNumberId, waba_id: wabaId,
      display_phone_number: metaData.display_phone_number || null,
      verified_name: metaData.verified_name || null, connection_status: 'connected', updated_at: new Date().toISOString(),
    }, { onConflict: 'phone_number_id' }).select('*').single();
    if (error) throw new Error(error.message);
    const adminDb = serviceClient();
    const { error: secretError } = await adminDb.from('whatsapp_connection_secrets').upsert({
      connection_id: connection.id, token_ciphertext: tokenCiphertext, token_key_version: 1, updated_at: new Date().toISOString(),
    });
    if (secretError) throw new Error(secretError.message);
    return json({ id: connection.id, type: 'whatsapp', status: 'connected', displayPhoneNumber: connection.display_phone_number });
  }

  if (route === 'apikeys' && method === 'GET') {
    const { data, error } = await client.from('organization_api_keys').select('id,name,key_prefix,last_used_at,created_at').eq('organization_id', orgId).is('revoked_at', null).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return json((data || []).map((key: any) => ({ id: key.id, name: key.name, keyPrefix: key.key_prefix, requestsCount: 0, createdAt: key.created_at, lastUsedAt: key.last_used_at })));
  }
  if (route === 'apikeys' && method === 'POST') {
    const secret = `ass_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(secret).digest('hex');
    const { data, error } = await client.from('organization_api_keys').insert({
      organization_id: orgId, name: String((body as any).name || 'Production API key'), key_hash: keyHash, key_prefix: secret.slice(0, 16),
    }).select('id,name,key_prefix,created_at').single();
    if (error) throw new Error(error.message);
    return json({ id: data.id, name: data.name, keyPrefix: data.key_prefix, createdAt: data.created_at, secretKey: secret }, 201);
  }
  if (path[0] === 'apikeys' && path[1] && method === 'DELETE') {
    const { error } = await client.from('organization_api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', path[1]).eq('organization_id', orgId);
    if (error) throw new Error(error.message);
    return json({ success: true });
  }
  if (route === 'subscription' && method === 'GET') {
    const { data, error } = await client.from('subscriptions').select('*').eq('organization_id', orgId).maybeSingle();
    if (error) throw new Error(error.message);
    return json(data ? { ...data, workspaceId: data.organization_id, planName: data.plan_name, botsLimit: data.bots_limit, messagesLimit: data.messages_limit, messagesUsed: data.messages_used, apiLimit: data.api_limit, apiUsed: data.api_used, renewAt: data.renew_at } : null);
  }
  if (route === 'subscription/upgrade' && method === 'POST') {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    if (!keyId || !keySecret) return json({ error: 'Razorpay live/test credentials are not configured. No payment was created.' }, 503);
    const planName = String((body as any).planName || 'Starter');
    const { data: plan } = await client.from('plans').select('*').eq('name', planName).eq('is_active', true).maybeSingle();
    if (!plan) return json({ error: 'Selected plan is not available.' }, 404);
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Math.round(Number(plan.price) * 100), currency: plan.currency || 'INR', receipt: `org_${orgId.slice(0, 8)}_${Date.now()}` }),
    });
    const order = await orderResponse.json().catch(() => ({}));
    if (!orderResponse.ok) return json({ error: order.error?.description || 'Razorpay order creation failed.' }, 502);
    const { error } = await client.from('payments').insert({
      organization_id: orgId, amount: Number(plan.price), currency: plan.currency || 'INR',
      provider: 'razorpay', provider_order_id: order.id, status: 'created', plan_name: planName,
    });
    if (error) throw new Error(error.message);
    return json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
  }

  if (route === 'admin/overview' && method === 'GET') {
    const adminDb = await requireAdmin(ctx);
    const [{ data: authUsers }, { data: profiles }, { data: orgs }, { data: bots }, { data: channels }, { data: plans }, { data: payments }, { data: logs }, { data: subscriptions }, { count: conversationCount }] = await Promise.all([
      adminDb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      adminDb.from('profiles').select('id,email,role,full_name'),
      adminDb.from('organizations').select('*').order('created_at', { ascending: false }),
      adminDb.from('ai_bots').select('*').order('created_at', { ascending: false }),
      adminDb.from('whatsapp_connections').select('*').order('created_at', { ascending: false }),
      adminDb.from('plans').select('*').order('price'),
      adminDb.from('payments').select('*').order('created_at', { ascending: false }),
      adminDb.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
      adminDb.from('subscriptions').select('*'),
      adminDb.from('conversations').select('*', { count: 'exact', head: true }),
    ]);
    const profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile] as const));
    const users = (authUsers?.users || []).map((u: any) => {
      const profile: any = profileMap.get(u.id) || {};
      return { id: u.id, email: u.email, name: profile.full_name || u.user_metadata?.full_name || u.email, role: profile.role || 'viewer', createdAt: u.created_at, status: u.email_confirmed_at ? 'confirmed' : 'pending' };
    });
    const workspaces = (orgs || []).map((o: any) => {
      const subscription = (subscriptions || []).find((item: any) => item.organization_id === o.id);
      return { id: o.id, name: o.name, plan: subscription?.plan_name || 'Starter', status: o.status, createdAt: o.created_at };
    });
    const shapedBots = (bots || []).map(botShape);
    const shapedChannels = (channels || []).map((c: any) => ({ id: c.id, provider: 'whatsapp', phoneNumberId: c.phone_number_id, status: c.connection_status, createdAt: c.created_at }));
    const shapedPlans = (plans || []).map((p: any) => ({ id: p.id, name: p.name, amount: p.price, status: p.is_active ? 'active' : 'inactive', createdAt: p.created_at }));
    const shapedPayments = (payments || []).map((p: any) => ({ id: p.id, amount: p.amount, status: p.status, provider: p.provider, createdAt: p.created_at, workspaceId: p.organization_id }));
    const shapedLogs = (logs || []).map((l: any) => ({ id: l.id, message: l.action, status: 'recorded', timestamp: l.created_at }));
    return json({
      totalUsers: users.length, totalWorkspaces: workspaces.length, totalBots: shapedBots.length,
      totalConversations: conversationCount || 0, users, workspaces, bots: shapedBots,
      channels: shapedChannels, plans: shapedPlans, payments: shapedPayments, logs: shapedLogs,
      aiConfig: { defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4 },
    });
  }
  if (route === 'admin/plans' && method === 'GET') {
    const adminDb = await requireAdmin(ctx);
    const { data, error } = await adminDb.from('plans').select('*').order('price');
    if (error) throw new Error(error.message);
    return json(data || []);
  }
  if (route === 'admin/plans' && method === 'POST') {
    const adminDb = await requireAdmin(ctx);
    const { data, error } = await adminDb.from('plans').insert({
      name: (body as any).name, price: Number((body as any).price || 0),
      bots_limit: Number((body as any).botsLimit || 1), messages_limit: Number((body as any).messagesLimit || 1000),
      api_limit: Number((body as any).apiLimit || 500), currency: 'INR',
    }).select('*').single();
    if (error) throw new Error(error.message);
    return json(data, 201);
  }

  if (path[0] === 'admin' && path[1] === 'users' && path[2] && method === 'PUT') {
    const adminDb = await requireAdmin(ctx);
    const role = String((body as any).role || '');
    if (!['admin','editor','viewer'].includes(role)) return json({ error: 'Role must be admin, editor or viewer.' }, 400);
    if (path[2] === ctx.user.id && role !== 'admin') return json({ error: 'You cannot remove your own platform administrator access.' }, 400);
    const { data, error } = await adminDb.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', path[2]).select('id,email,role').single();
    if (error) throw new Error(error.message);
    await adminDb.from('audit_logs').insert({ actor_id: ctx.user.id, action: 'admin.user_role_updated', entity_type: 'profile', entity_id: path[2], details: { role } });
    return json(data);
  }
  if (path[0] === 'admin' && path[1] === 'bots' && path[2] && method === 'PUT') {
    const adminDb = await requireAdmin(ctx);
    const status = String((body as any).status || '');
    if (!['active','paused','archived','draft'].includes(status)) return json({ error: 'Invalid AI bot status.' }, 400);
    const { data, error } = await adminDb.from('ai_bots').update({ status, updated_at: new Date().toISOString() }).eq('id', path[2]).select('*').single();
    if (error) throw new Error(error.message);
    await adminDb.from('audit_logs').insert({ actor_id: ctx.user.id, organization_id: data.organization_id, action: 'admin.bot_status_updated', entity_type: 'ai_bot', entity_id: path[2], details: { status } });
    return json(botShape(data));
  }
  if (path[0] === 'admin' && path[1] === 'channels' && path[2] && method === 'PUT') {
    const adminDb = await requireAdmin(ctx);
    const status = String((body as any).status || '');
    if (!['connected','disconnected','error'].includes(status)) return json({ error: 'Invalid channel connection status.' }, 400);
    const { data, error } = await adminDb.from('whatsapp_connections').update({ connection_status: status, updated_at: new Date().toISOString() }).eq('id', path[2]).select('*').single();
    if (error) throw new Error(error.message);
    await adminDb.from('audit_logs').insert({ actor_id: ctx.user.id, organization_id: data.organization_id, action: 'admin.channel_status_updated', entity_type: 'whatsapp_connection', entity_id: path[2], details: { status } });
    return json({ id: data.id, status: data.connection_status });
  }
  if (path[0] === 'admin' && path[1] === 'workspaces' && path[2] && method === 'PUT') {
    const adminDb = await requireAdmin(ctx);
    const status = String((body as any).status || '');
    if (!['active','suspended'].includes(status)) return json({ error: 'Workspace status must be active or suspended.' }, 400);
    const { data, error } = await adminDb.from('organizations').update({ status }).eq('id', path[2]).select('*').single();
    if (error) throw new Error(error.message);
    await adminDb.from('audit_logs').insert({ actor_id: ctx.user.id, organization_id: path[2], action: 'admin.workspace_status_updated', entity_type: 'organization', entity_id: path[2], details: { status } });
    return json(data);
  }
  if (path[0] === 'admin' && path[1] === 'plans' && path[2] && method === 'PUT') {
    const adminDb = await requireAdmin(ctx);
    const updates: any = { updated_at: new Date().toISOString() };
    if ((body as any).price !== undefined) updates.price = Number((body as any).price);
    if ((body as any).botsLimit !== undefined) updates.bots_limit = Number((body as any).botsLimit);
    if ((body as any).messagesLimit !== undefined) updates.messages_limit = Number((body as any).messagesLimit);
    if ((body as any).apiLimit !== undefined) updates.api_limit = Number((body as any).apiLimit);
    if ((body as any).isActive !== undefined) updates.is_active = Boolean((body as any).isActive);
    const { data, error } = await adminDb.from('plans').update(updates).eq('id', path[2]).select('*').single();
    if (error) throw new Error(error.message);
    await adminDb.from('audit_logs').insert({ actor_id: ctx.user.id, action: 'admin.plan_updated', entity_type: 'plan', entity_id: path[2], details: updates });
    return json(data);
  }
  if (path[0] === 'admin' && path[1] === 'plans' && path[2] && method === 'DELETE') {
    const adminDb = await requireAdmin(ctx);
    const { error } = await adminDb.from('plans').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', path[2]);
    if (error) throw new Error(error.message);
    return json({ success: true });
  }

  return json({ error: `API route not found: ${method} /api/${route}` }, 404);
}

async function route(request: NextRequest, params: Promise<{ path: string[] }>) {
  try {
    return await handle(request, params);
  } catch (error: any) {
    const message = error?.message || 'Unexpected API error.';
    const status = /sign in|session is invalid/i.test(message) ? 401
      : /administrator access/i.test(message) ? 403
      : /workspace|access to this workspace/i.test(message) ? 403
      : /not configured|missing on the server|must decode/i.test(message) ? 503
      : 500;
    return json({ error: message }, status);
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: RouteContext) { return route(request, context.params); }
export async function POST(request: NextRequest, context: RouteContext) { return route(request, context.params); }
export async function PUT(request: NextRequest, context: RouteContext) { return route(request, context.params); }
export async function DELETE(request: NextRequest, context: RouteContext) { return route(request, context.params); }
