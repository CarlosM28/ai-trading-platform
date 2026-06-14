/**
 * Descarga de velas históricas (OHLC) para backtesting.
 *
 * Cripto → Binance klines (OHLC completo, hasta 1000 velas por petición).
 * Acciones → Yahoo Finance vía proxies CORS públicos (mismo patrón que usa la app
 *            para cargar precios). El 4h de acciones se agrega desde velas de 1h.
 *
 * Limitación v1: una sola petición (sin paginación), así que el histórico está
 * acotado a ~1000 velas. Suficiente para validar estrategias; la paginación para
 * histórico largo es una mejora posterior.
 */

export interface Candle {
  time: number;   // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
}

export type BacktestInterval = '1h' | '4h' | '1D' | '1W';

// Aproximación de periodos por año para cada intervalo (para anualizar el Sharpe).
export const PERIODS_PER_YEAR: Record<BacktestInterval, number> = {
  '1h': 24 * 365,
  '4h': 6 * 365,
  '1D': 365,
  '1W': 52,
};

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'];

function isCrypto(symbol: string, type: 'crypto' | 'stock'): boolean {
  return type === 'crypto' || CRYPTO_SYMBOLS.includes(symbol.toUpperCase());
}

// Agrupa N velas en una sola (open=primera, close=última, high=máx, low=mín).
function aggregateCandles(candles: Candle[], groupSize: number): Candle[] {
  if (groupSize <= 1) return candles;
  const out: Candle[] = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (chunk.length === 0) continue;
    out.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
    });
  }
  return out;
}

// ── Binance (cripto) ──
async function fetchBinanceCandles(symbol: string, interval: BacktestInterval, limit: number): Promise<Candle[]> {
  const map: Record<BacktestInterval, string> = { '1h': '1h', '4h': '4h', '1D': '1d', '1W': '1w' };
  const binInterval = map[interval];
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}USDT&interval=${binInterval}&limit=${Math.min(limit, 1000)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance respondió ${res.status} para ${symbol}`);
  const data = await res.json();
  // Cada kline: [openTime, open, high, low, close, volume, ...]
  return (data as any[]).map(k => ({
    time: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

// ── Yahoo Finance (acciones), vía proxy CORS ──
async function fetchYahooJson(url: string): Promise<any> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  ];
  for (const getProxy of proxies) {
    try {
      const res = await fetch(getProxy(url));
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Proxy de Yahoo falló, probando siguiente...', e);
    }
  }
  throw new Error('No se pudo obtener datos de Yahoo Finance (todos los proxies fallaron)');
}

async function fetchStockCandles(symbol: string, interval: BacktestInterval): Promise<Candle[]> {
  const yahooSymbol = symbol.toUpperCase() === 'ENR1' ? 'ENR.DE' : symbol.toUpperCase();

  // Yahoo no tiene 4h nativo: usamos 1h y agregamos cada 4 velas.
  const cfg: Record<BacktestInterval, { interval: string; range: string; group: number }> = {
    '1h': { interval: '1h', range: '730d', group: 1 },
    '4h': { interval: '1h', range: '730d', group: 4 },
    '1D': { interval: '1d', range: 'max', group: 1 },
    '1W': { interval: '1wk', range: 'max', group: 1 },
  };
  const { interval: yInterval, range, group } = cfg[interval];

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yInterval}&range=${range}`;
  const data = await fetchYahooJson(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo no devolvió datos para ${symbol}`);

  const timestamps: number[] = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const opens: number[] = q.open || [];
  const highs: number[] = q.high || [];
  const lows: number[] = q.low || [];
  const closes: number[] = q.close || [];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const o = opens[i], h = highs[i], l = lows[i], c = closes[i];
    if (o == null || h == null || l == null || c == null) continue; // saltar huecos
    candles.push({ time: timestamps[i] * 1000, open: o, high: h, low: l, close: c });
  }

  return aggregateCandles(candles, group);
}

/**
 * Devuelve las velas históricas OHLC para un activo, ordenadas de más antigua a
 * más reciente. Lanza si no hay datos suficientes.
 */
export async function fetchHistoricalCandles(
  symbol: string,
  type: 'crypto' | 'stock',
  interval: BacktestInterval,
  limit: number = 1000
): Promise<Candle[]> {
  const candles = isCrypto(symbol, type)
    ? await fetchBinanceCandles(symbol, interval, limit)
    : await fetchStockCandles(symbol, interval);

  if (candles.length < 40) {
    throw new Error(`Datos históricos insuficientes para ${symbol} (${candles.length} velas). Prueba otro intervalo.`);
  }
  return candles.slice(-limit);
}
