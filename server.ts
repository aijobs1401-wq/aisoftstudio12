import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Supabase Client with official project URL and keys
const supabaseUrl = process.env.SUPABASE_URL || 'https://jkufkafmkgfshbvfsapr.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprdWZrYWZta2dmc2hidmZzYXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzg2MDAsImV4cCI6MjA1NTc1NDYwMH0.mock_key_for_build';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initial seed data for local fallback
const initialDb = {
  users: [
    {
      id: 'usr_admin',
      name: 'Master Admin',
      email: 'admin@aisoftstudio.com',
      role: 'master_admin',
      workspaceId: 'ws_master',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_owner',
      name: 'Rahul Sharma',
      email: 'owner@mybusiness.com',
      role: 'owner',
      workspaceId: 'ws_1',
      createdAt: new Date().toISOString()
    }
  ],
  workspaces: [
    {
      id: 'ws_master',
      name: 'AI Soft Studio Global',
      plan: 'Enterprise',
      ownerId: 'usr_admin',
      createdAt: new Date().toISOString()
    },
    {
      id: 'ws_1',
      name: 'Sharma Electronics & E-Com',
      plan: 'Professional',
      ownerId: 'usr_owner',
      createdAt: new Date().toISOString()
    }
  ],
  bots: [
    {
      id: 'bot_1',
      workspaceId: 'ws_1',
      name: 'Sharma Electronics Support Bot',
      welcomeMessage: 'Namaste! Welcome to Sharma Electronics. How can I help you with our products, orders, or support today?',
      personality: 'Helpful, polite, professional retail assistant fluent in Hindi, Hinglish, and English. Always polite and concise.',
      language: 'multi',
      primaryColor: '#f97316',
      secondaryColor: '#18181b',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150',
      status: 'active',
      knowledgeSources: [
        { id: 'ks_1', type: 'faq', title: 'Return & Refund Policy', content: 'We offer a 7-day easy return policy for all electronics items in original packaging with invoice.' },
        { id: 'ks_2', type: 'faq', title: 'Shipping & Delivery', content: 'Free delivery across India within 3-5 business days. Express shipping available in major metros.' },
        { id: 'ks_3', type: 'product', title: 'Smart LED TV 43inch', content: 'Price: ₹24,999. 4K Ultra HD, Dolby Audio, 2 Year Warranty. Best seller.' }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  conversations: [
    {
      id: 'conv_1',
      botId: 'bot_1',
      workspaceId: 'ws_1',
      customerName: 'Amit Verma',
      customerPhone: '+919876543210',
      customerEmail: 'amit@example.com',
      channel: 'whatsapp',
      status: 'active',
      messages: [
        { id: 'm_1', sender: 'bot', text: 'Namaste! Welcome to Sharma Electronics. How can I help you with our products, orders, or support today?', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'm_2', sender: 'customer', text: 'Bhai, Smart LED TV ka price kya hai aur warranty kitni milti hai?', timestamp: new Date(Date.now() - 3500000).toISOString() },
        { id: 'm_3', sender: 'bot', text: 'Namaste! Our Smart LED TV 43-inch is priced at ₹24,999 and comes with a full 2-year manufacturer warranty. Free delivery is also included across India! Would you like to place an order?', timestamp: new Date(Date.now() - 3490000).toISOString() }
      ],
      lastMessageAt: new Date(Date.now() - 3490000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  leads: [
    {
      id: 'lead_1',
      botId: 'bot_1',
      workspaceId: 'ws_1',
      name: 'Amit Verma',
      phone: '+919876543210',
      email: 'amit@example.com',
      interest: 'Smart LED TV 43inch',
      status: 'New',
      createdAt: new Date().toISOString()
    }
  ],
  channels: [
    {
      id: 'ch_wa_1',
      workspaceId: 'ws_1',
      botId: 'bot_1',
      type: 'whatsapp',
      status: 'connected',
      phoneNumberId: '109283746501928',
      displayPhoneNumber: '+91 98765 43210',
      accessToken: 'EAAB_MOCK_TOKEN_WHATSAPP_SECURE',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ch_fb_1',
      workspaceId: 'ws_1',
      botId: 'bot_1',
      type: 'messenger',
      status: 'connected',
      pageId: 'page_98237492',
      pageName: 'Sharma Electronics Official',
      accessToken: 'EAAB_MOCK_TOKEN_MESSENGER',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'ch_ig_1',
      workspaceId: 'ws_1',
      botId: 'bot_1',
      type: 'instagram',
      status: 'connected',
      instagramId: 'ig_sharma_elec',
      accessToken: 'EAAB_MOCK_TOKEN_INSTAGRAM',
      updatedAt: new Date().toISOString()
    }
  ],
  apikeys: [
    {
      id: 'key_1',
      workspaceId: 'ws_1',
      name: 'Production E-Commerce Widget Key',
      keyPrefix: 'ass_live_9f8c...',
      keyHash: 'mock_hashed_key_123',
      secretKey: 'ass_live_secret_mock_xyz',
      requestsCount: 1240,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ],
  subscriptions: [
    {
      workspaceId: 'ws_1',
      planName: 'Professional',
      status: 'active',
      botsLimit: 5,
      messagesLimit: 10000,
      messagesUsed: 2450,
      apiLimit: 5000,
      apiUsed: 1240,
      renewAt: new Date(Date.now() + 2592000000).toISOString()
    }
  ],
  plans: [
    { id: 'plan_starter', name: 'Starter', price: 999, botsLimit: 1, messagesLimit: 1000, apiLimit: 500, status: 'active' },
    { id: 'plan_pro', name: 'Professional', price: 2999, botsLimit: 5, messagesLimit: 10000, apiLimit: 5000, status: 'active' },
    { id: 'plan_enterprise', name: 'Enterprise', price: 7999, botsLimit: 25, messagesLimit: 100000, apiLimit: 50000, status: 'active' }
  ],
  payments: [
    { id: 'pay_1', workspaceId: 'ws_1', amount: 2999, currency: 'INR', status: 'verified', provider: 'razorpay', orderId: 'order_mock_982374', createdAt: new Date().toISOString() }
  ],
  aiConfig: {
    defaultModel: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024,
    safetyFilter: 'strict'
  },
  webhookEvents: [],
  logs: [
    { id: 'log_1', level: 'info', message: 'Razorpay payment verified successfully for order_mock_982374', timestamp: new Date(Date.now() - 7200000).toISOString() },
    { id: 'log_2', level: 'info', message: 'Master Admin updated platform AI configuration model to gemini-2.5-flash', timestamp: new Date(Date.now() - 86400000).toISOString() }
  ]
};

// Database helper supporting Supabase PostgreSQL with fallback to local JSON file store
async function getDbData(): Promise<any> {
  if (supabase) {
    try {
      const [
        { data: users },
        { data: workspaces },
        { data: bots },
        { data: conversations },
        { data: leads },
        { data: channels },
        { data: apikeys },
        { data: subscriptions },
        { data: plans },
        { data: payments },
        { data: webhookEvents },
        { data: logs }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('workspaces').select('*'),
        supabase.from('bots').select('*'),
        supabase.from('conversations').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('channels').select('*'),
        supabase.from('apikeys').select('*'),
        supabase.from('subscriptions').select('*'),
        supabase.from('plans').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('webhook_events').select('*'),
        supabase.from('logs').select('*')
      ]);

      if (workspaces && workspaces.length > 0) {
        return {
          users: users || [],
          workspaces: workspaces || [],
          bots: (bots || []).map((b: any) => ({ ...b, knowledgeSources: b.knowledge_sources || b.knowledgeSources || [] })),
          conversations: conversations || [],
          leads: leads || [],
          channels: channels || [],
          apikeys: apikeys || [],
          subscriptions: subscriptions || [],
          plans: plans || [],
          payments: payments || [],
          aiConfig: { defaultModel: 'gemini-2.5-flash', temperature: 0.7 },
          webhookEvents: webhookEvents || [],
          logs: logs || []
        };
      }
    } catch (err) {
      console.warn('Supabase fetch warning, falling back to local store:', err);
    }
  }

  // Fallback to JSON file store
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return initialDb;
  }
}

async function saveDbData(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

  if (supabase) {
    try {
      // Upsert workspaces & bots as authoritative persistence
      for (const ws of data.workspaces || []) {
        await supabase.from('workspaces').upsert({ id: ws.id, name: ws.name, plan: ws.plan, owner_id: ws.ownerId });
      }
      for (const bot of data.bots || []) {
        await supabase.from('bots').upsert({
          id: bot.id,
          workspace_id: bot.workspaceId,
          name: bot.name,
          welcome_message: bot.welcomeMessage,
          personality: bot.personality,
          language: bot.language,
          status: bot.status,
          knowledge_sources: bot.knowledgeSources
        });
      }
    } catch (err) {
      console.warn('Supabase sync warning:', err);
    }
  }
}

// Synchronous helper for standard request flow
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return initialDb;
  }
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

async function processAiMessage(bot: any, userMessage: string, history: any[] = []) {
  const db = readDb();
  const sub = db.subscriptions.find((s: any) => s.workspaceId === bot.workspaceId);
  if (sub && sub.messagesUsed >= sub.messagesLimit) {
    return `[Quota Exceeded] Namaste! This workspace has reached its monthly AI message limit. Please upgrade your subscription plan in the dashboard to continue chatting.`;
  }

  try {
    if (!apiKey) {
      return `[Demo AI Mode] Namaste! I received your inquiry: "${userMessage}". Our team at ${bot.name} is ready to help you!`;
    }

    const knowledgeContext = bot.knowledgeSources
      ?.map((ks: any) => `[${ks.type.toUpperCase()}] ${ks.title}: ${ks.content}`)
      .join('\n') || '';

    const systemPrompt = `You are an expert AI business assistant for chatbot brand "AI SOFT STUDIO".
Bot Name: ${bot.name}
Personality & Instructions: ${bot.personality}
Supported Languages: Hindi, Hinglish, English. Respond in the language the user speaks or asks in (Hindi/Hinglish/English).
Knowledge Base & Policies:
${knowledgeContext}

Rules:
- Be helpful, polite, and accurate.
- Answer questions based strictly on the knowledge base provided when applicable.
- Never invent prices, fake order statuses, or unauthorized policies. If unsure, offer human handover.
- Keep responses concise and engaging.`;

    const chatHistory = history.map((m: any) => ({
      role: m.sender === 'customer' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const config = db.aiConfig || { defaultModel: 'gemini-2.5-flash', temperature: 0.7 };
    const chat = ai.chats.create({
      model: config.defaultModel || 'gemini-2.5-flash',
      config: {
        systemInstruction: systemPrompt,
        temperature: config.temperature || 0.7,
      },
      history: chatHistory
    });

    const result = await chat.sendMessage({ message: userMessage });
    return result.text || 'Namaste! How else can I assist you today?';
  } catch (err: any) {
    console.error('Gemini AI Inference Error:', err);
    return `Namaste! I am currently processing your request. For immediate assistance, our support team is here to help you.`;
  }
}

// -------------------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found. Try owner@mybusiness.com or admin@aisoftstudio.com' });
  }
  res.json({ user, token: 'mock_jwt_token_' + user.id });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const db = readDb();
  let user = db.users[1];
  if (authHeader?.includes('usr_admin')) {
    user = db.users[0];
  }
  res.json({ user });
});

app.get('/api/workspaces', async (req, res) => {
  const db = await getDbData();
  res.json(db.workspaces);
});

// Bots CRUD
app.get('/api/bots', async (req, res) => {
  const workspaceId = req.query.workspaceId as string || 'ws_1';
  const db = await getDbData();
  const bots = db.bots.filter((b: any) => b.workspaceId === workspaceId || workspaceId === 'ws_master');
  res.json(bots);
});

app.post('/api/bots', async (req, res) => {
  const { workspaceId, name, welcomeMessage, personality, language } = req.body;
  const db = readDb();
  const sub = db.subscriptions.find((s: any) => s.workspaceId === (workspaceId || 'ws_1'));
  const currentBotsCount = db.bots.filter((b: any) => b.workspaceId === (workspaceId || 'ws_1')).length;
  if (sub && currentBotsCount >= sub.botsLimit) {
    return res.status(403).json({ error: `Bot limit reached for your ${sub.planName} plan. Please upgrade to create more bots.` });
  }

  const newBot = {
    id: 'bot_' + Date.now(),
    workspaceId: workspaceId || 'ws_1',
    name: name || 'New AI Assistant',
    welcomeMessage: welcomeMessage || 'Hello! How can I help you today?',
    personality: personality || 'Professional and helpful assistant.',
    language: language || 'multi',
    primaryColor: '#f97316',
    secondaryColor: '#18181b',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150',
    status: 'active',
    knowledgeSources: [
      { id: 'ks_' + Date.now(), type: 'faq', title: 'General Info', content: 'Welcome to our business!' }
    ],
    createdAt: new Date().toISOString()
  };
  db.bots.push(newBot);
  db.logs.push({ id: 'log_' + Date.now(), level: 'info', message: `Chatbot created: ${newBot.name}`, timestamp: new Date().toISOString() });
  await saveDbData(db);
  res.json(newBot);
});

app.put('/api/bots/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const index = db.bots.findIndex((b: any) => b.id === id);
  if (index === -1) return res.status(404).json({ error: 'Bot not found' });

  db.bots[index] = { ...db.bots[index], ...req.body };
  await saveDbData(db);
  res.json(db.bots[index]);
});

app.delete('/api/bots/:id', async (req, res) => {
  const { id } = req.params;
  const db = readDb();
  db.bots = db.bots.filter((b: any) => b.id !== id);
  await saveDbData(db);
  res.json({ success: true });
});

// Knowledge source management
app.post('/api/bots/:id/knowledge', async (req, res) => {
  const { id } = req.params;
  const { type, title, content } = req.body;
  const db = readDb();
  const bot = db.bots.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  const newKs = { id: 'ks_' + Date.now(), type: type || 'faq', title, content };
  bot.knowledgeSources.push(newKs);
  await saveDbData(db);
  res.json(bot);
});

app.delete('/api/bots/:id/knowledge/:ksId', async (req, res) => {
  const { id, ksId } = req.params;
  const db = readDb();
  const bot = db.bots.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Bot not found' });

  bot.knowledgeSources = bot.knowledgeSources.filter((ks: any) => ks.id !== ksId);
  await saveDbData(db);
  res.json(bot);
});

// Public bot info
app.get('/api/chatbots/:id/public', async (req, res) => {
  const { id } = req.params;
  const db = await getDbData();
  const bot = db.bots.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Chatbot not found' });
  res.json({
    id: bot.id,
    name: bot.name,
    welcomeMessage: bot.welcomeMessage,
    primaryColor: bot.primaryColor,
    secondaryColor: bot.secondaryColor,
    avatarUrl: bot.avatarUrl,
    status: bot.status
  });
});

// Public chat message interaction & Widget chat
app.post('/api/chatbots/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { message, conversationId, customerName, customerPhone, customerEmail } = req.body;
  const db = readDb();
  const bot = db.bots.find((b: any) => b.id === id);
  if (!bot) return res.status(404).json({ error: 'Chatbot not found' });

  let conversation = db.conversations.find((c: any) => c.id === conversationId);
  if (!conversation) {
    conversation = {
      id: 'conv_' + Date.now(),
      botId: bot.id,
      workspaceId: bot.workspaceId,
      customerName: customerName || 'Visitor',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      channel: 'web_widget',
      status: 'active',
      messages: [
        { id: 'm_init', sender: 'bot', text: bot.welcomeMessage, timestamp: new Date().toISOString() }
      ],
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    db.conversations.unshift(conversation);
  }

  const userMsg = { id: 'm_' + Date.now(), sender: 'customer', text: message, timestamp: new Date().toISOString() };
  conversation.messages.push(userMsg);

  const aiReplyText = await processAiMessage(bot, message, conversation.messages);
  const botMsg = { id: 'm_' + (Date.now() + 1), sender: 'bot', text: aiReplyText, timestamp: new Date().toISOString() };
  conversation.messages.push(botMsg);
  conversation.lastMessageAt = new Date().toISOString();

  const sub = db.subscriptions.find((s: any) => s.workspaceId === bot.workspaceId);
  if (sub) {
    sub.messagesUsed = (sub.messagesUsed || 0) + 1;
  }

  if (customerPhone || customerEmail || message.includes('@') || message.match(/\d{10}/)) {
    const existingLead = db.leads.find((l: any) => l.botId === bot.id && (l.phone === customerPhone || l.email === customerEmail));
    if (!existingLead) {
      db.leads.unshift({
        id: 'lead_' + Date.now(),
        botId: bot.id,
        workspaceId: bot.workspaceId,
        name: customerName || 'Website Visitor',
        phone: customerPhone || '',
        email: customerEmail || '',
        interest: message.slice(0, 50),
        status: 'New',
        createdAt: new Date().toISOString()
      });
    }
  }

  await saveDbData(db);
  res.json({
    conversationId: conversation.id,
    reply: aiReplyText,
    messages: conversation.messages
  });
});

app.get('/api/conversations', async (req, res) => {
  const workspaceId = req.query.workspaceId as string || 'ws_1';
  const db = await getDbData();
  const convs = db.conversations.filter((c: any) => c.workspaceId === workspaceId || workspaceId === 'ws_master');
  res.json(convs);
});

app.post('/api/conversations/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const db = readDb();
  const conv = db.conversations.find((c: any) => c.id === id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const adminMsg = { id: 'm_' + Date.now(), sender: 'admin', text, timestamp: new Date().toISOString() };
  conv.messages.push(adminMsg);
  conv.status = 'human_handover';
  conv.lastMessageAt = new Date().toISOString();
  await saveDbData(db);
  res.json(conv);
});

app.get('/api/leads', async (req, res) => {
  const workspaceId = req.query.workspaceId as string || 'ws_1';
  const db = await getDbData();
  const leads = db.leads.filter((l: any) => l.workspaceId === workspaceId || workspaceId === 'ws_master');
  res.json(leads);
});

// Payments
app.post('/api/payment/order', async (req, res) => {
  const { workspaceId, planName, amount } = req.body;
  const db = readDb();
  const orderId = 'order_rzp_' + Math.random().toString(36).substring(2, 12);
  
  const paymentRecord = {
    id: 'pay_' + Date.now(),
    workspaceId: workspaceId || 'ws_1',
    amount: amount || 2999,
    currency: 'INR',
    status: 'created',
    provider: 'razorpay',
    orderId,
    planName,
    createdAt: new Date().toISOString()
  };

  db.payments.unshift(paymentRecord);
  await saveDbData(db);

  res.json({
    orderId,
    amount: paymentRecord.amount,
    currency: paymentRecord.currency,
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey123'
  });
});

app.post('/api/webhooks/payment', async (req, res) => {
  const event = req.body;
  const db = readDb();

  const eventId = event.payload?.payment?.entity?.id || 'evt_' + Date.now();
  const existingEvent = db.webhookEvents.find((e: any) => e.eventId === eventId);
  if (existingEvent) {
    return res.status(200).json({ status: 'duplicate_ignored' });
  }

  if (event.event === 'payment.captured' || event.event === 'order.paid' || event.payload) {
    const paymentEntity = event.payload?.payment?.entity || {};
    const orderId = paymentEntity.order_id || event.payload?.order?.entity?.id;

    const payment = db.payments.find((p: any) => p.orderId === orderId);
    if (payment) {
      payment.status = 'verified';
      const planName = payment.planName || 'Professional';
      let sub = db.subscriptions.find((s: any) => s.workspaceId === payment.workspaceId);
      if (!sub) {
        sub = { workspaceId: payment.workspaceId, planName, status: 'active' };
        db.subscriptions.push(sub);
      }
      sub.planName = planName;
      sub.status = 'active';
      if (planName === 'Enterprise') {
        sub.botsLimit = 25;
        sub.messagesLimit = 100000;
        sub.apiLimit = 50000;
      } else if (planName === 'Business') {
        sub.botsLimit = 10;
        sub.messagesLimit = 30000;
        sub.apiLimit = 15000;
      } else if (planName === 'Professional') {
        sub.botsLimit = 5;
        sub.messagesLimit = 10000;
        sub.apiLimit = 5000;
      } else {
        sub.botsLimit = 1;
        sub.messagesLimit = 1000;
        sub.apiLimit = 500;
      }
      sub.renewAt = new Date(Date.now() + 2592000000).toISOString();

      db.logs.push({
        id: 'log_' + Date.now(),
        level: 'info',
        message: `Verified payment ${payment.orderId} and activated subscription ${planName} for workspace ${payment.workspaceId}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  db.webhookEvents.push({
    id: 'whe_' + Date.now(),
    provider: 'razorpay',
    eventId,
    processedAt: new Date().toISOString()
  });

  await saveDbData(db);
  res.status(200).json({ status: 'ok' });
});

// Admin
app.get('/api/admin/overview', async (req, res) => {
  const db = await getDbData();
  res.json({
    totalUsers: db.users.length,
    totalWorkspaces: db.workspaces.length,
    totalBots: db.bots.length,
    totalConversations: db.conversations.length,
    totalLeads: db.leads.length,
    users: db.users,
    workspaces: db.workspaces,
    bots: db.bots,
    channels: db.channels,
    plans: db.plans || [],
    payments: db.payments || [],
    aiConfig: db.aiConfig || {},
    logs: db.logs
  });
});

app.put('/api/admin/ai-config', async (req, res) => {
  const { defaultModel, temperature, maxTokens } = req.body;
  const db = readDb();
  db.aiConfig = {
    ...db.aiConfig,
    defaultModel: defaultModel || db.aiConfig.defaultModel,
    temperature: temperature !== undefined ? Number(temperature) : db.aiConfig.temperature,
    maxTokens: maxTokens !== undefined ? Number(maxTokens) : db.aiConfig.maxTokens
  };
  db.logs.push({
    id: 'log_' + Date.now(),
    level: 'info',
    message: `Master Admin updated AI config: model=${db.aiConfig.defaultModel}, temp=${db.aiConfig.temperature}`,
    timestamp: new Date().toISOString()
  });
  await saveDbData(db);
  res.json(db.aiConfig);
});

app.get('/api/admin/plans', async (req, res) => {
  const db = await getDbData();
  res.json(db.plans || []);
});

app.post('/api/admin/plans', async (req, res) => {
  const { name, price, botsLimit, messagesLimit, apiLimit } = req.body;
  const db = readDb();
  const newPlan = {
    id: 'plan_' + Date.now(),
    name: name || 'Custom Plan',
    price: Number(price) || 1999,
    botsLimit: Number(botsLimit) || 3,
    messagesLimit: Number(messagesLimit) || 5000,
    apiLimit: Number(apiLimit) || 2000,
    status: 'active'
  };
  if (!db.plans) db.plans = [];
  db.plans.push(newPlan);
  db.logs.push({ id: 'log_' + Date.now(), level: 'info', message: `New subscription plan created: ${newPlan.name}`, timestamp: new Date().toISOString() });
  await saveDbData(db);
  res.json(newPlan);
});

// Catch-all for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Serve Website Widget Script
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  const scriptTag = document.currentScript || document.querySelector('script[data-bot-id]');
  if (!scriptTag) return;
  const botId = scriptTag.getAttribute('data-bot-id');
  if (!botId) return;

  const hostUrl = window.location.origin;

  const btn = document.createElement('div');
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed; bottom:20px; right:20px; width:60px; height:60px; background:#f97316; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; cursor:pointer; box-shadow:0 10px 25px rgba(0,0,0,0.3); z-index:999999; transition:transform 0.2s;';
  btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  document.body.appendChild(btn);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed; bottom:95px; right:20px; width:380px; height:560px; max-width:90vw; max-height:80vh; background:#18181b; border-radius:16px; box-shadow:0 15px 35px rgba(0,0,0,0.4); border:1px solid #27272a; z-index:999999; display:none; flex-direction:column; overflow:hidden; font-family:system-ui, sans-serif;';
  container.innerHTML = \`<iframe src="\${hostUrl}/chat/\${botId}?widget=true" style="width:100%; height:100%; border:none;" title="AI Soft Studio Chatbot"></iframe>\`;
  document.body.appendChild(container);

  let isOpen = false;
  btn.onclick = () => {
    isOpen = !isOpen;
    container.style.display = isOpen ? 'flex' : 'none';
  };
})();
  `);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 AI SOFT STUDIO Supabase-Integrated server running on http://localhost:${PORT}`);
});
