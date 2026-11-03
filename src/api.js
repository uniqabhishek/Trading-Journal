let rawApi = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';
if (!rawApi.startsWith('http://') && !rawApi.startsWith('https://') && !rawApi.startsWith('/')) {
  rawApi = `https://${rawApi}`;
}
const baseApi = rawApi.replace(/\/+$/, '');
const API = baseApi.endsWith('/api') ? baseApi : `${baseApi}/api`;

const LOCAL_USER_KEY = 'tm_local_user';
const LOCAL_TRADES_KEY = 'tm_local_trades';

const DEFAULT_TRADES = [
  {
    id: 1,
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
    notes: 'Good entry at retest of 64k support.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 2,
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
    notes: 'Rejected from 3450 resistance band.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    closed_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 3,
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
    emotion: 'Patient',
    tags: 'forex, eurusd',
    notes: 'Followed trend after morning news.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    closed_at: new Date().toISOString()
  }
];

function getStoredTrades() {
  const raw = localStorage.getItem(LOCAL_TRADES_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(DEFAULT_TRADES));
    return DEFAULT_TRADES;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_TRADES;
  }
}

function calculateDashboard(trades) {
  const closed = trades.filter(t => t.status === 'CLOSED');
  const pnls = closed.map(t => Number(t.net_pnl || 0));
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const totalNet = pnls.reduce((acc, curr) => acc + curr, 0);
  const grossProfit = wins.reduce((acc, curr) => acc + curr, 0);
  const grossLoss = Math.abs(losses.reduce((acc, curr) => acc + curr, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : null;
  const winRate = closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(2)) : 0;

  return {
    total_trades: closed.length,
    winning_trades: wins.length,
    losing_trades: losses.length,
    win_rate: winRate,
    net_pnl: totalNet,
    gross_profit: grossProfit,
    gross_loss: grossLoss,
    profit_factor: profitFactor
  };
}

function handleOfflineRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  if (path === '/auth/login' || path === '/auth/register') {
    const user = {
      id: 1,
      name: body.name || (body.email ? body.email.split('@')[0] : 'Trader'),
      email: body.email || 'trader@demo.com'
    };
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    return { access_token: 'local-demo-token', user };
  }

  if (path === '/auth/me') {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : { id: 1, name: 'Trader', email: 'trader@demo.com' };
  }

  if (path === '/dashboard') {
    return calculateDashboard(getStoredTrades());
  }

  if (path === '/trades') {
    if (method === 'GET') {
      return getStoredTrades();
    }
    if (method === 'POST') {
      const trades = getStoredTrades();
      const entry = Number(body.entry_price || 0);
      const exit = body.exit_price !== undefined && body.exit_price !== '' ? Number(body.exit_price) : null;
      const qty = Number(body.quantity || 0);
      const fees = Number(body.fees || 0);
      const other = Number(body.other_costs || 0);

      let gross = body.gross_pnl !== undefined && body.gross_pnl !== '' ? Number(body.gross_pnl) : null;
      if (gross === null && exit !== null) {
        gross = body.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
      }
      const net = gross !== null ? gross - fees - other : null;

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
        gross_pnl: gross,
        net_pnl: net,
        strategy: body.strategy || '',
        emotion: body.emotion || 'Confident',
        tags: body.tags || '',
        notes: body.notes || '',
        created_at: new Date().toISOString(),
        closed_at: exit !== null ? new Date().toISOString() : null
      };

      trades.unshift(newTrade);
      localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(trades));
      return newTrade;
    }
  }

  if (path.startsWith('/trades/')) {
    const id = Number(path.replace('/trades/', ''));
    let trades = getStoredTrades();
    if (method === 'DELETE') {
      trades = trades.filter(t => t.id !== id);
      localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(trades));
      return { success: true };
    }
  }

  return {};
}

export function getToken() {
  return localStorage.getItem('tm_token');
}

export async function api(path, options = {}) {
  const token = getToken();

  // If already in local demo mode, handle immediately
  if (token === 'local-demo-token') {
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
    } catch (e) {
      console.warn("API non-JSON response:", text);
    }

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    // If backend server is unreachable or offline, fall back to offline handler
    console.info(`Remote server unreachable (${err.message}). Using local storage mode.`);
    return handleOfflineRequest(path, options);
  }
}
