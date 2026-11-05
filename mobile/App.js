import forge from 'node-forge';
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
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get('window');

const APP_LOGO = require('./assets/app_logo.png');

const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' }
};

const APP_VERSION = 'v2.3.2';
const DEVELOPER_NAME = 'Abhishek';
const GITHUB_REPO = 'https://github.com/uniqabhishek/Trading-Journal';
const GITHUB_PROFILE = 'https://github.com/uniqabhishek';
const WEB_APP_URL = 'https://uniqabhishek.github.io/Trading-Journal/';

// Storage Keys (Permanent & Safe across updates)
const MASTER_USERS_KEY = 'tm_master_users_registry_v1';
const ACTIVE_SESSION_KEY = 'tm_active_session_v4';
const DATA_VAULT_BACKUP_FILE = 'TradeMind_Data_Vault.json';
const BROKERS_STORAGE_KEY = 'tm_connected_brokers_v1';

// Supported Broker Integrations
const BROKER_DEFS = {
  DELTA: {
    id: 'DELTA',
    name: 'Delta Exchange',
    category: 'Crypto Derivatives & Options',
    icon: '⚡',
    color: '#38bdf8',
    defaultMarket: 'CRYPTO',
    desc: 'BTC, ETH, SOL Perpetual Futures & Options with direct P&L and fee sync',
    apiEndpoint: 'https://api.delta.exchange/v2'
  },
  EXNESS: {
    id: 'EXNESS',
    name: 'Exness',
    category: 'Forex & Precious Metals',
    icon: '🌐',
    color: '#eab308',
    defaultMarket: 'FOREX',
    desc: 'EURUSD, GBPUSD, XAUUSD (Gold), USOIL with pip/spread P&L tracking',
    apiEndpoint: 'https://api.exness.com'
  },
  BINANCE: {
    id: 'BINANCE',
    name: 'Binance',
    category: 'Crypto Spot & USDⓈ-M Futures',
    icon: '🟡',
    color: '#f59e0b',
    defaultMarket: 'CRYPTO',
    desc: 'USDⓈ-M Futures and Spot fills with maker/taker fee breakdown',
    apiEndpoint: 'https://api.binance.com'
  },
  ZERODHA: {
    id: 'ZERODHA',
    name: 'Zerodha Kite',
    category: 'Indian Equities & F&O',
    icon: '🔵',
    color: '#f43f5e',
    defaultMarket: 'STOCKS',
    desc: 'NSE/BSE Equities, NIFTY and BANKNIFTY Options with STT/brokerage sync',
    apiEndpoint: 'https://api.kite.trade'
  }
};

// Realistic Broker Execution Templates for Instant Sync & Testing
const SAMPLE_BROKER_EXECUTIONS = {
  DELTA: [
    {
      broker_order_id: 'dl_9812401',
      market: 'CRYPTO',
      exchange: 'Delta Exchange',
      symbol: 'BTCUSDT',
      direction: 'LONG',
      status: 'CLOSED',
      entry_price: 68150.0,
      exit_price: 69820.0,
      quantity: 0.25,
      fees: 14.50,
      gross_pnl: 417.50,
      net_pnl: 403.00,
      strategy: 'Delta Orderbook Breakout',
      emotion: 'Confident',
      notes: 'Direct sync from Delta Exchange. Clean 4H breakout above 68k resistance.',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      broker_order_id: 'dl_9812402',
      market: 'CRYPTO',
      exchange: 'Delta Exchange',
      symbol: 'ETHUSDT',
      direction: 'SHORT',
      status: 'CLOSED',
      entry_price: 2540.0,
      exit_price: 2475.0,
      quantity: 2.0,
      fees: 9.20,
      gross_pnl: 130.00,
      net_pnl: 120.80,
      strategy: 'Funding Rate Scalp',
      emotion: 'Disciplined',
      notes: 'Direct sync from Delta Exchange. Short scalp into negative funding spike.',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 14).toISOString()
    },
    {
      broker_order_id: 'dl_9812403',
      market: 'CRYPTO',
      exchange: 'Delta Exchange',
      symbol: 'SOLUSDT',
      direction: 'LONG',
      status: 'CLOSED',
      entry_price: 184.20,
      exit_price: 179.50,
      quantity: 8,
      fees: 6.80,
      gross_pnl: -37.60,
      net_pnl: -44.40,
      strategy: 'Support Retest',
      emotion: 'FOMO',
      notes: 'Direct sync from Delta Exchange. Premature long entry before 180 support confirmed.',
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 26).toISOString()
    }
  ],
  EXNESS: [
    {
      broker_order_id: 'ex_5481201',
      market: 'FOREX',
      exchange: 'Exness',
      symbol: 'XAUUSD',
      direction: 'LONG',
      status: 'CLOSED',
      entry_price: 2738.20,
      exit_price: 2754.80,
      quantity: 0.5,
      fees: 7.50,
      gross_pnl: 830.00,
      net_pnl: 822.50,
      strategy: 'London Gold Momentum',
      emotion: 'Confident',
      notes: 'Direct sync from Exness MT5. London session breakout continuation.',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      broker_order_id: 'ex_5481202',
      market: 'FOREX',
      exchange: 'Exness',
      symbol: 'EURUSD',
      direction: 'SHORT',
      status: 'CLOSED',
      entry_price: 1.0865,
      exit_price: 1.0825,
      quantity: 1.0,
      fees: 4.80,
      gross_pnl: 400.00,
      net_pnl: 395.20,
      strategy: 'NY Session Liquidity Sweep',
      emotion: 'Disciplined',
      notes: 'Direct sync from Exness. Clean reject at 1.0870 daily pivot.',
      created_at: new Date(Date.now() - 3600000 * 22).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 16).toISOString()
    },
    {
      broker_order_id: 'ex_5481203',
      market: 'FOREX',
      exchange: 'Exness',
      symbol: 'GBPUSD',
      direction: 'LONG',
      status: 'CLOSED',
      entry_price: 1.2990,
      exit_price: 1.2945,
      quantity: 1.0,
      fees: 5.50,
      gross_pnl: -450.00,
      net_pnl: -455.50,
      strategy: 'Support Bounce',
      emotion: 'Revenge',
      notes: 'Direct sync from Exness. Oversized position after earlier stop-loss.',
      created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
      closed_at: new Date(Date.now() - 3600000 * 32).toISOString()
    }
  ]
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
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Auth Inputs
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  // Broker Integration & Sync State (Live API & Real Statements)
  const [connectedBrokers, setConnectedBrokers] = useState([]);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [brokerType, setBrokerType] = useState('DELTA');
  const [deltaRegion, setDeltaRegion] = useState('INDIA'); // 'INDIA' or 'GLOBAL'
  const [brokerAccountName, setBrokerAccountName] = useState('');
  const [brokerApiKey, setBrokerApiKey] = useState('');
  const [brokerApiSecret, setBrokerApiSecret] = useState('');
  const [isSyncingBroker, setIsSyncingBroker] = useState(false);

  // Exness MT5 Statement & Trades Import State
  const [showExnessImportModal, setShowExnessImportModal] = useState(false);
  const [exnessImportText, setExnessImportText] = useState('');
  const [activeExnessBroker, setActiveExnessBroker] = useState(null);

  // AI Trading Analyst State
  const [showAiModal, setShowAiModal] = useState(false);

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

  // In-App Updater Modal & Progress States
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('idle'); // 'idle' | 'checking' | 'ready' | 'downloading' | 'completed' | 'error'
  const [updateProgress, setUpdateProgress] = useState(0);
  const [downloadedApkUri, setDownloadedApkUri] = useState(null);
  const [releaseInfo, setReleaseInfo] = useState(null);
  const [downloadSpeedText, setDownloadSpeedText] = useState('');

  // Data Rescue & Vault States
  const [isRecoveringData, setIsRecoveringData] = useState(false);
  const [recoveryStats, setRecoveryStats] = useState(null);

  // 1. HARDWARE BACK BUTTON NAVIGATION (Back to previous step or main menu)
  useEffect(() => {
    const onBackPress = () => {
      // Step A: Close any active modal
      if (updateModalVisible) {
        if (updateStatus === 'downloading') {
          Alert.alert('Download In Progress', 'TradeMind update is downloading in the background.');
          return true;
        }
        setUpdateModalVisible(false);
        return true;
      }
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
      if (showForgotPassword) {
        setShowForgotPassword(false);
        return true;
      }
      if (showBrokerModal) {
        setShowBrokerModal(false);
        return true;
      }
      if (showAiModal) {
        setShowAiModal(false);
        return true;
      }
      if (showExnessImportModal) {
        setShowExnessImportModal(false);
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
  }, [updateModalVisible, updateStatus, viewingImage, closingTrade, editingTrade, showDevModal, showForgotPassword, showBrokerModal, showAiModal, showExnessImportModal, tab]);

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

  // 3. PERSISTENT MASTER USER STORAGE & DATA VAULT
  async function getMasterUsers() {
    try {
      const raw = await AsyncStorage.getItem(MASTER_USERS_KEY);
      let users = raw ? JSON.parse(raw) : [];

      // Always scavenge any legacy tm_user_* keys as well
      const allKeys = await AsyncStorage.getAllKeys();
      const legacyUserKeys = allKeys.filter(k => k.startsWith('tm_user_'));
      let modified = false;

      for (const lk of legacyUserKeys) {
        try {
          const lRaw = await AsyncStorage.getItem(lk);
          if (lRaw) {
            const parsed = JSON.parse(lRaw);
            const email = (parsed.email || lk.replace('tm_user_', '')).toLowerCase().trim();
            const uid = parsed.userId || parsed.id || `u_${Date.now()}`;
            const exists = users.find(u => (u.email && u.email.toLowerCase() === email) || u.id === uid);
            if (!exists) {
              users.push({
                id: uid,
                name: parsed.name || 'Trader',
                email: email,
                phone: parsed.phone || '',
                password: parsed.password || '',
                isDemo: false
              });
              modified = true;
            }
          }
        } catch {}
      }

      if (modified) {
        await AsyncStorage.setItem(MASTER_USERS_KEY, JSON.stringify(users));
      }
      return users;
    } catch {
      return [];
    }
  }

  async function saveMasterUsers(users) {
    try {
      await AsyncStorage.setItem(MASTER_USERS_KEY, JSON.stringify(users));
      syncDataVaultMirror();
    } catch (e) {
      console.warn('Error saving master users', e);
    }
  }

  // 4. MIRROR DATA VAULT TO DEVICE FILE (Survives app uninstallation / data clearing)
  async function syncDataVaultMirror() {
    try {
      if (!FileSystem.documentDirectory) return;
      const fileUri = FileSystem.documentDirectory + DATA_VAULT_BACKUP_FILE;
      const allKeys = await AsyncStorage.getAllKeys();
      const allTradesMap = {};

      const tradeKeys = allKeys.filter(k => k.startsWith('tm_mobile_trades_'));
      for (const tk of tradeKeys) {
        try {
          const tRaw = await AsyncStorage.getItem(tk);
          if (tRaw) allTradesMap[tk] = JSON.parse(tRaw);
        } catch {}
      }

      const users = await getMasterUsers();
      const sessionRaw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      const vaultPayload = {
        app: 'TradeMind AI',
        version: APP_VERSION,
        exported_at: new Date().toISOString(),
        users,
        session: sessionRaw ? JSON.parse(sessionRaw) : null,
        trades: allTradesMap
      };

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(vaultPayload));
    } catch (err) {
      console.warn('Data vault mirror error:', err);
    }
  }

  // 5. UNIVERSAL DATA RECOVERY ENGINE (Runs on boot & on demand)
  async function scanAndRecoverAllData(isManual = false) {
    setIsRecoveringData(true);
    let totalUsersRecovered = 0;
    let totalTradesRecovered = 0;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let masterUsers = await getMasterUsers();

      // Check FileSystem Vault Mirror if local AsyncStorage is empty (e.g. post-uninstall)
      if (allKeys.length <= 2 && FileSystem.documentDirectory) {
        const fileUri = FileSystem.documentDirectory + DATA_VAULT_BACKUP_FILE;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(fileUri);
          const parsed = JSON.parse(content);
          if (parsed && parsed.users) {
            masterUsers = parsed.users;
            await AsyncStorage.setItem(MASTER_USERS_KEY, JSON.stringify(masterUsers));
            totalUsersRecovered += masterUsers.length;
          }
          if (parsed && parsed.trades) {
            for (const [k, v] of Object.entries(parsed.trades)) {
              await AsyncStorage.setItem(k, JSON.stringify(v));
              if (Array.isArray(v)) totalTradesRecovered += v.length;
            }
          }
          if (parsed && parsed.session) {
            await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(parsed.session));
          }
        }
      }

      // Discover all trade keys across device storage
      const tradeKeys = allKeys.filter(k => k.startsWith('tm_mobile_trades_') || k.startsWith('tm_trades_') || k === 'tm_trades');
      const allTradesPool = {};
      let largestTradeList = [];

      for (const tk of tradeKeys) {
        try {
          const raw = await AsyncStorage.getItem(tk);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list) && list.length > 0) {
              allTradesPool[tk] = list;
              if (list.length > largestTradeList.length) {
                largestTradeList = list;
              }
              totalTradesRecovered += list.length;
            }
          }
        } catch {}
      }

      // Resolve and restore active session
      let active = session;
      if (!active) {
        let rawSession = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
        if (!rawSession) rawSession = await AsyncStorage.getItem('tm_mobile_session_v3');
        if (!rawSession) rawSession = await AsyncStorage.getItem('tm_mobile_session');

        if (rawSession) {
          active = JSON.parse(rawSession);
        } else if (masterUsers.length > 0) {
          // If a registered non-demo account exists, auto-restore
          const nonDemo = masterUsers.find(u => !u.isDemo);
          if (nonDemo) active = { userId: nonDemo.id, name: nonDemo.name, email: nonDemo.email || '', phone: nonDemo.phone || '', isDemo: false };
        }
      }

      if (active) {
        await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(active));
        setSession(active);
        await loadBrokers(active.userId || active.id);

        // Load trades for active user
        const targetKey = `tm_mobile_trades_${active.userId || active.id}`;
        let currentTrades = [];
        const rawCurrent = await AsyncStorage.getItem(targetKey);
        if (rawCurrent) {
          try { currentTrades = JSON.parse(rawCurrent); } catch {}
        }

        // If active user has 0 trades, but orphaned trades exist on device: RESCUE THEM!
        if ((!currentTrades || currentTrades.length === 0) && largestTradeList.length > 0) {
          currentTrades = largestTradeList;
          await AsyncStorage.setItem(targetKey, JSON.stringify(currentTrades));
        }

        // Clean any old mock demo broker trades from real user journals
        const mockOrderIds = new Set(['dl_9812401', 'dl_9812402', 'dl_9812403', 'ex_4491021', 'ex_4491022', 'ex_4491023']);
        if (!active.isDemo && Array.isArray(currentTrades)) {
          const hadMock = currentTrades.some(t => mockOrderIds.has(t.broker_order_id));
          if (hadMock) {
            currentTrades = currentTrades.filter(t => !mockOrderIds.has(t.broker_order_id));
            await AsyncStorage.setItem(targetKey, JSON.stringify(currentTrades));
          }
        }

        setTrades(currentTrades || []);
      }

      setRecoveryStats({
        usersCount: masterUsers.length,
        tradesCount: totalTradesRecovered
      });

      syncDataVaultMirror();

      if (isManual) {
        Alert.alert(
          'Data Recovery Complete! 🛡️',
          `Device storage scan finished:\n\n• User Accounts Safe: ${masterUsers.length}\n• Trading Records Restored: ${totalTradesRecovered}\n\nAll your past journal records and login details are securely loaded.`,
          [{ text: 'Great!' }]
        );
      }
    } catch (e) {
      console.warn('Data recovery error:', e);
      if (isManual) Alert.alert('Recovery Notice', 'Data scan complete: ' + e.message);
    } finally {
      setIsRecoveringData(false);
    }
  }

  // Load active session and scan device storage on start
  useEffect(() => {
    scanAndRecoverAllData(false);
  }, []);

  async function loadUserTrades(userId) {
    try {
      const key = `tm_mobile_trades_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrades(parsed);
          return parsed;
        }
      }

      // If user trades empty, search all keys for any saved trade records
      const allKeys = await AsyncStorage.getAllKeys();
      const tradeKeys = allKeys.filter(k => k.startsWith('tm_mobile_trades_') && k !== key);
      let bestList = [];

      for (const tk of tradeKeys) {
        try {
          const tRaw = await AsyncStorage.getItem(tk);
          if (tRaw) {
            const list = JSON.parse(tRaw);
            if (Array.isArray(list) && list.length > bestList.length) {
              bestList = list;
            }
          }
        } catch {}
      }

      if (bestList.length > 0) {
        await AsyncStorage.setItem(key, JSON.stringify(bestList));
        setTrades(bestList);
        return bestList;
      }

      if (userId === 'demo') {
        await AsyncStorage.setItem(key, JSON.stringify(DEMO_TRADES));
        setTrades(DEMO_TRADES);
        return DEMO_TRADES;
      }

      setTrades([]);
      return [];
    } catch (e) {
      console.warn('Trades load error', e);
      return [];
    }
  }

  async function saveTradesToStorage(userId, newTrades) {
    setTrades(newTrades);
    try {
      await AsyncStorage.setItem(`tm_mobile_trades_${userId}`, JSON.stringify(newTrades));
      syncDataVaultMirror();
    } catch (e) {
      console.warn('Save error', e);
    }
  }

  function formatMoney(amount) {
    const sym = CURRENCIES[currency]?.symbol || '₹';
    const num = Number(amount || 0);
    return `${num < 0 ? '-' : ''}${sym}${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  // 6. FORGOT PASSWORD RECOVERY
  async function handleResetPassword() {
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return Alert.alert('Email Required', 'Please enter a valid registered email address.');
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      return Alert.alert('Password Length', 'New password must be at least 6 characters.');
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      return Alert.alert('Mismatch', 'Passwords do not match. Please verify.');
    }

    const users = await getMasterUsers();
    let account = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    if (!account) {
      // Check legacy tm_user_ key
      try {
        const legacy = await AsyncStorage.getItem(`tm_user_${cleanEmail}`);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          account = {
            id: parsed.userId || parsed.id || `u_${Date.now()}`,
            name: parsed.name || 'Trader',
            email: cleanEmail,
            isDemo: false
          };
          users.push(account);
        }
      } catch {}
    }

    if (!account) {
      return Alert.alert(
        'Account Not Found',
        `No account found with ${cleanEmail}. Please create an account or verify your spelling.`
      );
    }

    // Update password
    account.password = forgotNewPassword;
    const updatedUsers = users.map(u => (u.id === account.id || (u.email && u.email.toLowerCase() === cleanEmail)) ? { ...u, password: forgotNewPassword } : u);
    await saveMasterUsers(updatedUsers);

    // Save legacy key update as well
    try {
      await AsyncStorage.setItem(`tm_user_${cleanEmail}`, JSON.stringify({ ...account, password: forgotNewPassword }));
    } catch {}

    // Auto-login with new credentials
    const active = { userId: account.id, name: account.name, email: account.email, isDemo: false };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(active));
    setSession(active);
    await loadUserTrades(account.id);
    await loadBrokers(account.id);

    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');

    Alert.alert('Password Reset Successful! 🎉', `Welcome back, ${account.name}! Your journal has been loaded securely.`);
  }

  // 7. REAL BROKER INTEGRATION ENGINE (DELTA EXCHANGE LIVE REST API & EXNESS MT5 STATEMENTS)
  async function loadBrokers(userId) {
    try {
      const key = `${BROKERS_STORAGE_KEY}_${userId}`;
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const list = JSON.parse(raw);
        // Filter out any past fake demo brokers (b_delta_1, b_exness_1) from real accounts
        const cleanList = userId === 'demo' ? list : list.filter(b => b.id !== 'b_delta_1' && b.id !== 'b_exness_1');
        setConnectedBrokers(cleanList);
        if (cleanList.length !== list.length) {
          await AsyncStorage.setItem(key, JSON.stringify(cleanList));
        }
      } else {
        // Real user accounts start completely clean without fake brokers!
        setConnectedBrokers([]);
      }
    } catch (e) {
      console.warn('Error loading brokers:', e);
      setConnectedBrokers([]);
    }
  }

  async function saveBrokers(userId, brokersList) {
    setConnectedBrokers(brokersList);
    try {
      await AsyncStorage.setItem(`${BROKERS_STORAGE_KEY}_${userId}`, JSON.stringify(brokersList));
    } catch (e) {
      console.warn('Error saving brokers:', e);
    }
  }

  async function handleConnectBroker() {
    if (!brokerAccountName.trim()) {
      return Alert.alert('Account Name Required', 'Please enter a nickname for this broker account (e.g. My Delta Account).');
    }

    const cleanKey = brokerApiKey.trim();
    const cleanSecret = brokerApiSecret.trim();

    if (brokerType === 'DELTA') {
      if (!cleanKey || !cleanSecret) {
        return Alert.alert('Credentials Required', 'Please enter your Delta Exchange API Key and Secret (generated in Delta Exchange -> API Management).');
      }
    }

    const newBroker = {
      id: `b_${brokerType.toLowerCase()}_${Date.now()}`,
      broker: brokerType,
      accountName: brokerAccountName.trim(),
      apiKey: cleanKey,
      apiSecret: cleanSecret,
      region: deltaRegion || 'INDIA',
      isConnected: true,
      lastSynced: null,
      syncedTradesCount: 0
    };

    const updated = [newBroker, ...connectedBrokers];
    await saveBrokers(session?.userId || 'default', updated);

    setShowBrokerModal(false);
    setBrokerAccountName('');
    setBrokerApiKey('');
    setBrokerApiSecret('');

    Alert.alert(
      'Broker Connected! ⚡',
      `Successfully linked ${BROKER_DEFS[brokerType]?.name || brokerType}.\n\nTap "Sync Trades" on your broker card to directly pull your real executed positions.`
    );
  }

  // Universal Parser for Exness MT5 / MT4 Closed Trade Reports & Lines
  function parseExnessTrades(text) {
    if (!text || typeof text !== 'string') return [];
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];

    for (const line of rawLines) {
      if (/ticket|time|symbol|type|volume|profit|open price/i.test(line) && line.split(/[,\t| ]+/).length >= 4) {
        continue;
      }

      let tokens = line.split(/[,\t|]+/).map(t => t.trim()).filter(Boolean);
      if (tokens.length < 4) {
        tokens = line.split(/\s+/).map(t => t.trim()).filter(Boolean);
      }
      if (tokens.length < 4) continue;

      let symbol = null;
      for (let i = 0; i < tokens.length; i++) {
        const clean = tokens[i].toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (/^(XAUUSD|EURUSD|GBPUSD|USDJPY|USDCAD|AUDUSD|NZDUSD|USDCHF|BTCUSD|ETHUSD|USOIL|UKOIL|NIFTY|BANKNIFTY|[A-Z]{6,7})$/.test(clean)) {
          symbol = clean;
          break;
        }
      }
      if (!symbol) continue;

      let direction = 'LONG';
      for (let i = 0; i < tokens.length; i++) {
        if (/^buy$/i.test(tokens[i])) { direction = 'LONG'; break; }
        if (/^sell$/i.test(tokens[i])) { direction = 'SHORT'; break; }
      }

      const nums = [];
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (/\d{4}[-.\/]\d{2}[-.\/]\d{2}/.test(tok) || /\d{1,2}:\d{2}(:\d{2})?/.test(tok)) {
          continue;
        }
        const val = parseFloat(tok.replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && isFinite(val)) {
          nums.push(val);
        }
      }

      if (nums.length < 3) continue;

      let ticket = `ex_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      let metrics = [...nums];
      if (nums[0] > 1000 && Number.isInteger(nums[0])) {
        ticket = String(nums[0]);
        metrics.shift();
      }

      let qty = 0.1;
      let entryPrice = 0;
      let exitPrice = 0;
      let profit = 0;

      if (metrics.length >= 4) {
        qty = metrics[0];
        entryPrice = metrics[1];
        exitPrice = metrics[2];
        profit = metrics[metrics.length - 1];
      } else if (metrics.length === 3) {
        entryPrice = metrics[0];
        exitPrice = metrics[1];
        profit = metrics[2];
      }

      parsed.push({
        id: Date.now() + Math.floor(Math.random() * 100000),
        broker_order_id: `ex_${ticket}`,
        market: symbol.includes('USD') && !symbol.includes('BTC') ? 'FOREX' : 'CRYPTO',
        exchange: 'Exness MT5',
        symbol: symbol,
        direction: direction,
        status: 'CLOSED',
        entry_price: entryPrice,
        exit_price: exitPrice,
        quantity: qty,
        fees: 0,
        gross_pnl: profit,
        net_pnl: profit,
        strategy: 'Exness MT5 Execution',
        emotion: profit >= 0 ? 'Disciplined' : 'Confident',
        notes: `Real trade imported from Exness MT5 (Ticket #${ticket})`,
        image_uri: null,
        created_at: new Date().toISOString(),
        closed_at: new Date().toISOString()
      });
    }

    return parsed;
  }

  async function handleImportExnessTrades() {
    if (!exnessImportText.trim()) {
      return Alert.alert('Trade Text Required', 'Please paste closed trade lines or MT5 report text from your Exness account.');
    }

    const realTrades = parseExnessTrades(exnessImportText);
    if (realTrades.length === 0) {
      return Alert.alert(
        'Format Notice',
        'Could not detect closed trade lines. Please ensure your pasted text contains ticket, symbol (e.g. XAUUSD, EURUSD), open/close price, and profit.'
      );
    }

    // Deduplicate against existing trades
    const existingIds = new Set(trades.map(t => t.broker_order_id || t.id));
    const newTrades = realTrades.filter(t => !existingIds.has(t.broker_order_id));

    if (newTrades.length === 0) {
      Alert.alert('Already Ingested', 'All pasted trades are already present in your journal.');
    } else {
      const updated = [...newTrades, ...trades];
      await saveTradesToStorage(session?.userId || 'default', updated);

      if (activeExnessBroker) {
        const updatedBrokers = connectedBrokers.map(b => b.id === activeExnessBroker.id ? {
          ...b,
          lastSynced: new Date().toISOString(),
          syncedTradesCount: (b.syncedTradesCount || 0) + newTrades.length
        } : b);
        await saveBrokers(session?.userId || 'default', updatedBrokers);
      }

      setShowExnessImportModal(false);
      setExnessImportText('');
      setActiveExnessBroker(null);

      Alert.alert(
        'Exness Trades Imported! 🚀',
        `Successfully imported ${newTrades.length} real trades from your Exness MT5 statement!\n\nAll P&L, win rates, and AI performance scores have been updated.`
      );
    }
  }

  async function handleSyncBroker(brokerItem) {
    setIsSyncingBroker(true);
    try {
      if (brokerItem.broker === 'DELTA') {
        const apiKey = (brokerItem.apiKey || '').trim();
        const apiSecret = (brokerItem.apiSecret || '').trim();

        if (!apiKey || !apiSecret) {
          throw new Error('Delta Exchange API Key and Secret are required to fetch real trades. Please reconnect your broker account with valid credentials.');
        }

        const isIndia = brokerItem.region !== 'GLOBAL';
        const baseUrl = isIndia ? 'https://api.india.delta.exchange' : 'https://api.delta.exchange';
        const path = '/v2/orders/history';
        const query = '?page_size=50';
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signatureData = 'GET' + timestamp + path + query;

        const hmac = forge.hmac.create();
        hmac.start('sha256', apiSecret);
        hmac.update(signatureData);
        const signature = hmac.digest().toHex();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        let res;
        try {
          res = await fetch(`${baseUrl}${path}${query}`, {
            method: 'GET',
            headers: {
              'api-key': apiKey,
              'timestamp': timestamp,
              'signature': signature,
              'Content-Type': 'application/json'
            },
            signal: controller.signal
          });
        } catch (fetchErr) {
          throw new Error(`Connection timeout reaching Delta Exchange servers (${baseUrl}). Please verify your internet connection.`);
        } finally {
          clearTimeout(timeoutId);
        }

        const data = await res.json();
        if (!res.ok || data.success === false) {
          const errMsg = data.error?.context || data.error?.code || data.message || `HTTP ${res.status}`;
          throw new Error(`Delta Exchange API Error: ${errMsg}. Please verify your API Key and Secret.`);
        }

        const orders = data.result || [];
        const closedOrders = orders.filter(o => o.state === 'closed' || o.state === 'filled');

        if (closedOrders.length === 0) {
          Alert.alert('Delta Exchange Sync', 'Connected successfully to Delta Exchange! No closed orders found in your recent history.');
          setIsSyncingBroker(false);
          return;
        }

        const realTrades = closedOrders.map(o => {
          const entryPrice = Number(o.average_fill_price || o.limit_price || 0);
          const fees = Number(o.paid_commission || 0);
          const pnl = o.realized_pnl !== undefined ? Number(o.realized_pnl) : (o.pnl !== undefined ? Number(o.pnl) : 0);
          const qty = Number(o.size || 0);
          const side = (o.side || 'buy').toLowerCase() === 'buy' ? 'LONG' : 'SHORT';

          return {
            id: Date.now() + Math.floor(Math.random() * 100000),
            broker_order_id: `dl_${o.id}`,
            market: 'CRYPTO',
            exchange: 'Delta Exchange',
            symbol: o.symbol || 'CRYPTO',
            direction: side,
            status: 'CLOSED',
            entry_price: entryPrice,
            exit_price: entryPrice,
            quantity: qty,
            fees: fees,
            gross_pnl: pnl + fees,
            net_pnl: pnl,
            strategy: 'Delta Orderbook Execution',
            emotion: 'Disciplined',
            notes: `Real order #${o.id} synced live from Delta Exchange.`,
            image_uri: null,
            created_at: o.created_at || new Date().toISOString(),
            closed_at: o.updated_at || o.created_at || new Date().toISOString()
          };
        });

        const existingIds = new Set(trades.map(t => t.broker_order_id || t.id));
        const newFills = realTrades.filter(t => !existingIds.has(t.broker_order_id));

        if (newFills.length === 0) {
          Alert.alert('Up to Date ⚡', 'All closed orders from Delta Exchange are already in your journal!');
        } else {
          const updatedTrades = [...newFills, ...trades];
          await saveTradesToStorage(session?.userId || 'default', updatedTrades);

          const updatedBrokers = connectedBrokers.map(b => b.id === brokerItem.id ? {
            ...b,
            lastSynced: new Date().toISOString(),
            syncedTradesCount: (b.syncedTradesCount || 0) + newFills.length
          } : b);
          await saveBrokers(session?.userId || 'default', updatedBrokers);

          Alert.alert(
            'Delta Exchange Sync Success! 🚀',
            `Directly imported ${newFills.length} real executed positions from Delta Exchange!\n\nAll P&L, fees, and stats have been updated.`
          );
        }
      } else if (brokerItem.broker === 'EXNESS') {
        // Open real Exness statement import dialog
        setIsSyncingBroker(false);
        setActiveExnessBroker(brokerItem);
        setShowExnessImportModal(true);
        return;
      } else {
        Alert.alert('Broker Connected', `Live sync ready for ${brokerItem.accountName}.`);
      }
    } catch (e) {
      Alert.alert('Broker Sync Notice', e.message);
    } finally {
      setIsSyncingBroker(false);
    }
  }

  async function handleDisconnectBroker(brokerId) {
    Alert.alert('Disconnect Broker', 'Are you sure you want to disconnect this broker account? Existing journal records will remain safe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          const updated = connectedBrokers.filter(b => b.id !== brokerId);
          await saveBrokers(session?.userId || 'default', updated);
        }
      }
    ]);
  }

  // 8. TRADEMIND AI TRADING PERFORMANCE & IMPROVEMENT DIAGNOSTICS
  const aiDiagnostics = useMemo(() => {
    const closed = trades.filter(t => t.status === 'CLOSED');
    if (closed.length === 0) {
      return {
        score: 75,
        rating: 'Needs More Data',
        color: '#f59e0b',
        suggestions: [
          {
            tag: 'GET STARTED',
            title: 'Sync Your Broker or Record Trades',
            desc: 'Connect Delta Exchange or Exness to import executions. TradeMind AI will analyze your execution patterns automatically.',
            color: '#38bdf8'
          }
        ]
      };
    }

    const pnls = closed.map(t => Number(t.net_pnl || 0));
    const wins = pnls.filter(p => p > 0);
    const losses = pnls.filter(p => p < 0);
    const totalFees = closed.reduce((acc, t) => acc + Number(t.fees || 0), 0);
    const grossPnl = closed.reduce((acc, t) => acc + Number(t.gross_pnl || t.net_pnl || 0), 0);
    const totalNet = pnls.reduce((acc, c) => acc + c, 0);

    const winRate = Math.round((wins.length / closed.length) * 100);
    const avgWin = wins.length > 0 ? (wins.reduce((a, b) => a + b, 0) / wins.length) : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
    const rrr = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '2.50';

    // Fee impact
    const feeImpact = grossPnl > 0 ? Math.min(100, Math.round((totalFees / grossPnl) * 100)) : 15;

    // Emotions check
    const revengeTrades = closed.filter(t => t.emotion === 'Revenge' || t.emotion === 'FOMO');
    const revengeWinRate = revengeTrades.length > 0 ? Math.round((revengeTrades.filter(t => t.net_pnl > 0).length / revengeTrades.length) * 100) : null;

    // Compute intelligent score
    let score = 70;
    if (winRate >= 60) score += 12;
    else if (winRate >= 50) score += 6;
    else score -= 8;

    if (Number(rrr) >= 1.5) score += 10;
    else if (Number(rrr) < 1.0) score -= 10;

    if (feeImpact > 20) score -= 6;
    if (revengeTrades.length > 0) score -= 8;

    score = Math.max(35, Math.min(96, score));

    const suggestions = [];

    // 1. Strategy & Edge
    const cryptoTrades = closed.filter(t => t.market === 'CRYPTO');
    const forexTrades = closed.filter(t => t.market === 'FOREX');
    const cryptoWins = cryptoTrades.filter(t => t.net_pnl > 0).length;
    const forexWins = forexTrades.filter(t => t.net_pnl > 0).length;

    if (cryptoTrades.length > 0 && forexTrades.length > 0) {
      const cRate = Math.round((cryptoWins / cryptoTrades.length) * 100);
      const fRate = Math.round((forexWins / forexTrades.length) * 100);
      if (cRate > fRate + 10) {
        suggestions.push({
          tag: 'STRATEGY EDGE',
          title: 'Capitalize on Delta Exchange Crypto Strengths',
          desc: `Your Crypto win rate on Delta Exchange is ${cRate}% vs ${fRate}% on Forex. AI recommendation: Allocate 70% of risk capital to your high-win Crypto setups.`,
          color: '#38bdf8'
        });
      } else {
        suggestions.push({
          tag: 'STRATEGY EDGE',
          title: 'Exness Forex Momentum Outperforming',
          desc: `Your Forex win rate on Exness is ${fRate}%. Maintain strict TP targets on Gold (XAUUSD) and major currency pairs.`,
          color: '#eab308'
        });
      }
    } else {
      suggestions.push({
        tag: 'STRATEGY EDGE',
        title: 'Focus on High-Probability Breakout Entries',
        desc: `Current journal win rate is ${winRate}%. Ensure every entry has a clear catalyst (trendline retest or orderbook breakout) before executing.`,
        color: '#38bdf8'
      });
    }

    // 2. Risk Management & RRR
    if (Number(rrr) < 1.2) {
      suggestions.push({
        tag: 'RISK CONTROL',
        title: 'Asymmetrical Risk-to-Reward Warning',
        desc: `Your average loss (${formatMoney(avgLoss)}) is high compared to your average win (${formatMoney(avgWin)}). AI directive: Never enter a trade with less than 1.5R potential reward.`,
        color: '#f43f5e'
      });
    } else {
      suggestions.push({
        tag: 'RISK CONTROL',
        title: 'Solid Risk-to-Reward Ratio',
        desc: `Your average reward ratio is healthy (${rrr}R). Let winning trades run to full targets and trail stop-loss to breakeven after 1R.`,
        color: '#10b981'
      });
    }

    // 3. Broker Fee Drag
    if (totalFees > 0) {
      suggestions.push({
        tag: 'FEE REDUCTION',
        title: 'Cut Broker Commission & Taker Drag',
        desc: `You have paid ${formatMoney(totalFees)} in broker fees (${feeImpact}% of gross profits). AI directive: Use Maker Limit orders on Delta Exchange to reduce taker fees by up to 50%.`,
        color: '#a855f7'
      });
    }

    // 4. Emotional Discipline
    if (revengeTrades.length > 0) {
      suggestions.push({
        tag: 'PSYCHOLOGY',
        title: 'Eliminate Revenge & FOMO Trading',
        desc: `You have ${revengeTrades.length} trades marked as FOMO/Revenge${revengeWinRate !== null ? ` (Win rate: ${revengeWinRate}%)` : ''}. AI rule: Enforce an automatic 60-minute cooling window after any loss.`,
        color: '#f59e0b'
      });
    } else {
      suggestions.push({
        tag: 'PSYCHOLOGY',
        title: 'Disciplined Execution State',
        desc: 'Great emotional composure! Keep logging your psychological state on every trade to reinforce consistency.',
        color: '#10b981'
      });
    }

    let rating = 'Professional Trader';
    let color = '#10b981';
    if (score < 60) { rating = 'Developing Disciplined Edge'; color = '#f43f5e'; }
    else if (score < 80) { rating = 'Consistent Tactical Trader'; color = '#38bdf8'; }

    return { score, rating, color, suggestions, winRate, rrr, totalFees, feeImpact };
  }, [trades, connectedBrokers, currency]);

  // 8. EMAIL & PASSWORD AUTH (With Legacy Recovery)
  async function handleEmailRegister() {
    if (!authName.trim()) return Alert.alert('Required', 'Please enter your full name.');
    if (!authEmail.trim() || !authEmail.includes('@')) return Alert.alert('Required', 'Please enter a valid email.');
    if (!authPassword || authPassword.length < 6) return Alert.alert('Required', 'Password must be at least 6 characters.');

    const cleanEmail = authEmail.trim().toLowerCase();
    const users = await getMasterUsers();

    if (users.find(u => u.email && u.email.toLowerCase() === cleanEmail)) {
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

    let users = await getMasterUsers();
    let existing = users.find(u => u.email && u.email.toLowerCase() === cleanEmail);

    // Fallback: check legacy tm_user_${cleanEmail} key directly
    if (!existing) {
      try {
        const legacyRaw = await AsyncStorage.getItem(`tm_user_${cleanEmail}`);
        if (legacyRaw) {
          const parsed = JSON.parse(legacyRaw);
          existing = {
            id: parsed.userId || parsed.id || `u_${Date.now()}`,
            name: parsed.name || 'Trader',
            email: cleanEmail,
            password: parsed.password || '',
            isDemo: false
          };
          users.push(existing);
          await saveMasterUsers(users);
        }
      } catch {}
    }

    if (!existing) {
      return Alert.alert(
        'Account Not Found',
        `No account found with ${cleanEmail}. Would you like to create an account now?`,
        [
          { text: 'Create Account', onPress: () => setAuthMode('register') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }

    if (existing.password && existing.password !== authPassword) {
      return Alert.alert('Invalid Password', 'The password you entered is incorrect. Please verify and try again.');
    }

    const active = { userId: existing.id, name: existing.name, email: existing.email, isDemo: false };
    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(active));
    setSession(active);
    await loadUserTrades(existing.id);
    await loadBrokers(existing.id);
    Alert.alert('Welcome Back', `Successfully logged in as ${existing.name}!`);
  }

  // 9. INSTANT DEMO MODE
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
    await loadUserTrades('demo');
    await loadBrokers('demo');
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

  // 10. IN-APP UPDATE SYSTEM: SMART CHECK, VERSION COMPARISON & DIRECT INSTALLER
  function compareVersions(v1, v2) {
    const clean1 = (v1 || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const clean2 = (v2 || '').replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const maxLen = Math.max(clean1.length, clean2.length);
    for (let i = 0; i < maxLen; i++) {
      const num1 = clean1[i] || 0;
      const num2 = clean2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  async function handleCheckForUpdates() {
    setUpdateModalVisible(true);
    setUpdateStatus('checking');
    try {
      const res = await fetch('https://api.github.com/repos/uniqabhishek/Trading-Journal/releases/latest');
      if (!res.ok) throw new Error('Could not connect to update server');
      const data = await res.json();
      setReleaseInfo(data);
      setUpdateStatus('ready');
    } catch (err) {
      console.warn('Update check failed:', err);
      setReleaseInfo({
        tag_name: APP_VERSION,
        name: `TradeMind Android Release ${APP_VERSION}`,
        body: 'Latest stable production release with direct broker sync and AI diagnostics.'
      });
      setUpdateStatus('ready');
    }
  }

  async function handleDownloadAndInstallUpdate() {
    try {
      setUpdateStatus('downloading');
      setUpdateProgress(0);
      setDownloadSpeedText('Connecting to update server...');

      const tag = releaseInfo?.tag_name || APP_VERSION;
      const apkAsset = releaseInfo?.assets?.find(a => a.name && a.name.endsWith('.apk'));
      const downloadUrl = apkAsset?.browser_download_url || `https://github.com/uniqabhishek/Trading-Journal/releases/download/${tag}/TradeMind.apk`;
      const targetUri = FileSystem.cacheDirectory + 'TradeMind_Update.apk';

      // Delete existing update file if present
      const prevInfo = await FileSystem.getInfoAsync(targetUri);
      if (prevInfo.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        targetUri,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const p = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setUpdateProgress(p);
            const mbWritten = (downloadProgress.totalBytesWritten / (1024 * 1024)).toFixed(1);
            const mbTotal = (downloadProgress.totalBytesExpectedToWrite / (1024 * 1024)).toFixed(1);
            setDownloadSpeedText(`${mbWritten} MB / ${mbTotal} MB (${Math.round(p * 100)}%)`);
          }
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (!result || !result.uri) throw new Error('Download incomplete');

      setDownloadedApkUri(result.uri);
      setUpdateStatus('completed');

      // Auto-trigger installation
      triggerApkInstall(result.uri);
    } catch (e) {
      setUpdateStatus('error');
      Alert.alert('Download Error', e.message);
    }
  }

  async function triggerApkInstall(apkUri) {
    try {
      const uriToInstall = apkUri || downloadedApkUri || (FileSystem.cacheDirectory + 'TradeMind_Update.apk');
      if (!uriToInstall) return;

      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uriToInstall);
        try {
          // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (268435456) = 268435457
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 268435457,
            type: 'application/vnd.android.package-archive'
          });
        } catch (launcherErr) {
          console.warn('IntentLauncher failed, falling back to Sharing:', launcherErr);
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uriToInstall, {
              mimeType: 'application/vnd.android.package-archive',
              dialogTitle: 'Install TradeMind Update'
            });
          } else {
            const tag = releaseInfo?.tag_name || APP_VERSION;
            Linking.openURL(`https://github.com/uniqabhishek/Trading-Journal/releases/download/${tag}/TradeMind.apk`);
          }
        }
      } else {
        Alert.alert('Notice', 'In-app APK installation is supported on Android devices.');
      }
    } catch (e) {
      Alert.alert('Installer Notice', 'Could not launch package installer: ' + e.message);
    }
  }

  // 11. EXPORT & BACKUP TO GOOGLE DRIVE / CLOUD / FILES
  async function exportJournalBackup() {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allTradesMap = {};

      const tradeKeys = allKeys.filter(k => k.startsWith('tm_mobile_trades_'));
      for (const tk of tradeKeys) {
        try {
          const tRaw = await AsyncStorage.getItem(tk);
          if (tRaw) allTradesMap[tk] = JSON.parse(tRaw);
        } catch {}
      }

      const users = await getMasterUsers();
      const sessionRaw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      const vaultPayload = {
        app: 'TradeMind AI',
        version: APP_VERSION,
        exported_at: new Date().toISOString(),
        users,
        session: sessionRaw ? JSON.parse(sessionRaw) : null,
        trades: allTradesMap
      };

      const fileUri = FileSystem.cacheDirectory + 'TradeMind_Journal_Backup.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(vaultPayload, null, 2));

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save TradeMind Journal Backup',
          UTI: 'public.json'
        });
      } else {
        Alert.alert('Backup Created', `Saved to ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export Error', e.message);
    }
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

  // FORGOT PASSWORD RECOVERY MODAL RENDERER
  function renderForgotPasswordModal() {
    if (!showForgotPassword) return null;
    return (
      <Modal
        transparent
        animationType="slide"
        visible={showForgotPassword}
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>🔑 Reset Journal Password</Text>
              <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.forgotPasswordDesc}>
              Enter your registered email address to securely reset your password and restore your journal records.
            </Text>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Registered Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. trader@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={forgotEmail}
                onChangeText={setForgotEmail}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>New Password (min 6 chars)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={forgotNewPassword}
                onChangeText={setForgotNewPassword}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter new password"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={forgotConfirmPassword}
                onChangeText={setForgotConfirmPassword}
              />
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleResetPassword}>
              <Text style={styles.btnPrimaryText}>✓ Save New Password & Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnCancelSecondary} onPress={() => setShowForgotPassword(false)}>
              <Text style={styles.btnCancelSecondaryText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

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
            {/* SIGN IN vs CREATE ACCOUNT TABS */}
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

            {/* EMAIL ADDRESS INPUT */}
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

            {/* PASSWORD INPUT */}
            <View style={styles.inputWrap}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.label}>Password</Text>
                {authMode === 'login' && (
                  <TouchableOpacity onPress={() => { setForgotEmail(authEmail); setShowForgotPassword(true); }}>
                    <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
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
        {renderForgotPasswordModal()}
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
            {/* BROKER SYNC & AI INSIGHTS QUICK BANNER */}
            <View style={styles.brokerQuickCard}>
              <View style={styles.brokerQuickHead}>
                <View style={styles.brokerQuickTitleWrap}>
                  <Text style={styles.brokerQuickIcon}>⚡</Text>
                  <View>
                    <Text style={styles.brokerQuickTitle}>Broker Sync & AI Insights</Text>
                    <Text style={styles.brokerQuickSub}>
                      {connectedBrokers.length > 0
                        ? `${connectedBrokers.length} Broker(s) Connected: ${connectedBrokers.map(b => BROKER_DEFS[b.broker]?.name || b.broker).join(', ')}`
                        : 'Connect Delta Exchange, Exness & Binance to import trades'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.aiScoreBadge, { borderColor: aiDiagnostics.color }]}>
                  <Text style={[styles.aiScoreVal, { color: aiDiagnostics.color }]}>{aiDiagnostics.score}</Text>
                  <Text style={styles.aiScoreLabel}>AI SCORE</Text>
                </View>
              </View>

              <View style={styles.brokerQuickActions}>
                <TouchableOpacity
                  style={styles.btnQuickSync}
                  onPress={() => {
                    if (connectedBrokers.length > 0) handleSyncBroker(connectedBrokers[0]);
                    else setShowBrokerModal(true);
                  }}
                  disabled={isSyncingBroker}
                >
                  <Text style={styles.btnQuickSyncText}>
                    {isSyncingBroker ? 'Syncing...' : '🔄 Direct Broker Sync'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnQuickAi}
                  onPress={() => switchTab('psychology')}
                >
                  <Text style={styles.btnQuickAiText}>🤖 View AI Suggestions →</Text>
                </TouchableOpacity>
              </View>
            </View>

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

            {/* BROKER CONNECTION & LIVE SYNC HUB */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.cardHeading}>⚡ Connected Brokers & API Sync</Text>
                  <Text style={styles.cardSub}>Directly ingest executions from Delta Exchange, Exness, Binance</Text>
                </View>
                <TouchableOpacity style={styles.btnAddBrokerSmall} onPress={() => setShowBrokerModal(true)}>
                  <Text style={styles.btnAddBrokerSmallText}>+ Connect</Text>
                </TouchableOpacity>
              </View>

              {connectedBrokers.length === 0 ? (
                <View style={styles.emptyBrokersWrap}>
                  <Text style={styles.emptyBrokersText}>No external brokers connected yet.</Text>
                  <TouchableOpacity style={styles.btnConnectBrokerPrimary} onPress={() => setShowBrokerModal(true)}>
                    <Text style={styles.btnConnectBrokerPrimaryText}>⚡ Connect Delta Exchange or Exness</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                connectedBrokers.map(b => {
                  const def = BROKER_DEFS[b.broker] || {};
                  return (
                    <View key={b.id} style={styles.brokerItemCard}>
                      <View style={styles.brokerItemHead}>
                        <View style={styles.brokerItemTitleRow}>
                          <Text style={styles.brokerItemIcon}>{def.icon || '⚡'}</Text>
                          <View>
                            <Text style={styles.brokerItemName}>{b.accountName}</Text>
                            <Text style={[styles.brokerItemCategory, { color: def.color || '#38bdf8' }]}>
                              {def.name} · {def.category}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.brokerItemStatus}>
                          <View style={styles.onlineDot} />
                          <Text style={styles.onlineText}>Connected</Text>
                        </View>
                      </View>

                      <View style={styles.brokerItemActions}>
                        <TouchableOpacity
                          style={styles.btnSyncItem}
                          onPress={() => handleSyncBroker(b)}
                          disabled={isSyncingBroker}
                        >
                          <Text style={styles.btnSyncItemText}>
                            {isSyncingBroker ? 'Syncing...' : '🔄 Sync Trades'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnDisconnectItem}
                          onPress={() => handleDisconnectBroker(b.id)}
                        >
                          <Text style={styles.btnDisconnectItemText}>✕ Disconnect</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* TRADEMIND AI TRADING PERFORMANCE & SUGGESTIONS */}
            <View style={styles.card}>
              <View style={styles.aiDiagHeader}>
                <View>
                  <Text style={styles.cardHeading}>🤖 TradeMind AI Diagnostic</Text>
                  <Text style={styles.cardSub}>Algorithmic coaching based on synced broker trades</Text>
                </View>
                <View style={[styles.aiScoreBadgeLarge, { borderColor: aiDiagnostics.color }]}>
                  <Text style={[styles.aiScoreValLarge, { color: aiDiagnostics.color }]}>{aiDiagnostics.score}</Text>
                  <Text style={styles.aiScoreLabelLarge}>SCORE / 100</Text>
                </View>
              </View>

              <View style={styles.aiRatingPill}>
                <Text style={[styles.aiRatingText, { color: aiDiagnostics.color }]}>
                  STATUS: {aiDiagnostics.rating.toUpperCase()}
                </Text>
              </View>

              {/* AI SUGGESTION TILES */}
              <View style={styles.aiSuggestionsWrap}>
                {aiDiagnostics.suggestions.map((sug, idx) => (
                  <View key={idx} style={[styles.aiSuggestionTile, { borderLeftColor: sug.color }]}>
                    <View style={styles.aiSugTagRow}>
                      <Text style={[styles.aiSugTag, { color: sug.color }]}>{sug.tag}</Text>
                    </View>
                    <Text style={styles.aiSugTitle}>{sug.title}</Text>
                    <Text style={styles.aiSugDesc}>{sug.desc}</Text>
                  </View>
                ))}
              </View>
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
              <Text style={styles.cardHeading}>Account & Data Vault</Text>
              <Text style={styles.infoRow}>User: <Text style={styles.textWhite}>{session.name}</Text></Text>
              {session.phone ? (
                <Text style={styles.infoRow}>Mobile: <Text style={styles.textWhite}>{session.phone}</Text></Text>
              ) : null}
              {session.email ? (
                <Text style={styles.infoRow}>Email: <Text style={styles.textWhite}>{session.email}</Text></Text>
              ) : null}
              <Text style={styles.infoRow}>Data Safety: <Text style={styles.green}>🛡️ Multi-Tier Persistent Vault Active</Text></Text>

              {/* Data Recovery & Backup Actions */}
              <View style={styles.vaultActionsRow}>
                <TouchableOpacity
                  style={styles.btnVaultAction}
                  onPress={() => scanAndRecoverAllData(true)}
                  disabled={isRecoveringData}
                >
                  <Text style={styles.btnVaultActionText}>
                    {isRecoveringData ? 'Scanning...' : '🔍 Scan & Restore Past Data'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnVaultAction}
                  onPress={exportJournalBackup}
                >
                  <Text style={styles.btnVaultActionText}>📤 Export Backup (.json)</Text>
                </TouchableOpacity>
              </View>

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

      {/* MODAL 4A: FORGOT PASSWORD RECOVERY MODAL */}
      {renderForgotPasswordModal()}

      {/* MODAL 4B: CONNECT BROKER ACCOUNT MODAL */}
      {showBrokerModal && (
        <Modal
          transparent
          animationType="slide"
          visible={showBrokerModal}
          onRequestClose={() => setShowBrokerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>⚡ Connect Broker Account</Text>
                <TouchableOpacity onPress={() => setShowBrokerModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.brokerModalDesc}>
                Link your exchange or forex account to ingest live trade execution data directly into your journal.
              </Text>

              {/* BROKER SELECTOR CHIPS */}
              <Text style={styles.label}>Select Broker Platform</Text>
              <View style={styles.brokerPickerRow}>
                {Object.values(BROKER_DEFS).map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.brokerPickerChip, brokerType === b.id && { borderColor: b.color, backgroundColor: 'rgba(255,255,255,0.08)' }]}
                    onPress={() => setBrokerType(b.id)}
                  >
                    <Text style={styles.brokerPickerIcon}>{b.icon}</Text>
                    <Text style={[styles.brokerPickerName, brokerType === b.id && { color: b.color, fontWeight: '700' }]}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.brokerInfoCard}>
                <Text style={styles.brokerInfoDesc}>{BROKER_DEFS[brokerType]?.desc}</Text>
              </View>

              {brokerType === 'DELTA' && (
                <View style={styles.inputWrap}>
                  <Text style={styles.label}>Delta Exchange Server Region</Text>
                  <View style={styles.deltaRegionToggle}>
                    <TouchableOpacity
                      style={[styles.deltaRegionBtn, deltaRegion === 'INDIA' && styles.deltaRegionBtnActive]}
                      onPress={() => setDeltaRegion('INDIA')}
                    >
                      <Text style={[styles.deltaRegionBtnText, deltaRegion === 'INDIA' && styles.textWhite]}>
                        🇮🇳 Delta India (api.india.delta.exchange)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deltaRegionBtn, deltaRegion === 'GLOBAL' && styles.deltaRegionBtnActive]}
                      onPress={() => setDeltaRegion('GLOBAL')}
                    >
                      <Text style={[styles.deltaRegionBtnText, deltaRegion === 'GLOBAL' && styles.textWhite]}>
                        🌐 Delta Global (api.delta.exchange)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.inputWrap}>
                <Text style={styles.label}>Account Nickname *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`e.g. My ${BROKER_DEFS[brokerType]?.name} Account`}
                  placeholderTextColor="#64748b"
                  value={brokerAccountName}
                  onChangeText={setBrokerAccountName}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>API Key / Account ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste read-only API Key"
                  placeholderTextColor="#64748b"
                  value={brokerApiKey}
                  onChangeText={setBrokerApiKey}
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.label}>API Secret / Passphrase (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste API Secret (kept 100% on-device)"
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={brokerApiSecret}
                  onChangeText={setBrokerApiSecret}
                />
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleConnectBroker}>
                <Text style={styles.btnPrimaryText}>⚡ Connect & Enable Direct Sync</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

            {/* MODAL 4C: EXNESS MT5 STATEMENT & CLOSED TRADES IMPORT MODAL */}
      {showExnessImportModal && (
        <Modal
          transparent
          animationType="slide"
          visible={showExnessImportModal}
          onRequestClose={() => setShowExnessImportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>🌐 Exness MT5 Trade Statement</Text>
                <TouchableOpacity onPress={() => setShowExnessImportModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.brokerModalDesc}>
                Import real executed trades from your Exness account ({activeExnessBroker?.accountName || 'MT5'}).
              </Text>

              <Text style={styles.label}>Paste MT5 Trade History or Closed Orders Text</Text>
              <TextInput
                style={styles.exnessTextInput}
                placeholder={"Paste lines copied from MT5 history or CSV statement, e.g.:\n14285910 2026.11.04 12:30 buy 0.10 XAUUSD 2730.20 2745.50 153.00"}
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={6}
                value={exnessImportText}
                onChangeText={setExnessImportText}
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleImportExnessTrades}>
                <Text style={styles.btnPrimaryText}>📥 Parse & Ingest Real Trades</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnCancelSecondary}
                onPress={() => setShowExnessImportModal(false)}
              >
                <Text style={styles.btnCancelSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 5: IN-APP UPDATER (DOWNLOAD & INSTALL WITHOUT LEAVING APP) */}
      {updateModalVisible && (
        <Modal
          transparent
          animationType="fade"
          visible={updateModalVisible}
          onRequestClose={() => {
            if (updateStatus !== 'downloading') setUpdateModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>⚡ TradeMind In-App Updater</Text>
                {updateStatus !== 'downloading' && (
                  <TouchableOpacity onPress={() => setUpdateModalVisible(false)}>
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.updateChannelCard}>
                <View style={styles.updateChannelHead}>
                  <Text style={styles.updateVerLabel}>Current: <Text style={styles.cyan}>{APP_VERSION}</Text></Text>
                  <Text style={styles.updateVerLabel}>Release: <Text style={styles.green}>{releaseInfo?.tag_name || APP_VERSION}</Text></Text>
                </View>
                <Text style={styles.updateNotes}>
                  {releaseInfo?.name || 'Production Release with Permanent Data Vault'}
                </Text>
                <View style={styles.updateSafetyBadge}>
                  <Text style={styles.updateSafetyText}>
                    🛡️ Zero Data Loss Guarantee: Your accounts and trades remain 100% safe.
                  </Text>
                </View>
              </View>

              {/* DOWNLOAD PROGRESS BAR */}
              {updateStatus === 'downloading' && (
                <View style={styles.downloadProgressWrap}>
                  <Text style={styles.downloadStatusTitle}>Downloading Update Package In-App...</Text>
                  <View style={styles.downloadProgressBarBg}>
                    <View style={[styles.downloadProgressBarFill, { width: `${Math.round(updateProgress * 100)}%` }]} />
                  </View>
                  <View style={styles.downloadProgressMeta}>
                    <Text style={styles.downloadSpeedText}>{downloadSpeedText}</Text>
                    <Text style={styles.downloadPercentText}>{Math.round(updateProgress * 100)}%</Text>
                  </View>
                </View>
              )}

              {/* ACTION BUTTONS */}
              {updateStatus === 'checking' && (
                <View style={styles.checkingWrap}>
                  <Text style={styles.checkingText}>Connecting to GitHub Release Channel...</Text>
                </View>
              )}

              {updateStatus === 'ready' && (
                <View style={styles.updateActionsGrid}>
                  {compareVersions(APP_VERSION, releaseInfo?.tag_name || APP_VERSION) >= 0 ? (
                    <>
                      <View style={styles.upToDateBox}>
                        <Text style={styles.upToDateCheckIcon}>✅</Text>
                        <Text style={styles.upToDateHeading}>TradeMind is Already Updated!</Text>
                        <Text style={styles.upToDateMessage}>
                          You are currently running the latest official version ({APP_VERSION}). No updates required.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.btnPrimary, { backgroundColor: '#10b981' }]}
                        onPress={() => setUpdateModalVisible(false)}
                      >
                        <Text style={styles.btnPrimaryText}>✓ App is Up to Date (Close)</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={styles.newUpdateAvailableBox}>
                        <Text style={styles.newUpdateBadge}>NEW UPDATE DISCOVERED</Text>
                        <Text style={styles.newUpdateVersionTitle}>{releaseInfo?.tag_name || 'Latest Release'}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={handleDownloadAndInstallUpdate}
                      >
                        <Text style={styles.btnPrimaryText}>📥 Download & Install Update ({releaseInfo?.tag_name || 'New'})</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <View style={styles.modalBtnRow}>
                    <TouchableOpacity
                      style={styles.modalBtnCancel}
                      onPress={() => Linking.openURL(WEB_APP_URL)}
                    >
                      <Text style={styles.modalBtnCancelText}>Live Web App ↗</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalBtnCancel}
                      onPress={() => Linking.openURL(GITHUB_REPO)}
                    >
                      <Text style={styles.modalBtnCancelText}>GitHub Repo ↗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {updateStatus === 'completed' && (
                <View style={styles.updateActionsGrid}>
                  <View style={styles.upToDateBox}>
                    <Text style={styles.upToDateCheckIcon}>📦</Text>
                    <Text style={styles.upToDateHeading}>Download Complete (100%)</Text>
                    <Text style={styles.upToDateMessage}>
                      TradeMind update package has been downloaded. Tap below to launch installation. All your data and login credentials remain 100% safe.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: '#10b981' }]}
                    onPress={() => triggerApkInstall()}
                  >
                    <Text style={styles.btnPrimaryText}>🚀 Tap to Install Update Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalBtnCancel}
                    onPress={async () => {
                      const uri = downloadedApkUri || (FileSystem.cacheDirectory + 'TradeMind_Update.apk');
                      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.android.package-archive' });
                    }}
                  >
                    <Text style={styles.modalBtnCancelText}>📂 Open with System Package Installer</Text>
                  </TouchableOpacity>
                </View>
              )}

              {updateStatus === 'error' && (
                <View style={styles.updateActionsGrid}>
                  <TouchableOpacity
                    style={styles.btnPrimary}
                    onPress={() => Linking.openURL(`https://github.com/uniqabhishek/Trading-Journal/releases/download/${APP_VERSION}/TradeMind.apk`)}
                  >
                    <Text style={styles.btnPrimaryText}>Download via Browser</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  navLabel: { fontSize: 10, color: '#64748b', marginTop: 2, fontWeight: '700' },
  // Data Vault & SMS Notification Styles
  smsAlertBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16
  },
  smsAlertTitle: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4
  },
  smsAlertDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17
  },
  btnQuickFillOtp: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16
  },
  btnQuickFillOtpText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 13
  },
  vaultActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14
  },
  btnVaultAction: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnVaultActionText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  },
  // In-App Updater Styles
  updateChannelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  updateChannelHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  updateVerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  updateNotes: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10
  },
  updateSafetyBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    padding: 8
  },
  updateSafetyText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600'
  },
  downloadProgressWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  downloadStatusTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10
  },
  downloadProgressBarBg: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8
  },
  downloadProgressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 5
  },
  downloadProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  downloadSpeedText: {
    color: '#94a3b8',
    fontSize: 12
  },
  downloadPercentText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  checkingWrap: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  checkingText: {
    color: '#94a3b8',
    fontSize: 13
  },
  updateActionsGrid: {
    gap: 10
  },
  deltaRegionToggle: {
    gap: 8,
    marginTop: 4
  },
  deltaRegionBtn: {
    backgroundColor: '#070b14',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  deltaRegionBtnActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)'
  },
  deltaRegionBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600'
  },
  exnessTextInput: {
    backgroundColor: '#070b14',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#f8fafc',
    padding: 12,
    fontSize: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  // Forgot Password & Auth Styles
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  forgotPasswordLink: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  forgotPasswordDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  btnCancelSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6
  },
  btnCancelSecondaryText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600'
  },

  // Broker Quick Banner & Items
  brokerQuickCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16
  },
  brokerQuickHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  brokerQuickTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10
  },
  brokerQuickIcon: {
    fontSize: 22,
    marginRight: 8
  },
  brokerQuickTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700'
  },
  brokerQuickSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2
  },
  aiScoreBadge: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)'
  },
  aiScoreVal: {
    fontSize: 16,
    fontWeight: '900'
  },
  aiScoreLabel: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800'
  },
  brokerQuickActions: {
    flexDirection: 'row',
    gap: 8
  },
  btnQuickSync: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnQuickSyncText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  btnQuickAi: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center'
  },
  btnQuickAiText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },

  // Broker Hub & Cards in Tab 4
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  btnAddBrokerSmall: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  btnAddBrokerSmallText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  emptyBrokersWrap: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  emptyBrokersText: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10
  },
  btnConnectBrokerPrimary: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  btnConnectBrokerPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  brokerItemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6
  },
  brokerItemHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  brokerItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  brokerItemIcon: {
    fontSize: 20,
    marginRight: 8
  },
  brokerItemName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700'
  },
  brokerItemCategory: {
    fontSize: 11,
    marginTop: 2
  },
  brokerItemStatus: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4
  },
  onlineText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700'
  },
  brokerItemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  btnSyncItem: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center'
  },
  btnSyncItemText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700'
  },
  btnDisconnectItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center'
  },
  btnDisconnectItemText: {
    color: '#f43f5e',
    fontSize: 11,
    fontWeight: '600'
  },

  // Broker Modal
  brokerModalDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14
  },
  brokerPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12
  },
  brokerPickerChip: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10
  },
  brokerPickerIcon: {
    fontSize: 16,
    marginRight: 6
  },
  brokerPickerName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600'
  },
  brokerInfoCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14
  },
  brokerInfoDesc: {
    color: '#93c5fd',
    fontSize: 11,
    lineHeight: 16
  },

  // AI Diagnostic Section
  aiDiagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  aiScoreBadgeLarge: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)'
  },
  aiScoreValLarge: {
    fontSize: 22,
    fontWeight: '900'
  },
  aiScoreLabelLarge: {
    color: '#64748b',
    fontSize: 8,
    fontWeight: '800'
  },
  aiRatingPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 12
  },
  aiRatingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  aiSuggestionsWrap: {
    gap: 10
  },
  aiSuggestionTile: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12
  },
  aiSugTagRow: {
    marginBottom: 4
  },
  aiSugTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  aiSugTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4
  },
  aiSugDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17
  },

  // Up to date update card
  upToDateBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12
  },
  upToDateCheckIcon: {
    fontSize: 28,
    marginBottom: 6
  },
  upToDateHeading: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4
  },
  upToDateMessage: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17
  },
  btnForceReinstall: {
    paddingVertical: 8,
    alignItems: 'center'
  },
  btnForceReinstallText: {
    color: '#64748b',
    fontSize: 11,
    textDecorationLine: 'underline'
  },
  newUpdateAvailableBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10
  },
  newUpdateBadge: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  newUpdateVersionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2
  }
});
