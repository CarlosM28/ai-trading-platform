import React, { useState } from 'react';
import { useTrading, type BotConfig } from '../context/TradingContext';
import {
  Bot,
  Terminal as TerminalIcon,
  Play,
  Square,
  Sliders,
  DollarSign,
  Layers,
  Activity,
  Shield,
  Target,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const BotsControl: React.FC = () => {
  const { bots, botPositions, toggleBot, updateBotParams, logs, apiConfig, assets, toggleAssetBotOperation, dataMode, riskConfig, tradingHalted } = useTrading();
  const [editingBotId, setEditingBotId] = useState<string | null>(null);

  // Estados locales para la edición de parámetros
  const [localTradeSize, setLocalTradeSize] = useState<number>(0);
  const [localRsiOversold, setLocalRsiOversold] = useState<number>(0);
  const [localRsiOverbought, setLocalRsiOverbought] = useState<number>(0);
  const [localMaFast, setLocalMaFast] = useState<number>(0);
  const [localMaSlow, setLocalMaSlow] = useState<number>(0);
  const [localSentiment, setLocalSentiment] = useState<number>(0);
  const [localConsensusThreshold, setLocalConsensusThreshold] = useState<number>(2);
  const [localActiveStrategies, setLocalActiveStrategies] = useState<string[]>([]);
  // Parámetros de gestión de riesgo
  const [localRiskPercent, setLocalRiskPercent] = useState<number>(1.5);
  const [localAtrStopMult, setLocalAtrStopMult] = useState<number>(2);
  const [localRiskReward, setLocalRiskReward] = useState<number>(2);
  const [localCooldown, setLocalCooldown] = useState<number>(3);
  const [localMaxExposure, setLocalMaxExposure] = useState<number>(25);

  const startEditing = (bot: BotConfig) => {
    setEditingBotId(bot.id);
    setLocalTradeSize(bot.tradeSizeUsd);
    setLocalRsiOversold(bot.params.rsiOversold);
    setLocalRsiOverbought(bot.params.rsiOverbought);
    setLocalMaFast(bot.params.maFast);
    setLocalMaSlow(bot.params.maSlow);
    setLocalSentiment(bot.params.minSentimentScore);
    setLocalConsensusThreshold(bot.params.consensusThreshold || 2);
    setLocalActiveStrategies(bot.params.activeStrategies || ['rsi', 'macd', 'ma_crossover', 'fundamental']);
    setLocalRiskPercent(bot.params.riskPercent ?? 1.5);
    setLocalAtrStopMult(bot.params.atrStopMultiplier ?? 2);
    setLocalRiskReward(bot.params.riskRewardRatio ?? 2);
    setLocalCooldown(bot.params.cooldownCandles ?? 3);
    setLocalMaxExposure(bot.params.maxAssetExposurePercent ?? 25);
  };

  const saveParams = (botId: string) => {
    updateBotParams(botId, {
      tradeSizeUsd: localTradeSize,
      params: {
        rsiOversold: localRsiOversold,
        rsiOverbought: localRsiOverbought,
        maFast: localMaFast,
        maSlow: localMaSlow,
        minSentimentScore: localSentiment,
        consensusThreshold: localConsensusThreshold,
        activeStrategies: localActiveStrategies,
        riskPercent: localRiskPercent,
        atrStopMultiplier: localAtrStopMult,
        riskRewardRatio: localRiskReward,
        cooldownCandles: localCooldown,
        maxAssetExposurePercent: localMaxExposure
      }
    });
    setEditingBotId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Consola de <span className="text-gradient-purple">Bots Autónomos</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Activa bots cuantitativos y calibra sus parámetros técnicos y de riesgo.
        </p>
      </div>

      {/* Exchange Connection Alert (Simulated) */}
      <div style={{
        background: apiConfig.isConnected ? 'rgba(0, 255, 170, 0.05)' : 'rgba(245, 158, 11, 0.05)',
        border: apiConfig.isConnected ? '1px solid rgba(0, 255, 170, 0.15)' : '1px solid rgba(245, 158, 11, 0.15)',
        borderRadius: '12px',
        padding: '12px 18px',
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            padding: '3px 8px',
            borderRadius: '6px',
            background: dataMode === 'live' ? 'rgba(0,255,170,0.12)' : 'rgba(0,240,255,0.10)',
            color: dataMode === 'live' ? 'var(--color-buy)' : 'var(--accent-secondary)',
            border: dataMode === 'live' ? '1px solid rgba(0,255,170,0.25)' : '1px solid rgba(0,240,255,0.2)'
          }}>
            {dataMode === 'live' ? '🟢 LIVE' : '🧪 SIM'}
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '6px',
            background: tradingHalted ? 'rgba(255,70,104,0.12)' : 'rgba(255,255,255,0.04)',
            color: tradingHalted ? 'var(--color-sell)' : 'var(--text-muted)',
            border: tradingHalted ? '1px solid rgba(255,70,104,0.25)' : '1px solid rgba(255,255,255,0.06)'
          }}>
            {tradingHalted
              ? '⛔ PAUSADO (pérdida diaria)'
              : `Posiciones ${botPositions.length}${riskConfig.maxConcurrentPositions > 0 ? `/${riskConfig.maxConcurrentPositions}` : ''}`}
          </span>
          <Activity size={18} color={apiConfig.isConnected ? 'var(--color-buy)' : 'var(--color-warning)'} />
          <span>
            Conexión de Ejecución: {apiConfig.isConnected ? (
              <b style={{ color: 'var(--color-buy)' }}>EXCHANGE SANDBOX CONECTADO ({apiConfig.exchange.toUpperCase()})</b>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Operando en Modo <b>Simulación Local (Paper Trading)</b>. Puedes configurar tu API en ajustes.</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Layout: Bots Grid + Live Console */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Side: Bot Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {bots.map((bot) => {
            const isEditing = editingBotId === bot.id;
            
            return (
              <div 
                key={bot.id} 
                className="glass-card" 
                style={{ 
                  padding: '24px',
                  borderLeft: bot.isActive ? '4px solid var(--accent-secondary)' : '4px solid transparent'
                }}
              >
                {/* Bot Main Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: bot.isActive 
                        ? 'rgba(0, 240, 255, 0.1)' 
                        : 'rgba(255, 255, 255, 0.02)',
                      border: bot.isActive 
                        ? '1px solid rgba(0, 240, 255, 0.2)' 
                        : '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bot size={20} color={bot.isActive ? 'var(--accent-secondary)' : 'var(--text-muted)'} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {bot.name}
                        <span className={bot.isActive ? 'badge-buy' : 'badge-neutral'} style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px' }}>
                          {bot.isActive ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{bot.description}</p>
                    </div>
                  </div>

                  {/* Toggle Switch Button */}
                  <button
                    onClick={() => toggleBot(bot.id)}
                    style={{
                      background: bot.isActive ? 'var(--color-sell)' : 'var(--accent-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                      boxShadow: bot.isActive ? '0 0 10px rgba(255,70,104,0.2)' : '0 0 10px rgba(95,93,236,0.2)'
                    }}
                  >
                    {bot.isActive ? <Square size={12} /> : <Play size={12} />}
                    {bot.isActive ? 'DETENER' : 'INICIAR'}
                  </button>
                </div>

                {/* Bot Parameters & Calibration */}
                {isEditing ? (
                  /* Formulario de edición */
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    border: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sliders size={14} color="var(--accent-secondary)" /> Calibrar Parámetros
                    </h4>

                    {/* Trade Size Parameter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tamaño de Operación (USD)</span>
                        <span style={{ fontWeight: 700 }}>${localTradeSize.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="200" 
                        max="10000" 
                        step="100" 
                        value={localTradeSize} 
                        onChange={(e) => setLocalTradeSize(Number(e.target.value))}
                        style={{ accentColor: 'var(--accent-primary)', width: '100%', cursor: 'pointer' }}
                      />
                    </div>

                    {/* RSI Parameters */}
                    {bot.strategyType === 'rsi' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sobreventa (COMPRA)</span>
                          <input 
                            type="number" 
                            value={localRsiOversold}
                            onChange={(e) => setLocalRsiOversold(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sobrecompra (VENTA)</span>
                          <input 
                            type="number" 
                            value={localRsiOverbought}
                            onChange={(e) => setLocalRsiOverbought(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Moving Average Parameters */}
                    {bot.strategyType === 'ma_crossover' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Media Rápida (SMA)</span>
                          <input 
                            type="number" 
                            value={localMaFast}
                            onChange={(e) => setLocalMaFast(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Media Lenta (SMA)</span>
                          <input 
                            type="number" 
                            value={localMaSlow}
                            onChange={(e) => setLocalMaSlow(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Fundamental Parameters */}
                    {bot.strategyType === 'fundamental' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Sentimiento Mínimo para Operar</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{(localSentiment * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.10" 
                          max="0.90" 
                          step="0.05" 
                          value={localSentiment} 
                          onChange={(e) => setLocalSentiment(Number(e.target.value))}
                          style={{ accentColor: 'var(--accent-secondary)', width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                    )}

                    {/* Consensus Parameters */}
                    {bot.strategyType === 'consensus' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Coincidencias necesarias (Consenso)</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{localConsensusThreshold} de {localActiveStrategies.length} estrategias</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max={localActiveStrategies.length || 1} 
                            step="1" 
                            value={localConsensusThreshold} 
                            onChange={(e) => setLocalConsensusThreshold(Number(e.target.value))}
                            style={{ accentColor: 'var(--accent-secondary)', width: '100%', cursor: 'pointer' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estrategias a combinar:</span>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                              { id: 'rsi', label: 'RSI' },
                              { id: 'macd', label: 'MACD' },
                              { id: 'ma_crossover', label: 'Cruce Medias' },
                              { id: 'fundamental', label: 'Fundamental' }
                            ].map((strat) => {
                              const isChecked = localActiveStrategies.includes(strat.id);
                              return (
                                <label key={strat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      let updated = [...localActiveStrategies];
                                      if (isChecked) {
                                        updated = updated.filter(x => x !== strat.id);
                                      } else {
                                        updated.push(strat.id);
                                      }
                                      setLocalActiveStrategies(updated);
                                      if (localConsensusThreshold > updated.length) {
                                        setLocalConsensusThreshold(updated.length);
                                      }
                                    }}
                                    style={{ accentColor: 'var(--accent-primary)' }}
                                  />
                                  {strat.label}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Gestión de Riesgo (común a todas las estrategias) */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)' }}>
                        <Shield size={14} /> Gestión de Riesgo
                      </h4>

                      {/* Riesgo por operación */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Riesgo por operación (% de la cartera)</span>
                          <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{localRiskPercent.toFixed(1)}%</span>
                        </div>
                        <input
                          type="range" min="0.5" max="5" step="0.5"
                          value={localRiskPercent}
                          onChange={(e) => setLocalRiskPercent(Number(e.target.value))}
                          style={{ accentColor: 'var(--color-warning)', width: '100%', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Pérdida máxima estimada si salta el stop-loss. Los profesionales arriesgan 1–2% por trade.
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Distancia del Stop (ATR) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stop-Loss (× ATR)</span>
                          <input
                            type="number" min="0.5" max="6" step="0.5"
                            value={localAtrStopMult}
                            onChange={(e) => setLocalAtrStopMult(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                        {/* Ratio Riesgo/Beneficio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ratio Beneficio/Riesgo</span>
                          <input
                            type="number" min="1" max="5" step="0.5"
                            value={localRiskReward}
                            onChange={(e) => setLocalRiskReward(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* Cooldown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enfriamiento (velas)</span>
                          <input
                            type="number" min="0" max="20" step="1"
                            value={localCooldown}
                            onChange={(e) => setLocalCooldown(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                        {/* Exposición máxima */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exposición máx. (%)</span>
                          <input
                            type="number" min="5" max="100" step="5"
                            value={localMaxExposure}
                            onChange={(e) => setLocalMaxExposure(Number(e.target.value))}
                            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px', color: 'white', fontWeight: 600 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action buttons inside form */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                      <button
                        onClick={() => setEditingBotId(null)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => saveParams(bot.id)}
                        style={{ background: 'var(--accent-primary)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.8rem', fontWeight: 600, padding: '6px 14px', cursor: 'pointer' }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Resumen de configuración del bot */
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.02)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} color="var(--text-muted)" />
                        <span>Trade Size: <b style={{ color: 'var(--text-main)' }}>${bot.tradeSizeUsd}</b></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={14} color="var(--text-muted)" />
                        {bot.strategyType === 'rsi' && (
                          <span>RSI: <b style={{ color: 'var(--text-main)' }}>{bot.params.rsiOversold} / {bot.params.rsiOverbought}</b></span>
                        )}
                        {bot.strategyType === 'macd' && (
                          <span>MACD: <b style={{ color: 'var(--text-main)' }}>12, 26, 9</b></span>
                        )}
                        {bot.strategyType === 'ma_crossover' && (
                          <span>MA: <b style={{ color: 'var(--text-main)' }}>{bot.params.maFast} / {bot.params.maSlow}</b></span>
                        )}
                        {bot.strategyType === 'fundamental' && (
                          <span>Noticias &gt; <b style={{ color: 'var(--text-main)' }}>{(bot.params.minSentimentScore * 100).toFixed(0)}%</b></span>
                        )}
                        {bot.strategyType === 'consensus' && (
                          <span>Consenso: <b style={{ color: 'var(--text-main)' }}>{bot.params.consensusThreshold} de {bot.params.activeStrategies?.length || 0} ({Math.round(((bot.params.consensusThreshold || 0) / (bot.params.activeStrategies?.length || 1)) * 100)}%)</b></span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={14} color="var(--color-warning)" />
                        <span>Riesgo: <b style={{ color: 'var(--color-warning)' }}>{(bot.params.riskPercent ?? 1.5).toFixed(1)}%</b> · SL {bot.params.atrStopMultiplier ?? 2}×ATR · R/R {bot.params.riskRewardRatio ?? 2}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => startEditing(bot)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sliders size={12} />
                      Calibrar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Side: Retro Hacker Live Terminal Logs */}
        <div className="glass-card" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
          
          <div className="console-header" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TerminalIcon size={18} color="var(--color-buy)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>CEREBRO QUANT: Terminal de Decisiones</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="live-dot" style={{ marginRight: '6px' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-buy)', fontWeight: 600, letterSpacing: '0.05em', marginRight: '16px' }}>LIVE ANALYTICS</span>
            </div>
          </div>

          <div style={{
            background: '#04060a',
            flex: 1,
            padding: '20px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.8rem',
            overflowY: 'auto',
            maxHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRadius: '0 0 16px 16px',
            borderTop: '1px solid rgba(255,255,255,0.03)'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.2)', padding: '20px', textAlign: 'center' }}>
                &gt; Esperando ticks del mercado para iniciar el análisis cuantitativo...
              </div>
            ) : (
              logs.map((log) => {
                let color = 'rgba(255,255,255,0.6)';
                if (log.type === 'buy') color = 'var(--color-buy)';
                if (log.type === 'sell') color = 'var(--color-sell)';
                if (log.type === 'warning') color = 'var(--color-warning)';
                if (log.type === 'market') color = 'var(--accent-secondary)';

                return (
                  <div key={log.id} className="log-entry" style={{ color, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>[{log.timestamp}]</span>
                    <span>
                      {log.type === 'buy' && '🚀 COMPRA: '}
                      {log.type === 'sell' && '💥 VENTA: '}
                      {log.type === 'warning' && '⚠️ AVISO: '}
                      {log.type === 'market' && '📰 NOTICIA: '}
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Posiciones Abiertas por los Bots (con Stop-Loss / Take-Profit en vivo) */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.03)', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={20} color="var(--accent-secondary)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Posiciones Abiertas de los Bots
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Cada posición se cierra automáticamente al tocar su stop-loss (🛑) o take-profit (🎯).
            </p>
          </div>
        </div>

        {botPositions.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '10px' }}>
            No hay posiciones abiertas. Los bots activos abrirán posiciones cuando se confirme una señal al cierre de vela.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {botPositions.map((pos) => {
              const asset = assets.find(a => a.symbol === pos.assetSymbol);
              const livePrice = asset?.price ?? pos.entryPrice;
              const pnl = (livePrice - pos.entryPrice) * pos.amount;
              const pnlPct = ((livePrice - pos.entryPrice) / pos.entryPrice) * 100;
              const isProfit = pnl >= 0;

              // Progreso del precio entre SL y TP (0% = en el stop, 100% = en el objetivo)
              const range = pos.takeProfit - pos.stopLoss;
              const rawProgress = range > 0 ? ((livePrice - pos.stopLoss) / range) * 100 : 50;
              const progress = Math.max(0, Math.min(100, rawProgress));

              return (
                <div key={pos.id} style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: `1px solid ${isProfit ? 'rgba(0,255,170,0.15)' : 'rgba(255,70,104,0.15)'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{pos.assetSymbol}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pos.botName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ${pos.entryUsd.toLocaleString()} @ ${pos.entryPrice.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isProfit ? 'var(--color-buy)' : 'var(--color-sell)' }}>
                      {isProfit ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {isProfit ? '+' : ''}${pnl.toFixed(2)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                      </span>
                    </div>
                  </div>

                  {/* Barra SL → precio → TP */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ position: 'relative', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${progress}%`,
                        background: isProfit ? 'var(--color-buy)' : 'var(--color-sell)',
                        borderRadius: '3px', transition: 'width 0.3s'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: 'var(--color-sell)' }}>🛑 SL ${pos.stopLoss.toLocaleString()}</span>
                      <span style={{ color: 'var(--text-muted)' }}>Ahora ${livePrice.toLocaleString()}</span>
                      <span style={{ color: 'var(--color-buy)' }}>🎯 TP ${pos.takeProfit.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Apartado de Acciones Activas para los Bots */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid rgba(255,255,255,0.03)', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={20} color="var(--accent-secondary)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Acciones Activas para los Bots
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              Permite o bloquea individualmente la operación autónoma de los bots sobre cada activo financiero.
            </p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '6px'
        }}>
          {assets.map((asset) => {
            const isAllowed = asset.allowedForBots !== false;
            return (
              <div
                key={asset.symbol}
                style={{
                  background: isAllowed ? 'rgba(0, 240, 255, 0.03)' : 'rgba(0, 0, 0, 0.2)',
                  border: isAllowed ? '1px solid rgba(0, 240, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {asset.symbol}
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isAllowed ? 'var(--color-buy)' : 'var(--text-muted)',
                      boxShadow: isAllowed ? '0 0 8px var(--color-buy)' : 'none',
                      display: 'inline-block'
                    }} />
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {asset.type === 'crypto' ? 'Cripto' : 'Acción'}
                  </span>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  onClick={() => toggleAssetBotOperation(asset.symbol)}
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '20px',
                    borderRadius: '10px',
                    background: isAllowed ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    padding: 0,
                    outline: 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: isAllowed ? '18px' : '2px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    transition: 'left 0.2s'
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
