export interface ExternalAsset {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  thesis: string;
  projectedRoi: number;
  risk: 'Bajo' | 'Medio' | 'Alto';
  sentiment: number;
  category: 'ia' | 'energy' | 'gaming' | 'crypto' | 'autonomy';
  peRatio?: number;
  socialVolume?: number;
}

export const externalAssetsPool: ExternalAsset[] = [
  {
    symbol: 'AMD',
    name: 'Advanced Micro Devices, Inc.',
    type: 'stock',
    thesis: 'Principal competidor de NVIDIA en aceleradores de IA (MI300X). La diversificación del mercado de silicio beneficia a AMD por su agresiva estrategia de precios y alianzas con Microsoft y Meta.',
    projectedRoi: 110,
    risk: 'Medio',
    sentiment: 88,
    category: 'ia',
    peRatio: 45.2
  },
  {
    symbol: 'CEG',
    name: 'Constellation Energy Corp.',
    type: 'stock',
    thesis: 'El mayor productor de energía nuclear comercial en EE.UU. Firma contratos directos con centros de datos de Microsoft para suministrar energía limpia e ininterrumpida de carga base 24/7.',
    projectedRoi: 95,
    risk: 'Bajo',
    sentiment: 92,
    category: 'energy',
    peRatio: 31.8
  },
  {
    symbol: 'ASML',
    name: 'ASML Holding N.V.',
    type: 'stock',
    thesis: 'Monopolio global en máquinas de litografía ultravioleta extrema (EUV), esenciales para fabricar los chips de IA más avanzados de TSMC. Inversión ultra-segura de cuello de botella tecnológico.',
    projectedRoi: 75,
    risk: 'Bajo',
    sentiment: 94,
    category: 'ia',
    peRatio: 38.5
  },
  {
    symbol: 'SMCI',
    name: 'Super Micro Computer, Inc.',
    type: 'stock',
    thesis: 'Líder en arquitectura de servidores de refrigeración líquida plug-and-play optimizados para chips NVIDIA Blackwell. Crecimiento de ingresos correlacionado directamente con el Capex de IA.',
    projectedRoi: 140,
    risk: 'Alto',
    sentiment: 81,
    category: 'ia',
    peRatio: 18.4
  },
  {
    symbol: 'VRT',
    name: 'Vertiv Holdings Co.',
    type: 'stock',
    thesis: 'Proveedor clave de sistemas de gestión térmica y refrigeración líquida para centros de datos de alta densidad. Esencial para evitar el sobrecalentamiento de los racks de GPUs de última generación.',
    projectedRoi: 85,
    risk: 'Medio',
    sentiment: 89,
    category: 'energy',
    peRatio: 48.1
  },
  {
    symbol: 'RNDR',
    name: 'Render Network (RENDER)',
    type: 'crypto',
    thesis: 'Red descentralizada de renderizado por GPU. Permite a los desarrolladores de IA y creadores de efectos visuales alquilar potencia de GPU no utilizada en todo el mundo a cambio de tokens RENDER.',
    projectedRoi: 180,
    risk: 'Alto',
    sentiment: 90,
    category: 'crypto',
    socialVolume: 6420
  },
  {
    symbol: 'TAO',
    name: 'Bittensor (TAO)',
    type: 'crypto',
    thesis: 'Protocolo de código abierto que impulsa una red descentralizada de aprendizaje automático. Incentiva la colaboración de subredes de IA especializadas para competir contra los modelos cerrados de OpenAI.',
    projectedRoi: 220,
    risk: 'Alto',
    sentiment: 87,
    category: 'crypto',
    socialVolume: 4850
  },
  {
    symbol: 'LINK',
    name: 'Chainlink (LINK)',
    type: 'crypto',
    thesis: 'El estándar de oráculo para conectar contratos inteligentes con datos del mundo real. Impulsa la tokenización de activos del mundo real (RWA) en colaboración con SWIFT y grandes bancos.',
    projectedRoi: 130,
    risk: 'Medio',
    sentiment: 86,
    category: 'crypto',
    socialVolume: 3950
  },
  {
    symbol: 'NEAR',
    name: 'Near Protocol (NEAR)',
    type: 'crypto',
    thesis: 'Blockchain de capa 1 escalable enfocada en usabilidad e infraestructura para aplicaciones Web3 con IA integrada de forma nativa. Cofundador con experiencia directa en el paper de Transformers de Google.',
    projectedRoi: 165,
    risk: 'Alto',
    sentiment: 85,
    category: 'crypto',
    socialVolume: 2980
  },
  {
    symbol: 'FET',
    name: 'Fetch.ai / Alliance (FET)',
    type: 'crypto',
    thesis: 'Fusión estratégica de protocolos de agentes de IA para crear una superinteligencia artificial descentralizada. Permite crear agentes de software autónomos que realizan transacciones económicas complejas.',
    projectedRoi: 195,
    risk: 'Alto',
    sentiment: 89,
    category: 'crypto',
    socialVolume: 5120
  },
  {
    symbol: 'INTC',
    name: 'Intel Corporation',
    type: 'stock',
    thesis: 'Gigante de semiconductores en reestructuración. Su enfoque en el desarrollo de fundiciones en EE.UU. (Intel Foundry) y sus nuevos aceleradores Gaudi 3 buscan arrebatar cuota de mercado en la gama media de hardware de IA.',
    projectedRoi: 65,
    risk: 'Alto',
    sentiment: 72,
    category: 'ia',
    peRatio: 35.0
  },
  {
    symbol: 'QCOM',
    name: 'Qualcomm Incorporated',
    type: 'stock',
    thesis: 'Líder absoluto en procesadores de IA en el dispositivo (Edge AI) para smartphones de gama alta y PCs Copilot+. La inferencia local de modelos de IA reduce la dependencia de centros de datos centralizados.',
    projectedRoi: 80,
    risk: 'Bajo',
    sentiment: 87,
    category: 'ia',
    peRatio: 22.0
  },
  {
    symbol: 'GE',
    name: 'GE Vernova Inc.',
    type: 'stock',
    thesis: 'Spin-off de energía de General Electric. Líder en turbinas de gas de ciclo combinado y tecnologías de red inteligente, esenciales para respaldar la intermitencia de las renovables demandadas por la IA.',
    projectedRoi: 90,
    risk: 'Medio',
    sentiment: 88,
    category: 'energy',
    peRatio: 28.0
  },
  {
    symbol: 'NEE',
    name: 'NextEra Energy, Inc.',
    type: 'stock',
    thesis: 'El mayor productor mundial de energía eólica y solar. Su amplia cartera de proyectos de almacenamiento en baterías y generación limpia la posiciona como el socio preferente de las Big Tech para sus objetivos de emisión cero.',
    projectedRoi: 70,
    risk: 'Bajo',
    sentiment: 91,
    category: 'energy',
    peRatio: 25.0
  },
  {
    symbol: 'FSLR',
    name: 'First Solar, Inc.',
    type: 'stock',
    thesis: 'Fabricante de paneles solares de película delgada premium para proyectos a gran escala (utility-scale). Se beneficia de los subsidios de la ley IRA en EE.UU. y de la expansión de granjas solares dedicadas a IA.',
    projectedRoi: 105,
    risk: 'Medio',
    sentiment: 85,
    category: 'energy',
    peRatio: 18.0
  },
  {
    symbol: 'OP',
    name: 'Optimism (OP)',
    type: 'crypto',
    thesis: 'Solución de escalabilidad de capa 2 de Ethereum líder en la arquitectura Superchain. Facilita microtransacciones ultra-baratas necesarias para agentes de IA autónomos que operan microservicios en cadena.',
    projectedRoi: 155,
    risk: 'Alto',
    sentiment: 84,
    category: 'crypto',
    socialVolume: 3200
  },
  {
    symbol: 'U',
    name: 'Unity Software Inc.',
    type: 'stock',
    thesis: 'Plataforma líder en desarrollo de motores gráficos 3D en tiempo real. Indispensable para el desarrollo del Metaverso Web3, simulación física para robótica de IA y creación de mundos virtuales interactivos.',
    projectedRoi: 75,
    risk: 'Alto',
    sentiment: 74,
    category: 'gaming',
    peRatio: 50.0
  },
  {
    symbol: 'SONY',
    name: 'Sony Group Corp.',
    type: 'stock',
    thesis: 'Monopolio de distribución de entretenimiento con PlayStation 5. Su integración de sensores de imagen avanzados con IA y sus planes de juegos en la nube y blockbusters de RV consolidan su ventaja.',
    projectedRoi: 50,
    risk: 'Bajo',
    sentiment: 86,
    category: 'gaming',
    peRatio: 18.0
  },
  {
    symbol: 'EA',
    name: 'Electronic Arts Inc.',
    type: 'stock',
    thesis: 'Editor de franquicias deportivas e IPs blockbuster recurrentes altamente rentables (EA Sports FC, Apex Legends). Su modelo de microtransacciones estables proporciona márgenes de cash-flow excepcionales.',
    projectedRoi: 40,
    risk: 'Bajo',
    sentiment: 82,
    category: 'gaming',
    peRatio: 32.0
  },
  {
    symbol: 'NTDOY',
    name: 'Nintendo Co., Ltd.',
    type: 'stock',
    thesis: 'Poseedor de una de las carteras de propiedad intelectual (IP) más valiosas del mundo (Mario, Zelda, Pokemon). La expectativa de su consola de próxima generación genera un fuerte catalizador de valuación cíclica.',
    projectedRoi: 60,
    risk: 'Bajo',
    sentiment: 93,
    category: 'gaming',
    peRatio: 26.0
  }
];
