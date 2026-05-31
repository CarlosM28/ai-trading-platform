import React, { useState, useMemo, useEffect } from 'react';
import { useTrading } from '../context/TradingContext';
import { 
  Zap, 
  Cpu, 
  Gamepad2, 
  Coins, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldAlert, 
  Compass, 
  Radar, 
  RefreshCw,
  Plus,
  Check
} from 'lucide-react';
import { externalAssetsPool, type ExternalAsset } from '../utils/externalAssets';

interface ThematicCard {
  id: string;
  title: string;
  category: 'ia' | 'energy' | 'gaming' | 'crypto' | 'autonomy';
  featuredAssetId: string;
  featuredAssetName: string;
  featuredAssetSymbol: string;
  projectionScore: number; // de 1 a 10
  verdict: 'COMPRA FUERTE' | 'COMPRA' | 'MANTENER' | 'ACUMULAR';
  verdictColor: string;
  verdictBg: string;
  description: string;
  catalysts: string[];
  risks: string[];
}


export const FutureTrends: React.FC = () => {
  const { setActiveAssetId, setActiveTab } = useTrading();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Estado para el Radar de Descubrimiento
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [scannedAssets, setScannedAssets] = useState<ExternalAsset[]>([]);

  useEffect(() => {
    if (!isScanning) return;
    
    setScanStep(0);
    
    const t1 = setTimeout(() => setScanStep(1), 400);
    const t2 = setTimeout(() => setScanStep(2), 800);
    const t3 = setTimeout(() => setScanStep(3), 1200);
    const t4 = setTimeout(() => setScanStep(4), 1600);
    const t5 = setTimeout(() => {
      // Map category ID to Spanish label in externalAssetsPool
      const categoryMap: { [key: string]: string } = {
        'ia': 'IA y Hardware',
        'energy': 'Energía e Infraestructura',
        'gaming': 'Gaming y Blockbusters',
        'crypto': 'Web3 y Criptoactivos'
      };

      let filteredPool = externalAssetsPool;
      if (selectedCategory !== 'all') {
        const targetLabel = categoryMap[selectedCategory];
        filteredPool = externalAssetsPool.filter(a => a.category === targetLabel);
      }

      // Shuffling and selecting up to 10 assets
      const shuffled = [...filteredPool].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 10);
      
      setScannedAssets(selected);
      setIsScanning(false);
      setShowReport(true);
    }, 2000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [isScanning, selectedCategory]);


  // Estado para el Simulador de Capex de IA y Centros de Datos
  const [capexVal, setCapexVal] = useState<number>(1.5); // en Billones USD (Trillions)


  // Categorías de Filtro
  const categories = [
    { id: 'all', label: 'Todos los Sectores', icon: Compass },
    { id: 'ia', label: 'IA y Hardware', icon: Cpu },
    { id: 'energy', label: 'Energía e Infraestructura', icon: Zap },
    { id: 'gaming', label: 'Gaming y Blockbusters', icon: Gamepad2 },
    { id: 'crypto', label: 'Web3 y Criptoactivos', icon: Coins }
  ];

  // Base de datos de Proyecciones Temáticas
  const thematicCards: ThematicCard[] = [
    {
      id: 'trend_energy',
      title: 'Infraestructura Eléctrica y Auge Energético de la IA',
      category: 'energy',
      featuredAssetId: 'enr1',
      featuredAssetName: 'Siemens Energy AG',
      featuredAssetSymbol: 'ENR1',
      projectionScore: 9.6,
      verdict: 'COMPRA FUERTE',
      verdictColor: 'var(--color-buy)',
      verdictBg: 'rgba(0, 255, 170, 0.08)',
      description: 'El despliegue global de centros de datos de IA consume cantidades masivas de energía. Las redes de transmisión y generación eléctrica limpia están experimentando una de las mayores olas de demanda industrial de la historia moderna.',
      catalysts: [
        'Multiplicación por 3 del consumo energético de centros de datos de IA proyectado para 2030.',
        'Saturación de redes de distribución eléctrica tradicionales en EE.UU. y Europa.',
        'Contratos a largo plazo de Siemens Energy en sistemas de interconexión y subestaciones eléctricas.'
      ],
      risks: [
        'Retrasos en la cadena de suministro de cobre y transformadores industriales.',
        'Riesgos operativos y provisiones en la división eólica de Gamesa.'
      ]
    },
    {
      id: 'trend_hardware',
      title: 'Cómputo en la Nube y Semiconductores de Próxima Generación',
      category: 'ia',
      featuredAssetId: 'nvda',
      featuredAssetName: 'NVIDIA Corp.',
      featuredAssetSymbol: 'NVDA',
      projectionScore: 9.8,
      verdict: 'COMPRA FUERTE',
      verdictColor: 'var(--color-buy)',
      verdictBg: 'rgba(0, 255, 170, 0.08)',
      description: 'NVIDIA mantiene el monopolio absoluto del hardware de entrenamiento de modelos de lenguaje grandes (LLMs). Las inversiones masivas de los proveedores de nube (Microsoft, AWS, Google) impulsan el ciclo de capex en centros de datos.',
      catalysts: [
        'Lanzamiento masivo y ramp-up de entregas de la arquitectura de superchips Blackwell.',
        'Efectos de red de la plataforma de software CUDA, que bloquea a los desarrolladores en su ecosistema.',
        'Expansión del mercado hacia la IA soberana impulsada por gobiernos de todo el mundo.'
      ],
      risks: [
        'Restricciones geopolíticas a la exportación de semiconductores avanzados.',
        'Posible desaceleración del capex de las Big Tech si el ROI de la IA tarda en materializarse.'
      ]
    },
    {
      id: 'trend_gaming',
      title: 'Lanzamientos de Software e IPs de Entretenimiento Cíclico',
      category: 'gaming',
      featuredAssetId: 'ttwo',
      featuredAssetName: 'Take-Two Interactive',
      featuredAssetSymbol: 'TTWO',
      projectionScore: 9.2,
      verdict: 'COMPRA',
      verdictColor: 'var(--color-buy)',
      verdictBg: 'rgba(0, 255, 170, 0.04)',
      description: 'El lanzamiento del videojuego más esperado de la década, GTA VI, generará un choque cíclico masivo de ingresos en el sector de entretenimiento, impulsando múltiplos de valuación significativos para Take-Two.',
      catalysts: [
        'Estreno de GTA VI proyectado para el año fiscal 2026, con ventas estimadas de $1B en las primeras 24 horas.',
        'Recurrentes ingresos estables y de alto margen del modo multijugador online a largo plazo.',
        'Consolidación de Zynga para expandir el catálogo al lucrativo sector móvil.'
      ],
      risks: [
        'Posibles retrasos en la fecha final de lanzamiento por pulido de calidad.',
        'Elevados costes de desarrollo de videojuegos triple-A.'
      ]
    },
    {
      id: 'trend_crypto',
      title: 'Institucionalización de Criptoactivos y Escalabilidad de Capa 1',
      category: 'crypto',
      featuredAssetId: 'btc',
      featuredAssetName: 'Bitcoin',
      featuredAssetSymbol: 'BTC',
      projectionScore: 8.9,
      verdict: 'ACUMULAR',
      verdictColor: 'var(--accent-secondary)',
      verdictBg: 'rgba(0, 240, 255, 0.08)',
      description: 'La adopción soberana y la integración de activos digitales mediante ETFs spot globales está canalizando billones de capital hacia criptoactivos de capa 1. Bitcoin actúa como reserva y redes como Solana actúan como la autopista del procesamiento financiero.',
      catalysts: [
        'Flujos de entrada récord y sostenidos de fondos institucionales y pensiones vía ETFs spot.',
        'Actualizaciones tecnológicas de procesamiento de transacciones masivas (ej. Firedancer en Solana).',
        'Crecimiento de la liquidez global e inflación que empuja a activos alternativos escasos.'
      ],
      risks: [
        'Incertidumbre regulatoria sobre protocolos DeFi y tokens secundarios en EE.UU.',
        'Alta volatilidad del mercado que puede sacudir posiciones apalancadas.'
      ]
    },
    {
      id: 'trend_autonomy',
      title: 'Conducción Autónoma Completa (FSD) y Robotaxis',
      category: 'ia',
      featuredAssetId: 'tsla',
      featuredAssetName: 'Tesla Inc.',
      featuredAssetSymbol: 'TSLA',
      projectionScore: 8.2,
      verdict: 'MANTENER',
      verdictColor: 'var(--color-warning)',
      verdictBg: 'rgba(245, 158, 11, 0.08)',
      description: 'El desarrollo de redes neuronales end-to-end abre la puerta al despliegue comercial de flotas de robotaxis autónomos. Tesla cotiza con una prima de valoración basada en software de conducción y robótica humanoide Optimus.',
      catalysts: [
        'Expansión de la beta FSD V12 en mercados clave como China y la Unión Europea.',
        'Anuncios y demostraciones de hardware de robótica Optimus en entornos fabriles.',
        'Modelo de negocio de alto margen de licencias de software FSD a terceros fabricantes.'
      ],
      risks: [
        'Escrutinio regulatorio estricto y demandas por accidentes bajo sistemas autopilot.',
        'Compresión de márgenes automotrices por competencia severa en vehículos eléctricos.'
      ]
    }
  ];

  // Filtrar tarjetas
  const filteredCards = useMemo(() => {
    if (selectedCategory === 'all') return thematicCards;
    return thematicCards.filter(c => c.category === selectedCategory);
  }, [selectedCategory]);

  // Navegar y enfocar un activo destacado
  const handleAnalyzeAsset = (assetId: string) => {
    setActiveAssetId(assetId);
    setActiveTab('dashboard'); // Redirigir al panel de control para ver el gráfico en tiempo real
  };

  // Cálculos dinámicos del Simulador de Capex de IA y Energía
  const simulations = useMemo(() => {
    // Escala del Slider: 0.1 a 5.0 Billones de USD
    // Valores Base 2026:
    // NVDA Precio actual: 289.59. ENR1 Precio actual: 166.81
    
    // Proyección NVIDIA (NVDA)
    const nvdaBasePrice = 289.59;
    const nvdaRevenue2026 = 110; // Billones USD
    const nvdaProjPrice2030 = nvdaBasePrice * (1 + capexVal * 0.48);
    const nvdaProjRevenue2030 = nvdaRevenue2026 * (1 + capexVal * 0.42);
    const nvdaRoi = ((nvdaProjPrice2030 - nvdaBasePrice) / nvdaBasePrice) * 100;

    // Proyección Siemens Energy (ENR1)
    const enrBasePrice = 166.81;
    const enrRevenue2026 = 35; // Billones EUR
    const enrProjPrice2030 = enrBasePrice * (1 + capexVal * 0.32);
    const enrProjRevenue2030 = enrRevenue2026 * (1 + capexVal * 0.28);
    const enrRoi = ((enrProjPrice2030 - enrBasePrice) / enrBasePrice) * 100;

    return {
      nvda: {
        currentPrice: nvdaBasePrice,
        projectedPrice: Number(nvdaProjPrice2030.toFixed(2)),
        currentRevenue: nvdaRevenue2026,
        projectedRevenue: Number(nvdaProjRevenue2030.toFixed(1)),
        roi: Number(nvdaRoi.toFixed(0))
      },
      enr: {
        currentPrice: enrBasePrice,
        projectedPrice: Number(enrProjPrice2030.toFixed(2)),
        currentRevenue: enrRevenue2026,
        projectedRevenue: Number(enrProjRevenue2030.toFixed(1)),
        roi: Number(enrRoi.toFixed(0))
      }
    };
  }, [capexVal]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Proyecciones y <span className="text-gradient-purple">Tendencias Temáticas de Futuro</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Investigación cuantitativa de macrotendencias y catalizadores tecnológicos de alto impacto para la próxima década.
          </p>
        </div>
      </div>

      {/* Interactive Capex & Energy Simulator */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Simulador de Impacto: Capex en Data Centers de IA y Demanda Energética (2030)
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '32px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          
          {/* Controls Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              El auge de la IA generativa requiere un volumen extraordinario de cómputo (GPUs) y electricidad. Ajusta la inversión global estimada en centros de datos para ver el impacto proyectado en **NVIDIA** (hardware) y **Siemens Energy** (redes e infraestructura eléctrica).
            </p>

            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '16px', 
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Capex Global Acumulado (IA)</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                  ${capexVal.toFixed(1)} Billones USD
                </span>
              </div>
              
              <input 
                type="range" 
                min="0.1" 
                max="5.0" 
                step="0.1" 
                value={capexVal} 
                onChange={(e) => setCapexVal(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent-primary)',
                  cursor: 'pointer',
                  height: '6px',
                  borderRadius: '3px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>$0.1B (Conservador)</span>
                <span>$2.5B (Moderar)</span>
                <span>$5.0B (Hiper-crecimiento)</span>
              </div>
            </div>
          </div>

          {/* SVG Comparison Bars Graphic */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>Proyección de Precios de Acción al 2030 (USD)</h4>
            
            {/* SVG Visual Chart */}
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <svg viewBox="0 0 450 150" style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                {/* Y-Axis lines */}
                <line x1="120" y1="20" x2="420" y2="20" stroke="rgba(255,255,255,0.04)" />
                <line x1="120" y1="70" x2="420" y2="70" stroke="rgba(255,255,255,0.04)" />
                <line x1="120" y1="120" x2="420" y2="120" stroke="rgba(255,255,255,0.04)" />

                {/* NVIDIA row */}
                <text x="10" y="45" fill="var(--text-main)" fontSize="11" fontWeight="700">NVIDIA (NVDA)</text>
                <text x="10" y="60" fill="var(--color-buy)" fontSize="9" fontWeight="600">ROI: +{simulations.nvda.roi}%</text>
                
                {/* NVDA Base Bar */}
                <rect x="120" y="32" width="60" height="15" fill="rgba(255,255,255,0.08)" rx="4" />
                <text x="185" y="43" fill="var(--text-muted)" fontSize="9">Current: $289</text>
                
                {/* NVDA Proj Bar */}
                <rect x="120" y="52" width={Math.min(260, 60 * (simulations.nvda.projectedPrice / simulations.nvda.currentPrice))} height="15" fill="url(#nvdaGrad)" rx="4" style={{ transition: 'width 0.3s ease' }} />
                <text x={Math.min(380, 125 + 60 * (simulations.nvda.projectedPrice / simulations.nvda.currentPrice))} y="63" fill="var(--text-main)" fontSize="10" fontWeight="700">
                  2030: ${simulations.nvda.projectedPrice}
                </text>

                {/* Siemens Energy row */}
                <text x="10" y="105" fill="var(--text-main)" fontSize="11" fontWeight="700">Siemens Energy</text>
                <text x="10" y="120" fill="var(--color-buy)" fontSize="9" fontWeight="600">ROI: +{simulations.enr.roi}%</text>

                {/* ENR Base Bar */}
                <rect x="120" y="92" width="60" height="15" fill="rgba(255,255,255,0.08)" rx="4" />
                <text x="185" y="103" fill="var(--text-muted)" fontSize="9">Current: $166</text>

                {/* ENR Proj Bar */}
                <rect x="120" y="112" width={Math.min(260, 60 * (simulations.enr.projectedPrice / simulations.enr.currentPrice))} height="15" fill="url(#enrGrad)" rx="4" style={{ transition: 'width 0.3s ease' }} />
                <text x={Math.min(380, 125 + 60 * (simulations.enr.projectedPrice / simulations.enr.currentPrice))} y="123" fill="var(--text-main)" fontSize="10" fontWeight="700">
                  2030: ${simulations.enr.projectedPrice}
                </text>

                {/* Gradients definitions */}
                <defs>
                  <linearGradient id="nvdaGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-primary)" />
                    <stop offset="100%" stopColor="var(--color-buy)" />
                  </linearGradient>
                  <linearGradient id="enrGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--accent-secondary)" />
                    <stop offset="100%" stopColor="var(--accent-primary)" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
        </div>
      </div>

      {/* Radar de Descubrimiento de Activos Externos */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(0, 240, 255, 0.05)',
              border: '1px solid rgba(0, 240, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-secondary)'
            }}>
              <Radar size={22} className={isScanning ? "animate-spin-slow" : ""} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Radar de Descubrimiento de Activos Externos
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', background: 'rgba(0, 240, 255, 0.08)', padding: '2px 8px', borderRadius: '20px', border: '1px solid rgba(0, 240, 255, 0.15)', fontWeight: 600 }}>DISCOVERY AI</span>
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                Escanea oportunidades de alta proyección fuera de la lista de activos predeterminados (BTC, NVDA, TSLA, etc.).
              </p>
            </div>
          </div>
          
          {!isScanning && (
            <button
              onClick={() => setIsScanning(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 240, 255, 0.2)',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 240, 255, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 240, 255, 0.2)';
              }}
            >
              {showReport ? <RefreshCw size={14} /> : <Radar size={14} />}
              <span>{showReport ? 'Volver a Escanear' : 'Iniciar Escaneo de Oportunidades'}</span>
            </button>
          )}
        </div>

        {/* SCANNING ACTIVE STATE */}
        {isScanning && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(0, 240, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '190px'
          }}>
            {/* Holographic Radar Circle Animation */}
            <div style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '2px solid rgba(0, 240, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 240, 255, 0.02)'
            }}>
              {/* Pulsing rings */}
              <div style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                border: '1px dashed var(--accent-secondary)',
                animation: 'spin 10s linear infinite'
              }} />
              <div style={{
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                border: '2px solid rgba(0, 240, 255, 0.05)',
                animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
              }} />
              <Radar size={28} color="var(--accent-secondary)" style={{ animation: 'spin 2s linear infinite' }} />
            </div>

            {/* Console logs */}
            <div style={{
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: 'var(--accent-secondary)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              maxWidth: '500px'
            }}>
              <div style={{ opacity: scanStep >= 0 ? 1 : 0.15, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-buy)' }}>⚡</span>
                <span>[SISTEMA] Iniciando barrido cuántico de mercados...</span>
              </div>
              <div style={{ opacity: scanStep >= 1 ? 1 : 0.15, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--accent-secondary)' }}>🔍</span>
                <span>[BARRIDO] Excluyendo activos predeterminados (BTC, SOL, NVDA, TSLA)...</span>
              </div>
              <div style={{ opacity: scanStep >= 2 ? 1 : 0.15, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-warning)' }}>⛓️</span>
                <span>[ANÁLISIS] Correlacionando macrotendencias de IA, Redes Eléctricas y Web3...</span>
              </div>
              <div style={{ opacity: scanStep >= 3 ? 1 : 0.15, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--color-buy)' }}>🧠</span>
                <span>[PROYECCIÓN] Estimando multiplicadores de Capex corporativo y ROIs al 2030...</span>
              </div>
              <div style={{ opacity: scanStep >= 4 ? 1 : 0.15, transition: 'opacity 0.2s', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <span style={{ color: 'var(--accent-secondary)' }}>✅</span>
                <span>[CONCLUIDO] Informe de activos externos generado exitosamente.</span>
              </div>
            </div>
          </div>
        )}

        {/* SHOW RECOMMENDATIONS REPORT */}
        {showReport && !isScanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0, 240, 255, 0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.08)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                INFORME DE DESCUBRIMIENTO
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>|</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Se han seleccionado {scannedAssets.length} activos de alto potencial fuera de la base de datos predeterminada del simulador de trading.
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {scannedAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  style={{
                    background: 'rgba(10, 15, 26, 0.4)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.15)';
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.background = 'rgba(10, 15, 26, 0.4)';
                  }}
                >
                  {/* Header / Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {asset.symbol}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: asset.type === 'crypto' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(95, 93, 236, 0.08)',
                          color: asset.type === 'crypto' ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                          border: asset.type === 'crypto' ? '1px solid rgba(0, 240, 255, 0.15)' : '1px solid rgba(95, 93, 236, 0.2)'
                        }}>
                          {asset.type === 'crypto' ? 'Cripto' : 'Acción'}
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                          Externo
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {asset.name}
                      </div>
                    </div>

                    {/* Sentiment Score */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Sentimiento IA</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-buy)', textShadow: '0 0 10px rgba(0, 255, 170, 0.2)' }}>
                        {asset.sentiment}%
                      </span>
                    </div>
                  </div>

                  {/* Thesis */}
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                    {asset.thesis}
                  </p>

                  {/* Sector Category */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Categoría:</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-main)', fontWeight: 600, background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px' }}>
                      {asset.category}
                    </span>
                  </div>

                  {/* Divider */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />

                  {/* Metrics */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Nivel de Riesgo</span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: asset.risk === 'Bajo' ? 'var(--color-buy)' : asset.risk === 'Medio' ? 'var(--color-warning)' : 'var(--color-sell)'
                      }}>
                        {asset.risk}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>ROI Est. (2030)</span>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--color-buy)' }}>
                        +{asset.projectedRoi}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INITIAL WELCOME MESSAGE (IF NOT YET SCANNED AND NOT SCANNING) */}
        {!showReport && !isScanning && (
          <div style={{
            background: 'rgba(255,255,255,0.005)',
            border: '1px dashed rgba(255,255,255,0.05)',
            borderRadius: '12px',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textAlign: 'center',
            minHeight: '120px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(0, 240, 255, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-secondary)'
            }}>
              <Radar size={22} />
            </div>
            <div style={{ maxWidth: '480px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>¿Listo para explorar nuevas oportunidades de inversión?</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.45', margin: 0 }}>
                Escanea el mercado internacional y Web3 para descubrir 3 activos prometedores no incluidos en tu panel habitual. El radar simula cálculos en segundo plano de capex corporativo y macrotendencias globales.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Category Selection Filter Buttons */}
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

      {/* Thematic Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
      }}>
        {filteredCards.map((card) => {
          return (
            <div 
              key={card.id} 
              className="glass-card" 
              style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                border: '1px solid rgba(255,255,255,0.03)',
                position: 'relative'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: '1.3' }}>
                  {card.title}
                </h3>
                
                {/* score circle */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Score</span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--accent-secondary)' }}>
                    {card.projectionScore}
                  </span>
                </div>
              </div>

              {/* description */}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                {card.description}
              </p>

              {/* Featured Asset Linking Box */}
              <div style={{
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activo Destacado</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      {card.featuredAssetName}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 600, background: 'rgba(0, 240, 255, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                      {card.featuredAssetSymbol}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleAnalyzeAsset(card.featuredAssetId)}
                  style={{
                    background: 'rgba(95, 93, 236, 0.1)',
                    border: '1px solid rgba(95, 93, 236, 0.2)',
                    color: 'var(--accent-primary)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(95, 93, 236, 0.1)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }}
                >
                  Analizar <ArrowUpRight size={14} />
                </button>
              </div>

              {/* Verdict Banner */}
              <div style={{
                background: card.verdictBg,
                border: `1px solid ${card.verdictColor}22`,
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Veredicto Temático:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: card.verdictColor }}>
                  {card.verdict}
                </span>
              </div>

              {/* Growth Catalysts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <TrendingUp size={12} color="var(--color-buy)" /> Catalizadores de Crecimiento
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {card.catalysts.map((cat, idx) => (
                    <li key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {cat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risk Factors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={12} color="var(--color-sell)" /> Factores de Riesgo
                </span>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {card.risks.map((risk, idx) => (
                    <li key={idx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
