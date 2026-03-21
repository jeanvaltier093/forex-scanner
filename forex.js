// pages/api/forex.js
// ============================================================
// API BACKEND - TWELVE DATA (GRATUIT, FIABLE, TEMPS RÉEL)
// Clé API gratuite: https://twelvedata.com (500 requêtes/jour)
// ============================================================
import { generateSignal } from '../../lib/signals';

const PAIRS = [
  'EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','NZD/USD',
  'USD/CAD','EUR/GBP','EUR/JPY','GBP/JPY','CHF/JPY','AUD/JPY',
  'EUR/AUD','EUR/CAD','GBP/CAD','GBP/CHF','AUD/CAD','AUD/NZD',
  'USD/MXN','USD/ZAR','USD/TRY','USD/SGD','USD/HKD'
];

// Stockage en mémoire (persisté via Vercel KV ou fichier JSON en prod)
let tradeHistory = [];
let activeSignals = {};

async function fetchCandles(pair, apiKey) {
  const symbol = pair.replace('/', '');
  // Utilisation de l'intervalle 4h pour signaux 1-4 jours
  const url = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=4h&outputsize=200&apikey=${apiKey}`;
  
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const data = await res.json();
    
    if (data.status === 'error' || !data.values) return null;
    
    const candles = data.values.reverse().map(c => ({
      time:  c.datetime,
      open:  parseFloat(c.open),
      high:  parseFloat(c.high),
      low:   parseFloat(c.low),
      close: parseFloat(c.close)
    }));
    
    return candles;
  } catch {
    return null;
  }
}

async function checkActiveSignals(apiKey) {
  const now = Date.now();
  
  for (const [id, signal] of Object.entries(activeSignals)) {
    const candles = await fetchCandles(signal.pair, apiKey);
    if (!candles || candles.length === 0) continue;
    
    const lastPrice = candles[candles.length - 1].close;
    const signalAge = (now - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60);
    
    let closed = false;
    let result = null;
    
    if (signal.direction === 'BUY') {
      if (lastPrice >= signal.tp) { closed = true; result = 'WIN'; }
      if (lastPrice <= signal.sl) { closed = true; result = 'LOSS'; }
    } else {
      if (lastPrice <= signal.tp) { closed = true; result = 'WIN'; }
      if (lastPrice >= signal.sl) { closed = true; result = 'LOSS'; }
    }
    
    // Auto-fermeture après 4 jours
    if (signalAge > 96) { closed = true; result = lastPrice > signal.price ? 
      (signal.direction === 'BUY' ? 'WIN' : 'LOSS') : 
      (signal.direction === 'BUY' ? 'LOSS' : 'WIN'); 
    }
    
    if (closed) {
      const closedSignal = { 
        ...signal, 
        status: result, 
        closePrice: lastPrice,
        closeTime: new Date().toISOString()
      };
      tradeHistory.push(closedSignal);
      delete activeSignals[id];
    } else {
      activeSignals[id] = { ...signal, currentPrice: lastPrice };
    }
  }
}

export default async function handler(req, res) {
  const apiKey = process.env.TWELVE_DATA_API_KEY || 'demo';
  
  if (req.method === 'GET' && req.query.action === 'history') {
    const wins  = tradeHistory.filter(t => t.status === 'WIN').length;
    const total = tradeHistory.length;
    return res.json({
      history: tradeHistory.slice(-100).reverse(),
      stats: { total, wins, losses: total - wins, winRate: total > 0 ? Math.round((wins/total)*100) : 0 }
    });
  }
  
  // Vérification des trades actifs
  await checkActiveSignals(apiKey);
  
  // Scan des nouvelles paires (éviter doublons)
  const activePairs = Object.values(activeSignals).map(s => s.pair);
  const pairsToScan = PAIRS.filter(p => !activePairs.includes(p));
  
  const newSignals = [];
  
  // Limiter à 8 paires par scan pour rester dans les limites API gratuites
  const batch = pairsToScan.slice(0, 8);
  
  for (const pair of batch) {
    const candles = await fetchCandles(pair, apiKey);
    if (!candles) continue;
    
    const signal = generateSignal(pair, candles);
    if (signal) {
      activeSignals[signal.id] = signal;
      newSignals.push(signal);
    }
    
    // Délai pour éviter rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  
  const wins  = tradeHistory.filter(t => t.status === 'WIN').length;
  const total = tradeHistory.length;
  
  res.json({
    signals: Object.values(activeSignals),
    newSignals,
    stats: {
      total, wins,
      losses: total - wins,
      winRate: total > 0 ? Math.round((wins/total)*100) : 0,
      active: Object.keys(activeSignals).length
    },
    lastUpdate: new Date().toISOString(),
    nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
}
