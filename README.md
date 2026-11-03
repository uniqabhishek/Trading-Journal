# TradeMind AI — MVP Starter

A starter trading journal for Crypto and Forex with a Flask API, React web app, and Expo Android app.

## Included in this MVP
- Register/login with JWT authentication
- Create, list, edit and delete manual trades
- Basic linear quantity-based P&L calculation
- Trading dashboard summary
- Dark responsive React web UI
- Expo mobile starter connected to the same API

## Important financial limitation
The included P&L engine supports simple quantity-based instruments:
- Crypto spot / linear contracts where `quantity` is the underlying quantity and P&L is price difference × quantity.
- It is NOT yet a complete Forex lot/pip calculator, inverse futures calculator, options calculator, or exchange-specific contract calculator.
For Forex, use the manual gross P&L field until instrument specifications and account-currency conversion are implemented. Do not use this starter as a live trading/risk execution system.

## Requirements
- Python 3.10+
- Node.js 20+
- npm
- Expo Go on Android (for mobile preview)

## 1. Start backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux
python run.py
```
API runs at `http://127.0.0.1:5000`.

The default database is SQLite for easy local development. Set `DATABASE_URL` in `.env` to PostgreSQL when ready.

## 2. Start web app
```bash
cd web
npm install
npm run dev
```
Open the URL printed by Vite (normally `http://localhost:5173`).

## 3. Start Android app
```bash
cd mobile
npm install
```
Edit `mobile/src/config.js`:
- Android emulator: `http://10.0.2.2:5000/api`
- Physical Android phone: use your computer's LAN IP, e.g. `http://192.168.1.10:5000/api`
Then run:
```bash
npx expo start
```
Scan the QR code using Expo Go. Your phone and computer must be on the same Wi-Fi.

## Demo workflow
1. Register an account.
2. Log in.
3. Add a Crypto trade with market `CRYPTO`, direction `LONG` or `SHORT`, entry, exit and quantity.
4. Dashboard and history update from the API.

## API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET /api/trades`
- `POST /api/trades`
- `GET /api/trades/<id>`
- `PUT /api/trades/<id>`
- `DELETE /api/trades/<id>`
- `GET /api/health`

All trade routes require `Authorization: Bearer <access_token>`.

## Before production
- Use PostgreSQL and run migrations.
- Add refresh-token rotation, email verification and password reset.
- Add strict per-user authorization tests.
- Store screenshots in private object storage.
- Add Forex pip/lot calculations and contract specifications.
- Add proper exchange/broker directory and instrument metadata.
- Add rate limiting, HTTPS, backups, monitoring and privacy controls.
- Never expose AI provider keys in web or mobile apps.
