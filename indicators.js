// ============================================================
// INDICATEURS TECHNIQUES - CALCULS MATHÉMATIQUES
// ============================================================

export function calcSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function calcEMA(data, period) {
  const k = 2 / (period + 1);
  const result = [];
  let ema = null;
  for (let i = 0; i < data.length; i++) {
    if (ema === null) {
      if (i < period - 1) { result.push(null); continue; }
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(ema);
    } else {
      ema = data[i] * k + ema * (1 - k);
      result.push(ema);
    }
  }
  return result;
}

export function calcRSI(closes, period = 14) {
  const result = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(null); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) { result.push(100); continue; }
    const rs = avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

export function calcMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast);
  const emaSlow = calcEMA(closes, slow);
  const macdLine = closes.map((_, i) =>
    emaFast[i] !== null && emaSlow[i] !== null ? emaFast[i] - emaSlow[i] : null
  );
  const validMacd = macdLine.filter(v => v !== null);
  const signalEma = calcEMA(validMacd, signal);
  const signalFull = macdLine.map((v, i) => {
    if (v === null) return null;
    const idx = macdLine.slice(0, i + 1).filter(x => x !== null).length - 1;
    return signalEma[idx] ?? null;
  });
  const histogram = macdLine.map((v, i) =>
    v !== null && signalFull[i] !== null ? v - signalFull[i] : null
  );
  return { macd: macdLine, signal: signalFull, histogram };
}

export function calcBollinger(closes, period = 20, multiplier = 2) {
  const sma = calcSMA(closes, period);
  return closes.map((_, i) => {
    if (sma[i] === null) return { upper: null, middle: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const std = Math.sqrt(slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period);
    return { upper: mean + multiplier * std, middle: mean, lower: mean - multiplier * std };
  });
}

export function calcATR(highs, lows, closes, period = 14) {
  const tr = closes.map((_, i) => {
    if (i === 0) return highs[i] - lows[i];
    return Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  });
  return calcSMA(tr, period);
}

export function calcStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const k = closes.map((_, i) => {
    if (i < kPeriod - 1) return null;
    const high = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const low = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    return high === low ? 50 : ((closes[i] - low) / (high - low)) * 100;
  });
  const validK = k.filter(v => v !== null);
  const dEma = calcSMA(validK, dPeriod);
  const d = k.map((v, i) => {
    if (v === null) return null;
    const idx = k.slice(0, i + 1).filter(x => x !== null).length - 1;
    return dEma[idx] ?? null;
  });
  return { k, d };
}

export function calcADX(highs, lows, closes, period = 14) {
  const adx = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period * 2) { adx.push(null); continue; }
    let plusDM = 0, minusDM = 0, tr = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const upMove = highs[j] - highs[j - 1];
      const downMove = lows[j - 1] - lows[j];
      if (upMove > downMove && upMove > 0) plusDM += upMove;
      if (downMove > upMove && downMove > 0) minusDM += downMove;
      tr += Math.max(
        highs[j] - lows[j],
        Math.abs(highs[j] - closes[j - 1]),
        Math.abs(lows[j] - closes[j - 1])
      );
    }
    const plusDI = tr > 0 ? (plusDM / tr) * 100 : 0;
    const minusDI = tr > 0 ? (minusDM / tr) * 100 : 0;
    const dx = plusDI + minusDI > 0 ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100 : 0;
    adx.push({ adx: dx, plusDI, minusDI });
  }
  return adx;
}

export function calcCCI(highs, lows, closes, period = 20) {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1).map((c, j) => (highs[i - period + 1 + j] + lows[i - period + 1 + j] + c) / 3);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const meanDev = slice.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    return meanDev === 0 ? 0 : (tp - mean) / (0.015 * meanDev);
  });
}
