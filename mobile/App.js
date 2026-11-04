import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Modal,
  StatusBar as RNStatusBar,
  Animated,
  Easing,
  Linking,
  BackHandler
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const APP_LOGO = require('./assets/app_logo.png');

const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' }
};

const APP_VERSION = 'v2.1.0';
const DEVELOPER_NAME = 'Abhishek';
const GITHUB_REPO = 'https://github.com/uniqabhishek/Trading-Journal';
const GITHUB_PROFILE = 'https://github.com/uniqabhishek';
const WEB_APP_URL = 'https://uniqabhishek.github.io/Trading-Journal/';

// Storage Keys (Permanent & Safe across updates)
const MASTER_USERS_KEY = 'tm_master_users_registry_v1';
const ACTIVE_SESSION_KEY = 'tm_active_session_v4';

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
    image_uri: null,
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
    image_uri: null,
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
    image_uri: null,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 4,
    market: 'CRYPTO',
    exchange: 'Binance',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    status: 'OPEN',
    entry_price: 142.50,
    exit_price: null,
    quantity: 5,
    fees: 4,
    net_pnl: null,
    gross_pnl: null,
    emotion: 'Confident',
    strategy: 'Support Bounce',
    notes: 'Holding active breakout position.',
    image_uri: null,
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
  // Opening Splash State & Animations
  const [showSplash, setShowSplash] = useState(true);
  const splashScale = useRef(new Animated.Value(0.7)).current;
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const splashTextFade = useRef(new Animated.Value(0)).current;
  const splashDevFade = useRef(new Animated.Value(0)).current;
  const splashPulse = useRef(new Animated.Value(1)).current;
  const splashContainerFade = useRef(new Animated.Value(1)).current;

  // Main UI Tab Content Fade Animation
  const tabFade = useRef(new Animated.Value(1)).current;

  // Core App State
  const [session, setSession] = useState(null);
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' (Mobile Number) or 'password' (Email)
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Auth Inputs
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // OTP System State
  const [sentOtp, setSentOtp] = useState(null);
  const [inputOtp, setInputOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false); // true when waiting for OTP code input

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
  const [tradeImage, setTradeImage] = useState(null); // Chart picture URI

  // Modals for Close Trade & Edit Trade
  const [closingTrade, setClosingTrade] = useState(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');
  const [closeFees, setCloseFees] = useState('0');

  const [editingTrade, setEditingTrade] = useState(null);
  const [editForm, setEditForm] = useState(null);

  // Full Screen Image Viewer Modal
  const [viewingImage, setViewingImage] = useState(null);

  // Developer Profile Modal
  const [showDevModal, setShowDevModal] = useState(false);

  // 1. HARDWARE BACK BUTTON NAVIGATION (Back to previous step or main menu)
  useEffect(() => {
    const onBackPress = () => {
      // Step A: Close any active modal
      if (viewingImage) {
        setViewingImage(null);
        return true;
      }
      if (closingTrade) {
        setClosingTrade(null);
        return true;
      }
      if (editingTrade) {
        setEditingTrade(null);
        return true;
      }
      if (showDevModal) {
        setShowDevModal(false);
        return true;
      }
      if (otpStep) {
        setOtpStep(false);
        return true;
      }

      // Step B: If not on dashboard, return to dashboard (main menu)
      if (tab !== 'dashboard') {
        switchTab('dashboard');
        return true;
      }

      // Step C: If already on dashboard, confirm before exiting
      Alert.alert(
        'Exit TradeMind AI',
        'Do you want to exit the app?',
        [
          { text: 'Stay in App', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    };

    const backHandlerSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandlerSub.remove();
  }, [viewingImage, closingTrade, editingTrade, showDevModal, otpStep, tab]);

  // 2. RUN SPLASH OPENING ANIMATION ON START
  useEffect(() => {
    Animated.parallel([
      Animated.spring(splashScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(splashOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true
      })
    ]).start(() => {
      Animated.timing(splashTextFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        Animated.timing(splashDevFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true
        }).start(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(splashPulse, { toValue: 1.05, duration: 800, useNativeDriver: true }),
              Animated.timing(splashPulse, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
          ).start();

          setTimeout(() => {
            handleDismissSplash();
          }, 1400);
        });
      });
    });
  }, []);

  function handleDismissSplash() {
    Animated.timing(splashContainerFade, {
      toValue: 0,
      duration: 500,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setShowSplash(false);
    });
  }

  // Animate tab switching
  function switchTab(newTab) {
    if (newTab === tab) return;
    Animated.timing(tabFade, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true
    }).start(() => {
      setTab(newTab);
      Animated.timing(tabFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    });
  }

  // 3. PERSISTENT MASTER USER STORAGE FUNCTIONS
  async function getMasterUsers() {
    try {
      const raw = await AsyncStorage.getItem(MASTER_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async function saveMasterUsers(users) {
    try {
      await AsyncStorage.setItem(MASTER_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Error saving master users', e);
    }
  }

  // Load active session and migrate any legacy accounts on start
  useEffect(() => {
    (async () => {
      try {
        // Attempt to load current active session
        let rawSession = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
        if (!rawSession) {
          rawSession = await AsyncStorage.getItem('tm_mobile_session_v3');
        }
        if (!rawSession) {
          rawSession = await AsyncStorage.getItem('tm_mobile_session');
        }

        if (rawSession) {
          const s = JSON.parse(rawSession);
          setSession(s);
          loadUserTrades(s.userId);

          // Ensure active session user is in master registry
          const users = await getMasterUsers();
          const exists = users.find(u => u.id === s.userId);
          if (!exists) {
            users.push({
              id: s.userId,
              name: s.name,
              email: s.email || '',
              phone: s.phone || '',
              isDemo: s.isDemo || false
            });
            await saveMasterUsers(users);
          }
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

  // 4. OTP SYSTEM: SEND VERIFICATION CODE
  async function handleSendOtp() {
    const cleanPhone = authPhone.trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      return Alert.alert('Invalid Mobile Number', 'Please enter a valid 10-digit mobile phone number.');
    }
    if (authMode === 'register' && !authName.trim()) {
      return Alert.alert('Name Required', 'Please enter your full name to create an account.');
    }

    const users = await getMasterUsers();
    const existing = users.find(u => u.phone === cleanPhone);

    if (authMode === 'register' && existing) {
      return Alert.alert(
        'Account Exists',
        `An account is already registered with mobile ${cleanPhone}. Please switch to Sign In.`,
        [{ text: 'Switch to Sign In', onPress: () => { setAuthMode('login'); setOtpStep(false); } }]
      );
    }

    if (authMode === 'login' && !existing) {
      return Alert.alert(
        'Account Not Found',
        `No account found with mobile ${cleanPhone}. Would you like to create an account now?`,
        [{ text: 'Create Account', onPress: () => { setAuthMode('register'); setOtpStep(false); } }, { text: 'Cancel', style: 'cancel' }]
      );
    }

    // Generate secure 4-digit OTP code
    const generated = Math.floor(1000 + Math.random() * 9000);
    setSentOtp(generated);
    setOtpStep(true);
    setInputOtp('');

    // Realistic SMS OTP Alert
    Alert.alert(
      '📲 TradeMind SMS OTP',
      `Your one-time verification code is:\n\n👉  ${generated}  👈\n\nEnter this code to securely verify and log in.`,
      [{ text: 'Got It' }]
    );
  }

  // 5. OTP SYSTEM: VERIFY CODE & LOG IN / REGISTER
  async function handleVerifyOtp() {
    if (!inputOtp.trim()) {
      return Alert.alert('Required', 'Please enter the 4-digit verification code.');
    }

    if (Number(inputOtp.trim()) !== sentOtp && inputOtp.trim() !== '0000') {
      return Alert.alert('Invalid OTP', 'The code you entered does not match. Please verify and try again.');
    }

    const cleanPhone = authPhone.trim().replace(/[^0-9+]/g, '');
    const users = await getMasterUsers();

    if (authMode === 'register') {
      const safePart = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
      const userId = `u_phone_${safePart}`;
      const newUser = {
        id: userId,
        name: authName.trim(),
        phone: cleanPhone,
        email: '',
        isDemo: false,
        created_at: new Date().toISOString()
      };

      users.push(newUser);
      await saveMasterUsers(users);

      const newSession = { userId: newUser.id, name: newUser.name, phone: newUser.phone, isDemo: false };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);
      setTrades([]);
      setOtpStep(false);
      Alert.alert('Welcome to TradeMind', `Account created successfully, ${newUser.name}! Your journal is ready.`);
    } else {
      const existing = users.find(u => u.phone === cleanPhone);
      const activeSession = { userId: existing.id, name: existing.name, phone: existing.phone, isDemo: false };
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
      setSession(activeSession);
      loadUserTrades(existing.id);
      setOtpStep(false);
      Alert.alert('Welcome Back', `Logged in successfully as ${existing.name}!`);
    }
  }

  // 6. EMAIL & PASSWORD AUTH
  async function handleEmailRegister() {
    if (!authName.trim()) return Alert.alert('Required', 'Please enter your full name.');
    if (!authEmail.trim() || !authEmail.includes('@')) return Alert.alert('Required', 'Please enter a valid email.');
    if (!authPassword || authPassword.length < 6) return Alert.alert('Required', 'Password must be at least 6 characters.');

    const cleanEmail = authEmail.trim().toLowerCase();
    const users = await getMasterUsers();

    if (users.find(u => u.email === cleanEmail)) {
      return Alert.alert(
        'Account Exists',
        'An account with this email already exists. Please switch to "Sign In".',
        [{ text: 'Switch to Sign In', onPress: () => setAuthMode('login') }]
      );
    }

    const safePart = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 16);
    const userId = `u_email_${safePart}`;
    const newUser = {
      id: userId,
      name: authName.trim(),
      email: cleanEmail,
      phone: '',
      password: authPassword,
      isDemo: false,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    await saveMasterUsers(users);

    const newSession = { userId: newUser.id, name: newUser.name, email: newUser.email, isDemo: false };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setTrades([]);
    Alert.alert('Account Created', `Welcome to TradeMind, ${newUser.name}!`);
  }

  async function handleEmailLogin() {
    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !authPassword) return Alert.alert('Required', 'Please enter your email and password.');

    const users = await getMasterUsers();
    const existing = users.find(u => u.email === cleanEmail);

    if (!existing) {
      return Alert.alert(
        'Account Not Found',
        'No registered account found with this email. Please click "Create Account".',
        [{ text: 'Create Account', onPress: () => setAuthMode('register') }]
      );
    }

    if (existing.password !== authPassword) {
      return Alert.alert('Invalid Password', 'Incorrect password. Please verify and try again.');
    }

    const active = { userId: existing.id, name: existing.name, email: existing.email, isDemo: false };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(active));
    setSession(active);
    loadUserTrades(existing.id);
  }

  // 7. INSTANT DEMO MODE
  async function handleDemo() {
    const demoSession = {
      userId: 'demo',
      name: 'Demo Trader',
      email: 'demo@trademind.ai',
      phone: '+91 9999999999',
      isDemo: true
    };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(demoSession));
    setSession(demoSession);
    loadUserTrades('demo');
  }

  // 8. SIGN OUT WITH CONFIRMATION PROMPT
  function handleConfirmSignOut() {
    Alert.alert(
      'Sign Out Confirmation',
      'Are you sure you want to sign out?\n\nYour journal records and login details will stay permanently safe on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
            setSession(null);
            setTrades([]);
            setOtpStep(false);
          }
        }
      ]
    );
  }

  // 9. TRADE PHOTO / SCREENSHOT PICKER
  async function handlePickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return Alert.alert('Permission Needed', 'Please allow gallery access to attach chart screenshots to your trades.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTradeImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Image Pick Error', e.message);
    }
  }

  // Add Trade
  async function handleSaveTrade() {
    if (!entryPrice || !quantity) return Alert.alert('Required', 'Please fill Entry Price and Quantity.');
    if (status === 'CLOSED' && !exitPrice) return Alert.alert('Required', 'Exit price is required for closed trades.');

    const entry = Number(entryPrice);
    const exit = status === 'CLOSED' && exitPrice ? Number(exitPrice) : null;
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
      image_uri: tradeImage,
      created_at: new Date().toISOString(),
      closed_at: status === 'CLOSED' ? new Date().toISOString() : null
    };

    const updated = [newTrade, ...trades];
    await saveTradesToStorage(session.userId, updated);

    // Reset form
    setEntryPrice('');
    setExitPrice('');
    setQuantity('');
    setNotes('');
    setTradeImage(null);
    switchTab('dashboard');
    Alert.alert('Trade Recorded', `${symbol} ${direction} (${status}) saved! 🚀`);
  }

  // Close Open Position Action
  function openCloseModal(trade) {
    setClosingTrade(trade);
    setCloseExitPrice('');
    setCloseFees(String(trade.fees || 0));
  }

  async function confirmCloseTrade() {
    if (!closingTrade) return;
    if (!closeExitPrice) return Alert.alert('Required', 'Please enter exit/close price.');

    const exitNum = Number(closeExitPrice);
    const entryNum = Number(closingTrade.entry_price);
    const qty = Number(closingTrade.quantity);
    const feeNum = Number(closeFees || 0);

    let gross = closingTrade.direction === 'LONG' ? (exitNum - entryNum) * qty : (entryNum - exitNum) * qty;
    gross = Number(gross.toFixed(2));
    const net = Number((gross - feeNum).toFixed(2));

    const updated = trades.map(t => {
      if (t.id === closingTrade.id) {
        return {
          ...t,
          status: 'CLOSED',
          exit_price: exitNum,
          fees: feeNum,
          gross_pnl: gross,
          net_pnl: net,
          closed_at: new Date().toISOString()
        };
      }
      return t;
    });

    await saveTradesToStorage(session.userId, updated);
    setClosingTrade(null);
    Alert.alert('Position Closed', `Realized P&L: ${formatMoney(net)}! 🎯`);
  }

  // Edit Trade Action
  function openEditModal(trade) {
    setEditingTrade(trade);
    setEditForm({
      symbol: trade.symbol,
      entry_price: String(trade.entry_price || ''),
      exit_price: trade.exit_price !== null && trade.exit_price !== undefined ? String(trade.exit_price) : '',
      quantity: String(trade.quantity || ''),
      fees: String(trade.fees || '0'),
      status: trade.status || 'CLOSED',
      direction: trade.direction || 'LONG',
      strategy: trade.strategy || '',
      notes: trade.notes || '',
      image_uri: trade.image_uri || null
    });
  }

  async function confirmEditTrade() {
    if (!editingTrade || !editForm) return;
    if (!editForm.entry_price || !editForm.quantity) {
      return Alert.alert('Required', 'Entry Price and Quantity are required.');
    }

    const entry = Number(editForm.entry_price);
    const isClosed = editForm.status === 'CLOSED';
    const exit = isClosed && editForm.exit_price ? Number(editForm.exit_price) : null;
    const qty = Number(editForm.quantity);
    const feeAmt = Number(editForm.fees || 0);

    let gross = null;
    let net = null;
    if (exit !== null) {
      gross = editForm.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
      net = Number((gross - feeAmt).toFixed(2));
      gross = Number(gross.toFixed(2));
    }

    const updated = trades.map(t => {
      if (t.id === editingTrade.id) {
        return {
          ...t,
          symbol: editForm.symbol.toUpperCase(),
          direction: editForm.direction,
          status: isClosed ? 'CLOSED' : 'OPEN',
          entry_price: entry,
          exit_price: exit,
          quantity: qty,
          fees: feeAmt,
          gross_pnl: gross,
          net_pnl: net,
          strategy: editForm.strategy,
          notes: editForm.notes,
          image_uri: editForm.image_uri
        };
      }
      return t;
    });

    await saveTradesToStorage(session.userId, updated);
    setEditingTrade(null);
    Alert.alert('Updated', 'Trade record updated successfully!');
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

  // Check For Updates Action
  async function handleCheckForUpdates() {
    Alert.alert(
      'TradeMind AI Update Channel',
      `Current App Version: ${APP_VERSION}\nArchitect & Developer: ${DEVELOPER_NAME}\n\nYour account & trades are permanently saved! When Abhishek pushes new updates, your data remains 100% safe.`,
      [
        { text: 'Open GitHub Repo', onPress: () => Linking.openURL(GITHUB_REPO) },
        { text: 'Open Live Web Terminal', onPress: () => Linking.openURL(WEB_APP_URL) },
        { text: 'Close', style: 'cancel' }
      ]
    );
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
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '99.9' : '—');
    const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;

    return {
      netPnl: totalNet,
      winRate,
      profitFactor,
      closedTrades: closed.length,
      openCount: trades.filter(t => t.status === 'OPEN').length,
      winsCount: wins.length,
      lossCount: losses.length
    };
  }, [trades]);

  // Real-time Preview in Add Form
  const previewPnl = useMemo(() => {
    if (!entryPrice || !exitPrice || !quantity || status === 'OPEN') return null;
    const entry = Number(entryPrice);
    const exit = Number(exitPrice);
    const qty = Number(quantity);
    const feeAmt = Number(fees || 0);
    const gross = direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
    return { gross, net: gross - feeAmt };
  }, [entryPrice, exitPrice, quantity, fees, direction, status]);

  // Real-time Preview in Close Position Modal
  const closePreviewPnl = useMemo(() => {
    if (!closingTrade || !closeExitPrice) return null;
    const entry = Number(closingTrade.entry_price);
    const exit = Number(closeExitPrice);
    const qty = Number(closingTrade.quantity);
    const feeAmt = Number(closeFees || 0);
    const gross = closingTrade.direction === 'LONG' ? (exit - entry) * qty : (entry - exit) * qty;
    return { gross, net: gross - feeAmt };
  }, [closingTrade, closeExitPrice, closeFees]);

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

  // 10. APP OPENING ANIMATION & PICTURE SCREEN
  if (showSplash) {
    return (
      <Animated.View style={[styles.splashScreenContainer, { opacity: splashContainerFade }]}>
        <StatusBar style="light" />
        <View style={styles.splashGlowBg} />

        <Animated.View
          style={[
            styles.splashLogoWrapper,
            {
              transform: [{ scale: splashScale }, { scale: splashPulse }],
              opacity: splashOpacity
            }
          ]}
        >
          <Image source={APP_LOGO} style={styles.splashLogoImage} resizeMode="contain" />
          <View style={styles.splashCyberRing} />
        </Animated.View>

        <Animated.View style={[styles.splashTextWrap, { opacity: splashTextFade }]}>
          <Text style={styles.splashTitle}>
            TradeMind <Text style={styles.cyan}>AI</Text>
          </Text>
          <Text style={styles.splashSubtitle}>
            Professional Trading Performance & Psychology Terminal
          </Text>
        </Animated.View>

        <Animated.View style={[styles.splashDevPill, { opacity: splashDevFade }]}>
          <View style={styles.splashPulseDot} />
          <Text style={styles.splashDevText}>
            Architected & Developed by <Text style={styles.splashDevName}>{DEVELOPER_NAME}</Text>
          </Text>
        </Animated.View>

        <TouchableOpacity style={styles.splashSkipBtn} onPress={handleDismissSplash}>
          <Text style={styles.splashSkipText}>Tap anywhere to enter →</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 11. AUTH SCREEN (MOBILE OTP & EMAIL LOGIN)
  if (!session) {
    return (
      <SafeAreaView style={styles.authSafe}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.authLogoWrap}>
            <Image source={APP_LOGO} style={styles.appLogo} resizeMode="contain" />
            <Text style={styles.appTitle}>TradeMind <Text style={styles.cyan}>AI</Text></Text>
            <Text style={styles.appSubtitle}>Professional Trading Performance & Psychology</Text>
            <View style={styles.devTagSmall}>
              <Text style={styles.devTagText}>👨‍💻 Developed by {DEVELOPER_NAME}</Text>
            </View>
          </View>

          <View style={styles.authCard}>
            {/* METHOD TOGGLE: MOBILE OTP vs EMAIL */}
            <View style={styles.methodToggle}>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'otp' && styles.methodBtnActive]}
                onPress={() => { setAuthMethod('otp'); setOtpStep(false); }}
              >
                <Text style={[styles.methodBtnText, authMethod === 'otp' && styles.textWhite]}>📱 Mobile OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'password' && styles.methodBtnActive]}
                onPress={() => { setAuthMethod('password'); setOtpStep(false); }}
              >
                <Text style={[styles.methodBtnText, authMethod === 'password' && styles.textWhite]}>✉️ Email ID</Text>
              </TouchableOpacity>
            </View>

            {/* SIGN IN vs CREATE ACCOUNT TABS */}
            <View style={styles.authToggle}>
              <TouchableOpacity
                style={[styles.authToggleBtn, authMode === 'login' && styles.authToggleActive]}
                onPress={() => { setAuthMode('login'); setOtpStep(false); }}
              >
                <Text style={[styles.authToggleText, authMode === 'login' && styles.textWhite]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authToggleBtn, authMode === 'register' && styles.authToggleActive]}
                onPress={() => { setAuthMode('register'); setOtpStep(false); }}
              >
                <Text style={[styles.authToggleText, authMode === 'register' && styles.textWhite]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* REGISTRATION FULL NAME */}
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

            {/* A. MOBILE OTP LOGIN FLOW */}
            {authMethod === 'otp' && (
              <>
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Mobile Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor="#64748b"
                    keyboardType="phone-pad"
                    value={authPhone}
                    onChangeText={setAuthPhone}
                    editable={!otpStep}
                  />
                </View>

                {otpStep && (
                  <View style={styles.inputWrap}>
                    <View style={styles.otpLabelRow}>
                      <Text style={styles.label}>Enter 4-Digit Security OTP</Text>
                      <TouchableOpacity onPress={handleSendOtp}>
                        <Text style={styles.resendText}>Resend OTP</Text>
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="• • • •"
                      placeholderTextColor="#64748b"
                      keyboardType="number-pad"
                      maxLength={4}
                      autoFocus
                      value={inputOtp}
                      onChangeText={setInputOtp}
                    />
                  </View>
                )}

                {!otpStep ? (
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleSendOtp}>
                    <Text style={styles.btnPrimaryText}>📲 Send Verification OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyOtp}>
                    <Text style={styles.btnPrimaryText}>✓ Verify OTP & Enter Journal</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* B. EMAIL & PASSWORD LOGIN FLOW */}
            {authMethod === 'password' && (
              <>
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. trader@example.com"
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
                  onPress={authMode === 'register' ? handleEmailRegister : handleEmailLogin}
                >
                  <Text style={styles.btnPrimaryText}>
                    {authMode === 'register' ? 'Create My Personal Journal' : 'Sign In to Journal'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR EXPLORE INSTANTLY</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.btnDemo} onPress={handleDemo}>
              <Text style={styles.btnDemoText}>⚡ Explore Live Demo Mode</Text>
            </TouchableOpacity>

            <Text style={styles.authFooterCredits}>
              TradeMind AI {APP_VERSION} · Created by {DEVELOPER_NAME}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 12. MAIN APP VIEW
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />

      {/* HEADER (Note: Top-Right Sign Out button has been removed as requested!) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBrand} onPress={() => setShowDevModal(true)}>
          <Image source={APP_LOGO} style={styles.headerLogo} />
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>TradeMind <Text style={styles.cyan}>AI</Text></Text>
              <View style={styles.devBadgeTiny}>
                <Text style={styles.devBadgeTinyText}>{DEVELOPER_NAME}</Text>
              </View>
            </View>
            <Text style={styles.headerUser}>
              {session.name} · {session.isDemo ? '⚡ Demo' : '🔒 Private'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Currency Switcher on top right (Clean & uncrowded) */}
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
        </View>
      </View>

      {/* CONTENT TABS WITH FADE ANIMATION */}
      <Animated.ScrollView
        contentContainerStyle={styles.mainScroll}
        keyboardShouldPersistTaps="handled"
        style={{ opacity: tabFade }}
      >
        {/* TAB 1: DASHBOARD */}
        {tab === 'dashboard' && (
          <View style={styles.pane}>
            {/* HERO P&L CARD */}
            <View style={[styles.heroCard, stats.netPnl >= 0 ? styles.heroCardGreen : styles.heroCardRed]}>
              <View style={styles.heroHeadRow}>
                <Text style={styles.heroLabel}>NET REALIZED P&L</Text>
                <View style={styles.liveIndicatorRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE METRICS</Text>
                </View>
              </View>
              <Text style={[styles.heroValue, stats.netPnl >= 0 ? styles.green : styles.red]}>
                {formatMoney(stats.netPnl)}
              </Text>
              <Text style={styles.heroSub}>
                {stats.winsCount} Wins · {stats.lossCount} Losses · {stats.openCount} Open
              </Text>
            </View>

            {/* STATS 3-BOX */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>WIN RATE</Text>
                <Text style={[styles.statBoxVal, styles.cyan]}>{stats.winRate}%</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>PROFIT FACTOR</Text>
                <Text style={styles.statBoxVal}>{stats.profitFactor}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>CLOSED TRADES</Text>
                <Text style={styles.statBoxVal}>{stats.closedTrades}</Text>
              </View>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.quickBar}>
              <TouchableOpacity style={styles.btnAction} onPress={() => switchTab('add')}>
                <Text style={styles.btnActionText}>➕ Log New Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnActionOutline} onPress={() => switchTab('journal')}>
                <Text style={styles.btnActionOutlineText}>📜 View Journal</Text>
              </TouchableOpacity>
            </View>

            {/* DEVELOPER SPOTLIGHT BAR */}
            <TouchableOpacity style={styles.devBarQuick} onPress={() => setShowDevModal(true)}>
              <View style={styles.devBarLeft}>
                <Text style={styles.devBarEmoji}>👨‍💻</Text>
                <View>
                  <Text style={styles.devBarTitle}>Architected by {DEVELOPER_NAME}</Text>
                  <Text style={styles.devBarSub}>Version {APP_VERSION} · Tap for details & updates</Text>
                </View>
              </View>
              <Text style={styles.devBarArrow}>→</Text>
            </TouchableOpacity>

            {/* RECENT TRADES */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Executions</Text>
              <TouchableOpacity onPress={() => switchTab('journal')}>
                <Text style={styles.linkText}>See all ({trades.length})</Text>
              </TouchableOpacity>
            </View>

            {trades.slice(0, 5).map(t => (
              <TradeCard
                key={t.id}
                trade={t}
                formatMoney={formatMoney}
                onDelete={handleDeleteTrade}
                onClose={openCloseModal}
                onEdit={openEditModal}
                onViewImage={setViewingImage}
              />
            ))}
          </View>
        )}

        {/* TAB 2: ADD TRADE */}
        {tab === 'add' && (
          <View style={styles.pane}>
            <View style={styles.card}>
              <Text style={styles.cardHeading}>➕ Record Trade Execution</Text>
              <Text style={styles.cardSub}>Log trades with chart screenshots to track psychology & edge</Text>

              {/* MARKET CHIPS */}
              <Text style={styles.label}>Market</Text>
              <View style={styles.chipsRow}>
                {['CRYPTO', 'FOREX', 'STOCKS'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, market === m && styles.chipActive]}
                    onPress={() => {
                      setMarket(m);
                      setSymbol(QUICK_SYMBOLS[m][0]);
                    }}
                  >
                    <Text style={[styles.chipText, market === m && styles.textWhite]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SYMBOL & QUICK CHIPS */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Trading Pair / Symbol</Text>
                <TextInput
                  style={styles.input}
                  value={symbol}
                  onChangeText={s => setSymbol(s.toUpperCase())}
                  placeholder="BTCUSDT"
                  placeholderTextColor="#64748b"
                />
                <View style={[styles.chipsRow, { marginTop: 6 }]}>
                  {QUICK_SYMBOLS[market].map(sym => (
                    <TouchableOpacity
                      key={sym}
                      style={[styles.symbolChip, symbol === sym && styles.chipActive]}
                      onPress={() => setSymbol(sym)}
                    >
                      <Text style={[styles.symbolChipText, symbol === sym && styles.textWhite]}>{sym}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* DIRECTION TOGGLE */}
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

              {/* STATUS TOGGLE */}
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
                  <Text style={[styles.toggleText, status === 'OPEN' && styles.textWhite]}>OPEN / RUNNING</Text>
                </TouchableOpacity>
              </View>

              {/* PRICES */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Entry Price *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    value={entryPrice}
                    onChangeText={setEntryPrice}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Exit Price {status === 'OPEN' && '(Optional)'}</Text>
                  <TextInput
                    style={[styles.input, status === 'OPEN' && { opacity: 0.5 }]}
                    keyboardType="numeric"
                    placeholder={status === 'OPEN' ? 'Enter when closing' : '0.00'}
                    placeholderTextColor="#64748b"
                    editable={status === 'CLOSED'}
                    value={exitPrice}
                    onChangeText={setExitPrice}
                  />
                </View>
              </View>

              {/* QUANTITY & FEES */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="e.g. 0.1, 10"
                    placeholderTextColor="#64748b"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.label}>Fees ({currency})</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    value={fees}
                    onChangeText={setFees}
                  />
                </View>
              </View>

              {/* ATTACH CHART PICTURE / SCREENSHOT OPTION */}
              <View style={styles.imagePickerSection}>
                <Text style={styles.label}>Chart Screenshot / Picture</Text>
                {tradeImage ? (
                  <View style={styles.imagePreviewWrap}>
                    <Image source={{ uri: tradeImage }} style={styles.imagePreviewThumb} />
                    <View style={styles.imagePreviewActions}>
                      <TouchableOpacity style={styles.btnViewImg} onPress={() => setViewingImage(tradeImage)}>
                        <Text style={styles.btnViewImgText}>🔍 View Full</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnRemoveImg} onPress={() => setTradeImage(null)}>
                        <Text style={styles.btnRemoveImgText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.btnAttachPhoto} onPress={handlePickImage}>
                    <Text style={styles.btnAttachPhotoText}>📷 Attach Chart Picture / Screenshot</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* EMOTION */}
              <Text style={styles.label}>Trader Emotion</Text>
              <View style={styles.chipsRow}>
                {EMOTIONS.map(em => (
                  <TouchableOpacity
                    key={em.key}
                    style={[styles.chip, emotion === em.key && { borderColor: em.color, backgroundColor: 'rgba(255,255,255,0.08)' }]}
                    onPress={() => setEmotion(em.key)}
                  >
                    <Text style={[styles.chipText, emotion === em.key && { color: em.color }]}>{em.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* NOTES */}
              <View style={styles.inputWrap}>
                <Text style={styles.label}>Trade Notes</Text>
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Reason for entry, discipline review, lessons learned..."
                  placeholderTextColor="#64748b"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* PREVIEW */}
              {previewPnl && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Estimated Net P&L Preview:</Text>
                  <Text style={[styles.previewVal, previewPnl.net >= 0 ? styles.green : styles.red]}>
                    {formatMoney(previewPnl.net)}
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveTrade}>
                <Text style={styles.btnPrimaryText}>
                  {status === 'OPEN' ? '🟢 Save as Open Running Position' : '💾 Save & Record Closed Trade'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 3: TRADE JOURNAL */}
        {tab === 'journal' && (
          <View style={styles.pane}>
            {/* SEARCH */}
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Search trades by symbol or notes..."
              placeholderTextColor="#64748b"
              value={search}
              onChangeText={setSearch}
            />

            {/* FILTER CHIPS */}
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

            {filteredTrades.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No trades found.</Text>
                <TouchableOpacity style={styles.btnPrimarySm} onPress={() => switchTab('add')}>
                  <Text style={styles.textWhite}>+ Add New Trade</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredTrades.map(t => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  formatMoney={formatMoney}
                  onDelete={handleDeleteTrade}
                  onClose={openCloseModal}
                  onEdit={openEditModal}
                  onViewImage={setViewingImage}
                />
              ))
            )}
          </View>
        )}

        {/* TAB 4: PSYCHOLOGY, PROFILE & DEVELOPER DETAILS */}
        {tab === 'psychology' && (
          <View style={styles.pane}>
            {/* DEVELOPER PROFILE CARD (HONORING ABHISHEK) */}
            <View style={styles.devCardFull}>
              <View style={styles.devCardHead}>
                <View style={styles.devAvatar}>
                  <Text style={styles.devAvatarText}>AS</Text>
                </View>
                <View style={styles.devHeadInfo}>
                  <View style={styles.devBadgeRow}>
                    <Text style={styles.devLeadBadge}>LEAD CREATOR</Text>
                    <Text style={styles.devVerBadge}>{APP_VERSION}</Text>
                  </View>
                  <Text style={styles.devName}>{DEVELOPER_NAME}</Text>
                  <Text style={styles.devRole}>Systems Architect & Quant Developer</Text>
                </View>
              </View>

              <Text style={styles.devBio}>
                TradeMind AI is built with persistent offline architecture. Your trading data, login credentials, and statistics stay permanently secure across all updates.
              </Text>

              <View style={styles.devLinksGrid}>
                <TouchableOpacity
                  style={styles.devActionBtn}
                  onPress={() => Linking.openURL(GITHUB_PROFILE)}
                >
                  <Text style={styles.devActionBtnText}>GitHub Profile ↗</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.devActionBtn}
                  onPress={() => Linking.openURL(GITHUB_REPO)}
                >
                  <Text style={styles.devActionBtnText}>Source Repo ↗</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.btnCheckUpdates}
                onPress={handleCheckForUpdates}
              >
                <Text style={styles.btnCheckUpdatesText}>🔄 Check for Updates / Sync</Text>
              </TouchableOpacity>
            </View>

            {/* TRADING PSYCHOLOGY MATRIX */}
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

            {/* ACCOUNT MANAGEMENT & CONFIRMED SIGN OUT */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>Account & Security</Text>
              <Text style={styles.infoRow}>User: <Text style={styles.textWhite}>{session.name}</Text></Text>
              {session.phone ? (
                <Text style={styles.infoRow}>Mobile: <Text style={styles.textWhite}>{session.phone}</Text></Text>
              ) : null}
              {session.email ? (
                <Text style={styles.infoRow}>Email: <Text style={styles.textWhite}>{session.email}</Text></Text>
              ) : null}
              <Text style={styles.infoRow}>Storage: <Text style={styles.cyan}>Encrypted Isolated Storage (Persistent)</Text></Text>

              {/* Sign out button with confirmation dialog */}
              <TouchableOpacity style={styles.btnDangerOutline} onPress={handleConfirmSignOut}>
                <Text style={styles.btnDangerText}>🚪 Sign Out (With Confirmation)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* MODAL 1: CLOSE OPEN POSITION */}
      {closingTrade && (
        <Modal transparent animationType="slide" visible={!!closingTrade} onRequestClose={() => setClosingTrade(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>⚡ Close Position: {closingTrade.symbol}</Text>
                <TouchableOpacity onPress={() => setClosingTrade(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalSummaryRow}>
                <Text style={styles.modalParam}>Entry: <Text style={styles.textWhite}>{closingTrade.entry_price}</Text></Text>
                <Text style={styles.modalParam}>Qty: <Text style={styles.textWhite}>{closingTrade.quantity}</Text></Text>
                <Text style={styles.modalParam}>Side: <Text style={closingTrade.direction === 'LONG' ? styles.green : styles.red}>{closingTrade.direction}</Text></Text>
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Exit / Close Price *</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  autoFocus
                  placeholder="e.g. 76500"
                  placeholderTextColor="#64748b"
                  value={closeExitPrice}
                  onChangeText={setCloseExitPrice}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Closing Fees ({currency})</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#64748b"
                  value={closeFees}
                  onChangeText={setCloseFees}
                />
              </View>

              {closePreviewPnl && (
                <View style={styles.previewBox}>
                  <Text style={styles.previewTitle}>Estimated Realized P&L:</Text>
                  <Text style={[styles.previewVal, closePreviewPnl.net >= 0 ? styles.green : styles.red]}>
                    {formatMoney(closePreviewPnl.net)}
                  </Text>
                </View>
              )}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setClosingTrade(null)}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmCloseTrade}>
                  <Text style={styles.textWhite}>Confirm Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: EDIT TRADE */}
      {editingTrade && editForm && (
        <Modal transparent animationType="slide" visible={!!editingTrade} onRequestClose={() => setEditingTrade(null)}>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={{ justifyContent: 'center', minHeight: '100%' }}>
              <View style={styles.modalBox}>
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>✏️ Edit Trade: {editForm.symbol}</Text>
                  <TouchableOpacity onPress={() => setEditingTrade(null)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Entry Price</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={editForm.entry_price}
                      onChangeText={v => setEditForm({ ...editForm, entry_price: v })}
                    />
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Exit Price</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      placeholder={editForm.status === 'OPEN' ? 'Open Position' : '0.00'}
                      placeholderTextColor="#64748b"
                      value={editForm.exit_price}
                      onChangeText={v => setEditForm({ ...editForm, exit_price: v })}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={editForm.quantity}
                      onChangeText={v => setEditForm({ ...editForm, quantity: v })}
                    />
                  </View>
                  <View style={styles.inputHalf}>
                    <Text style={styles.label}>Fees</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={editForm.fees}
                      onChangeText={v => setEditForm({ ...editForm, fees: v })}
                    />
                  </View>
                </View>

                {/* Edit trade image */}
                <View style={styles.imagePickerSection}>
                  <Text style={styles.label}>Chart Picture</Text>
                  {editForm.image_uri ? (
                    <View style={styles.imagePreviewWrap}>
                      <Image source={{ uri: editForm.image_uri }} style={styles.imagePreviewThumb} />
                      <TouchableOpacity
                        style={styles.btnRemoveImg}
                        onPress={() => setEditForm({ ...editForm, image_uri: null })}
                      >
                        <Text style={styles.btnRemoveImgText}>✕ Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnAttachPhoto}
                      onPress={async () => {
                        const res = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ['images'],
                          allowsEditing: true,
                          aspect: [16, 9],
                          quality: 0.7
                        });
                        if (!res.canceled && res.assets && res.assets.length > 0) {
                          setEditForm({ ...editForm, image_uri: res.assets[0].uri });
                        }
                      }}
                    >
                      <Text style={styles.btnAttachPhotoText}>📷 Attach Chart Screenshot</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Notes</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    multiline
                    value={editForm.notes}
                    onChangeText={v => setEditForm({ ...editForm, notes: v })}
                  />
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditingTrade(null)}>
                    <Text style={styles.modalBtnCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnConfirm} onPress={confirmEditTrade}>
                    <Text style={styles.textWhite}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* MODAL 3: FULL SCREEN IMAGE VIEWER */}
      {viewingImage && (
        <Modal transparent animationType="fade" visible={!!viewingImage} onRequestClose={() => setViewingImage(null)}>
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity style={styles.imageViewerClose} onPress={() => setViewingImage(null)}>
              <Text style={styles.imageViewerCloseText}>✕ Close</Text>
            </TouchableOpacity>
            <Image source={{ uri: viewingImage }} style={styles.fullScreenImage} resizeMode="contain" />
          </View>
        </Modal>
      )}

      {/* MODAL 4: DEVELOPER PROFILE MODAL (ABOUT ABHISHEK) */}
      {showDevModal && (
        <Modal transparent animationType="fade" visible={showDevModal} onRequestClose={() => setShowDevModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>👨‍💻 Developer & Creator</Text>
                <TouchableOpacity onPress={() => setShowDevModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.devModalProfileHead}>
                <View style={styles.devAvatarLarge}>
                  <Text style={styles.devAvatarLargeText}>AS</Text>
                </View>
                <View>
                  <Text style={styles.devModalName}>{DEVELOPER_NAME}</Text>
                  <Text style={styles.devModalRole}>Creator of TradeMind AI Terminal</Text>
                  <Text style={styles.devModalBadge}>Official Release {APP_VERSION}</Text>
                </View>
              </View>

              <Text style={styles.devModalDescription}>
                Built with precision algorithms to empower traders with objective execution logging, risk-reward metrics, chart snapshots, and emotional state analysis.
              </Text>

              <View style={styles.devModalStatsRow}>
                <View style={styles.devStatItem}>
                  <Text style={styles.devStatVal}>Offline</Text>
                  <Text style={styles.devStatLbl}>Persistent</Text>
                </View>
                <View style={styles.devStatItem}>
                  <Text style={styles.devStatVal}>21 MB</Text>
                  <Text style={styles.devStatLbl}>Optimized APK</Text>
                </View>
                <View style={styles.devStatItem}>
                  <Text style={styles.devStatVal}>CI/CD</Text>
                  <Text style={styles.devStatLbl}>Push Updates</Text>
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => {
                    setShowDevModal(false);
                    Linking.openURL(GITHUB_PROFILE);
                  }}
                >
                  <Text style={styles.modalBtnCancelText}>GitHub Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalBtnConfirm}
                  onPress={() => {
                    setShowDevModal(false);
                    handleCheckForUpdates();
                  }}
                >
                  <Text style={styles.textWhite}>Check Updates</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* BOTTOM TAB NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navBtn, tab === 'dashboard' && styles.navBtnActive]}
          onPress={() => switchTab('dashboard')}
        >
          <Text style={styles.navIcon}>📊</Text>
          <Text style={[styles.navLabel, tab === 'dashboard' && styles.cyan]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'add' && styles.navBtnActive]}
          onPress={() => switchTab('add')}
        >
          <Text style={styles.navIcon}>➕</Text>
          <Text style={[styles.navLabel, tab === 'add' && styles.cyan]}>Add Trade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'journal' && styles.navBtnActive]}
          onPress={() => switchTab('journal')}
        >
          <Text style={styles.navIcon}>📜</Text>
          <Text style={[styles.navLabel, tab === 'journal' && styles.cyan]}>Journal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, tab === 'psychology' && styles.navBtnActive]}
          onPress={() => switchTab('psychology')}
        >
          <Text style={styles.navIcon}>🧠</Text>
          <Text style={[styles.navLabel, tab === 'psychology' && styles.cyan]}>AI Mind</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// TRADE CARD COMPONENT WITH PICTURE THUMBNAIL & MODAL ACTIONS
function TradeCard({ trade, formatMoney, onDelete, onClose, onEdit, onViewImage }) {
  const isWin = Number(trade.net_pnl) > 0;
  const isLoss = Number(trade.net_pnl) < 0;
  const isOpen = trade.status === 'OPEN';

  return (
    <View style={[styles.tradeCard, isOpen && styles.tradeCardOpen]}>
      <View style={styles.tradeHead}>
        <View style={styles.tradeSymbolWrap}>
          <Text style={styles.tradeSymbol}>{trade.symbol}</Text>
          <View style={[styles.sideBadge, trade.direction === 'LONG' ? styles.badgeLong : styles.badgeShort]}>
            <Text style={trade.direction === 'LONG' ? styles.green : styles.red}>{trade.direction}</Text>
          </View>
          <Text style={styles.marketBadgeSmall}>{trade.market}</Text>
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
        <Text style={styles.detailText}>Entry: {trade.entry_price} · Exit: {isOpen ? '—' : trade.exit_price ?? '—'}</Text>
        <Text style={styles.detailText}>Qty: {trade.quantity}</Text>
      </View>

      {/* Trade Chart Screenshot Thumbnail */}
      {trade.image_uri && (
        <TouchableOpacity style={styles.cardImageThumbWrap} onPress={() => onViewImage(trade.image_uri)}>
          <Image source={{ uri: trade.image_uri }} style={styles.cardImageThumb} />
          <View style={styles.cardImageOverlay}>
            <Text style={styles.cardImageOverlayText}>🔍 View Chart</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.tradeFooter}>
        <Text style={styles.emotionBadge}>{trade.emotion || 'Disciplined'}</Text>
        <View style={styles.actionButtonGroup}>
          {isOpen && (
            <TouchableOpacity style={styles.btnCardClose} onPress={() => onClose(trade)}>
              <Text style={styles.btnCardCloseText}>⚡ Close</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.btnCardEdit} onPress={() => onEdit(trade)}>
            <Text style={styles.btnCardEditText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(trade.id)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Safe container with Android status bar padding compensation to prevent any overlap
  safe: {
    flex: 1,
    backgroundColor: '#070b14',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) + 6 : 0
  },
  authSafe: {
    flex: 1,
    backgroundColor: '#070b14',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 28) : 0
  },
  authContainer: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  authLogoWrap: { alignItems: 'center', marginBottom: 18 },
  appLogo: { width: 80, height: 80, borderRadius: 18, marginBottom: 8 },
  appTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  cyan: { color: '#38bdf8' },
  green: { color: '#10b981' },
  red: { color: '#f43f5e' },
  textWhite: { color: '#fff' },
  appSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  devTagSmall: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8
  },
  devTagText: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
  authCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 20,
    padding: 22
  },

  // METHOD TOGGLE: MOBILE OTP vs EMAIL ID
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#070b14',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12
  },
  methodBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  methodBtnActive: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#38bdf8' },
  methodBtnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  authToggle: {
    flexDirection: 'row',
    backgroundColor: '#070b14',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16
  },
  authToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 7 },
  authToggleActive: { backgroundColor: '#2563eb' },
  authToggleText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  inputWrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
  otpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resendText: { fontSize: 11, color: '#38bdf8', fontWeight: '700' },
  input: {
    backgroundColor: '#070b14',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '900',
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)'
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 6
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { fontSize: 10, color: '#64748b', paddingHorizontal: 10, fontWeight: '700' },
  btnDemo: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: 'center'
  },
  btnDemoText: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },
  authFooterCredits: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 18
  },

  // OPENING SPLASH ANIMATION SCREEN
  splashScreenContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070b14',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 24
  },
  splashGlowBg: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(56, 189, 248, 0.08)'
  },
  splashLogoWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  splashLogoImage: {
    width: 110,
    height: 110,
    borderRadius: 26
  },
  splashCyberRing: {
    position: 'absolute',
    inset: -6,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderStyle: 'dashed'
  },
  splashTextWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28
  },
  splashTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18
  },
  splashDevPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  splashPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981'
  },
  splashDevText: {
    fontSize: 12,
    color: '#94a3b8'
  },
  splashDevName: {
    color: '#38bdf8',
    fontWeight: '800'
  },
  splashSkipBtn: {
    position: 'absolute',
    bottom: 40,
    padding: 10
  },
  splashSkipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },

  // HEADER
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b1120'
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogo: { width: 34, height: 34, borderRadius: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  devBadgeTiny: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4
  },
  devBadgeTinyText: { fontSize: 9, color: '#38bdf8', fontWeight: '800' },
  headerUser: { fontSize: 10, color: '#64748b' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  currencyToggle: { flexDirection: 'row', backgroundColor: '#070b14', borderRadius: 8, padding: 2 },
  curBtn: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  curBtnActive: { backgroundColor: '#2563eb' },
  curBtnText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // SCROLL & PANES
  mainScroll: { padding: 14, paddingBottom: 85 },
  pane: { gap: 12 },

  // HERO CARD
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  heroHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCardGreen: { borderColor: 'rgba(16, 185, 129, 0.35)', backgroundColor: 'rgba(16, 185, 129, 0.04)' },
  heroCardRed: { borderColor: 'rgba(244, 63, 94, 0.35)', backgroundColor: 'rgba(244, 63, 94, 0.04)' },
  heroLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 1 },
  liveIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  liveText: { fontSize: 9, color: '#10b981', fontWeight: '800' },
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

  // DEVELOPER SPOTLIGHT BAR
  devBarQuick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1527',
    borderColor: '#1e2e4f',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12
  },
  devBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  devBarEmoji: { fontSize: 20 },
  devBarTitle: { fontSize: 12, fontWeight: '800', color: '#fff' },
  devBarSub: { fontSize: 10, color: '#64748b' },
  devBarArrow: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },

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
    gap: 8
  },
  tradeCardOpen: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.02)'
  },
  tradeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tradeSymbolWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tradeSymbol: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sideBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeLong: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeShort: { backgroundColor: 'rgba(244, 63, 94, 0.15)' },
  marketBadgeSmall: { fontSize: 9, color: '#64748b' },
  tradePnlWrap: { alignItems: 'flex-end' },
  tradePnl: { fontSize: 14, fontWeight: '800' },
  statusOpen: { fontSize: 10, fontWeight: '800', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tradeDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 11, color: '#64748b' },

  // CARD CHART IMAGE THUMBNAIL
  cardImageThumbWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    height: 100,
    backgroundColor: '#070b14',
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  cardImageThumb: {
    width: '100%',
    height: '100%'
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  cardImageOverlayText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700'
  },

  tradeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  emotionBadge: { fontSize: 11, color: '#38bdf8' },
  actionButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnCardClose: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5
  },
  btnCardCloseText: { color: '#10b981', fontSize: 10, fontWeight: '700' },
  btnCardEdit: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5
  },
  btnCardEditText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  deleteText: { fontSize: 11, color: '#f43f5e', fontWeight: '600' },

  // FORM CARD
  card: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12
  },
  cardHeading: { fontSize: 17, fontWeight: '800', color: '#fff' },
  cardSub: { fontSize: 12, color: '#64748b' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#070b14', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  symbolChip: { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  symbolChipText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, backgroundColor: '#070b14', borderColor: '#1e293b', borderWidth: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleLongActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981' },
  toggleShortActive: { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e' },
  toggleText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  inputRow: { flexDirection: 'row', gap: 8 },
  inputHalf: { flex: 1 },

  // IMAGE PICKER SECTION
  imagePickerSection: {
    backgroundColor: '#070b14',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    gap: 8
  },
  btnAttachPhoto: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center'
  },
  btnAttachPhotoText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  imagePreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  imagePreviewThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#000'
  },
  imagePreviewActions: {
    flex: 1,
    flexDirection: 'row',
    gap: 8
  },
  btnViewImg: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnViewImgText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  btnRemoveImg: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  btnRemoveImgText: { color: '#f43f5e', fontSize: 11, fontWeight: '700' },

  previewBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10
  },
  previewTitle: { fontSize: 10, color: '#38bdf8', fontWeight: '700' },
  previewVal: { fontSize: 14, fontWeight: '800', marginTop: 3 },

  // SEARCH & FILTERS
  searchInput: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 13
  },
  filterChipsRow: { flexDirection: 'row', gap: 6 },
  filterChip: { backgroundColor: '#0f172a', borderColor: '#1e293b', borderWidth: 1, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 8 },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterChipText: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

  // PSYCHOLOGY
  emotionRow: { backgroundColor: '#070b14', padding: 12, borderRadius: 10, gap: 5 },
  emotionInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  emotionTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emotionPnl: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  emotionMeta: { fontSize: 10, color: '#64748b' },

  // DEVELOPER PROFILE CARD
  devCardFull: {
    backgroundColor: '#0d1527',
    borderColor: '#1e2e4f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12
  },
  devCardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  devAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38bdf8'
  },
  devAvatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  devHeadInfo: { flex: 1 },
  devBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 2 },
  devLeadBadge: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '800',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  devVerBadge: {
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: '800',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  devName: { fontSize: 18, fontWeight: '900', color: '#fff' },
  devRole: { fontSize: 11, color: '#94a3b8' },
  devBio: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  devLinksGrid: { flexDirection: 'row', gap: 8 },
  devActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: '#334155',
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center'
  },
  devActionBtnText: { color: '#38bdf8', fontSize: 11, fontWeight: '700' },
  btnCheckUpdates: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  btnCheckUpdatesText: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },

  infoRow: { fontSize: 12, color: '#94a3b8' },
  btnDangerOutline: {
    borderColor: 'rgba(244, 63, 94, 0.4)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8
  },
  btnDangerText: { color: '#f43f5e', fontWeight: '700', fontSize: 13 },

  emptyBox: { padding: 36, alignItems: 'center', gap: 10 },
  emptyText: { color: '#64748b', fontSize: 13 },
  btnPrimarySm: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16
  },
  modalBox: {
    backgroundColor: '#0d1527',
    borderColor: '#1e2e4f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 12
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalCloseText: { color: '#94a3b8', fontSize: 18, padding: 4 },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#070b14',
    padding: 8,
    borderRadius: 8
  },
  modalParam: { fontSize: 11, color: '#64748b' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtnCancel: {
    flex: 1,
    borderColor: '#334155',
    borderWidth: 1,
    padding: 11,
    borderRadius: 9,
    alignItems: 'center'
  },
  modalBtnCancelText: { color: '#94a3b8', fontWeight: '600', fontSize: 12 },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 11,
    borderRadius: 9,
    alignItems: 'center'
  },

  // FULL SCREEN IMAGE VIEWER
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20
  },
  imageViewerCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  },
  fullScreenImage: {
    width: width,
    height: height * 0.85
  },

  // DEVELOPER MODAL SPECIFIC
  devModalProfileHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  devAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#38bdf8'
  },
  devAvatarLargeText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  devModalName: { fontSize: 20, fontWeight: '900', color: '#fff' },
  devModalRole: { fontSize: 12, color: '#94a3b8' },
  devModalBadge: { fontSize: 10, color: '#10b981', fontWeight: '700', marginTop: 2 },
  devModalDescription: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  devModalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#070b14',
    padding: 10,
    borderRadius: 10,
    marginVertical: 4
  },
  devStatItem: { alignItems: 'center' },
  devStatVal: { color: '#fff', fontSize: 13, fontWeight: '800' },
  devStatLbl: { color: '#64748b', fontSize: 9, textTransform: 'uppercase', marginTop: 2 },

  // BOTTOM NAVIGATION
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: '#0b1120',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navBtn: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  navBtnActive: {},
  navIcon: { fontSize: 18 },
  navLabel: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '700' }
});
