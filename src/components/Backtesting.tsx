import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { fetchHistoricalCandles, type BacktestInterval } from '../core/historicalData';
import { runBacktest, type BacktestResult } from '../core/backtester';
import { History, Play, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

const INTERVALS: BacktestInterval[] = ['1h', '4h', '1D', '1W'];

const fmtUsd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });

export const Backtesting: React.FC = () => {
  const { assets, bots } = useTrading();

  const [symbol, setSymbol] = useState<string>('BTC');
  const [botId, setBotId] = useState<string>(bots[0]?.id || '');
  const [interval, setInterval] = useState<BacktestInterval>('1D');
  const [initialBalance, setInitialBalance] = useState<number>(5000);
  const [commissionPct, setCommissionPct] = useState<number>(0.1);
  const [slippagePct, setSlippagePct] = useState<number>(0.05);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<BacktestResult | null>(null);

  const selectedAsset = assets.find(a => a.symbol === symbol);
  const selectedBot = bots.find(b => b.id === botId);
  const isFundamental = selectedBot?.strategyType === 'fundamental';

  const runHandler = async () => {
    if (!selectedAsset || !selectedBot) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const candles = await fetchHistoricalCandles(selectedAsset.symbol, selectedAsset.type, interval, 1000);
      const res = runBacktest(selectedBot, candles, { initialBalance, commissionPct, slippagePct, interval });
      setResult(res);
    } catch (e: any) {
      setError(e?.message || 'Error desconocido al ejecutar el backtest.');
    } finally {
      setLoading(false);
    }
  };

  // Path SVG de la curva de equity
  const equityPath = useMemo(() => {
    if (!result || result.equityCurve.length < 2) return '';
    const data = result.equityCurve;
    const w = 1000, h = 240;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [result]);

  const beatsHold = result ? result.totalReturnPct > result.buyHoldReturnPct : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          <span className="text-gradient-purple">Backtesting</span> de Estrategias
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Prueba cualquier bot sobre datos históricos reales antes de operar. El mismo motor que opera en vivo es el que se simula aquí.
        </p>
      </div>

      {/* Panel de configuración */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          {/* Activo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Activo</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={selectStyle}>
              {assets.map(a => (
                <option key={a.symbol} value={a.symbol} style={{ background: '#121214' }}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bot / Estrategia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estrategia (Bot)</label>
            <select value={botId} onChange={(e) => setBotId(e.target.value)} style={selectStyle}>
              {bots.map(b => (
                <option key={b.id} value={b.id} style={{ background: '#121214' }}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Intervalo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Intervalo de vela</label>
            <select value={interval} onChange={(e) => setInterval(e.target.value as BacktestInterval)} style={selectStyle}>
              {INTERVALS.map(iv => (
                <option key={iv} value={iv} style={{ background: '#121214' }}>{iv}</option>
              ))}
            </select>
          </div>

          {/* Saldo inicial */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo inicial (USD)</label>
            <input type="number" min={100} value={initialBalance}
              onChange={(e) => setInitialBalance(Math.max(100, Number(e.target.value)))} style={inputStyle} />
          </div>

          {/* Comisión */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comisión (%)</label>
            <input type="number" min={0} step={0.01} value={commissionPct}
              onChange={(e) => setCommissionPct(Math.max(0, Number(e.target.value)))} style={inputStyle} />
          </div>

          {/* Slippage */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Slippage (%)</label>
            <input type="number" min={0} step={0.01} value={slippagePct}
              onChange={(e) => setSlippagePct(Math.max(0, Number(e.target.value)))} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={runHandler} disabled={loading || !selectedBot} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: loading ? 'rgba(95,93,236,0.4)' : 'var(--accent-primary)',
            color: 'white', border: 'none', borderRadius: '10px', padding: '12px 22px',
            fontWeight: 700, fontSize: '0.9rem', cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 0 15px rgba(95, 93, 236, 0.2)'
          }}>
            {loading ? <History size={16} className="spin" /> : <Play size={16} />}
            {loading ? 'Ejecutando backtest...' : 'Ejecutar Backtest'}
          </button>
          {isFundamental && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> El bot fundamental no operará: no hay noticias históricas para backtestear sentimiento.
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-card" style={{ padding: '16px 20px', border: '1px solid rgba(255,70,104,0.2)', color: 'var(--color-sell)', fontSize: '0.9rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Resultados */}
      {result && (
        <>
          {/* Comparativa con Buy & Hold */}
          <div className="glass-card" style={{
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
            border: beatsHold ? '1px solid rgba(0,255,170,0.2)' : '1px solid rgba(245,158,11,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {beatsHold ? <TrendingUp size={20} color="var(--color-buy)" /> : <TrendingDown size={20} color="var(--color-warning)" />}
              <span style={{ fontWeight: 700 }}>
                {beatsHold
                  ? 'La estrategia SUPERA a comprar y aguantar (Buy & Hold).'
                  : 'La estrategia NO supera a simplemente comprar y aguantar.'}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Estrategia: <b style={{ color: result.totalReturnPct >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>{fmtPct(result.totalReturnPct)}</b>
              {'   vs   '}
              Buy & Hold: <b style={{ color: result.buyHoldReturnPct >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>{fmtPct(result.buyHoldReturnPct)}</b>
            </span>
          </div>

          {/* Tarjetas de métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            <MetricCard label="Retorno total" value={fmtPct(result.totalReturnPct)} positive={result.totalReturnPct >= 0} />
            <MetricCard label="Equity final" value={fmtUsd(result.finalEquity)} positive={result.finalEquity >= result.initialBalance} />
            <MetricCard label="Máx. drawdown" value={`-${result.maxDrawdownPct.toFixed(2)}%`} positive={false} muted />
            <MetricCard label="Sharpe (anual)" value={result.sharpe.toFixed(2)} positive={result.sharpe >= 1} />
            <MetricCard label="Win rate" value={`${result.winRate.toFixed(1)}%`} positive={result.winRate >= 50} />
            <MetricCard label="Profit factor" value={result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2)} positive={result.profitFactor >= 1} />
            <MetricCard label="Operaciones" value={String(result.numTrades)} positive muted />
            <MetricCard label="Media gan./pérd." value={`${fmtPct(result.avgWinPct)} / ${fmtPct(result.avgLossPct)}`} positive muted />
          </div>

          {/* Curva de equity */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Curva de Equity ({result.candles} velas {interval})</h3>
            <svg viewBox="0 0 1000 240" preserveAspectRatio="none" style={{ width: '100%', height: '240px' }}>
              <path d={equityPath} fill="none" stroke={result.totalReturnPct >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'} strokeWidth={2} />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>{fmtUsd(result.initialBalance)}</span>
              <span>{fmtUsd(result.finalEquity)}</span>
            </div>
          </div>

          {/* Tabla de operaciones */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Operaciones ({result.trades.length})</h3>
            {result.trades.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px', textAlign: 'center' }}>
                La estrategia no abrió ninguna operación en este periodo. Prueba otro activo, intervalo o ajusta los parámetros del bot.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={thStyle}>Entrada</th>
                      <th style={thStyle}>Salida</th>
                      <th style={thStyle}>Precio ent.</th>
                      <th style={thStyle}>Precio sal.</th>
                      <th style={thStyle}>Motivo</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={tdStyle}>{fmtDate(t.entryTime)}</td>
                        <td style={tdStyle}>{fmtDate(t.exitTime)}</td>
                        <td style={tdStyle}>${t.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>${t.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px',
                            background: t.reason === 'TAKE-PROFIT' ? 'rgba(0,255,170,0.1)' : t.reason === 'STOP-LOSS' ? 'rgba(255,70,104,0.1)' : 'rgba(148,163,184,0.1)',
                            color: t.reason === 'TAKE-PROFIT' ? 'var(--color-buy)' : t.reason === 'STOP-LOSS' ? 'var(--color-sell)' : 'var(--text-muted)'
                          }}>{t.reason}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: t.pnl >= 0 ? 'var(--color-buy)' : 'var(--color-sell)', fontWeight: 600 }}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} ({fmtPct(t.pnlPct)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Nota de limitaciones */}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, padding: '0 4px' }}>
            <b>Notas:</b> El backtest es long-only e incluye comisión y slippage como parámetro fijo (no order-book real).
            Los bots técnicos (RSI, MACD, Cruce de Medias) se simulan completos; el bot fundamental y el sub-filtro fundamental
            del de consenso no disparan por falta de noticias históricas. El histórico está limitado a ~1000 velas por intervalo.
            Resultados pasados no garantizan rendimientos futuros.
          </div>
        </>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; positive: boolean; muted?: boolean }> = ({ label, value, positive, muted }) => (
  <div className="glass-card" style={{ padding: '16px' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: muted ? 'var(--text-main)' : positive ? 'var(--color-buy)' : 'var(--color-sell)' }}>
      {value}
    </div>
  </div>
);

const selectStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px',
  padding: '8px 10px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
};
const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px',
  padding: '8px 10px', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', fontWeight: 600
};
const thStyle: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, position: 'sticky', top: 0, background: '#0c0e12' };
const tdStyle: React.CSSProperties = { padding: '8px 10px', color: 'var(--text-main)' };
