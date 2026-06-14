import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Asset, type NewsEvent, generateInitialAssets, generateRandomNews, INITIAL_ASSETS_DATA } from '../utils/marketSimulator';
import {
  evaluateStrategySignal,
  computePositionSizing,
  type BotConfig,
  type BotPosition,
} from '../core/strategyEngine';

// Re-exportados para los componentes que ya importan estos tipos desde el contexto
export type { BotConfig, BotPosition };
import { externalAssetsPool } from '../utils/externalAssets';
import {
  fetchBinanceAccount,
  executeBinanceOrder,
  fetchAlpacaAccount,
  fetchAlpacaPositions,
  executeAlpacaOrder
} from '../utils/apiSync';
import { classifyNewsSentiment } from '../utils/sentimentLLM';

export interface Transaction {
  id: string;
  timestamp: string;
  botName: string;
  assetSymbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  totalUsd: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'buy' | 'sell' | 'warning' | 'market';
}

export interface PortfolioHistoryPoint {
  timestamp: string;
  totalValue: number;
}

export interface AppApiConfig {
  apiKey: string;
  apiSecret: string;
  exchange: string;
  isConnected: boolean;
  binanceApiKey: string;
  binanceApiSecret: string;
  binanceConnected: boolean;
  alpacaApiKey: string;
  alpacaApiSecret: string;
  alpacaConnected: boolean;
  rapidApiKey?: string;
  rapidApiHost?: string;
  rapidApiConnected?: boolean;
  anthropicApiKey?: string;
  anthropicConnected?: boolean;
}

// Reglas de gestión de riesgo a nivel cartera (aplican a todos los bots en vivo)
export interface RiskConfig {
  maxConcurrentPositions: number;   // 0 = sin límite
  dailyLossLimitPct: number;        // 0 = desactivado. Pausa nuevas entradas si la cartera cae este % en el día
  trailingStopEnabled: boolean;     // el stop-loss sube con el precio para asegurar ganancias
  partialTakeProfitEnabled: boolean;// vende una parte en el TP y deja correr el resto
  partialTakeProfitPct: number;     // % de la posición a cerrar en el TP parcial (1–99)
}

const defaultRiskConfig: RiskConfig = {
  maxConcurrentPositions: 5,
  dailyLossLimitPct: 5,
  trailingStopEnabled: false,
  partialTakeProfitEnabled: false,
  partialTakeProfitPct: 50,
};

interface TradingContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeAssetId: string;
  setActiveAssetId: (id: string) => void;
  assets: Asset[];
  news: NewsEvent[];
  logs: LogEntry[];
  transactions: Transaction[];
  bots: BotConfig[];
  botPositions: BotPosition[];
  toggleBot: (id: string) => void;
  updateBotParams: (id: string, updates: Partial<BotConfig>) => void;
  balance: number;
  holdings: Record<string, number>;
  simSpeed: number; // en ms
  setSimSpeed: (speed: number) => void;
  resetPortfolio: (initialBalance: number) => void;
  portfolioValueHistory: PortfolioHistoryPoint[];
  triggerManualOrder: (symbol: string, type: 'BUY' | 'SELL', amountUsd: number) => void;
  apiConfig: AppApiConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<AppApiConfig>>;
  riskConfig: RiskConfig;
  setRiskConfig: React.Dispatch<React.SetStateAction<RiskConfig>>;
  tradingHalted: boolean;
  isLoading: boolean;
  isApiLive: boolean;
  dataMode: 'live' | 'simulation';
  setDataMode: (mode: 'live' | 'simulation') => void;
  timeframe: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y';
  changeTimeframe: (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y') => void;
  realNews: NewsEvent[];
  isLoadingRealNews: boolean;
  addExternalAsset: (symbol: string) => void;
  toggleAssetBotOperation: (symbol: string) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading debe usarse dentro de un TradingProvider');
  }
  return context;
};

const fetchWithProxy = async (url: string) => {
  if (url.startsWith('https://query1.finance.yahoo.com')) {
    try {
      const localUrl = url.replace('https://query1.finance.yahoo.com', '/api-yahoo');
      const res = await fetch(localUrl);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Vite local proxy fetch failed, falling back to public proxies...', e);
    }
  }

  // Fallback a proxies públicos
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  ];

  for (const getProxyUrl of proxies) {
    try {
      const res = await fetch(getProxyUrl(url));
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn(`Public proxy failed: ${getProxyUrl(url)}`, err);
    }
  }

  throw new Error(`All proxy attempts failed for ${url}`);
};

const getCurrentPeriodValue = (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y') => {
  const now = new Date();
  if (tf === '1m') return now.getMinutes();
  if (tf === '1h') return now.getHours();
  if (tf === '4h') return Math.floor(now.getHours() / 4);
  if (tf === '5D') return Math.floor(now.getDate() / 5);
  if (tf === '1M') return now.getMonth();
  if (tf === '6M') return Math.floor(now.getMonth() / 6);
  if (tf === '1Y') return now.getFullYear();
  return now.getDate(); // 1D
};

const STOCK_EXCHANGES: Record<string, string> = {
  AAPL: 'NASDAQ',
  TSLA: 'NASDAQ',
  NVDA: 'NASDAQ',
  TTWO: 'NASDAQ',
  ENR1: 'XETR',
  AMD: 'NASDAQ',
  ASML: 'NASDAQ',
  SMCI: 'NASDAQ',
  VRT: 'NYSE',
  INTC: 'NASDAQ',
  QCOM: 'NASDAQ',
  GE: 'NYSE',
  NEE: 'NYSE',
  FSLR: 'NASDAQ',
  U: 'NYSE',
  SONY: 'NYSE',
  EA: 'NASDAQ',
  NTDOY: 'OTC',
  CEG: 'NASDAQ'
};

const fetchWithTimeout = async (url: string, optionsOrMs: RequestInit | number = {}, ms = 2500) => {
  let finalOptions: RequestInit = {};
  let finalMs = ms;
  if (typeof optionsOrMs === 'number') {
    finalMs = optionsOrMs;
  } else {
    finalOptions = optionsOrMs;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), finalMs);
  try {
    const response = await fetch(url, { ...finalOptions, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
};

const fetchTradingViewPrices = async (
  symbols: string[],
  timeframe: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y' = '1m'
): Promise<Record<string, {
  price: number;
  changePercent: number;
  rsi?: number;
  macdHist?: number;
  sma10?: number;
  sma20?: number;
  sma30?: number;
  sma50?: number;
  sma100?: number;
}>> => {
  if (symbols.length === 0) return {};
  
  const formattedSymbols = symbols.map(s => {
    const sym = s.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'].includes(sym)) {
      return `BINANCE:${sym}USDT`;
    }
    const exchange = STOCK_EXCHANGES[sym] || 'NASDAQ';
    const cleanSym = sym === 'ENR1' ? 'ENR' : sym;
    return `${exchange}:${cleanSym}`;
  });

  const suffix = timeframe === '1m' ? '|1' : timeframe === '1h' ? '|60' : timeframe === '4h' ? '|240' : '';

  const payload = {
    symbols: {
      tickers: formattedSymbols,
      query: { types: [] }
    },
    columns: [
      "name",
      "close",
      "change",
      `RSI${suffix}`,
      `MACD.macd${suffix}`,
      `MACD.signal${suffix}`,
      `SMA10${suffix}`,
      `SMA20${suffix}`,
      `SMA30${suffix}`,
      `SMA50${suffix}`,
      `SMA100${suffix}`
    ]
  };

  const processResponse = (data: any) => {
    const results: Record<string, any> = {};
    if (data.data) {
      data.data.forEach((item: any) => {
        const sName = item.s;
        let symbol = '';
        
        if (sName.startsWith('BINANCE:')) {
          symbol = sName.replace('BINANCE:', '').replace('USDT', '');
        } else {
          const parts = sName.split(':');
          symbol = parts[1] === 'ENR' ? 'ENR1' : parts[1];
        }

        results[symbol] = {
          price: item.d[1],
          changePercent: item.d[2],
          rsi: item.d[3] !== null ? item.d[3] : undefined,
          macdHist: item.d[4] !== null && item.d[5] !== null ? item.d[4] - item.d[5] : undefined,
          sma10: item.d[6] !== null ? item.d[6] : undefined,
          sma20: item.d[7] !== null ? item.d[7] : undefined,
          sma30: item.d[8] !== null ? item.d[8] : undefined,
          sma50: item.d[9] !== null ? item.d[9] : undefined,
          sma100: item.d[10] !== null ? item.d[10] : undefined
        };
      });
    }
    return results;
  };

  // 1. Intentar con el proxy local de Vite (/api-tradingview)
  try {
    const response = await fetchWithTimeout('/api-tradingview/global/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 2500);

    if (response.ok) {
      const data = await response.json();
      return processResponse(data);
    }
  } catch (e) {
    console.warn('Vite local proxy for TradingView scan failed, trying direct or fallback...', e);
  }

  // 2. Intentar de forma directa a TradingView (fallback si se despliega en producción)
  try {
    const response = await fetchWithTimeout('https://scanner.tradingview.com/global/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 2500);

    if (response.ok) {
      const data = await response.json();
      return processResponse(data);
    }
  } catch (e) {
    console.warn('Direct fetch to TradingView failed, trying public corsproxy...', e);
  }

  // 3. Intentar a través de corsproxy.io (último recurso)
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent('https://scanner.tradingview.com/global/scan')}`;
    const response = await fetchWithTimeout(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }, 2500);

    if (response.ok) {
      const data = await response.json();
      return processResponse(data);
    }
  } catch (err) {
    console.error('All attempts to fetch TradingView prices failed:', err);
  }

  return {};
};

// Helper function to fetch tweets from RapidAPI
async function fetchTweetsFromRapidAPI(
  symbol: string,
  name: string,
  apiKey: string,
  host: string
): Promise<NewsEvent[]> {
  try {
    const queryTerm = encodeURIComponent(`$${symbol.toUpperCase()} OR ${name}`);
    let url = '';
    
    if (host === 'twitter-api45.p.rapidapi.com') {
      url = `https://twitter-api45.p.rapidapi.com/search.php?query=${queryTerm}`;
    } else {
      url = `https://${host}/search?query=${queryTerm}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host
      }
    });

    if (!response.ok) {
      console.warn(`RapidAPI request failed with status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    let tweets: any[] = [];
    
    if (data.timeline && Array.isArray(data.timeline)) {
      tweets = data.timeline;
    } else if (data.results && Array.isArray(data.results)) {
      tweets = data.results;
    } else if (data.tweets && Array.isArray(data.tweets)) {
      tweets = data.tweets;
    } else if (data.data && Array.isArray(data.data)) {
      tweets = data.data;
    } else if (Array.isArray(data)) {
      tweets = data;
    }

    const newsEvents: NewsEvent[] = tweets.map((tweet: any) => {
      const tweetId = tweet.tweet_id || tweet.id || Math.random().toString();
      const text = tweet.text || tweet.full_text || tweet.content || '';
      
      // Intentar extraer el usuario
      const screenName = tweet.user?.screen_name || tweet.user?.username || 'TwitterUser';
      const userName = tweet.user?.name || 'Usuario de X';
      
      // Parsear fecha
      const dateStr = tweet.created_at || tweet.timestamp || new Date().toISOString();
      const date = new Date(dateStr);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

      // Sentimiento simple
      const lowerText = text.toLowerCase();
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      let score = 0;

      if (lowerText.includes('bullish') || lowerText.includes('buy') || lowerText.includes('long') || lowerText.includes('moon') || lowerText.includes('pump') || lowerText.includes('alza') || lowerText.includes('subida')) {
        impact = 'positive';
        score = 0.3;
      } else if (lowerText.includes('bearish') || lowerText.includes('sell') || lowerText.includes('short') || lowerText.includes('dump') || lowerText.includes('crash') || lowerText.includes('caida') || lowerText.includes('bajada')) {
        impact = 'negative';
        score = -0.3;
      }

      return {
        id: `tweet-${tweetId}`,
        timestamp: timeStr,
        headline: `𝕏 | @${screenName} (${userName})`,
        content: text,
        impact,
        score,
        assetSymbol: symbol.toUpperCase(),
        link: `https://x.com/${screenName}/status/${tweetId}`,
        source: 'twitter',
        rawDate: date.toISOString()
      } as NewsEvent;
    });

    return newsEvents;
  } catch (err) {
    console.error('Error fetching tweets from RapidAPI:', err);
    return [];
  }
}

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAssetId, setActiveAssetId] = useState('btc');
  const [simSpeed, setSimSpeed] = useState(3000); // 3s por defecto

  // Modo de datos: 'live' = solo datos reales (sin noticias mock ni historial inventado);
  // 'simulation' = sandbox autocontenido para probar estrategias. Por defecto Simulación.
  const [dataMode, setDataModeState] = useState<'live' | 'simulation'>(() => {
    try {
      const saved = localStorage.getItem('ai_trading_platform_data_mode');
      if (saved === 'live' || saved === 'simulation') return saved;
    } catch (e) {
      console.error('Error reading dataMode from localStorage', e);
    }
    return 'simulation';
  });
  const dataModeRef = useRef(dataMode);
  useEffect(() => { dataModeRef.current = dataMode; }, [dataMode]);
  const [timeframe, setTimeframe] = useState<'1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y'>('1m');
  const [realNews, setRealNews] = useState<NewsEvent[]>([]);
  const [isLoadingRealNews, setIsLoadingRealNews] = useState<boolean>(false);

  const changeTimeframe = (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y') => {
    setTimeframe(tf);
  };

  const setDataMode = (mode: 'live' | 'simulation') => {
    setDataModeState(mode);
    try {
      localStorage.setItem('ai_trading_platform_data_mode', mode);
    } catch (e) {
      console.error('Error saving dataMode to localStorage', e);
    }
    addLog(
      mode === 'live'
        ? 'Modo LIVE activado: solo datos reales. Sin noticias simuladas ni historial inventado; los activos sin datos reales quedan excluidos.'
        : 'Modo SIMULACIÓN activado: sandbox autocontenido con noticias y datos simulados para probar estrategias.',
      mode === 'live' ? 'info' : 'warning'
    );
  };

  const lastPeriodRef = useRef(getCurrentPeriodValue('1m'));

  // Estado del Portafolio
  const [balance, setBalance] = useState(5000); // $5,000 iniciales
  const [holdings, setHoldings] = useState<Record<string, number>>({
    BTC: 0,
    ETH: 0,
    SOL: 0,
    AAPL: 0,
    TSLA: 0,
    NVDA: 0,
    TTWO: 0,
    ENR1: 0,
    XRP: 0,
    XLM: 0,
    HBAR: 0,
  });

  // Datos de simulación
  const [assets, setAssets] = useState<Asset[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [portfolioValueHistory, setPortfolioValueHistory] = useState<PortfolioHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApiLive, setIsApiLive] = useState(false);

  // Configuración de API Keys para simulación del exchange real y Paper Trading
  const [apiConfig, setApiConfig] = useState<AppApiConfig>(() => {
    try {
      const saved = localStorage.getItem('ai_trading_platform_api_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error reading apiConfig from localStorage", e);
    }
    return {
      apiKey: '',
      apiSecret: '',
      exchange: 'binance_sandbox',
      isConnected: false,
      binanceApiKey: '',
      binanceApiSecret: '',
      binanceConnected: false,
      alpacaApiKey: '',
      alpacaApiSecret: '',
      alpacaConnected: false,
      rapidApiKey: '',
      rapidApiHost: 'twitter-api45.p.rapidapi.com',
      rapidApiConnected: false,
      anthropicApiKey: '',
      anthropicConnected: false,
    };
  });

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('ai_trading_platform_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

  // Reglas de gestión de riesgo a nivel cartera (persistidas)
  const [riskConfig, setRiskConfig] = useState<RiskConfig>(() => {
    try {
      const saved = localStorage.getItem('ai_trading_platform_risk_config');
      if (saved) return { ...defaultRiskConfig, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Error leyendo riskConfig de localStorage', e);
    }
    return defaultRiskConfig;
  });
  useEffect(() => {
    localStorage.setItem('ai_trading_platform_risk_config', JSON.stringify(riskConfig));
  }, [riskConfig]);
  const riskConfigRef = useRef(riskConfig);
  useEffect(() => { riskConfigRef.current = riskConfig; }, [riskConfig]);

  // Estado de pausa por límite de pérdida diaria
  const [tradingHalted, setTradingHalted] = useState(false);
  const tradingHaltedRef = useRef(false);
  // Seguimiento de la pérdida diaria
  const dayStartEquityRef = useRef(0);
  const dayKeyRef = useRef('');

  // Bots de Trading Autónomos
  const [bots, setBots] = useState<BotConfig[]>([
    {
      id: 'bot_rsi',
      name: 'RSI Rocío',
      strategyType: 'rsi',
      isActive: false,
      tradeSizeUsd: 1500,
      description: 'Opera basándose en zonas de sobreventa y sobrecompra del mercado.',
      params: {
        rsiOversold: 32,
        rsiOverbought: 68,
        maFast: 10,
        maSlow: 30,
        minSentimentScore: 0,
        riskPercent: 1.5,
        atrStopMultiplier: 2,
        riskRewardRatio: 2,
        cooldownCandles: 3,
        maxAssetExposurePercent: 25,
      },
    },
    {
      id: 'bot_macd',
      name: 'MACD Max',
      strategyType: 'macd',
      isActive: false,
      tradeSizeUsd: 2000,
      description: 'Analiza los cruces del histograma MACD para seguir tendencias veloces.',
      params: {
        rsiOversold: 30,
        rsiOverbought: 70,
        maFast: 12,
        maSlow: 26,
        minSentimentScore: 0,
        riskPercent: 2,
        atrStopMultiplier: 2,
        riskRewardRatio: 2,
        cooldownCandles: 2,
        maxAssetExposurePercent: 25,
      },
    },
    {
      id: 'bot_ma_crossover',
      name: 'Media Cruz',
      strategyType: 'ma_crossover',
      isActive: false,
      tradeSizeUsd: 2500,
      description: 'Utiliza cruces rápidos de medias móviles para capturar tendencias alcistas a largo plazo.',
      params: {
        rsiOversold: 30,
        rsiOverbought: 70,
        maFast: 10,
        maSlow: 30,
        minSentimentScore: 0,
        riskPercent: 1.5,
        atrStopMultiplier: 2.5,
        riskRewardRatio: 2.5,
        cooldownCandles: 4,
        maxAssetExposurePercent: 30,
      },
    },
    {
      id: 'bot_fundamental',
      name: 'Fundación F.',
      strategyType: 'fundamental',
      isActive: false,
      tradeSizeUsd: 3000,
      description: 'Opera exclusivamente según el sentimiento de noticias y ratios fundamentales premium.',
      params: {
        rsiOversold: 30,
        rsiOverbought: 70,
        maFast: 10,
        maSlow: 30,
        minSentimentScore: 0.35,
        riskPercent: 1,
        atrStopMultiplier: 3,
        riskRewardRatio: 2,
        cooldownCandles: 5,
        maxAssetExposurePercent: 20,
      },
    },
    {
      id: 'bot_consensus',
      name: 'Baby Fusión (Consenso)',
      strategyType: 'consensus',
      isActive: false,
      tradeSizeUsd: 3500,
      description: 'Fusiona múltiples estrategias y opera si un número mínimo de indicadores coinciden en confianza.',
      params: {
        rsiOversold: 32,
        rsiOverbought: 68,
        maFast: 10,
        maSlow: 30,
        minSentimentScore: 0.25,
        consensusThreshold: 3,
        activeStrategies: ['rsi', 'macd', 'ma_crossover', 'fundamental'],
        riskPercent: 1.5,
        atrStopMultiplier: 2,
        riskRewardRatio: 2.5,
        cooldownCandles: 3,
        maxAssetExposurePercent: 25,
      },
    },
  ]);

  // Posiciones abiertas por los bots (gestión de stop-loss / take-profit)
  const [botPositions, setBotPositions] = useState<BotPosition[]>([]);

  // Usamos referencias para acceder a los valores más recientes dentro del bucle de simulación sin reiniciarlo
  const assetsRef = useRef(assets);
  const balanceRef = useRef(balance);
  const holdingsRef = useRef(holdings);
  const botsRef = useRef(bots);
  const newsRef = useRef(news);
  const botPositionsRef = useRef(botPositions);
  // Contador monótono de velas cerradas (para cooldown y antigüedad de posiciones)
  const candleCountRef = useRef(0);
  // Última vela en la que cada bot cerró posición en un activo: clave `${botId}:${symbol}`
  const cooldownRef = useRef<Record<string, number>>({});

  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { newsRef.current = news; }, [news]);
  useEffect(() => { botPositionsRef.current = botPositions; }, [botPositions]);
  const isApiLiveRef = useRef(isApiLive);
  useEffect(() => { isApiLiveRef.current = isApiLive; }, [isApiLive]);

  const loadMarketData = async (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y' = '1m') => {
    setIsLoading(true);

    const mode = dataModeRef.current; // Modo activo al iniciar la carga

    // Configurar parámetros de intervalos y rangos
    let cryptoInterval = '1m';
    let cryptoLimit = 100;
    let stockInterval = '1m';
    let stockRange = '1d';
    let groupSize = 1;

    if (tf === '1m') {
      cryptoInterval = '1m';
      stockInterval = '1m';
      stockRange = '1d';
    } else if (tf === '1h') {
      cryptoInterval = '1h';
      stockInterval = '1h';
      stockRange = '7d';
    } else if (tf === '4h') {
      cryptoInterval = '4h';
      stockInterval = '1h'; // Yahoo no soporta 4h nativo, agrupamos cada 4 velas de 1h
      stockRange = '3mo';
      groupSize = 4;
    } else if (tf === '1D') {
      cryptoInterval = '1d';
      stockInterval = '1d';
      stockRange = '1y';
    } else if (tf === '5D') {
      cryptoInterval = '1d';
      cryptoLimit = 500;
      stockInterval = '1d';
      stockRange = '1y';
      groupSize = 5;
    } else if (tf === '1M') {
      cryptoInterval = '1M';
      stockInterval = '1mo';
      stockRange = '5y';
    } else if (tf === '6M') {
      cryptoInterval = '1M';
      cryptoLimit = 500;
      stockInterval = '1mo';
      stockRange = 'max';
      groupSize = 6;
    } else if (tf === '1Y') {
      cryptoInterval = '1M';
      cryptoLimit = 500;
      stockInterval = '1mo';
      stockRange = 'max';
      groupSize = 12;
    }

    // Inicializar primero con simulación local como respaldo rápido
    let currentAssets = generateInitialAssets();
    
    // Preservar los activos externos agregados por el usuario
    const addedExternals = assetsRef.current.filter(
      a => !currentAssets.some(ca => ca.symbol === a.symbol)
    );
    currentAssets = [...currentAssets, ...addedExternals];
    setAssets(currentAssets);
    
    let cryptoLoaded = false;
    let stockLoaded = false;

    // Obtener símbolos dinámicos
    const defaultCryptos = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'];
    const defaultStocks = ['AAPL', 'TSLA', 'NVDA', 'TTWO', 'ENR1'];

    const extraCryptos = assetsRef.current
      .filter(a => a.type === 'crypto' && !defaultCryptos.includes(a.symbol))
      .map(a => a.symbol);
    const extraStocks = assetsRef.current
      .filter(a => a.type === 'stock' && !defaultStocks.includes(a.symbol))
      .map(a => a.symbol);

    const cryptoSymbols = [...defaultCryptos, ...extraCryptos];
    const stockSymbols = [...defaultStocks, ...extraStocks];

    // Cargar precios en tiempo real e indicadores de TradingView Scanner para TODOS los activos de forma unificada
    let tvPrices: Record<string, any> = {};
    try {
      const allSymbols = [...cryptoSymbols, ...stockSymbols];
      tvPrices = await fetchTradingViewPrices(allSymbols, tf);
    } catch (e) {
      console.warn("Failed fetching live prices from TradingView Scanner on init:", e);
    }

    // 1. Cargar Criptomonedas (Binance - Con try/catch individual por token para evitar fallos masivos)
    let binanceTickers: Record<string, { price: number, changePercent: number }> = {};
    try {
      const symbolsQuery = JSON.stringify(cryptoSymbols.map(sym => `${sym}USDT`));
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsQuery)}`);
      if (res.ok) {
        const data = await res.json();
        data.forEach((item: any) => {
          const symbol = item.symbol.replace('USDT', '');
          binanceTickers[symbol] = {
            price: Number(item.lastPrice),
            changePercent: Number(item.priceChangePercent)
          };
        });
      }
    } catch (e) {
      console.warn('Failed fetching initial crypto tickers from Binance:', e);
    }
    try {
      const cryptoPromises = cryptoSymbols.map(async (symbol) => {
        try {
          const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${cryptoInterval}&limit=${cryptoLimit}`);
          if (!res.ok) throw new Error(`Error API Binance para ${symbol}`);
          const data = await res.json();
          let rawHistory = data.map((kline: any) => Number(kline[4]));
          if (groupSize > 1) {
            const aggregated: number[] = [];
            for (let i = 0; i < rawHistory.length; i += groupSize) {
              const chunk = rawHistory.slice(i, i + groupSize);
              if (chunk.length > 0) {
                aggregated.push(chunk[chunk.length - 1]);
              }
            }
            rawHistory = aggregated;
          }
          const priceHistory = rawHistory.slice(-100).map((p: number) => Number(p.toFixed(2)));
          return { symbol, priceHistory };
        } catch (e) {
          console.warn(`Error individual al cargar crypto ${symbol} de Binance:`, e);
          return null;
        }
      });

      const fetchedCryptosRaw = await Promise.all(cryptoPromises);
      const fetchedCryptos = fetchedCryptosRaw.filter((f): f is { symbol: string, priceHistory: number[] } => f !== null);

      currentAssets = currentAssets.map(asset => {
        if (asset.type === 'crypto') {
          const fetched = fetchedCryptos.find(f => f.symbol === asset.symbol);
          const tvData = tvPrices[asset.symbol];
          const binanceTicker = binanceTickers[asset.symbol];
          
          let lastPrice = binanceTicker?.price || asset.price;
          let priceHistory = asset.priceHistory;
          let changePercent = binanceTicker?.changePercent || asset.changePercent;

          const gotRealData = (fetched && fetched.priceHistory.length >= 2) || !!binanceTicker;

          if (fetched && fetched.priceHistory.length >= 2) {
            priceHistory = [...fetched.priceHistory];
            if (binanceTicker) {
              priceHistory[priceHistory.length - 1] = binanceTicker.price;
            } else {
              lastPrice = priceHistory[priceHistory.length - 1];
              const prevPrice = priceHistory[priceHistory.length - 2];
              changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
            }
          }

          return {
            ...asset,
            price: lastPrice,
            priceHistory,
            changePercent,
            realBasePrice: lastPrice,
            hasLiveData: gotRealData,
            dataMode: mode,
            // En Live no usamos el sentimiento hardcodeado: parte neutral y se llena
            // con noticias reales del activo seleccionado.
            sentimentScore: mode === 'live' ? 0 : asset.sentimentScore,
            tvRsi: tvData?.rsi,
            tvMacdHist: tvData?.macdHist,
            tvSma10: tvData?.sma10,
            tvSma20: tvData?.sma20,
            tvSma30: tvData?.sma30,
            tvSma50: tvData?.sma50,
            tvSma100: tvData?.sma100
          };
        }
        return asset;
      });
      
      cryptoLoaded = fetchedCryptos.length > 0;
      if (cryptoLoaded) {
        addLog(`Datos de criptomonedas cargados con éxito desde Binance API.`, 'info');
      }
    } catch (err) {
      console.error('Error al procesar promesas de Binance:', err);
    }

    // 2. Cargar Acciones (Yahoo Finance como fallback para historial)
    try {

      // 2b. Cargar historial de Yahoo Finance con try/catch individual
      const stockPromises = stockSymbols.map(async (symbol) => {
        try {
          const yahooSymbol = symbol === 'ENR1' ? 'ENR.DE' : symbol;
          const data = await fetchWithProxy(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${stockInterval}&range=${stockRange}`);
          const result = data.chart.result[0];
          const rawHistory: number[] = result.indicators.quote[0].close || [];
          let filteredHistory = rawHistory.filter((p: any) => p !== null && p !== undefined);

          // Agrupar si es para 4h
          if (groupSize > 1) {
            const aggregated: number[] = [];
            for (let i = 0; i < filteredHistory.length; i += groupSize) {
              const chunk = filteredHistory.slice(i, i + groupSize);
              if (chunk.length > 0) {
                aggregated.push(chunk[chunk.length - 1]);
              }
            }
            filteredHistory = aggregated;
          }

          const priceHistory = filteredHistory.slice(-100).map((p: number) => Number(p.toFixed(2)));
          return { symbol, priceHistory };
        } catch (e) {
          console.warn(`Error individual al cargar historial de ${symbol} en Yahoo Finance:`, e);
          return null;
        }
      });

      const fetchedStocksRaw = await Promise.all(stockPromises);
      const fetchedStocks = fetchedStocksRaw.filter((f): f is { symbol: string, priceHistory: number[] } => f !== null);

      currentAssets = currentAssets.map(asset => {
        if (asset.type === 'stock') {
          const fetched = fetchedStocks.find(f => f.symbol === asset.symbol);
          const tvData = tvPrices[asset.symbol];
          
          let lastPrice = tvData?.price || asset.price;
          let changePercent = tvData?.changePercent || asset.changePercent;
          let priceHistory: number[] = [];
          let gotRealData = false;

          if (fetched && fetched.priceHistory.length >= 2) {
            gotRealData = true;
            priceHistory = [...fetched.priceHistory];
            if (tvData) {
              priceHistory[priceHistory.length - 1] = tvData.price;
            } else {
              lastPrice = priceHistory[priceHistory.length - 1];
              const prevPrice = priceHistory[priceHistory.length - 2];
              changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
            }
          } else if (mode === 'live') {
            // MODO LIVE: no inventamos historial. Si solo tenemos el precio puntual de
            // TradingView lo conservamos como semilla mínima, pero el activo queda
            // marcado "sin datos" (hasLiveData=false) y se excluye de bots y análisis.
            priceHistory = tvData ? [tvData.price] : [...asset.priceHistory];
            gotRealData = false;
          } else {
            // MODO SIMULACIÓN: generamos historial sintético escalado al timeframe.
            const generateHistoryLocal = (p: number, timeframeStr: string): number[] => {
              const hist: number[] = [];
              let tfVol = 0.001; // 1m
              const steps = 60;
              if (timeframeStr === '1h') {
                tfVol = 0.004;
              } else if (timeframeStr === '4h') {
                tfVol = 0.009;
              } else if (timeframeStr === '1D') {
                tfVol = 0.022;
              } else if (timeframeStr === '5D') {
                tfVol = 0.05;
              } else if (timeframeStr === '1M') {
                tfVol = 0.12;
              } else if (timeframeStr === '6M') {
                tfVol = 0.25;
              } else if (timeframeStr === '1Y') {
                tfVol = 0.40;
              }
              const baseVol = INITIAL_ASSETS_DATA.find((d: any) => d.symbol === asset.symbol)?.volatility || 0.012;
              const finalVol = baseVol * tfVol * 10;
              
              let current = p;
              hist.push(current);
              for (let i = 0; i < steps; i++) {
                const change = current * (Math.random() - 0.5) * 2 * finalVol;
                current = Math.max(current + change, 0.01);
                hist.push(current);
              }

              const finalElement = hist[hist.length - 1];
              const factor = p / finalElement;
              return hist.map(val => Number((val * factor).toFixed(2)));
            };
            priceHistory = generateHistoryLocal(lastPrice, tf);
          }

          return {
            ...asset,
            price: lastPrice,
            priceHistory,
            changePercent,
            realBasePrice: lastPrice,
            hasLiveData: gotRealData,
            dataMode: mode,
            sentimentScore: mode === 'live' ? 0 : asset.sentimentScore,
            tvRsi: tvData?.rsi,
            tvMacdHist: tvData?.macdHist,
            tvSma10: tvData?.sma10,
            tvSma20: tvData?.sma20,
            tvSma30: tvData?.sma30,
            tvSma50: tvData?.sma50,
            tvSma100: tvData?.sma100
          };
        }
        return asset;
      });

      stockLoaded = Object.keys(tvPrices).length > 0 || fetchedStocks.length > 0;
      if (Object.keys(tvPrices).length > 0) {
        addLog(`Datos de acciones sincronizados en vivo con TradingView Scanner API.`, 'info');
      } else if (fetchedStocks.length > 0) {
        addLog(`Datos de acciones cargados de Yahoo Finance.`, 'info');
      } else {
        addLog('Error al cargar cotizaciones de acciones. Usando simulación local.', 'warning');
      }
    } catch (err) {
      console.error('Error general al cargar acciones:', err);
    }

    setAssets(currentAssets);
    setIsApiLive(cryptoLoaded || stockLoaded);
    setIsLoading(false);
  };

  // Carga inicial y recarga por cambio de timeframe o de modo de datos
  useEffect(() => {
    lastPeriodRef.current = getCurrentPeriodValue(timeframe);
    loadMarketData(timeframe);
  }, [timeframe, dataMode]);

  // Carga de noticias reales para el activo seleccionado (Google News RSS con Filtro Temporal + X/Twitter)
  useEffect(() => {
    const fetchRealNewsForAsset = async () => {
      const activeAsset = assets.find(a => a.id === activeAssetId);
      if (!activeAsset) return;

      setIsLoadingRealNews(true);
      setRealNews([]); // Limpiar noticias anteriores de inmediato para evitar mostrar noticias del activo previo
      
      const combinedNewsList: NewsEvent[] = [];

      // 1. Obtener noticias de Google News RSS
      try {
        const queryTerm = activeAsset.type === 'crypto' ? `${activeAsset.name} crypto` : `${activeAsset.name} stock`;

        // Intentar con ventana corta de 7 días
        let query = encodeURIComponent(`${queryTerm} when:7d`);
        let url = `https://news.google.com/rss/search?q=${query}&hl=es&gl=ES&ceid=ES:es&_cb=${Date.now()}`;
        
        // Usar proxies CORS
        const proxies = [
          (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
          (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        ];

        let xmlText = '';
        for (const getProxyUrl of proxies) {
          try {
            const res = await fetchWithTimeout(getProxyUrl(url), 4000);
            if (res.ok) {
              xmlText = await res.text();
              break;
            }
          } catch (e) {
            console.warn(`Proxy check failed for news (7d):`, e);
          }
        }

        // Si no hay noticias, intentar con ventana más amplia (30 días)
        if (!xmlText || !xmlText.includes('<item>')) {
          query = encodeURIComponent(`${queryTerm} when:30d`);
          url = `https://news.google.com/rss/search?q=${query}&hl=es&gl=ES&ceid=ES:es&_cb=${Date.now()}`;
          for (const getProxyUrl of proxies) {
            try {
              const res = await fetchWithTimeout(getProxyUrl(url), 4000);
              if (res.ok) {
                xmlText = await res.text();
                break;
              }
            } catch (e) {
              console.warn(`Proxy check failed for news (30d):`, e);
            }
          }
        }

        // Si sigue vacío, quitar restricción temporal
        if (!xmlText || !xmlText.includes('<item>')) {
          query = encodeURIComponent(queryTerm);
          url = `https://news.google.com/rss/search?q=${query}&hl=es&gl=ES&ceid=ES:es&_cb=${Date.now()}`;
          for (const getProxyUrl of proxies) {
            try {
              const res = await fetchWithTimeout(getProxyUrl(url), 4000);
              if (res.ok) {
                xmlText = await res.text();
                break;
              }
            } catch (e) {
              console.warn(`Proxy check failed for news (no limit):`, e);
            }
          }
        }

        if (xmlText) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
          const items = xmlDoc.getElementsByTagName('item');

          for (let i = 0; i < Math.min(items.length, 12); i++) {
            const item = items[i];
            const fullTitle = item.getElementsByTagName('title')[0]?.textContent || '';
            const description = item.getElementsByTagName('description')[0]?.textContent || '';
            const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || '';
            const link = item.getElementsByTagName('link')[0]?.textContent || '';

            const date = new Date(pubDate);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });

            // Separar título y editorial
            const parts = fullTitle.split(' - ');
            const publisher = parts.length > 1 ? parts.pop() : 'Google News';
            const headline = parts.join(' - ');

            const lowerTitle = headline.toLowerCase();
            let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
            let score = 0;

            if (lowerTitle.includes('cae') || lowerTitle.includes('baja') || lowerTitle.includes('multa') || lowerTitle.includes('demanda') || lowerTitle.includes('caída') || lowerTitle.includes('crisis') || lowerTitle.includes('pérdidas') || lowerTitle.includes('retraso') || lowerTitle.includes('desploma') || lowerTitle.includes('down') || lowerTitle.includes('fall') || lowerTitle.includes('drop') || lowerTitle.includes('decline') || lowerTitle.includes('sue') || lowerTitle.includes('risk')) {
              impact = 'negative';
              score = -0.35;
            } else if (lowerTitle.includes('sube') || lowerTitle.includes('récord') || lowerTitle.includes('crece') || lowerTitle.includes('lanzamiento') || lowerTitle.includes('éxito') || lowerTitle.includes('ganancias') || lowerTitle.includes('aprobación') || lowerTitle.includes('alianza') || lowerTitle.includes('up') || lowerTitle.includes('rise') || lowerTitle.includes('gain') || lowerTitle.includes('growth') || lowerTitle.includes('launch') || lowerTitle.includes('partnership')) {
              impact = 'positive';
              score = 0.35;
            }

            // Limpiar descripción de tags HTML
            const cleanDesc = description.replace(/<[^>]*>/g, '').slice(0, 160) + (description.length > 160 ? '...' : '');

            combinedNewsList.push({
              id: Math.random().toString(36).substring(2, 9),
              timestamp: timeStr,
              headline,
              content: cleanDesc || `Publicado por ${publisher}. Haz clic para ver el artículo original en detalle.`,
              impact,
              score,
              assetSymbol: activeAsset.symbol,
              link,
              source: 'google',
              rawDate: date.toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar noticias de Google News:', err);
      }

      // 2. Obtener tweets de X/Twitter si la API está conectada
      if (apiConfig.rapidApiConnected && apiConfig.rapidApiKey && apiConfig.rapidApiHost) {
        try {
          const tweets = await fetchTweetsFromRapidAPI(
            activeAsset.symbol,
            activeAsset.name,
            apiConfig.rapidApiKey,
            apiConfig.rapidApiHost
          );
          if (tweets && tweets.length > 0) {
            combinedNewsList.push(...tweets);
          }
        } catch (err) {
          console.error('Error al cargar tweets de X:', err);
        }
      }

      // 2.5 Reclasificar el sentimiento con un LLM (Claude Haiku) si está configurado.
      // Sustituye la heurística de palabras clave por una clasificación contextual
      // (ironía, negaciones). Si falla, se conservan los scores por palabras clave.
      if (apiConfig.anthropicConnected && apiConfig.anthropicApiKey && combinedNewsList.length > 0) {
        try {
          const scores = await classifyNewsSentiment(
            combinedNewsList.map(n => ({ headline: n.headline, content: n.content })),
            apiConfig.anthropicApiKey
          );
          combinedNewsList.forEach((n, i) => {
            const s = scores[i];
            if (typeof s === 'number') {
              n.score = Number(s.toFixed(2));
              n.impact = s > 0.15 ? 'positive' : s < -0.15 ? 'negative' : 'neutral';
            }
          });
        } catch (err) {
          console.warn('Clasificación de sentimiento con LLM falló; se usa la heurística de palabras clave.', err);
        }
      }

      // 3. Ordenar todo por fecha rawDate descendente
      combinedNewsList.sort((a, b) => {
        const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
        return dateB - dateA;
      });

      setRealNews(combinedNewsList);
      setIsLoadingRealNews(false);

      // MODO LIVE: derivar el sentimiento real del activo a partir de sus noticias
      // (Google News + X). Sustituye al sentimiento hardcodeado para que el bot
      // fundamental y el factor "Sentimiento" del análisis usen señales reales.
      if (dataModeRef.current === 'live') {
        const scored = combinedNewsList.filter(n => n.score !== 0);
        if (scored.length > 0) {
          // Media de los scores, amplificada suavemente y acotada a [-1, 1].
          const avg = scored.reduce((s, n) => s + n.score, 0) / scored.length;
          const aggregated = Math.max(-1, Math.min(1, avg * 1.8));
          setAssets(prev => prev.map(a =>
            a.symbol === activeAsset.symbol
              ? { ...a, sentimentScore: Number(aggregated.toFixed(2)) }
              : a
          ));
        }
      }
    };

    fetchRealNewsForAsset();
  }, [activeAssetId, assets.length, apiConfig.rapidApiConnected, apiConfig.rapidApiKey, apiConfig.rapidApiHost, apiConfig.anthropicConnected, apiConfig.anthropicApiKey, dataMode]);

  useEffect(() => {
    // Generar historial de cartera inicial
    const now = new Date();
    const history: PortfolioHistoryPoint[] = [];
    for (let i = 10; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60000);
      const timeStr = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      history.push({
        timestamp: timeStr,
        totalValue: 5000,
      });
    }
    setPortfolioValueHistory(history);

    addLog('Sistema inicializado. Listo para el trading automatizado.', 'info');
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        message,
        type,
      },
      ...prev.slice(0, 99), // Guardar últimos 100 logs
    ]);
  };

  const toggleBot = (id: string) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === id) {
        const nextState = !bot.isActive;
        addLog(`Bot [${bot.name}] ${nextState ? 'ENCENDIDO' : 'APAGADO'}`, nextState ? 'info' : 'warning');
        return { ...bot, isActive: nextState };
      }
      return bot;
    }));
  };

  const updateBotParams = (id: string, updates: Partial<BotConfig>) => {
    setBots(prev => prev.map(bot => {
      if (bot.id === id) {
        addLog(`Parámetros de bot [${bot.name}] actualizados.`, 'info');
        return { ...bot, ...updates };
      }
      return bot;
    }));
  };

  const resetPortfolio = (initialBalance: number) => {
    setBalance(initialBalance);
    const clearedHoldings: Record<string, number> = {
      BTC: 0,
      ETH: 0,
      SOL: 0,
      AAPL: 0,
      TSLA: 0,
      NVDA: 0,
      TTWO: 0,
      ENR1: 0,
      XRP: 0,
      XLM: 0,
      HBAR: 0,
    };
    
    // También inicializar holdings para cualquier activo externo que esté en la lista
    assetsRef.current.forEach(asset => {
      if (!clearedHoldings[asset.symbol]) {
        clearedHoldings[asset.symbol] = 0;
      }
    });

    setHoldings(clearedHoldings);
    setTransactions([]);

    // Limpiar posiciones abiertas de los bots y sus cooldowns
    botPositionsRef.current = [];
    setBotPositions([]);
    cooldownRef.current = {};
    candleCountRef.current = 0;

    // Reiniciar la gestión de riesgo diaria
    tradingHaltedRef.current = false;
    setTradingHalted(false);
    dayStartEquityRef.current = 0;
    dayKeyRef.current = '';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setPortfolioValueHistory([{ timestamp: timeStr, totalValue: initialBalance }]);
    setNews([]);
    setLogs([]);
    addLog(`Portafolio restablecido con saldo inicial de $${initialBalance.toLocaleString()} USD.`, 'info');
  };

  // Función interna para procesar transacciones de bots y manuales
  const executeTrade = async (
    botName: string,
    assetSymbol: string,
    type: 'BUY' | 'SELL',
    price: number,
    amountUsd: number
  ) => {
    const currentBalance = balanceRef.current;
    const currentHoldings = holdingsRef.current;
    const isCrypto = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'].includes(assetSymbol.toUpperCase());

    // --- CASO 1: Binance Testnet (Cripto Conectado) ---
    if (isCrypto && apiConfig.binanceConnected && apiConfig.binanceApiKey && apiConfig.binanceApiSecret) {
      try {
        addLog(`[${botName}] Enviando orden a Binance Testnet: ${type} ${assetSymbol}...`, 'info');
        const currentQty = currentHoldings[assetSymbol] || 0;
        const res = await executeBinanceOrder(
          assetSymbol,
          type,
          amountUsd,
          price,
          currentQty,
          apiConfig.binanceApiKey,
          apiConfig.binanceApiSecret
        );
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const execQty = res.executedQty ? Number(res.executedQty) : (amountUsd / price);
        const execPrice = res.cummulativeQuoteQty && res.executedQty && Number(res.executedQty) > 0
          ? (Number(res.cummulativeQuoteQty) / Number(res.executedQty))
          : price;
        const totalPaid = res.cummulativeQuoteQty ? Number(res.cummulativeQuoteQty) : amountUsd;
        
        const newTransaction: Transaction = {
          id: res.orderId ? String(res.orderId) : Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          botName,
          assetSymbol,
          type,
          price: Number(execPrice.toFixed(2)),
          amount: Number(execQty.toFixed(6)),
          totalUsd: Number(totalPaid.toFixed(2)),
        };

        setTransactions(prev => [newTransaction, ...prev]);
        addLog(
          `[${botName}] Orden de ${type} EJECUTADA en Binance: ${execQty.toFixed(4)} ${assetSymbol} a $${execPrice.toLocaleString()} USD (Total: $${totalPaid.toFixed(2)} USD)`,
          botName === 'Usuario' ? 'info' : (type === 'BUY' ? 'buy' : 'sell')
        );
        return true;
      } catch (err: any) {
        addLog(`[${botName}] Error al ejecutar orden en Binance: ${err.message || err}`, 'warning');
        return false;
      }
    }

    // --- CASO 2: Alpaca Paper Trading (Acciones Conectado) ---
    if (!isCrypto && apiConfig.alpacaConnected && apiConfig.alpacaApiKey && apiConfig.alpacaApiSecret) {
      try {
        addLog(`[${botName}] Enviando orden a Alpaca Paper Trading: ${type} ${assetSymbol}...`, 'info');
        const currentQty = currentHoldings[assetSymbol] || 0;
        const res = await executeAlpacaOrder(
          assetSymbol,
          type,
          amountUsd,
          price,
          currentQty,
          apiConfig.alpacaApiKey,
          apiConfig.alpacaApiSecret
        );

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newTransaction: Transaction = {
          id: res.id ? String(res.id) : Math.random().toString(36).substring(2, 9),
          timestamp: timeStr,
          botName,
          assetSymbol,
          type,
          price,
          amount: res.qty ? Number(res.qty) : (amountUsd / price),
          totalUsd: res.notional ? Number(res.notional) : amountUsd,
        };

        setTransactions(prev => [newTransaction, ...prev]);
        addLog(
          `[${botName}] Orden de ${type} ENVIADA a Alpaca: ${assetSymbol} (ID Cliente: ${res.client_order_id || res.id})`,
          botName === 'Usuario' ? 'info' : (type === 'BUY' ? 'buy' : 'sell')
        );
        return true;
      } catch (err: any) {
        addLog(`[${botName}] Error al ejecutar orden en Alpaca: ${err.message || err}`, 'warning');
        return false;
      }
    }

    // --- CASO 3: Simulación Local (Offline / Sin Conectar) ---
    if (type === 'BUY') {
      if (currentBalance < amountUsd) {
        if (botName === 'Usuario') {
          addLog(`Orden MANUAL rechazada: Saldo USD insuficiente para comprar ${assetSymbol}.`, 'warning');
        } else {
          addLog(`[${botName}] Orden de COMPRA cancelada: Saldo insuficiente ($${currentBalance.toFixed(2)} USD).`, 'warning');
        }
        return false;
      }
      
      const amount = Number((amountUsd / price).toFixed(6));
      
      setBalance(prev => Number((prev - amountUsd).toFixed(2)));
      setHoldings(prev => ({
        ...prev,
        [assetSymbol]: Number((prev[assetSymbol] + amount).toFixed(6)),
      }));

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        botName,
        assetSymbol,
        type: 'BUY',
        price,
        amount,
        totalUsd: amountUsd,
      };

      setTransactions(prev => [newTransaction, ...prev]);
      addLog(
        `[${botName}] COMPRA realizada con éxito: ${amount} ${assetSymbol} a $${price.toLocaleString()} USD (Total: $${amountUsd.toLocaleString()})`,
        botName === 'Usuario' ? 'info' : 'buy'
      );
      return true;
    } else {
      // SELL
      const availableAmount = currentHoldings[assetSymbol] || 0;
      if (availableAmount <= 0.000001) {
        if (botName === 'Usuario') {
          addLog(`Orden MANUAL rechazada: No tienes tenencias de ${assetSymbol} para vender.`, 'warning');
        } else {
          addLog(`[${botName}] Orden de VENTA cancelada: Sin tenencias disponibles de ${assetSymbol}.`, 'warning');
        }
        return false;
      }

      let amountToSell = availableAmount;
      if (botName !== 'Usuario') {
        const proposedAmount = amountUsd / price;
        amountToSell = Math.min(availableAmount, proposedAmount);
      }

      const totalUsd = Number((amountToSell * price).toFixed(2));

      setBalance(prev => Number((prev + totalUsd).toFixed(2)));
      setHoldings(prev => ({
        ...prev,
        [assetSymbol]: Number((prev[assetSymbol] - amountToSell).toFixed(6)),
      }));

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        botName,
        assetSymbol,
        type: 'SELL',
        price,
        amount: amountToSell,
        totalUsd,
      };

      setTransactions(prev => [newTransaction, ...prev]);
      addLog(
        `[${botName}] VENTA realizada con éxito: ${amountToSell.toFixed(6)} ${assetSymbol} a $${price.toLocaleString()} USD (Total recibidos: $${totalUsd.toLocaleString()})`,
        botName === 'Usuario' ? 'info' : 'sell'
      );
      return true;
    }
  };

  const triggerManualOrder = (symbol: string, type: 'BUY' | 'SELL', amountUsd: number) => {
    const asset = assetsRef.current.find(a => a.symbol === symbol);
    if (!asset) return;
    executeTrade('Usuario', symbol, type, asset.price, amountUsd);
  };

  // ── Gestión de posiciones de bots (mutación síncrona del ref + estado para UI) ──
  const addBotPosition = (pos: BotPosition) => {
    botPositionsRef.current = [...botPositionsRef.current, pos];
    setBotPositions(botPositionsRef.current);
  };

  const removeBotPosition = (id: string) => {
    botPositionsRef.current = botPositionsRef.current.filter(p => p.id !== id);
    setBotPositions(botPositionsRef.current);
  };

  const updateBotPosition = (id: string, patch: Partial<BotPosition>) => {
    botPositionsRef.current = botPositionsRef.current.map(p => (p.id === id ? { ...p, ...patch } : p));
    setBotPositions(botPositionsRef.current);
  };

  // Take-profit parcial: vende una fracción de la posición, mueve el stop a
  // break-even y extiende el objetivo para dejar correr el resto ("runner").
  const partialCloseBotPosition = async (pos: BotPosition, price: number, pct: number) => {
    const closeAmount = pos.amount * (pct / 100);
    const ok = await executeTrade(pos.botName, pos.assetSymbol, 'SELL', price, closeAmount * price);
    if (!ok) return;

    const remaining = pos.amount - closeAmount;
    const realizedPnl = (price - pos.entryPrice) * closeAmount;
    const tpDistance = pos.takeProfit - pos.entryPrice;

    updateBotPosition(pos.id, {
      amount: Number(remaining.toFixed(6)),
      partialTaken: true,
      stopLoss: Number(pos.entryPrice.toFixed(6)),                 // proteger a break-even
      takeProfit: Number((pos.entryPrice + tpDistance * 2).toFixed(6)), // objetivo extendido
    });

    addLog(
      `[${pos.botName}] TP PARCIAL en ${pos.assetSymbol}: vendido ${pct}% @ $${price.toLocaleString()} (+$${realizedPnl.toFixed(2)}). Stop a break-even, dejando correr el resto.`,
      'sell'
    );
  };

  // Abre una posición dimensionada por riesgo: el tamaño se calcula para que,
  // si salta el stop-loss (a distancia ATR * multiplicador), la pérdida sea
  // aproximadamente riskPercent del valor de la cartera.
  const openBotPosition = async (
    bot: BotConfig,
    asset: Asset,
    price: number,
    portfolioValue: number,
    availableBalance: number
  ): Promise<number> => {
    // Dimensionamiento por riesgo: misma matemática que usa el backtester.
    const riskPercent = bot.params.riskPercent ?? 1.5;
    const currentExposureUsd = (holdingsRef.current[asset.symbol] || 0) * price;
    const sizing = computePositionSizing(
      bot,
      asset.priceHistory,
      price,
      portfolioValue,
      availableBalance,
      currentExposureUsd
    );

    if (!sizing) {
      addLog(`[${bot.name}] Señal de compra en ${asset.symbol} descartada: tamaño por riesgo demasiado pequeño o exposición/efectivo insuficiente.`, 'info');
      return 0;
    }

    const { amountUsd, amount, stopLoss, takeProfit, stopDistance } = sizing;

    const ok = await executeTrade(bot.name, asset.symbol, 'BUY', price, amountUsd);
    if (!ok) return 0;

    addBotPosition({
      id: Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      assetSymbol: asset.symbol,
      entryPrice: price,
      amount: Number(amount.toFixed(6)),
      entryUsd: Number(amountUsd.toFixed(2)),
      stopLoss,
      takeProfit,
      openedAtCandle: candleCountRef.current,
      highWaterPrice: price,
      trailDistance: stopDistance,
      partialTaken: false,
    });

    addLog(
      `[${bot.name}] Posición ABIERTA en ${asset.symbol}: $${amountUsd.toFixed(0)} @ $${price.toLocaleString()} | SL $${stopLoss.toLocaleString()} (-${((stopDistance / price) * 100).toFixed(1)}%) | TP $${takeProfit.toLocaleString()} (+${(((takeProfit - price) / price) * 100).toFixed(1)}%) | Riesgo ${riskPercent}% de cartera.`,
      'buy'
    );

    return amountUsd;
  };

  // Cierra una posición existente vendiendo exactamente su cantidad.
  const closeBotPosition = async (pos: BotPosition, price: number, reason: string) => {
    const ok = await executeTrade(pos.botName, pos.assetSymbol, 'SELL', price, pos.amount * price);
    if (!ok) return;

    removeBotPosition(pos.id);
    cooldownRef.current[`${pos.botId}:${pos.assetSymbol}`] = candleCountRef.current;

    const pnl = (price - pos.entryPrice) * pos.amount;
    const pnlPct = ((price - pos.entryPrice) / pos.entryPrice) * 100;
    addLog(
      `[${pos.botName}] Posición CERRADA en ${pos.assetSymbol} por ${reason} @ $${price.toLocaleString()} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%).`,
      pnl >= 0 ? 'sell' : 'warning'
    );
  };

  // LOOP DE SIMULACIÓN Y ESTRATEGIAS DE BOTS
  useEffect(() => {
    const runSimulationTick = async () => {
      // 1. Generar nuevas noticias
      const currentAssets = assetsRef.current;
      if (currentAssets.length === 0) return;

      // En modo LIVE no se inyectan noticias simuladas (el feed usa noticias reales).
      const newNewsEvent = dataModeRef.current === 'simulation'
        ? generateRandomNews(currentAssets)
        : null;
      let updatedNewsList = newsRef.current;
      if (newNewsEvent) {
        updatedNewsList = [newNewsEvent, ...newsRef.current].slice(0, 15); // Guardar últimos 15 eventos de noticias
        setNews(updatedNewsList);
        addLog(`NOTICIA: ${newNewsEvent.headline} (Impacto: ${newNewsEvent.impact.toUpperCase()})`, 'market');
      }

      // 2. Mantener los precios base sin aplicar fluctuaciones simuladas
      let nextAssets = currentAssets.map(asset => ({ ...asset }));

      // Comprobar cambio de periodo para el timeframe actual
      const currentPeriodVal = getCurrentPeriodValue(timeframe);
      const isNewPeriod = currentPeriodVal !== lastPeriodRef.current;
      if (isNewPeriod) {
        lastPeriodRef.current = currentPeriodVal;
        candleCountRef.current += 1; // Contador monótono para cooldown y antigüedad de posiciones
      }

      // Obtener precios de criptomonedas directamente de Binance en tiempo real (evita discrepancias)
      let livePrices: Record<string, any> = {};
      let liveCryptoPrices: { symbol: string, price: number, changePercent: number }[] = [];

      const activeCryptos = currentAssets.filter(a => a.type === 'crypto').map(a => a.symbol);
      const activeStocks = currentAssets.filter(a => a.type === 'stock').map(a => a.symbol);

      if (activeCryptos.length > 0) {
        try {
          const symbolsQuery = JSON.stringify(activeCryptos.map(sym => `${sym}USDT`));
          const res = await fetchWithTimeout(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsQuery)}`, {}, 2500);
          if (res.ok) {
            const data = await res.json();
            liveCryptoPrices = data.map((item: any) => {
              const symbol = item.symbol.replace('USDT', '');
              return {
                symbol,
                price: Number(item.lastPrice),
                changePercent: Number(item.priceChangePercent)
              };
            });
          }
        } catch (err) {
          console.warn('Failed fetching real-time crypto prices from Binance:', err);
        }
      }

      // Obtener indicadores en vivo desde TradingView Scanner para TODOS los activos
      // (acciones y cripto). Para cripto el PRECIO seguirá viniendo de Binance, pero
      // así mantenemos frescos RSI/MACD/SMA reales también en cripto.
      const tvSymbols = [...activeCryptos, ...activeStocks];
      if (tvSymbols.length > 0) {
        try {
          livePrices = await fetchTradingViewPrices(tvSymbols, timeframe);
        } catch (err) {
          console.warn('Failed fetching live indicators from TradingView Scanner in tick:', err);
        }
      }

      const hasLiveCrypto = liveCryptoPrices.length > 0;
      const hasLiveStock = Object.keys(livePrices).length > 0;
      const currentLiveState = hasLiveCrypto || hasLiveStock;

      if (currentLiveState !== isApiLiveRef.current) {
        setIsApiLive(currentLiveState);
      }

      // Actualizar el precio final y el historial de TODOS los activos alineados con el timeframe
      nextAssets = nextAssets.map(asset => {
        let finalPrice = asset.price; // Precio fluctuado/simulado de tickAssets
        let updatedRealBasePrice = asset.realBasePrice;
        
        let tvRsi = asset.tvRsi;
        let tvMacdHist = asset.tvMacdHist;
        let tvSma10 = asset.tvSma10;
        let tvSma20 = asset.tvSma20;
        let tvSma30 = asset.tvSma30;
        let tvSma50 = asset.tvSma50;
        let tvSma100 = asset.tvSma100;

        const tvData = livePrices[asset.symbol];
        const liveCrypto = asset.type === 'crypto' ? liveCryptoPrices.find(l => l.symbol === asset.symbol) : null;

        let hasNewApiPrice = false;
        let newApiPrice = 0;
        let newApiChangePercent = 0;

        // PRECIO: para cripto preferimos Binance (más preciso y en tiempo real);
        // para acciones, TradingView. La fuente del precio es independiente de los
        // indicadores.
        if (liveCrypto) {
          hasNewApiPrice = true;
          newApiPrice = liveCrypto.price;
          newApiChangePercent = liveCrypto.changePercent;
        } else if (tvData) {
          hasNewApiPrice = true;
          newApiPrice = tvData.price;
          newApiChangePercent = tvData.changePercent;
        }

        // INDICADORES: se refrescan siempre que TradingView los devuelva, sin importar
        // de dónde venga el precio (mantiene RSI/MACD/SMA frescos también en cripto).
        if (tvData) {
          tvRsi = tvData.rsi;
          tvMacdHist = tvData.macdHist;
          tvSma10 = tvData.sma10;
          tvSma20 = tvData.sma20;
          tvSma30 = tvData.sma30;
          tvSma50 = tvData.sma50;
          tvSma100 = tvData.sma100;
        }

        if (hasNewApiPrice) {
          // Si hay precio nuevo de la API, nos sincronizamos
          finalPrice = newApiPrice;
          updatedRealBasePrice = newApiPrice;
        }

        const history = [...asset.priceHistory];

        // Siempre actualizamos el historial de precios para reflejar las fluctuaciones de la simulación
        if (isNewPeriod) {
          history.push(finalPrice);
          if (history.length > 100) history.shift();
        } else {
          if (history.length > 0) {
            history[history.length - 1] = finalPrice;
          } else {
            history.push(finalPrice);
          }
        }

        // Si se sincronizó un precio nuevo de API con su porcentaje de cambio, lo usamos.
        // De lo contrario, calculamos el porcentaje de cambio simulado con respecto al precio anterior de la historia.
        let finalChangePct = asset.changePercent;
        if (hasNewApiPrice) {
          finalChangePct = newApiChangePercent;
        } else {
          const prevPrice = history[history.length - 2] || finalPrice;
          finalChangePct = prevPrice > 0 ? (((finalPrice - prevPrice) / prevPrice) * 100) : 0;
        }

        return {
          ...asset,
          price: Number(finalPrice.toFixed(2)),
          priceHistory: history,
          changePercent: finalChangePct,
          realBasePrice: updatedRealBasePrice,
          dataMode: dataModeRef.current,
          // Si recibimos precio real este tick, el activo pasa a tener datos en vivo.
          hasLiveData: hasNewApiPrice ? true : asset.hasLiveData,
          tvRsi,
          tvMacdHist,
          tvSma10,
          tvSma20,
          tvSma30,
          tvSma50,
          tvSma100
        };
      });

      setAssets(nextAssets);

      // 3. Gestión de posiciones y lógica de bots
      //    - El stop-loss / take-profit se revisa en CADA tick (protege la posición
      //      aunque el bot se apague o el precio se mueva dentro de la vela).
      //    - Las señales de ENTRADA solo se evalúan al cierre de vela (isNewPeriod),
      //      lo que evita el "repintado": un cruce que aparece y desaparece dentro
      //      del mismo minuto ya no dispara compras/ventas espurias.

      // Valor actual de la cartera y efectivo disponible local (se descuenta a medida
      // que abrimos posiciones en este mismo tick, evitando gastar el saldo dos veces).
      const portfolioValueNow = balanceRef.current + nextAssets.reduce(
        (sum, a) => sum + (holdingsRef.current[a.symbol] || 0) * a.price,
        0
      );
      let availableBalanceLocal = balanceRef.current;
      const rc = riskConfigRef.current;

      // 3·0 Gestión de riesgo de cartera: límite de pérdida diaria.
      const dayKey = new Date().toDateString();
      if (dayKeyRef.current !== dayKey) {
        // Nuevo día: fijar la equity de referencia y levantar la pausa.
        dayKeyRef.current = dayKey;
        dayStartEquityRef.current = portfolioValueNow;
        if (tradingHaltedRef.current) {
          tradingHaltedRef.current = false;
          setTradingHalted(false);
          addLog('Nuevo día: el límite de pérdida diaria se ha reiniciado. Bots reactivados.', 'info');
        }
      }
      if (dayStartEquityRef.current <= 0) dayStartEquityRef.current = portfolioValueNow;
      const dailyPnlPct = ((portfolioValueNow - dayStartEquityRef.current) / dayStartEquityRef.current) * 100;
      if (rc.dailyLossLimitPct > 0 && dailyPnlPct <= -rc.dailyLossLimitPct && !tradingHaltedRef.current) {
        tradingHaltedRef.current = true;
        setTradingHalted(true);
        addLog(`⛔ LÍMITE DE PÉRDIDA DIARIA alcanzado (${dailyPnlPct.toFixed(1)}%). Bots pausados para nuevas entradas hasta mañana. Las posiciones abiertas siguen gestionándose con su SL/TP.`, 'warning');
      }

      // 3a. Gestión de posiciones abiertas en CADA tick: SL/TP, take-profit parcial
      //     y trailing stop (subir el stop si el precio sube).
      for (const pos of [...botPositionsRef.current]) {
        const asset = nextAssets.find(a => a.symbol === pos.assetSymbol);
        if (!asset) continue;
        const price = asset.price;

        // Stop-loss
        if (price <= pos.stopLoss) {
          await closeBotPosition(pos, price, 'STOP-LOSS 🛑');
          continue;
        }

        // Take-profit (parcial o total)
        if (price >= pos.takeProfit) {
          if (rc.partialTakeProfitEnabled && !pos.partialTaken && rc.partialTakeProfitPct > 0 && rc.partialTakeProfitPct < 100) {
            await partialCloseBotPosition(pos, price, rc.partialTakeProfitPct);
          } else {
            await closeBotPosition(pos, price, 'TAKE-PROFIT 🎯');
          }
          continue;
        }

        // Trailing stop: el stop sube con el precio manteniendo la distancia original.
        if (rc.trailingStopEnabled) {
          const high = Math.max(pos.highWaterPrice ?? pos.entryPrice, price);
          const trailDist = pos.trailDistance ?? (pos.entryPrice - pos.stopLoss);
          const newStop = high - trailDist;
          if (newStop > pos.stopLoss) {
            updateBotPosition(pos.id, { stopLoss: Number(newStop.toFixed(6)), highWaterPrice: high });
          } else if (high > (pos.highWaterPrice ?? 0)) {
            updateBotPosition(pos.id, { highWaterPrice: high });
          }
        }
      }

      // 3b. Señales de entrada/salida SOLO al cierre de vela
      if (isNewPeriod) {
        const activeBots = botsRef.current.filter(b => b.isActive);

        for (const bot of activeBots) {
          for (const asset of nextAssets) {
            // Si el activo tiene deshabilitada la operación de los bots, se ignora
            if (asset.allowedForBots === false) continue;
            // En modo LIVE, no operar sobre activos sin datos reales (nunca inventados)
            if (dataModeRef.current === 'live' && asset.hasLiveData === false) continue;

            const prices = asset.priceHistory;
            if (prices.length < 35) continue; // Esperar a tener suficiente historial

            const currentPrice = asset.price;
            const existingPos = botPositionsRef.current.find(
              p => p.botId === bot.id && p.assetSymbol === asset.symbol
            );

            const { signal, reason } = evaluateStrategySignal(bot, asset, prices, currentPrice, newNewsEvent);

            if (signal === 'BUY') {
              // Posición única: si el bot ya tiene posición en este activo, no promediar
              if (existingPos) continue;

              // Gestión de riesgo de cartera: pausa por pérdida diaria
              if (tradingHaltedRef.current) continue;

              // Gestión de riesgo de cartera: tope de posiciones simultáneas
              const maxPos = rc.maxConcurrentPositions;
              if (maxPos > 0 && botPositionsRef.current.length >= maxPos) {
                continue;
              }

              // Cooldown: esperar N velas tras cerrar la última posición en este activo
              const cdKey = `${bot.id}:${asset.symbol}`;
              const lastClosed = cooldownRef.current[cdKey];
              const cooldown = bot.params.cooldownCandles ?? 3;
              if (lastClosed !== undefined && candleCountRef.current - lastClosed < cooldown) {
                continue;
              }

              addLog(`[${bot.name}] Señal de COMPRA en ${asset.symbol} por ${reason}. Dimensionando por riesgo...`, 'info');
              const spent = await openBotPosition(bot, asset, currentPrice, portfolioValueNow, availableBalanceLocal);
              if (spent > 0) {
                availableBalanceLocal = Math.max(0, availableBalanceLocal - spent);
              }
            } else if (signal === 'SELL') {
              // Salida por estrategia (adicional al SL/TP). Solo cierra si hay posición abierta.
              if (existingPos) {
                await closeBotPosition(existingPos, currentPrice, `señal de salida (${reason})`);
              }
            }
          }
        }
      }

      // 4. Calcular el Valor Total actual de la cartera (Saldo + Tenencias * Precio)
      const currentBalance = balanceRef.current;
      const currentHoldings = holdingsRef.current;
      
      const holdingsValue = nextAssets.reduce((sum, asset) => {
        const amount = currentHoldings[asset.symbol] || 0;
        return sum + amount * asset.price;
      }, 0);

      const totalValue = Number((currentBalance + holdingsValue).toFixed(2));
      
      // Registrar en el historial de rendimiento de la cartera (max 60 puntos)
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setPortfolioValueHistory(prev => {
        const next = [...prev, { timestamp: timeStr, totalValue }];
        if (next.length > 60) next.shift();
        return next;
      });
    };

    const intervalId = setInterval(runSimulationTick, simSpeed);
    return () => clearInterval(intervalId);
  }, [simSpeed, timeframe]); // Actualizar cuando cambie la velocidad o el timeframe

  // Función para agregar un activo externo desde la pestaña de Discovery
  const addExternalAsset = (symbol: string) => {
    const exists = assetsRef.current.some(a => a.symbol === symbol);
    if (exists) return;

    const poolAsset = externalAssetsPool.find(a => a.symbol === symbol);
    if (!poolAsset) return;

    const defaultPrices: Record<string, number> = {
      AMD: 165.42,
      CEG: 215.18,
      ASML: 885.30,
      SMCI: 420.90,
      VRT: 94.65,
      RNDR: 7.82,
      TAO: 385.60,
      LINK: 15.45,
      NEAR: 5.92,
      FET: 2.14,
      INTC: 35.0,
      QCOM: 180.0,
      GE: 150.0,
      NEE: 70.0,
      FSLR: 190.0,
      OP: 2.50,
      U: 18.0,
      SONY: 85.0,
      EA: 135.0,
      NTDOY: 13.0
    };
    const startPriceVal = defaultPrices[symbol.toUpperCase()] || 100;
    
    const generateHistoryLocal = (p: number): number[] => {
      const hist: number[] = [];
      let current = p * 0.9;
      for (let i = 0; i < 50; i++) {
        current = current * (1 + (Math.random() - 0.48) * 0.03);
        hist.push(Number(current.toFixed(2)));
      }
      return hist;
    };

    const initialHistory = generateHistoryLocal(startPriceVal);
    
    const newAsset: Asset = {
      id: poolAsset.symbol.toLowerCase(),
      name: poolAsset.name,
      symbol: poolAsset.symbol,
      type: poolAsset.type,
      price: startPriceVal,
      priceHistory: initialHistory,
      changePercent: 0,
      peRatio: poolAsset.peRatio,
      socialVolume: poolAsset.socialVolume,
      whaleBalanceChange: poolAsset.type === 'crypto' ? 0.05 : undefined,
      // En Live el sentimiento parte neutral (se llenará con noticias reales); el
      // historial inicial es una semilla, así que aún no cuenta como dato en vivo.
      sentimentScore: dataModeRef.current === 'live' ? 0 : (poolAsset.sentiment - 50) / 100,
      marketCap: poolAsset.type === 'stock' ? 2.5e11 : 1.5e10,
      allowedForBots: true,
      dataMode: dataModeRef.current,
      hasLiveData: dataModeRef.current === 'simulation'
    };

    setAssets(prev => [...prev, newAsset]);
    
    setHoldings(prev => {
      if (prev[poolAsset.symbol] !== undefined) return prev;
      return {
        ...prev,
        [poolAsset.symbol]: 0
      };
    });

    addLog(`SISTEMA: Activo de descubrimiento ${poolAsset.symbol} (${poolAsset.name}) añadido a la lista activa para análisis y bots.`, 'info');
  };

  // Función para habilitar/deshabilitar operación de los bots sobre un activo
  const toggleAssetBotOperation = (symbol: string) => {
    setAssets(prev => prev.map(asset => {
      if (asset.symbol === symbol) {
        const currentAllowed = asset.allowedForBots !== false;
        const nextAllowed = !currentAllowed;
        
        addLog(`SISTEMA: Operaciones automáticas de bots en ${symbol} ${nextAllowed ? 'HABILITADAS' : 'DESHABILITADAS'}.`, nextAllowed ? 'info' : 'warning');
        
        return {
          ...asset,
          allowedForBots: nextAllowed
        };
      }
      return asset;
    }));
  };

  // Sincronización periódica de balances reales de las cuentas demo
  useEffect(() => {
    if (!apiConfig.binanceConnected && !apiConfig.alpacaConnected) return;

    const syncRealBalances = async () => {
      try {
        let updatedBalance = balanceRef.current;
        let updatedHoldings = { ...holdingsRef.current };
        let didChange = false;
        let binanceUsdt = 0;
        let alpacaCash = 0;

        // 1. Sincronizar Binance Testnet (Criptomonedas)
        if (apiConfig.binanceConnected && apiConfig.binanceApiKey && apiConfig.binanceApiSecret) {
          try {
            const binanceData = await fetchBinanceAccount(
              apiConfig.binanceApiKey,
              apiConfig.binanceApiSecret
            );
            binanceUsdt = binanceData.balanceUsdt;
            
            const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'];
            cryptoSymbols.forEach(sym => {
              updatedHoldings[sym] = binanceData.holdings[sym] || 0;
            });
            didChange = true;
          } catch (e) {
            console.error("Error sincronizando Binance Testnet account info:", e);
          }
        }

        // 2. Sincronizar Alpaca (Acciones)
        if (apiConfig.alpacaConnected && apiConfig.alpacaApiKey && apiConfig.alpacaApiSecret) {
          try {
            const alpacaAcct = await fetchAlpacaAccount(
              apiConfig.alpacaApiKey,
              apiConfig.alpacaApiSecret
            );
            alpacaCash = alpacaAcct.cash;
            
            const alpacaPositions = await fetchAlpacaPositions(
              apiConfig.alpacaApiKey,
              apiConfig.alpacaApiSecret
            );
            
            const stockSymbols = ['AAPL', 'TSLA', 'NVDA', 'TTWO', 'ENR1'];
            stockSymbols.forEach(sym => {
              const cleanSym = sym === 'ENR1' ? 'ENR' : sym;
              updatedHoldings[sym] = alpacaPositions[cleanSym] || 0;
            });
            didChange = true;
          } catch (e) {
            console.error("Error sincronizando Alpaca Paper Trading account info:", e);
          }
        }

        // Calcular saldo en efectivo total disponible
        if (apiConfig.binanceConnected && apiConfig.alpacaConnected) {
          updatedBalance = binanceUsdt + alpacaCash;
        } else if (apiConfig.binanceConnected) {
          updatedBalance = binanceUsdt;
        } else if (apiConfig.alpacaConnected) {
          updatedBalance = alpacaCash;
        }

        if (didChange) {
          setBalance(updatedBalance);
          setHoldings(updatedHoldings);
        }
      } catch (err) {
        console.error("Error general en el polleo de balances reales:", err);
      }
    };

    // Pollear balances reales cada 5 segundos
    syncRealBalances();
    const intervalId = setInterval(syncRealBalances, 5000);
    return () => clearInterval(intervalId);
  }, [
    apiConfig.binanceConnected,
    apiConfig.binanceApiKey,
    apiConfig.binanceApiSecret,
    apiConfig.alpacaConnected,
    apiConfig.alpacaApiKey,
    apiConfig.alpacaApiSecret
  ]);

  return (
    <TradingContext.Provider
      value={{
        activeTab,
        setActiveTab,
        activeAssetId,
        setActiveAssetId,
        assets,
        news,
        logs,
        transactions,
        bots,
        botPositions,
        toggleBot,
        updateBotParams,
        balance,
        holdings,
        simSpeed,
        setSimSpeed,
        resetPortfolio,
        portfolioValueHistory,
        triggerManualOrder,
        apiConfig,
        setApiConfig,
        riskConfig,
        setRiskConfig,
        tradingHalted,
        isLoading,
        isApiLive,
        dataMode,
        setDataMode,
        timeframe,
        changeTimeframe,
        realNews,
        isLoadingRealNews,
        addExternalAsset,
        toggleAssetBotOperation,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};
