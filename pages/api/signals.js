// pages/api/signals.js
// Fetches OHLCV data from Twelve Data and computes multi-indicator signals

const PAIRS = [
  'EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD',
  'NZD/USD','USD/CAD','EUR/GBP','EUR/JPY','GBP/JPY',
  'EUR/CHF','AUD/JPY','USD/MXN','USD/TRY','USD/ZAR'
];

// ─── Technical Indicator Calculations ──────────────────────────────────────

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [ema];
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes, period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  const rsiArr = [];
  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArr.push(100 - 100 / (1 + rs));
  }
  return rsiArr;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const diff = ema26.length;
  const macdLine = ema12.slice(ema12.length - diff).map((v, i) => v - ema26[i]);
  const signal = calcEMA(macdLine, 9);
  const histogram = macdLine.slice(macdLine.length - signal.length).map((v, i) => v - signal[i]);
  return { macdLine: macdLine[macdLine.length - 1], signalLine: signal[signal.length - 1], histogram: histogram[histogram.length - 1] };
}

function calcBollinger(closes, period = 20, stdDev = 2) {
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: mean + stdDev * std, middle: mean, lower: mean - stdDev * std };
}

function calcATR(highs, lows, closes, period = 14) {
  const tr = [];
  for (let i = 1; i < closes.length; i++) {
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  return tr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function calcStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const kValues = [];
  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highSlice = highs.slice(i - kPeriod + 1, i + 1);
    const lowSlice = lows.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...highSlice);
    const ll = Math.min(...lowSlice);
    kValues.push(hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100);
  }
  const dValues = [];
  for (let i = dPeriod - 1; i < kValues.length; i++) {
    dValues.push(kValues.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod);
  }
  return { k: kValues[kValues.length - 1], d: dValues[dValues.length - 1] };
}

function calcADX(highs, lows, closes, period = 14) {
  const trArr = [], plusDM = [], minusDM = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    trArr.push(tr);
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const smoothTR = trArr.slice(-period).reduce((a, b) => a + b, 0);
  const smoothPlus = plusDM.slice(-period).reduce((a, b) => a + b, 0);
  const smoothMinus = minusDM.slice(-period).reduce((a, b) => a + b, 0);
  const plusDI = (smoothPlus / smoothTR) * 100;
  const minusDI = (smoothMinus / smoothTR) * 100;
  const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
  return { adx: dx, plusDI, minusDI };
}

// ─── Signal Engine ──────────────────────────────────────────────────────────

function computeSignal(candles, pair) {
  const closes = candles.map(c => parseFloat(c.close));
  const highs = candles.map(c => parseFloat(c.high));
  const lows = candles.map(c => parseFloat(c.low));
  const currentPrice = closes[closes.length - 1];

  if (closes.length < 60) return null;

  // Calculate all indicators
  const rsiArr = calcRSI(closes, 14);
  const rsi = rsiArr[rsiArr.length - 1];

  const macd = calcMACD(closes);
  const bb = calcBollinger(closes, 20, 2);
  const atr = calcATR(highs, lows, closes, 14);
  const stoch = calcStochastic(highs, lows, closes, 14, 3);
  const adxData = calcADX(highs, lows, closes, 14);

  const ema50Arr = calcEMA(closes, 50);
  const ema200Arr = calcEMA(closes, 200);
  const ema50 = ema50Arr[ema50Arr.length - 1];
  const ema200 = ema200Arr[ema200Arr.length - 1];

  // ─── Scoring System ──────────────────────────────────────
  let buyScore = 0;
  let sellScore = 0;
  const reasons = [];

  // RSI
  if (rsi < 30) { buyScore += 2; reasons.push('RSI survendu'); }
  else if (rsi < 40) { buyScore += 1; reasons.push('RSI zone achat'); }
  else if (rsi > 70) { sellScore += 2; reasons.push('RSI suracheté'); }
  else if (rsi > 60) { sellScore += 1; reasons.push('RSI zone vente'); }

  // MACD
  if (macd.histogram > 0 && macd.macdLine > macd.signalLine) { buyScore += 2; reasons.push('MACD bullish'); }
  else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) { sellScore += 2; reasons.push('MACD bearish'); }

  // Bollinger
  if (currentPrice <= bb.lower) { buyScore += 2; reasons.push('Prix bande basse BB'); }
  else if (currentPrice >= bb.upper) { sellScore += 2; reasons.push('Prix bande haute BB'); }

  // EMA Cross
  if (ema50 > ema200) { buyScore += 1; reasons.push('EMA50 > EMA200 (bull)'); }
  else { sellScore += 1; reasons.push('EMA50 < EMA200 (bear)'); }

  if (currentPrice > ema50) { buyScore += 1; }
  else { sellScore += 1; }

  // Stochastic
  if (stoch.k < 20 && stoch.d < 20) { buyScore += 2; reasons.push('Stoch survendu'); }
  else if (stoch.k > 80 && stoch.d > 80) { sellScore += 2; reasons.push('Stoch suracheté'); }

  // ADX (trend strength)
  const trendStrong = adxData.adx > 25;
  if (trendStrong) {
    if (adxData.plusDI > adxData.minusDI) { buyScore += 1; reasons.push('ADX trend haussier fort'); }
    else { sellScore += 1; reasons.push('ADX trend baissier fort'); }
  }

  // ─── Signal Decision ─────────────────────────────────────
  const totalScore = buyScore + sellScore;
  const minScore = 7; // Minimum score for signal

  let direction = null;
  let score = 0;

  if (buyScore >= minScore && buyScore > sellScore * 1.5) {
    direction = 'BUY';
    score = buyScore;
  } else if (sellScore >= minScore && sellScore > buyScore * 1.5) {
    direction = 'SELL';
    score = sellScore;
  }

  if (!direction) return null;

  // Calculate reliability %
  const reliability = Math.min(95, Math.round(50 + (score / 14) * 45));

  // TP/SL with 1:1.5 ratio
  const slPips = atr * 1.5;
  const tpPips = slPips * 1.5;

  const sl = direction === 'BUY' ? currentPrice - slPips : currentPrice + slPips;
  const tp = direction === 'BUY' ? currentPrice + tpPips : currentPrice - tpPips;

  // Pip precision
  const decimals = pair.includes('JPY') || pair.includes('MXN') || pair.includes('TRY') ? 3 : 5;

  return {
    pair,
    direction,
    entryPrice: currentPrice.toFixed(decimals),
    sl: sl.toFixed(decimals),
    tp: tp.toFixed(decimals),
    reliability,
    reasons: reasons.slice(0, 5),
    rsi: rsi.toFixed(1),
    macdHistogram: macd.histogram.toFixed(6),
    adx: adxData.adx.toFixed(1),
    stochK: stoch.k.toFixed(1),
    timestamp: new Date().toISOString(),
    status: 'ACTIVE'
  };
}

// ─── Fetch Candles from Twelve Data ────────────────────────────────────────

async function fetchCandles(pair, apiKey) {
  const symbol = pair.replace('/', '');
  const url = `https://api.twelvedata.com/time_series?symbol=${pair}&interval=4h&outputsize=200&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.values || data.status === 'error') return null;
  return data.values.reverse(); // oldest first
}

// ─── API Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { active = '' } = req.query;
  const activePairs = active ? active.split(',') : [];

  const results = [];
  const errors = [];

  // Process pairs with delay to respect rate limits (8 req/min on free plan)
  for (const pair of PAIRS) {
    // Skip pairs with active signals
    if (activePairs.includes(pair)) {
      results.push({ pair, skipped: true, reason: 'Signal actif en cours' });
      continue;
    }

    try {
      const candles = await fetchCandles(pair, apiKey);
      if (!candles) { errors.push(pair); continue; }

      const signal = computeSignal(candles, pair);
      results.push(signal || { pair, signal: null });

      // Small delay to avoid rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      errors.push(pair);
    }
  }

  res.status(200).json({ signals: results, errors, timestamp: new Date().toISOString() });
}
