let rawApi = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
if (!rawApi.startsWith('http://') && !rawApi.startsWith('https://') && !rawApi.startsWith('/')) {
  rawApi = `https://${rawApi}`;
}
const baseApi = rawApi.replace(/\/+$/, '');
const API = baseApi.endsWith('/api') ? baseApi : `${baseApi}/api`;

const USERS_STORAGE_KEY = 'tm_registered_users_v2';
const SESSION_KEY = 'tm_active_session_v2';
const TOKEN_KEY = 'tm_token';

// Starter demo trades for the demo profile
const DEMO_TRADES = [
  {
    id: 101,
    market: 'CRYPTO',
    exchange: 'Delta Exchange',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    status: 'CLOSED',
    entry_price: 64200,
    exit_price: 66800,
    quantity: 0.1,
    leverage: 10,
    fees: 12,
    other_costs: 0,
    gross_pnl: 260,
    net_pnl: 248,
    strategy: 'Breakout & Retest',
    emotion: 'Confident',
    tags: 'crypto, btc, swing',
    notes: 'Clean bounce off 64k support level. Held to take profit at 66.8k.',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 102,
    market: 'CRYPTO',
    exchange: 'Delta Exchange',
    symbol: 'ETHUSDT',
    direction: 'SHORT',
    status: 'CLOSED',
    entry_price: 3450,
    exit_price: 3310,
    quantity: 1.0,
    leverage: 5,
    fees: 8,
    other_costs: 0,
    gross_pnl: 140,
    net_pnl: 132,
    strategy: 'Resistance Rejection',
    emotion: 'Disciplined',
    tags: 'eth, scalp',
    notes: 'Rejected exactly at 4H trendline resistance.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 103,
    market: 'FOREX',
    exchange: 'Exness',
    symbol: 'EURUSD',
    direction: 'LONG',
    status: 'CLOSED',
    entry_price: 1.0820,
    exit_price: 1.0895,
    quantity: 1,
    leverage: 100,
    fees: 5,
    other_costs: 0,
    gross_pnl: 75,
    net_pnl: 70,
    strategy: 'London Session Breakout',
    emotion: 'Confident',
    tags: 'forex, eurusd, london',
    notes: 'Entered on London open momentum.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 104,
    market: 'CRYPTO',
    exchange: 'Binance',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    status: 'CLOSED',
    entry_price: 142.50,
    exit_price: 136.20,
    quantity: 5,
    leverage: 5,
    fees: 4,
    other_costs: 0,
    gross_pnl: -31.50,
    net_pnl: -35.50,
    strategy: 'Support Bounce',
    emotion: 'Anxious',
    tags: 'sol, stoploss',
    notes: 'Cut early after losing volume momentum.',
    created_at: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 105,
    market: 'FOREX',
    exchange: 'XM',
    symbol: 'XAUUSD',
    direction: 'LONG',
    status: 'CLOSED',
    entry_price: 2680,
    exit_price: 2715,
    quantity: 0.5,
    leverage: 50,
    fees: 10,
    other_costs: 0,
    gross_pnl: 175,
    net_pnl: 165,
    strategy: 'Gold Supply Pullback',
    emotion: 'Disciplined',
    tags: 'gold, xauusd, trend',
    notes: 'Strong gold demand continuation.',
    created_at: new Date(Date.now() - 86400000 * 0.8).toISOString(),
    closed_at: new Date().toISOString()
  }
];

function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveActiveSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_KEY, session.token);
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getUserTradesKey(userId) {
  return `tm_trades_u_${userId}`;
}

export function getUserTrades(userId) {
  const key = getUserTradesKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (userId === 'demo-user') {
        localStorage.setItem(key, JSON.stringify(DEMO_TRADES));
        return DEMO_TRADES;
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUserTrades(userId, trades) {
  localStorage.setItem(getUserTradesKey(userId), JSON.stringify(trades));
}

export function loadSampleTradesForUser(userId) {
  const seeded = DEMO_TRADES.map(t => ({
    ...t,
    id: Date.now() + Math.floor(Math.random() * 1000)
  }));
  saveUserTrades(userId, seeded);
  return seeded;
}

export function clearUserTrades(userId) {
  saveUserTrades(userId, []);
  return [];
}

function calculateDashboardStats(trades) {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const pnls = closed.map(t => Number(t.net_pnl || 0));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const totalNet = pnls.reduce((acc, curr) => acc + curr, 0);
  const grossProfit = wins.reduce((acc, curr) => acc + curr, 0);
  const grossLoss = Math.abs(losses.reduce((acc, curr) => acc + curr, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 999 : null);
  const winRate = closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0;
  const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0)) / losses.length : 0;
  const riskReward = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : null;

  return {
    total_trades: closed.length,
    open_trades: trades.filter(t => t.status === 'OPEN').length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: winRate,
    net_pnl: totalNet,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    profit_factor: profitFactor,
    avg_win: avgWin,
    avg_loss: avgLoss,
    risk_reward: riskReward
  };
}

function handleOfflineRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};
  const session = getActiveSession();

  // REGISTER: Creates a real individual account
  if (path === '/auth/register') {
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name) throw new Error('Please enter your full name.');
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = getStoredUsers();
    if (users.find(u => u.email === email)) {
      throw new Error('This email is already registered. Please sign in instead.');
    }

    const newUser = {
      id: 'u_' + Date.now(),
      name,
      email,
      password,
      isDemo: false,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    saveStoredUsers(users);

    // Initial empty trade journal for the newly registered user
    saveUserTrades(newUser.id, []);

    const token = `tm_token_${newUser.id}_${Date.now()}`;
    const userSafe = { id: newUser.id, name: newUser.name, email: newUser.email, isDemo: false };
    saveActiveSession({ token, userId: newUser.id, user: userSafe });

    return { access_token: token, user: userSafe };
  }

  // LOGIN: Verifies real registered accounts
  if (path === '/auth/login') {
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) throw new Error('Email and password are required.');

    const users = getStoredUsers();
    const existing = users.find(u => u.email === email);

    if (!existing) {
      throw new Error('No account found with this email. Please click "Create an account" below.');
    }

    if (existing.password !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    const token = `tm_token_${existing.id}_${Date.now()}`;
    const userSafe = { id: existing.id, name: existing.name, email: existing.email, isDemo: false };
    saveActiveSession({ token, userId: existing.id, user: userSafe });

    return { access_token: token, user: userSafe };
  }

  // DEMO MODE: Dedicated separate demo profile
  if (path === '/auth/demo') {
    const demoUser = {
      id: 'demo-user',
      name: 'Demo Trader',
      email: 'demo@trademind.ai',
      isDemo: true
    };
    const token = 'tm_token_demo_mode';
    saveActiveSession({ token, userId: 'demo-user', user: demoUser });
    // Ensure demo user trades are initialized
    getUserTrades('demo-user');
    return { access_token: token, user: demoUser };
  }

  // CURRENT USER
  if (path === '/auth/me') {
    if (!session || !session.user) {
      throw new Error('Unauthorized');
    }
    return session.user;
  }

  // DATA ROUTES REQUIRE ACTIVE USER
  const userId = session?.userId || 'guest';

  if (path === '/dashboard') {
    const trades = getUserTrades(userId);
    return calculateDashboardStats(trades);
  }

  if (path === '/trades') {
    if (method === 'GET') {
      return getUserTrades(userId);
    }
    if (method === 'POST') {
      const trades = getUserTrades(userId);
      const entry = Number(body.entry_price || 0);
      const exit = body.exit_price !== undefined && body.exit_price !== '' ? Number(body.exit_price) : null;
      const qty = Number(body.quantity || 0);
      const fees = Number(body.fees || 0);
      const other = Number(body.other_costs || 0);

      let gross = body.gross_pnl !== undefined && body.gross_pnl !== '' ? Number(body.gross_pnl) : null;
      if (gross === null && exit !== null) {
        gross = body.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
      }
      const net = gross !== null ? Number((gross - fees - other).toFixed(2)) : null;

      const newTrade = {
        id: Date.now(),
        market: (body.market || 'CRYPTO').toUpperCase(),
        exchange: body.exchange || '',
        symbol: (body.symbol || 'BTCUSDT').toUpperCase(),
        direction: (body.direction || 'LONG').toUpperCase(),
        status: (body.status || 'CLOSED').toUpperCase(),
        entry_price: entry,
        exit_price: exit,
        quantity: qty,
        leverage: Number(body.leverage || 1),
        fees: fees,
        other_costs: other,
        gross_pnl: gross !== null ? Number(gross.toFixed(2)) : null,
        net_pnl: net,
        strategy: body.strategy || '',
        emotion: body.emotion || 'Confident',
        tags: body.tags || '',
        notes: body.notes || '',
        created_at: new Date().toISOString(),
        closed_at: exit !== null ? new Date().toISOString() : null
      };

      trades.unshift(newTrade);
      saveUserTrades(userId, trades);
      return newTrade;
    }
  }

  if (path.startsWith('/trades/')) {
    const id = Number(path.replace('/trades/', ''));
    let trades = getUserTrades(userId);
    if (method === 'DELETE') {
      trades = trades.filter(t => t.id !== id);
      saveUserTrades(userId, trades);
      return { success: true };
    }
    if (method === 'PUT') {
      trades = trades.map(t => t.id === id ? { ...t, ...body } : t);
      saveUserTrades(userId, trades);
      return trades.find(t => t.id === id);
    }
  }

  return {};
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession() {
  saveActiveSession(null);
}

export async function api(path, options = {}) {
  // If demo mode or explicitly offline token, execute locally
  const token = getToken();
  const session = getActiveSession();

  // If path is auth or we have a local session token, check local handler first
  if (path.startsWith('/auth/demo') || token?.startsWith('tm_token_')) {
    return handleOfflineRequest(path, options);
  }

  try {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token && token !== 'undefined') {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API}${path}`, { ...options, headers });
    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      // not JSON
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    // If backend connection refused / offline, handle in offline store seamlessly
    return handleOfflineRequest(path, options);
  }
}
