import type { Asset } from './marketSimulator';

/**
 * Calcula la Media Móvil Simple (SMA) para un conjunto de precios.
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Calcula la Media Móvil Exponencial (EMA) para un conjunto de precios.
 */
export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return calculateSMA(prices, prices.length);

  const k = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return ema;
}

/**
 * Calcula el Índice de Fuerza Relativa (RSI) de 14 períodos.
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50; // Valor neutro por defecto si no hay suficiente historial

  let gains = 0;
  let losses = 0;

  // Primer cálculo: ganancias y pérdidas medias de los primeros 'period' cambios
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Suavizado Wilder para el resto del historial
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    let currentGain = 0;
    let currentLoss = 0;

    if (diff > 0) {
      currentGain = diff;
    } else {
      currentLoss = -diff;
    }

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

/**
 * Calcula el MACD (12, 26, 9).
 */
export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const result: MACDResult = { macd: 0, signal: 0, histogram: 0 };
  
  if (prices.length < slowPeriod) {
    return result; // No hay suficientes datos para el MACD lento
  }

  // 1. Calcular EMA rápida (12) y lenta (26) para todo el historial
  const macdValues: number[] = [];
  
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    const emaFast = calculateEMA(slice, fastPeriod);
    const emaSlow = calculateEMA(slice, slowPeriod);
    macdValues.push(emaFast - emaSlow);
  }

  // 2. Calcular la Línea de Señal (EMA de 9 períodos sobre la línea MACD)
  if (macdValues.length === 0) return result;

  const currentMacd = macdValues[macdValues.length - 1];
  const currentSignal = calculateEMA(macdValues, signalPeriod);

  return {
    macd: currentMacd,
    signal: currentSignal,
    histogram: currentMacd - currentSignal,
  };
}

export interface SupportResistanceResult {
  support: number;
  resistance: number;
}

/**
 * Calcula dinámicamente los niveles de soporte y resistencia (mínimos y máximos históricos).
 * Excluye la vela actual (último elemento) para detectar niveles históricos reales.
 */
export function calculateSupportResistance(prices: number[], windowSize: number = 20): SupportResistanceResult {
  if (prices.length < 2) {
    const currentPrice = prices[0] || 0;
    return { support: currentPrice, resistance: currentPrice };
  }

  // Excluir el último precio (vela actual que está fluctuando)
  const historicalPrices = prices.slice(0, -1);
  const actualWindow = Math.min(windowSize, historicalPrices.length);
  const slice = historicalPrices.slice(-actualWindow);

  if (slice.length === 0) {
    const currentPrice = prices[prices.length - 1] || 0;
    return { support: currentPrice, resistance: currentPrice };
  }

  const support = Math.min(...slice);
  const resistance = Math.max(...slice);

  return { support, resistance };
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
}

/**
 * Calcula las Bandas de Bollinger (media móvil simple de 20 periodos +/- 2 desviaciones estándar).
 */
export function calculateBollingerBands(prices: number[], period: number = 20): BollingerBandsResult {
  if (prices.length < period) {
    const currentPrice = prices[prices.length - 1] || 0;
    return { upper: currentPrice, middle: currentPrice, lower: currentPrice };
  }

  const slice = prices.slice(-period);
  const middle = calculateSMA(prices, period);
  
  const variance = slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: Number((middle + 2 * stdDev).toFixed(2)),
    middle: Number(middle.toFixed(2)),
    lower: Number((middle - 2 * stdDev).toFixed(2))
  };
}

export interface FibonacciLevelsResult {
  high: number;
  low: number;
  level236: number;
  level382: number;
  level500: number;
  level618: number;
}

/**
 * Calcula los niveles clave de retroceso de Fibonacci en base al rango de una ventana de tiempo.
 */
export function calculateFibonacciLevels(prices: number[], windowSize: number = 50): FibonacciLevelsResult {
  if (prices.length < 2) {
    const currentPrice = prices[0] || 0;
    return {
      high: currentPrice,
      low: currentPrice,
      level236: currentPrice,
      level382: currentPrice,
      level500: currentPrice,
      level618: currentPrice
    };
  }

  const slice = prices.slice(-windowSize);
  const high = Math.max(...slice);
  const low = Math.min(...slice);
  const diff = high - low;

  return {
    high,
    low,
    level236: Number((low + diff * 0.236).toFixed(2)),
    level382: Number((low + diff * 0.382).toFixed(2)),
    level500: Number((low + diff * 0.5).toFixed(2)),
    level618: Number((low + diff * 0.618).toFixed(2))
  };
}

// ═══════════════════════════════════════════════════════════════════
// CT VISION PRO — Funciones de análisis avanzado
// ═══════════════════════════════════════════════════════════════════

export interface MultiTimeframeTrend {
  label: string;
  changePercent: number;
  direction: 'up' | 'down' | 'neutral';
}

/**
 * Calcula la tendencia porcentual para múltiples marcos temporales aproximados
 * a partir del historial de precios disponible.
 * Devuelve 3 entradas: equivalente a ~1H, ~4H, ~1D.
 */
export function calculateMultiTimeframeTrend(prices: number[]): MultiTimeframeTrend[] {
  if (prices.length < 3) {
    return [
      { label: '1D', changePercent: 0, direction: 'neutral' },
      { label: '4H', changePercent: 0, direction: 'neutral' },
      { label: '1H', changePercent: 0, direction: 'neutral' },
    ];
  }

  const current = prices[prices.length - 1];

  // Aproximamos marcos temporales según proporción del historial disponible
  const len = prices.length;
  const idx1H = Math.max(0, len - Math.max(2, Math.floor(len * 0.05)));   // ~5% del historial
  const idx4H = Math.max(0, len - Math.max(4, Math.floor(len * 0.20)));   // ~20% del historial
  const idx1D = Math.max(0, len - Math.max(8, Math.floor(len * 0.60)));   // ~60% del historial

  const calc = (idx: number): { changePercent: number; direction: 'up' | 'down' | 'neutral' } => {
    const ref = prices[idx];
    if (ref === 0) return { changePercent: 0, direction: 'neutral' };
    const pct = ((current - ref) / ref) * 100;
    return {
      changePercent: Number(pct.toFixed(2)),
      direction: pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'neutral',
    };
  };

  return [
    { label: '1D', ...calc(idx1D) },
    { label: '4H', ...calc(idx4H) },
    { label: '1H', ...calc(idx1H) },
  ];
}

export type MarketState = 'ALCISTA' | 'BAJISTA' | 'NEUTRAL';

/**
 * Determina el estado general del mercado basándose en RSI, posición del precio
 * respecto a la SMA20, y la tendencia reciente.
 */
export function determineMarketState(
  prices: number[],
  rsi?: number,
  tvSma20?: number
): MarketState {
  if (prices.length < 5) return 'NEUTRAL';

  const current = prices[prices.length - 1];
  const calculatedRsi = rsi ?? calculateRSI(prices, 14);
  const sma20 = tvSma20 ?? calculateSMA(prices, 20);

  let score = 0;

  // RSI contribución (-2 a +2)
  if (calculatedRsi > 60) score += 1.5;
  else if (calculatedRsi > 55) score += 0.5;
  else if (calculatedRsi < 40) score -= 1.5;
  else if (calculatedRsi < 45) score -= 0.5;

  // Posición vs SMA20 (-1.5 a +1.5)
  if (sma20 > 0) {
    const deviation = ((current - sma20) / sma20) * 100;
    if (deviation > 1) score += 1.5;
    else if (deviation > 0) score += 0.5;
    else if (deviation < -1) score -= 1.5;
    else score -= 0.5;
  }

  // Tendencia de corto plazo (últimos 5 puntos)
  const shortTrend = prices.slice(-5);
  const shortChange = ((shortTrend[shortTrend.length - 1] - shortTrend[0]) / shortTrend[0]) * 100;
  if (shortChange > 0.5) score += 1;
  else if (shortChange < -0.5) score -= 1;

  if (score >= 1.5) return 'ALCISTA';
  if (score <= -1.5) return 'BAJISTA';
  return 'NEUTRAL';
}

export type MarketPhase =
  | 'ACUMULACIÓN'
  | 'DISTRIBUCIÓN'
  | 'MARKUP'
  | 'MARKDOWN'
  | 'RANGING';

export interface MarketPhaseResult {
  phase: MarketPhase;
  confidence: 'ALTA' | 'MEDIA' | 'BAJA';
  emoji: string;
}

/**
 * Detecta la fase del mercado según el modelo de Wyckoff simplificado.
 * Usa la posición del precio vs SMA, volatilidad y dirección de tendencia.
 */
export function determineMarketPhase(
  prices: number[],
  tvSma50?: number
): MarketPhaseResult {
  if (prices.length < 10) {
    return { phase: 'RANGING', confidence: 'BAJA', emoji: '➡️' };
  }

  const current = prices[prices.length - 1];
  const sma50 = tvSma50 ?? calculateSMA(prices, Math.min(50, prices.length));

  // Calcular volatilidad reciente
  const recentSlice = prices.slice(-20);
  const recentHigh = Math.max(...recentSlice);
  const recentLow = Math.min(...recentSlice);
  const volatility = recentHigh > 0 ? ((recentHigh - recentLow) / recentHigh) * 100 : 0;

  // Tendencia de medio plazo
  const midLen = Math.min(30, prices.length);
  const midStart = prices[prices.length - midLen];
  const midChange = midStart > 0 ? ((current - midStart) / midStart) * 100 : 0;

  // Precio vs SMA50
  const aboveSma = sma50 > 0 ? current > sma50 : true;

  // Lógica de clasificación
  if (volatility < 3 && Math.abs(midChange) < 2) {
    // Baja volatilidad, precio lateral → Acumulación o Distribución
    if (aboveSma) {
      return { phase: 'DISTRIBUCIÓN', confidence: 'MEDIA', emoji: '⚠️' };
    }
    return { phase: 'ACUMULACIÓN', confidence: 'MEDIA', emoji: '🔄' };
  }

  if (midChange > 3 && aboveSma) {
    return {
      phase: 'MARKUP',
      confidence: midChange > 8 ? 'ALTA' : 'MEDIA',
      emoji: '🚀',
    };
  }

  if (midChange < -3 && !aboveSma) {
    return {
      phase: 'MARKDOWN',
      confidence: midChange < -8 ? 'ALTA' : 'MEDIA',
      emoji: '📉',
    };
  }

  if (volatility < 5 && Math.abs(midChange) < 4) {
    if (!aboveSma) {
      return { phase: 'ACUMULACIÓN', confidence: 'BAJA', emoji: '🔄' };
    }
    return { phase: 'DISTRIBUCIÓN', confidence: 'BAJA', emoji: '⚠️' };
  }

  if (midChange > 0) {
    return { phase: 'MARKUP', confidence: 'BAJA', emoji: '🚀' };
  }
  return { phase: 'MARKDOWN', confidence: 'BAJA', emoji: '📉' };
}

export interface LiquidityZones {
  majorLiquidity: 'ARRIBA' | 'ABAJO' | 'EQUILIBRIO';
  zoneAbove: number;
  zoneBelow: number;
}

/**
 * Calcula las zonas de liquidez por encima y por debajo del precio actual.
 * Utiliza los niveles de soporte/resistencia para estimar dónde se concentra la liquidez.
 */
export function calculateLiquidityZones(prices: number[]): LiquidityZones {
  if (prices.length < 5) {
    const p = prices[prices.length - 1] || 0;
    return { majorLiquidity: 'EQUILIBRIO', zoneAbove: p, zoneBelow: p };
  }

  const current = prices[prices.length - 1];
  const { support, resistance } = calculateSupportResistance(prices, 30);

  const distanceUp = resistance > current ? ((resistance - current) / current) * 100 : 0;
  const distanceDown = current > support ? ((current - support) / current) * 100 : 0;

  let majorLiquidity: 'ARRIBA' | 'ABAJO' | 'EQUILIBRIO' = 'EQUILIBRIO';
  if (distanceUp < distanceDown * 0.7) {
    majorLiquidity = 'ARRIBA';
  } else if (distanceDown < distanceUp * 0.7) {
    majorLiquidity = 'ABAJO';
  }

  return {
    majorLiquidity,
    zoneAbove: Number(resistance.toFixed(2)),
    zoneBelow: Number(support.toFixed(2)),
  };
}

/**
 * Calcula la sensibilidad del momentum (0–100).
 * Combina la fuerza del RSI y la amplitud del histograma MACD normalizado.
 */
export function calculateMomentumSensitivity(
  prices: number[],
  rsi?: number,
  macdHist?: number
): number {
  if (prices.length < 10) return 50;

  const calculatedRsi = rsi ?? calculateRSI(prices, 14);
  const macdResult = calculateMACD(prices);
  const histogram = macdHist ?? macdResult.histogram;

  // RSI extremo contribuye al momentum (0-50)
  const rsiDist = Math.abs(calculatedRsi - 50);
  const rsiScore = Math.min(50, (rsiDist / 50) * 50);

  // MACD histogram normalizado (0-50)
  const currentPrice = prices[prices.length - 1] || 1;
  const normalizedHist = Math.abs(histogram) / currentPrice * 10000;
  const macdScore = Math.min(50, normalizedHist * 5);

  return Math.round(Math.min(100, rsiScore + macdScore));
}

export interface PressureResult {
  buyPressure: number;    // 0–100
  sellPressure: number;   // 0–100
  dominance: 'COMPRADORES' | 'VENDEDORES' | 'EQUILIBRIO';
}

/**
 * Calcula la presión compradora vs vendedora basándose en la posición
 * del precio actual dentro del rango reciente y la dirección de los cambios.
 */
export function calculatePressure(prices: number[]): PressureResult {
  if (prices.length < 5) {
    return { buyPressure: 50, sellPressure: 50, dominance: 'EQUILIBRIO' };
  }

  const recent = prices.slice(-20);
  const high = Math.max(...recent);
  const low = Math.min(...recent);
  const current = recent[recent.length - 1];

  // Posición en el rango (0 = en el mínimo, 100 = en el máximo)
  const range = high - low;
  const positionInRange = range > 0 ? ((current - low) / range) * 100 : 50;

  // Contar movimientos alcistas vs bajistas
  let upMoves = 0;
  let downMoves = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] > recent[i - 1]) upMoves++;
    else if (recent[i] < recent[i - 1]) downMoves++;
  }
  const totalMoves = upMoves + downMoves || 1;
  const moveRatio = (upMoves / totalMoves) * 100;

  // Combinar ambas métricas
  const buyPressure = Math.round((positionInRange * 0.6 + moveRatio * 0.4));
  const sellPressure = 100 - buyPressure;

  let dominance: 'COMPRADORES' | 'VENDEDORES' | 'EQUILIBRIO' = 'EQUILIBRIO';
  if (buyPressure > 60) dominance = 'COMPRADORES';
  else if (sellPressure > 60) dominance = 'VENDEDORES';

  return { buyPressure, sellPressure, dominance };
}

export interface PriceTargetResult {
  target: number;
  direction: 'up' | 'down';
  distancePercent: number;
}

/**
 * Estima un posible objetivo de precio basado en niveles de Fibonacci,
 * soporte/resistencia y la tendencia actual.
 */
export function calculatePriceTarget(prices: number[]): PriceTargetResult {
  if (prices.length < 5) {
    const p = prices[prices.length - 1] || 0;
    return { target: p, direction: 'up', distancePercent: 0 };
  }

  const current = prices[prices.length - 1];
  const fib = calculateFibonacciLevels(prices, Math.min(50, prices.length));
  const { support, resistance } = calculateSupportResistance(prices, 30);

  // Determinar dirección de tendencia reciente
  const recentLen = Math.min(10, prices.length);
  const recentStart = prices[prices.length - recentLen];
  const trendUp = current > recentStart;

  let target: number;
  if (trendUp) {
    // Buscar el siguiente nivel de resistencia/Fibonacci por encima
    const levels = [fib.level618, fib.level500, fib.level382, resistance, fib.high]
      .filter(l => l > current * 1.001)
      .sort((a, b) => a - b);
    target = levels.length > 0 ? levels[0] : current * 1.02;
  } else {
    // Buscar el siguiente nivel de soporte/Fibonacci por debajo
    const levels = [fib.level382, fib.level500, fib.level618, support, fib.low]
      .filter(l => l < current * 0.999)
      .sort((a, b) => b - a);
    target = levels.length > 0 ? levels[0] : current * 0.98;
  }

  const distancePercent = Number((((target - current) / current) * 100).toFixed(2));

  return {
    target: Number(target.toFixed(2)),
    direction: trendUp ? 'up' : 'down',
    distancePercent,
  };
}

/**
 * Calcula el Rate of Change (ROC) — momentum del precio como porcentaje.
 * ROC = ((Precio actual - Precio hace N períodos) / Precio hace N períodos) * 100
 */
export function calculateROC(prices: number[], period: number = 10): number {
  if (prices.length < period + 1) return 0;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  if (past === 0) return 0;
  return ((current - past) / past) * 100;
}

/**
 * Calcula el Average True Range (ATR) — volatilidad real del activo.
 * Usa los precios de cierre disponibles como proxy (sin datos high/low/open).
 */
export function calculateATR(prices: number[], period: number = 14): number {
  if (prices.length < 2) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    // Sin datos de high/low, aproximamos con la variación absoluta entre cierres
    trueRanges.push(Math.abs(prices[i] - prices[i - 1]));
  }

  if (trueRanges.length < period) {
    return trueRanges.reduce((s, v) => s + v, 0) / trueRanges.length;
  }

  // Smoothed ATR (Wilder)
  let atr = trueRanges.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }
  return atr;
}

export interface DivergenceResult {
  type: 'bullish' | 'bearish' | 'none';
  strength: number; // 0 a 1
}

/**
 * Detecta divergencias entre el RSI y el precio:
 * - Divergencia alcista: precio hace nuevos mínimos, pero RSI sube (señal de rebote)
 * - Divergencia bajista: precio hace nuevos máximos, pero RSI baja (señal de agotamiento)
 * Analiza los últimos 'lookback' períodos comparando dos mitades.
 */
export function detectRSIPriceDivergence(prices: number[], period: number = 14, lookback: number = 20): DivergenceResult {
  if (prices.length < lookback + period) return { type: 'none', strength: 0 };

  const recentPrices = prices.slice(-lookback);
  const midPoint = Math.floor(recentPrices.length / 2);
  
  const firstHalfPrices = recentPrices.slice(0, midPoint);
  const secondHalfPrices = recentPrices.slice(midPoint);

  const firstHalfMinPrice = Math.min(...firstHalfPrices);
  const secondHalfMinPrice = Math.min(...secondHalfPrices);
  const firstHalfMaxPrice = Math.max(...firstHalfPrices);
  const secondHalfMaxPrice = Math.max(...secondHalfPrices);

  // Calcular RSI de cada mitad usando sus ventanas respectivas
  const rsiSlice1 = prices.slice(0, prices.length - lookback + midPoint);
  const rsiSlice2 = prices;
  const rsi1 = calculateRSI(rsiSlice1, period);
  const rsi2 = calculateRSI(rsiSlice2, period);

  // Divergencia alcista: precio baja + RSI sube
  if (secondHalfMinPrice < firstHalfMinPrice && rsi2 > rsi1) {
    const priceDropPct = (firstHalfMinPrice - secondHalfMinPrice) / firstHalfMinPrice;
    const rsiRise = rsi2 - rsi1;
    const strength = Math.min(1, (priceDropPct * 10 + rsiRise / 50) / 2);
    return { type: 'bullish', strength: Math.max(0, Math.min(1, strength)) };
  }

  // Divergencia bajista: precio sube + RSI baja
  if (secondHalfMaxPrice > firstHalfMaxPrice && rsi2 < rsi1) {
    const priceRisePct = (secondHalfMaxPrice - firstHalfMaxPrice) / firstHalfMaxPrice;
    const rsiDrop = rsi1 - rsi2;
    const strength = Math.min(1, (priceRisePct * 10 + rsiDrop / 50) / 2);
    return { type: 'bearish', strength: Math.max(0, Math.min(1, strength)) };
  }

  return { type: 'none', strength: 0 };
}

// ═══════════════════════════════════════════════════════════════════
// ACCESORES UNIFICADOS DE INDICADORES
// Una sola fuente de verdad para que el panel, el motor de análisis y los
// bots usen exactamente el mismo valor. En modo LIVE se priorizan los
// indicadores reales calculados por TradingView (tvRsi, tvSma*, tvMacdHist);
// si falta alguno se cae al cálculo local sobre el historial real. En modo
// SIMULACIÓN siempre se calcula localmente sobre el historial sintético, para
// que el sandbox sea internamente coherente.
// ═══════════════════════════════════════════════════════════════════

function tvSmaForPeriod(asset: Asset, period: number): number | undefined {
  switch (period) {
    case 10: return asset.tvSma10;
    case 20: return asset.tvSma20;
    case 30: return asset.tvSma30;
    case 50: return asset.tvSma50;
    case 100: return asset.tvSma100;
    default: return undefined;
  }
}

/** RSI del activo: real (TradingView) en Live si está disponible, si no local. */
export function resolveRSI(asset: Asset): number {
  if (asset.dataMode === 'live' && typeof asset.tvRsi === 'number') {
    return asset.tvRsi;
  }
  return calculateRSI(asset.priceHistory, 14);
}

/** SMA del activo para un periodo dado, priorizando TradingView en Live. */
export function resolveSMA(asset: Asset, period: number): number {
  if (asset.dataMode === 'live') {
    const tv = tvSmaForPeriod(asset, period);
    if (typeof tv === 'number') return tv;
  }
  return calculateSMA(asset.priceHistory, period);
}

/**
 * MACD del activo. Las líneas macd/signal se calculan localmente (TradingView
 * solo nos da el snapshot actual), pero el histograma —que es lo que usan el
 * scoring y los bots— se toma del valor real de TradingView en Live si existe.
 */
export function resolveMACD(asset: Asset): MACDResult {
  const local = calculateMACD(asset.priceHistory);
  if (asset.dataMode === 'live' && typeof asset.tvMacdHist === 'number') {
    return { macd: local.macd, signal: local.signal, histogram: asset.tvMacdHist };
  }
  return local;
}

