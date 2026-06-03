import React, { useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Clock, 
  Award,
  Newspaper,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface HistoricalEvent {
  date: string;
  priceThen: string;
  change: string;
  isPositive: boolean;
  title: string;
  description: string;
  category: 'earnings' | 'product' | 'macro' | 'regulation' | 'strategic';
}

interface AssetHistoryData {
  verdict: string;
  prediction: string;
  seasonality: string;
  events: HistoricalEvent[];
}

const HISTORICAL_DATABASE: Record<string, AssetHistoryData> = {
  NVDA: {
    verdict: "COMPRA FUERTE (Acumulación Estratégica)",
    prediction: "Se prevé que el ciclo de crecimiento continúe durante los próximos 6 a 12 meses, impulsado por el ramp-up de Blackwell y la demanda insaciable de chips de IA. Históricamente, cada lanzamiento importante de arquitectura de GPU (Ampere en 2020, Hopper en 2023 y Blackwell en 2026) inicia un ciclo alcista de 18 meses de expansión de múltiplos. Los soportes clave de soporte a largo plazo se sitúan firmemente en $180 y $200.",
    seasonality: "Estacionalidad muy sólida en el Q2 (Mayo/Junio por la Computex) y Q4 (Noviembre por balances fiscales de otoño).",
    events: [
      {
        date: "14-May-2026",
        priceThen: "$211.14",
        change: "+9.5%",
        isPositive: true,
        title: "Lanzamiento Masivo de la Arquitectura Blackwell",
        description: "El inicio de las entregas a gran escala de los superchips Blackwell dispara la capitalización de la empresa por encima de los 3.2 billones de dólares.",
        category: "product"
      },
      {
        date: "22-Feb-2024",
        priceThen: "$78.50",
        change: "+16.4%",
        isPositive: true,
        title: "Resultados Trimestrales Récord de IA",
        description: "NVIDIA supera las estimaciones de Wall Street de forma masiva y suma $277B de valor de mercado en un solo día, marcando el mayor avance diario de la historia financiera.",
        category: "earnings"
      },
      {
        date: "24-May-2023",
        priceThen: "$38.00",
        change: "+24.4%",
        isPositive: true,
        title: "El 'Momento iPhone' de la Inteligencia Artificial",
        description: "La directiva eleva las previsiones de ingresos un 50% por encima de lo estimado, iniciando formalmente el rally de IA global en las bolsas.",
        category: "earnings"
      },
      {
        date: "12-Apr-2021",
        priceThen: "$15.20",
        change: "+5.6%",
        isPositive: true,
        title: "Presentación de Grace (Primera CPU de NVIDIA)",
        description: "NVIDIA anuncia su entrada en el mercado de microprocesadores para centros de datos basados en ARM, compitiendo directamente con Intel.",
        category: "product"
      },
      {
        date: "13-Sep-2020",
        priceThen: "$12.40",
        change: "+5.8%",
        isPositive: true,
        title: "Acuerdo de Adquisición de ARM",
        description: "Anuncio de compra de ARM a SoftBank por $40B, impulsando fuertemente el optimismo (aunque luego sería vetado por reguladores en 2022).",
        category: "strategic"
      },
      {
        date: "26-Dic-2018",
        priceThen: "$3.20",
        change: "-18.5%",
        isPositive: false,
        title: "Criptoresaca de las GPUs de Minería",
        description: "La caída de los precios de las criptomonedas inunda el mercado secundario de GPUs usadas, forzando a NVIDIA a recortar estimaciones de inventario.",
        category: "macro"
      }
    ]
  },
  TSLA: {
    verdict: "MANTENER (Neutral / Alta Volatilidad)",
    prediction: "Tesla cotiza con una prima de valoración basada en la conducción autónoma completa (FSD) y robotaxis. El análisis histórico sugiere que el precio reacciona violentamente a los hitos de entrega trimestrales (semana 1 de Enero, Abril, Julio y Octubre). A corto plazo, el rango $380-$450 actuará como resistencia clave mientras se estabilizan los márgenes automotrices.",
    seasonality: "Meses fuertes históricamente en Enero y Agosto (anuncios de 'Stock Split' e informes anuales).",
    events: [
      {
        date: "24-Oct-2024",
        priceThen: "$260.48",
        change: "+21.9%",
        isPositive: true,
        title: "Margen de Beneficio Sorpresa en Q3",
        description: "Tesla reporta una fuerte recuperación de sus márgenes gracias al abaratamiento del coste de fabricación de celdas de batería.",
        category: "earnings"
      },
      {
        date: "03-Jan-2022",
        priceThen: "$399.93",
        change: "+13.5%",
        isPositive: true,
        title: "Récord Absoluto de Entregas Anuales",
        description: "Tesla reporta entregas de más de 308,000 vehículos en el Q4 de 2021, superando ampliamente las expectativas más optimistas de los analistas.",
        category: "earnings"
      },
      {
        date: "25-Oct-2021",
        priceThen: "$341.61",
        change: "+12.7%",
        isPositive: true,
        title: "Pedido Histórico de Hertz y Club del Billón",
        description: "Hertz anuncia una orden de compra de 100,000 Teslas para su flota. La cotización explota y el valor de mercado supera el billón de dólares.",
        category: "strategic"
      },
      {
        date: "21-Dec-2020",
        priceThen: "$216.50",
        change: "+6.5%",
        isPositive: true,
        title: "Inclusión en el Índice S&P 500",
        description: "TSLA entra oficialmente al S&P 500, obligando a fondos indexados a comprar millones de acciones en una sesión de volumen histórico.",
        category: "macro"
      },
      {
        date: "31-Aug-2020",
        priceThen: "$149.00",
        change: "+12.6%",
        isPositive: true,
        title: "Ejecución del Primer Stock Split de 5-por-1",
        description: "La división de acciones democratiza el acceso a inversores minoristas e impulsa una ola masiva de compras de retail.",
        category: "strategic"
      },
      {
        date: "04-Feb-2020",
        priceThen: "$59.00",
        change: "+13.7%",
        isPositive: true,
        title: "Optimismo por Entregas del Model Y",
        description: "El inicio temprano de entregas del Model Y en EE.UU. desata un estrangulamiento de cortos ('short squeeze') histórico.",
        category: "product"
      }
    ]
  },
  AAPL: {
    verdict: "ACUMULACIÓN (Alcista Moderado)",
    prediction: "Apple continúa demostrando ser un refugio macroeconómico de primera clase. Los ciclos de predicción indican una rentabilidad sostenida gracias a la suscripción de servicios y al despliegue progresivo de 'Apple Intelligence' en el ecosistema móvil. Históricamente, las conferencias de desarrolladores de Junio (WWDC) proveen el combustible para la segunda mitad del año.",
    seasonality: "Fuerte estacionalidad alcista en Julio/Agosto previa al lanzamiento del iPhone de Septiembre.",
    events: [
      {
        date: "11-Jun-2024",
        priceThen: "$207.15",
        change: "+7.3%",
        isPositive: true,
        title: "Presentación de Apple Intelligence en WWDC 2024",
        description: "Apple revela su estrategia de IA integrada en el sistema operativo, desatando una oleada de optimismo sobre el próximo ciclo de renovación.",
        category: "product"
      },
      {
        date: "03-Jan-2022",
        priceThen: "$182.01",
        change: "+2.5%",
        isPositive: true,
        title: "Hito Histórico: Capitalización de $3 Billones",
        description: "Apple se convierte temporalmente en la primera corporación del planeta en alcanzar una valoración de 3 billones de dólares.",
        category: "macro"
      },
      {
        date: "31-Aug-2020",
        priceThen: "$129.04",
        change: "+3.4%",
        isPositive: true,
        title: "Stock Split de 4-por-1",
        description: "La compañía divide sus acciones para abaratar el precio unitario en bolsa, coincidiendo con un rally general de tecnología en pandemia.",
        category: "strategic"
      },
      {
        date: "01-May-2019",
        priceThen: "$52.63",
        change: "+4.9%",
        isPositive: true,
        title: "Crecimiento Récord del Sector de Servicios",
        description: "La transición estratégica a servicios (Apple Music, iCloud, Apple TV) amortigua el estancamiento de ventas físicas de hardware.",
        category: "strategic"
      },
      {
        date: "02-Aug-2018",
        priceThen: "$51.85",
        change: "+2.9%",
        isPositive: true,
        title: "Primera Empresa de $1 Billón en EE.UU.",
        description: "Apple cruza la barrera del billón de dólares impulsada por la fortaleza de precios sostenida del iPhone X.",
        category: "macro"
      }
    ]
  },
  TTWO: {
    verdict: "COMPRA FUERTE (Ruptura Alcista Pre-Lanzamiento)",
    prediction: "Take-Two Interactive se encuentra en la antesala de su evento más rentable en una década: el lanzamiento de GTA VI. Históricamente, las acciones experimentan una volatilidad masiva tras los trailers oficiales o anuncios de retrasos. El modelo predictivo sugiere que los ingresos se multiplicarán por 3 en el año fiscal posterior al lanzamiento, justificando la acumulación agresiva previa al estreno.",
    seasonality: "Alta volatilidad y volumen de compra en Octubre/Noviembre (temporada de lanzamientos y reportes trimestrales de otoño).",
    events: [
      {
        date: "05-Dec-2023",
        priceThen: "$157.50",
        change: "-2.0%",
        isPositive: false,
        title: "Estreno del Tráiler Oficial de GTA VI",
        description: "Tras filtraciones involuntarias, Rockstar adelanta el tráiler oficial. El precio se consolida ligeramente en lo que los analistas denominaron 'comprar el rumor, vender el hecho'.",
        category: "product"
      },
      {
        date: "10-Jan-2022",
        priceThen: "$142.10",
        change: "-15.0%",
        isPositive: false,
        title: "Adquisición de Zynga por $12.7 Billones",
        description: "Take-Two anuncia la adquisición del gigante móvil Zynga, preocupando temporalmente al mercado por la dilución de acciones antes de consolidar el negocio.",
        category: "strategic"
      },
      {
        date: "06-Feb-2020",
        priceThen: "$110.20",
        change: "-15.6%",
        isPositive: false,
        title: "Salida de Dan Houser (Cofundador de Rockstar)",
        description: "La partida del cerebro creativo y guionista principal de las sagas de GTA y RDR siembra dudas temporales sobre el futuro creativo a largo plazo.",
        category: "strategic"
      },
      {
        date: "26-Oct-2018",
        priceThen: "$126.80",
        change: "+5.2%",
        isPositive: true,
        title: "Lanzamiento Histórico de Red Dead Redemption 2",
        description: "El aclamado videojuego recauda más de 725 millones de dólares en su primer fin de semana, rompiendo récords históricos del entretenimiento.",
        category: "product"
      }
    ]
  },
  ENR1: {
    verdict: "ACUMULACIÓN DE VALOR (Recuperación y Saneamiento)",
    prediction: "Siemens Energy muestra signos sólidos de recuperación tras los graves problemas de calidad en Siemens Gamesa. La inyección de contratos de redes y el respaldo del gobierno alemán despejan el riesgo de insolvencia a medio plazo. Históricamente, las zonas de soporte en $14-$15 han actuado como suelo definitivo.",
    seasonality: "Estabilidad general, con repuntes marcados de volumen tras la presentación de balances anuales en Noviembre.",
    events: [
      {
        date: "15-Nov-2023",
        priceThen: "$11.20",
        change: "+9.8%",
        isPositive: true,
        title: "Garantía Estatal de 15.000 Millones de Euros",
        description: "El gobierno alemán, la matriz Siemens AG y consorcios bancarios respaldan un paquete de avales comerciales históricos para asegurar los contratos en cartera.",
        category: "macro"
      },
      {
        date: "23-Jun-2023",
        priceThen: "$14.60",
        change: "-37.3%",
        isPositive: false,
        title: "Fallo de Turbinas Eólicas de Gamesa y Profit Warning",
        description: "La filial Gamesa reporta fallos en rodamientos y palas en aerogeneradores terrestres, obligando a ampliar provisiones y provocando la peor caída bursátil de su historia.",
        category: "strategic"
      },
      {
        date: "21-May-2022",
        priceThen: "$18.15",
        change: "+6.2%",
        isPositive: true,
        title: "OPA de Exclusión por Siemens Gamesa",
        description: "Lanzamiento de una oferta de adquisición por el 33% restante de la filial eólica para reestructurarla directamente sin interferencias minoritarias.",
        category: "strategic"
      },
      {
        date: "28-Sep-2020",
        priceThen: "$22.01",
        change: "+4.5%",
        isPositive: true,
        title: "Salida a Bolsa en Frankfurt tras Escisión",
        description: "Siemens Energy debuta de forma independiente en bolsa de valores tras escindirse con éxito de la matriz Siemens AG.",
        category: "strategic"
      }
    ]
  },
  BTC: {
    verdict: "COMPRA FUERTE (Fase de Acumulación Post-Halving)",
    prediction: "Bitcoin cotiza bajo la influencia del ciclo del Halving. El análisis histórico de 8 años demuestra que los 12-18 meses posteriores a cada Halving (2016, 2020, 2024) son periodos de expansión masiva. La entrada sostenida de flujos institucionales a través de los ETFs y la adopción soberana consolidan el soporte institucional en $60,000.",
    seasonality: "Fuerte tendencia alcista en Octubre ('Uptober') y Noviembre. Debilidad histórica en Septiembre ('Rektember').",
    events: [
      {
        date: "10-Jan-2024",
        priceThen: "$46,100",
        change: "+6.2%",
        isPositive: true,
        title: "Aprobación de ETFs de Bitcoin al Contado",
        description: "La SEC aprueba formalmente los primeros ETFs spot de Bitcoin de BlackRock, Fidelity y otros emisores, abriendo las puertas a billones de dólares institucionales.",
        category: "regulation"
      },
      {
        date: "10-Nov-2021",
        priceThen: "$69,000",
        change: "+4.5%",
        isPositive: true,
        title: "Máximo Histórico del Ciclo Alcista",
        description: "Bitcoin alcanza su cotización máxima histórica del ciclo inflacionario post-pandemia impulsado por la flexibilización cuantitativa global.",
        category: "macro"
      },
      {
        date: "12-Mar-2020",
        priceThen: "$3,800",
        change: "-39.2%",
        isPositive: false,
        title: "El Jueves Negro - Pánico por COVID-19",
        description: "Las liquidaciones en cascada de contratos de futuros provocan un colapso masivo en todos los activos financieros, arrastrando a Bitcoin a mínimos históricos de varios años.",
        category: "macro"
      },
      {
        date: "18-Dec-2017",
        priceThen: "$19,600",
        change: "-12.5%",
        isPositive: false,
        title: "Cúspide de la Burbuja del ICO y Futuros de CME",
        description: "El lanzamiento de los contratos de futuros del CME marca el máximo del ciclo del 2017 e inicia un mercado bajista severo de 12 meses.",
        category: "strategic"
      }
    ]
  },
  ETH: {
    verdict: "COMPRA (Fuerza Relativa en Recuperación)",
    prediction: "Ethereum mantiene su hegemonía en finanzas descentralizadas (DeFi) y Web3. Los patrones históricos revelan que las actualizaciones estructurales de la red (tales como el Merge o las reducciones de comisiones) actúan como catalizadores de revalorización masiva en un horizonte de 6 meses. La barrera psicológica de $3,000 sirve como soporte clave.",
    seasonality: "Estacionalidad favorable en el Q1 (Enero/Febrero) previo al ciclo de tarifas de gas de primavera.",
    events: [
      {
        date: "15-Sep-2022",
        priceThen: "$1,470",
        change: "-6.1%",
        isPositive: false,
        title: "Ejecución Exitosa del 'Merge' (La Fusión)",
        description: "Ethereum migra de Proof of Work a Proof of Stake de forma impecable, reduciendo su consumo energético en un 99.9%. Se produce venta por noticias a corto plazo.",
        category: "product"
      },
      {
        date: "10-Nov-2021",
        priceThen: "$4,850",
        change: "+5.1%",
        isPositive: true,
        title: "Máximo Histórico de Ethereum",
        description: "Ethereum alcanza su valoración récord en dólares impulsado por la adopción masiva de NFTs y finanzas descentralizadas en la red principal.",
        category: "macro"
      },
      {
        date: "12-Mar-2020",
        priceThen: "$90",
        change: "-44.5%",
        isPositive: false,
        title: "Colapso del Gas y Liquidación de DeFi",
        description: "El pánico del COVID-19 congela los mercados. La red Ethereum se colapsa por tarifas récord de gas mientras los inversores liquidan sus carteras en MakerDAO y Uniswap.",
        category: "macro"
      }
    ]
  }
};

export const HistoryAnalysis: React.FC = () => {
  const { assets, activeAssetId, setActiveAssetId, realNews, isLoadingRealNews } = useTrading();
  
  // Encontrar el activo seleccionado actual
  const activeAsset = useMemo(() => {
    return assets.find(a => a.id === activeAssetId) || assets[0];
  }, [assets, activeAssetId]);

  // Simbolo mapeado para TradingView
  const tvSymbol = useMemo(() => {
    if (!activeAsset) return '';
    if (activeAsset.symbol === 'BTC') return 'BINANCE:BTCUSDT';
    if (activeAsset.symbol === 'ETH') return 'BINANCE:ETHUSDT';
    if (activeAsset.symbol === 'SOL') return 'BINANCE:SOLUSDT';
    if (activeAsset.symbol === 'ENR1') return 'XETR:ENR';
    if (activeAsset.type === 'stock') return `NASDAQ:${activeAsset.symbol}`;
    return `BINANCE:${activeAsset.symbol}USDT`;
  }, [activeAsset]);

  // Obtener datos históricos de la base de datos o retornar fallback si no existe
  const historyData = useMemo(() => {
    if (!activeAsset) return null;
    return HISTORICAL_DATABASE[activeAsset.symbol] || {
      verdict: "NEUTRAL (Datos en Simulación)",
      prediction: `El activo ${activeAsset.name} (${activeAsset.symbol}) está operando actualmente bajo dinámicas de simulación estándar. La predicción técnica a mediano plazo sugiere una consolidación lateral a la espera de factores macroeconómicos relevantes o noticias en cadena determinantes.`,
      seasonality: "Estacionalidad mixta, dependiente de la correlación con la liquidez global de mercados de riesgo.",
      events: [
        {
          date: "Hoy",
          priceThen: `$${activeAsset.price.toLocaleString()}`,
          change: `${activeAsset.changePercent >= 0 ? '+' : ''}${activeAsset.changePercent.toFixed(2)}%`,
          isPositive: activeAsset.changePercent >= 0,
          title: "Cotización del Periodo Actual",
          description: `El precio actual se sitúa en $${activeAsset.price.toLocaleString()} USD con fluctuaciones estables en tiempo real bajo simulación activa.`,
          category: "macro" as const
        }
      ]
    };
  }, [activeAsset]);

  if (!activeAsset) {
    return (
      <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-muted)' }}>Cargando datos del análisis...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Análisis Predictivo e <span className="text-gradient-purple">Histórico (8 Años)</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Investiga los hitos de mayor impacto en los últimos 8 años para proyectar tendencias y predicciones futuras.
          </p>
        </div>

        {/* Asset Switcher Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Seleccionar Activo:</span>
          <select 
            value={activeAssetId} 
            onChange={(e) => setActiveAssetId(e.target.value)}
            style={{
              background: 'rgba(15, 22, 36, 0.85)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.9rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>{a.symbol} - {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Prediction Panels */}
      {historyData && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '24px'
        }}>
          
          {/* Left Column: TradingView Daily Chart & Predictions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* TradingView Interactive Daily Chart */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrendingUp size={18} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gráfico Diario de Análisis de Hitos</h3>
              </div>

              {tvSymbol && (
                <div style={{ width: '100%', height: '380px', position: 'relative', marginBottom: '12px' }}>
                  <iframe
                    src={`https://s.tradingview.com/widgetembed/?symbol=${tvSymbol}&interval=D&theme=dark&style=1&timezone=exchange`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: '#131722' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  El gráfico de TradingView se muestra en temporalidad **Diaria (D)** para que puedas retroceder en el tiempo e identificar el comportamiento de precios en las fechas clave descritas a la derecha.
                </span>
              </div>
            </div>

            {/* Forecast Panel */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={20} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Proyección Algorítmica y Pronóstico</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>VEREDICTO ANALÍTICO:</span>
                  <div style={{ 
                    fontSize: '1.15rem', 
                    fontWeight: 800, 
                    color: historyData.verdict.includes('COMPRA') ? 'var(--color-buy)' : historyData.verdict.includes('VENTA') ? 'var(--color-sell)' : 'var(--color-warning)',
                    marginTop: '4px'
                  }}>
                    {historyData.verdict}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PREDICCIÓN FUTURA (6-12 MESES):</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5', marginTop: '6px' }}>
                    {historyData.prediction}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ESTACIONALIDAD HISTÓRICA:</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '6px' }}>
                    {historyData.seasonality}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(95, 93, 236, 0.05) 0%, rgba(0, 0, 0, 0) 100%)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(95, 93, 236, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Award size={20} color="var(--accent-primary)" />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Patrones Cíclicos de Mercado</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Los algoritmos predictivos analizan las correlaciones entre el RSI a largo plazo y las fechas de lanzamiento histórico para anticipar rallys.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Live News Feed + 8-Year Historical Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Live News Panel in History tab */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Newspaper size={18} color="var(--accent-secondary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Noticias en Vivo ({activeAsset.symbol})</h3>
                </div>
                {isLoadingRealNews && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="live-dot" style={{ background: 'var(--accent-secondary)' }} /> Cargando...
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                {isLoadingRealNews && realNews.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Buscando noticias reales recientes...
                  </div>
                ) : realNews.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No se encontraron noticias reales recientes.
                  </div>
                ) : (
                  realNews.map((item) => {
                    const isTwitter = item.source === 'twitter';
                    return (
                      <div 
                        key={item.id} 
                        onClick={() => item.link && window.open(item.link, '_blank')}
                        style={{
                          background: isTwitter ? 'rgba(29, 161, 242, 0.02)' : 'rgba(255,255,255,0.01)',
                          border: isTwitter ? '1px solid rgba(29, 161, 242, 0.12)' : '1px solid rgba(255,255,255,0.03)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          cursor: item.link ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (item.link) {
                            e.currentTarget.style.background = isTwitter ? 'rgba(29, 161, 242, 0.08)' : 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = isTwitter ? '#1DA1F2' : 'var(--accent-primary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (item.link) {
                            e.currentTarget.style.background = isTwitter ? 'rgba(29, 161, 242, 0.02)' : 'rgba(255,255,255,0.01)';
                            e.currentTarget.style.borderColor = isTwitter ? 'rgba(29, 161, 242, 0.12)' : 'rgba(255,255,255,0.03)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span className={item.impact === 'positive' ? 'badge-buy' : item.impact === 'negative' ? 'badge-sell' : 'badge-neutral'} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              {item.assetSymbol} | {item.impact.toUpperCase()}
                            </span>
                            {isTwitter && (
                              <span style={{ 
                                background: '#121214', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: '#1DA1F2', 
                                fontSize: '0.6rem', 
                                padding: '1px 4px', 
                                borderRadius: '4px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '3px', 
                                fontWeight: 700 
                              }}>
                                𝕏 Feed
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                        </div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: isTwitter ? '#1DA1F2' : 'var(--text-main)' }}>{item.headline}</h4>
                        {isTwitter && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.3', fontStyle: 'italic', marginTop: '2px' }}>
                            {item.content}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Historical Events Timeline */}
            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Días Históricos Clave (Últimos 8 Años)</h3>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px', 
                maxHeight: '440px', 
                overflowY: 'auto', 
                paddingRight: '6px',
                position: 'relative'
              }}>
                {/* Vertical line connecting events */}
                <div style={{
                  position: 'absolute',
                  left: '11px',
                  top: '10px',
                  bottom: '10px',
                  width: '2px',
                  background: 'linear-gradient(to bottom, var(--accent-primary) 0%, var(--border-color) 100%)',
                  zIndex: 0
                }} />

                {historyData.events.map((event, idx) => {
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      gap: '16px',
                      position: 'relative',
                      zIndex: 1
                    }}>
                      {/* Glowing timeline node */}
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: event.isPositive ? 'var(--color-buy)' : 'var(--color-sell)',
                        border: '4px solid var(--bg-sidebar)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 10px ${event.isPositive ? 'var(--color-buy)' : 'var(--color-sell)'}`,
                        flexShrink: 0,
                        marginTop: '2px'
                      }}>
                      </div>

                      {/* Card container */}
                      <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {event.date}
                          </span>
                          
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            color: event.isPositive ? 'var(--color-buy)' : 'var(--color-sell)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}>
                            {event.isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {event.change} ({event.priceThen})
                          </span>
                        </div>

                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{event.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{event.description}</p>
                        
                        {/* Tag category */}
                        <span style={{ 
                          alignSelf: 'flex-start',
                          fontSize: '0.65rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          background: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          marginTop: '2px'
                        }}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
