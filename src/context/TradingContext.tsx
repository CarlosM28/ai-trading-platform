import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Asset, type NewsEvent, generateInitialAssets, generateRandomNews, INITIAL_ASSETS_DATA } from '../utils/marketSimulator';
import { calculateRSI, calculateMACD, calculateSMA, calculateSupportResistance } from '../utils/indicators';
import { externalAssetsPool } from '../utils/externalAssets';
import {
  fetchBinanceAccount,
  executeBinanceOrder,
  fetchAlpacaAccount,
  fetchAlpacaPositions,
  executeAlpacaOrder
} from '../utils/apiSync';

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
  };
}

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
}

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
  isLoading: boolean;
  isApiLive: boolean;
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

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAssetId, setActiveAssetId] = useState('btc');
  const [simSpeed, setSimSpeed] = useState(3000); // 3s por defecto
  const [timeframe, setTimeframe] = useState<'1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y'>('1m');
  const [realNews, setRealNews] = useState<NewsEvent[]>([]);
  const [isLoadingRealNews, setIsLoadingRealNews] = useState<boolean>(false);

  const changeTimeframe = (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y') => {
    setTimeframe(tf);
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
    };
  });

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('ai_trading_platform_api_config', JSON.stringify(apiConfig));
  }, [apiConfig]);

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
      },
    },
  ]);

  // Usamos referencias para acceder a los valores más recientes dentro del bucle de simulación sin reiniciarlo
  const assetsRef = useRef(assets);
  const balanceRef = useRef(balance);
  const holdingsRef = useRef(holdings);
  const botsRef = useRef(bots);
  const newsRef = useRef(news);

  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  useEffect(() => { newsRef.current = news; }, [news]);
  const isApiLiveRef = useRef(isApiLive);
  useEffect(() => { isApiLiveRef.current = isApiLive; }, [isApiLive]);

  const loadMarketData = async (tf: '1m' | '1h' | '4h' | '1D' | '5D' | '1M' | '6M' | '1Y' = '1m') => {
    setIsLoading(true);
    
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

          if (fetched && fetched.priceHistory.length >= 2) {
            priceHistory = [...fetched.priceHistory];
            if (tvData) {
              priceHistory[priceHistory.length - 1] = tvData.price;
            } else {
              lastPrice = priceHistory[priceHistory.length - 1];
              const prevPrice = priceHistory[priceHistory.length - 2];
              changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
            }
          } else {
            // Si Yahoo falló (ej: 429), generamos historial ficticio en base al precio actual y escalado al timeframe
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

  // Carga inicial y recarga por cambio de timeframe
  useEffect(() => {
    lastPeriodRef.current = getCurrentPeriodValue(timeframe);
    loadMarketData(timeframe);
  }, [timeframe]);

  // Carga de noticias reales para el activo seleccionado (Google News RSS con Filtro Temporal)
  useEffect(() => {
    const fetchRealNewsForAsset = async () => {
      const activeAsset = assets.find(a => a.id === activeAssetId);
      if (!activeAsset) return;

      setIsLoadingRealNews(true);
      setRealNews([]); // Limpiar noticias anteriores de inmediato para evitar mostrar noticias del activo previo
      
      try {
        const queryTerm = activeAsset.type === 'crypto' ? `${activeAsset.name} crypto` : `${activeAsset.name} stock`;
        


        // 1. Intentar con ventana corta de 7 días
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

        // 2. Si no hay noticias, intentar con ventana más amplia (30 días)
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

        // 3. Si sigue vacío, quitar restricción temporal
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

        if (!xmlText) {
          setRealNews([]);
          setIsLoadingRealNews(false);
          return;
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.getElementsByTagName('item');

        const newsList: NewsEvent[] = [];
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

          newsList.push({
            id: Math.random().toString(36).substring(2, 9),
            timestamp: timeStr,
            headline,
            content: cleanDesc || `Publicado por ${publisher}. Haz clic para ver el artículo original en detalle.`,
            impact,
            score,
            assetSymbol: activeAsset.symbol,
            link
          });
        }

        setRealNews(newsList);
      } catch (err) {
        console.error('Error al cargar noticias de Google News:', err);
        setRealNews([]);
      } finally {
        setIsLoadingRealNews(false);
      }
    };

    fetchRealNewsForAsset();
  }, [activeAssetId, assets.length]);

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

  // LOOP DE SIMULACIÓN Y ESTRATEGIAS DE BOTS
  useEffect(() => {
    const runSimulationTick = async () => {
      // 1. Generar nuevas noticias
      const currentAssets = assetsRef.current;
      if (currentAssets.length === 0) return;

      const newNewsEvent = generateRandomNews(currentAssets);
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

      // Obtener precios de acciones desde TradingView Scanner
      if (activeStocks.length > 0) {
        try {
          livePrices = await fetchTradingViewPrices(activeStocks, timeframe);
        } catch (err) {
          console.warn('Failed fetching live stock prices from TradingView Scanner in tick:', err);
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

        if (tvData) {
          hasNewApiPrice = true;
          newApiPrice = tvData.price;
          newApiChangePercent = tvData.changePercent;
        } else if (liveCrypto) {
          hasNewApiPrice = true;
          newApiPrice = liveCrypto.price;
          newApiChangePercent = liveCrypto.changePercent;
        }

        if (hasNewApiPrice) {
          // Si hay precio nuevo de la API, nos sincronizamos
          finalPrice = newApiPrice;
          updatedRealBasePrice = newApiPrice;
          
          if (tvData) {
            tvRsi = tvData.rsi;
            tvMacdHist = tvData.macdHist;
            tvSma10 = tvData.sma10;
            tvSma20 = tvData.sma20;
            tvSma30 = tvData.sma30;
            tvSma50 = tvData.sma50;
            tvSma100 = tvData.sma100;
          }
        } else {
          // Si no hay precio nuevo de la API (estático, cacheado o cerrado), dejamos el precio simulado fluctuante
          // y mantenemos el realBasePrice actual.
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

      // 3. Ejecutar Lógica de los Bots Activos
      const activeBots = botsRef.current.filter(b => b.isActive);
      
      activeBots.forEach(bot => {
        // Cada bot elige un activo aleatorio o los analiza secuencialmente. Para este simulador en tiempo real,
        // cada bot analiza un activo que cumpla con su criterio o revisa el activo activo seleccionado en pantalla
        // para dar retroalimentación visual al usuario en vivo. 
        // Para mayor realismo, cada bot analiza secuencialmente todos los activos.
        
        nextAssets.forEach(asset => {
          // Si el activo tiene deshabilitada la operacion de los bots, se ignora
          if (asset.allowedForBots === false) return;

          const prices = asset.priceHistory;
          if (prices.length < 35) return; // Esperar a tener suficientes precios

          const currentPrice = asset.price;
          const currentHolding = holdingsRef.current[asset.symbol] || 0;

          // Calcular soporte y resistencia locales
          const { support, resistance } = calculateSupportResistance(prices, 20);
          const isNearSupport = currentPrice <= support * 1.02; // Dentro de 2.0% del soporte
          const isNearResistance = currentPrice >= resistance * 0.98; // Dentro de 2.0% de la resistencia

          // --- ESTRATEGIA RSI ---
          if (bot.strategyType === 'rsi') {
            const rsi = calculateRSI(prices, 14);
            const oversoldLimit = bot.params.rsiOversold;
            const overboughtLimit = bot.params.rsiOverbought;

            if (rsi < oversoldLimit) {
              if (isNearSupport) {
                // Condición alcista: RSI en zona de sobreventa -> COMPRAR
                executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Señal de compra en ${asset.symbol} omitida: precio fuera de soporte (Precio: $${currentPrice.toLocaleString()}, Soporte: $${support.toLocaleString()}).`, 'info');
              }
            } else if (rsi > overboughtLimit && currentHolding > 0) {
              if (isNearResistance) {
                // Condición bajista: RSI sobrecomprado -> VENDER
                executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Señal de venta en ${asset.symbol} omitida: precio fuera de resistencia (Precio: $${currentPrice.toLocaleString()}, Resistencia: $${resistance.toLocaleString()}).`, 'info');
              }
            }
          }

          // --- ESTRATEGIA MACD ---
          else if (bot.strategyType === 'macd') {
            const macdData = calculateMACD(prices);
            
            // Crossover alcista: MACD cruza por encima de la señal (Histograma se vuelve positivo)
            // Crossover bajista: MACD cruza por debajo de la señal (Histograma se vuelve negativo)
            const prevPrices = prices.slice(0, -1);
            const prevMacdData = calculateMACD(prevPrices);

            const prevHist = prevMacdData.histogram;
            const currHist = macdData.histogram;

            if (prevHist < 0 && currHist > 0) {
              if (isNearSupport) {
                executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Cruce alcista MACD en ${asset.symbol} omitido por no estar en zona de soporte.`, 'info');
              }
            } else if (prevHist > 0 && currHist < 0 && currentHolding > 0) {
              if (isNearResistance) {
                executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Cruce bajista MACD en ${asset.symbol} omitido por no estar en zona de resistencia.`, 'info');
              }
            }
          }

          // --- ESTRATEGIA MEDIA CÓSMICA (CRUCE DE MEDIAS MÓVILES) ---
          else if (bot.strategyType === 'ma_crossover') {
            const fastPeriod = bot.params.maFast;
            const slowPeriod = bot.params.maSlow;

            const currFast = calculateSMA(prices, fastPeriod);
            const currSlow = calculateSMA(prices, slowPeriod);

            const prevPrices = prices.slice(0, -1);
            const prevFast = calculateSMA(prevPrices, fastPeriod);
            const prevSlow = calculateSMA(prevPrices, slowPeriod);

            // Cruce Dorado (Golden Cross): Rápida cruza de abajo hacia arriba de la Lenta -> COMPRA
            // Cruce de Muerte (Death Cross): Rápida cruza hacia abajo de la Lenta -> VENTA
            if (prevFast < prevSlow && currFast > currSlow) {
              if (isNearSupport) {
                executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Cruce Dorado en ${asset.symbol} omitido (precio fuera de soporte).`, 'info');
              }
            } else if (prevFast > prevSlow && currFast < currSlow && currentHolding > 0) {
              if (isNearResistance) {
                executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
              } else {
                addLog(`[${bot.name}] Cruce de Muerte en ${asset.symbol} omitido (precio fuera de resistencia).`, 'info');
              }
            }
          }

          // --- ESTRATEGIA FUNDAMENTALISTA ---
          else if (bot.strategyType === 'fundamental') {
            const hasCurrentNews = newNewsEvent && newNewsEvent.assetSymbol === asset.symbol;
            let shouldBuy = false;
            let shouldSell = false;
            let logReason = '';

            if (hasCurrentNews) {
              if (newNewsEvent.impact === 'positive') {
                shouldBuy = true;
                logReason = `noticia positiva de impacto inmediato: "${newNewsEvent.headline}"`;
              } else if (newNewsEvent.impact === 'negative') {
                shouldSell = true;
                logReason = `noticia negativa de impacto inmediato: "${newNewsEvent.headline}"`;
              }
            } else {
              const sentiment = asset.sentimentScore;
              if (sentiment >= bot.params.minSentimentScore) {
                shouldBuy = true;
                logReason = `sentimiento acumulado positivo (${(sentiment * 100).toFixed(0)}%)`;
              } else if (sentiment <= -bot.params.minSentimentScore) {
                shouldSell = true;
                logReason = `sentimiento acumulado negativo (${(sentiment * 100).toFixed(0)}%)`;
              }
            }

            if (shouldBuy) {
              if (isNearResistance) {
                addLog(`[${bot.name}] Compra fundamental en ${asset.symbol} bloqueada por zona de resistencia (Precio: $${currentPrice.toLocaleString()}, Resistencia: $${resistance.toLocaleString()}).`, 'info');
              } else {
                if (asset.type === 'stock') {
                  const pe = asset.peRatio || 50;
                  if (pe < 40) {
                    addLog(`[${bot.name}] Señal de compra en ${asset.symbol} por ${logReason} (P/E: ${pe}).`, 'info');
                    executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
                  }
                } else {
                  const social = asset.socialVolume || 0;
                  if (social > 4000) {
                    addLog(`[${bot.name}] Señal de compra en ${asset.symbol} por ${logReason} (Vol. social: ${social}).`, 'info');
                    executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
                  }
                }
              }
            } else if (shouldSell && currentHolding > 0) {
              if (isNearSupport) {
                addLog(`[${bot.name}] Venta fundamental en ${asset.symbol} bloqueada por zona de soporte (Soporte en $${support.toLocaleString()}).`, 'info');
              } else {
                addLog(`[${bot.name}] Señal de venta en ${asset.symbol} por ${logReason}.`, 'info');
                executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
              }
            }
          }

          // --- ESTRATEGIA DE CONSENSO MULTI-FILTRO (FUSIÓN) ---
          else if (bot.strategyType === 'consensus') {
            const activeStrats = bot.params.activeStrategies || ['rsi', 'macd', 'ma_crossover', 'fundamental'];
            const threshold = bot.params.consensusThreshold || 2;
            
            let buySignals = 0;
            let sellSignals = 0;
            let totalEvaluated = activeStrats.length;

            if (totalEvaluated > 0) {
              // 1. Evaluar RSI
              if (activeStrats.includes('rsi')) {
                const rsi = calculateRSI(prices, 14);
                if (rsi < bot.params.rsiOversold) buySignals++;
                else if (rsi > bot.params.rsiOverbought) sellSignals++;
              }

              // 2. Evaluar MACD
              if (activeStrats.includes('macd')) {
                const macdData = calculateMACD(prices);
                const prevPrices = prices.slice(0, -1);
                const prevMacdData = calculateMACD(prevPrices);
                const prevHist = prevMacdData.histogram;
                const currHist = macdData.histogram;

                if (prevHist < 0 && currHist > 0) buySignals++;
                else if (prevHist > 0 && currHist < 0) sellSignals++;
              }

              // 3. Evaluar Cruce de Medias
              if (activeStrats.includes('ma_crossover')) {
                const fastPeriod = bot.params.maFast;
                const slowPeriod = bot.params.maSlow;
                const currFast = calculateSMA(prices, fastPeriod);
                const currSlow = calculateSMA(prices, slowPeriod);
                const prevPrices = prices.slice(0, -1);
                const prevFast = calculateSMA(prevPrices, fastPeriod);
                const prevSlow = calculateSMA(prevPrices, slowPeriod);

                if (prevFast < prevSlow && currFast > currSlow) buySignals++;
                else if (prevFast > prevSlow && currFast < currSlow) sellSignals++;
              }

              // 4. Evaluar Sentimiento / Fundamental
              if (activeStrats.includes('fundamental')) {
                const hasCurrentNews = newNewsEvent && newNewsEvent.assetSymbol === asset.symbol;
                let fundSignal = 0; // +1 compra, -1 venta
                
                if (hasCurrentNews) {
                  if (newNewsEvent.impact === 'positive') fundSignal = 1;
                  else if (newNewsEvent.impact === 'negative') fundSignal = -1;
                } else {
                  const sentiment = asset.sentimentScore;
                  if (sentiment >= bot.params.minSentimentScore) fundSignal = 1;
                  else if (sentiment <= -bot.params.minSentimentScore) fundSignal = -1;
                }

                if (fundSignal === 1) {
                  if (asset.type === 'stock') {
                    const pe = asset.peRatio || 50;
                    if (pe < 40) buySignals++;
                  } else {
                    const social = asset.socialVolume || 0;
                    if (social > 4000) buySignals++;
                  }
                } else if (fundSignal === -1) {
                  sellSignals++;
                }
              }

              // 5. Añadir confirmación de Soporte y Resistencia al Consenso
              if (isNearSupport) {
                buySignals++; // Punto de coincidencia adicional
              }
              if (isNearResistance) {
                sellSignals++; // Punto de coincidencia adicional
              }
              
              // Ajustamos la base del total por los puntos adicionales de S/R
              const totalPossible = totalEvaluated + 1;

              // Si se alcanza el umbral de coincidencia de compra
              if (buySignals >= threshold) {
                if (isNearResistance) {
                  addLog(`[${bot.name}] Consenso de compra en ${asset.symbol} bloqueado por proximidad a resistencia.`, 'info');
                } else {
                  const buyConf = Math.round((buySignals / totalPossible) * 100);
                  addLog(`[${bot.name}] Consenso de COMPRA en ${asset.symbol}: ${buySignals} de ${totalPossible} indicadores a favor (Confianza: ${buyConf}%).`, 'info');
                  executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
                }
              } 
              // Si se alcanza el umbral de coincidencia de venta
              else if (sellSignals >= threshold && currentHolding > 0) {
                if (isNearSupport) {
                  addLog(`[${bot.name}] Consenso de venta en ${asset.symbol} bloqueado por proximidad a soporte.`, 'info');
                } else {
                  const sellConf = Math.round((sellSignals / totalPossible) * 100);
                  addLog(`[${bot.name}] Consenso de VENTA en ${asset.symbol}: ${sellSignals} de ${totalPossible} indicadores a favor (Confianza: ${sellConf}%).`, 'info');
                  executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
                }
              }
            }
          }
        });
      });

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
      sentimentScore: (poolAsset.sentiment - 50) / 100,
      marketCap: poolAsset.type === 'stock' ? 2.5e11 : 1.5e10,
      allowedForBots: true
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
        isLoading,
        isApiLive,
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
