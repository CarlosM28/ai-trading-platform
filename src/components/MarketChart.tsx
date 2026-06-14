import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { calculateRSI, calculateSMA, calculateMACD, calculateSupportResistance, calculateBollingerBands, calculateFibonacciLevels, resolveRSI, resolveMACD, resolveSMA } from '../utils/indicators';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export const MarketChart: React.FC = () => {
  const { assets, activeAssetId, timeframe } = useTrading();
  const [chartType, setChartType] = useState<'tv' | 'quant'>('tv');
  const [showSR, setShowSR] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [showFibo, setShowFibo] = useState<boolean>(false);

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
    if (timeframe === '5D' || timeframe === '1D') return 'D';
    if (timeframe === '1M' || timeframe === '6M') return 'W';
    if (timeframe === '1Y') return 'M';
    return 'D';
  }, [timeframe]);

  const prices = asset ? asset.priceHistory : [];

  // Parámetros de dibujo del gráfico SVG
  const width = 600;
  const height = 240;
  const padding = 20;

  // Calcular límites de precio y puntos de indicadores
  const { minPrice, maxPrice, points, smaFastPoints, smaSlowPoints, bbUpperPoints, bbLowerPoints } = useMemo(() => {
    // Tomar los últimos 35 puntos para que el gráfico sea legible y dinámico
    const dataPoints = prices.slice(-35);
    if (dataPoints.length === 0) {
      return { minPrice: 0, maxPrice: 0, points: [], smaFastPoints: [], smaSlowPoints: [], bbUpperPoints: [], bbLowerPoints: [] };
    }
    
    let min = Math.min(...dataPoints);
    let max = Math.max(...dataPoints);
    
    // Dar un margen del 5% arriba y abajo
    const range = max - min || 1;
    min = Math.max(0, min - range * 0.05);
    max = max + range * 0.05;

    // Calcular SMAs y Bollinger Bands para cada uno de los puntos en pantalla
    const fastSMA: number[] = [];
    const slowSMA: number[] = [];
    const bbUpper: number[] = [];
    const bbLower: number[] = [];

    // Para cada punto en dataPoints, necesitamos calcular el SMA usando el historial completo de precios
    const displayLen = dataPoints.length;
    const totalLen = prices.length;
    
    for (let i = 0; i < displayLen; i++) {
      const idxInTotal = totalLen - displayLen + i;
      const subHistory = prices.slice(0, idxInTotal + 1);
      
      fastSMA.push(calculateSMA(subHistory, 10));
      slowSMA.push(calculateSMA(subHistory, 30));

      const bb = calculateBollingerBands(subHistory, 20);
      bbUpper.push(bb.upper);
      bbLower.push(bb.lower);
    }

    // Ajustar mínimos y máximos en pantalla si las bandas de Bollinger están activas y exceden el rango
    const activeUpperMax = Math.max(...bbUpper);
    const activeLowerMin = Math.min(...bbLower.filter(v => v > 0));
    if (activeUpperMax > max) max = activeUpperMax * 1.01;
    if (activeLowerMin < min && activeLowerMin > 0) min = Math.max(0, activeLowerMin * 0.99);

    return { 
      minPrice: min, 
      maxPrice: max, 
      points: dataPoints,
      smaFastPoints: fastSMA,
      smaSlowPoints: slowSMA,
      bbUpperPoints: bbUpper,
      bbLowerPoints: bbLower
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
  const { linePath, areaPath, fastSmaPath, slowSmaPath, bbUpperPath, bbLowerPath, bbAreaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '', fastSmaPath: '', slowSmaPath: '', bbUpperPath: '', bbLowerPath: '', bbAreaPath: '' };

    let lPath = '';
    let fSmaPath = '';
    let sSmaPath = '';
    let bbUpPath = '';
    let bbLowPath = '';

    points.forEach((val, idx) => {
      const { x, y } = getCoordinates(val, idx, points.length);
      const { y: yFast } = getCoordinates(smaFastPoints[idx], idx, points.length);
      const { y: ySlow } = getCoordinates(smaSlowPoints[idx], idx, points.length);
      const { y: yBBUp } = getCoordinates(bbUpperPoints[idx], idx, points.length);
      const { y: yBBLow } = getCoordinates(bbLowerPoints[idx], idx, points.length);

      if (idx === 0) {
        lPath = `M ${x} ${y}`;
        fSmaPath = `M ${x} ${yFast}`;
        sSmaPath = `M ${x} ${ySlow}`;
        bbUpPath = `M ${x} ${yBBUp}`;
        bbLowPath = `M ${x} ${yBBLow}`;
      } else {
        lPath += ` L ${x} ${y}`;
        fSmaPath += ` L ${x} ${yFast}`;
        sSmaPath += ` L ${x} ${ySlow}`;
        bbUpPath += ` L ${x} ${yBBUp}`;
        bbLowPath += ` L ${x} ${yBBLow}`;
      }
    });

    const firstCoord = getCoordinates(points[0], 0, points.length);
    const lastCoord = getCoordinates(points[points.length - 1], points.length - 1, points.length);
    
    const aPath = `${lPath} L ${lastCoord.x} ${height - padding} L ${firstCoord.x} ${height - padding} Z`;

    // Bollinger Band Area Channel path tracing forward on upper, backward on lower
    let bbArPath = '';
    if (points.length >= 2) {
      bbArPath = bbUpPath;
      for (let i = points.length - 1; i >= 0; i--) {
        const { x } = getCoordinates(points[i], i, points.length);
        const { y: yBBLow } = getCoordinates(bbLowerPoints[i], i, points.length);
        bbArPath += ` L ${x} ${yBBLow}`;
      }
      bbArPath += ' Z';
    }

    return { 
      linePath: lPath, 
      areaPath: aPath, 
      fastSmaPath: fSmaPath, 
      slowSmaPath: sSmaPath,
      bbUpperPath: bbUpPath,
      bbLowerPath: bbLowPath,
      bbAreaPath: bbArPath
    };
  }, [points, minPrice, maxPrice, smaFastPoints, smaSlowPoints, bbUpperPoints, bbLowerPoints]);

  // Calcular métricas secundarias en pantalla.
  // RSI y MACD usan el accesor unificado: valor real de TradingView en Live, local
  // si no, igual que el motor de análisis y los bots (evita discrepancias).
  const rsiValue = useMemo(() => asset ? resolveRSI(asset) : calculateRSI(prices, 14), [asset, prices]);
  const macdData = useMemo(() => asset ? resolveMACD(asset) : calculateMACD(prices), [asset, prices]);
  const srShort = useMemo(() => calculateSupportResistance(prices, 20), [prices]);
  const srLong = useMemo(() => calculateSupportResistance(prices, 80), [prices]);
  const bbData = useMemo(() => calculateBollingerBands(prices, 20), [prices]);
  const fibData = useMemo(() => calculateFibonacciLevels(prices, 50), [prices]);

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

      {/* Chart Selector Switcher & Overlay Checkboxes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
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

        {chartType === 'quant' && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={showSR} onChange={() => setShowSR(!showSR)} style={{ accentColor: 'var(--accent-primary)', width: '13px', height: '13px', cursor: 'pointer' }} />
              Soporte y Resistencia
            </label>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={showBB} onChange={() => setShowBB(!showBB)} style={{ accentColor: 'var(--accent-primary)', width: '13px', height: '13px', cursor: 'pointer' }} />
              Bandas Bollinger
            </label>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
              <input type="checkbox" checked={showFibo} onChange={() => setShowFibo(!showFibo)} style={{ accentColor: 'var(--accent-primary)', width: '13px', height: '13px', cursor: 'pointer' }} />
              Fibonacci (50p)
            </label>
          </div>
        )}
      </div>

      {/* TradingView or SVG chart display */}
      {chartType === 'tv' ? (
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
          <iframe
            key={`${tvSymbol}-${timeframe}`}
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

          {/* 1. Bollinger Bands Channel (drawn behind price) */}
          {showBB && bbAreaPath && (
            <path d={bbAreaPath} fill="rgba(0, 240, 255, 0.025)" />
          )}
          {showBB && bbUpperPath && (
            <path d={bbUpperPath} fill="none" stroke="rgba(0, 240, 255, 0.35)" strokeWidth="1.2" strokeDasharray="2,2" />
          )}
          {showBB && bbLowerPath && (
            <path d={bbLowerPath} fill="none" stroke="rgba(0, 240, 255, 0.35)" strokeWidth="1.2" strokeDasharray="2,2" />
          )}

          {/* 2. Fibonacci Retracement Levels */}
          {(() => {
            if (!showFibo) return null;
            const yFibHigh = getCoordinates(fibData.high, 0, 35).y;
            const yFibLow = getCoordinates(fibData.low, 0, 35).y;
            const yFib236 = getCoordinates(fibData.level236, 0, 35).y;
            const yFib382 = getCoordinates(fibData.level382, 0, 35).y;
            const yFib500 = getCoordinates(fibData.level500, 0, 35).y;
            const yFib618 = getCoordinates(fibData.level618, 0, 35).y;

            return (
              <>
                <line x1={padding} y1={yFibHigh} x2={width - padding} y2={yFibHigh} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
                <text x={padding + 10} y={yFibHigh - 3} fill="var(--text-muted)" fontSize="7" opacity="0.6">Fib 100% (Max): ${fibData.high.toLocaleString()}</text>

                <line x1={padding} y1={yFib236} x2={width - padding} y2={yFib236} stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" strokeDasharray="2,2" />
                <text x={padding + 10} y={yFib236 - 3} fill="var(--text-muted)" fontSize="7" opacity="0.5">23.6%: ${fibData.level236.toLocaleString()}</text>

                <line x1={padding} y1={yFib382} x2={width - padding} y2={yFib382} stroke="rgba(0, 240, 255, 0.12)" strokeWidth="0.8" />
                <text x={padding + 10} y={yFib382 - 3} fill="var(--accent-secondary)" fontSize="7" opacity="0.6">38.2%: ${fibData.level382.toLocaleString()}</text>

                <line x1={padding} y1={yFib500} x2={width - padding} y2={yFib500} stroke="rgba(245, 158, 11, 0.12)" strokeWidth="0.8" />
                <text x={padding + 10} y={yFib500 - 3} fill="#f59e0b" fontSize="7" opacity="0.6">50.0%: ${fibData.level500.toLocaleString()}</text>

                <line x1={padding} y1={yFib618} x2={width - padding} y2={yFib618} stroke="rgba(255, 70, 104, 0.12)" strokeWidth="0.8" />
                <text x={padding + 10} y={yFib618 - 3} fill="var(--color-sell)" fontSize="7" opacity="0.6">61.8%: ${fibData.level618.toLocaleString()}</text>

                <line x1={padding} y1={yFibLow} x2={width - padding} y2={yFibLow} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
                <text x={padding + 10} y={yFibLow - 3} fill="var(--text-muted)" fontSize="7" opacity="0.6">Fib 0% (Min): ${fibData.low.toLocaleString()}</text>
              </>
            );
          })()}

          {/* 3. Support & Resistance Levels */}
          {(() => {
            if (!showSR) return null;
            const yShortS = getCoordinates(srShort.support, 0, 35).y;
            const yShortR = getCoordinates(srShort.resistance, 0, 35).y;
            const yLongS = getCoordinates(srLong.support, 0, 35).y;
            const yLongR = getCoordinates(srLong.resistance, 0, 35).y;

            return (
              <>
                {/* Short Term */}
                <line x1={padding} y1={yShortS} x2={width - padding} y2={yShortS} stroke="rgba(0, 255, 170, 0.25)" strokeWidth="1.2" strokeDasharray="3,3" />
                <text x={width - padding - 85} y={yShortS - 4} fill="var(--color-buy)" fontSize="7" opacity="0.8">Sop C.P: ${srShort.support.toLocaleString()}</text>

                <line x1={padding} y1={yShortR} x2={width - padding} y2={yShortR} stroke="rgba(255, 70, 104, 0.25)" strokeWidth="1.2" strokeDasharray="3,3" />
                <text x={width - padding - 85} y={yShortR - 4} fill="var(--color-sell)" fontSize="7" opacity="0.8">Res C.P: ${srShort.resistance.toLocaleString()}</text>

                {/* Long Term */}
                <line x1={padding} y1={yLongS} x2={width - padding} y2={yLongS} stroke="rgba(0, 255, 170, 0.15)" strokeWidth="1" />
                <text x={padding + 5} y={yLongS - 4} fill="var(--color-buy)" fontSize="7" opacity="0.6">Sop L.P: ${srLong.support.toLocaleString()}</text>

                <line x1={padding} y1={yLongR} x2={width - padding} y2={yLongR} stroke="rgba(255, 70, 104, 0.15)" strokeWidth="1" />
                <text x={padding + 5} y={yLongR - 4} fill="var(--color-sell)" fontSize="7" opacity="0.6">Res L.P: ${srLong.resistance.toLocaleString()}</text>
              </>
            );
          })()}

          {/* 4. Technical Indicators: SMA 10 and 30 */}
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

          {/* 5. Area & Price Line (drawn on top) */}
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
              const sma20 = asset ? resolveSMA(asset, 20) : calculateSMA(prices, 20);
              const sma80 = asset ? resolveSMA(asset, Math.min(80, prices.length)) : calculateSMA(prices, Math.min(80, prices.length));
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

      {/* Advanced Quantitative Levels (S/R, Bollinger, Fibonacci) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '12px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '12px',
        padding: '16px',
        border: '1px solid rgba(255,255,255,0.03)'
      }}>
        {/* S/R Corto Plazo */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>S/R Corto Plazo (20p)</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--color-buy)' }}>Sop: ${srShort.support.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--color-sell)' }}>Res: ${srShort.resistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* S/R Largo Plazo */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>S/R Largo Plazo (80p)</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--color-buy)' }}>Sop: ${srLong.support.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--color-sell)' }}>Res: ${srLong.resistance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Bandas Bollinger (20, 2)</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--accent-secondary)' }}>Sup: ${bbData.upper.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--text-muted)' }}>Med: ${bbData.middle.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ color: 'var(--accent-primary)' }}>Inf: ${bbData.lower.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Fibonacci Retracements */}
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fibonacci (50p)</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px' }}>
            <span style={{ color: 'var(--color-buy)' }}>38.2%: <span style={{ color: 'var(--text-main)' }}>${fibData.level382.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
            <span style={{ color: 'var(--color-warning)' }}>50.0%: <span style={{ color: 'var(--text-main)' }}>${fibData.level500.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
            <span style={{ color: 'var(--color-sell)' }}>61.8%: <span style={{ color: 'var(--text-main)' }}>${fibData.level618.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
            <span style={{ color: 'var(--text-muted)' }}>23.6%: <span style={{ color: 'var(--text-main)' }}>${fibData.level236.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
          </div>
        </div>
      </div>

    </div>
  );
};
