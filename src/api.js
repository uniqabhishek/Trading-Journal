// TradeMind API & Offline-First Client Architecture
// Ensures 100% reliable local client persistence on GitHub Pages and handles multi-user authentication.

let rawApi = import.meta.env.VITE_API_URL || '';
if (rawApi && !rawApi.startsWith('http://') && !rawApi.startsWith('https://') && !rawApi.startsWith('/')) {
  rawApi = `https://${rawApi}`;
}
const baseApi = rawApi.replace(/\/+$/, '');
const API = baseApi ? (baseApi.endsWith('/api') ? baseApi : `${baseApi}/api`) : '';

const USERS_STORAGE_KEY = 'tm_registered_users_v3';
const SESSION_KEY = 'tm_active_session_v3';
const TOKEN_KEY = 'tm_token_v3';

// Helper to determine if we should execute directly in local offline mode
function isLocalMode() {
  if (!API) return true;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isRemote = host !== 'localhost' && host !== '127.0.0.1';
    if (isRemote && (API.includes('127.0.0.1') || API.includes('localhost'))) {
      return true;
    }
  }
  return false;
}

// Starter sample trades
export const SAMPLE_TRADES_TEMPLATE = [
  {
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
    market: 'CRYPTO',
    exchange: 'Binance',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    status: 'OPEN',
    entry_price: 142.50,
    exit_price: null,
    quantity: 5,
    leverage: 5,
    fees: 4,
    other_costs: 0,
    gross_pnl: null,
    net_pnl: null,
    strategy: 'Support Bounce',
    emotion: 'Confident',
    tags: 'sol, swing, active',
    notes: 'Holding active breakout position.',
    created_at: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    closed_at: null
  }
];

function generateDeterministicUserId(email) {
  // Generates a stable unique ID from the user's email so trades are NEVER lost across logins
  try {
    const clean = email.trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = ((hash << 5) - hash) + clean.charCodeAt(i);
      hash |= 0;
    }
    const safePart = clean.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 15);
    return `u_${safePart}_${Math.abs(hash)}`;
  } catch {
    return `u_${Date.now()}`;
  }
}

export function getStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Legacy migration from v2 if available
    const legacyRaw = localStorage.getItem('tm_registered_users_v2');
    if (legacyRaw) {
      const users = JSON.parse(legacyRaw);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      return users;
    }
    return [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem('tm_active_session_v2');
    if (legacy) return JSON.parse(legacy);
    return null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session) {
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_KEY, session.token);
  } else {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getUserTradesKey(userId) {
  return `tm_trades_u_${userId}`;
}

export function getUserTrades(userId) {
  const key = getUserTradesKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (userId === 'demo-user') {
        const demoTrades = SAMPLE_TRADES_TEMPLATE.map((t, idx) => ({ ...t, id: 100 + idx }));
        localStorage.setItem(key, JSON.stringify(demoTrades));
        return demoTrades;
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
  const seeded = SAMPLE_TRADES_TEMPLATE.map((t, idx) => ({
    ...t,
    id: Date.now() + idx + Math.floor(Math.random() * 500)
  }));
  saveUserTrades(userId, seeded);
  return seeded;
}

export function clearUserTrades(userId) {
  saveUserTrades(userId, []);
  return [];
}

export function calculateDashboardStats(trades) {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const openPositions = trades.filter(t => t.status === 'OPEN');
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
    open_trades: openPositions.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: winRate,
    net_pnl: Number(totalNet.toFixed(2)),
    gross_profit: Number(grossProfit.toFixed(2)),
    gross_loss: Number(grossLoss.toFixed(2)),
    profit_factor: profitFactor,
    avg_win: Number(avgWin.toFixed(2)),
    avg_loss: Number(avgLoss.toFixed(2)),
    risk_reward: riskReward
  };
}

function handleOfflineRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
  const session = getActiveSession();

  // 1. REGISTER: Enforce unique email check & persistent account creation
  if (path === '/auth/register') {
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!name) throw new Error('Please enter your full name.');
    if (!email || !email.includes('@')) throw new Error('Please enter a valid email address.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');

    const users = getStoredUsers();
    const existing = users.find(u => u.email === email);
    if (existing) {
      throw new Error('An account with this email already exists. Please click "Sign In" instead.');
    }

    const userId = generateDeterministicUserId(email);
    const newUser = {
      id: userId,
      name,
      email,
      password,
      isDemo: false,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    saveStoredUsers(users);

    // Initialize or keep existing trades for this user ID if any
    const existingTrades = getUserTrades(userId);
    if (!existingTrades || existingTrades.length === 0) {
      saveUserTrades(userId, []);
    }

    const token = `tm_token_${userId}_${Date.now()}`;
    const userSafe = { id: newUser.id, name: newUser.name, email: newUser.email, isDemo: false };
    saveActiveSession({ token, userId: newUser.id, user: userSafe });

    return { access_token: token, user: userSafe };
  }

  // 2. LOGIN: Verify credentials against stored users
  if (path === '/auth/login') {
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!email || !password) throw new Error('Email and password are required.');

    const users = getStoredUsers();
    const existing = users.find(u => u.email === email);

    if (!existing) {
      throw new Error('No registered account found with this email. Please click "Create Account" below.');
    }

    if (existing.password !== password) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    const token = `tm_token_${existing.id}_${Date.now()}`;
    const userSafe = { id: existing.id, name: existing.name, email: existing.email, isDemo: false };
    saveActiveSession({ token, userId: existing.id, user: userSafe });

    return { access_token: token, user: userSafe };
  }

  // 3. DEMO MODE: Dedicated separate demo profile
  if (path === '/auth/demo') {
    const demoUser = {
      id: 'demo-user',
      name: 'Demo Trader',
      email: 'demo@trademind.ai',
      isDemo: true
    };
    const token = 'tm_token_demo_mode';
    saveActiveSession({ token, userId: 'demo-user', user: demoUser });
    getUserTrades('demo-user');
    return { access_token: token, user: demoUser };
  }

  // 4. CURRENT USER
  if (path === '/auth/me') {
    if (!session || !session.user) {
      throw new Error('Unauthorized');
    }
    return session.user;
  }

  // 5. DATA ROUTES (REQUIRE ACTIVE USER)
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
      const isClosed = (body.status || 'CLOSED').toUpperCase() === 'CLOSED';
      const exit = isClosed && body.exit_price !== undefined && body.exit_price !== '' ? Number(body.exit_price) : null;
      const qty = Number(body.quantity || 0);
      const fees = Number(body.fees || 0);
      const other = Number(body.other_costs || 0);

      let gross = body.gross_pnl !== undefined && body.gross_pnl !== '' && body.gross_pnl !== null ? Number(body.gross_pnl) : null;
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
        status: isClosed ? 'CLOSED' : 'OPEN',
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
        created_at: body.created_at || new Date().toISOString(),
        closed_at: isClosed ? (body.closed_at || new Date().toISOString()) : null
      };

      trades.unshift(newTrade);
      saveUserTrades(userId, trades);
      return newTrade;
    }
  }

  // TRADE DETAIL OPERATIONS (PUT to update / close trade, DELETE to delete trade)
  if (path.startsWith('/trades/')) {
    const id = Number(path.replace('/trades/', ''));
    let trades = getUserTrades(userId);

    if (method === 'DELETE') {
      trades = trades.filter(t => t.id !== id);
      saveUserTrades(userId, trades);
      return { success: true };
    }

    if (method === 'PUT') {
      trades = trades.map(t => {
        if (t.id !== id) return t;

        const updated = { ...t, ...body };
        const entry = Number(updated.entry_price || 0);
        const qty = Number(updated.quantity || 0);
        const fees = Number(updated.fees || 0);
        const other = Number(updated.other_costs || 0);
        const isClosed = updated.status === 'CLOSED';

        if (isClosed && updated.exit_price !== null && updated.exit_price !== undefined && updated.exit_price !== '') {
          const exit = Number(updated.exit_price);
          let gross = updated.gross_pnl !== undefined && updated.gross_pnl !== null && updated.gross_pnl !== ''
            ? Number(updated.gross_pnl)
            : (updated.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty);

          updated.gross_pnl = Number(gross.toFixed(2));
          updated.net_pnl = Number((gross - fees - other).toFixed(2));
          if (!updated.closed_at) {
            updated.closed_at = new Date().toISOString();
          }
        } else if (!isClosed) {
          updated.exit_price = null;
          updated.gross_pnl = null;
          updated.net_pnl = null;
          updated.closed_at = null;
        }

        return updated;
      });

      saveUserTrades(userId, trades);
      return trades.find(t => t.id === id);
    }
  }

  return {};
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('tm_token');
}

export function clearSession() {
  saveActiveSession(null);
  localStorage.removeItem('tm_token');
}

export async function api(path, options = {}) {
  // If running in local client mode (e.g. GitHub Pages without separate backend)
  // or path is demo/auth/has offline token:
  if (isLocalMode() || path.startsWith('/auth/demo') || path.startsWith('/auth/register') || path.startsWith('/auth/login')) {
    return handleOfflineRequest(path, options);
  }

  const token = getToken();
  if (token?.startsWith('tm_token_')) {
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
    // If backend connection fails, seamlessly fallback to local store
    return handleOfflineRequest(path, options);
  }
}
