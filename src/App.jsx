import React, { useEffect, useState, useMemo } from 'react'
import {
  api,
  getToken,
  clearSession,
  getUserTrades,
  loadSampleTradesForUser,
  clearUserTrades
} from './api'
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BrainCircuit,
  LogOut,
  RefreshCw,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Activity,
  Award,
  ShieldCheck,
  Zap,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

const CURRENCY_CONFIG = {
  INR: { locale: 'en-IN', currency: 'INR', symbol: '₹' },
  USD: { locale: 'en-US', currency: 'USD', symbol: '$' },
  EUR: { locale: 'de-DE', currency: 'EUR', symbol: '€' }
}

const emptyTrade = {
  market: 'CRYPTO',
  exchange: 'Delta Exchange',
  symbol: 'BTCUSDT',
  direction: 'LONG',
  status: 'CLOSED',
  entry_price: '',
  exit_price: '',
  quantity: '',
  leverage: '10',
  fees: '0',
  other_costs: '0',
  gross_pnl: '',
  strategy: 'Breakout & Retest',
  emotion: 'Confident',
  tags: 'breakout, swing',
  notes: ''
}

const QUICK_SYMBOLS = {
  CRYPTO: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
  FOREX: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'AUDUSD'],
  STOCKS: ['NVDA', 'TSLA', 'AAPL', 'MSFT', 'NIFTY50']
}

const QUICK_TAGS = ['Breakout', 'Trend Pullback', 'Support Bounce', 'Scalp', 'News Event', 'FOMO Entry']

export default function App() {
  const [token, setToken] = useState(getToken())
  const [authMode, setAuthMode] = useState('login')
  const [auth, setAuth] = useState({ name: '', email: '', password: '' })
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('dashboard')
  const [currency, setCurrency] = useState('INR')
  const [stats, setStats] = useState(null)
  const [trades, setTrades] = useState([])
  const [form, setForm] = useState(emptyTrade)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [marketFilter, setMarketFilter] = useState('ALL')
  const [directionFilter, setDirectionFilter] = useState('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState('ALL')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function formatMoney(amount) {
    const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.INR
    const num = Number(amount || 0)
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.currency,
      maximumFractionDigits: Math.abs(num) < 1 && num !== 0 ? 4 : 2
    }).format(num)
  }

  async function loadData() {
    try {
      const [u, t, s] = await Promise.all([
        api('/auth/me'),
        api('/trades'),
        api('/dashboard')
      ])
      setUser(u)
      setTrades(t || [])
      setStats(s)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  async function handleAuth(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login'
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(auth)
      })
      setToken(data.access_token)
      setUser(data.user)
      showToast(authMode === 'register' ? `Welcome, ${data.user.name}! Your journal is ready.` : `Welcome back, ${data.user.name}!`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDemoAccess() {
    setError('')
    setBusy(true)
    try {
      const data = await api('/auth/demo', { method: 'POST' })
      setToken(data.access_token)
      setUser(data.user)
      showToast('Entered Demo Mode with sample trading data.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function handleLogout() {
    clearSession()
    setToken(null)
    setUser(null)
    setTrades([])
    setStats(null)
    showToast('Signed out successfully.')
  }

  async function handleAddTrade(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = {
        ...form,
        entry_price: Number(form.entry_price),
        quantity: Number(form.quantity),
        leverage: Number(form.leverage || 1),
        fees: Number(form.fees || 0),
        other_costs: Number(form.other_costs || 0)
      }
      if (form.exit_price !== '') payload.exit_price = Number(form.exit_price)
      if (form.market === 'FOREX' && form.gross_pnl !== '') {
        payload.gross_pnl = Number(form.gross_pnl)
      }

      await api('/trades', { method: 'POST', body: JSON.stringify(payload) })
      setForm(emptyTrade)
      await loadData()
      setTab('history')
      showToast('Trade successfully recorded! 🚀')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteTrade(id) {
    if (!window.confirm('Are you sure you want to delete this trade?')) return
    try {
      await api(`/trades/${id}`, { method: 'DELETE' })
      await loadData()
      showToast('Trade deleted.')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleLoadSampleTrades() {
    if (!user) return
    if (trades.length > 0 && !window.confirm('Add sample trades to your current journal?')) return
    loadSampleTradesForUser(user.id)
    loadData()
    showToast('Sample trades loaded!')
  }

  function handleClearTrades() {
    if (!user) return
    if (!window.confirm('Delete all trades in your journal? This cannot be undone.')) return
    clearUserTrades(user.id)
    loadData()
    showToast('All trades cleared.')
  }

  function exportCSV() {
    if (!trades.length) {
      alert('No trades to export.')
      return
    }
    const headers = ['ID', 'Date', 'Symbol', 'Market', 'Side', 'Status', 'Entry', 'Exit', 'Qty', 'Fees', 'Gross PnL', 'Net PnL', 'Emotion', 'Strategy', 'Notes']
    const rows = trades.map(t => [
      t.id,
      t.closed_at ? new Date(t.closed_at).toLocaleDateString() : new Date(t.created_at).toLocaleDateString(),
      `"${t.symbol}"`,
      t.market,
      t.direction,
      t.status,
      t.entry_price,
      t.exit_price ?? '',
      t.quantity,
      t.fees,
      t.gross_pnl ?? '',
      t.net_pnl ?? '',
      `"${t.emotion || ''}"`,
      `"${t.strategy || ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `trademind_journal_${user?.name || 'trades'}_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    showToast('CSV downloaded successfully! 📊')
  }

  // Filtered trades list
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchSymbol = t.symbol?.toLowerCase().includes(q)
        const matchStrategy = t.strategy?.toLowerCase().includes(q)
        const matchTags = t.tags?.toLowerCase().includes(q)
        const matchNotes = t.notes?.toLowerCase().includes(q)
        if (!matchSymbol && !matchStrategy && !matchTags && !matchNotes) return false
      }
      if (marketFilter !== 'ALL' && t.market !== marketFilter) return false
      if (directionFilter !== 'ALL' && t.direction !== directionFilter) return false
      if (outcomeFilter === 'WIN' && Number(t.net_pnl) <= 0) return false
      if (outcomeFilter === 'LOSS' && (t.net_pnl === null || Number(t.net_pnl) >= 0)) return false
      if (outcomeFilter === 'OPEN' && t.status !== 'OPEN') return false
      return true
    })
  }, [trades, searchQuery, marketFilter, directionFilter, outcomeFilter])

  // Equity Curve calculation
  const equityData = useMemo(() => {
    const closed = [...trades]
      .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
      .sort((a, b) => new Date(a.closed_at || a.created_at) - new Date(b.closed_at || b.created_at))

    let runningPnl = 0
    return closed.map((t, idx) => {
      runningPnl += Number(t.net_pnl)
      return {
        tradeIndex: `#${idx + 1}`,
        symbol: t.symbol,
        date: new Date(t.closed_at || t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: Number(runningPnl.toFixed(2)),
        tradePnl: Number(t.net_pnl)
      }
    })
  }, [trades])

  // Emotion Analysis
  const emotionStats = useMemo(() => {
    const map = {}
    trades.filter(t => t.status === 'CLOSED').forEach(t => {
      const em = t.emotion || 'Neutral'
      if (!map[em]) map[em] = { emotion: em, trades: 0, wins: 0, totalPnl: 0 }
      map[em].trades++
      if (Number(t.net_pnl) > 0) map[em].wins++
      map[em].totalPnl += Number(t.net_pnl || 0)
    })
    return Object.values(map).map(e => ({
      ...e,
      winRate: e.trades > 0 ? Math.round((e.wins / e.trades) * 100) : 0,
      totalPnl: Number(e.totalPnl.toFixed(2))
    }))
  }, [trades])

  // Live P&L Preview in Add Trade Form
  const previewPnl = useMemo(() => {
    if (!form.entry_price || !form.exit_price || !form.quantity) return null
    const entry = Number(form.entry_price)
    const exit = Number(form.exit_price)
    const qty = Number(form.quantity)
    const fees = Number(form.fees || 0) + Number(form.other_costs || 0)
    let gross = form.market === 'FOREX' && form.gross_pnl !== ''
      ? Number(form.gross_pnl)
      : form.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty
    return {
      gross: Number(gross.toFixed(2)),
      net: Number((gross - fees).toFixed(2))
    }
  }, [form])

  // Initial Avatar initials
  const userInitials = useMemo(() => {
    if (!user?.name) return 'TR'
    const parts = user.name.trim().split(' ')
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase()
  }, [user])

  // AUTH SCREEN
  if (!token) {
    return (
      <main className="auth-wrap">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="brand-mark">
                <Sparkles size={22} />
              </div>
              <h1>TradeMind <span>AI</span></h1>
              <p className="auth-subtitle">Professional Trading Performance & Psychology Journal</p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => { setAuthMode('login'); setError('') }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => { setAuthMode('register'); setError('') }}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              {authMode === 'register' && (
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Abhishek Singh"
                    value={auth.name}
                    onChange={e => setAuth({ ...auth, name: e.target.value })}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. trader@example.com"
                  value={auth.email}
                  onChange={e => setAuth({ ...auth, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={auth.password}
                  onChange={e => setAuth({ ...auth, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              {error && <div className="error-box"><AlertCircle size={16} /> {error}</div>}

              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Verifying...' : authMode === 'login' ? 'Sign In to Your Journal' : 'Create My Personal Journal'}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR TRY IT INSTANTLY</span>
            </div>

            <button
              type="button"
              className="btn-demo"
              onClick={handleDemoAccess}
              disabled={busy}
            >
              <Zap size={16} /> Explore Live Demo (Instant Access)
            </button>

            <p className="auth-footer-note">
              🔒 100% Private. Your personal journal data is safely isolated to your account.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // MAIN APP SHELL
  return (
    <div className="app-shell">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo-box">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div className="brand-text">
            <b>TradeMind AI</b>
            <span className="badge-terminal">PRO TERMINAL</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={tab === 'dashboard' ? 'active' : ''}
            onClick={() => setTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>
          <button
            className={tab === 'add' ? 'active' : ''}
            onClick={() => setTab('add')}
          >
            <PlusCircle size={18} />
            <span>Record Trade</span>
          </button>
          <button
            className={tab === 'history' ? 'active' : ''}
            onClick={() => setTab('history')}
          >
            <History size={18} />
            <span>Trade History</span>
            {trades.length > 0 && <span className="nav-badge">{trades.length}</span>}
          </button>
          <button
            className={tab === 'psychology' ? 'active' : ''}
            onClick={() => setTab('psychology')}
          >
            <BrainCircuit size={18} />
            <span>AI Psychology</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="account-card">
            <div className="avatar-circle">{userInitials}</div>
            <div className="user-details">
              <strong>{user?.name || 'Trader'}</strong>
              <small>{user?.isDemo ? '⚡ Demo Account' : '🔒 Personal Account'}</small>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Sign Out">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* TOP BAR */}
        <header className="topbar">
          <div className="page-heading">
            <span className="eyebrow">
              {user?.isDemo ? 'PREVIEW DEMO WORKSPACE' : 'PERSONAL TRADING WORKSPACE'}
            </span>
            <h2>
              {tab === 'dashboard' && 'Performance Dashboard'}
              {tab === 'add' && 'Record New Trade'}
              {tab === 'history' && 'Trade Journal & History'}
              {tab === 'psychology' && 'Trader Psychology & Analytics'}
            </h2>
          </div>

          <div className="topbar-actions">
            {/* Currency Selector */}
            <div className="currency-pill">
              <span className="pill-label">Currency:</span>
              {Object.keys(CURRENCY_CONFIG).map(cur => (
                <button
                  key={cur}
                  className={currency === cur ? 'cur-btn active' : 'cur-btn'}
                  onClick={() => setCurrency(cur)}
                >
                  {cur}
                </button>
              ))}
            </div>

            <button className="btn-icon" onClick={() => loadData()} title="Refresh Data">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* TOAST NOTIFICATION */}
        {toast && (
          <div className="floating-toast">
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError('')}>&times;</button>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {tab === 'dashboard' && stats && (
          <div className="tab-pane">
            {/* HERO STATS GRID */}
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: stats.net_pnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', color: stats.net_pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                  {stats.net_pnl >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                </div>
                <div>
                  <span className="stat-label">Net Realized P&L</span>
                  <h3 className={stats.net_pnl >= 0 ? 'stat-value green' : 'stat-value red'}>
                    {formatMoney(stats.net_pnl)}
                  </h3>
                  <small className="stat-sub">
                    Gross Profit: {formatMoney(stats.gross_profit)}
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                  <Target size={22} />
                </div>
                <div>
                  <span className="stat-label">Win Rate</span>
                  <h3 className="stat-value">{stats.win_rate}%</h3>
                  <small className="stat-sub">
                    {stats.winning_trades} Wins / {stats.losing_trades} Losses
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                  <Award size={22} />
                </div>
                <div>
                  <span className="stat-label">Profit Factor</span>
                  <h3 className="stat-value">
                    {stats.profit_factor === null ? '—' : Number(stats.profit_factor).toFixed(2)}
                  </h3>
                  <small className="stat-sub">
                    Gross Loss: {formatMoney(stats.gross_loss)}
                  </small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                  <Activity size={22} />
                </div>
                <div>
                  <span className="stat-label">Total Executions</span>
                  <h3 className="stat-value">{trades.length}</h3>
                  <small className="stat-sub">
                    {stats.total_trades} Closed · {stats.open_trades} Open
                  </small>
                </div>
              </div>
            </section>

            {/* INTERACTIVE EQUITY CURVE */}
            <section className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3>Equity Growth Curve</h3>
                  <p className="panel-desc">Visual progression of cumulative trading account returns</p>
                </div>
                {equityData.length > 0 && (
                  <span className="equity-latest">
                    Total: <b className={stats.net_pnl >= 0 ? 'green' : 'red'}>{formatMoney(stats.net_pnl)}</b>
                  </span>
                )}
              </div>

              <div className="chart-container">
                {equityData.length === 0 ? (
                  <div className="empty-chart">
                    <Activity size={32} />
                    <p>No closed trades recorded yet. Record trades to see your live equity curve.</p>
                    <button className="btn-primary-sm" onClick={() => setTab('add')}>+ Record First Trade</button>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={equityData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={stats.net_pnl >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={stats.net_pnl >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="tradeIndex" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        tickFormatter={val => `${CURRENCY_CONFIG[currency]?.symbol || '₹'}${val}`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="custom-tooltip">
                                <span className="tooltip-title">{data.symbol} ({data.date})</span>
                                <div className="tooltip-row">
                                  <span>Trade P&L:</span>
                                  <b className={data.tradePnl >= 0 ? 'green' : 'red'}>{formatMoney(data.tradePnl)}</b>
                                </div>
                                <div className="tooltip-row">
                                  <span>Cumulative Equity:</span>
                                  <b className={data.pnl >= 0 ? 'green' : 'red'}>{formatMoney(data.pnl)}</b>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke={stats.net_pnl >= 0 ? '#10b981' : '#f43f5e'}
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#pnlGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* RECENT TRADES PREVIEW */}
            <section className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3>Recent Trades</h3>
                  <p className="panel-desc">Latest positions recorded in your journal</p>
                </div>
                <button className="btn-link" onClick={() => setTab('history')}>
                  View all {trades.length} trades &rarr;
                </button>
              </div>

              <TradeTable
                trades={trades.slice(0, 5)}
                onDelete={handleDeleteTrade}
                formatMoney={formatMoney}
              />
            </section>
          </div>
        )}

        {/* TAB 2: ADD TRADE */}
        {tab === 'add' && (
          <div className="tab-pane">
            <div className="glass-panel form-card">
              <div className="panel-header">
                <div>
                  <h3>Record a New Trade Execution</h3>
                  <p className="panel-desc">Log your entry, exit, strategy, and emotion to build actionable trading data</p>
                </div>
              </div>

              <form onSubmit={handleAddTrade} className="trade-grid-form">
                {/* MARKET & SYMBOL */}
                <div className="field">
                  <label>Market Category</label>
                  <select
                    value={form.market}
                    onChange={e => {
                      const m = e.target.value
                      setForm({
                        ...form,
                        market: m,
                        symbol: QUICK_SYMBOLS[m]?.[0] || 'BTCUSDT'
                      })
                    }}
                  >
                    <option value="CRYPTO">Crypto (Spot / Futures)</option>
                    <option value="FOREX">Forex / Currencies</option>
                    <option value="STOCKS">Equities / Stocks</option>
                  </select>
                </div>

                <div className="field">
                  <label>Trading Pair / Symbol</label>
                  <input
                    value={form.symbol}
                    onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. BTCUSDT, EURUSD, NVDA"
                  />
                  {/* Quick Symbol Chips */}
                  <div className="chips-row">
                    {(QUICK_SYMBOLS[form.market] || []).map(sym => (
                      <button
                        type="button"
                        key={sym}
                        className={form.symbol === sym ? 'chip active' : 'chip'}
                        onClick={() => setForm({ ...form, symbol: sym })}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIRECTION & STATUS */}
                <div className="field">
                  <label>Trade Direction</label>
                  <div className="toggle-group">
                    <button
                      type="button"
                      className={form.direction === 'LONG' ? 'toggle-btn long active' : 'toggle-btn'}
                      onClick={() => setForm({ ...form, direction: 'LONG' })}
                    >
                      ▲ BUY / LONG
                    </button>
                    <button
                      type="button"
                      className={form.direction === 'SHORT' ? 'toggle-btn short active' : 'toggle-btn'}
                      onClick={() => setForm({ ...form, direction: 'SHORT' })}
                    >
                      ▼ SELL / SHORT
                    </button>
                  </div>
                </div>

                <div className="field">
                  <label>Position Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="CLOSED">CLOSED (Completed Trade)</option>
                    <option value="OPEN">OPEN (Currently Active Position)</option>
                  </select>
                </div>

                {/* PRICES & QUANTITY */}
                <div className="field">
                  <label>Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    value={form.entry_price}
                    onChange={e => setForm({ ...form, entry_price: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="field">
                  <label>Exit Price {form.status === 'OPEN' && '(Optional while Open)'}</label>
                  <input
                    type="number"
                    step="any"
                    value={form.exit_price}
                    onChange={e => setForm({ ...form, exit_price: e.target.value })}
                    disabled={form.status === 'OPEN'}
                    required={form.status === 'CLOSED'}
                    placeholder="0.00"
                  />
                </div>

                <div className="field">
                  <label>Quantity / Size</label>
                  <input
                    type="number"
                    step="any"
                    min="0.00000001"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                    required
                    placeholder="e.g. 0.1, 1.0, 100"
                  />
                </div>

                <div className="field">
                  <label>Broker / Exchange</label>
                  <input
                    value={form.exchange}
                    onChange={e => setForm({ ...form, exchange: e.target.value })}
                    placeholder="e.g. Delta Exchange, Binance, Zerodha"
                  />
                </div>

                <div className="field">
                  <label>Trading Fees ({currency})</label>
                  <input
                    type="number"
                    step="any"
                    value={form.fees}
                    onChange={e => setForm({ ...form, fees: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="field">
                  <label>Strategy Setup</label>
                  <input
                    value={form.strategy}
                    onChange={e => setForm({ ...form, strategy: e.target.value })}
                    placeholder="e.g. Breakout & Retest, 5m Scalp"
                  />
                </div>

                {/* EMOTION SELECTOR */}
                <div className="field">
                  <label>Trader Emotion & State</label>
                  <select
                    value={form.emotion}
                    onChange={e => setForm({ ...form, emotion: e.target.value })}
                  >
                    <option value="Confident">🎯 Confident & Prepared</option>
                    <option value="Disciplined">🧘 Disciplined & Following Rules</option>
                    <option value="FOMO">⚡ FOMO (Fear of Missing Out)</option>
                    <option value="Revenge">😤 Revenge Trading</option>
                    <option value="Anxious">😰 Anxious / Hesitant</option>
                  </select>
                </div>

                {/* TAGS */}
                <div className="field">
                  <label>Tags</label>
                  <input
                    value={form.tags}
                    onChange={e => setForm({ ...form, tags: e.target.value })}
                    placeholder="e.g. breakout, news, trend"
                  />
                  <div className="chips-row">
                    {QUICK_TAGS.map(tag => (
                      <button
                        type="button"
                        key={tag}
                        className="chip"
                        onClick={() => {
                          const current = form.tags ? form.tags.split(',').map(s => s.trim()) : []
                          if (!current.includes(tag.toLowerCase())) {
                            setForm({ ...form, tags: [...current, tag.toLowerCase()].filter(Boolean).join(', ') })
                          }
                        }}
                      >
                        +{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FOREX MANUAL PNL (OPTIONAL) */}
                {form.market === 'FOREX' && form.status === 'CLOSED' && (
                  <div className="field full-width">
                    <label>Manual Gross P&L (For Forex Lots/Pips)</label>
                    <input
                      type="number"
                      step="any"
                      value={form.gross_pnl}
                      onChange={e => setForm({ ...form, gross_pnl: e.target.value })}
                      placeholder="Calculate or enter gross return"
                    />
                  </div>
                )}

                {/* TRADE NOTES */}
                <div className="field full-width">
                  <label>Trade Notes & Psychological Review</label>
                  <textarea
                    rows="3"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="What triggered your entry? Did you honor your stop loss? What was learned?"
                  />
                </div>

                {/* REAL-TIME PREVIEW CARD */}
                {previewPnl && (
                  <div className="field full-width preview-box">
                    <div className="preview-label">Calculated Estimate Preview:</div>
                    <div className="preview-values">
                      <span>Gross P&L: <b>{formatMoney(previewPnl.gross)}</b></span>
                      <span>Net P&L (after fees): <b className={previewPnl.net >= 0 ? 'green' : 'red'}>{formatMoney(previewPnl.net)}</b></span>
                    </div>
                  </div>
                )}

                <div className="field full-width form-actions">
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? 'Saving...' : '💾 Save & Record Trade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 3: TRADE HISTORY */}
        {tab === 'history' && (
          <div className="tab-pane">
            <div className="glass-panel">
              {/* TOOLBAR */}
              <div className="history-toolbar">
                <div className="search-bar">
                  <Search size={16} />
                  <input
                    type="text"
                    placeholder="Search by pair, strategy, or tags..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="clear-search" onClick={() => setSearchQuery('')}>&times;</button>
                  )}
                </div>

                <div className="filter-group">
                  <select value={marketFilter} onChange={e => setMarketFilter(e.target.value)}>
                    <option value="ALL">All Markets</option>
                    <option value="CRYPTO">Crypto</option>
                    <option value="FOREX">Forex</option>
                    <option value="STOCKS">Stocks</option>
                  </select>

                  <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)}>
                    <option value="ALL">All Sides</option>
                    <option value="LONG">Long Only</option>
                    <option value="SHORT">Short Only</option>
                  </select>

                  <select value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}>
                    <option value="ALL">All Outcomes</option>
                    <option value="WIN">Winning Trades</option>
                    <option value="LOSS">Losing Trades</option>
                    <option value="OPEN">Open Positions</option>
                  </select>
                </div>

                <div className="action-buttons">
                  <button className="btn-outline-sm" onClick={exportCSV} title="Export to CSV">
                    <Download size={14} /> Export CSV
                  </button>
                  <button className="btn-primary-sm" onClick={() => setTab('add')}>
                    <PlusCircle size={14} /> New Trade
                  </button>
                </div>
              </div>

              {/* TABLE */}
              <TradeTable
                trades={filteredTrades}
                onDelete={handleDeleteTrade}
                formatMoney={formatMoney}
              />

              {/* FOOTER ACTIONS */}
              <div className="journal-manage-bar">
                <div className="journal-info">
                  Showing {filteredTrades.length} of {trades.length} trades
                </div>
                <div className="journal-tools">
                  <button className="text-tool" onClick={handleLoadSampleTrades}>
                    + Load Sample Trades
                  </button>
                  <button className="text-tool danger" onClick={handleClearTrades}>
                    <Trash2 size={13} /> Clear All Trades
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AI PSYCHOLOGY & INSIGHTS */}
        {tab === 'psychology' && (
          <div className="tab-pane">
            {/* PSYCHOLOGY OVERVIEW */}
            <section className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3>Trading Psychology Matrix</h3>
                  <p className="panel-desc">How your emotional state directly impacts your win rate and profits</p>
                </div>
              </div>

              {emotionStats.length === 0 ? (
                <div className="empty-chart">
                  <BrainCircuit size={32} />
                  <p>Record trades with emotion tags to discover your trading psychology leaks.</p>
                </div>
              ) : (
                <div className="emotions-grid">
                  {emotionStats.map(em => (
                    <div key={em.emotion} className="emotion-card">
                      <div className="emotion-head">
                        <span className="emotion-name">{em.emotion}</span>
                        <span className={`emotion-pnl ${em.totalPnl >= 0 ? 'green' : 'red'}`}>
                          {formatMoney(em.totalPnl)}
                        </span>
                      </div>
                      <div className="emotion-bar-track">
                        <div
                          className="emotion-bar-fill"
                          style={{
                            width: `${em.winRate}%`,
                            background: em.winRate >= 50 ? '#10b981' : '#f43f5e'
                          }}
                        />
                      </div>
                      <div className="emotion-meta">
                        <span>Win Rate: <b>{em.winRate}%</b></span>
                        <span>{em.trades} Trades</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* AI COACHING TIPS */}
            <section className="glass-panel">
              <div className="panel-header">
                <div>
                  <h3>AI Performance Insights & Rules</h3>
                  <p className="panel-desc">Automated behavioural analysis based on your recorded performance</p>
                </div>
              </div>

              <div className="insights-list">
                <div className="insight-item">
                  <div className="insight-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4>Best Discipline Pattern</h4>
                    <p>
                      Trades tagged as <b>Disciplined</b> or <b>Confident</b> maintain your highest win rate. Protect this state by trading only A+ setups.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <div className="insight-icon" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4>Risk Warning: FOMO & Revenge Trading</h4>
                    <p>
                      Avoid entering new trades immediately after a loss. When feeling anxious or tempted by revenge trading, enforce a mandatory 30-minute cooldown rule.
                    </p>
                  </div>
                </div>

                <div className="insight-item">
                  <div className="insight-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <Target size={20} />
                  </div>
                  <div>
                    <h4>Risk-to-Reward Consistency</h4>
                    <p>
                      Aim for a minimum 1.5:1 reward-to-risk ratio on all closed trades to ensure long-term profitability even during normal drawdown periods.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        <footer className="footer-credits">
          <span>TradeMind AI Terminal · Live Production Journal</span>
          <span>Not Financial Advice · Built for Disciplined Traders</span>
        </footer>
      </main>
    </div>
  )
}

function TradeTable({ trades, onDelete, formatMoney }) {
  if (!trades.length) {
    return (
      <div className="empty-table">
        <Activity size={28} />
        <p>No trades match your current view.</p>
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <table className="modern-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol / Pair</th>
            <th>Market</th>
            <th>Direction</th>
            <th>Emotion</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Net P&L</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trades.map(t => {
            const isWin = Number(t.net_pnl) > 0
            const isLoss = Number(t.net_pnl) < 0
            const isOpen = t.status === 'OPEN'
            const dateStr = t.closed_at
              ? new Date(t.closed_at).toLocaleDateString()
              : new Date(t.created_at).toLocaleDateString()

            return (
              <tr key={t.id}>
                <td className="cell-date">{dateStr}</td>
                <td>
                  <div className="cell-symbol">
                    <b>{t.symbol}</b>
                    <small>{t.exchange || t.strategy || '—'}</small>
                  </div>
                </td>
                <td>
                  <span className="market-tag">{t.market}</span>
                </td>
                <td>
                  <span className={`direction-tag ${t.direction === 'LONG' ? 'long' : 'short'}`}>
                    {t.direction}
                  </span>
                </td>
                <td>
                  <span className="emotion-pill">{t.emotion || '—'}</span>
                </td>
                <td className="cell-price">{t.entry_price}</td>
                <td className="cell-price">{t.exit_price ?? '—'}</td>
                <td>
                  {isOpen ? (
                    <span className="status-open-pill">OPEN</span>
                  ) : (
                    <b className={isWin ? 'pnl-val green' : isLoss ? 'pnl-val red' : 'pnl-val'}>
                      {formatMoney(t.net_pnl)}
                    </b>
                  )}
                </td>
                <td className="cell-action">
                  <button
                    className="btn-trash"
                    onClick={() => onDelete(t.id)}
                    title="Delete trade"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
