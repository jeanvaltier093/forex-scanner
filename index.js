// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

function formatPrice(price, pair) {
  if (!price) return '-';
  if (pair?.includes('JPY')) return price.toFixed(3);
  return price.toFixed(5);
}

function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function countdown(nextUpdate) {
  if (!nextUpdate) return '10:00';
  const diff = new Date(nextUpdate) - new Date();
  if (diff <= 0) return '00:00';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function SignalCard({ signal }) {
  const isBuy = signal.direction === 'BUY';
  return (
    <div className={`signal-card ${isBuy ? 'buy' : 'sell'}`}>
      <div className="signal-header">
        <div className="pair-name">{signal.pair}</div>
        <div className={`direction-badge ${isBuy ? 'buy' : 'sell'}`}>
          {isBuy ? '▲ ACHAT' : '▼ VENTE'}
        </div>
        <div className="reliability">
          <div className="reliability-bar">
            <div className="reliability-fill" style={{ width: `${signal.reliability}%` }} />
          </div>
          <span>{signal.reliability}%</span>
        </div>
      </div>
      <div className="signal-prices">
        <div className="price-item">
          <span className="label">ENTRÉE</span>
          <span className="value">{formatPrice(signal.price, signal.pair)}</span>
        </div>
        <div className="price-item sl">
          <span className="label">SL</span>
          <span className="value">{formatPrice(signal.sl, signal.pair)}</span>
        </div>
        <div className="price-item tp">
          <span className="label">TP</span>
          <span className="value">{formatPrice(signal.tp, signal.pair)}</span>
        </div>
        {signal.currentPrice && (
          <div className="price-item current">
            <span className="label">ACTUEL</span>
            <span className="value">{formatPrice(signal.currentPrice, signal.pair)}</span>
          </div>
        )}
      </div>
      <div className="signal-reasons">
        {signal.reasons?.map((r, i) => <span key={i} className="reason-tag">{r}</span>)}
      </div>
      <div className="signal-footer">
        <span className="signal-time">{formatTime(signal.timestamp)}</span>
        <span className="ratio-badge">R:R 1:1.5</span>
      </div>
    </div>
  );
}

function HistoryRow({ trade, index }) {
  const isWin = trade.status === 'WIN';
  return (
    <tr className={isWin ? 'win-row' : 'loss-row'}>
      <td>{index + 1}</td>
      <td className="pair-cell">{trade.pair}</td>
      <td><span className={`dir-tag ${trade.direction.toLowerCase()}`}>{trade.direction === 'BUY' ? '▲' : '▼'} {trade.direction}</span></td>
      <td>{formatPrice(trade.price, trade.pair)}</td>
      <td className="sl-cell">{formatPrice(trade.sl, trade.pair)}</td>
      <td className="tp-cell">{formatPrice(trade.tp, trade.pair)}</td>
      <td>{formatPrice(trade.closePrice, trade.pair)}</td>
      <td><span className={`result-badge ${isWin ? 'win' : 'loss'}`}>{isWin ? '✓ WIN' : '✗ LOSS'}</span></td>
      <td className="rel-cell">{trade.reliability}%</td>
      <td className="time-cell">{formatTime(trade.closeTime)}</td>
    </tr>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState('10:00');
  const [tab, setTab] = useState('signals');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [nextUpdate, setNextUpdate] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/forex');
      if (!res.ok) throw new Error('Erreur API');
      const json = await res.json();
      setData(json);
      setNextUpdate(json.nextUpdate);
      setLastUpdate(json.lastUpdate);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/forex?action=history');
      const json = await res.json();
      setHistory(json);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchHistory();
    const interval = setInterval(() => { fetchData(); fetchHistory(); }, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData, fetchHistory]);

  useEffect(() => {
    const t = setInterval(() => setTimer(countdown(nextUpdate)), 1000);
    return () => clearInterval(t);
  }, [nextUpdate]);

  const signals = data?.signals || [];
  const stats   = data?.stats || history?.stats || {};

  return (
    <>
      <Head>
        <title>ForexSignal Pro — Signaux Trading</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon">◈</span>
              <span className="logo-text">FOREX<em>SIGNAL</em></span>
              <span className="logo-sub">PRO</span>
            </div>
          </div>
          <div className="header-center">
            <div className="stats-bar">
              <div className="stat">
                <span className="stat-n">{stats.active ?? signals.length}</span>
                <span className="stat-l">Actifs</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-n win">{stats.wins ?? 0}</span>
                <span className="stat-l">Gagnants</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-n loss">{stats.losses ?? 0}</span>
                <span className="stat-l">Perdants</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-n accent">{stats.winRate ?? 0}%</span>
                <span className="stat-l">Win Rate</span>
              </div>
            </div>
          </div>
          <div className="header-right">
            <div className="timer-box">
              <span className="timer-label">NEXT SCAN</span>
              <span className="timer-value">{timer}</span>
            </div>
            <div className={`live-dot ${loading ? 'scanning' : 'live'}`} />
          </div>
        </header>

        {/* TABS */}
        <nav className="tabs">
          <button className={`tab ${tab==='signals'?'active':''}`} onClick={() => setTab('signals')}>
            ◈ SIGNAUX ACTIFS <span className="tab-count">{signals.length}</span>
          </button>
          <button className={`tab ${tab==='history'?'active':''}`} onClick={() => { setTab('history'); fetchHistory(); }}>
            ▤ HISTORIQUE <span className="tab-count">{history?.stats?.total ?? 0}</span>
          </button>
        </nav>

        {/* MAIN */}
        <main className="main">
          {error && (
            <div className="error-banner">
              ⚠ {error} — Vérifiez votre clé API Twelve Data dans .env.local
            </div>
          )}

          {tab === 'signals' && (
            <>
              {loading && signals.length === 0 ? (
                <div className="scanning-state">
                  <div className="scan-animation">
                    <div className="scan-ring" />
                    <div className="scan-ring delay1" />
                    <div className="scan-ring delay2" />
                    <span className="scan-text">ANALYSE EN COURS</span>
                  </div>
                  <p>Scan de {23} paires Forex avec 8 indicateurs combinés…</p>
                </div>
              ) : signals.length === 0 ? (
                <div className="no-signal">
                  <div className="no-signal-icon">◈</div>
                  <h2>Aucun signal haute probabilité détecté</h2>
                  <p>Le moteur analyse continuellement les marchés.<br/>Un signal n'est émis que lorsque les conditions sont exceptionnelles.</p>
                  <span>Prochain scan dans <strong>{timer}</strong></span>
                </div>
              ) : (
                <>
                  <div className="update-bar">
                    Dernière analyse : {formatTime(lastUpdate)} · Prochaine : {formatTime(nextUpdate)}
                  </div>
                  <div className="signals-grid">
                    {signals.map(s => <SignalCard key={s.id} signal={s} />)}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'history' && (
            <div className="history-section">
              {history?.stats && (
                <div className="win-rate-banner">
                  <div className="wr-circle">
                    <svg viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#00f5a0" strokeWidth="8"
                        strokeDasharray={`${2.51 * (history.stats.winRate || 0)} 251`}
                        strokeLinecap="round" transform="rotate(-90 50 50)"/>
                    </svg>
                    <span>{history.stats.winRate}%</span>
                  </div>
                  <div className="wr-details">
                    <h3>Taux de Réussite Global</h3>
                    <div className="wr-breakdown">
                      <span className="wr-win">✓ {history.stats.wins} gagnants</span>
                      <span className="wr-loss">✗ {history.stats.losses} perdants</span>
                      <span className="wr-total">Total : {history.stats.total} trades</span>
                    </div>
                  </div>
                </div>
              )}
              {!history?.history?.length ? (
                <div className="no-history">
                  <p>L'historique apparaîtra ici quand les premiers trades seront clôturés.</p>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Paire</th><th>Direction</th>
                        <th>Entrée</th><th>SL</th><th>TP</th><th>Clôture</th>
                        <th>Résultat</th><th>Fiabilité</th><th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.history.map((t, i) => <HistoryRow key={t.id || i} trade={t} index={i} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

        {/* FOOTER */}
        <footer className="footer">
          <span>⚡ 8 indicateurs combinés · RSI · MACD · EMA 20/50/200 · Bollinger · ATR · Stochastique · ADX · CCI</span>
          <span className="footer-sep">·</span>
          <span>Ratio 1:1.5 · Horizon 1-4 jours · Actualisation 10 min</span>
        </footer>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --bg: #050a0e;
          --bg2: #0a1018;
          --bg3: #0f1923;
          --border: rgba(0,245,160,0.12);
          --accent: #00f5a0;
          --accent2: #00b4d8;
          --red: #ff4757;
          --green: #00f5a0;
          --text: #e8f4f0;
          --text2: rgba(232,244,240,0.55);
          --buy: #00f5a0;
          --sell: #ff4757;
        }

        html, body { height: 100%; background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; }

        .app {
          min-height: 100vh;
          display: flex; flex-direction: column;
          background:
            radial-gradient(ellipse 80% 50% at 10% 0%, rgba(0,245,160,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 90% 100%, rgba(0,180,216,0.06) 0%, transparent 60%),
            var(--bg);
        }

        /* HEADER */
        .header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 32px;
          background: rgba(5,10,14,0.85);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
          position: sticky; top: 0; z-index: 100;
        }
        .logo { display: flex; align-items: baseline; gap: 6px; }
        .logo-icon { font-size: 22px; color: var(--accent); }
        .logo-text { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: var(--text); }
        .logo-text em { color: var(--accent); font-style: normal; }
        .logo-sub { font-size: 10px; font-family: 'Space Mono', monospace; color: var(--text2); letter-spacing: 3px; margin-left: 4px; }

        .stats-bar { display: flex; align-items: center; gap: 8px; }
        .stat { text-align: center; padding: 0 16px; }
        .stat-n { display: block; font-size: 22px; font-weight: 800; font-family: 'Space Mono', monospace; }
        .stat-n.win { color: var(--green); }
        .stat-n.loss { color: var(--red); }
        .stat-n.accent { color: var(--accent2); }
        .stat-l { font-size: 10px; color: var(--text2); letter-spacing: 1px; text-transform: uppercase; }
        .stat-divider { width: 1px; height: 30px; background: var(--border); }

        .header-right { display: flex; align-items: center; gap: 14px; }
        .timer-box { text-align: right; }
        .timer-label { display: block; font-size: 9px; color: var(--text2); letter-spacing: 2px; }
        .timer-value { font-size: 20px; font-family: 'Space Mono', monospace; color: var(--accent); font-weight: 700; }
        .live-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
        .live-dot.scanning { animation: pulse 0.8s ease-in-out infinite; background: var(--accent2); }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }

        /* TABS */
        .tabs { display: flex; gap: 2px; padding: 0 32px; background: var(--bg2); border-bottom: 1px solid var(--border); }
        .tab { padding: 14px 24px; background: none; border: none; color: var(--text2); cursor: pointer; font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 1px; border-bottom: 2px solid transparent; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-count { background: var(--border); padding: 2px 8px; border-radius: 20px; font-size: 10px; }
        .tab.active .tab-count { background: rgba(0,245,160,0.2); color: var(--accent); }

        /* MAIN */
        .main { flex: 1; padding: 28px 32px; max-width: 1400px; width: 100%; margin: 0 auto; }

        .update-bar { font-size: 11px; color: var(--text2); font-family: 'Space Mono', monospace; margin-bottom: 20px; }

        /* SIGNALS GRID */
        .signals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }

        .signal-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative; overflow: hidden;
        }
        .signal-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        }
        .signal-card.buy::before { background: linear-gradient(90deg, var(--green), transparent); }
        .signal-card.sell::before { background: linear-gradient(90deg, var(--red), transparent); }
        .signal-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,245,160,0.08); }

        .signal-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
        .pair-name { font-size: 18px; font-weight: 800; letter-spacing: 1px; flex: 1; }
        .direction-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: 'Space Mono', monospace; letter-spacing: 1px; }
        .direction-badge.buy { background: rgba(0,245,160,0.15); color: var(--green); border: 1px solid rgba(0,245,160,0.3); }
        .direction-badge.sell { background: rgba(255,71,87,0.15); color: var(--red); border: 1px solid rgba(255,71,87,0.3); }
        .reliability { display: flex; align-items: center; gap: 6px; font-size: 12px; font-family: 'Space Mono', monospace; color: var(--accent2); }
        .reliability-bar { width: 60px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
        .reliability-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--accent2), var(--accent)); }

        .signal-prices { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
        .price-item { text-align: center; background: var(--bg3); border-radius: 8px; padding: 8px 4px; }
        .price-item .label { display: block; font-size: 9px; color: var(--text2); letter-spacing: 1px; margin-bottom: 4px; }
        .price-item .value { font-size: 11px; font-family: 'Space Mono', monospace; font-weight: 700; }
        .price-item.sl .value { color: var(--red); }
        .price-item.tp .value { color: var(--green); }
        .price-item.current .value { color: var(--accent2); }

        .signal-reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .reason-tag { font-size: 10px; padding: 3px 8px; background: rgba(255,255,255,0.05); border-radius: 4px; color: var(--text2); border: 1px solid rgba(255,255,255,0.08); }

        .signal-footer { display: flex; justify-content: space-between; align-items: center; }
        .signal-time { font-size: 10px; color: var(--text2); font-family: 'Space Mono', monospace; }
        .ratio-badge { font-size: 10px; padding: 2px 8px; background: rgba(0,180,216,0.12); color: var(--accent2); border-radius: 4px; border: 1px solid rgba(0,180,216,0.2); }

        /* SCANNING */
        .scanning-state { display: flex; flex-direction: column; align-items: center; padding: 80px 20px; gap: 24px; }
        .scan-animation { position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
        .scan-ring { position: absolute; border: 2px solid var(--accent); border-radius: 50%; animation: expand 2s ease-out infinite; opacity: 0; }
        .scan-ring:nth-child(1) { width: 40px; height: 40px; }
        .scan-ring:nth-child(2) { width: 70px; height: 70px; animation-delay: 0.5s; }
        .scan-ring:nth-child(3) { width: 100px; height: 100px; animation-delay: 1s; }
        @keyframes expand { 0% { opacity:0.8; transform:scale(0.5); } 100% { opacity:0; transform:scale(1); } }
        .scan-text { font-size: 10px; font-family: 'Space Mono', monospace; color: var(--accent); letter-spacing: 2px; position: relative; z-index: 1; }
        .scanning-state p { color: var(--text2); font-size: 14px; }

        /* NO SIGNAL */
        .no-signal { text-align: center; padding: 80px 20px; }
        .no-signal-icon { font-size: 48px; color: var(--border); margin-bottom: 20px; display: block; }
        .no-signal h2 { font-size: 20px; margin-bottom: 10px; }
        .no-signal p { color: var(--text2); font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
        .no-signal span { font-size: 13px; color: var(--text2); font-family: 'Space Mono', monospace; }
        .no-signal strong { color: var(--accent); }

        /* ERROR */
        .error-banner { background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.3); border-radius: 8px; padding: 12px 16px; color: var(--red); font-size: 13px; margin-bottom: 20px; font-family: 'Space Mono', monospace; }

        /* HISTORY */
        .win-rate-banner { display: flex; align-items: center; gap: 32px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 24px 32px; margin-bottom: 24px; }
        .wr-circle { position: relative; width: 90px; height: 90px; flex-shrink: 0; }
        .wr-circle svg { width: 100%; height: 100%; }
        .wr-circle span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; font-family: 'Space Mono', monospace; color: var(--accent); }
        .wr-details h3 { font-size: 16px; margin-bottom: 10px; }
        .wr-breakdown { display: flex; gap: 20px; flex-wrap: wrap; }
        .wr-win { color: var(--green); font-family: 'Space Mono', monospace; font-size: 13px; }
        .wr-loss { color: var(--red); font-family: 'Space Mono', monospace; font-size: 13px; }
        .wr-total { color: var(--text2); font-family: 'Space Mono', monospace; font-size: 13px; }

        .table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border); }
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table th { padding: 12px 16px; text-align: left; font-size: 10px; letter-spacing: 1px; color: var(--text2); background: var(--bg2); border-bottom: 1px solid var(--border); font-family: 'Space Mono', monospace; }
        .history-table td { padding: 12px 16px; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); font-family: 'Space Mono', monospace; }
        .win-row { background: rgba(0,245,160,0.02); }
        .loss-row { background: rgba(255,71,87,0.02); }
        .history-table tr:hover td { background: rgba(255,255,255,0.03); }
        .dir-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
        .dir-tag.buy { color: var(--green); }
        .dir-tag.sell { color: var(--red); }
        .result-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .result-badge.win { background: rgba(0,245,160,0.15); color: var(--green); }
        .result-badge.loss { background: rgba(255,71,87,0.15); color: var(--red); }
        .sl-cell { color: var(--red) !important; }
        .tp-cell { color: var(--green) !important; }
        .rel-cell { color: var(--accent2) !important; }
        .time-cell { color: var(--text2) !important; }
        .no-history { padding: 60px; text-align: center; color: var(--text2); }

        /* FOOTER */
        .footer { padding: 14px 32px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text2); font-family: 'Space Mono', monospace; display: flex; gap: 12px; flex-wrap: wrap; }
        .footer-sep { color: var(--accent); }

        @media (max-width: 768px) {
          .header { padding: 14px 16px; flex-wrap: wrap; gap: 10px; }
          .header-center { order: 3; width: 100%; }
          .stats-bar { justify-content: center; }
          .main { padding: 16px; }
          .signals-grid { grid-template-columns: 1fr; }
          .tabs { padding: 0 16px; }
        }
      `}</style>
    </>
  );
}
