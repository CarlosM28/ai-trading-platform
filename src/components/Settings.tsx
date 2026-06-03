import React, { useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { 
  Sliders, 
  RefreshCw, 
  Key, 
  CheckCircle2
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { 
    simSpeed, 
    setSimSpeed, 
    resetPortfolio, 
    apiConfig, 
    setApiConfig 
  } = useTrading();

  // Estados locales para la edición
  const [initialBalanceInput, setInitialBalanceInput] = useState<number>(5000);
  
  // Estados locales para Binance Testnet
  const [binanceKey, setBinanceKey] = useState<string>(apiConfig.binanceApiKey || '');
  const [binanceSecret, setBinanceSecret] = useState<string>(apiConfig.binanceApiSecret || '');

  // Estados locales para Alpaca Paper Trading
  const [alpacaKey, setAlpacaKey] = useState<string>(apiConfig.alpacaApiKey || '');
  const [alpacaSecret, setAlpacaSecret] = useState<string>(apiConfig.alpacaApiSecret || '');

  const handleReset = () => {
    if (window.confirm(`¿Estás seguro de restablecer el portafolio? Esto eliminará todas las tenencias actuales y fijará el saldo en $${initialBalanceInput.toLocaleString()} USD.`)) {
      resetPortfolio(initialBalanceInput);
    }
  };

  const handleConnectBinance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!binanceKey || !binanceSecret) {
      alert('Por favor ingresa tanto la API Key como el API Secret de Binance Testnet.');
      return;
    }

    setApiConfig(prev => {
      const isConnected = true;
      return {
        ...prev,
        binanceApiKey: binanceKey,
        binanceApiSecret: binanceSecret,
        binanceConnected: true,
        isConnected,
        // Compatibilidad legacy
        apiKey: binanceKey,
        apiSecret: binanceSecret,
        exchange: 'binance_sandbox'
      };
    });
  };

  const handleDisconnectBinance = () => {
    setApiConfig(prev => {
      const nextConnected = prev.alpacaConnected;
      return {
        ...prev,
        binanceApiKey: '',
        binanceApiSecret: '',
        binanceConnected: false,
        isConnected: nextConnected,
        apiKey: nextConnected ? prev.alpacaApiKey : '',
        apiSecret: nextConnected ? prev.alpacaApiSecret : '',
        exchange: nextConnected ? 'alpaca_paper' : 'binance_sandbox'
      };
    });
    setBinanceKey('');
    setBinanceSecret('');
  };

  const handleConnectAlpaca = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alpacaKey || !alpacaSecret) {
      alert('Por favor ingresa tanto la API Key como el API Secret de Alpaca Paper Trading.');
      return;
    }

    setApiConfig(prev => {
      const isConnected = true;
      return {
        ...prev,
        alpacaApiKey: alpacaKey,
        alpacaApiSecret: alpacaSecret,
        alpacaConnected: true,
        isConnected,
        // Compatibilidad legacy
        apiKey: alpacaKey,
        apiSecret: alpacaSecret,
        exchange: 'alpaca_paper'
      };
    });
  };

  const handleDisconnectAlpaca = () => {
    setApiConfig(prev => {
      const nextConnected = prev.binanceConnected;
      return {
        ...prev,
        alpacaApiKey: '',
        alpacaApiSecret: '',
        alpacaConnected: false,
        isConnected: nextConnected,
        apiKey: nextConnected ? prev.binanceApiKey : '',
        apiSecret: nextConnected ? prev.binanceApiSecret : '',
        exchange: nextConnected ? 'binance_sandbox' : 'alpaca_paper'
      };
    });
    setAlpacaKey('');
    setAlpacaSecret('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Configuración del <span className="text-gradient-purple">Sistema</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Ajusta las variables operativas del simulador de alta frecuencia y configura las llaves de exchanges externos.
        </p>
      </div>

      {/* Grid: 2 columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Col 1: Simulation & Portfolio Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Simulation Speed */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Sliders size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Frecuencia del Motor</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Controla la velocidad en la que avanza el reloj de mercado. Velocidades más rápidas generan ticks y señales de trading de bots más recurrentes.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Ultra Rápida (1s)', value: 1000 },
                { label: 'Frecuencia Alta (2s)', value: 2000 },
                { label: 'Frecuencia Media (3s)', value: 3000 },
                { label: 'Tiempo Lento (5s)', value: 5000 },
              ].map((speed) => {
                const isActive = simSpeed === speed.value;
                return (
                  <button
                    key={speed.value}
                    onClick={() => setSimSpeed(speed.value)}
                    style={{
                      background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.02)',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: isActive ? 'white' : 'var(--text-muted)',
                      padding: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isActive ? '0 0 10px rgba(95, 93, 236, 0.2)' : 'none'
                    }}
                  >
                    {speed.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Wipe & Reset Portfolio */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <RefreshCw size={18} color="var(--color-sell)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Reiniciar Simulación</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Restablece tu saldo a cero, vende todas las posiciones abiertas activas y limpia el registro de transacciones para iniciar una nueva estrategia de trading limpia.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Saldo Inicial (USD)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>$</span>
                  <input
                    type="number"
                    value={initialBalanceInput}
                    onChange={(e) => setInitialBalanceInput(Math.max(100, Number(e.target.value)))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px 8px 24px',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handleReset}
                style={{
                  background: 'rgba(255, 70, 104, 0.1)',
                  color: 'var(--color-sell)',
                  border: '1px solid rgba(255, 70, 104, 0.3)',
                  borderRadius: '10px',
                  padding: '12px 0',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 10px rgba(255, 70, 104, 0.05)'
                }}
              >
                <RefreshCw size={16} />
                RESTAURAR PORTAFOLIO
              </button>
            </div>
          </div>

        </div>

        {/* Col 2: Real API Keys Setup */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Binance Testnet */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Key size={18} color="var(--accent-secondary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Binance Testnet (Criptomonedas)</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Conecta los bots a la cuenta de pruebas oficial de Binance (Spot Sandbox) para operar cryptos reales en demo.
            </p>

            {apiConfig.binanceConnected ? (
              <div style={{
                background: 'rgba(0, 255, 170, 0.04)',
                border: '1px solid rgba(0, 255, 170, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={20} color="var(--color-buy)" />
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Binance Conectado</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operando en Binance Testnet</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API Key:</span>
                  <span style={{ fontFamily: 'monospace' }}>{apiConfig.binanceApiKey ? apiConfig.binanceApiKey.substring(0, 8) + '...****' : ''}</span>
                </div>
                <button
                  onClick={handleDisconnectBinance}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 70, 104, 0.3)',
                    color: 'var(--color-sell)',
                    borderRadius: '8px',
                    padding: '8px 0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  DESCONECTAR BINANCE
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectBinance} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Binance Testnet API Key</label>
                  <input
                    type="text"
                    placeholder="ej. xh98a12bc90da8b..."
                    value={binanceKey}
                    onChange={(e) => setBinanceKey(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Binance Testnet Secret Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={binanceSecret}
                    onChange={(e) => setBinanceSecret(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(95, 93, 236, 0.15)'
                  }}
                >
                  CONECTAR BINANCE TESTNET
                </button>
              </form>
            )}
          </div>

          {/* Card 2: Alpaca Paper Trading */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Key size={18} color="var(--accent-secondary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Alpaca Paper Trading (Acciones)</h3>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
              Conecta los bots a la cuenta demo de Alpaca Markets para operar acciones de EE.UU. con datos reales.
            </p>

            {apiConfig.alpacaConnected ? (
              <div style={{
                background: 'rgba(0, 255, 170, 0.04)',
                border: '1px solid rgba(0, 255, 170, 0.15)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={20} color="var(--color-buy)" />
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>Alpaca Conectado</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operando en Alpaca Paper Trading</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API Key ID:</span>
                  <span style={{ fontFamily: 'monospace' }}>{apiConfig.alpacaApiKey ? apiConfig.alpacaApiKey.substring(0, 8) + '...****' : ''}</span>
                </div>
                <button
                  onClick={handleDisconnectAlpaca}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 70, 104, 0.3)',
                    color: 'var(--color-sell)',
                    borderRadius: '8px',
                    padding: '8px 0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  DESCONECTAR ALPACA
                </button>
              </div>
            ) : (
              <form onSubmit={handleConnectAlpaca} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alpaca API Key ID</label>
                  <input
                    type="text"
                    placeholder="ej. PK...XXXX"
                    value={alpacaKey}
                    onChange={(e) => setAlpacaKey(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alpaca Secret Key</label>
                  <input
                    type="password"
                    placeholder="••••••••••••••••••••••••"
                    value={alpacaSecret}
                    onChange={(e) => setAlpacaSecret(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 0',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(95, 93, 236, 0.15)'
                  }}
                >
                  CONECTAR ALPACA PAPER
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
