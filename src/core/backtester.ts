/**
 * Motor de backtesting (puro, sin React).
 *
 * Recorre velas históricas y simula EXACTAMENTE la misma lógica que los bots en
 * vivo: señal por `evaluateStrategySignal`, dimensionamiento por `computePositionSizing`,
 * posición única, cooldown y salida por stop-loss / take-profit. Los hits de SL/TP
 * se evalúan con high/low intravela (más realista que solo el cierre). Aplica
 * comisión y slippage en cada fill.
 *
 * Limitaciones honestas:
 *  - Long-only (igual que los bots actuales).
 *  - Sin noticias históricas: el sentimiento es 0, así que los bots fundamentales
 *    y el sub-filtro fundamental del de consenso no disparan. Los bots técnicos
 *    (RSI, MACD, Cruce de Medias) se backtestean completos.
 *  - Si SL y TP caen en la misma vela, se asume el STOP-LOSS primero (conservador).
 */
import type { Asset } from '../utils/marketSimulator';
import { type BotConfig, evaluateStrategySignal, computePositionSizing } from './strategyEngine';
import { type Candle, type BacktestInterval, PERIODS_PER_YEAR } from './historicalData';

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  pnl: number;
  pnlPct: number;
  reason: 'STOP-LOSS' | 'TAKE-PROFIT' | 'SEÑAL' | 'FIN';
}

export interface BacktestResult {
  initialBalance: number;
  finalEquity: number;
  totalReturnPct: number;
  buyHoldReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number;
  winRate: number;       // 0–100
  profitFactor: number;  // Infinity si no hubo pérdidas
  numTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  equityCurve: number[];
  trades: BacktestTrade[];
  candles: number;
}

export interface BacktestOptions {
  initialBalance: number;
  commissionPct: number; // por operación, sobre el importe (p. ej. 0.1)
  slippagePct: number;   // desviación del precio en el fill (p. ej. 0.05)
  interval: BacktestInterval;
}

interface OpenPosition {
  entryPrice: number;
  amount: number;
  entryUsd: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
}

export function runBacktest(
  bot: BotConfig,
  candles: Candle[],
  opts: BacktestOptions
): BacktestResult {
  const { initialBalance, commissionPct, slippagePct, interval } = opts;
  const comm = commissionPct / 100;
  const slip = slippagePct / 100;
  const cooldown = bot.params.cooldownCandles ?? 3;

  let cash = initialBalance;
  let position: OpenPosition | null = null;
  let lastClosedCandle = -Infinity;

  const closes: number[] = [];
  const equityCurve: number[] = [];
  const trades: BacktestTrade[] = [];

  const recordExit = (exitPrice: number, time: number, reason: BacktestTrade['reason']) => {
    if (!position) return;
    const fill = exitPrice * (1 - slip);            // vender peor por slippage
    const proceeds = position.amount * fill;
    const commission = proceeds * comm;
    cash += proceeds - commission;
    const pnl = (fill - position.entryPrice) * position.amount - commission;
    const pnlPct = ((fill - position.entryPrice) / position.entryPrice) * 100;
    trades.push({
      entryTime: position.entryTime,
      exitTime: time,
      entryPrice: position.entryPrice,
      exitPrice: fill,
      amount: position.amount,
      pnl,
      pnlPct,
      reason,
    });
    position = null;
    lastClosedCandle = closes.length - 1;
  };

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    closes.push(candle.close);

    // 1. Gestión de la posición abierta: SL/TP intravela (SL primero si ambos).
    if (position) {
      if (candle.low <= position.stopLoss) {
        recordExit(position.stopLoss, candle.time, 'STOP-LOSS');
      } else if (candle.high >= position.takeProfit) {
        recordExit(position.takeProfit, candle.time, 'TAKE-PROFIT');
      }
    }

    // 2. Señal de estrategia al cierre de la vela (necesita historial suficiente).
    if (closes.length >= 35) {
      const asset: Asset = {
        id: bot.id + '-bt',
        name: 'Backtest',
        symbol: 'BT',
        type: 'crypto',
        price: candle.close,
        priceHistory: closes,
        changePercent: 0,
        marketCap: 0,
        sentimentScore: 0,
        dataMode: 'simulation',
      };

      const { signal } = evaluateStrategySignal(bot, asset, closes, candle.close, null);

      if (position && signal === 'SELL') {
        // Salida por señal de estrategia (además del SL/TP)
        recordExit(candle.close, candle.time, 'SEÑAL');
      } else if (!position && signal === 'BUY' && (i - lastClosedCandle) >= cooldown) {
        const sizing = computePositionSizing(bot, closes, candle.close, cash, cash, 0);
        if (sizing) {
          const buyFill = candle.close * (1 + slip);     // comprar peor por slippage
          const amount = sizing.amountUsd / buyFill;
          const commission = sizing.amountUsd * comm;
          cash -= sizing.amountUsd + commission;
          position = {
            entryPrice: buyFill,
            amount,
            entryUsd: sizing.amountUsd,
            stopLoss: sizing.stopLoss,
            takeProfit: sizing.takeProfit,
            entryTime: candle.time,
          };
        }
      }
    }

    // 3. Equity marcada a mercado al cierre de la vela.
    const equity = cash + (position ? position.amount * candle.close : 0);
    equityCurve.push(equity);
  }

  // Cerrar cualquier posición abierta al final para contabilidad limpia.
  if (position) {
    const last = candles[candles.length - 1];
    recordExit(last.close, last.time, 'FIN');
    equityCurve[equityCurve.length - 1] = cash;
  }

  // ── Métricas ──
  const finalEquity = cash;
  const totalReturnPct = ((finalEquity - initialBalance) / initialBalance) * 100;
  const buyHoldReturnPct =
    candles.length >= 2 ? ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100 : 0;

  // Max drawdown sobre la curva de equity
  let peak = equityCurve[0] || initialBalance;
  let maxDrawdownPct = 0;
  for (const eq of equityCurve) {
    if (eq > peak) peak = eq;
    if (peak > 0) {
      const dd = ((peak - eq) / peak) * 100;
      if (dd > maxDrawdownPct) maxDrawdownPct = dd;
    }
  }

  // Sharpe simplificado (sin tasa libre de riesgo), anualizado por el intervalo
  const rets: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1];
    if (prev > 0) rets.push(equityCurve[i] / prev - 1);
  }
  let sharpe = 0;
  if (rets.length > 1) {
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / rets.length;
    const std = Math.sqrt(variance);
    if (std > 0) sharpe = (mean / std) * Math.sqrt(PERIODS_PER_YEAR[interval]);
  }

  // Estadísticas de operaciones
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl <= 0);
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
  const avgWinPct = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPct, 0) / wins.length : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPct, 0) / losses.length : 0;

  return {
    initialBalance,
    finalEquity,
    totalReturnPct,
    buyHoldReturnPct,
    maxDrawdownPct,
    sharpe,
    winRate,
    profitFactor,
    numTrades: trades.length,
    avgWinPct,
    avgLossPct,
    equityCurve,
    trades,
    candles: candles.length,
  };
}
