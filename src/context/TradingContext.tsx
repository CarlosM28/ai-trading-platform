import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Asset, type NewsEvent, generateInitialAssets, tickAssets, generateRandomNews, isStockMarketClosed } from '../utils/marketSimulator';
import { calculateRSI, calculateMACD, calculateSMA } from '../utils/indicators';
import { externalAssetsPool } from '../utils/externalAssets';

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
  apiConfig: { apiKey: string; apiSecret: string; exchange: string; isConnected: boolean };
  setApiConfig: React.Dispatch<React.SetStateAction<{ apiKey: string; apiSecret: string; exchange: string; isConnected: boolean }>>;
  isLoading: boolean;
  isApiLive: boolean;
  timeframe: '1m' | '1h' | '4h' | '1D';
  changeTimeframe: (tf: '1m' | '1h' | '4h' | '1D') => void;
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

const getCurrentPeriodValue = (tf: '1m' | '1h' | '4h' | '1D') => {
  const now = new Date();
  if (tf === '1m') return now.getMinutes();
  if (tf === '1h') return now.getHours();
  if (tf === '4h') return Math.floor(now.getHours() / 4);
  return now.getDate(); // 1D
};

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeAssetId, setActiveAssetId] = useState('btc');
  const [simSpeed, setSimSpeed] = useState(3000); // 3s por defecto
  const [timeframe, setTimeframe] = useState<'1m' | '1h' | '4h' | '1D'>('1m');
  const [realNews, setRealNews] = useState<NewsEvent[]>([]);
  const [isLoadingRealNews, setIsLoadingRealNews] = useState<boolean>(false);

  const changeTimeframe = (tf: '1m' | '1h' | '4h' | '1D') => {
    setTimeframe(tf);
  };

  const lastPeriodRef = useRef(getCurrentPeriodValue('1m'));

  // Estado del Portafolio
  const [balance, setBalance] = useState(50000); // $50,000 iniciales
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

  // Configuración de API Keys para simulación del exchange real
  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    apiSecret: '',
    exchange: 'binance_sandbox',
    isConnected: false,
  });

  // Bots de Trading Autónomos
  const [bots, setBots] = useState<BotConfig[]>([
    {
      id: 'bot_rsi',
      name: 'RSI Rocío',
      strategyType: 'rsi',
      isActive: true,
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
      isActive: true,
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

  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { holdingsRef.current = holdings; }, [holdings]);
  useEffect(() => { botsRef.current = bots; }, [bots]);
  const isApiLiveRef = useRef(isApiLive);
  useEffect(() => { isApiLiveRef.current = isApiLive; }, [isApiLive]);

  const loadMarketData = async (tf: '1m' | '1h' | '4h' | '1D' = '1m') => {
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

    // 1. Cargar Criptomonedas (Binance - Directo, sin proxy)
    try {
      const cryptoSymbols = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'];
      const cryptoPromises = cryptoSymbols.map(async (symbol) => {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${cryptoInterval}&limit=${cryptoLimit}`);
        if (!res.ok) throw new Error(`Error API Binance para ${symbol}`);
        const data = await res.json();
        const priceHistory = data.map((kline: any) => Number(kline[4]));
        return { symbol, priceHistory };
      });

      const fetchedCryptos = await Promise.all(cryptoPromises);

      currentAssets = currentAssets.map(asset => {
        const fetched = fetchedCryptos.find(f => f.symbol === asset.symbol);
        if (fetched && fetched.priceHistory.length >= 2) {
          const priceHistory = fetched.priceHistory;
          const lastPrice = priceHistory[priceHistory.length - 1];
          const prevPrice = priceHistory[priceHistory.length - 2];
          const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
          return {
            ...asset,
            price: lastPrice,
            priceHistory,
            changePercent,
          };
        }
        return asset;
      });
      
      cryptoLoaded = true;
      addLog(`Datos de mercado cargados de Binance para BTC, ETH, SOL, XRP, XLM y HBAR (Intervalo: ${tf}).`, 'info');
    } catch (err) {
      console.error('Error al conectar con Binance API:', err);
      addLog('Error al conectar con Binance API. Criptomonedas simuladas.', 'warning');
    }

    // 2. Cargar Acciones (Yahoo Finance - Con proxy para evitar CORS en el navegador)
    try {
      const stockSymbols = ['AAPL', 'TSLA', 'NVDA', 'TTWO', 'ENR1'];
      const stockPromises = stockSymbols.map(async (symbol) => {
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
      });

      const fetchedStocks = await Promise.all(stockPromises);

      currentAssets = currentAssets.map(asset => {
        const fetched = fetchedStocks.find(f => f.symbol === asset.symbol);
        if (fetched && fetched.priceHistory.length >= 2) {
          const priceHistory = fetched.priceHistory;
          const lastPrice = priceHistory[priceHistory.length - 1];
          const prevPrice = priceHistory[priceHistory.length - 2];
          const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;
          return {
            ...asset,
            price: lastPrice,
            priceHistory,
            changePercent,
          };
        }
        return asset;
      });

      stockLoaded = true;
      addLog(`Datos de mercado cargados de Yahoo Finance para AAPL, TSLA, NVDA, TTWO y ENR1 (Intervalo: ${tf}).`, 'info');
    } catch (err) {
      console.error('Error al conectar con Yahoo Finance:', err);
      addLog('Error al conectar con Yahoo Finance. Acciones simuladas.', 'warning');
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
        
        // Función auxiliar para fetch con timeout
        const fetchWithTimeout = async (u: string, ms = 4000) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), ms);
          try {
            const response = await fetch(u, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (e) {
            clearTimeout(timeoutId);
            throw e;
          }
        };

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
        totalValue: 50000,
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
    const clearedHoldings = {
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
  const executeTrade = (
    botName: string,
    assetSymbol: string,
    type: 'BUY' | 'SELL',
    price: number,
    amountUsd: number
  ) => {
    const currentBalance = balanceRef.current;
    const currentHoldings = holdingsRef.current;

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
      
      // Actualizar estado de balance y tenencias
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

      // Si es bot, vende la proporción correspondiente a su tradeSize, o el total si es manual/excede tenencias
      let amountToSell = availableAmount;
      if (botName !== 'Usuario') {
        // Los bots venden el equivalente a su tradeSize en valor del activo, o todo lo que tengan
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
      let updatedNewsList = news;
      if (newNewsEvent) {
        updatedNewsList = [newNewsEvent, ...news].slice(0, 15); // Guardar últimos 15 eventos de noticias
        setNews(updatedNewsList);
        addLog(`NOTICIA: ${newNewsEvent.headline} (Impacto: ${newNewsEvent.impact.toUpperCase()})`, 'market');
      }

      // 2. Avanzar el precio del mercado con el impacto de noticias
      let nextAssets = tickAssets(currentAssets, updatedNewsList);

      // Comprobar cambio de periodo para el timeframe actual
      const currentPeriodVal = getCurrentPeriodValue(timeframe);
      const isNewPeriod = currentPeriodVal !== lastPeriodRef.current;
      if (isNewPeriod) {
        lastPeriodRef.current = currentPeriodVal;
      }

      // Obtener precios en vivo si la API de Binance está activa (solo para criptomonedas)
      let liveCryptoPrices: { symbol: string, price: number }[] = [];
      if (isApiLiveRef.current) {
        try {
          const res = await fetch('https://api.binance.com/api/v3/ticker/price');
          if (res.ok) {
            const data = await res.json();
            liveCryptoPrices = ['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'].map(sym => {
              const ticker = data.find((t: any) => t.symbol === `${sym}USDT`);
              return ticker ? { symbol: sym, price: Number(ticker.price) } : null;
            }).filter(Boolean) as any;
          }
        } catch (err) {
          console.error('Error obteniendo cotizaciones de Binance:', err);
        }
      }

      // Actualizar el precio final y el historial de TODOS los activos alineados con el timeframe
      nextAssets = nextAssets.map(asset => {
        // Si hay cotización en vivo (para cryptos), la usamos. Si no (para stocks o modo offline), usamos el precio de nextAssets (de tickAssets)
        const live = liveCryptoPrices.find(l => l.symbol === asset.symbol);
        const finalPrice = live ? live.price : asset.price;

        const history = [...asset.priceHistory];
        
        // Si es una acción y el mercado de valores está cerrado, no alteramos su precio histórico
        const isStockClosed = asset.type === 'stock' && isStockMarketClosed();

        if (!isStockClosed) {
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
        }

        const prevPrice = history[history.length - 2] || finalPrice;
        const changePercent = isStockClosed ? asset.changePercent : (((finalPrice - prevPrice) / prevPrice) * 100);

        return {
          ...asset,
          price: finalPrice,
          priceHistory: history,
          changePercent,
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

          // --- ESTRATEGIA RSI ---
          if (bot.strategyType === 'rsi') {
            const rsi = calculateRSI(prices, 14);
            const oversoldLimit = bot.params.rsiOversold;
            const overboughtLimit = bot.params.rsiOverbought;

            if (rsi < oversoldLimit) {
              // Condición alcista: RSI en zona de sobreventa -> COMPRAR
              executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
            } else if (rsi > overboughtLimit && currentHolding > 0) {
              // Condición bajista: RSI sobrecomprado -> VENDER
              executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
            }
          }

          // --- ESTRATEGIA MACD ---
          else if (bot.strategyType === 'macd') {
            const macdData = calculateMACD(prices);
            
            // Crossover alcista: MACD cruza por encima de la señal (Histograma se vuelve positivo)
            // Crossover bajista: MACD cruza por debajo de la señal (Histograma se vuelve negativo)
            // Necesitamos los últimos dos precios para detectar el cruce exacto
            const prevPrices = prices.slice(0, -1);
            const prevMacdData = calculateMACD(prevPrices);

            const prevHist = prevMacdData.histogram;
            const currHist = macdData.histogram;

            if (prevHist < 0 && currHist > 0) {
              executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
            } else if (prevHist > 0 && currHist < 0 && currentHolding > 0) {
              executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
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
              executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
            } else if (prevFast > prevSlow && currFast < currSlow && currentHolding > 0) {
              executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
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
            } else if (shouldSell && currentHolding > 0) {
              addLog(`[${bot.name}] Señal de venta en ${asset.symbol} por ${logReason}.`, 'info');
              executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
            }
          }

          // --- ESTRATEGIA DE CONSENSO MULTI-FILTRO (FUSIÓN) ---
          else if (bot.strategyType === 'consensus') {
            const activeStrats = bot.params.activeStrategies || ['rsi', 'macd', 'ma_crossover', 'fundamental'];
            const threshold = bot.params.consensusThreshold || 2;
            
            let buySignals = 0;
            let sellSignals = 0;
            const totalEvaluated = activeStrats.length;

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

              // Si se alcanza el umbral de coincidencia de compra
              if (buySignals >= threshold) {
                const buyConf = Math.round((buySignals / totalEvaluated) * 100);
                addLog(`[${bot.name}] Señal de compra en ${asset.symbol}: ${buySignals} de ${totalEvaluated} coinciden (Confianza: ${buyConf}%).`, 'info');
                executeTrade(bot.name, asset.symbol, 'BUY', currentPrice, bot.tradeSizeUsd);
              } 
              // Si se alcanza el umbral de coincidencia de venta
              else if (sellSignals >= threshold && currentHolding > 0) {
                const sellConf = Math.round((sellSignals / totalEvaluated) * 100);
                addLog(`[${bot.name}] Señal de venta en ${asset.symbol}: ${sellSignals} de ${totalEvaluated} coinciden (Confianza: ${sellConf}%).`, 'info');
                executeTrade(bot.name, asset.symbol, 'SELL', currentPrice, bot.tradeSizeUsd);
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
  }, [simSpeed, news]); // Actualizar cuando cambie la velocidad o se reciba noticia

  // Función para agregar un activo externo desde la pestaña de Discovery
  const addExternalAsset = (symbol: string) => {
    const exists = assetsRef.current.some(a => a.symbol === symbol);
    if (exists) return;

    const poolAsset = externalAssetsPool.find(a => a.symbol === symbol);
    if (!poolAsset) return;

    const startPriceVal = poolAsset.price || 100;
    
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
