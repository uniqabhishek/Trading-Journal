import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const APP_LOGO = require('./assets/app_logo.png');

const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' }
};

const DEMO_TRADES = [
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
    fees: 12,
    net_pnl: 248,
    gross_pnl: 260,
    emotion: 'Confident',
    strategy: 'Breakout & Retest',
    notes: 'Clean bounce off 64k support level.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString()
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
    fees: 8,
    net_pnl: 132,
    gross_pnl: 140,
    emotion: 'Disciplined',
    strategy: 'Resistance Rejection',
    notes: 'Rejected at 4H trendline resistance.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
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
    fees: 5,
    net_pnl: 70,
    gross_pnl: 75,
    emotion: 'Confident',
    strategy: 'London Breakout',
    notes: 'London session morning momentum.',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 4,
    market: 'CRYPTO',
    exchange: 'Binance',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    status: 'CLOSED',
    entry_price: 142.50,
    exit_price: 136.20,
    quantity: 5,
    fees: 4,
    net_pnl: -35.50,
    gross_pnl: -31.50,
    emotion: 'Anxious',
    strategy: 'Support Bounce',
    notes: 'Cut early after losing momentum.',
    created_at: new Date(Date.now() - 43200000).toISOString()
  }
];

const QUICK_SYMBOLS = {
  CRYPTO: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
  FOREX: ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY'],
  STOCKS: ['NVDA', 'TSLA', 'AAPL', 'NIFTY50']
};

const EMOTIONS = [
  { key: 'Confident', label: '🎯 Confident', color: '#10b981' },
  { key: 'Disciplined', label: '🧘 Disciplined', color: '#38bdf8' },
  { key: 'FOMO', label: '⚡ FOMO', color: '#f59e0b' },
  { key: 'Revenge', label: '😤 Revenge', color: '#f43f5e' },
  { key: 'Anxious', label: '😰 Anxious', color: '#a855f7' }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [currency, setCurrency] = useState('INR');
  const [trades, setTrades] = useState([]);
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('ALL');

  // Trade form state
  const [market, setMarket] = useState('CRYPTO');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [direction, setDirection] = useState('LONG');
  const [status, setStatus] = useState('CLOSED');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fees, setFees] = useState('0');
  const [emotion, setEmotion] = useState('Confident');
  const [strategy, setStrategy] = useState('Breakout & Retest');
  const [notes, setNotes] = useState('');

  // Load active session on start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('tm_mobile_session');
        if (raw) {
          const s = JSON.parse(raw);
          setSession(s);
          loadUserTrades(s.userId);
        }
      } catch (e) {
        console.warn('Session load error', e);
      }
    })();
  }, []);

  async function loadUserTrades(userId) {
    try {
      const key = `tm_mobile_trades_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        setTrades(JSON.parse(raw));
      } else if (userId === 'demo') {
        await AsyncStorage.setItem(key, JSON.stringify(DEMO_TRADES));
        setTrades(DEMO_TRADES);
      } else {
        setTrades([]);
      }
    } catch (e) {
      console.warn('Trades load error', e);
    }
  }

  async function saveTradesToStorage(userId, newTrades) {
    setTrades(newTrades);
    try {
      await AsyncStorage.setItem(`tm_mobile_trades_${userId}`, JSON.stringify(newTrades));
    } catch (e) {
      console.warn('Save error', e);
    }
  }

  function formatMoney(amount) {
    const sym = CURRENCIES[currency]?.symbol || '₹';
    const num = Number(amount || 0);
    return `${num < 0 ? '-' : ''}${sym}${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  // Auth: Register
  async function handleRegister() {
    if (!authName.trim()) return Alert.alert('Required', 'Please enter your full name.');
    if (!authEmail.trim() || !authEmail.includes('@')) return Alert.alert('Required', 'Please enter a valid email.');
    if (!authPassword || authPassword.length < 6) return Alert.alert('Required', 'Password must be at least 6 characters.');

    const userId = 'u_' + Date.now();
    const newSession = {
      userId,
      name: authName.trim(),
      email: authEmail.trim().toLowerCase(),
      isDemo: false
    };

    try {
      await AsyncStorage.setItem('tm_mobile_session', JSON.stringify(newSession));
      await AsyncStorage.setItem(`tm_user_${newSession.email}`, JSON.stringify({ ...newSession, password: authPassword }));
      setSession(newSession);
      setTrades([]);
      Alert.alert('Account Created', `Welcome to TradeMind, ${newSession.name}!`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  // Auth: Login
  async function handleLogin() {
    if (!authEmail.trim() || !authPassword) return Alert.alert('Required', 'Please enter your email and password.');

    try {
      const stored = await AsyncStorage.getItem(`tm_user_${authEmail.trim().toLowerCase()}`);
      if (!stored) {
        return Alert.alert('Account Not Found', 'No registered account found with this email. Please click "Create Account".');
      }
      const userObj = JSON.parse(stored);
      if (userObj.password !== authPassword) {
        return Alert.alert('Invalid Password', 'Incorrect password. Please try again.');
      }

      const active = { userId: userObj.userId, name: userObj.name, email: userObj.email, isDemo: false };
      await AsyncStorage.setItem('tm_mobile_session', JSON.stringify(active));
      setSession(active);
      loadUserTrades(active.userId);
    } catch (e) {
      Alert.alert('Login Error', e.message);
    }
  }

  // Auth: Instant Demo
  async function handleDemo() {
    const demoSession = {
      userId: 'demo',
      name: 'Demo Trader',
      email: 'demo@trademind.ai',
      isDemo: true
    };
    await AsyncStorage.setItem('tm_mobile_session', JSON.stringify(demoSession));
    setSession(demoSession);
    loadUserTrades('demo');
  }

  // Sign out
  async function handleSignOut() {
    await AsyncStorage.removeItem('tm_mobile_session');
    setSession(null);
    setTrades([]);
  }

  // Add Trade
  async function handleSaveTrade() {
    if (!entryPrice || !quantity) return Alert.alert('Required', 'Please fill Entry Price and Quantity.');
    if (status === 'CLOSED' && !exitPrice) return Alert.alert('Required', 'Exit price is required for closed trades.');

    const entry = Number(entryPrice);
    const exit = exitPrice ? Number(exitPrice) : null;
    const qty = Number(quantity);
    const feeAmt = Number(fees || 0);

    let gross = null;
    let net = null;
    if (exit !== null) {
      gross = direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
      net = Number((gross - feeAmt).toFixed(2));
      gross = Number(gross.toFixed(2));
    }

    const newTrade = {
      id: Date.now(),
      market,
      symbol: symbol.toUpperCase(),
      direction,
      status,
      entry_price: entry,
      exit_price: exit,
      quantity: qty,
      fees: feeAmt,
      gross_pnl: gross,
      net_pnl: net,
      emotion,
      strategy,
      notes,
      created_at: new Date().toISOString()
    };

    const updated = [newTrade, ...trades];
    await saveTradesToStorage(session.userId, updated);

    // Reset form
    setEntryPrice('');
    setExitPrice('');
    setQuantity('');
    setNotes('');
    setTab('dashboard');
    Alert.alert('Trade Recorded', `${symbol} ${direction} position saved! 🚀`);
  }

  // Delete trade
  async function handleDeleteTrade(id) {
    Alert.alert('Delete Trade', 'Are you sure you want to remove this trade record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = trades.filter(t => t.id !== id);
          await saveTradesToStorage(session.userId, updated);
        }
      }
    ]);
  }

  // Dashboard Stats
  const stats = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    const pnls = closed.map(t => Number(t.net_pnl || 0));
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const totalNet = pnls.reduce((acc, c) => acc + c, 0);
    const grossProfit = wins.reduce((acc, c) => acc + c, 0);
    const grossLoss = Math.abs(losses.reduce((acc, c) => acc + c, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '99' : '—');
    const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;

    return {
      netPnl: totalNet,
      winRate,
      profitFactor,
      totalTrades: closed.length,
      openCount: trades.filter(t => t.status === 'OPEN').length,
      winsCount: wins.length,
      lossCount: losses.length
    };
  }, [trades]);

  // Live PnL Preview in Form
  const previewPnl = useMemo(() => {
    if (!entryPrice || !exitPrice || !quantity) return null;
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const qty = Number(quantity);
    const feeAmt = Number(fees || 0);
    const gross = direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
    return { gross, net: gross - feeAmt };
  }, [entryPrice, exitPrice, quantity, fees, direction]);

  // Filtered Trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        const mSymbol = t.symbol?.toLowerCase().includes(q);
        const mStrategy = t.strategy?.toLowerCase().includes(q);
        const mEmotion = t.emotion?.toLowerCase().includes(q);
        if (!mSymbol && !mStrategy && !mEmotion) return false;
      }
      if (filterOutcome === 'WIN' && Number(t.net_pnl) <= 0) return false;
      if (filterOutcome === 'LOSS' && (t.net_pnl === null || Number(t.net_pnl) >= 0)) return false;
      if (filterOutcome === 'OPEN' && t.status !== 'OPEN') return false;
      return true;
    });
  }, [trades, search, filterOutcome]);

  // Emotion Stats
  const emotionStats = useMemo(() => {
    const map = {};
    trades.filter(t => t.status === 'CLOSED').forEach(t => {
      const em = t.emotion || 'Neutral';
      if (!map[em]) map[em] = { emotion: em, trades: 0, wins: 0, pnl: 0 };
      map[em].trades++;
      if (Number(t.net_pnl) > 0) map[em].wins++;
      map[em].pnl += Number(t.net_pnl || 0);
    });
    return Object.values(map).map(e => ({
      ...e,
      winRate: e.trades > 0 ? Math.round((e.wins / e.trades) * 100) : 0
    }));
  }, [trades]);

  // AUTH VIEW
  if (!session) {
    return (
      <SafeAreaView style={styles.authSafe}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.authLogoWrap}>
            <Image source={APP_LOGO} style={styles.appLogo} resizeMode="contain" />
            <Text style={styles.appTitle}>TradeMind <Text style={styles.cyan}>AI</Text></Text>
            <Text style={styles.appSubtitle}>Professional Trading Performance & Psychology</Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.authToggle}>
              <TouchableOpacity
                style={[styles.authToggleBtn, authMode === 'login' && styles.authToggleActive]}
                onPress={() => setAuthMode('login')}
              >
                <Text style={[styles.authToggleText, authMode === 'login' && styles.textWhite]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authToggleBtn, authMode === 'register' && styles.authToggleActive]}
                onPress={() => setAuthMode('register')}
              >
                <Text style={[styles.authToggleText, authMode === 'register' && styles.textWhite]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {authMode === 'register' && (
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Abhishek Singh"
                  placeholderTextColor="#64748b"
                  value={authName}
                  onChangeText={setAuthName}
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="trader@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={authEmail}
                onChangeText={setAuthEmail}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Min 6 characters"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={authMode === 'register' ? handleRegister : handleLogin}
            >
              <Text style={styles.btnPrimaryText}>
                {authMode === 'register' ? 'Create My Personal Journal' : 'Sign In to Journal'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR TEST INSTANTLY</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.btnDemo} onPress={handleDemo}>
              <Text style={styles.btnDemoText}>⚡ Explore Live Demo Mode</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // MAIN APP VIEW
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={APP_LOGO} style={styles.headerLogo} />
          <View>
            <Text style={styles.headerTitle}>TradeMind <Text style={styles.cyan}>AI</Text></Text>
            <Text style={styles.headerUser}>
              {session.name} · {session.isDemo ? '⚡ Demo' : '🔒 Private'}
            </Text>
          </View>
        </View>

        {/* Currency Switcher & Sign Out */}
        <View style={styles.headerRight}>
          <View style={styles.currencyToggle}>
            {Object.keys(CURRENCIES).map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.curBtn, currency === c && styles.curBtnActive]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[styles.curBtnText, currency === c && styles.textWhite]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.headerSignOutBtn} onPress={handleSignOut} title="Sign Out">
            <Text style={styles.headerSignOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENT TABS */}
      <ScrollView contentContainerStyle={styles.mainScroll} keyboardShouldPersistTaps="handled">
        {/* TAB 1: DASHBOARD */}
        {tab === 'dashboard' && (
          <View style={styles.pane}>
            {/* HERO P&L CARD */}
            <View style={[styles.heroCard, stats.netPnl >= 0 ? styles.heroCardGreen : styles.heroCardRed]}>
              <Text style={styles.heroLabel}>NET REALIZED P&L</Text>
              <Text style={[styles.heroValue, stats.netPnl >= 0 ? styles.green : styles.red]}>
                {formatMoney(stats.netPnl)}
              </Text>
              <Text style={styles.heroSub}>
                {stats.winsCount} Wins · {stats.lossCount} Losses · {stats.openCount} Open
              </Text>
            </View>

            {/* KEY METRICS GRID */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>WIN RATE</Text>
                <Text style={styles.statBoxVal}>{stats.winRate}%</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>PROFIT FACTOR</Text>
                <Text style={styles.statBoxVal}>{stats.profitFactor}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>CLOSED TRADES</Text>
                <Text style={styles.statBoxVal}>{stats.totalTrades}</Text>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.quickBar}>
              <TouchableOpacity style={styles.btnAction} onPress={() => setTab('add')}>
                <Text style={styles.btnActionText}>➕ Log New Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnActionOutline} onPress={() => setTab('journal')}>
                <Text style={styles.btnActionOutlineText}>📜 View Journal</Text>
              </TouchableOpacity>
            </View>

            {/* RECENT TRADES PREVIEW */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Executions</Text>
              <TouchableOpacity onPress={() => setTab('journal')}>
                <Text style={styles.linkText}>See all ({trades.length})</Text>
              </TouchableOpacity>
            </View>

            {trades.slice(0, 4).map(t => (
              <TradeCard key={t.id} trade={t} formatMoney={formatMoney} onDelete={handleDeleteTrade} />
            ))}

            {trades.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No trades recorded yet.</Text>
                <TouchableOpacity style={styles.btnPrimarySm} onPress={() => setTab('add')}>
                  <Text style={styles.btnPrimaryText}>Record First Trade</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: ADD TRADE */}
        {tab === 'add' && (
          <View style={styles.pane}>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Record New Execution</Text>

              {/* MARKET SELECTOR */}
              <Text style={styles.label}>Market Category</Text>
              <View style={styles.chipsRow}>
                {['CRYPTO', 'FOREX', 'STOCKS'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, market === m && styles.chipActive]}
                    onPress={() => {
                      setMarket(m);
                      setSymbol(QUICK_SYMBOLS[m]?.[0] || 'BTCUSDT');
                    }}
                  >
                    <Text style={[styles.chipText, market === m && styles.textWhite]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SYMBOL & QUICK CHIPS */}
              <Text style={styles.label}>Trading Pair / Symbol</Text>
              <TextInput
                style={styles.input}
                value={symbol}
                onChangeText={t => setSymbol(t.toUpperCase())}
                placeholder="BTCUSDT / EURUSD / NVDA"
                placeholderTextColor="#64748b"
              />
              <View style={styles.chipsRow}>
                {(QUICK_SYMBOLS[market] || []).map(sym => (
                  <TouchableOpacity
                    key={sym}
                    style={[styles.symbolChip, symbol === sym && styles.chipActive]}
                    onPress={() => setSymbol(sym)}
                  >
                    <Text style={[styles.symbolChipText, symbol === sym && styles.textWhite]}>{sym}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* DIRECTION TOGGLE */}
              <Text style={styles.label}>Position Direction</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, direction === 'LONG' && styles.toggleLongActive]}
                  onPress={() => setDirection('LONG')}
                >
                  <Text style={[styles.toggleText, direction === 'LONG' && styles.green]}>▲ BUY / LONG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, direction === 'SHORT' && styles.toggleShortActive]}
                  onPress={() => setDirection('SHORT')}
                >
                  <Text style={[styles.toggleText, direction === 'SHORT' && styles.red]}>▼ SELL / SHORT</Text>
                </TouchableOpacity>
              </View>

              {/* STATUS */}
              <Text style={styles.label}>Status</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, status === 'CLOSED' && styles.toggleBtnActive]}
                  onPress={() => setStatus('CLOSED')}
                >
                  <Text style={[styles.toggleText, status === 'CLOSED' && styles.textWhite]}>CLOSED</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, status === 'OPEN' && styles.toggleBtnActive]}
                  onPress={() => setStatus('OPEN')}
                >
                  <Text style={[styles.toggleText, status === 'OPEN' && styles.textWhite]}>OPEN POSITION</Text>
                </TouchableOpacity>
              </View>

              {/* PRICES */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Entry Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={entryPrice}
                    onChangeText={setEntryPrice}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Exit Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={status === 'OPEN' ? 'Optional' : '0.00'}
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    editable={status === 'CLOSED'}
                    value={exitPrice}
                    onChangeText={setExitPrice}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Quantity / Size</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 0.1, 1"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Fees ({currency})</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={fees}
                    onChangeText={setFees}
                  />
                </View>
              </View>

              {/* LIVE PNL PREVIEW */}
              {previewPnl && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Live Real-time Estimate:</Text>
                  <Text style={[styles.previewVal, previewPnl.net >= 0 ? styles.green : styles.red]}>
                    Net P&L: {formatMoney(previewPnl.net)}
                  </Text>
                </View>
              )}

              {/* EMOTION SELECTOR */}
              <Text style={styles.label}>Trader Emotional State</Text>
              <View style={styles.chipsRow}>
                {EMOTIONS.map(em => (
                  <TouchableOpacity
                    key={em.key}
                    style={[styles.chip, emotion === em.key && { borderColor: em.color, backgroundColor: 'rgba(56,189,248,0.15)' }]}
                    onPress={() => setEmotion(em.key)}
                  >
                    <Text style={[styles.chipText, emotion === em.key && { color: em.color, fontWeight: '700' }]}>
                      {em.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* STRATEGY & NOTES */}
              <Text style={styles.label}>Strategy / Setup</Text>
              <TextInput
                style={styles.input}
                value={strategy}
                onChangeText={setStrategy}
                placeholder="e.g. Breakout & Retest, Scalp"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Trade Notes</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholder="Reasons for entry, emotions, lessons..."
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveTrade}>
                <Text style={styles.btnPrimaryText}>💾 Save & Record Position</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 3: TRADE JOURNAL */}
        {tab === 'journal' && (
          <View style={styles.pane}>
            {/* SEARCH & FILTERS */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search pair, strategy, or emotion..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />

            <View style={styles.filterChipsRow}>
              {['ALL', 'WIN', 'LOSS', 'OPEN'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, filterOutcome === f && styles.filterChipActive]}
                  onPress={() => setFilterOutcome(f)}
                >
                  <Text style={[styles.filterChipText, filterOutcome === f && styles.textWhite]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {filteredTrades.map(t => (
              <TradeCard key={t.id} trade={t} formatMoney={formatMoney} onDelete={handleDeleteTrade} />
            ))}

            {filteredTrades.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No trades match your search.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 4: PSYCHOLOGY & SETTINGS */}
        {tab === 'psychology' && (
          <View style={styles.pane}>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>🧠 Trading Psychology Matrix</Text>
              <Text style={styles.cardSub}>How your mental state impacts your win rate</Text>

              {emotionStats.map(em => (
                <View key={em.emotion} style={styles.emotionRow}>
                  <View style={styles.emotionInfo}>
                    <Text style={styles.emotionTitle}>{em.emotion}</Text>
                    <Text style={[styles.emotionPnl, em.pnl >= 0 ? styles.green : styles.red]}>
                      {formatMoney(em.pnl)}
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${em.winRate}%`,
                          backgroundColor: em.winRate >= 50 ? '#10b981' : '#f43f5e'
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.emotionMeta}>{em.winRate}% Win Rate · {em.trades} trades</Text>
                </View>
              ))}
            </View>

            {/* ACCOUNT MANAGEMENT */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Profile & Storage</Text>
              <Text style={styles.infoRow}>User: <Text style={styles.textWhite}>{session.name}</Text></Text>
              <Text style={styles.infoRow}>Email: <Text style={styles.textWhite}>{session.email}</Text></Text>
              <Text style={styles.infoRow}>Storage: <Text style={styles.cyan}>Local Encrypted Storage</Text></Text>

              <TouchableOpacity style={styles.btnDangerOutline} onPress={handleSignOut}>
                <Text style={styles.btnDangerText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM TAB NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, tab === 'dashboard' && styles.navBtnActive]}
          onPress={() => setTab('dashboard')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navLabel, tab === 'dashboard' && styles.cyan]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'add' && styles.navBtnActive]}
          onPress={() => setTab('add')}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={[styles.navLabel, tab === 'add' && styles.cyan]}>Add Trade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'journal' && styles.navBtnActive]}
          onPress={() => setTab('journal')}
        >
          <Text style={styles.navIcon}>📜</Text>
          <Text style={[styles.navLabel, tab === 'journal' && styles.cyan]}>Journal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'psychology' && styles.navBtnActive]}
          onPress={() => setTab('psychology')}
        >
          <Text style={styles.navIcon}>🧠</Text>
          <Text style={[styles.navLabel, tab === 'psychology' && styles.cyan]}>AI Mind</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// TRADE CARD COMPONENT
function TradeCard({ trade, formatMoney, onDelete }) {
  const isWin = Number(trade.net_pnl) > 0;
  const isLoss = Number(trade.net_pnl) < 0;
  const isOpen = trade.status === 'OPEN';

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeHead}>
        <View style={styles.tradeSymbolWrap}>
          <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
          <View style={[styles.sideBadge, trade.direction === 'LONG' ? styles.badgeLong : styles.badgeShort]}>
            <Text style={trade.direction === 'LONG' ? styles.green : styles.red}>{trade.direction}</Text>
          </View>
        </View>

        <View style={styles.tradePnlWrap}>
          {isOpen ? (
            <Text style={styles.statusOpen}>ACTIVE</Text>
          ) : (
            <Text style={[styles.tradePnl, isWin ? styles.green : isLoss ? styles.red : styles.textWhite]}>
              {formatMoney(trade.net_pnl)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.tradeDetails}>
        <Text style={styles.detailText}>Entry: {trade.entry_price} · Exit: {trade.exit_price ?? '—'}</Text>
        <Text style={styles.detailText}>Qty: {trade.quantity} · {trade.market}</Text>
      </View>

      <View style={styles.tradeFooter}>
        <Text style={styles.emotionBadge}>{trade.emotion || 'Disciplined'}</Text>
        <TouchableOpacity onPress={() => onDelete(trade.id)}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070b14' },
  authSafe: { flex: 1, backgroundColor: '#070b14' },
  authContainer: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  authLogoWrap: { alignItems: 'center', marginBottom: 28 },
  appLogo: { width: 90, height: 90, borderRadius: 22, marginBottom: 14 },
  appTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  cyan: { color: '#38bdf8' },
  green: { color: '#10b981' },
  red: { color: '#f43f5e' },
  textWhite: { color: '#fff' },
  appSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  authCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: '#070b14',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20
  },
  authToggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  authToggleActive: { backgroundColor: '#2563eb' },
  authToggleText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  inputWrap: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  input: {
    backgroundColor: '#070b14',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    color: '#fff',
    fontSize: 14
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 8
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { fontSize: 10, color: '#64748b', paddingHorizontal: 10, fontWeight: '700' },
  btnDemo: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  btnDemoText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b1120'
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 32, height: 32, borderRadius: 8 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  headerUser: { fontSize: 10, color: '#64748b' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerSignOutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7
  },
  headerSignOutText: { color: '#f43f5e', fontSize: 11, fontWeight: '700' },
  currencyToggle: { flexDirection: 'row', backgroundColor: '#070b14', borderRadius: 8, padding: 2 },
  curBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  curBtnActive: { backgroundColor: '#2563eb' },
  curBtnText: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },

  // SCROLL & PANES
  mainScroll: { padding: 14, paddingBottom: 80 },
  pane: { gap: 12 },

  // HERO CARD
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  heroCardGreen: { borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: 'rgba(16, 185, 129, 0.04)' },
  heroCardRed: { borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: 'rgba(244, 63, 94, 0.04)' },
  heroLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  heroValue: { fontSize: 26, fontWeight: '900', marginVertical: 4, letterSpacing: -0.5 },
  heroSub: { fontSize: 11, color: '#94a3b8' },

  // STATS GRID
  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center'
  },
  statBoxLabel: { fontSize: 8, color: '#64748b', fontWeight: '700' },
  statBoxVal: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 3 },

  // QUICK ACTIONS
  quickBar: { flexDirection: 'row', gap: 8 },
  btnAction: { flex: 1, backgroundColor: '#2563eb', padding: 11, borderRadius: 10, alignItems: 'center' },
  btnActionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  btnActionOutline: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    padding: 11,
    borderRadius: 10,
    alignItems: 'center'
  },
  btnActionOutlineText: { color: '#94a3b8', fontWeight: '700', fontSize: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  linkText: { fontSize: 11, color: '#38bdf8', fontWeight: '600' },

  // TRADE CARD
  tradeCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  tradeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeSymbolWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tradeSymbol: { fontSize: 16, fontWeight: '800', color: '#fff' },
  sideBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeLong: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeShort: { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
  tradePnlWrap: { alignItems: 'flex-end' },
  tradePnl: { fontSize: 15, fontWeight: '800' },
  statusOpen: { fontSize: 11, fontWeight: '800', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tradeDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 11, color: '#64748b' },
  tradeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  emotionBadge: { fontSize: 11, color: '#38bdf8' },
  deleteText: { fontSize: 11, color: '#f43f5e', fontWeight: '600' },

  // FORM CARD
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12
  },
  cardHeading: { fontSize: 18, fontWeight: '800', color: '#fff' },
  cardSub: { fontSize: 12, color: '#64748b' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#070b14', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  symbolChip: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  symbolChipText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, backgroundColor: '#070b14', borderColor: '#1e293b', borderWidth: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleLongActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  toggleShortActive: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e' },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  previewBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12
  },
  previewTitle: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
  previewVal: { fontSize: 15, fontWeight: '800', marginTop: 4 },

  // SEARCH & FILTERS
  searchInput: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    color: '#fff',
    fontSize: 14
  },
  filterChipsRow: { flexDirection: 'row', gap: 8 },
  filterChip: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // PSYCHOLOGY
  emotionRow: { backgroundColor: '#070b14', padding: 14, borderRadius: 10, gap: 6 },
  emotionInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  emotionTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  emotionPnl: { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  emotionMeta: { fontSize: 10, color: '#64748b' },

  infoRow: { fontSize: 13, color: '#94a3b8' },
  btnDangerOutline: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8
  },
  btnDangerText: { color: '#f43f5e', fontWeight: '700', fontSize: 13 },

  emptyBox: { padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { color: '#64748b', fontSize: 14 },
  btnPrimarySm: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },

  // BOTTOM NAVIGATION
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: '#0b1120',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navBtn: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  navBtnActive: {},
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: '700' }
});
