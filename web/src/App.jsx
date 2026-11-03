import React, {useEffect, useState} from 'react'
import {api, getToken} from './api'
import {LayoutDashboard, PlusCircle, History, LogOut, RefreshCw} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const emptyTrade = {
  market:'CRYPTO', exchange:'Delta Exchange', symbol:'BTCUSDT', direction:'LONG',
  status:'CLOSED', entry_price:'', exit_price:'', quantity:'', fees:'0', other_costs:'0',
  gross_pnl:'', strategy:'', emotion:'Confident', tags:'', notes:''
}

function money(n){ return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0)) }

function getEquityData(trades) {
  const closedTrades = trades
    .filter(t => t.status === 'CLOSED' && t.net_pnl !== null)
    .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));

  let cumulativePnl = 0;
  return closedTrades.map(trade => {
    cumulativePnl += Number(trade.net_pnl);
    return {
      date: new Date(trade.closed_at).toLocaleDateString(),
      pnl: cumulativePnl
    };
  });
}

export default function App(){
  const [token,setToken] = useState(getToken())
  const [authMode,setAuthMode] = useState('login')
  const [auth,setAuth] = useState({name:'',email:'',password:''})
  const [user,setUser] = useState(null)
  const [tab,setTab] = useState('dashboard')
  const [stats,setStats] = useState(null)
  const [trades,setTrades] = useState([])
  const [form,setForm] = useState(emptyTrade)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)

  async function load(){
    const [s,t,u] = await Promise.all([api('/dashboard'),api('/trades'),api('/auth/me')])
    setStats(s); setTrades(t); setUser(u)
  }
  useEffect(()=>{ if(token) load().catch(e=>setError(e.message)) },[token])

  async function submitAuth(e){
    e.preventDefault(); setError(''); setBusy(true)
    try{
      const data = await api(`/auth/${authMode}`,{method:'POST',body:JSON.stringify(auth)})
      localStorage.setItem('tm_token',data.access_token); setToken(data.access_token)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function addTrade(e){
    e.preventDefault(); setError(''); setBusy(true)
    try{
      const payload = {
        ...form,
        entry_price:Number(form.entry_price),
        quantity:Number(form.quantity),
        fees:Number(form.fees||0),
        other_costs:Number(form.other_costs||0)
      }
      if(form.exit_price !== '') payload.exit_price=Number(form.exit_price)
      if(form.market==='FOREX' && form.gross_pnl!=='') payload.gross_pnl=Number(form.gross_pnl)

      await api('/trades',{method:'POST',body:JSON.stringify(payload)})
      setForm(emptyTrade); await load(); setTab('history')
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }

  async function removeTrade(id){
    if(!confirm('Delete this trade?')) return
    try{await api(`/trades/${id}`,{method:'DELETE'}); await load()}catch(e){setError(e.message)}
  }

  function logout(){localStorage.removeItem('tm_token');setToken(null);setUser(null);setStats(null);setTrades([])}

  if(!token) return <main className="auth-wrap"><form className="auth-card" onSubmit={submitAuth}>
    <div className="brand-mark">TM</div><h1>TradeMind <span>AI</span></h1><p className="muted">Your trading journal and performance workspace</p>
    {authMode==='register' && <input placeholder="Full name" value={auth.name} onChange={e=>setAuth({...auth,name:e.target.value})} required />}
    <input type="email" placeholder="Email address" value={auth.email} onChange={e=>setAuth({...auth,email:e.target.value})} required />
    <input type="password" placeholder="Password (min 8 chars)" value={auth.password} onChange={e=>setAuth({...auth,password:e.target.value})} required minLength="8" />
    {error && <div className="error">{error}</div>}
    <button disabled={busy}>{busy?'Please wait...':authMode==='login'?'Sign in':'Create account'}</button>
    <p className="switch" onClick={()=>{setAuthMode(authMode==='login'?'register':'login');setError('')}}>{authMode==='login'?'New here? Create an account':'Already registered? Sign in'}</p>
  </form></main>

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="logo"><div className="brand-mark">TM</div><div><b>TradeMind AI</b><small>TRADING JOURNAL</small></div></div>
      <nav>
        <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}><LayoutDashboard size={18}/> Dashboard</button>
        <button className={tab==='add'?'active':''} onClick={()=>setTab('add')}><PlusCircle size={18}/> Add trade</button>
        <button className={tab==='history'?'active':''} onClick={()=>setTab('history')}><History size={18}/> Trade history</button>
      </nav>
      <div className="side-bottom">
        <div className="user-chip">{user?.name || 'Trader'}<small>{user?.email}</small></div>
        <button className="logout" onClick={logout}><LogOut size={17}/> Sign out</button>
      </div>
    </aside>
    <main className="main">
      <header>
        <div><p className="eyebrow">PERSONAL TRADING WORKSPACE</p><h2>{tab==='dashboard'?'Dashboard':tab==='add'?'Record a trade':'Trade history'}</h2></div>
        <button className="ghost" onClick={()=>load()}><RefreshCw size={16}/> Refresh</button>
      </header>
      {error && <div className="error">{error}</div>}

      {tab==='dashboard' && stats && (
        <>
          <section className="stats-grid">
            <Stat title="Net P&L" value={money(stats.net_pnl)} positive={stats.net_pnl>=0}/>
            <Stat title="Total trades" value={stats.total_trades}/>
            <Stat title="Win rate" value={`${stats.win_rate}%`}/>
            <Stat title="Profit factor" value={stats.profit_factor===null?'—':Number(stats.profit_factor).toFixed(2)}/>
          </section>

          <section className="panel">
            <h3>Equity Curve</h3>
            <p className="muted" style={{marginBottom: '20px'}}>Cumulative Net P&L over time</p>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={getEquityData(trades)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#203047" />
                  <XAxis dataKey="date" stroke="#71839c" fontSize={12} />
                  <YAxis stroke="#71839c" fontSize={12} />
                  <Tooltip contentStyle={{backgroundColor: '#111d2e', borderColor: '#203047', color: '#fff'}} />
                  <Line type="monotone" dataKey="pnl" stroke="#34d399" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div><h3>Recent trades</h3><p className="muted">Your latest recorded activity</p></div>
              <button className="text-btn" onClick={()=>setTab('history')}>View all</button>
            </div>
            <TradeTable trades={trades.slice(0,5)} onDelete={removeTrade}/>
          </section>
        </>
      )}

      {tab==='add' && (
        <section className="panel form-panel">
          <h3>Trade details</h3><p className="muted">Record a completed trade or save an open position.</p>
          <form onSubmit={addTrade} className="trade-form">
            <Field label="Market"><select value={form.market} onChange={e=>setForm({...form,market:e.target.value})}><option value="CRYPTO">Crypto</option><option value="FOREX">Forex</option></select></Field>
            <Field label="Exchange / Broker"><input value={form.exchange} onChange={e=>setForm({...form,exchange:e.target.value})} placeholder="e.g. Delta Exchange"/></Field>
            <Field label="Trading pair"><input value={form.symbol} onChange={e=>setForm({...form,symbol:e.target.value.toUpperCase()})} required placeholder="BTCUSDT / EURUSD"/></Field>
            <Field label="Direction"><select value={form.direction} onChange={e=>setForm({...form,direction:e.target.value})}><option value="LONG">Buy / Long</option><option value="SHORT">Sell / Short</option></select></Field>
            <Field label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="CLOSED">Closed</option><option value="OPEN">Open</option></select></Field>
            <Field label="Entry price"><input type="number" step="any" value={form.entry_price} onChange={e=>setForm({...form,entry_price:e.target.value})} required/></Field>
            <Field label="Exit price"><input type="number" step="any" value={form.exit_price} onChange={e=>setForm({...form,exit_price:e.target.value})} disabled={form.status==='OPEN'}/></Field>
            <Field label="Quantity"><input type="number" step="any" min="0.00000001" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} required/></Field>
            <Field label="Fees (account currency)"><input type="number" step="any" value={form.fees} onChange={e=>setForm({...form,fees:e.target.value})}/></Field>
            <Field label="Other costs"><input type="number" step="any" value={form.other_costs} onChange={e=>setForm({...form,other_costs:e.target.value})}/></Field>
            {form.market==='FOREX' && form.status==='CLOSED' && <Field label="Gross P&L (manual for Forex)"><input type="number" step="any" value={form.gross_pnl} onChange={e=>setForm({...form,gross_pnl:e.target.value})} required/></Field>}
            <Field label="Strategy"><input value={form.strategy} onChange={e=>setForm({...form,strategy:e.target.value})} placeholder="Breakout, scalping..."/></Field>

            {/* NEW FIELDS */}
            <Field label="Emotion">
              <select value={form.emotion} onChange={e=>setForm({...form,emotion:e.target.value})}>
                <option value="Confident">Confident</option>
                <option value="Neutral">Neutral</option>
                <option value="FOMO">FOMO</option>
                <option value="Revenge">Revenge Trading</option>
                <option value="Anxious">Anxious</option>
              </select>
            </Field>
            <Field label="Tags (comma separated)">
              <input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="Breakout, High Volume" />
            </Field>

            <div className="full"><label>Trade notes</label><textarea rows="3" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Why did you enter? What did you learn?"/></div>
            <div className="full"><button disabled={busy}>{busy?'Saving...':'Save trade'}</button></div>
          </form>
        </section>
      )}

      {tab==='history' && (
        <section className="panel">
          <div className="panel-head">
            <div><h3>All trades</h3><p className="muted">{trades.length} recorded trades</p></div>
            <button className="primary small" onClick={()=>setTab('add')}>+ Add trade</button>
          </div>
          <TradeTable trades={trades} onDelete={removeTrade}/>
        </section>
      )}

      <footer>TradeMind AI · Journal and education tool · Not financial advice</footer>
    </main>
  </div>
}

function Stat({title,value,positive}){return <div className="stat-card"><p>{title}</p><strong className={positive===undefined?'':positive?'green':'red'}>{value}</strong><span>All recorded closed trades</span></div>}
function Field({label,children}){return <div className="field"><label>{label}</label>{children}</div>}

function TradeTable({trades,onDelete}){
  if(!trades.length) return <div className="empty">No trades yet. Add your first trade to get started.</div>;
  return <div className="table-wrap"><table><thead><tr><th>Pair</th><th>Market</th><th>Side</th><th>Emotion</th><th>Status</th><th>Net P&L</th><th></th></tr></thead><tbody>{trades.map(t=><tr key={t.id}><td><b>{t.symbol}</b><small>{t.exchange||'—'}</small></td><td>{t.market}</td><td><span className={t.direction==='LONG'?'tag green-tag':'tag red-tag'}>{t.direction}</span></td><td>{t.emotion || '—'}</td><td>{t.status}</td><td className={Number(t.net_pnl)>=0?'green':'red'}>{t.net_pnl===null?'Open':money(t.net_pnl)}</td><td><button className="delete" onClick={()=>onDelete(t.id)}>Delete</button></td></tr>)}</tbody></table></div>
}