// pages/index.js
import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

const PAIR_FLAGS = {
  'EUR/USD': '🇪🇺🇺🇸', 'GBP/USD': '🇬🇧🇺🇸', 'USD/JPY': '🇺🇸🇯🇵',
  'USD/CHF': '🇺🇸🇨🇭', 'AUD/USD': '🇦🇺🇺🇸', 'NZD/USD': '🇳🇿🇺🇸',
  'USD/CAD': '🇺🇸🇨🇦', 'EUR/GBP': '🇪🇺🇬🇧', 'EUR/JPY': '🇪🇺🇯🇵',
  'GBP/JPY': '🇬🇧🇯🇵', 'EUR/CHF': '🇪🇺🇨🇭', 'AUD/JPY': '🇦🇺🇯🇵',
  'USD/MXN': '🇺🇸🇲🇽', 'USD/TRY': '🇺🇸🇹🇷', 'USD/ZAR': '🇺🇸🇿🇦'
};

export default function Home() {
  const [signals, setSignals] = useState([]);
  const [activeTrades, setActiveTrades] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [tab, setTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('forex_active_trades');
    const savedHistory = localStorage.getItem('forex_history');
    if (saved) setActiveTrades(JSON.parse(saved));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    fetchSignals();
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('forex_active_trades', JSON.stringify(activeTrades));
  }, [activeTrades]);

  useEffect(() => {
    localStorage.setItem('forex_history', JSON.stringify(history));
  }, [history]);

  // Auto refresh every 10 min
  useEffect(() => {
    timerRef.current = setInterval(() => {
      fetchSignals();
      checkActiveTrades();
      setCountdown(REFRESH_INTERVAL / 1000);
    }, REFRESH_INTERVAL);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [activeTrades]);

  const showNotification = (msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    try {
      const activeStr = activeTrades.map(t => t.pair).join(',');
      const res = await fetch(`/api/signals?active=${encodeURIComponent(activeStr)}`);
      const data = await res.json();
      const newSignals = data.signals.filter(s => s && s.direction);
      setSignals(newSignals);
      setLastUpdate(new Date());

      // Auto-add strong signals to active trades
      newSignals.forEach(signal => {
        if (signal.reliability >= 75 && !activeTrades.find(t => t.pair === signal.pair)) {
          addToActiveTrades(signal);
        }
      });
    } catch (e) {
      showNotification('Erreur lors de la récupération des signaux', 'error');
    }
    setLoading(false);
  }, [activeTrades]);

  const addToActiveTrades = (signal) => {
    setActiveTrades(prev => {
      if (prev.find(t => t.pair === signal.pair)) return prev;
      showNotification(`🚨 SIGNAL ${signal.direction} sur ${signal.pair} - Fiabilité: ${signal.reliability}%`, 'success');
      return [...prev, { ...signal, addedAt: new Date().toISOString() }];
    });
  };

  const checkActiveTrades = async () => {
    if (!activeTrades.length) return;
    try {
      const res = await fetch('/api/check-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: activeTrades })
      });
      const data = await res.json();

      data.updates.forEach(update => {
        if (update.result) {
          // Move to history
          const trade = activeTrades.find(t => t.pair === update.pair);
          if (trade) {
            setHistory(prev => [{
              ...trade, ...update,
              id: Date.now() + Math.random()
            }, ...prev].slice(0, 100));
            setActiveTrades(prev => prev.filter(t => t.pair !== update.pair));
            showNotification(
              `${update.result === 'WIN' ? '✅ GAIN' : '❌ PERTE'} sur ${update.pair} - ${update.pips > 0 ? '+' : ''}${update.pips} pips`,
              update.result === 'WIN' ? 'success' : 'error'
            );
          }
        }
      });
    } catch (e) {
      console.error('Error checking trades:', e);
    }
  };

  const winRate = history.length > 0
    ? Math.round((history.filter(h => h.result === 'WIN').length / history.length) * 100)
    : 0;

  const totalPips = history.reduce((sum, h) => sum + parseFloat(h.pips || 0), 0);

  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>Forex Signal Pro</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.msg}
          </div>
        )}

        {/* Header */}
        <header className="header">
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon">◈</span>
              <span className="logo-text">FOREX<span className="accent">PRO</span></span>
            </div>
            <div className="status-bar">
              <span className={`pulse-dot ${loading ? 'loading' : 'live'}`}></span>
              <span className="status-text">{loading ? 'ANALYSE...' : 'LIVE'}</span>
            </div>
          </div>
          <div className="header-right">
            <div className="countdown-box">
              <div className="countdown-label">PROCHAIN SCAN</div>
              <div className="countdown-value">{formatCountdown(countdown)}</div>
            </div>
            <button className="refresh-btn" onClick={() => { fetchSignals(); checkActiveTrades(); setCountdown(REFRESH_INTERVAL / 1000); }} disabled={loading}>
              {loading ? '⟳' : '↺'} SCAN
            </button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat">
            <div className="stat-val">{activeTrades.length}</div>
            <div className="stat-label">TRADES ACTIFS</div>
          </div>
          <div className="stat">
            <div className="stat-val">{signals.length}</div>
            <div className="stat-label">SIGNAUX DÉTECTÉS</div>
          </div>
          <div className={`stat ${winRate >= 60 ? 'good' : winRate >= 40 ? 'neutral' : 'bad'}`}>
            <div className="stat-val">{winRate}%</div>
            <div className="stat-label">WIN RATE</div>
          </div>
          <div className={`stat ${totalPips >= 0 ? 'good' : 'bad'}`}>
            <div className="stat-val">{totalPips >= 0 ? '+' : ''}{totalPips.toFixed(1)}</div>
            <div className="stat-label">TOTAL PIPS</div>
          </div>
          <div className="stat">
            <div className="stat-val">{history.length}</div>
            <div className="stat-label">TRADES CLÔTURÉS</div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="tabs">
          {['dashboard', 'actifs', 'historique'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'dashboard' && '📡 SIGNAUX'}
              {t === 'actifs' && `⚡ ACTIFS (${activeTrades.length})`}
              {t === 'historique' && `📋 HISTORIQUE (${history.length})`}
            </button>
          ))}
        </nav>

        <main className="main">
          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div className="section">
              {lastUpdate && (
                <div className="update-info">
                  Dernière analyse : {lastUpdate.toLocaleTimeString('fr-FR')}
                </div>
              )}
              {loading && <div className="loading-bar"><div className="loading-fill"></div></div>}
              {!loading && signals.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">◎</div>
                  <div>Aucun signal fort détecté — marché en attente</div>
                  <div className="empty-sub">Les conditions ne sont pas optimales pour trader</div>
                </div>
              )}
              <div className="signals-grid">
                {signals.map((signal, i) => (
                  <div key={i} className={`signal-card ${signal.direction === 'BUY' ? 'buy' : 'sell'}`}>
                    <div className="card-header">
                      <div className="pair-info">
                        <span className="flag">{PAIR_FLAGS[signal.pair]}</span>
                        <span className="pair-name">{signal.pair}</span>
                      </div>
                      <div className={`direction-badge ${signal.direction === 'BUY' ? 'buy' : 'sell'}`}>
                        {signal.direction === 'BUY' ? '▲ BUY' : '▼ SELL'}
                      </div>
                    </div>
                    <div className="reliability-bar">
                      <div className="reliability-label">FIABILITÉ</div>
                      <div className="reliability-track">
                        <div className="reliability-fill" style={{ width: `${signal.reliability}%` }}></div>
                      </div>
                      <div className="reliability-value">{signal.reliability}%</div>
                    </div>
                    <div className="price-grid">
                      <div className="price-item entry">
                        <div className="price-label">ENTRÉE</div>
                        <div className="price-val">{signal.entryPrice}</div>
                      </div>
                      <div className="price-item tp">
                        <div className="price-label">TP ✓</div>
                        <div className="price-val">{signal.tp}</div>
                      </div>
                      <div className="price-item sl">
                        <div className="price-label">SL ✗</div>
                        <div className="price-val">{signal.sl}</div>
                      </div>
                    </div>
                    <div className="indicators-row">
                      <span className="ind">RSI {signal.rsi}</span>
                      <span className="ind">ADX {signal.adx}</span>
                      <span className="ind">STOCH {signal.stochK}</span>
                    </div>
                    <div className="reasons">
                      {signal.reasons?.map((r, j) => <span key={j} className="reason-tag">{r}</span>)}
                    </div>
                    <button className="trade-btn" onClick={() => addToActiveTrades(signal)}>
                      PRENDRE LE SIGNAL →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE TRADES */}
          {tab === 'actifs' && (
            <div className="section">
              {activeTrades.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">⚡</div>
                  <div>Aucun trade actif</div>
                  <div className="empty-sub">Les signaux détectés seront automatiquement ajoutés ici</div>
                </div>
              ) : (
                <div className="trades-list">
                  {activeTrades.map((trade, i) => (
                    <div key={i} className={`trade-row ${trade.direction === 'BUY' ? 'buy' : 'sell'}`}>
                      <div className="trade-main">
                        <span className="flag">{PAIR_FLAGS[trade.pair]}</span>
                        <span className="trade-pair">{trade.pair}</span>
                        <span className={`dir-badge ${trade.direction === 'BUY' ? 'buy' : 'sell'}`}>
                          {trade.direction === 'BUY' ? '▲' : '▼'} {trade.direction}
                        </span>
                        <span className="trade-entry">@ {trade.entryPrice}</span>
                      </div>
                      <div className="trade-levels">
                        <span className="tp-level">TP: {trade.tp}</span>
                        <span className="sl-level">SL: {trade.sl}</span>
                        <span className="reliability-badge">{trade.reliability}% fiable</span>
                      </div>
                      <div className="trade-meta">
                        <span className="trade-time">
                          {new Date(trade.timestamp).toLocaleString('fr-FR')}
                        </span>
                        <span className="pause-badge">⏸ EN COURS</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY */}
          {tab === 'historique' && (
            <div className="section">
              {history.length > 0 && (
                <div className="history-summary">
                  <div className={`summary-stat ${winRate >= 60 ? 'good' : 'bad'}`}>
                    <div className="sum-val">{winRate}%</div>
                    <div className="sum-label">WIN RATE</div>
                  </div>
                  <div className="summary-stat">
                    <div className="sum-val">{history.filter(h => h.result === 'WIN').length}</div>
                    <div className="sum-label">GAGNANTS</div>
                  </div>
                  <div className="summary-stat">
                    <div className="sum-val">{history.filter(h => h.result === 'LOSS').length}</div>
                    <div className="sum-label">PERDANTS</div>
                  </div>
                  <div className={`summary-stat ${totalPips >= 0 ? 'good' : 'bad'}`}>
                    <div className="sum-val">{totalPips >= 0 ? '+' : ''}{totalPips.toFixed(1)}</div>
                    <div className="sum-label">PIPS TOTAL</div>
                  </div>
                </div>
              )}
              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <div>Historique vide</div>
                  <div className="empty-sub">Les trades clôturés apparaîtront ici</div>
                </div>
              ) : (
                <div className="history-table">
                  <div className="table-header">
                    <span>PAIRE</span><span>DIR.</span><span>ENTRÉE</span>
                    <span>CLÔTURE</span><span>PIPS</span><span>RÉSULTAT</span><span>DATE</span>
                  </div>
                  {history.map((h, i) => (
                    <div key={i} className={`history-row ${h.result === 'WIN' ? 'win' : 'loss'}`}>
                      <span><span className="flag">{PAIR_FLAGS[h.pair]}</span>{h.pair}</span>
                      <span className={h.direction === 'BUY' ? 'buy-text' : 'sell-text'}>{h.direction}</span>
                      <span>{h.entryPrice}</span>
                      <span>{h.closePrice}</span>
                      <span className={parseFloat(h.pips) >= 0 ? 'buy-text' : 'sell-text'}>
                        {parseFloat(h.pips) >= 0 ? '+' : ''}{h.pips}
                      </span>
                      <span className={`result-badge ${h.result === 'WIN' ? 'win' : 'loss'}`}>
                        {h.result === 'WIN' ? '✅ GAIN' : '❌ PERTE'}
                      </span>
                      <span className="date-small">
                        {new Date(h.closedAt).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {history.length > 0 && (
                <button className="clear-btn" onClick={() => { if(confirm('Effacer tout l\'historique ?')) setHistory([]); }}>
                  🗑 Effacer l'historique
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
          --bg: #080c14;
          --bg2: #0d1320;
          --bg3: #111827;
          --border: #1e2d45;
          --accent: #00d4ff;
          --accent2: #00ff88;
          --buy: #00ff88;
          --sell: #ff4466;
          --text: #e8edf5;
          --muted: #5a7090;
          --gold: #ffd700;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; min-height: 100vh; }
        .app { max-width: 1400px; margin: 0 auto; padding: 0 16px; }

        /* Notification */
        .notification {
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          padding: 14px 20px; border-radius: 8px; font-family: 'Space Mono', monospace;
          font-size: 13px; max-width: 400px; animation: slideIn 0.3s ease;
          backdrop-filter: blur(10px); border: 1px solid;
        }
        .notification.success { background: rgba(0,255,136,0.15); border-color: var(--buy); color: var(--buy); }
        .notification.error { background: rgba(255,68,102,0.15); border-color: var(--sell); color: var(--sell); }
        .notification.info { background: rgba(0,212,255,0.15); border-color: var(--accent); color: var(--accent); }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: none; opacity: 1; } }

        /* Header */
        .header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 0; border-bottom: 1px solid var(--border);
        }
        .header-left { display: flex; align-items: center; gap: 24px; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon { font-size: 28px; color: var(--accent); filter: drop-shadow(0 0 10px var(--accent)); }
        .logo-text { font-size: 24px; font-weight: 800; letter-spacing: 4px; }
        .accent { color: var(--accent); }
        .status-bar { display: flex; align-items: center; gap: 8px; }
        .pulse-dot {
          width: 8px; height: 8px; border-radius: 50%;
        }
        .pulse-dot.live { background: var(--buy); box-shadow: 0 0 0 0 rgba(0,255,136,0.4); animation: pulse 2s infinite; }
        .pulse-dot.loading { background: var(--gold); animation: blink 0.5s infinite; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(0,255,136,0.4); } 50% { box-shadow: 0 0 0 8px rgba(0,255,136,0); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .status-text { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 2px; }
        .header-right { display: flex; align-items: center; gap: 16px; }
        .countdown-box { text-align: center; }
        .countdown-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; }
        .countdown-value { font-family: 'Space Mono', monospace; font-size: 20px; color: var(--accent); }
        .refresh-btn {
          background: transparent; border: 1px solid var(--accent); color: var(--accent);
          padding: 10px 20px; cursor: pointer; font-family: 'Space Mono', monospace;
          font-size: 12px; letter-spacing: 2px; transition: all 0.2s;
          border-radius: 4px;
        }
        .refresh-btn:hover { background: var(--accent); color: var(--bg); }
        .refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Stats Bar */
        .stats-bar {
          display: flex; gap: 0; border: 1px solid var(--border);
          border-radius: 8px; margin: 16px 0; overflow: hidden;
        }
        .stat {
          flex: 1; padding: 14px 16px; text-align: center;
          border-right: 1px solid var(--border); background: var(--bg2);
        }
        .stat:last-child { border-right: none; }
        .stat.good .stat-val { color: var(--buy); }
        .stat.bad .stat-val { color: var(--sell); }
        .stat-val { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; }
        .stat-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; margin-top: 4px; }

        /* Tabs */
        .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
        .tab {
          background: none; border: none; color: var(--muted); padding: 14px 24px;
          cursor: pointer; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
          letter-spacing: 1px; border-bottom: 2px solid transparent; transition: all 0.2s;
        }
        .tab:hover { color: var(--text); }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        /* Loading */
        .loading-bar { height: 2px; background: var(--border); border-radius: 2px; margin-bottom: 16px; overflow: hidden; }
        .loading-fill { height: 100%; background: var(--accent); animation: loading 1.5s ease infinite; }
        @keyframes loading { 0% { width: 0%; margin-left: 0; } 50% { width: 60%; margin-left: 20%; } 100% { width: 0%; margin-left: 100%; } }

        .update-info { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted); margin-bottom: 16px; letter-spacing: 1px; }

        /* Empty State */
        .empty-state {
          text-align: center; padding: 80px 20px; color: var(--muted);
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
        .empty-sub { font-size: 13px; margin-top: 8px; opacity: 0.6; }

        /* Signal Cards */
        .signals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .signal-card {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;
          padding: 20px; transition: transform 0.2s, box-shadow 0.2s;
          position: relative; overflow: hidden;
        }
        .signal-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        }
        .signal-card.buy::before { background: linear-gradient(90deg, var(--buy), transparent); }
        .signal-card.sell::before { background: linear-gradient(90deg, var(--sell), transparent); }
        .signal-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.3); }

        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .pair-info { display: flex; align-items: center; gap: 8px; }
        .flag { font-size: 18px; }
        .pair-name { font-size: 18px; font-weight: 800; letter-spacing: 2px; }
        .direction-badge {
          padding: 5px 12px; border-radius: 4px; font-family: 'Space Mono', monospace;
          font-size: 12px; font-weight: 700; letter-spacing: 1px;
        }
        .direction-badge.buy { background: rgba(0,255,136,0.15); color: var(--buy); border: 1px solid var(--buy); }
        .direction-badge.sell { background: rgba(255,68,102,0.15); color: var(--sell); border: 1px solid var(--sell); }

        .reliability-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .reliability-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; white-space: nowrap; }
        .reliability-track { flex: 1; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .reliability-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--buy)); border-radius: 2px; transition: width 0.5s; }
        .reliability-value { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 700; color: var(--accent); white-space: nowrap; }

        .price-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .price-item { background: var(--bg3); border-radius: 6px; padding: 10px; text-align: center; }
        .price-label { font-size: 9px; letter-spacing: 2px; color: var(--muted); margin-bottom: 4px; }
        .price-val { font-family: 'Space Mono', monospace; font-size: 13px; font-weight: 700; }
        .price-item.tp .price-val { color: var(--buy); }
        .price-item.sl .price-val { color: var(--sell); }

        .indicators-row { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
        .ind {
          font-family: 'Space Mono', monospace; font-size: 10px;
          padding: 3px 8px; background: var(--bg3); border-radius: 3px;
          color: var(--muted); border: 1px solid var(--border);
        }
        .reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .reason-tag {
          font-size: 10px; padding: 3px 8px; background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.2); border-radius: 3px; color: var(--accent);
        }
        .trade-btn {
          width: 100%; padding: 12px; background: transparent;
          border: 1px solid var(--accent); color: var(--accent); cursor: pointer;
          font-family: 'Space Mono', monospace; font-size: 12px; letter-spacing: 2px;
          border-radius: 6px; transition: all 0.2s;
        }
        .trade-btn:hover { background: var(--accent); color: var(--bg); }

        /* Active Trades */
        .trades-list { display: flex; flex-direction: column; gap: 12px; }
        .trade-row {
          background: var(--bg2); border: 1px solid var(--border); border-radius: 8px;
          padding: 16px; display: flex; flex-direction: column; gap: 10px;
          border-left: 3px solid;
        }
        .trade-row.buy { border-left-color: var(--buy); }
        .trade-row.sell { border-left-color: var(--sell); }
        .trade-main { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .trade-pair { font-size: 16px; font-weight: 800; letter-spacing: 2px; }
        .dir-badge {
          padding: 3px 10px; border-radius: 3px; font-family: 'Space Mono', monospace; font-size: 11px;
        }
        .dir-badge.buy { background: rgba(0,255,136,0.15); color: var(--buy); }
        .dir-badge.sell { background: rgba(255,68,102,0.15); color: var(--sell); }
        .trade-entry { font-family: 'Space Mono', monospace; font-size: 13px; color: var(--muted); }
        .trade-levels { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .tp-level { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--buy); }
        .sl-level { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--sell); }
        .reliability-badge { font-size: 11px; color: var(--accent); background: rgba(0,212,255,0.1); padding: 2px 8px; border-radius: 3px; }
        .trade-meta { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .trade-time { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted); }
        .pause-badge { font-size: 11px; color: var(--gold); background: rgba(255,215,0,0.1); padding: 2px 8px; border-radius: 3px; }

        /* History */
        .history-summary {
          display: flex; gap: 0; border: 1px solid var(--border); border-radius: 8px;
          overflow: hidden; margin-bottom: 20px;
        }
        .summary-stat {
          flex: 1; padding: 16px; text-align: center; background: var(--bg2);
          border-right: 1px solid var(--border);
        }
        .summary-stat:last-child { border-right: none; }
        .summary-stat.good .sum-val { color: var(--buy); }
        .summary-stat.bad .sum-val { color: var(--sell); }
        .sum-val { font-family: 'Space Mono', monospace; font-size: 24px; font-weight: 700; }
        .sum-label { font-size: 9px; color: var(--muted); letter-spacing: 2px; margin-top: 4px; }

        .history-table { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .table-header {
          display: grid; grid-template-columns: 1.5fr 0.7fr 1fr 1fr 0.7fr 1fr 1.2fr;
          padding: 12px 16px; background: var(--bg3); border-bottom: 1px solid var(--border);
          font-size: 9px; color: var(--muted); letter-spacing: 2px; font-family: 'Space Mono', monospace;
        }
        .history-row {
          display: grid; grid-template-columns: 1.5fr 0.7fr 1fr 1fr 0.7fr 1fr 1.2fr;
          padding: 12px 16px; border-bottom: 1px solid var(--border);
          font-size: 12px; font-family: 'Space Mono', monospace; align-items: center;
          transition: background 0.2s;
        }
        .history-row:hover { background: var(--bg3); }
        .history-row.win { border-left: 2px solid var(--buy); }
        .history-row.loss { border-left: 2px solid var(--sell); }
        .history-row:last-child { border-bottom: none; }
        .buy-text { color: var(--buy); }
        .sell-text { color: var(--sell); }
        .result-badge { padding: 3px 8px; border-radius: 3px; font-size: 11px; }
        .result-badge.win { background: rgba(0,255,136,0.15); color: var(--buy); }
        .result-badge.loss { background: rgba(255,68,102,0.15); color: var(--sell); }
        .date-small { font-size: 10px; color: var(--muted); }

        .clear-btn {
          margin-top: 16px; background: transparent; border: 1px solid var(--sell);
          color: var(--sell); padding: 10px 20px; cursor: pointer;
          font-family: 'Space Mono', monospace; font-size: 11px; letter-spacing: 1px;
          border-radius: 4px; transition: all 0.2s;
        }
        .clear-btn:hover { background: var(--sell); color: white; }

        @media (max-width: 768px) {
          .stats-bar { flex-wrap: wrap; }
          .stat { min-width: 50%; border-right: none; border-bottom: 1px solid var(--border); }
          .table-header, .history-row { grid-template-columns: 1fr 0.5fr 0.8fr 0.8fr 0.6fr 0.8fr; font-size: 10px; }
          .table-header span:last-child, .history-row span:last-child { display: none; }
          .countdown-box { display: none; }
        }
      `}</style>
    </>
  );
}
