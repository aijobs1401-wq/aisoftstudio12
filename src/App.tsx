import React, { useState, useEffect } from 'react';
import { 
  Bot, MessageSquare, Users, Database, Globe, Key, CreditCard, ShieldAlert, 
  Plus, Settings, Send, Copy, Check, QrCode, Phone, Share2, RefreshCw, 
  ExternalLink, LogOut, Sparkles, AlertCircle, CheckCircle2, ChevronRight,
  HelpCircle, Trash2, Edit3, Eye, Smartphone, Laptop, Search, Lock,
  Menu, X, ArrowRight, ShieldCheck, Zap, Code, Terminal, Camera as Instagram, MessageCircle as Facebook
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [activeRoute, setActiveRoute] = useState<string>('home'); // home, features, pricing, login, register, forgot, privacy, terms, dashboard
  const [activeTab, setActiveTab] = useState<string>('overview'); // overview, studio, inbox, leads, channels, api, billing, admin
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('ws_1');
  const [bots, setBots] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);

  // Selected bot for studio/testing
  const [selectedBot, setSelectedBot] = useState<any>(null);

  // Public chat route check
  const [publicChatBotId, setPublicChatBotId] = useState<string | null>(null);
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  // Auth form states
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusiness, setAuthBusiness] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(1);

  // Check URL path on mount
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(new RegExp('^/chat/([^/]+)$'));
    if (match) {
      setPublicChatBotId(match[1]);
      const params = new URLSearchParams(window.location.search);
      if (params.get('widget') === 'true') {
        setIsWidgetMode(true);
      }
    }
  }, []);

  const login = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setToken(data.token);
        setSelectedWorkspace(data.user.workspaceId);
        loadWorkspaceData(data.user.workspaceId);
        setActiveRoute('dashboard');
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const loadWorkspaceData = async (wsId: string) => {
    try {
      const [wsRes, botsRes, convsRes, leadsRes, chansRes, keysRes, subRes] = await Promise.all([
        fetch('/api/workspaces').then(r => r.json()),
        fetch(`/api/bots?workspaceId=${wsId}`).then(r => r.json()),
        fetch(`/api/conversations?workspaceId=${wsId}`).then(r => r.json()),
        fetch(`/api/leads?workspaceId=${wsId}`).then(r => r.json()),
        fetch(`/api/channels?workspaceId=${wsId}`).then(r => r.json()),
        fetch(`/api/apikeys?workspaceId=${wsId}`).then(r => r.json()),
        fetch(`/api/subscription?workspaceId=${wsId}`).then(r => r.json()),
      ]);

      setWorkspaces(wsRes);
      setBots(botsRes);
      if (botsRes.length > 0 && !selectedBot) {
        setSelectedBot(botsRes[0]);
      }
      setConversations(convsRes);
      setLeads(leadsRes);
      setChannels(chansRes);
      setApiKeys(keysRes);
      setSubscription(subRes);

      if (user?.role === 'master_admin') {
        const adminRes = await fetch('/api/admin/overview').then(r => r.json());
        setAdminData(adminRes);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  // If public chat view
  if (publicChatBotId) {
    return <PublicChatView botId={publicChatBotId} isWidget={isWidgetMode} />;
  }

  // If viewing public marketing pages or auth
  if (!user && activeRoute !== 'dashboard') {
    return (
      <PublicWebsite 
        activeRoute={activeRoute} 
        setActiveRoute={setActiveRoute} 
        authEmail={authEmail} setAuthEmail={setAuthEmail}
        authPassword={authPassword} setAuthPassword={setAuthPassword}
        authName={authName} setAuthName={setAuthName}
        authBusiness={authBusiness} setAuthBusiness={setAuthBusiness}
        onLogin={login}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans selection:bg-orange-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900/80 backdrop-blur border-r border-zinc-800 flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo header */}
          <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between cursor-pointer" onClick={() => setActiveRoute('home')}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20">
                AI
              </div>
              <div>
                <h1 className="font-extrabold text-sm tracking-wide text-white">AI SOFT STUDIO</h1>
                <span className="text-[10px] text-orange-400 font-medium px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20">
                  {user?.role === 'master_admin' ? 'Master Admin' : 'Pro SaaS'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-sm">
            <NavItem icon={<Bot className="w-4 h-4" />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
            <NavItem icon={<MessageSquare className="w-4 h-4" />} label="Chatbots Studio" active={activeTab === 'studio'} onClick={() => setActiveTab('studio')} />
            <NavItem icon={<Users className="w-4 h-4" />} label="Live Inbox & Handover" active={activeTab === 'inbox'} count={conversations.filter(c => c.status === 'human_handover').length} onClick={() => setActiveTab('inbox')} />
            <NavItem icon={<Database className="w-4 h-4" />} label="Leads & Customers" active={activeTab === 'leads'} count={leads.length} onClick={() => setActiveTab('leads')} />
            <NavItem icon={<Globe className="w-4 h-4" />} label="Channels (WA, IG, FB)" active={activeTab === 'channels'} onClick={() => setActiveTab('channels')} />
            <NavItem icon={<Key className="w-4 h-4" />} label="API & Widget Embed" active={activeTab === 'api'} onClick={() => setActiveTab('api')} />
            <NavItem icon={<CreditCard className="w-4 h-4" />} label="Subscription & Limits" active={activeTab === 'billing'} onClick={() => setActiveTab('billing')} />
            {user?.role === 'master_admin' && (
              <NavItem icon={<ShieldAlert className="w-4 h-4 text-amber-400" />} label="Master Admin Panel" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            )}
          </nav>
        </div>

        {/* Workspace Switcher & User Profile */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40">
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Active Workspace</label>
            <select
              value={selectedWorkspace}
              onChange={(e) => {
                setSelectedWorkspace(e.target.value);
                loadWorkspaceData(e.target.value);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            >
              {workspaces.map((ws: any) => (
                <option key={ws.id} value={ws.id}>{ws.name} ({ws.plan})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-600/20 text-orange-400 font-bold flex items-center justify-center text-xs border border-orange-500/30">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUser(null);
                setActiveRoute('home');
              }}
              title="Sign Out"
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/40 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveRoute('home')} className="md:hidden text-orange-500 font-bold text-lg">AI SOFT STUDIO</button>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              {activeTab === 'overview' && 'Overview & Analytics'}
              {activeTab === 'studio' && 'Chatbots & Knowledge Studio'}
              {activeTab === 'inbox' && 'Live Inbox & Human Handover'}
              {activeTab === 'leads' && 'Customer Leads & Inquiries'}
              {activeTab === 'channels' && 'WhatsApp, Instagram & Messenger Integrations'}
              {activeTab === 'api' && 'API Keys & Website Widget Setup'}
              {activeTab === 'billing' && 'Subscription Plans & Usage Limits'}
              {activeTab === 'admin' && 'Master Admin Control Panel'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveRoute('home')}
              className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition"
            >
              Public Website
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini 2.5 Flash Engine Active</span>
            </div>
            {selectedBot && (
              <a
                href={`/chat/${selectedBot.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition border border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Chat Page
              </a>
            )}
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          {activeTab === 'overview' && (
            <DashboardOverview 
              bots={bots} 
              conversations={conversations} 
              leads={leads} 
              subscription={subscription} 
              onNavigate={setActiveTab} 
            />
          )}

          {activeTab === 'studio' && (
            <ChatbotStudio 
              bots={bots} 
              selectedBot={selectedBot} 
              setSelectedBot={setSelectedBot} 
              workspaceId={selectedWorkspace}
              onRefresh={() => loadWorkspaceData(selectedWorkspace)} 
            />
          )}

          {activeTab === 'inbox' && (
            <LiveInbox 
              conversations={conversations} 
              workspaceId={selectedWorkspace} 
              onRefresh={() => loadWorkspaceData(selectedWorkspace)} 
            />
          )}

          {activeTab === 'leads' && (
            <LeadsView leads={leads} />
          )}

          {activeTab === 'channels' && (
            <ChannelsView channels={channels} workspaceId={selectedWorkspace} onRefresh={() => loadWorkspaceData(selectedWorkspace)} />
          )}

          {activeTab === 'api' && (
            <ApiWidgetView apiKeys={apiKeys} bots={bots} workspaceId={selectedWorkspace} onRefresh={() => loadWorkspaceData(selectedWorkspace)} />
          )}

          {activeTab === 'billing' && (
            <BillingView subscription={subscription} workspaceId={selectedWorkspace} onRefresh={() => loadWorkspaceData(selectedWorkspace)} />
          )}

          {activeTab === 'admin' && user?.role === 'master_admin' && (
            <MasterAdminView adminData={adminData} />
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, count, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
        active 
          ? 'bg-orange-600/15 text-orange-400 border border-orange-500/30 font-semibold shadow-sm' 
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {icon}
        <span>{label}</span>
      </div>
      {count > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

// -------------------------------------------------------------------------
// PUBLIC MARKETING WEBSITE
// -------------------------------------------------------------------------
function PublicWebsite({ activeRoute, setActiveRoute, authEmail, setAuthEmail, authPassword, setAuthPassword, authName, setAuthName, authBusiness, setAuthBusiness, onLogin }: any) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Navbar */}
      <header className="h-20 border-b border-zinc-900 px-6 lg:px-12 flex items-center justify-between bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveRoute('home')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/20">
            AI
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white">AI SOFT STUDIO</h1>
            <span className="text-[10px] text-orange-400 font-medium">Professional AI Chatbot SaaS</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-300">
          <button onClick={() => setActiveRoute('home')} className="hover:text-orange-400 transition">Home</button>
          <button onClick={() => setActiveRoute('features')} className="hover:text-orange-400 transition">Features</button>
          <button onClick={() => setActiveRoute('pricing')} className="hover:text-orange-400 transition">Pricing</button>
          <button onClick={() => setActiveRoute('privacy')} className="hover:text-orange-400 transition">Privacy</button>
          <button onClick={() => setActiveRoute('terms')} className="hover:text-orange-400 transition">Terms</button>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => setActiveRoute('login')}
            className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition"
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveRoute('register')}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-lg shadow-orange-600/20 flex items-center gap-2"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-zinc-300">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 p-6 space-y-4 text-xs font-semibold">
          <button onClick={() => { setActiveRoute('home'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-zinc-300">Home</button>
          <button onClick={() => { setActiveRoute('features'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-zinc-300">Features</button>
          <button onClick={() => { setActiveRoute('pricing'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-zinc-300">Pricing</button>
          <button onClick={() => { setActiveRoute('login'); setMobileMenuOpen(false); }} className="block w-full text-left py-2 text-orange-400">Sign In</button>
          <button onClick={() => { setActiveRoute('register'); setMobileMenuOpen(false); }} className="w-full py-2.5 bg-orange-600 text-white rounded-xl text-center">Get Started Free</button>
        </div>
      )}

      {/* Route Content */}
      <div className="flex-1">
        {activeRoute === 'home' && <HomeView setActiveRoute={setActiveRoute} />}
        {activeRoute === 'features' && <FeaturesView setActiveRoute={setActiveRoute} />}
        {activeRoute === 'pricing' && <PricingView setActiveRoute={setActiveRoute} onLogin={onLogin} />}
        {activeRoute === 'privacy' && <PrivacyView />}
        {activeRoute === 'terms' && <TermsView />}
        {activeRoute === 'login' && <LoginView setActiveRoute={setActiveRoute} onLogin={onLogin} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} />}
        {activeRoute === 'register' && <RegisterView setActiveRoute={setActiveRoute} onLogin={onLogin} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authName={authName} setAuthName={setAuthName} authBusiness={authBusiness} setAuthBusiness={setAuthBusiness} />}
        {activeRoute === 'forgot' && <ForgotPasswordView setActiveRoute={setActiveRoute} />}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 px-6 lg:px-12 bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">AI</div>
              <span className="font-bold text-white">AI SOFT STUDIO</span>
            </div>
            <p className="text-zinc-400">Professional AI automation and multi-channel chatbot SaaS platform for modern businesses.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Channels</h4>
            <ul className="space-y-2">
              <li>WhatsApp Cloud API</li>
              <li>Instagram Messaging</li>
              <li>Facebook Messenger</li>
              <li>Website Embed Widget</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Developers</h4>
            <ul className="space-y-2">
              <li>REST API v1</li>
              <li>API Documentation</li>
              <li>Webhook Handlers</li>
              <li>SDK Integration</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Legal & Privacy</h4>
            <ul className="space-y-2">
              <li className="cursor-pointer hover:text-white" onClick={() => setActiveRoute('privacy')}>Privacy Policy</li>
              <li className="cursor-pointer hover:text-white" onClick={() => setActiveRoute('terms')}>Terms & Conditions</li>
              <li>Security Standards</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-zinc-900 pt-6 flex flex-col sm:flex-row items-center justify-between">
          <p>© {new Date().getFullYear()} AI SOFT STUDIO. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-3 sm:mt-0">
            <span className="text-orange-400">● Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function HomeView({ setActiveRoute }: any) {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section with Cinematic 3D styling */}
      <section className="max-w-6xl mx-auto px-6 text-center space-y-8 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-orange-600/10 via-transparent to-transparent blur-3xl pointer-events-none"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4" /> Next-Gen AI Automation & Multilingual Chatbots
        </div>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-none">
          Deploy Autonomous AI <br />
          <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 bg-clip-text text-transparent">
            Across WhatsApp, IG & Web
          </span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-400 max-w-3xl mx-auto">
          AI SOFT STUDIO empowers businesses to instantly answer customer queries in Hindi, Hinglish, and English, capture qualified leads, and execute human handover seamlessly.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setActiveRoute('register')}
            className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition shadow-xl shadow-orange-600/20 flex items-center gap-3 text-sm"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveRoute('pricing')}
            className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold rounded-2xl transition border border-zinc-800 text-sm"
          >
            View Pricing Plans
          </button>
        </div>

        {/* Feature Grid preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
          <FeatureCard icon={<Phone className="text-emerald-400" />} title="WhatsApp Cloud API" desc="Official Meta integration" />
          <FeatureCard icon={<Instagram className="text-pink-400" />} title="Instagram DM Bot" desc="Automate direct messages" />
          <FeatureCard icon={<Facebook className="text-blue-400" />} title="Messenger AI" desc="Instant page responses" />
          <FeatureCard icon={<Globe className="text-orange-400" />} title="Website Widget" desc="Embed with 1 line of code" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur text-left">
      <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center mb-3 border border-zinc-800">
        {icon}
      </div>
      <h3 className="text-xs font-bold text-white mb-1">{title}</h3>
      <p className="text-[11px] text-zinc-400">{desc}</p>
    </div>
  );
}

function FeaturesView({ setActiveRoute }: any) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-white">Platform Features</h2>
        <p className="text-sm text-zinc-400 max-w-2xl mx-auto">Everything you need to run a high-performance customer service and lead generation AI agency.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureBox title="Multi-Lingual AI" desc="Fluent in Hindi, Hinglish, and English with custom brand personality tuning." />
        <FeatureBox title="Human Handover" desc="Smoothly transfer conversations to human support agents when complex assistance is needed." />
        <FeatureBox title="Knowledge Base Sync" desc="Train your bots instantly on product catalogs, FAQs, and store policies." />
        <FeatureBox title="REST API v1" desc="Robust API endpoints for custom enterprise applications and developer integrations." />
        <FeatureBox title="Meta Compliance" desc="Official WhatsApp, Facebook, and Instagram webhooks with secure token encryption." />
        <FeatureBox title="Usage Quotas" desc="Strict backend rate limiting and plan subscription quotas." />
      </div>
    </div>
  );
}

function FeatureBox({ title, desc }: any) {
  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold border border-orange-500/20">⚡</div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <p className="text-xs text-zinc-400">{desc}</p>
    </div>
  );
}

function PricingView({ setActiveRoute, onLogin }: any) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-white">Simple, Transparent Pricing</h2>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">Choose the ideal plan for your business automation needs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PricingBox title="Starter" price="₹999" bots="1 Bot" messages="1,000 Messages/mo" onSelect={() => setActiveRoute('register')} />
        <PricingBox title="Professional" price="₹2,999" bots="5 Bots" messages="10,000 Messages/mo" popular onSelect={() => setActiveRoute('register')} />
        <PricingBox title="Enterprise" price="₹7,999" bots="25 Bots" messages="100,000 Messages/mo" onSelect={() => setActiveRoute('register')} />
      </div>
    </div>
  );
}

function PricingBox({ title, price, bots, messages, popular, onSelect }: any) {
  return (
    <div className={`p-8 rounded-3xl border flex flex-col justify-between ${popular ? 'bg-orange-600/10 border-orange-500/50 shadow-xl shadow-orange-600/10' : 'bg-zinc-900 border-zinc-800'}`}>
      <div>
        {popular && <span className="px-2.5 py-1 rounded bg-orange-500 text-white text-[10px] font-bold mb-4 inline-block">MOST POPULAR</span>}
        <h3 className="text-lg font-black text-white mb-1">{title}</h3>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-3xl font-black text-orange-400">{price}</span>
          <span className="text-xs text-zinc-500">/ month</span>
        </div>
        <ul className="space-y-3 text-xs text-zinc-300 mb-8">
          <li>✓ {bots}</li>
          <li>✓ {messages}</li>
          <li>✓ WhatsApp & Website Widget</li>
          <li>✓ Gemini 2.5 AI Engine</li>
        </ul>
      </div>
      <button onClick={onSelect} className={`w-full py-3 rounded-xl text-xs font-bold transition ${popular ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
        Get Started
      </button>
    </div>
  );
}

function PrivacyView() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6 text-xs text-zinc-300">
      <h2 className="text-2xl font-black text-white mb-4">Privacy Policy</h2>
      <p>AI SOFT STUDIO respects your privacy and is committed to protecting customer data. This policy outlines how we collect, store, and process business data and customer inquiries.</p>
      <h3 className="text-sm font-bold text-white pt-2">Data Security</h3>
      <p>All access tokens, API keys, and customer information are encrypted securely on the server-side with strict workspace tenant isolation.</p>
    </div>
  );
}

function TermsView() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-6 text-xs text-zinc-300">
      <h2 className="text-2xl font-black text-white mb-4">Terms and Conditions</h2>
      <p>By using AI SOFT STUDIO, you agree to comply with our platform policies, subscription limits, and Meta messaging guidelines.</p>
    </div>
  );
}

function LoginView({ setActiveRoute, onLogin, authEmail, setAuthEmail, authPassword, setAuthPassword }: any) {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Welcome Back</h2>
          <p className="text-xs text-zinc-400">Sign in to your AI Soft Studio dashboard.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Email Address</label>
            <input
              type="email"
              placeholder="owner@mybusiness.com"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            onClick={() => onLogin(authEmail || 'owner@mybusiness.com')}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-orange-600/20"
          >
            Sign In
          </button>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2">
            <button onClick={() => onLogin('owner@mybusiness.com')} className="text-orange-400 hover:underline">Demo Business Login</button>
            <button onClick={() => onLogin('admin@aisoftstudio.com')} className="text-amber-400 hover:underline">Master Admin Login</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterView({ setActiveRoute, onLogin, authEmail, setAuthEmail, authPassword, setAuthPassword, authName, setAuthName, authBusiness, setAuthBusiness }: any) {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Create Account</h2>
          <p className="text-xs text-zinc-400">Get started with your AI Soft Studio workspace.</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Full Name</label>
            <input
              type="text"
              placeholder="Rahul Sharma"
              value={authName}
              onChange={e => setAuthName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Business Name</label>
            <input
              type="text"
              placeholder="Sharma Electronics"
              value={authBusiness}
              onChange={e => setAuthBusiness(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Email Address</label>
            <input
              type="email"
              placeholder="owner@mybusiness.com"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            onClick={() => onLogin(authEmail || 'owner@mybusiness.com')}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-orange-600/20"
          >
            Create Workspace & Start
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordView({ setActiveRoute }: any) {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <h2 className="text-xl font-black text-white">Reset Password</h2>
        <input type="email" placeholder="Enter your email" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100" />
        <button onClick={() => alert('Password reset link sent!')} className="w-full py-3 bg-orange-600 text-white rounded-xl text-xs font-bold">Send Reset Link</button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// DASHBOARD OVERVIEW VIEW
// -------------------------------------------------------------------------
function DashboardOverview({ bots, conversations, leads, subscription, onNavigate }: any) {
  const safeBots = Array.isArray(bots) ? bots : [];
  const safeConvs = Array.isArray(conversations) ? conversations : [];
  const safeLeads = Array.isArray(leads) ? leads : [];
  const activeConversations = safeConvs.filter((c: any) => c.status === 'active' || c.status === 'human_handover').length;
  const totalMessages = safeConvs.reduce((acc: number, c: any) => acc + (c.messages?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-600/20 via-zinc-900 to-zinc-900 border border-orange-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> AI SOFT STUDIO SaaS
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Empower Your Business With Autonomous AI</h2>
          <p className="text-sm text-zinc-300 max-w-2xl mb-4">
            Your bots are actively handling customer inquiries, collecting sales leads, and syncing with WhatsApp, Instagram, and your website widget in Hindi, Hinglish, and English.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => onNavigate('studio')}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-orange-600/20 flex items-center gap-2"
            >
              <Bot className="w-4 h-4" /> Manage Chatbots
            </button>
            <button 
              onClick={() => onNavigate('api')}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition border border-zinc-700 flex items-center gap-2"
            >
              <Globe className="w-4 h-4" /> Get Website Embed Code
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Bots" value={safeBots.length} icon={<Bot className="w-5 h-5 text-orange-500" />} sub={`Plan Limit: ${subscription?.botsLimit || 5}`} />
        <MetricCard title="Live Inquiries" value={activeConversations} icon={<MessageSquare className="w-5 h-5 text-amber-500" />} sub={`${totalMessages} total messages`} />
        <MetricCard title="Captured Leads" value={safeLeads.length} icon={<Database className="w-5 h-5 text-emerald-500" />} sub="Ready for sales team" />
        <MetricCard title="Messages Quota" value={`${subscription?.messagesUsed || 0} / ${subscription?.messagesLimit || 10000}`} icon={<CreditCard className="w-5 h-5 text-purple-500" />} sub={`${subscription?.planName || 'Professional'} Plan`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-orange-500" /> Recent Conversations
            </h3>
            <button onClick={() => onNavigate('inbox')} className="text-xs text-orange-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {safeConvs.slice(0, 4).map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{c.customerName || 'Website Visitor'}</p>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                    {c.messages?.[c.messages.length - 1]?.text || 'No messages'}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  c.status === 'human_handover' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-5 text-emerald-500" /> Recent Sales Leads
            </h3>
            <button onClick={() => onNavigate('leads')} className="text-xs text-orange-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {safeLeads.slice(0, 4).map((l: any) => (
              <div key={l.id} className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">{l.name} ({l.phone || l.email})</p>
                  <p className="text-[11px] text-zinc-400">Interest: {l.interest}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold">
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, sub }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-400">{title}</span>
        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700/50">
          {icon}
        </div>
      </div>
      <div>
        <h4 className="text-2xl font-black text-white tracking-tight mb-1">{value}</h4>
        <p className="text-[11px] text-zinc-400">{sub}</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// CHATBOT STUDIO & KNOWLEDGE BASE VIEW
// -------------------------------------------------------------------------
function ChatbotStudio({ bots, selectedBot, setSelectedBot, workspaceId, onRefresh }: any) {
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'knowledge' | 'test'>('config');
  const [name, setName] = useState(selectedBot?.name || '');
  const [welcomeMessage, setWelcomeMessage] = useState(selectedBot?.welcomeMessage || '');
  const [personality, setPersonality] = useState(selectedBot?.personality || '');
  const [language, setLanguage] = useState(selectedBot?.language || 'multi');

  const [newKsType, setNewKsType] = useState('faq');
  const [newKsTitle, setNewKsTitle] = useState('');
  const [newKsContent, setNewKsContent] = useState('');

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (selectedBot) {
      setName(selectedBot.name);
      setWelcomeMessage(selectedBot.welcomeMessage);
      setPersonality(selectedBot.personality);
      setLanguage(selectedBot.language || 'multi');
      setChatMessages([
        { sender: 'bot', text: selectedBot.welcomeMessage }
      ]);
    }
  }, [selectedBot]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBot) return;
    await fetch(`/api/bots/${selectedBot.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, welcomeMessage, personality, language })
    });
    onRefresh();
    alert('Chatbot configuration saved successfully!');
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBot || !newKsTitle || !newKsContent) return;
    const res = await fetch(`/api/bots/${selectedBot.id}/knowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: newKsType, title: newKsTitle, content: newKsContent })
    });
    const updated = await res.json();
    setSelectedBot(updated);
    setNewKsTitle('');
    setNewKsContent('');
    onRefresh();
  };

  const handleDeleteKnowledge = async (ksId: string) => {
    if (!selectedBot) return;
    const res = await fetch(`/api/bots/${selectedBot.id}/knowledge/${ksId}`, {
      method: 'DELETE'
    });
    const updated = await res.json();
    setSelectedBot(updated);
    onRefresh();
  };

  const handleSendPlayground = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !selectedBot) return;
    const userMsg = inputMsg;
    setInputMsg('');
    setChatMessages((prev: any) => [...prev, { sender: 'customer', text: userMsg }]);
    setIsSending(true);

    try {
      const res = await fetch(`/api/chatbots/${selectedBot.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col h-[650px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Your Chatbots</h3>
          <button
            onClick={async () => {
              const res = await fetch('/api/bots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, name: 'New Support Assistant' })
              });
              const b = await res.json();
              onRefresh();
              setSelectedBot(b);
            }}
            className="p-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition"
            title="Create New Bot"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {bots.map((b: any) => (
            <div
              key={b.id}
              onClick={() => setSelectedBot(b)}
              className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                selectedBot?.id === b.id 
                  ? 'bg-orange-600/10 border-orange-500/50 text-white' 
                  : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-500/30">
                  🤖
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{b.name}</p>
                  <p className="text-[10px] text-zinc-400">{b.knowledgeSources?.length || 0} Knowledge items</p>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${b.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
          ))}
        </div>
      </div>

      {selectedBot ? (
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col h-[650px]">
          <div className="flex border-b border-zinc-800 pb-4 mb-5 gap-2">
            <button
              onClick={() => setActiveSubTab('config')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'config' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Bot Settings & Personality
            </button>
            <button
              onClick={() => setActiveSubTab('knowledge')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'knowledge' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Knowledge Base ({selectedBot.knowledgeSources?.length || 0})
            </button>
            <button
              onClick={() => setActiveSubTab('test')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeSubTab === 'test' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Test Playground
            </button>
          </div>

          {activeSubTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Bot Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Welcome Greeting Message</label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={e => setWelcomeMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">AI Personality & Instructions</label>
                <textarea
                  rows={4}
                  value={personality}
                  onChange={e => setPersonality(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Language Mode</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                >
                  <option value="multi">Multi-lingual (Hindi, Hinglish, English)</option>
                  <option value="hi">Hindi Only</option>
                  <option value="en">English Only</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-orange-600/20"
              >
                Save Changes
              </button>
            </form>
          )}

          {activeSubTab === 'knowledge' && (
            <div className="flex flex-col flex-1 overflow-hidden space-y-4">
              <form onSubmit={handleAddKnowledge} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-white">Add Knowledge / FAQ / Product</h4>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={newKsType}
                    onChange={e => setNewKsType(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                  >
                    <option value="faq">FAQ</option>
                    <option value="product">Product / Service</option>
                    <option value="policy">Business Policy</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Title (e.g. Return Policy)"
                    value={newKsTitle}
                    onChange={e => setNewKsTitle(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                  />
                </div>
                <textarea
                  placeholder="Detailed content for AI..."
                  rows={2}
                  value={newKsContent}
                  onChange={e => setNewKsContent(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200"
                />
                <button type="submit" className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition">
                  Add Knowledge Item
                </button>
              </form>

              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {selectedBot.knowledgeSources?.map((ks: any) => (
                  <div key={ks.id} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">
                          {ks.type}
                        </span>
                        <h5 className="text-xs font-bold text-white">{ks.title}</h5>
                      </div>
                      <p className="text-xs text-zinc-400">{ks.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteKnowledge(ks.id)}
                      className="text-zinc-500 hover:text-red-400 p-1 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'test' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto space-y-3 mb-3">
                {chatMessages.map((m: any, idx: number) => (
                  <div key={idx} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                      m.sender === 'customer' 
                        ? 'bg-orange-600 text-white rounded-br-none' 
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-xs text-zinc-400 animate-pulse">
                      AI is typing...
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendPlayground} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Test message in Hindi, Hinglish, or English..."
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                />
                <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center text-zinc-400 text-xs">
          Select or create a chatbot to configure.
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// LIVE INBOX & HUMAN HANDOVER VIEW
// -------------------------------------------------------------------------
function LiveInbox({ conversations, workspaceId, onRefresh }: any) {
  const [selectedConv, setSelectedConv] = useState(conversations[0] || null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;
    await fetch(`/api/conversations/${selectedConv.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: replyText })
    });
    setReplyText('');
    onRefresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px]">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col">
        <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider">Conversations Inbox</h3>
        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {conversations.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setSelectedConv(c)}
              className={`p-3 rounded-xl border cursor-pointer transition ${
                selectedConv?.id === c.id ? 'bg-orange-600/10 border-orange-500/50 text-white' : 'bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white">{c.customerName || 'Visitor'}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                  c.status === 'human_handover' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {c.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">{c.messages?.[c.messages.length - 1]?.text}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedConv ? (
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div>
              <h4 className="text-xs font-bold text-white">{selectedConv.customerName} ({selectedConv.customerPhone || 'Web Visitor'})</h4>
              <p className="text-[10px] text-zinc-400">Channel: {selectedConv.channel} • Status: {selectedConv.status}</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
              Live Support Mode
            </span>
          </div>

          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto space-y-3 mb-4">
            {selectedConv.messages?.map((m: any, idx: number) => (
              <div key={idx} className={`flex ${m.sender === 'customer' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-xs ${
                  m.sender === 'customer' 
                    ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none' 
                    : m.sender === 'admin'
                    ? 'bg-amber-600 text-white rounded-br-none'
                    : 'bg-orange-600 text-white rounded-br-none'
                }`}>
                  <p className="text-[9px] opacity-70 mb-0.5 uppercase font-bold">{m.sender}</p>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendReply} className="flex gap-2">
            <input
              type="text"
              placeholder="Type human reply to customer..."
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
            />
            <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Send Reply
            </button>
          </form>
        </div>
      ) : (
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-8 flex items-center justify-center text-zinc-400 text-xs">
          Select a conversation to start messaging.
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// LEADS VIEW
// -------------------------------------------------------------------------
function LeadsView({ leads }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-sm font-bold text-white mb-4">Captured Customer Leads & Inquiries</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
              <th className="pb-3 px-3">Customer Name</th>
              <th className="pb-3 px-3">Contact</th>
              <th className="pb-3 px-3">Interest / Inquiry</th>
              <th className="pb-3 px-3">Status</th>
              <th className="pb-3 px-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {leads.map((l: any) => (
              <tr key={l.id} className="hover:bg-zinc-950/40">
                <td className="py-3 px-3 font-bold text-white">{l.name}</td>
                <td className="py-3 px-3 text-zinc-300">{l.phone || l.email || 'N/A'}</td>
                <td className="py-3 px-3 text-zinc-400">{l.interest}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                    {l.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-zinc-500">{new Date(l.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// CHANNELS VIEW (WHATSAPP, INSTAGRAM, MESSENGER)
// -------------------------------------------------------------------------
function ChannelsView({ channels, workspaceId, onRefresh }: any) {
  const [phoneId, setPhoneId] = useState('');
  const [token, setToken] = useState('');

  const safeChannels = Array.isArray(channels) ? channels : [];
  const waChannel = safeChannels.find((c: any) => c.type === 'whatsapp');

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/channels/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, phoneNumberId: phoneId, accessToken: token })
    });
    setPhoneId('');
    setToken('');
    onRefresh();
    alert('WhatsApp Cloud API connected successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
              💬
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Official WhatsApp Cloud API</h3>
              <p className="text-xs text-zinc-400">Connect Meta WhatsApp business number for automated AI replies.</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
            waChannel?.status === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {waChannel?.status === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <form onSubmit={handleConnectWhatsApp} className="space-y-4 max-w-xl">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">WhatsApp Phone Number ID</label>
            <input
              type="text"
              placeholder="e.g. 109283746501928"
              value={phoneId}
              onChange={e => setPhoneId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">Permanent Meta Access Token</label>
            <input
              type="password"
              placeholder="EAAB..."
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20">
            Connect WhatsApp API
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-lg border border-pink-500/30">
                📸
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Instagram Messaging</h3>
                <p className="text-xs text-zinc-400">Automate Instagram DMs.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">Ready</span>
          </div>
          <button onClick={() => alert('Instagram Professional Account OAuth ready.')} className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition">
            Connect Instagram Account
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg border border-blue-500/30">
                ⚡
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Facebook Messenger</h3>
                <p className="text-xs text-zinc-400">Connect Facebook Pages.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">Ready</span>
          </div>
          <button onClick={() => alert('Facebook Page OAuth ready.')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition">
            Connect Facebook Page
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// API & EMBED WIDGET VIEW
// -------------------------------------------------------------------------
function ApiWidgetView({ apiKeys, bots, workspaceId, onRefresh }: any) {
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const selectedBot = bots[0];

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName) return;
    const res = await fetch('/api/apikeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, name: newKeyName })
    });
    const data = await res.json();
    setGeneratedSecret(data.secretKey);
    setNewKeyName('');
    onRefresh();
  };

  const widgetSnippet = `<script
  src="${window.location.origin}/widget.js"
  data-bot-id="${selectedBot?.id || 'bot_1'}"
  async>
</script>`;

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-2">Website Chatbot Embed Script</h3>
        <p className="text-xs text-zinc-400 mb-4">
          Paste this snippet right before the closing &lt;/body&gt; tag of your website.
        </p>
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-orange-400 overflow-x-auto relative mb-3">
          <code>{widgetSnippet}</code>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(widgetSnippet);
            alert('Embed script copied to clipboard!');
          }}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
        >
          <Copy className="w-4 h-4" /> Copy Embed Script
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">REST API Keys (v1/chat/completions)</h3>
            <p className="text-xs text-zinc-400">Integrate AI Soft Studio bots into your custom applications.</p>
          </div>
          <form onSubmit={handleCreateKey} className="flex gap-2">
            <input
              type="text"
              placeholder="Key Name..."
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-orange-500"
            />
            <button type="submit" className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition">
              Generate Key
            </button>
          </form>
        </div>

        {generatedSecret && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-4">
            <p className="font-bold mb-1">Save your API Key now! It will not be shown again.</p>
            <code className="bg-zinc-950 px-2 py-1 rounded text-white select-all">{generatedSecret}</code>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.map((k: any) => (
            <div key={k.id} className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{k.name} <span className="text-zinc-500 font-mono">({k.keyPrefix})</span></p>
                <p className="text-[10px] text-zinc-400">Requests: {k.requestsCount} • Created: {new Date(k.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                onClick={async () => {
                  await fetch(`/api/apikeys/${k.id}`, { method: 'DELETE' });
                  onRefresh();
                }}
                className="text-zinc-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// BILLING VIEW
// -------------------------------------------------------------------------
function BillingView({ subscription, workspaceId, onRefresh }: any) {
  const handleUpgrade = async (planName: string) => {
    await fetch('/api/subscription/upgrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId, planName })
    });
    onRefresh();
    alert(`Successfully upgraded to ${planName} plan!`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-2">Current Subscription</h3>
        <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl mb-6">
          <div>
            <p className="text-lg font-black text-orange-500">{subscription?.planName || 'Professional'} Plan</p>
            <p className="text-xs text-zinc-400">Bots Limit: {subscription?.botsLimit} • Messages: {subscription?.messagesUsed} / {subscription?.messagesLimit}</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
            Active
          </span>
        </div>

        <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Available Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard title="Starter" price="₹999 / mo" bots="1 Bot" messages="1,000 Messages" onSelect={() => handleUpgrade('Starter')} />
          <PlanCard title="Professional" price="₹2,999 / mo" bots="5 Bots" messages="10,000 Messages" popular onSelect={() => handleUpgrade('Professional')} />
          <PlanCard title="Enterprise" price="₹7,999 / mo" bots="25 Bots" messages="100,000 Messages" onSelect={() => handleUpgrade('Enterprise')} />
        </div>
      </div>
    </div>
  );
}

function PlanCard({ title, price, bots, messages, popular, onSelect }: any) {
  return (
    <div className={`p-5 rounded-2xl border flex flex-col justify-between ${popular ? 'bg-orange-600/10 border-orange-500/50' : 'bg-zinc-950 border-zinc-800'}`}>
      <div>
        {popular && <span className="px-2 py-0.5 rounded bg-orange-500 text-white text-[10px] font-bold mb-2 inline-block">MOST POPULAR</span>}
        <h4 className="text-base font-black text-white mb-1">{title}</h4>
        <p className="text-xl font-black text-orange-400 mb-4">{price}</p>
        <ul className="space-y-2 text-xs text-zinc-300 mb-6">
          <li>✓ {bots}</li>
          <li>✓ {messages}</li>
          <li>✓ WhatsApp & Website Widget</li>
          <li>✓ AI Gemini 2.5 Engine</li>
        </ul>
      </div>
      <button onClick={onSelect} className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${popular ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
        Select Plan
      </button>
    </div>
  );
}

// -------------------------------------------------------------------------
// MASTER ADMIN PANEL
// -------------------------------------------------------------------------
function MasterAdminView({ adminData }: any) {
  if (!adminData) return <div className="text-zinc-400 text-xs">Loading admin data...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-300 text-xs flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <p>Master Admin Panel: Viewing global platform metrics, registered users, workspaces, and system logs across all tenants.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={adminData.totalUsers} icon={<Users className="w-5 h-5 text-blue-500" />} sub="All registered accounts" />
        <MetricCard title="Workspaces" value={adminData.totalWorkspaces} icon={<Globe className="w-5 h-5 text-orange-500" />} sub="Active tenants" />
        <MetricCard title="Total Bots" value={adminData.totalBots} icon={<Bot className="w-5 h-5 text-emerald-500" />} sub="Deployed AI assistants" />
        <MetricCard title="Conversations" value={adminData.totalConversations} icon={<MessageSquare className="w-5 h-5 text-purple-500" />} sub="All customer interactions" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">Platform System Logs</h3>
        <div className="space-y-2 font-mono text-[11px]">
          {adminData.logs?.map((l: any) => (
            <div key={l.id} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between">
              <span className="text-zinc-300">{l.message}</span>
              <span className="text-zinc-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// PUBLIC SHAREABLE CHAT VIEW
// -------------------------------------------------------------------------
function PublicChatView({ botId, isWidget }: any) {
  const [bot, setBot] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/chatbots/${botId}/public`)
      .then(r => r.json())
      .then(data => {
        setBot(data);
        setMessages([
          { sender: 'bot', text: data.welcomeMessage || 'Namaste! How can I help you today?' }
        ]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [botId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const txt = input;
    setInput('');
    setMessages((prev: any) => [...prev, { sender: 'customer', text: txt }]);

    try {
      const res = await fetch(`/api/chatbots/${botId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt, conversationId: convId })
      });
      const data = await res.json();
      if (data.conversationId) setConvId(data.conversationId);
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center text-xs">Loading AI Chatbot...</div>;
  }

  if (!bot) {
    return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center text-xs">Chatbot not found or paused.</div>;
  }

  return (
    <div className={`${isWidget ? 'h-full' : 'min-h-screen'} bg-zinc-950 text-zinc-100 flex flex-col`}>
      {!isWidget && (
        <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm border border-orange-500/30">
              🤖
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">{bot.name}</h1>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">● Online • AI Powered</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Chat link copied to clipboard!');
            }}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Chat
          </button>
        </header>
      )}

      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m: any, idx: number) => (
          <div key={idx} className={`flex ${m.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs ${
                m.sender === 'customer' 
                  ? 'bg-orange-600 text-white rounded-br-none shadow-md' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-none shadow-md'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex gap-2">
        <input
          type="text"
          placeholder="Ask a question in Hindi, Hinglish, or English..."
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
        />
        <button type="submit" className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
