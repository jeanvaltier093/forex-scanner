// pages/api/check-trades.js
// Checks current prices for active trades to see if TP or SL was hit

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const { trades } = req.body;
  if (!trades || !trades.length) return res.status(200).json({ updates: [] });

  const updates = [];

  for (const trade of trades) {
    try {
      const url = `https://api.twelvedata.com/price?symbol=${trade.pair}&apikey=${apiKey}`;
      const r = await fetch(url);
      const data = await r.json();

      if (!data.price) continue;

      const currentPrice = parseFloat(data.price);
      const tp = parseFloat(trade.tp);
      const sl = parseFloat(trade.sl);
      const entry = parseFloat(trade.entryPrice);

      let closed = false;
      let result = null;
      let closePrice = null;

      if (trade.direction === 'BUY') {
        if (currentPrice >= tp) { closed = true; result = 'WIN'; closePrice = tp; }
        else if (currentPrice <= sl) { closed = true; result = 'LOSS'; closePrice = sl; }
      } else {
        if (currentPrice <= tp) { closed = true; result = 'WIN'; closePrice = tp; }
        else if (currentPrice >= sl) { closed = true; result = 'LOSS'; closePrice = sl; }
      }

      if (closed) {
        const decimals = trade.pair.includes('JPY') ? 3 : 5;
        const pips = trade.direction === 'BUY'
          ? ((closePrice - entry) / (trade.pair.includes('JPY') ? 0.01 : 0.0001)).toFixed(1)
          : ((entry - closePrice) / (trade.pair.includes('JPY') ? 0.01 : 0.0001)).toFixed(1);

        updates.push({
          pair: trade.pair,
          result,
          closePrice: closePrice.toFixed(decimals),
          pips,
          closedAt: new Date().toISOString()
        });
      } else {
        updates.push({
          pair: trade.pair,
          result: null,
          currentPrice: currentPrice.toFixed(trade.pair.includes('JPY') ? 3 : 5)
        });
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error(`Error checking ${trade.pair}:`, e);
    }
  }

  res.status(200).json({ updates });
}
