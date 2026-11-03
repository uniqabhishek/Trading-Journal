# ⚡ TradeMind AI — Trading Journal & Psychology Workspace

> **🌐 Live Web App**: [https://uniqabhishek.github.io/Trading-Journal/](https://uniqabhishek.github.io/Trading-Journal/)

TradeMind AI is a professional, modern trading performance and psychology journal built for Crypto, Forex, and Stock traders. It features a responsive React web app, a native Expo mobile application for Android and iOS, and an optional Flask API backend.

![TradeMind Logo](public/logo.png)

---

## 📱 Mobile App (iOS & Android)

The mobile app is built with React Native and Expo, offering a native mobile trading terminal in your pocket.

### Mobile Features
- **App Icon & Branding**: Custom cyber-candlestick neural brain icon.
- **Hero Performance Card**: Live Net Realized P&L with win rate and profit factor.
- **On-the-go Trade Logger**: Quick symbol chips (`BTCUSDT`, `ETHUSDT`, `EURUSD`, `XAUUSD`, `NVDA`), instant Long/Short toggle, and live P&L estimate preview.
- **Psychology Matrix**: Track your emotional discipline (Confident, Disciplined, FOMO, Revenge, Anxious) and see how it impacts your bottom line.
- **Offline / Local Encrypted Storage**: Powered by `@react-native-async-storage/async-storage` — works 100% offline without requiring a server.
- **Instant Demo Mode**: 1-click preview mode with realistic preloaded trades.

### How to Run the Mobile App on Your Phone:
1. Install **Expo Go** from the Google Play Store (Android) or App Store (iOS).
2. On your computer, open a terminal in the `mobile` folder:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. Scan the QR code shown in your terminal using:
   - **Android**: The QR scanner inside the Expo Go app.
   - **iOS**: The Camera app.
4. The TradeMind mobile app will instantly load on your phone!

---

## 🌐 Web App (Vite + React)

- **Production Live URL**: [https://uniqabhishek.github.io/Trading-Journal/](https://uniqabhishek.github.io/Trading-Journal/)
- **Local Development**:
  ```bash
  npm install
  npm run dev
  ```

---

## 🖥️ Backend API (Flask — Optional)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
```
