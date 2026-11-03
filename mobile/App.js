import React, {useEffect, useState} from 'react';
import {SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {API_BASE_URL} from './src/config';

export default function App(){
  const [token,setToken]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [trades,setTrades]=useState([]);
  const [stats,setStats]=useState(null);
  const [tab,setTab]=useState('home');

  async function request(path, options={}){
    const res=await fetch(`${API_BASE_URL}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Request failed');
    return data;
  }
  async function login(){
    try{const data=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});setToken(data.access_token);}
    catch(e){Alert.alert('Login failed',e.message);}
  }
  async function refresh(){
    try{const [s,t]=await Promise.all([request('/dashboard'),request('/trades')]);setStats(s);setTrades(t);}
    catch(e){Alert.alert('Could not load data',e.message);}
  }
  useEffect(()=>{if(token)refresh();},[token]);

  return <SafeAreaView style={styles.safe}><StatusBar style="light"/>{!token?
    <View style={styles.login}><Text style={styles.brand}>TradeMind <Text style={{color:'#60a5fa'}}>AI</Text></Text><Text style={styles.muted}>Your personal trading journal</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#71839c" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#71839c" secureTextEntry value={password} onChangeText={setPassword}/>
      <TouchableOpacity style={styles.button} onPress={login}><Text style={styles.buttonText}>Sign in</Text></TouchableOpacity>
      <Text style={styles.muted}>Create your account on the web app for this MVP.</Text>
    </View>
  :
    <><View style={styles.header}><Text style={styles.brand}>TradeMind AI</Text><TouchableOpacity onPress={refresh}><Text style={styles.link}>Refresh</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab==='home'?<><Text style={styles.heading}>Dashboard</Text><View style={styles.card}><Text style={styles.muted}>Net P&L</Text><Text style={styles.big}>{stats?.net_pnl??'—'}</Text></View><View style={styles.row}><View style={styles.cardHalf}><Text style={styles.muted}>Win rate</Text><Text style={styles.metric}>{stats?.win_rate??0}%</Text></View><View style={styles.cardHalf}><Text style={styles.muted}>Trades</Text><Text style={styles.metric}>{stats?.total_trades??0}</Text></View></View></>:<><Text style={styles.heading}>Trade history</Text>{trades.map(t=><View style={styles.trade} key={t.id}><Text style={styles.tradeTitle}>{t.symbol} · {t.direction}</Text><Text style={styles.muted}>{t.market} · {t.status}</Text><Text style={styles.metric}>{t.net_pnl===null?'Open':`Net P&L: ${t.net_pnl}`}</Text></View>)}</>}
      </ScrollView>
      <View style={styles.nav}><TouchableOpacity onPress={()=>setTab('home')}><Text style={styles.link}>Home</Text></TouchableOpacity><TouchableOpacity onPress={()=>setTab('trades')}><Text style={styles.link}>Trades</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setToken('');setStats(null);setTrades([]);}}><Text style={styles.link}>Sign out</Text></TouchableOpacity></View>
    </>}
  </SafeAreaView>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#0b1220'},login:{flex:1,justifyContent:'center',padding:24,gap:14},brand:{color:'#f1f5f9',fontSize:25,fontWeight:'800'},muted:{color:'#8496ae',fontSize:13},input:{backgroundColor:'#111d2e',borderColor:'#2a3a52',borderWidth:1,borderRadius:10,padding:14,color:'#fff'},button:{backgroundColor:'#2563eb',padding:15,borderRadius:10,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'700'},header:{padding:20,borderBottomColor:'#203047',borderBottomWidth:1,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},link:{color:'#60a5fa',fontWeight:'700'},content:{padding:18,gap:14},heading:{color:'#f1f5f9',fontSize:23,fontWeight:'700'},card:{backgroundColor:'#111d2e',borderColor:'#203047',borderWidth:1,borderRadius:14,padding:18,gap:8},big:{color:'#34d399',fontSize:30,fontWeight:'800'},row:{flexDirection:'row',gap:12},cardHalf:{flex:1,backgroundColor:'#111d2e',borderRadius:14,padding:16,gap:8},metric:{color:'#f1f5f9',fontSize:21,fontWeight:'700'},trade:{backgroundColor:'#111d2e',padding:15,borderRadius:12,gap:6},tradeTitle:{color:'#f1f5f9',fontWeight:'700',fontSize:16},nav:{flexDirection:'row',justifyContent:'space-around',padding:16,borderTopColor:'#203047',borderTopWidth:1}
});
