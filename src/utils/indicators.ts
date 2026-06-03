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

