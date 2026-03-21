// ============================================================
// MOTEUR DE SIGNAUX - COMBINAISON DES INDICATEURS
// ============================================================
import {
  calcEMA, calcRSI, calcMACD, calcBollinger,
  calcATR, calcStochastic, calcADX, calcCCI
} from './indicators';

const RATIO_TP_SL = 1.5; // TP = SL * 1.5

export function generateSignal(pair, candles) {
  if (!candles || candles.length < 60) return null;

  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const n = closes.length - 1;

  // --- Calcul indicateurs ---
  const ema20  = calcEMA(closes, 20);
  const ema50  = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const rsi    = calcRSI(closes, 14);
  const macd   = calcMACD(closes, 12, 26, 9);
  const bb     = calcBollinger(closes, 20, 2);
  const atr    = calcATR(highs, lows, closes, 14);
  const stoch  = calcStochastic(highs, lows, closes, 14, 3);
  const adxArr = calcADX(highs, lows, closes, 14);
  const cci    = calcCCI(highs, lows, closes, 20);

  const price   = closes[n];
  const rsiNow  = rsi[n];
  const macdNow = macd.macd[n];
  const macdSig = macd.signal[n];
  const macdH   = macd.histogram[n];
  const macdHp  = macd.histogram[n - 1];
  const bbNow   = bb[n];
  const atrNow  = atr[n];
  const stochK  = stoch.k[n];
  const stochD  = stoch.d[n];
  const adxNow  = adxArr[n];
  const cciNow  = cci[n];
  const ema20N  = ema20[n];
  const ema50N  = ema50[n];
  const ema200N = ema200[n];

  if ([rsiNow, macdNow, macdSig, bbNow?.upper, atrNow, stochK, stochD, adxNow?.adx, cciNow, ema20N, ema50N, ema200N].some(v => v === null || v === undefined)) return null;

  let buyScore  = 0;
  let sellScore = 0;
  const reasons = [];

  // 1. RSI
  if (rsiNow < 35) { buyScore  += 2; reasons.push({ dir: 'BUY',  text: `RSI survendu (${rsiNow.toFixed(1)})` }); }
  if (rsiNow > 65) { sellScore += 2; reasons.push({ dir: 'SELL', text: `RSI suracheté (${rsiNow.toFixed(1)})` }); }
  if (rsiNow > 50 && rsiNow < 65) { buyScore  += 1; }
  if (rsiNow < 50 && rsiNow > 35) { sellScore += 1; }

  // 2. MACD croisement
  if (macdNow > macdSig && macdHp < 0 && macdH > 0) { buyScore  += 3; reasons.push({ dir: 'BUY',  text: 'Croisement MACD haussier' }); }
  if (macdNow < macdSig && macdHp > 0 && macdH < 0) { sellScore += 3; reasons.push({ dir: 'SELL', text: 'Croisement MACD baissier' }); }
  if (macdNow > 0 && macdH > 0) { buyScore  += 1; }
  if (macdNow < 0 && macdH < 0) { sellScore += 1; }

  // 3. EMA alignment
  if (price > ema20N && ema20N > ema50N && ema50N > ema200N) { buyScore  += 3; reasons.push({ dir: 'BUY',  text: 'Alignement EMA20>50>200 haussier' }); }
  if (price < ema20N && ema20N < ema50N && ema50N < ema200N) { sellScore += 3; reasons.push({ dir: 'SELL', text: 'Alignement EMA20<50<200 baissier' }); }
  if (price > ema50N) { buyScore  += 1; }
  if (price < ema50N) { sellScore += 1; }

  // 4. Bollinger Bands
  if (price <= bbNow.lower) { buyScore  += 2; reasons.push({ dir: 'BUY',  text: 'Prix sous bande BB inférieure' }); }
  if (price >= bbNow.upper) { sellScore += 2; reasons.push({ dir: 'SELL', text: 'Prix sur bande BB supérieure' }); }

  // 5. Stochastique
  if (stochK < 20 && stochK > stochD) { buyScore  += 2; reasons.push({ dir: 'BUY',  text: `Stoch survendu + croisement (${stochK.toFixed(1)})` }); }
  if (stochK > 80 && stochK < stochD) { sellScore += 2; reasons.push({ dir: 'SELL', text: `Stoch suracheté + croisement (${stochK.toFixed(1)})` }); }

  // 6. ADX - force de tendance
  if (adxNow.adx > 25) {
    if (adxNow.plusDI > adxNow.minusDI)  { buyScore  += 2; reasons.push({ dir: 'BUY',  text: `ADX fort tendance haussière (${adxNow.adx.toFixed(1)})` }); }
    if (adxNow.plusDI < adxNow.minusDI) { sellScore += 2; reasons.push({ dir: 'SELL', text: `ADX fort tendance baissière (${adxNow.adx.toFixed(1)})` }); }
  }

  // 7. CCI
  if (cciNow < -100) { buyScore  += 2; reasons.push({ dir: 'BUY',  text: `CCI survendu (${cciNow.toFixed(0)})` }); }
  if (cciNow >  100) { sellScore += 2; reasons.push({ dir: 'SELL', text: `CCI suracheté (${cciNow.toFixed(0)})` }); }

  const totalScore = buyScore + sellScore;
  const maxScore = 18;

  // Seuil minimum : 10/18 points ET domination claire
  const dominates = Math.abs(buyScore - sellScore) >= 5;
  const threshold = buyScore >= 10 || sellScore >= 10;
  if (!dominates || !threshold) return null;

  const direction = buyScore > sellScore ? 'BUY' : 'SELL';
  const score     = direction === 'BUY' ? buyScore : sellScore;
  const reliability = Math.min(95, Math.round(50 + (score / maxScore) * 50));

  // SL/TP basé sur ATR
  const slPips = atrNow * 1.5;
  const tpPips = slPips * RATIO_TP_SL;
  const sl = direction === 'BUY' ? price - slPips : price + slPips;
  const tp = direction === 'BUY' ? price + tpPips : price - tpPips;

  return {
    pair,
    direction,
    price: parseFloat(price.toFixed(5)),
    sl: parseFloat(sl.toFixed(5)),
    tp: parseFloat(tp.toFixed(5)),
    reliability,
    reasons: reasons.filter(r => r.dir === direction).map(r => r.text),
    score,
    maxScore,
    timestamp: new Date().toISOString(),
    status: 'OPEN',
    id: `${pair}_${Date.now()}`
  };
}
