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
  const [initialBalanceInput, setInitialBalanceInput] = useState<number>(50000);
  const [apiKeyInput, setApiKeyInput] = useState<string>(apiConfig.apiKey);
  const [apiSecretInput, setApiSecretInput] = useState<string>(apiConfig.apiSecret);
  const [exchangeInput, setExchangeInput] = useState<string>(apiConfig.exchange);

  const handleReset = () => {
    if (window.confirm(`¿Estás seguro de restablecer el portafolio? Esto eliminará todas las tenencias actuales y fijará el saldo en $${initialBalanceInput.toLocaleString()} USD.`)) {
      resetPortfolio(initialBalanceInput);
    }
  };

  const handleConnectApi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput || !apiSecretInput) {
      alert('Por favor ingresa tanto la API Key como el API Secret para establecer la conexión simulada.');
      return;
    }

    setApiConfig({
      apiKey: apiKeyInput,
      apiSecret: apiSecretInput,
      exchange: exchangeInput,
      isConnected: true,
    });
  };

  const handleDisconnectApi = () => {
    setApiConfig({
      apiKey: '',
      apiSecret: '',
      exchange: 'binance_sandbox',
      isConnected: false,
    });
    setApiKeyInput('');
    setApiSecretInput('');
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

        {/* Col 2: Simulated Real API Keys Setup */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Key size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Conexión API (Exchange / Broker)</h3>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
            Enlaza el motor de bots de forma directa con tu broker favorito. Tus llaves locales se validan para simular la ejecución en tiempo real directamente sobre el libro de órdenes del exchange.
          </p>

          {apiConfig.isConnected ? (
            /* Conectado */
            <div style={{
              background: 'rgba(0, 255, 170, 0.04)',
              border: '1px solid rgba(0, 255, 170, 0.15)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={24} color="var(--color-buy)" />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Conexión Exitosa</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operando en el Sandbox de {apiConfig.exchange.toUpperCase()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>API Key:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{apiConfig.apiKey.substring(0, 8)}...****</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Servidor:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>PROD_SANDBOX_V2</span>
                </div>
              </div>

              <button
                onClick={handleDisconnectApi}
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
                DESCONECTAR API
              </button>
            </div>
          ) : (
            /* Desconectado / Formulario */
            <form onSubmit={handleConnectApi} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seleccionar Proveedor / Exchange</label>
                <select
                  value={exchangeInput}
                  onChange={(e) => setExchangeInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="binance_sandbox">Binance Sandbox (Crypto)</option>
                  <option value="alpaca_paper">Alpaca Paper Trading (Stocks)</option>
                  <option value="coinbase_sandbox">Coinbase Advanced Sandbox (Crypto)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>API Key</label>
                <input
                  type="text"
                  placeholder="ej. xh98a12bc90da8b..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontWeight: 500,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>API Secret (Firma HMAC)</label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••"
                  value={apiSecretInput}
                  onChange={(e) => setApiSecretInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontWeight: 500,
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
                  borderRadius: '10px',
                  padding: '12px 0',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 0 15px rgba(95, 93, 236, 0.2)',
                  marginTop: '4px'
                }}
              >
                CONECTAR SANDBOX
              </button>
            </form>
          )}

        </div>

      </div>

    </div>
  );
};
