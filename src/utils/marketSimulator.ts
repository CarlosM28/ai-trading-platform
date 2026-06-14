export interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: 'crypto' | 'stock';
  price: number;
  priceHistory: number[];
  changePercent: number;
  // Métricas fundamentales
  peRatio?: number;            // Solo Stocks
  eps?: number;                // Solo Stocks
  pegRatio?: number;           // Solo Stocks
  marketCap: number;
  socialVolume?: number;       // Solo Crypto (Menciones/hora)
  whaleBalanceChange?: number; // Solo Crypto (Flujo neto de billeteras grandes %)
  sentimentScore: number;      // Sentimiento del mercado de -1.0 (Muy Bajista) a 1.0 (Muy Alcista)
  allowedForBots?: boolean;    // Habilitado para operar con bots
  hasLiveData?: boolean;       // true si el precio/historial proviene de una API real (no sintético)
  dataMode?: 'live' | 'simulation'; // Modo bajo el que se generó/actualizó este activo
  realBasePrice?: number;      // Precio de cotización real inicial cargado de la API
  // Indicadores técnicos en tiempo real de TradingView Scanner API
  tvRsi?: number;
  tvMacdHist?: number;
  tvSma10?: number;
  tvSma20?: number;
  tvSma30?: number;
  tvSma50?: number;
  tvSma100?: number;
}

export interface NewsEvent {
  id: string;
  timestamp: string;
  headline: string;
  content: string;
  impact: 'positive' | 'negative' | 'neutral';
  score: number; // -1.0 a 1.0
  assetSymbol: string;
  link?: string;
  source?: 'google' | 'twitter' | 'simulator';
  rawDate?: string;
}

// Historial inicial para que los indicadores funcionen de inmediato (al menos 35 puntos)
function generateHistory(startPrice: number, points: number = 50, volatility: number = 0.015): number[] {
  const history: number[] = [];
  let current = startPrice - (startPrice * points * volatility * 0.2); // Empezar más abajo para simular subida general

  for (let i = 0; i < points; i++) {
    const change = current * (Math.random() - 0.48) * 2 * volatility; // Sesgado ligeramente alcista
    current = Math.max(current + change, 0.01);
    history.push(Number(current.toFixed(2)));
  }
  return history;
}

export const INITIAL_ASSETS_DATA = [
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'crypto' as const,
    price: 67240.50,
    volatility: 0.012,
    marketCap: 1320000000000,
    socialVolume: 8450,
    whaleBalanceChange: 0.12,
    sentimentScore: 0.25,
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'crypto' as const,
    price: 3480.20,
    volatility: 0.015,
    marketCap: 418000000000,
    socialVolume: 4200,
    whaleBalanceChange: -0.05,
    sentimentScore: 0.10,
  },
  {
    id: 'sol',
    name: 'Solana',
    symbol: 'SOL',
    type: 'crypto' as const,
    price: 165.75,
    volatility: 0.022,
    marketCap: 76000000000,
    socialVolume: 6100,
    whaleBalanceChange: 1.84,
    sentimentScore: 0.45,
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    symbol: 'AAPL',
    type: 'stock' as const,
    price: 312.06,
    volatility: 0.006,
    marketCap: 3250000000000,
    peRatio: 28.4,
    eps: 10.98,
    pegRatio: 2.1,
    sentimentScore: 0.15,
  },
  {
    id: 'tsla',
    name: 'Tesla Inc.',
    symbol: 'TSLA',
    type: 'stock' as const,
    price: 435.79,
    volatility: 0.018,
    marketCap: 1350000000000,
    peRatio: 45.2,
    eps: 9.64,
    pegRatio: 3.4,
    sentimentScore: -0.20,
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corp.',
    symbol: 'NVDA',
    type: 'stock' as const,
    price: 211.14,
    volatility: 0.020,
    marketCap: 3200000000000,
    peRatio: 72.8,
    eps: 2.90,
    pegRatio: 1.2,
    sentimentScore: 0.60,
  },
  {
    id: 'ttwo',
    name: 'Take-Two Interactive',
    symbol: 'TTWO',
    type: 'stock' as const,
    price: 224.16,
    volatility: 0.012,
    marketCap: 39000000000,
    peRatio: 38.2,
    eps: 5.86,
    pegRatio: 2.5,
    sentimentScore: 0.10,
  },
  {
    id: 'enr1',
    name: 'Siemens Energy AG',
    symbol: 'ENR1',
    type: 'stock' as const,
    price: 163.24,
    volatility: 0.015,
    marketCap: 130000000000,
    peRatio: 22.8,
    eps: 7.15,
    pegRatio: 1.8,
    sentimentScore: 0.20,
  },
  {
    id: 'xrp',
    name: 'Ripple',
    symbol: 'XRP',
    type: 'crypto' as const,
    price: 1.35,
    volatility: 0.025,
    marketCap: 75000000000,
    socialVolume: 3500,
    whaleBalanceChange: 0.45,
    sentimentScore: 0.15,
  },
  {
    id: 'xlm',
    name: 'Stellar Lumens',
    symbol: 'XLM',
    type: 'crypto' as const,
    price: 0.25,
    volatility: 0.028,
    marketCap: 7000000000,
    socialVolume: 1200,
    whaleBalanceChange: -0.15,
    sentimentScore: 0.05,
  },
  {
    id: 'hbar',
    name: 'Hedera Hashgraph',
    symbol: 'HBAR',
    type: 'crypto' as const,
    price: 0.10,
    volatility: 0.035,
    marketCap: 3500000000,
    socialVolume: 1800,
    whaleBalanceChange: 2.15,
    sentimentScore: 0.30,
  }
];

export function generateInitialAssets(): Asset[] {
  return INITIAL_ASSETS_DATA.map(data => {
    const priceHistory = generateHistory(data.price, 60, data.volatility);
    const lastPrice = priceHistory[priceHistory.length - 1];
    const prevPrice = priceHistory[priceHistory.length - 2];
    const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      type: data.type,
      price: lastPrice,
      priceHistory,
      changePercent,
      peRatio: data.peRatio,
      eps: data.eps,
      pegRatio: data.pegRatio,
      marketCap: data.marketCap,
      socialVolume: data.socialVolume,
      whaleBalanceChange: data.whaleBalanceChange,
      sentimentScore: data.sentimentScore,
      realBasePrice: data.price,
    };
  });
}

// Catálogo de noticias interesantes que afectan al mercado
const MOCK_NEWS_TEMPLATES = [
  {
    headline: "La Fed anuncia cambios en las tasas de interés",
    content: "La Reserva Federal insinúa que mantendrá estables las tasas de interés, calmando a los mercados de acciones y crypto.",
    assetSymbol: "ALL",
    impact: "positive" as const,
    score: 0.15,
  },
  {
    headline: "Hackeo mayor reportado en puente de finanzas descentralizadas",
    content: "Un puente DeFi intercadena sufre un hackeo de 80 millones de dólares, sembrando dudas sobre la seguridad de los contratos inteligentes.",
    assetSymbol: "ETH",
    impact: "negative" as const,
    score: -0.30,
  },
  {
    headline: "La SEC aprueba el primer ETF al contado de Solana",
    content: "En un movimiento histórico, los reguladores aprueban los fondos cotizados en bolsa para Solana, desatando un frenesí institucional.",
    assetSymbol: "SOL",
    impact: "positive" as const,
    score: 0.65,
  },
  {
    headline: "Tesla reporta entregas trimestrales por debajo de las expectativas",
    content: "Problemas en la cadena de suministro global reducen las entregas de vehículos eléctricos de Tesla, golpeando la confianza de los analistas.",
    assetSymbol: "TSLA",
    impact: "negative" as const,
    score: -0.40,
  },
  {
    headline: "NVIDIA revela un nuevo superchip de Inteligencia Artificial Blackwell",
    content: "El gigante de los semiconductores presenta una arquitectura de GPU de IA 30 veces más rápida, consolidando su monopolio tecnológico.",
    assetSymbol: "NVDA",
    impact: "positive" as const,
    score: 0.50,
  },
  {
    headline: "Apple presentará su dispositivo de Realidad Aumentada de bajo costo",
    content: "Reportes internos afirman que Apple acelerará la producción de una versión económica de su visor Vision Pro para finales de año.",
    assetSymbol: "AAPL",
    impact: "positive" as const,
    score: 0.20,
  },
  {
    headline: "Ballenas acumulan Bitcoin de manera agresiva en zonas de soporte",
    content: "Datos en cadena muestran transacciones récord de billeteras institucionales retirando BTC de exchanges hacia almacenamiento en frío.",
    assetSymbol: "BTC",
    impact: "positive" as const,
    score: 0.35,
  },
  {
    headline: "Investigación antimonopolio se intensifica sobre las grandes empresas de chips",
    content: "El Departamento de Justicia de EE.UU. inicia una investigación formal por prácticas exclusivas en el suministro de hardware para centros de datos de IA.",
    assetSymbol: "NVDA",
    impact: "negative" as const,
    score: -0.25,
  },
  {
    headline: "Problema en la actualización de software de Apple causa quejas en usuarios",
    content: "La última actualización de iOS reporta fallos en el consumo de batería y congelamientos espontáneos en modelos recientes.",
    assetSymbol: "AAPL",
    impact: "negative" as const,
    score: -0.15,
  },
  {
    headline: "Solana sufre una degradación de rendimiento de red por congestión de memecoins",
    content: "La red de Solana experimenta tiempos de confirmación lentos y transacciones fallidas debido a la altísima demanda de acuñación de tokens.",
    assetSymbol: "SOL",
    impact: "negative" as const,
    score: -0.20,
  },
  {
    headline: "Elon Musk anuncia expansión masiva de la conducción autónoma total FSD",
    content: "Tesla lanzará su versión beta de FSD en Europa y China en los próximos tres meses, abriendo una enorme vía de ingresos recurrentes.",
    assetSymbol: "TSLA",
    impact: "positive" as const,
    score: 0.45,
  },
  {
    headline: "Take-Two confirma la fecha de lanzamiento definitiva para GTA VI",
    content: "En un comunicado oficial, Take-Two asegura que el desarrollo ha concluido y el juego se lanzará el próximo otoño, desatando euforia en los mercados.",
    assetSymbol: "TTWO",
    impact: "positive" as const,
    score: 0.85,
  },
  {
    headline: "Dudas sobre el margen de beneficio de los próximos títulos de Take-Two",
    content: "Analistas estiman costos récord de mercadeo y desarrollo que podrían presionar el flujo de caja operativo de Take-Two a corto plazo.",
    assetSymbol: "TTWO",
    impact: "negative" as const,
    score: -0.25,
  },
  {
    headline: "Siemens Energy gana un contrato histórico para redes eléctricas en el Mar del Norte",
    content: "El consorcio liderado por Siemens Energy suministrará infraestructura clave para conectar parques eólicos marinos por un valor superior a 4.000 millones de euros.",
    assetSymbol: "ENR1",
    impact: "positive" as const,
    score: 0.65,
  },
  {
    headline: "Siemens Energy reporta provisiones adicionales por problemas técnicos de turbinas",
    content: "La división eólica Gamesa amplía sus provisiones por fallos de diseño en componentes, lo que impactará negativamente el balance de fin de año.",
    assetSymbol: "ENR1",
    impact: "negative" as const,
    score: -0.45,
  },
  {
    headline: "Ripple logra una victoria decisiva y definitiva frente a la SEC",
    content: "El tribunal falla completamente a favor de Ripple, declarando que las ventas secundarias no constituyen contratos de inversión, despejando la incertidumbre regulatoria.",
    assetSymbol: "XRP",
    impact: "positive" as const,
    score: 0.85,
  },
  {
    headline: "Preocupación en los mercados por la liberación de fondos en custodia de Ripple",
    content: "La programación de liberación mensual de tokens XRP en custodia siembra dudas sobre el incremento de presión de venta en el corto plazo.",
    assetSymbol: "XRP",
    impact: "negative" as const,
    score: -0.30,
  },
  {
    headline: "Stellar anuncia una alianza estratégica para remesas rápidas en América Latina",
    content: "La Fundación para el Desarrollo de Stellar firma un acuerdo de integración con importantes pasarelas de pago bancarias para abaratamiento de envíos transfronterizos.",
    assetSymbol: "XLM",
    impact: "positive" as const,
    score: 0.60,
  },
  {
    headline: "El volumen de transacciones de Stellar se contrae ante la competencia de L2s",
    content: "Datos de actividad muestran una migración de flujos de remesas hacia redes de segunda capa de Ethereum, presionando el uso del ledger nativo de Stellar.",
    assetSymbol: "XLM",
    impact: "negative" as const,
    score: -0.20,
  },
  {
    headline: "Hedera Hashgraph es elegida por una multinacional de consumo masivo para trazabilidad de carbono",
    content: "El consejo de gobernanza de Hedera confirma la incorporación de un nuevo nodo y un despliegue de millones de transacciones mensuales en su red principal.",
    assetSymbol: "HBAR",
    impact: "positive" as const,
    score: 0.70,
  },
  {
    headline: "Debate en la comunidad de Hedera por la distribución de subsidios a validadores",
    content: "Una propuesta para recortar las recompensas del tesoro a los operadores de nodos pequeños genera fricciones internas en el modelo descentralizado.",
    assetSymbol: "HBAR",
    impact: "negative" as const,
    score: -0.30,
  },
];

export function generateRandomNews(assets: Asset[]): NewsEvent | null {
  // 15% de probabilidad de que ocurra una noticia en cada tick
  if (Math.random() > 0.15) return null;

  const template = MOCK_NEWS_TEMPLATES[Math.floor(Math.random() * MOCK_NEWS_TEMPLATES.length)];
  let targetSymbol = template.assetSymbol;

  if (targetSymbol === "ALL") {
    // Asignar a un activo aleatorio para efectos prácticos
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
    targetSymbol = randomAsset.symbol;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: timeStr,
    headline: template.headline,
    content: template.content,
    impact: template.impact,
    score: template.score,
    assetSymbol: targetSymbol,
  };
}

/**
 * Comprueba si el mercado de valores de EE.UU. (NYSE/NASDAQ) está cerrado.
 * Abre de Lunes a Viernes de 9:30 AM a 4:00 PM EST (15:30 a 22:00 CET en España).
 */
export function isStockMarketClosed(): boolean {
  try {
    // Obtener las partes de la fecha en la zona horaria de Nueva York de forma robusta e independiente de locale local
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23"
    });
    
    const parts = formatter.formatToParts(new Date());
    const partValues: Record<string, number> = {};
    parts.forEach(part => {
      if (part.type !== 'literal') {
        partValues[part.type] = parseInt(part.value, 10);
      }
    });

    const year = partValues.year;
    const month = partValues.month;
    const dayOfMonth = partValues.day;
    const hour = partValues.hour;
    const minute = partValues.minute;

    // Calcular el día de la semana para la fecha de Nueva York de forma segura
    const nyDate = new Date(year, month - 1, dayOfMonth, hour, minute);
    const day = nyDate.getDay(); // 0 = Domingo, 6 = Sábado

    // 1. Fines de semana
    if (day === 0 || day === 6) return true;

    // 2. Horario bursátil de Wall Street (9:30 AM a 4:00 PM EST/EDT)
    const timeInMinutes = hour * 60 + minute;
    const startMarket = 9 * 60 + 30; // 9:30
    const endMarket = 16 * 60; // 16:00

    if (timeInMinutes < startMarket || timeInMinutes >= endMarket) return true;

    return false;
  } catch (e) {
    // Fallback local en caso de error de internacionalización o soporte de timeZone
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return true;
    
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    const startMarket = 15 * 60 + 30; // 15:30 CET
    const endMarket = 22 * 60; // 22:00 CET
    
    if (timeInMinutes < startMarket || timeInMinutes >= endMarket) return true;
    return false;
  }
}

/**
 * Actualiza el precio y las métricas de todos los activos en cada tick de simulación.
 */
export function tickAssets(assets: Asset[], activeNews: NewsEvent[]): Asset[] {
  return assets.map(asset => {
    const isClosed = asset.type === 'stock' && isStockMarketClosed();
    
    // 1. Encontrar noticias recientes asociadas a este activo
    const assetNews = activeNews.filter(n => n.assetSymbol === asset.symbol);
    
    // El impacto neto de las noticias afecta al sentimiento actual
    const newsImpact = assetNews.reduce((acc, curr) => acc + curr.score, 0);
    
    // Suavizado del sentimiento (se mueve lentamente hacia el impacto de las noticias, o vuelve a 0 si no hay noticias)
    let targetSentiment = asset.sentimentScore;
    if (assetNews.length > 0) {
      targetSentiment = Math.max(-1.0, Math.min(1.0, asset.sentimentScore + newsImpact * 0.3));
    } else {
      // Vuelve lentamente hacia un valor neutral
      targetSentiment = asset.sentimentScore * 0.95;
    }

    // Volatilidad del activo: reducir para stocks para evitar variaciones extremas en ticks de 3s
    let baseVol = INITIAL_ASSETS_DATA.find(d => d.symbol === asset.symbol)?.volatility || 0.01;
    if (asset.type === 'stock') {
      baseVol = isClosed ? baseVol * 0.03 : baseVol * 0.15; // Volatilidad reducida aún más si está cerrado, pero aún fluctúa
    }
    
    // El sentimiento amplifica o deprime el sesgo de la tendencia
    const marketShock = targetSentiment * baseVol * 1.5;
    const randomWalk = (Math.random() - 0.49) * 2 * baseVol; // Caminata aleatoria equilibrada
    
    let priceChangePercent = randomWalk + marketShock;

    // Fuerza de retorno a la media (reversión a la media) para evitar que se desvíe demasiado del precio real
    const referencePrice = asset.realBasePrice || (asset.priceHistory && asset.priceHistory.length >= 2 ? asset.priceHistory[asset.priceHistory.length - 2] : asset.price);
    if (referencePrice > 0) {
      const deviation = (asset.price - referencePrice) / referencePrice;
      const reversionSpeed = asset.type === 'stock' ? 0.35 : 0.12; // Fuerza de atracción más fuerte para acciones
      priceChangePercent -= deviation * reversionSpeed;
    }

    const newPrice = Math.max(0.01, asset.price * (1 + priceChangePercent));

    // El historial y changePercent se gestionan en el TradingContext para alinearse con el marco temporal seleccionado
    const newHistory = asset.priceHistory;
    const currentChangePercent = asset.changePercent;

    // Actualizar métricas fundamentales dinámicamente de forma realista
    let updatedPe = asset.peRatio;
    let updatedSocialVolume = asset.socialVolume;
    let updatedWhale = asset.whaleBalanceChange;

    if (asset.type === 'stock') {
      // Si el precio sube, el PE sube si las ganancias se mantienen constantes
      if (asset.peRatio && asset.eps) {
        updatedPe = Number((newPrice / asset.eps).toFixed(1));
      }
    } else {
      // Crypto: Las noticias aumentan el volumen social
      if (asset.socialVolume) {
        const baseSocial = INITIAL_ASSETS_DATA.find(d => d.symbol === asset.symbol)?.socialVolume || 1000;
        const sentimentMultiplier = 1 + Math.abs(targetSentiment) * 0.8;
        updatedSocialVolume = Math.round(baseSocial * sentimentMultiplier + (Math.random() - 0.5) * 200);
      }
      
      // Flujo de ballenas influenciado por el sentimiento
      updatedWhale = Number((targetSentiment * 2 + (Math.random() - 0.5) * 0.5).toFixed(2));
    }

    // Capitalización bursátil adaptada al precio actual
    const baseCap = INITIAL_ASSETS_DATA.find(d => d.symbol === asset.symbol)?.marketCap || 1e9;
    const basePrice = INITIAL_ASSETS_DATA.find(d => d.symbol === asset.symbol)?.price || 100;
    const updatedMarketCap = Math.round(baseCap * (newPrice / basePrice));

    return {
      ...asset,
      price: Number(newPrice.toFixed(2)),
      priceHistory: newHistory,
      changePercent: currentChangePercent,
      sentimentScore: Number(targetSentiment.toFixed(2)),
      peRatio: updatedPe,
      socialVolume: updatedSocialVolume,
      whaleBalanceChange: updatedWhale,
      marketCap: updatedMarketCap,
    };
  });
}
