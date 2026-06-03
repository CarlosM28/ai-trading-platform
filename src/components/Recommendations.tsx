import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { calculateRSI, calculateMACD, calculateSMA, calculateSupportResistance } from '../utils/indicators';
import { 
  Award,
  CheckCircle2,
  DollarSign,
  Compass,
  Cpu,
  Zap,
  Gamepad2,
  Coins
} from 'lucide-react';
import { externalAssetsPool } from '../utils/externalAssets';

interface ExtAssetRec {
  id: string;
  name: string;
  symbol: string;
  price: number;
  type: 'stock' | 'crypto';
  category: 'ia' | 'energy' | 'gaming' | 'crypto' | 'autonomy';
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  maTrend: 'bullish' | 'bearish';
  maTrendLong: 'bullish' | 'bearish';
  sentimentScore: number;
  peRatio?: number;
  socialVolume?: number;
  verdict: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  ratingColor: string;
  ratingBg: string;
  explanation: string;
  support?: number;
  resistance?: number;
}

const getAssetCategory = (symbol: string): 'ia' | 'energy' | 'gaming' | 'crypto' | 'autonomy' => {
  const s = symbol.toUpperCase();
  if (['BTC', 'ETH', 'SOL', 'XRP', 'XLM', 'HBAR'].includes(s)) return 'crypto';
  if (['AAPL', 'NVDA'].includes(s)) return 'ia';
  if (['TSLA'].includes(s)) return 'autonomy';
  if (['TTWO'].includes(s)) return 'gaming';
  if (['ENR1'].includes(s)) return 'energy';
  
  // Buscar en pool de activos externos
  const ext = externalAssetsPool.find(a => a.symbol.toUpperCase() === s);
  if (ext) return ext.category;
  
  return 'ia';
};

const externalAssetsRecs: ExtAssetRec[] = [
  {
    id: 'ext_amd',
    name: 'Advanced Micro Devices, Inc.',
    symbol: 'AMD',
    price: 165.42,
    type: 'stock',
    category: 'ia',
    rsi: 58.4,
    macd: { macd: 2.15, signal: 1.80, histogram: 0.35 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.28,
    peRatio: 45.2,
    verdict: 'BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.04)',
    explanation: 'AMD muestra una tendencia alcista saludable impulsada por la tracción de su chip acelerador de IA MI300X. El cruce de medias a medio/largo plazo es alcista y el RSI de 58 indica que tiene margen antes de sobrecompra. Su ratio P/E de 45.2 refleja las fuertes expectativas del sector.'
  },
  {
    id: 'ext_ceg',
    name: 'Constellation Energy Corp.',
    symbol: 'CEG',
    price: 215.18,
    type: 'stock',
    category: 'energy',
    rsi: 72.5,
    macd: { macd: 5.60, signal: 4.20, histogram: 1.40 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.45,
    peRatio: 31.8,
    verdict: 'STRONG BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.08)',
    explanation: 'Excelente momentum para Constellation debido a la firma de contratos de provisión de energía limpia 24/7 con centros de datos. El RSI en 72.5 advierte de sobrecompra a corto plazo, pero el cruce macro y el MACD alcista validan una fuerte compra de acumulación.'
  },
  {
    id: 'ext_asml',
    name: 'ASML Holding N.V.',
    symbol: 'ASML',
    price: 885.30,
    type: 'stock',
    category: 'ia',
    rsi: 48.2,
    macd: { macd: -3.40, signal: -2.10, histogram: -1.30 },
    maTrend: 'bearish',
    maTrendLong: 'bullish',
    sentimentScore: 0.12,
    peRatio: 38.5,
    verdict: 'NEUTRAL',
    ratingColor: 'var(--text-muted)',
    ratingBg: 'rgba(148, 163, 184, 0.08)',
    explanation: 'ASML consolida lateralmente tras su última corrección de inventario de equipos EUV. Técnicamente la MA corta es bajista pero la MA larga (20/80) se sostiene. Con un RSI neutro de 48, es prudente mantener posiciones y acumular progresivamente.'
  },
  {
    id: 'ext_smci',
    name: 'Super Micro Computer, Inc.',
    symbol: 'SMCI',
    price: 420.90,
    type: 'stock',
    category: 'ia',
    rsi: 28.5,
    macd: { macd: -12.40, signal: -9.80, histogram: -2.60 },
    maTrend: 'bearish',
    maTrendLong: 'bearish',
    sentimentScore: -0.22,
    peRatio: 18.4,
    verdict: 'STRONG SELL',
    ratingColor: 'var(--color-sell)',
    ratingBg: 'rgba(255, 70, 104, 0.08)',
    explanation: 'SMCI sufre severa presión bajista de ventas debido a retrasos en sus informes financieros y auditorías. El RSI en 28.5 está en sobreventa extrema, pero con cruces de medias bajistas y MACD deteriorado, se aconseja fuerte prudencia.'
  },
  {
    id: 'ext_vrt',
    name: 'Vertiv Holdings Co.',
    symbol: 'VRT',
    price: 94.65,
    type: 'stock',
    category: 'energy',
    rsi: 61.2,
    macd: { macd: 1.80, signal: 1.45, histogram: 0.35 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.32,
    peRatio: 48.1,
    verdict: 'BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.04)',
    explanation: 'Vertiv se beneficia de la demanda exponencial de sistemas de refrigeración líquida para la arquitectura Blackwell de NVIDIA. Con indicadores técnicos alcistas sólidos en corto y largo plazo, se sitúa como una opción de compra continuada.'
  },
  {
    id: 'ext_rndr',
    name: 'Render Network (RENDER)',
    symbol: 'RENDER',
    price: 7.82,
    type: 'crypto',
    category: 'crypto',
    rsi: 64.8,
    macd: { macd: 0.28, signal: 0.22, histogram: 0.06 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.39,
    socialVolume: 6420,
    verdict: 'BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.04)',
    explanation: 'RENDER lidera el sector de cómputo GPU Web3. La acumulación institucional y el volumen social en redes sociales están aumentando. Técnicamente muestra momentum alcista, con un RSI de 64.8 apuntando al alza.'
  },
  {
    id: 'ext_tao',
    name: 'Bittensor (TAO)',
    symbol: 'TAO',
    price: 385.60,
    type: 'crypto',
    category: 'crypto',
    rsi: 31.2,
    macd: { macd: -8.50, signal: -6.90, histogram: -1.60 },
    maTrend: 'bearish',
    maTrendLong: 'bearish',
    sentimentScore: 0.15,
    socialVolume: 4850,
    verdict: 'SELL',
    ratingColor: 'var(--color-sell)',
    ratingBg: 'rgba(255, 70, 104, 0.04)',
    explanation: 'TAO cotiza en un canal descendente de corto plazo. A pesar del interés a largo plazo en su red descentralizada de machine learning, el cruce de medias es bajista y las ballenas distribuyen posiciones. Nivel de soporte crítico en los $350.'
  },
  {
    id: 'ext_link',
    name: 'Chainlink (LINK)',
    symbol: 'LINK',
    price: 15.45,
    type: 'crypto',
    category: 'crypto',
    rsi: 52.8,
    macd: { macd: 0.05, signal: 0.04, histogram: 0.01 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.25,
    socialVolume: 3950,
    verdict: 'BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.04)',
    explanation: 'Chainlink consolida su base tras la exitosa integración del protocolo CCIP con entidades bancarias tradicionales para la tokenización de activos reales (RWA). Técnicamente el cruce macro da señal alcista firme.'
  },
  {
    id: 'ext_near',
    name: 'Near Protocol (NEAR)',
    symbol: 'NEAR',
    price: 5.92,
    type: 'crypto',
    category: 'crypto',
    rsi: 49.5,
    macd: { macd: -0.02, signal: -0.01, histogram: -0.01 },
    maTrend: 'bearish',
    maTrendLong: 'bullish',
    sentimentScore: 0.21,
    socialVolume: 2980,
    verdict: 'NEUTRAL',
    ratingColor: 'var(--text-muted)',
    ratingBg: 'rgba(148, 163, 184, 0.08)',
    explanation: 'NEAR experimenta una oscilación lateral tras recuperarse de su soporte macro. La media corta (10/30) es bajista, pero la MA de largo plazo está en fase de soporte estable. Recomendamos neutralidad a la espera de volumen.'
  },
  {
    id: 'ext_fet',
    name: 'Fetch.ai / Alliance (FET)',
    symbol: 'FET',
    price: 2.14,
    type: 'crypto',
    category: 'crypto',
    rsi: 57.2,
    macd: { macd: 0.08, signal: 0.06, histogram: 0.02 },
    maTrend: 'bullish',
    maTrendLong: 'bullish',
    sentimentScore: 0.35,
    socialVolume: 5120,
    verdict: 'BUY',
    ratingColor: 'var(--color-buy)',
    ratingBg: 'rgba(0, 255, 170, 0.04)',
    explanation: 'FET muestra indicios de acumulación debido a la fusión de protocolos de la alianza de superinteligencia artificial. Técnicamente, las medias móviles y el histograma MACD apoyan un veredicto de compra moderada.'
  }
];

export const Recommendations: React.FC = () => {
  const { assets, timeframe, changeTimeframe } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calcular las recomendaciones cuantitativas para todos los activos
  const recommendationsData = useMemo(() => {
    return assets.map(asset => {
      const prices = asset.priceHistory;
      
      // 1. Calcular indicadores
      const rsi = calculateRSI(prices, 14);
      const macd = calculateMACD(prices);
      
      const fastSma = calculateSMA(prices, 10);
      const slowSma = calculateSMA(prices, 30);
      const maTrend = fastSma > slowSma ? 'bullish' : 'bearish';

      const sma20 = calculateSMA(prices, 20);
      const sma80 = calculateSMA(prices, Math.min(80, prices.length));
      const maTrendLong = sma20 > sma80 ? 'bullish' : 'bearish';

      const { support, resistance } = calculateSupportResistance(prices, 20);
      const isNearSupport = asset.price <= support * 1.02;
      const isNearResistance = asset.price >= resistance * 0.98;

      // 2. Sistema de puntuación cuantitativo
      // Rango de -5 (Extremadamente Bajista/Venta Fuerte) a +5 (Extremadamente Alcista/Compra Fuerte)
      let score = 0;

      // Técnica 1: RSI
      if (rsi < 32) score += 2;
      else if (rsi < 40) score += 1;
      else if (rsi > 68) score -= 2;
      else if (rsi > 60) score -= 1;

      // Técnica 2: MACD
      if (macd.histogram > 0.5) score += 1.5;
      else if (macd.histogram < -0.5) score -= 1.5;

      // Técnica 3: Media Móvil Corto Plazo (Scalp 10/30)
      if (maTrend === 'bullish') score += 0.5;
      else score -= 0.5;

      // Técnica 4: Media Móvil Medio/Largo Plazo (Macro 20/80)
      if (maTrendLong === 'bullish') score += 1.0;
      else score -= 1.0;

      // Técnica 5: Soporte / Resistencia
      if (isNearSupport) score += 1.0;
      if (isNearResistance) score -= 1.0;

      // Fundamental 1: Sentimiento de noticias
      if (asset.sentimentScore > 0.3) score += 1.5;
      else if (asset.sentimentScore > 0.1) score += 0.5;
      else if (asset.sentimentScore < -0.3) score -= 1.5;
      else if (asset.sentimentScore < -0.1) score -= 0.5;

      // Fundamental 2: Ratios
      if (asset.type === 'stock') {
        const pe = asset.peRatio || 50;
        if (pe < 30) score += 0.5; // Valuación atractiva
        if (pe > 55) score -= 0.5; // Valuación inflada
      } else {
        const social = asset.socialVolume || 0;
        const whale = asset.whaleBalanceChange || 0;
        if (social > 5000 && whale > 0.5) score += 0.5; // Fuerte acumulación crypto
      }

      // 3. Determinar el veredicto y estilo visual
      let verdict: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL' = 'NEUTRAL';
      let ratingClass = 'badge-neutral';
      let ratingColor = 'var(--text-muted)';
      let ratingBg = 'rgba(148, 163, 184, 0.08)';

      if (score >= 3.0) {
        verdict = 'STRONG BUY';
        ratingClass = 'badge-buy';
        ratingColor = 'var(--color-buy)';
        ratingBg = 'rgba(0, 255, 170, 0.08)';
      } else if (score >= 1.0) {
        verdict = 'BUY';
        ratingClass = 'badge-buy';
        ratingColor = 'var(--color-buy)';
        ratingBg = 'rgba(0, 255, 170, 0.04)';
      } else if (score <= -3.0) {
        verdict = 'STRONG SELL';
        ratingClass = 'badge-sell';
        ratingColor = 'var(--color-sell)';
        ratingBg = 'rgba(255, 70, 104, 0.08)';
      } else if (score <= -1.0) {
        verdict = 'SELL';
        ratingClass = 'badge-sell';
        ratingColor = 'var(--color-sell)';
        ratingBg = 'rgba(255, 70, 104, 0.04)';
      }

      // 4. Generar explicación técnica/fundamental adaptada en tiempo real
      let explanation = '';
      if (asset.type === 'stock') {
        if (verdict.includes('BUY')) {
          explanation = `${asset.name} muestra fortaleza técnica. El cruce de medias móviles es alcista y el RSI de ${rsi.toFixed(0)} señala margen de crecimiento. Además, el ratio P/E de ${asset.peRatio} está sustentado por un fuerte sentimiento del mercado (${(asset.sentimentScore * 100).toFixed(0)}% positivo) y sólidas noticias sectoriales.`;
        } else if (verdict.includes('SELL')) {
          explanation = `Vigilancia en ${asset.name}. El sentimiento de los medios ha caído a ${(asset.sentimentScore * 100).toFixed(0)}% debido a eventos macroeconómicos adversos. El MACD muestra agotamiento bajista y el RSI sobrecomprado desaconseja abrir posiciones largas aquí.`;
        } else {
          explanation = `${asset.name} consolida en un rango lateral. Con un RSI neutro de ${rsi.toFixed(0)} y bajo impulso de volumen, sugerimos mantener posiciones sin realizar nuevas compras hasta que ocurra un catalizador fundamental.`;
        }
      } else {
        // Crypto
        if (verdict.includes('BUY')) {
          explanation = `Crypto Rating ALTA: ${asset.symbol} está bajo acumulación institucional activa. El flujo neto de ballenas (+${asset.whaleBalanceChange}%) es muy favorable. Con el RSI en ${rsi.toFixed(0)} y volumen social en aumento (${asset.socialVolume} menciones/h), se perfila una ruptura alcista inminente.`;
        } else if (verdict.includes('SELL')) {
          explanation = `Crypto Riesgo: Presión de distribución detectada. Las ballenas han reducido su balance y el volumen en redes se ha enfriado sensiblemente. Técnicamente el histograma MACD es bajista y las medias apuntan a corrección de soporte.`;
        } else {
          explanation = `${asset.symbol} oscila sin una dirección clara en cadena. El RSI está estabilizado en ${rsi.toFixed(0)} y las ballenas mantienen un balance neutro. Recomendamos esperar noticias determinantes o reaccionar a niveles de soporte clave.`;
        }
      }

      const srContext = isNearSupport 
        ? ` El precio actual ($${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}) está testeando el soporte clave en $${support.toLocaleString(undefined, { minimumFractionDigits: 2 })}, zona ideal de acumulación.` 
        : isNearResistance 
          ? ` Se encuentra en zona de resistencia técnica en $${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })}, por lo que existe riesgo de rechazo a corto plazo.` 
          : ` Cotiza de forma estable en un rango intermedio entre el soporte en $${support.toLocaleString(undefined, { minimumFractionDigits: 2 })} y la resistencia en $${resistance.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`;
      explanation += srContext;

      return {
        ...asset,
        rsi,
        macd,
        maTrend,
        maTrendLong,
        support,
        resistance,
        score,
        verdict,
        ratingClass,
        ratingColor,
        ratingBg,
        explanation
      };
    });
  }, [assets]);

  // 1. Filtrar activos en cartera
  const filteredPortfolioData = useMemo(() => {
    const mapped = recommendationsData.map(asset => ({
      ...asset,
      category: getAssetCategory(asset.symbol)
    }));
    if (selectedCategory === 'all') return mapped;
    return mapped.filter(item => item.category === selectedCategory);
  }, [recommendationsData, selectedCategory]);

  // 2. Filtrar activos de descubrimiento (externos)
  const filteredExternalData = useMemo(() => {
    const timeSec = Math.floor(Date.now() / 3000);
    // Excluir los que ya han sido añadidos a assets
    const activeSymbols = assets.map(a => a.symbol.toUpperCase());
    const filteredPool = externalAssetsRecs.filter(a => !activeSymbols.includes(a.symbol.toUpperCase()));

    const mapped = filteredPool.map(asset => {
      const hash = asset.symbol.charCodeAt(0) + (asset.symbol.charCodeAt(1) || 0);
      const priceOffset = Math.sin(timeSec + hash) * 0.002;
      const rsiOffset = Math.sin(timeSec + hash + 1) * 0.8;
      const macdOffset = Math.sin(timeSec + hash + 2) * 0.05;
      
      const price = Number((asset.price * (1 + priceOffset)).toFixed(2));
      const rsi = Math.max(10, Math.min(90, asset.rsi + rsiOffset));
      const histogram = asset.macd.histogram + macdOffset;
      
      const support = Number((price * 0.96).toFixed(2));
      const resistance = Number((price * 1.04).toFixed(2));
      
      const isNearSupport = price <= support * 1.02;
      const isNearResistance = price >= resistance * 0.98;
      
      let explanation = asset.explanation;
      const srContext = isNearSupport 
        ? ` Cotiza en zona de soporte estimado ($${support.toLocaleString()}).` 
        : isNearResistance 
          ? ` En zona de resistencia estimada ($${resistance.toLocaleString()}).` 
          : ` Niveles clave: soporte est. en $${support.toLocaleString()} y resistencia est. en $${resistance.toLocaleString()}.`;
      explanation += srContext;

      return {
        ...asset,
        price,
        rsi,
        macd: {
          ...asset.macd,
          histogram
        },
        support,
        resistance,
        explanation
      };
    });
    
    if (selectedCategory === 'all') return mapped;
    return mapped.filter(item => item.category === selectedCategory);
  }, [selectedCategory, assets]);

  // Categorías de Filtro por Sector
  const categories = [
    { id: 'all', label: 'Todos los Sectores', icon: Compass },
    { id: 'ia', label: 'IA y Hardware', icon: Cpu },
    { id: 'energy', label: 'Energía e Infraestructura', icon: Zap },
    { id: 'crypto', label: 'Web3 y Criptoactivos', icon: Coins },
    { id: 'gaming', label: 'Gaming y Blockbusters', icon: Gamepad2 },
    { id: 'autonomy', label: 'IA y Conducción Autónoma', icon: Cpu }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Alertas e <span className="text-gradient-purple">Indicaciones Quants</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Consenso consolidado de nuestros bots en base a datos técnicos en vivo y balances macro fundamentales.
          </p>
        </div>
        
        {/* Timeframe Selector Button Group */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Periodo:</span>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
            {(['1m', '1h', '4h', '1D', '5D', '1M', '6M', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => changeTimeframe(tf)}
                style={{
                  background: timeframe === tf ? 'var(--accent-primary)' : 'transparent',
                  color: timeframe === tf ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sector Filter Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.02)',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.04)',
                color: isSelected ? 'white' : 'var(--text-muted)',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <IconComponent size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Overview Metric Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0, 255, 170, 0.1)',
            display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
          }}>
            <CheckCircle2 size={20} color="var(--color-buy)" />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Seguimiento Multivariante</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cálculo continuo de RSI, MACD, Medias y Ratios.</p>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0, 240, 255, 0.1)',
            display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center'
          }}>
            <Award size={20} color="var(--accent-secondary)" />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Sentimiento Automatizado</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auditoría automatizada de portales y redes sociales.</p>
          </div>
        </div>

      </div>

      {/* Sección 1: Activos en Cartera */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--accent-primary)',
            background: 'rgba(95, 93, 236, 0.1)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Activos Principales
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            — Cotizando y operando activamente en tu cartera
          </span>
        </div>

        {filteredPortfolioData.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No hay activos principales en este sector.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {filteredPortfolioData.map((rec) => (
              <div 
                key={rec.id} 
                className="glass-card" 
                style={{ 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                
                {/* Colored Indicator Backdrop glow at card top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: rec.ratingColor
                }} />

                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {(() => {
                      const isExternal = !['BTC', 'ETH', 'SOL', 'AAPL', 'TSLA', 'NVDA', 'TTWO', 'ENR1', 'XRP', 'XLM', 'HBAR'].includes(rec.symbol.toUpperCase());
                      return (
                        <>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {rec.name}
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{rec.symbol}</span>
                            {isExternal && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'rgba(0, 240, 255, 0.08)',
                                color: 'var(--accent-secondary)',
                                border: '1px solid rgba(0, 240, 255, 0.15)',
                                marginLeft: '4px'
                              }}>
                                Externo
                              </span>
                            )}
                          </h3>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>Cotización: <b style={{ color: 'var(--text-main)' }}>${rec.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</b></span>
                            <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>🤖 Bots:</span>
                              <b style={{ color: rec.allowedForBots !== false ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                                {rec.allowedForBots !== false ? 'Permitidos' : 'Pausados'}
                              </b>
                            </span>
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Rating Badge */}
                  <div style={{
                    background: rec.ratingBg,
                    color: rec.ratingColor,
                    border: `1px solid ${rec.ratingColor}33`,
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    boxShadow: `0 0 12px ${rec.ratingColor}15`
                  }}>
                    {rec.verdict}
                  </div>
                </div>

                {/* Core Indicators Matrix Checklist */}
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>RSI (14):</span>
                    <b style={{ color: rec.rsi < 35 ? 'var(--color-buy)' : rec.rsi > 65 ? 'var(--color-sell)' : 'var(--text-main)' }}>
                      {rec.rsi.toFixed(1)}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hist. MACD:</span>
                    <b style={{ color: rec.macd.histogram >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.macd.histogram.toFixed(2)}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MA Corta (10/30):</span>
                    <b style={{ color: rec.maTrend === 'bullish' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.maTrend === 'bullish' ? 'Alcista' : 'Bajista'}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MA Larga (20/80):</span>
                    <b style={{ color: rec.maTrendLong === 'bullish' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.maTrendLong === 'bullish' ? 'Alcista' : 'Bajista'}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Noticias IA:</span>
                    <b style={{ color: rec.sentimentScore > 0.15 ? 'var(--color-buy)' : rec.sentimentScore < -0.15 ? 'var(--color-sell)' : 'var(--text-main)' }}>
                      {rec.sentimentScore > 0 ? '+' : ''}{(rec.sentimentScore * 100).toFixed(0)}%
                    </b>
                  </div>

                  {rec.type === 'stock' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>P/E Ratio:</span>
                      <b style={{ color: 'var(--text-main)' }}>{rec.peRatio || 'N/A'}</b>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vol. Social:</span>
                      <b style={{ color: 'var(--text-main)' }}>{rec.socialVolume || 'N/A'}/h</b>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Soporte (20):</span>
                    <b style={{ color: 'var(--color-buy)' }}>
                      ${rec.support?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Resistencia (20):</span>
                    <b style={{ color: 'var(--color-sell)' }}>
                      ${rec.resistance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </b>
                  </div>
                </div>

                {/* Analytical reasoning */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>ANÁLISIS DE CONSENSO:</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '4px' }}>
                    {rec.explanation}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección 2: Activos de Descubrimiento (Externos) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.8rem',
            color: 'var(--accent-secondary)',
            background: 'rgba(0, 240, 255, 0.1)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Oportunidades de Descubrimiento (Externos)
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            — Oportunidades alcistas fuera de tu portafolio habitual
          </span>
        </div>

        {filteredExternalData.length === 0 ? (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No hay activos de descubrimiento en este sector.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '24px'
          }}>
            {filteredExternalData.map((rec) => (
              <div 
                key={rec.id} 
                className="glass-card" 
                style={{ 
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                
                {/* Colored Indicator Backdrop glow at card top */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: rec.ratingColor
                }} />

                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {rec.name}
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>{rec.symbol}</span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        marginLeft: '4px'
                      }}>
                        Externo
                      </span>
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                      Cotización: <b style={{ color: 'var(--text-main)', marginLeft: '4px', display: 'flex', alignItems: 'center' }}><DollarSign size={12} /> {rec.price.toLocaleString()} USD</b>
                    </span>
                  </div>

                  {/* Rating Badge */}
                  <div style={{
                    background: rec.ratingBg,
                    color: rec.ratingColor,
                    border: `1px solid ${rec.ratingColor}33`,
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    boxShadow: `0 0 12px ${rec.ratingColor}15`
                  }}>
                    {rec.verdict}
                  </div>
                </div>

                {/* Core Indicators Matrix Checklist */}
                <div style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>RSI (14):</span>
                    <b style={{ color: rec.rsi < 35 ? 'var(--color-buy)' : rec.rsi > 65 ? 'var(--color-sell)' : 'var(--text-main)' }}>
                      {rec.rsi.toFixed(1)}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Hist. MACD:</span>
                    <b style={{ color: rec.macd.histogram >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.macd.histogram.toFixed(2)}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MA Corta (10/30):</span>
                    <b style={{ color: rec.maTrend === 'bullish' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.maTrend === 'bullish' ? 'Alcista' : 'Bajista'}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>MA Larga (20/80):</span>
                    <b style={{ color: rec.maTrendLong === 'bullish' ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {rec.maTrendLong === 'bullish' ? 'Alcista' : 'Bajista'}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sentimiento IA:</span>
                    <b style={{ color: rec.sentimentScore > 0.15 ? 'var(--color-buy)' : rec.sentimentScore < -0.15 ? 'var(--color-sell)' : 'var(--text-main)' }}>
                      {rec.sentimentScore > 0 ? '+' : ''}{(rec.sentimentScore * 100).toFixed(0)}%
                    </b>
                  </div>

                  {rec.type === 'stock' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>P/E Ratio:</span>
                      <b style={{ color: 'var(--text-main)' }}>{rec.peRatio || 'N/A'}</b>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Vol. Social:</span>
                      <b style={{ color: 'var(--text-main)' }}>{rec.socialVolume || 'N/A'}/h</b>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Soporte (Est.):</span>
                    <b style={{ color: 'var(--color-buy)' }}>
                      ${rec.support?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </b>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Resistencia (Est.):</span>
                    <b style={{ color: 'var(--color-sell)' }}>
                      ${rec.resistance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </b>
                  </div>
                </div>

                {/* Analytical reasoning */}
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>ANÁLISIS DE CONSENSO:</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '4px' }}>
                    {rec.explanation}
                  </p>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
