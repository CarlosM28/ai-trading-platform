/**
 * Motor de estrategia framework-agnóstico (sin React).
 *
 * Es la ÚNICA fuente de verdad de la lógica de los bots: la usan tanto los bots
 * en vivo (TradingContext) como el backtester (core/backtester). Así, lo que se
 * backtestea es exactamente lo que opera.
 *
 * Contiene:
 *  - Tipos BotConfig / BotPosition.
 *  - evaluateStrategySignal: dada la configuración del bot y el estado del activo,
 *    devuelve la señal cruda BUY/SELL/null (sin ejecutar la orden).
 *  - computePositionSizing: dimensiona la posición por riesgo (ATR) y fija SL/TP.
 */
import type { Asset, NewsEvent } from '../utils/marketSimulator';
import {
  calculateSupportResistance,
  calculateMACD,
  calculateSMA,
  calculateATR,
  resolveRSI,
} from '../utils/indicators';

export interface BotConfig {
  id: string;
  name: string;
  strategyType: 'rsi' | 'macd' | 'ma_crossover' | 'fundamental' | 'consensus';
  isActive: boolean;
  tradeSizeUsd: number;
  description: string;
  params: {
    rsiOversold: number;
    rsiOverbought: number;
    maFast: number;
    maSlow: number;
    minSentimentScore: number;
    consensusThreshold?: number;
    activeStrategies?: string[];
    riskPercent?: number;             // % de la cartera arriesgado por operación
    atrStopMultiplier?: number;       // distancia del stop-loss en múltiplos del ATR
    riskRewardRatio?: number;         // take-profit = distancia del stop * ratio
    cooldownCandles?: number;         // velas de espera tras cerrar una posición
    maxAssetExposurePercent?: number; // % máximo de la cartera en un mismo activo
  };
}

export interface BotPosition {
  id: string;
  botId: string;
  botName: string;
  assetSymbol: string;
  entryPrice: number;
  amount: number;
  entryUsd: number;
  stopLoss: number;
  takeProfit: number;
  openedAtCandle: number;
  // Gestión de riesgo avanzada (opcional)
  highWaterPrice?: number;  // precio máximo visto desde la entrada (para trailing stop)
  trailDistance?: number;   // distancia original del stop (para trailing)
  partialTaken?: boolean;   // si ya se tomó el take-profit parcial
}

export type StrategySignal = 'BUY' | 'SELL' | null;

// ────────────────────────────────────────
// Evaluador puro de señal por estrategia
// Devuelve la señal cruda (BUY/SELL/null) sin ejecutar la orden. La gestión de
// posición, riesgo y stop-loss se aplica fuera (en el loop en vivo o el backtest).
// ────────────────────────────────────────
export function evaluateStrategySignal(
  bot: BotConfig,
  asset: Asset,
  prices: number[],
  currentPrice: number,
  newNewsEvent: NewsEvent | null
): { signal: StrategySignal; reason: string } {
  const { support, resistance } = calculateSupportResistance(prices, 20);
  const isNearSupport = currentPrice <= support * 1.02;      // Dentro de 2% del soporte
  const isNearResistance = currentPrice >= resistance * 0.98; // Dentro de 2% de la resistencia

  // Noticia que afecta a ESTE activo en el tick actual (narrowing seguro para TS)
  const assetNews = newNewsEvent && newNewsEvent.assetSymbol === asset.symbol ? newNewsEvent : null;

  if (bot.strategyType === 'rsi') {
    const rsi = resolveRSI(asset); // RSI real (TradingView) en Live, local en Simulación
    if (rsi < bot.params.rsiOversold && isNearSupport) {
      return { signal: 'BUY', reason: `RSI en sobreventa (${rsi.toFixed(0)}) cerca de soporte` };
    }
    if (rsi > bot.params.rsiOverbought && isNearResistance) {
      return { signal: 'SELL', reason: `RSI en sobrecompra (${rsi.toFixed(0)}) cerca de resistencia` };
    }
    return { signal: null, reason: '' };
  }

  if (bot.strategyType === 'macd') {
    const currHist = calculateMACD(prices).histogram;
    const prevHist = calculateMACD(prices.slice(0, -1)).histogram;
    if (prevHist < 0 && currHist > 0 && isNearSupport) {
      return { signal: 'BUY', reason: 'cruce alcista del histograma MACD' };
    }
    if (prevHist > 0 && currHist < 0 && isNearResistance) {
      return { signal: 'SELL', reason: 'cruce bajista del histograma MACD' };
    }
    return { signal: null, reason: '' };
  }

  if (bot.strategyType === 'ma_crossover') {
    const f = bot.params.maFast;
    const s = bot.params.maSlow;
    const currFast = calculateSMA(prices, f);
    const currSlow = calculateSMA(prices, s);
    const prev = prices.slice(0, -1);
    const prevFast = calculateSMA(prev, f);
    const prevSlow = calculateSMA(prev, s);
    if (prevFast < prevSlow && currFast > currSlow && isNearSupport) {
      return { signal: 'BUY', reason: 'Cruce Dorado de medias móviles' };
    }
    if (prevFast > prevSlow && currFast < currSlow && isNearResistance) {
      return { signal: 'SELL', reason: 'Cruce de Muerte de medias móviles' };
    }
    return { signal: null, reason: '' };
  }

  if (bot.strategyType === 'fundamental') {
    let shouldBuy = false;
    let shouldSell = false;
    let reason = '';

    if (assetNews) {
      if (assetNews.impact === 'positive') { shouldBuy = true; reason = `noticia positiva: "${assetNews.headline}"`; }
      else if (assetNews.impact === 'negative') { shouldSell = true; reason = `noticia negativa: "${assetNews.headline}"`; }
    } else {
      const sentiment = asset.sentimentScore;
      if (sentiment >= bot.params.minSentimentScore) { shouldBuy = true; reason = `sentimiento positivo (${(sentiment * 100).toFixed(0)}%)`; }
      else if (sentiment <= -bot.params.minSentimentScore) { shouldSell = true; reason = `sentimiento negativo (${(sentiment * 100).toFixed(0)}%)`; }
    }

    if (shouldBuy && !isNearResistance) {
      // En Live decidimos solo por el sentimiento de noticias reales (sin gates de
      // P/E ni volumen social, que en Live no tienen fuente real).
      if (asset.dataMode === 'live') {
        return { signal: 'BUY', reason: `${reason} (sentimiento de noticias reales)` };
      }
      if (asset.type === 'stock') {
        if ((asset.peRatio || 50) < 40) return { signal: 'BUY', reason: `${reason} (P/E ${asset.peRatio})` };
      } else if ((asset.socialVolume || 0) > 4000) {
        return { signal: 'BUY', reason: `${reason} (vol. social ${asset.socialVolume})` };
      }
    } else if (shouldSell && !isNearSupport) {
      return { signal: 'SELL', reason };
    }
    return { signal: null, reason: '' };
  }

  if (bot.strategyType === 'consensus') {
    const activeStrats = bot.params.activeStrategies || ['rsi', 'macd', 'ma_crossover', 'fundamental'];
    const threshold = bot.params.consensusThreshold || 2;
    if (activeStrats.length === 0) return { signal: null, reason: '' };

    let buySignals = 0;
    let sellSignals = 0;

    if (activeStrats.includes('rsi')) {
      const rsi = resolveRSI(asset);
      if (rsi < bot.params.rsiOversold) buySignals++;
      else if (rsi > bot.params.rsiOverbought) sellSignals++;
    }
    if (activeStrats.includes('macd')) {
      const c = calculateMACD(prices).histogram;
      const p = calculateMACD(prices.slice(0, -1)).histogram;
      if (p < 0 && c > 0) buySignals++;
      else if (p > 0 && c < 0) sellSignals++;
    }
    if (activeStrats.includes('ma_crossover')) {
      const f = bot.params.maFast;
      const s = bot.params.maSlow;
      const cf = calculateSMA(prices, f);
      const cs = calculateSMA(prices, s);
      const pr = prices.slice(0, -1);
      const pf = calculateSMA(pr, f);
      const ps = calculateSMA(pr, s);
      if (pf < ps && cf > cs) buySignals++;
      else if (pf > ps && cf < cs) sellSignals++;
    }
    if (activeStrats.includes('fundamental')) {
      let fund = 0;
      if (assetNews) {
        if (assetNews.impact === 'positive') fund = 1;
        else if (assetNews.impact === 'negative') fund = -1;
      } else {
        const sm = asset.sentimentScore;
        if (sm >= bot.params.minSentimentScore) fund = 1;
        else if (sm <= -bot.params.minSentimentScore) fund = -1;
      }
      if (fund === 1) {
        if (asset.dataMode === 'live') buySignals++; // En Live: solo sentimiento real
        else if (asset.type === 'stock') { if ((asset.peRatio || 50) < 40) buySignals++; }
        else if ((asset.socialVolume || 0) > 4000) buySignals++;
      } else if (fund === -1) {
        sellSignals++;
      }
    }

    // Confirmación adicional por estructura de niveles
    if (isNearSupport) buySignals++;
    if (isNearResistance) sellSignals++;

    const totalPossible = activeStrats.length + 1;
    if (buySignals >= threshold && !isNearResistance) {
      const conf = Math.round((buySignals / totalPossible) * 100);
      return { signal: 'BUY', reason: `consenso ${buySignals}/${totalPossible} indicadores (${conf}%)` };
    }
    if (sellSignals >= threshold && !isNearSupport) {
      const conf = Math.round((sellSignals / totalPossible) * 100);
      return { signal: 'SELL', reason: `consenso ${sellSignals}/${totalPossible} indicadores (${conf}%)` };
    }
    return { signal: null, reason: '' };
  }

  return { signal: null, reason: '' };
}

// ────────────────────────────────────────
// Dimensionamiento de posición por riesgo (ATR) + niveles de SL/TP
// ────────────────────────────────────────
export interface PositionSizing {
  amountUsd: number;
  amount: number;
  stopLoss: number;
  takeProfit: number;
  stopDistance: number;
}

/**
 * Calcula el tamaño de una posición de compra para que, si salta el stop-loss
 * (a distancia ATR × multiplicador), la pérdida sea ~riskPercent del valor de la
 * cartera. Acota por el tamaño máximo del bot, la exposición máxima por activo y
 * el efectivo disponible. Devuelve null si el tamaño resultante es demasiado
 * pequeño. Es matemática pura: la usan los bots en vivo y el backtester.
 */
export function computePositionSizing(
  bot: BotConfig,
  prices: number[],
  price: number,
  portfolioValue: number,
  availableBalance: number,
  currentExposureUsd: number,
  minTradeUsd: number = 50
): PositionSizing | null {
  const riskPercent = bot.params.riskPercent ?? 1.5;
  const atrMult = bot.params.atrStopMultiplier ?? 2;
  const rr = bot.params.riskRewardRatio ?? 2;
  const maxExpPct = bot.params.maxAssetExposurePercent ?? 25;

  // Distancia del stop basada en volatilidad real (ATR). Con suelo de 0.5% para
  // evitar stops absurdamente ajustados cuando el ATR es casi nulo.
  const atr = calculateATR(prices, 14);
  let stopDistance = atr * atrMult;
  if (!(stopDistance > 0) || stopDistance < price * 0.005) {
    stopDistance = price * 0.02;
  }

  // Tamaño por riesgo: unidades = (cartera * riesgo%) / distanciaStop
  const riskAmount = portfolioValue * (riskPercent / 100);
  let amountUsd = (riskAmount / stopDistance) * price;

  // Límites: tamaño máximo del bot, exposición máxima por activo, efectivo.
  amountUsd = Math.min(amountUsd, bot.tradeSizeUsd);
  const maxExposureUsd = portfolioValue * (maxExpPct / 100);
  const exposureRoom = Math.max(0, maxExposureUsd - currentExposureUsd);
  amountUsd = Math.min(amountUsd, exposureRoom);
  amountUsd = Math.min(amountUsd, availableBalance);

  if (amountUsd < minTradeUsd) return null;

  const amount = amountUsd / price;
  const stopLoss = Number((price - stopDistance).toFixed(6));
  const takeProfit = Number((price + stopDistance * rr).toFixed(6));

  return { amountUsd, amount, stopLoss, takeProfit, stopDistance };
}
