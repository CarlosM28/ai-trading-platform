/**
 * Motor de Análisis Cuantitativo Avanzado v2
 * 
 * Resuelve el problema del scoring ingenuo que generaba STRONG BUY falsos
 * al tratar RSI bajo como siempre alcista y no detectar soportes rotos.
 * 
 * Principios clave:
 * 1. RSI contextualizado por tendencia (RSI bajo + tendencia bajista ≠ compra)
 * 2. Detección de soporte/resistencia roto (precio debajo del soporte = bajista)
 * 3. Momentum y Rate of Change como filtro de confirmación
 * 4. Divergencias RSI/Precio para detectar agotamiento de tendencia
 * 5. Scoring diferenciado para crypto vs stocks
 * 6. Umbrales más exigentes para STRONG BUY/SELL
 * 7. Generación de explicaciones con advertencias de contradicción
 */

import type { Asset } from './marketSimulator';
import {
  calculateRSI,
  calculateMACD,
  calculateSMA,
  calculateSupportResistance,
  calculateROC,
  calculateATR,
  detectRSIPriceDivergence,
  type DivergenceResult
} from './indicators';

// ────────────────────────────────────────
// Tipos de salida
// ────────────────────────────────────────

export type Verdict = 'STRONG BUY' | 'BUY' | 'CAUTIOUS BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';

export interface ScoreFactor {
  name: string;
  score: number;
  maxPossible: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  detail: string;
}

export interface QuantAnalysisResult {
  // Indicadores calculados
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  maTrend: 'bullish' | 'bearish';
  maTrendLong: 'bullish' | 'bearish';
  support: number;
  resistance: number;
  roc: number;
  atr: number;
  divergence: DivergenceResult;
  
  // Scoring
  totalScore: number;
  confidencePercent: number;
  factors: ScoreFactor[];
  contradictions: string[];
  
  // Verdict
  verdict: Verdict;
  ratingColor: string;
  ratingBg: string;
  
  // Análisis
  explanation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

// ────────────────────────────────────────
// Constantes de configuración
// ────────────────────────────────────────

const VERDICT_THRESHOLDS = {
  STRONG_BUY: 4.5,
  BUY: 2.0,
  CAUTIOUS_BUY: 1.0,
  NEUTRAL_LOW: -1.0,
  SELL: -2.0,
  STRONG_SELL: -4.5,
};

// ────────────────────────────────────────
// Motor principal
// ────────────────────────────────────────

export function analyzeAsset(asset: Asset): QuantAnalysisResult {
  const prices = asset.priceHistory;
  const factors: ScoreFactor[] = [];
  const contradictions: string[] = [];

  // ── 1. Calcular todos los indicadores ──

  const rsi = calculateRSI(prices, 14);
  const macd = calculateMACD(prices);

  const fastSma = calculateSMA(prices, 10);
  const slowSma = calculateSMA(prices, 30);
  const maTrend = fastSma > slowSma ? 'bullish' as const : 'bearish' as const;

  const sma20 = calculateSMA(prices, 20);
  const sma80 = calculateSMA(prices, Math.min(80, prices.length));
  const maTrendLong = sma20 > sma80 ? 'bullish' as const : 'bearish' as const;

  const { support, resistance } = calculateSupportResistance(prices, 20);
  const roc = calculateROC(prices, 10);
  const atr = calculateATR(prices, 14);
  const divergence = detectRSIPriceDivergence(prices, 14, 20);

  // Relación precio vs soporte/resistencia
  const priceBelowSupport = asset.price < support * 0.995;    // Soporte roto (precio > 0.5% por debajo)
  const priceAboveResistance = asset.price > resistance * 1.005; // Breakout (precio > 0.5% por encima)
  const isNearSupport = !priceBelowSupport && asset.price <= support * 1.02;
  const isNearResistance = !priceAboveResistance && asset.price >= resistance * 0.98;
  
  // Estado de tendencia combinado
  const isBothMaBearish = maTrend === 'bearish' && maTrendLong === 'bearish';
  const isBothMaBullish = maTrend === 'bullish' && maTrendLong === 'bullish';

  // ── 2. SCORING INTELIGENTE POR FACTOR ──

  // ─── Factor 1: RSI Contextualizado por tendencia ───
  let rsiScore = 0;
  let rsiDetail = '';

  if (rsi < 20) {
    // Sobreventa EXTREMA — zona de pánico
    if (isBothMaBearish) {
      rsiScore = -1.5; // Caída libre, RSI bajo NO es compra
      rsiDetail = `RSI en zona de pánico (${rsi.toFixed(0)}) con tendencia bajista total. El activo puede seguir cayendo — la sobreventa extrema en tendencias bajistas NO indica rebote sino debilidad estructural.`;
      contradictions.push(`El RSI extremadamente bajo (${rsi.toFixed(0)}) podría parecer señal de compra, pero las medias bajistas indican tendencia descendente activa`);
    } else {
      rsiScore = 0.5; // Posible capitulación con tendencia no del todo bajista
      rsiDetail = `RSI en zona de pánico (${rsi.toFixed(0)}), pero la tendencia no es totalmente bajista. Posible capitulación — vigilar confirmación de rebote.`;
    }
  } else if (rsi < 32) {
    // Sobreventa moderada
    if (isBothMaBearish) {
      rsiScore = -0.5; // Trampa bajista probable
      rsiDetail = `RSI en sobreventa (${rsi.toFixed(0)}) con ambas medias bajistas. Probable trampa bajista — la sobreventa en tendencia bajista indica presión vendedora continuada, no oportunidad de compra.`;
      contradictions.push(`RSI en sobreventa (${rsi.toFixed(0)}) sugiere rebote técnico, pero ambas MAs bajistas contradicen esta señal`);
    } else if (isBothMaBullish) {
      rsiScore = 2.0; // Genuina sobreventa en tendencia alcista
      rsiDetail = `RSI en sobreventa (${rsi.toFixed(0)}) con tendencia alcista intacta. Zona ideal de entrada — la corrección dentro de una tendencia alcista es la señal clásica de compra.`;
    } else {
      rsiScore = 0.5; // Señal mixta
      rsiDetail = `RSI en sobreventa (${rsi.toFixed(0)}) con señales mixtas de tendencia. Posible oportunidad si se confirma reversión, pero con cautela.`;
    }
  } else if (rsi < 45) {
    rsiScore = 0.5;
    rsiDetail = `RSI ligeramente debajo de neutral (${rsi.toFixed(0)}). Leve sesgo hacia compra, pero no determinante.`;
  } else if (rsi <= 55) {
    rsiScore = 0;
    rsiDetail = `RSI neutral (${rsi.toFixed(0)}). Sin señal direccional por este indicador.`;
  } else if (rsi <= 65) {
    rsiScore = -0.5;
    rsiDetail = `RSI ligeramente elevado (${rsi.toFixed(0)}). Leve sesgo hacia prudencia.`;
  } else if (rsi <= 80) {
    // Sobrecompra
    if (isBothMaBullish) {
      rsiScore = -0.5; // Sobrecompra pero tendencia fuerte — corregirá pero no crash
      rsiDetail = `RSI en sobrecompra (${rsi.toFixed(0)}) pero con tendencia alcista sólida. Posible corrección a corto plazo, pero la tendencia de fondo se mantiene.`;
    } else {
      rsiScore = -2.0;
      rsiDetail = `RSI en sobrecompra (${rsi.toFixed(0)}) sin respaldo de tendencia alcista. Alto riesgo de corrección inmediata.`;
    }
  } else {
    // RSI > 80 — extremo
    rsiScore = -2.5;
    rsiDetail = `RSI en zona de euforia extrema (${rsi.toFixed(0)}). Riesgo muy alto de corrección violenta independientemente de la tendencia.`;
  }

  factors.push({ name: 'RSI Contextualizado', score: rsiScore, maxPossible: 2.5, signal: rsiScore > 0.3 ? 'bullish' : rsiScore < -0.3 ? 'bearish' : 'neutral', detail: rsiDetail });

  // ─── Factor 2: MACD ───
  let macdScore = 0;
  let macdDetail = '';
  const hist = macd.histogram;
  const normalizedHist = asset.price > 0 ? (hist / asset.price) * 100 : hist;

  if (normalizedHist > 0.3) {
    macdScore = 1.5;
    macdDetail = `Histograma MACD fuertemente positivo (${hist.toFixed(2)}). Momentum alcista claro.`;
  } else if (normalizedHist > 0.05) {
    macdScore = 0.75;
    macdDetail = `Histograma MACD ligeramente positivo (${hist.toFixed(2)}). Tendencia alcista moderada.`;
  } else if (normalizedHist > -0.05) {
    macdScore = 0;
    macdDetail = `Histograma MACD neutral (${hist.toFixed(2)}). Sin impulso claro.`;
  } else if (normalizedHist > -0.3) {
    macdScore = -0.75;
    macdDetail = `Histograma MACD ligeramente negativo (${hist.toFixed(2)}). Presión bajista moderada.`;
  } else {
    macdScore = -1.5;
    macdDetail = `Histograma MACD fuertemente negativo (${hist.toFixed(2)}). Presión vendedora significativa.`;
  }

  factors.push({ name: 'MACD', score: macdScore, maxPossible: 1.5, signal: macdScore > 0.3 ? 'bullish' : macdScore < -0.3 ? 'bearish' : 'neutral', detail: macdDetail });

  // ─── Factor 3: Media Móvil Corto Plazo (10/30) ───
  const maShortScore = maTrend === 'bullish' ? 0.75 : -0.75;
  factors.push({
    name: 'MA Corta (10/30)',
    score: maShortScore,
    maxPossible: 0.75,
    signal: maTrend === 'bullish' ? 'bullish' : 'bearish',
    detail: maTrend === 'bullish'
      ? `Cruce alcista de medias de corto plazo. La MA(10) cotiza por encima de MA(30) — tendencia de scalp favorable.`
      : `Cruce bajista de medias de corto plazo. La MA(10) cotiza por debajo de MA(30) — presión vendedora en el corto plazo.`
  });

  // ─── Factor 4: Media Móvil Largo Plazo (20/80) ───
  const maLongScore = maTrendLong === 'bullish' ? 1.25 : -1.25;
  factors.push({
    name: 'MA Larga (20/80)',
    score: maLongScore,
    maxPossible: 1.25,
    signal: maTrendLong === 'bullish' ? 'bullish' : 'bearish',
    detail: maTrendLong === 'bullish'
      ? `Tendencia macro alcista confirmada. La MA(20) se mantiene sobre MA(80) — estructura de precios saludable.`
      : `Tendencia macro bajista. La MA(20) cotiza debajo de MA(80) — estructura de precios deteriorada, sugiere cautela.`
  });

  // ─── Factor 5: Soporte / Resistencia INTELIGENTE ───
  let srScore = 0;
  let srDetail = '';

  if (priceBelowSupport) {
    // ¡SOPORTE ROTO! — señal muy bajista
    srScore = -2.5;
    srDetail = `⚠️ SOPORTE QUEBRADO: El precio ($${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}) ha perforado el soporte clave en $${support.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Esto indica debilidad estructural — el antiguo soporte ahora actúa como resistencia. Alto riesgo de caída extendida.`;
    contradictions.push(`El precio está POR DEBAJO del soporte ($${asset.price.toFixed(2)} < $${support.toFixed(2)}), lo que invalida señales de compra basadas en proximidad al soporte`);
  } else if (priceAboveResistance) {
    // Breakout por encima de resistencia
    if (isBothMaBullish) {
      srScore = 2.0;
      srDetail = `Ruptura alcista confirmada: El precio ($${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}) ha superado la resistencia en $${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })} con tendencia de fondo alcista. Posible inicio de nuevo rango superior.`;
    } else {
      srScore = 0.5;
      srDetail = `Ruptura de resistencia en $${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })}, pero sin confirmación de ambas medias. Podría ser una falsa ruptura — monitorear volumen.`;
    }
  } else if (isNearSupport) {
    if (isBothMaBullish) {
      srScore = 1.5;
      srDetail = `Precio testeando soporte en $${support.toLocaleString(undefined, { minimumFractionDigits: 2 })} con tendencia alcista intacta. Zona de acumulación favorable si el soporte se mantiene.`;
    } else if (isBothMaBearish) {
      srScore = -0.5;
      srDetail = `Precio en zona de soporte ($${support.toLocaleString(undefined, { minimumFractionDigits: 2 })}), pero ambas medias son bajistas. El soporte podría ceder — alto riesgo de quiebre.`;
    } else {
      srScore = 0.5;
      srDetail = `Precio testeando soporte en $${support.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Señal mixta — vigilar si el soporte se sostiene para confirmar dirección.`;
    }
  } else if (isNearResistance) {
    srScore = -1.0;
    srDetail = `Precio cercano a la resistencia en $${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Riesgo de rechazo bajista a corto plazo a menos que se produzca ruptura con volumen.`;
  } else {
    srScore = 0;
    srDetail = `Cotiza en rango intermedio entre soporte ($${support.toLocaleString(undefined, { minimumFractionDigits: 2 })}) y resistencia ($${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Sin señal direccional por estructura de niveles.`;
  }

  factors.push({ name: 'Soporte/Resistencia', score: srScore, maxPossible: 2.5, signal: srScore > 0.3 ? 'bullish' : srScore < -0.3 ? 'bearish' : 'neutral', detail: srDetail });

  // ─── Factor 6: Momentum (ROC) ───
  let rocScore = 0;
  let rocDetail = '';

  if (roc > 5) {
    rocScore = 1.0;
    rocDetail = `Momentum fuerte (+${roc.toFixed(1)}%). Impulso alcista en los últimos 10 períodos.`;
  } else if (roc > 1) {
    rocScore = 0.5;
    rocDetail = `Momentum moderado (+${roc.toFixed(1)}%). Tendencia alcista con ritmo sostenido.`;
  } else if (roc > -1) {
    rocScore = 0;
    rocDetail = `Momentum lateral (${roc.toFixed(1)}%). Sin aceleración en ninguna dirección.`;
  } else if (roc > -5) {
    rocScore = -0.5;
    rocDetail = `Momentum descendente (${roc.toFixed(1)}%). Presión bajista activa en el corto plazo.`;
  } else {
    rocScore = -1.0;
    rocDetail = `Momentum fuertemente bajista (${roc.toFixed(1)}%). Caída acelerada — alta probabilidad de continuación bajista.`;
  }

  factors.push({ name: 'Momentum (ROC)', score: rocScore, maxPossible: 1.0, signal: rocScore > 0.3 ? 'bullish' : rocScore < -0.3 ? 'bearish' : 'neutral', detail: rocDetail });

  // ─── Factor 7: Divergencia RSI/Precio ───
  let divScore = 0;
  let divDetail = '';

  if (divergence.type === 'bullish' && divergence.strength > 0.3) {
    divScore = 1.0 * divergence.strength;
    divDetail = `Divergencia alcista detectada (fuerza: ${(divergence.strength * 100).toFixed(0)}%). El precio hace nuevos mínimos pero el RSI sube — señal de agotamiento vendedor.`;
  } else if (divergence.type === 'bearish' && divergence.strength > 0.3) {
    divScore = -1.0 * divergence.strength;
    divDetail = `Divergencia bajista detectada (fuerza: ${(divergence.strength * 100).toFixed(0)}%). El precio sube pero el RSI cae — señal de agotamiento comprador.`;
  } else {
    divDetail = `Sin divergencia significativa entre RSI y precio.`;
  }

  factors.push({ name: 'Divergencia RSI/Precio', score: divScore, maxPossible: 1.0, signal: divScore > 0.1 ? 'bullish' : divScore < -0.1 ? 'bearish' : 'neutral', detail: divDetail });

  // ─── Factor 8: Sentimiento / Fundamental ───
  let sentimentScore = 0;
  let sentimentDetail = '';

  if (asset.sentimentScore > 0.4) {
    sentimentScore = 1.5;
    sentimentDetail = `Sentimiento fuertemente positivo (${(asset.sentimentScore * 100).toFixed(0)}%). Las noticias e inteligencia de mercado apuntan a catalizadores alcistas.`;
  } else if (asset.sentimentScore > 0.15) {
    sentimentScore = 0.5;
    sentimentDetail = `Sentimiento ligeramente positivo (${(asset.sentimentScore * 100).toFixed(0)}%). El flujo de noticias es moderadamente favorable.`;
  } else if (asset.sentimentScore > -0.15) {
    sentimentScore = 0;
    sentimentDetail = `Sentimiento neutral (${(asset.sentimentScore * 100).toFixed(0)}%). Sin catalizador de noticias determinante.`;
  } else if (asset.sentimentScore > -0.4) {
    sentimentScore = -0.5;
    sentimentDetail = `Sentimiento ligeramente negativo (${(asset.sentimentScore * 100).toFixed(0)}%). El flujo de noticias es desfavorable a corto plazo.`;
  } else {
    sentimentScore = -1.5;
    sentimentDetail = `Sentimiento fuertemente negativo (${(asset.sentimentScore * 100).toFixed(0)}%). Las noticias señalan riesgo macro o eventos adversos significativos.`;
  }

  factors.push({ name: 'Sentimiento IA', score: sentimentScore, maxPossible: 1.5, signal: sentimentScore > 0.3 ? 'bullish' : sentimentScore < -0.3 ? 'bearish' : 'neutral', detail: sentimentDetail });

  // ─── Factor 9: Ratios Fundamentales (diferenciado crypto/stock) ───
  let fundamentalScore = 0;
  let fundamentalDetail = '';

  if (asset.type === 'stock') {
    const pe = asset.peRatio || 50;
    if (pe < 20) {
      fundamentalScore = 1.0;
      fundamentalDetail = `P/E de ${pe.toFixed(1)} — valuación atractiva por debajo de la media del mercado. Fuerte valor relativo.`;
    } else if (pe < 30) {
      fundamentalScore = 0.5;
      fundamentalDetail = `P/E de ${pe.toFixed(1)} — valuación razonable. Ni infravalorado ni excesivo.`;
    } else if (pe < 50) {
      fundamentalScore = 0;
      fundamentalDetail = `P/E de ${pe.toFixed(1)} — valuación de growth. Justificable si hay catalizadores de crecimiento.`;
    } else {
      fundamentalScore = -0.5;
      fundamentalDetail = `P/E de ${pe.toFixed(1)} — valuación elevada con alto riesgo de contracción de múltiplos.`;
    }
  } else {
    // Crypto — evaluar whale flow + social volume de forma estricta
    const social = asset.socialVolume || 0;
    const whale = asset.whaleBalanceChange || 0;

    if (whale > 1.5 && social > 5000) {
      fundamentalScore = 1.0;
      fundamentalDetail = `Acumulación institucional CONFIRMADA: Flujo ballenas +${whale.toFixed(2)}% con volumen social alto (${social}/h). Señal on-chain fuerte.`;
    } else if (whale > 0.5 && social > 3000) {
      fundamentalScore = 0.3;
      fundamentalDetail = `Acumulación moderada: Flujo ballenas +${whale.toFixed(2)}% con vol. social ${social}/h. Insuficiente por sí solo para confirmar tendencia.`;
    } else if (whale < -0.5) {
      fundamentalScore = -1.0;
      fundamentalDetail = `Distribución detectada: Flujo ballenas ${whale.toFixed(2)}% negativo. Las wallets grandes están vendiendo — presión bajista on-chain.`;
      if (isBothMaBearish) {
        fundamentalScore = -1.5;
        fundamentalDetail += ` Combinado con tendencia bajista, esto refuerza el riesgo de caída continuada.`;
      }
    } else {
      fundamentalScore = 0;
      fundamentalDetail = `Flujo on-chain neutral (ballenas: ${whale > 0 ? '+' : ''}${whale.toFixed(2)}%, vol. social: ${social}/h). Sin señal convincente.`;
    }
  }

  factors.push({ name: asset.type === 'stock' ? 'Valuación P/E' : 'On-Chain', score: fundamentalScore, maxPossible: 1.5, signal: fundamentalScore > 0.3 ? 'bullish' : fundamentalScore < -0.3 ? 'bearish' : 'neutral', detail: fundamentalDetail });

  // ── 3. CALCULAR SCORE TOTAL Y CONFIANZA ──

  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  
  // Calcular confianza basada en alineación de señales
  const bullishFactors = factors.filter(f => f.signal === 'bullish').length;
  const bearishFactors = factors.filter(f => f.signal === 'bearish').length;
  const totalFactorsEvaluated = factors.length;
  const dominantCount = Math.max(bullishFactors, bearishFactors);
  const alignmentRatio = dominantCount / totalFactorsEvaluated;
  
  // La confianza es la coherencia de las señales — si hay mucha contradicción, baja confianza
  let confidencePercent = Math.round(alignmentRatio * 100);
  
  // Penalizar confianza si hay contradicciones graves
  if (contradictions.length > 0) {
    confidencePercent = Math.max(20, confidencePercent - contradictions.length * 15);
  }

  // Si hay demasiadas contradicciones y el score es alto, forzar a NEUTRAL
  const hasSignalConflict = contradictions.length >= 2;

  // ── 4. DETERMINAR VEREDICTO ──

  let verdict: Verdict = 'NEUTRAL';
  let ratingColor = 'var(--text-muted)';
  let ratingBg = 'rgba(148, 163, 184, 0.08)';

  if (hasSignalConflict && Math.abs(totalScore) < 5) {
    // Señales contradictorias fuertes → forzar NEUTRAL con advertencia
    verdict = 'NEUTRAL';
    ratingColor = 'var(--color-warning)';
    ratingBg = 'rgba(245, 158, 11, 0.08)';
  } else if (totalScore >= VERDICT_THRESHOLDS.STRONG_BUY) {
    verdict = 'STRONG BUY';
    ratingColor = 'var(--color-buy)';
    ratingBg = 'rgba(0, 255, 170, 0.08)';
  } else if (totalScore >= VERDICT_THRESHOLDS.BUY) {
    verdict = 'BUY';
    ratingColor = 'var(--color-buy)';
    ratingBg = 'rgba(0, 255, 170, 0.04)';
  } else if (totalScore >= VERDICT_THRESHOLDS.CAUTIOUS_BUY) {
    verdict = 'CAUTIOUS BUY';
    ratingColor = '#f59e0b';
    ratingBg = 'rgba(245, 158, 11, 0.06)';
  } else if (totalScore > VERDICT_THRESHOLDS.NEUTRAL_LOW) {
    verdict = 'NEUTRAL';
  } else if (totalScore > VERDICT_THRESHOLDS.SELL) {
    verdict = 'SELL';
    ratingColor = 'var(--color-sell)';
    ratingBg = 'rgba(255, 70, 104, 0.04)';
  } else if (totalScore > VERDICT_THRESHOLDS.STRONG_SELL) {
    verdict = 'SELL';
    ratingColor = 'var(--color-sell)';
    ratingBg = 'rgba(255, 70, 104, 0.06)';
  } else {
    verdict = 'STRONG SELL';
    ratingColor = 'var(--color-sell)';
    ratingBg = 'rgba(255, 70, 104, 0.08)';
  }

  // ── 5. NIVEL DE RIESGO ──

  const atrPercent = asset.price > 0 ? (atr / asset.price) * 100 : 0;
  let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'medium';
  
  if (atrPercent < 0.5 && contradictions.length === 0) riskLevel = 'low';
  else if (atrPercent < 1.5 && contradictions.length <= 1) riskLevel = 'medium';
  else if (atrPercent < 3.0 || contradictions.length >= 2) riskLevel = 'high';
  else riskLevel = 'extreme';

  // Si hay soporte roto, elevar riesgo
  if (priceBelowSupport) {
    riskLevel = riskLevel === 'low' ? 'medium' : riskLevel === 'medium' ? 'high' : 'extreme';
  }

  // ── 6. GENERAR EXPLICACIÓN INTELIGENTE ──

  const explanation = generateExplanation(
    asset, verdict, totalScore, confidencePercent,
    rsi, macd, maTrend, maTrendLong,
    support, resistance, priceBelowSupport, priceAboveResistance,
    isNearSupport, isNearResistance,
    roc, divergence, contradictions, factors, riskLevel
  );

  return {
    rsi, macd, maTrend, maTrendLong, support, resistance, roc, atr, divergence,
    totalScore, confidencePercent, factors, contradictions,
    verdict, ratingColor, ratingBg,
    explanation, riskLevel
  };
}

// ────────────────────────────────────────
// Generador de explicaciones inteligentes
// ────────────────────────────────────────

function generateExplanation(
  asset: Asset,
  verdict: Verdict,
  _totalScore: number,
  confidence: number,
  _rsi: number,
  _macd: { histogram: number },
  _maTrend: string,
  _maTrendLong: string,
  support: number,
  resistance: number,
  priceBelowSupport: boolean,
  priceAboveResistance: boolean,
  isNearSupport: boolean,
  isNearResistance: boolean,
  _roc: number,
  divergence: DivergenceResult,
  contradictions: string[],
  factors: ScoreFactor[],
  riskLevel: string
): string {
  const parts: string[] = [];
  const priceFmt = asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const supportFmt = support.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const resistanceFmt = resistance.toLocaleString(undefined, { minimumFractionDigits: 2 });

  // Advertencia de contradicciones primero
  if (contradictions.length > 0) {
    parts.push(`⚠️ SEÑALES CONTRADICTORIAS DETECTADAS:`);
    contradictions.forEach(c => parts.push(`• ${c}`));
    parts.push('');
  }

  // Resumen principal
  if (verdict === 'STRONG BUY') {
    parts.push(`CONSENSO FUERTE DE COMPRA (Confianza: ${confidence}%). Múltiples indicadores alineados confirman una oportunidad de entrada con alta convicción.`);
  } else if (verdict === 'BUY') {
    parts.push(`RECOMENDACIÓN DE COMPRA (Confianza: ${confidence}%). La mayoría de indicadores apuntan a un sesgo alcista con fundamentos que apoyan la posición.`);
  } else if (verdict === 'CAUTIOUS BUY') {
    parts.push(`COMPRA CON CAUTELA (Confianza: ${confidence}%). Existen señales positivas pero no hay consenso total — se recomienda posición reducida o esperar confirmación.`);
  } else if (verdict === 'NEUTRAL') {
    if (contradictions.length > 0) {
      parts.push(`NEUTRAL POR CONFLICTO DE SEÑALES (Confianza: ${confidence}%). Los indicadores se contradicen mutuamente, lo que invalida cualquier veredicto direccional. Esperar resolución.`);
    } else {
      parts.push(`NEUTRAL (Confianza: ${confidence}%). Sin señal direccional clara. El activo consolida sin impulso definido.`);
    }
  } else if (verdict === 'SELL') {
    parts.push(`RECOMENDACIÓN DE VENTA (Confianza: ${confidence}%). Los indicadores técnicos muestran presión bajista y los fundamentales no ofrecen soporte suficiente.`);
  } else {
    parts.push(`VENTA FUERTE (Confianza: ${confidence}%). Consenso bajista confirmado por múltiples factores técnicos y fundamentales.`);
  }

  // Detalles técnicos clave
  const bullishPoints = factors.filter(f => f.signal === 'bullish').map(f => f.name);
  const bearishPoints = factors.filter(f => f.signal === 'bearish').map(f => f.name);

  if (bullishPoints.length > 0) {
    parts.push(`📈 Factores alcistas: ${bullishPoints.join(', ')}.`);
  }
  if (bearishPoints.length > 0) {
    parts.push(`📉 Factores bajistas: ${bearishPoints.join(', ')}.`);
  }

  // Contexto de soporte/resistencia
  if (priceBelowSupport) {
    parts.push(`🔴 ALERTA: El precio ($${priceFmt}) ha perforado el soporte en $${supportFmt}. Hasta que se recupere este nivel, el sesgo es bajista.`);
  } else if (priceAboveResistance) {
    parts.push(`🟢 Breakout: El precio ($${priceFmt}) ha superado la resistencia en $${resistanceFmt}.`);
  } else if (isNearSupport) {
    parts.push(`Cotiza cerca del soporte en $${supportFmt} — zona de posible rebote si se mantiene.`);
  } else if (isNearResistance) {
    parts.push(`Cotiza cerca de la resistencia en $${resistanceFmt} — riesgo de rechazo a corto plazo.`);
  }

  // Divergencia si es relevante
  if (divergence.type !== 'none' && divergence.strength > 0.3) {
    if (divergence.type === 'bullish') {
      parts.push(`📊 Divergencia alcista RSI/Precio (fuerza: ${(divergence.strength * 100).toFixed(0)}%) — posible agotamiento vendedor.`);
    } else {
      parts.push(`📊 Divergencia bajista RSI/Precio (fuerza: ${(divergence.strength * 100).toFixed(0)}%) — posible agotamiento comprador.`);
    }
  }

  // Nivel de riesgo
  const riskEmoji = riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : riskLevel === 'high' ? '🟠' : '🔴';
  parts.push(`${riskEmoji} Riesgo: ${riskLevel === 'low' ? 'Bajo' : riskLevel === 'medium' ? 'Medio' : riskLevel === 'high' ? 'Alto' : 'Extremo'}.`);

  return parts.join(' ');
}
