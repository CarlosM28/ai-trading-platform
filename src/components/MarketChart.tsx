import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { calculateRSI, calculateSMA, calculateMACD } from '../utils/indicators';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const MarketChart: React.FC = () => {
  const { assets, activeAssetId, timeframe } = useTrading();
  const [chartType, setChartType] = useState<'tv' | 'quant'>('tv');

  const asset = useMemo(() => {
    return assets.find(a => a.id === activeAssetId) || assets[0];
  }, [assets, activeAssetId]);

  const tvSymbol = useMemo(() => {
    if (!asset) return '';
    if (asset.symbol === 'BTC') return 'BINANCE:BTCUSDT';
    if (asset.symbol === 'ETH') return 'BINANCE:ETHUSDT';
    if (asset.symbol === 'SOL') return 'BINANCE:SOLUSDT';
    if (asset.symbol === 'ENR1') return 'XETR:ENR';
    if (asset.type === 'stock') return `NASDAQ:${asset.symbol}`;
    return `BINANCE:${asset.symbol}USDT`;
  }, [asset]);

  const tvInterval = useMemo(() => {
    if (timeframe === '1m') return '1';
    if (timeframe === '1h') return '60';
    if (timeframe === '4h') return '240';
    return 'D';
  }, [timeframe]);

  const prices = asset ? asset.priceHistory : [];

  // Parámetros de dibujo del gráfico SVG
  const width = 600;
  const height = 240;
  const padding = 20;

  // Calcular límites de precio
  const { minPrice, maxPrice, points, smaFastPoints, smaSlowPoints } = useMemo(() => {
    // Tomar los últimos 35 puntos para que el gráfico sea legible y dinámico
    const dataPoints = prices.slice(-35);
    if (dataPoints.length === 0) {
      return { minPrice: 0, maxPrice: 0, points: [], smaFastPoints: [], smaSlowPoints: [] };
    }
    
    let min = Math.min(...dataPoints);
    let max = Math.max(...dataPoints);
    
    // Dar un margen del 5% arriba y abajo
    const range = max - min || 1;
    min = Math.max(0, min - range * 0.05);
    max = max + range * 0.05;

    // Calcular SMAs para cada uno de los puntos en pantalla
    const fastSMA: number[] = [];
    const slowSMA: number[] = [];

    // Para cada punto en dataPoints, necesitamos calcular el SMA usando el historial completo de precios
    const displayLen = dataPoints.length;
    const totalLen = prices.length;
    
    for (let i = 0; i < displayLen; i++) {
      const idxInTotal = totalLen - displayLen + i;
      const subHistory = prices.slice(0, idxInTotal + 1);
      
      fastSMA.push(calculateSMA(subHistory, 10));
      slowSMA.push(calculateSMA(subHistory, 30));
    }

    return { 
      minPrice: min, 
      maxPrice: max, 
      points: dataPoints,
      smaFastPoints: fastSMA,
      smaSlowPoints: slowSMA
    };
  }, [prices]);

  // Convertir valores a coordenadas SVG
  const getCoordinates = (val: number, index: number, total: number) => {
    if (maxPrice === minPrice) return { x: 0, y: 0 };
    const x = padding + (index / (total - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minPrice) / (maxPrice - minPrice)) * (height - 2 * padding);
    return { x, y };
  };

  // Crear cadenas de puntos para los paths de SVG
  const { linePath, areaPath, fastSmaPath, slowSmaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '', fastSmaPath: '', slowSmaPath: '' };

    let lPath = '';
    let fSmaPath = '';
    let sSmaPath = '';

    points.forEach((val, idx) => {
      const { x, y } = getCoordinates(val, idx, points.length);
      const { y: yFast } = getCoordinates(smaFastPoints[idx], idx, points.length);
      const { y: ySlow } = getCoordinates(smaSlowPoints[idx], idx, points.length);

      if (idx === 0) {
        lPath = `M ${x} ${y}`;
        fSmaPath = `M ${x} ${yFast}`;
        sSmaPath = `M ${x} ${ySlow}`;
      } else {
        lPath += ` L ${x} ${y}`;
        fSmaPath += ` L ${x} ${yFast}`;
        sSmaPath += ` L ${x} ${ySlow}`;
      }
    });

    const firstCoord = getCoordinates(points[0], 0, points.length);
    const lastCoord = getCoordinates(points[points.length - 1], points.length - 1, points.length);
    
    const aPath = `${lPath} L ${lastCoord.x} ${height - padding} L ${firstCoord.x} ${height - padding} Z`;

    return { linePath: lPath, areaPath: aPath, fastSmaPath: fSmaPath, slowSmaPath: sSmaPath };
  }, [points, minPrice, maxPrice, smaFastPoints, smaSlowPoints]);

  // Calcular métricas secundarias en pantalla
  const rsiValue = useMemo(() => calculateRSI(prices, 14), [prices]);
  const macdData = useMemo(() => calculateMACD(prices), [prices]);

  if (!asset) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Cargando datos del activo...</span>
      </div>
    );
  }

  const isUp = asset.changePercent >= 0;

  return (
    <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Asset Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {asset.name}
            <span style={{ fontSize: '1rem', color: 'var(--accent-secondary)', fontWeight: 600, background: 'rgba(0, 240, 255, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
              {asset.symbol}
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <DollarSign size={24} color="var(--accent-secondary)" />
            {asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px', 
            justifyContent: 'flex-end', 
            color: isUp ? 'var(--color-buy)' : 'var(--color-sell)',
            fontWeight: 700,
            fontSize: '0.95rem'
          }}>
            {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {isUp ? '+' : ''}{asset.changePercent.toFixed(2)}% (24h)
          </div>
        </div>
      </div>

      {/* Chart Selector Switcher */}
      <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,0.03)' }}>
        <button
          onClick={() => setChartType('tv')}
          style={{
            background: chartType === 'tv' ? 'var(--accent-primary)' : 'transparent',
            color: chartType === 'tv' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          TradingView Interactiva
        </button>
        <button
          onClick={() => setChartType('quant')}
          style={{
            background: chartType === 'quant' ? 'var(--accent-primary)' : 'transparent',
            color: chartType === 'quant' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            outline: 'none'
          }}
        >
          Métricas Quant (SVG)
        </button>
      </div>

      {/* TradingView or SVG chart display */}
      {chartType === 'tv' ? (
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
          <iframe
            src={`https://s.tradingview.com/widgetembed/?symbol=${tvSymbol}&interval=${tvInterval}&theme=dark&style=1&timezone=exchange`}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: '#131722' }}
          />
        </div>
      ) : (
        /* SVG Neon Chart Container */
        <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
          <defs>
            {/* Gradients */}
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isUp ? 'var(--color-buy)' : 'var(--accent-primary)'} stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent-primary)" />
              <stop offset="50%" stopColor="var(--accent-secondary)" />
              <stop offset="100%" stopColor={isUp ? 'var(--color-buy)' : 'var(--color-sell)'} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

          {/* Technical Indicators: SMA 10 and 30 */}
          {fastSmaPath && (
            <path 
              d={fastSmaPath} 
              fill="none" 
              stroke="#f59e0b" 
              strokeWidth="1.2" 
              strokeDasharray="3,3" 
              opacity="0.6"
            />
          )}
          {slowSmaPath && (
            <path 
              d={slowSmaPath} 
              fill="none" 
              stroke="#ec4899" 
              strokeWidth="1.2" 
              strokeDasharray="3,3" 
              opacity="0.6"
            />
          )}

          {/* Area & Price Line */}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="url(#lineGrad)" 
              strokeWidth="2.5" 
              filter="url(#glow)" 
            />
          )}

          {/* Grid Values annotations */}
          <text x={padding + 5} y={padding + 15} fill="var(--text-muted)" fontSize="9" opacity="0.6">
            Max: ${maxPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
          <text x={padding + 5} y={height - padding - 5} fill="var(--text-muted)" fontSize="9" opacity="0.6">
            Min: ${minPrice.toLocaleString(undefined, { maximumFractionDigits: 1 })}
          </text>
        </svg>
      </div>
    )}

      {/* Quick Technical Summary Footer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.03)'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>RSI (14)</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {rsiValue.toFixed(1)}
            <span className={rsiValue < 30 ? 'badge-buy' : rsiValue > 70 ? 'badge-sell' : 'badge-neutral'} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px' }}>
              {rsiValue < 32 ? 'Sobreventa' : rsiValue > 68 ? 'Sobrecompra' : 'Neutro'}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Histograma MACD</div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 700, 
            color: macdData.histogram >= 0 ? 'var(--color-buy)' : 'var(--color-sell)'
          }}>
            {macdData.histogram >= 0 ? '+' : ''}{macdData.histogram.toFixed(2)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tendencia Corto Plazo</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>
            {smaFastPoints[smaFastPoints.length - 1] > smaSlowPoints[smaSlowPoints.length - 1] ? (
              <span style={{ color: 'var(--color-buy)' }}>Alcista (10/30)</span>
            ) : (
              <span style={{ color: 'var(--color-sell)' }}>Bajista (10/30)</span>
            )}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Tendencia Medio/Largo Plazo</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>
            {(() => {
              const sma20 = calculateSMA(prices, 20);
              const sma80 = calculateSMA(prices, Math.min(80, prices.length));
              return sma20 > sma80 ? (
                <span style={{ color: 'var(--color-buy)' }}>Alcista (20/80)</span>
              ) : (
                <span style={{ color: 'var(--color-sell)' }}>Bajista (20/80)</span>
              );
            })()}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Sentimiento (IA)</div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: 700,
            color: asset.sentimentScore > 0.15 ? 'var(--color-buy)' : asset.sentimentScore < -0.15 ? 'var(--color-sell)' : 'var(--text-muted)'
          }}>
            {(asset.sentimentScore * 100).toFixed(0)}%
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '4px' }}>
              {asset.sentimentScore > 0.15 ? 'Bullish' : asset.sentimentScore < -0.15 ? 'Bearish' : 'Neutral'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
