import React, { useMemo, useState } from 'react';
import { useTrading } from '../context/TradingContext';
import { MarketChart } from './MarketChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  DollarSign, 
  Zap, 
  ShoppingBag,
  Newspaper,
  Bot
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { 
    assets, 
    activeAssetId, 
    setActiveAssetId, 
    balance, 
    holdings, 
    realNews,
    isLoadingRealNews,
    triggerManualOrder,
    bots,
    isLoading,
    isApiLive,
    timeframe,
    changeTimeframe
  } = useTrading();

  const [tradeAmount, setTradeAmount] = useState<number>(1000);

  // Encontrar el activo activo
  const activeAsset = useMemo(() => {
    return assets.find(a => a.id === activeAssetId) || assets[0];
  }, [assets, activeAssetId]);

  // Calcular valor total de portafolio y PnL
  const { totalValue, netPnl, pnlPercent } = useMemo(() => {
    const valueOfHoldings = assets.reduce((sum, asset) => {
      const qty = holdings[asset.symbol] || 0;
      return sum + qty * asset.price;
    }, 0);
    
    const total = Number((balance + valueOfHoldings).toFixed(2));
    const startingCapital = 50000;
    const net = total - startingCapital;
    const pct = (net / startingCapital) * 100;

    return {
      totalValue: total,
      holdingsValue: valueOfHoldings,
      netPnl: net,
      pnlPercent: pct
    };
  }, [assets, balance, holdings]);

  // Contar bots activos
  const activeBotsCount = useMemo(() => {
    return bots.filter(b => b.isActive).length;
  }, [bots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Welcome Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Panel de <span className="text-gradient-purple">Control</span>
            </h1>
            
            {/* Live API Status Badge */}
            {isLoading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: '#f59e0b',
                fontWeight: 600,
              }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#f59e0b', 
                  display: 'inline-block',
                  boxShadow: '0 0 8px #f59e0b'
                }}></span>
                Sincronizando Binance...
              </div>
            ) : isApiLive ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0, 255, 170, 0.1)',
                border: '1px solid rgba(0, 255, 170, 0.2)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: 'var(--color-buy)',
                fontWeight: 600,
                boxShadow: '0 0 10px rgba(0, 255, 170, 0.15)'
              }}>
                <span className="live-dot" style={{ display: 'inline-block' }}></span>
                Binance En Vivo
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 70, 104, 0.1)',
                border: '1px solid rgba(255, 70, 104, 0.2)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                color: 'var(--color-sell)',
                fontWeight: 600,
              }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: 'var(--color-sell)', 
                  display: 'inline-block',
                  boxShadow: '0 0 6px var(--color-sell)'
                }}></span>
                Modo Simulado (Offline)
              </div>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            Monitorea el rendimiento de tus algoritmos de inversión en tiempo real.
          </p>
        </div>
        
        {/* Right Action Area in Header */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              {(['1m', '1h', '4h', '1D'] as const).map((tf) => (
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

          {/* Active Bots Status Pill */}
          <div style={{
            background: 'rgba(95, 93, 236, 0.1)',
            border: '1px solid rgba(95, 93, 236, 0.2)',
            borderRadius: '12px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Bot size={18} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              Bots Activos: <b style={{ color: 'var(--accent-secondary)' }}>{activeBotsCount} / {bots.length}</b>
            </span>
          </div>
        </div>
      </div>

      {/* Portfolio Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px'
      }}>
        
        {/* Card 1: Total Value */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(95,93,236,0.15) 0%, rgba(0,240,255,0.05) 100%)',
            border: '1px solid rgba(95, 93, 236, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Wallet size={24} color="var(--accent-primary)" />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Valor del Portafolio</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center' }}>
              <DollarSign size={20} color="var(--accent-secondary)" />
              {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Card 2: USD Balance */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0,255,170,0.1) 0%, rgba(0,240,255,0.05) 100%)',
            border: '1px solid rgba(0, 255, 170, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={24} color="var(--color-buy)" />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Efectivo (USD)</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '2px' }}>
              ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Card 3: PnL Net */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: netPnl >= 0 
              ? 'linear-gradient(135deg, rgba(0,255,170,0.1) 0%, rgba(0,255,170,0.02) 100%)' 
              : 'linear-gradient(135deg, rgba(255,70,104,0.1) 0%, rgba(255,70,104,0.02) 100%)',
            border: netPnl >= 0 ? '1px solid rgba(0, 255, 170, 0.2)' : '1px solid rgba(255, 70, 104, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {netPnl >= 0 ? <TrendingUp size={24} color="var(--color-buy)" /> : <TrendingDown size={24} color="var(--color-sell)" />}
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Rendimiento Neto PnL</span>
            <h3 style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              marginTop: '2px', 
              color: netPnl >= 0 ? 'var(--color-buy)' : 'var(--color-sell)',
              display: 'flex',
              alignItems: 'center'
            }}>
              {netPnl >= 0 ? '+' : ''}{netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              <span style={{ fontSize: '0.9rem', fontWeight: 700, marginLeft: '8px' }}>
                ({netPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
              </span>
            </h3>
          </div>
        </div>

      </div>

      {/* Main Grid: Chart + Order Pad + Asset List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px'
      }}>
        
        {/* Col 1: Chart & News */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main Chart */}
          <MarketChart />

          {/* News Stream widget */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Newspaper size={18} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Noticias en Vivo ({activeAsset ? activeAsset.symbol : ''})</h3>
              </div>
              {isLoadingRealNews && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="live-dot" style={{ background: 'var(--accent-secondary)' }} /> Sincronizando Feed...
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {isLoadingRealNews && realNews.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Buscando noticias reales actuales...
                </div>
              ) : realNews.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No se encontraron noticias reales recientes para este activo.
                </div>
              ) : (
                realNews.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => item.link && window.open(item.link, '_blank')}
                    style={{
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      cursor: item.link ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (item.link) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.link) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={item.impact === 'positive' ? 'badge-buy' : item.impact === 'negative' ? 'badge-sell' : 'badge-neutral'} style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {item.assetSymbol} | {item.impact.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.timestamp}</span>
                    </div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{item.headline}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{item.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Col 2: Assets List & Order Pad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Asset List Selector */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Activos de Alta Frecuencia</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assets.map((item) => {
                const isSelected = item.id === activeAssetId;
                const isItemUp = item.changePercent >= 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveAssetId(item.id)}
                    style={{
                      background: isSelected ? 'rgba(95, 93, 236, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.symbol}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                        ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        color: isItemUp ? 'var(--color-buy)' : 'var(--color-sell)' 
                      }}>
                        {isItemUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Manual Trade Pad */}
          {activeAsset && (
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Simular Orden Manual</h3>
              </div>
              
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Activo Seleccionado</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {activeAsset.name} ({activeAsset.symbol})
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-secondary)' }}>
                    ${activeAsset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Trade Size Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monto a Invertir (USD)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>$</span>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(Math.max(1, Number(e.target.value)))}
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
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  {[500, 1000, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTradeAmount(amt)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        padding: '4px 0',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buy & Sell Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button
                  onClick={() => triggerManualOrder(activeAsset.symbol, 'BUY', tradeAmount)}
                  style={{
                    flex: 1,
                    background: 'var(--color-buy)',
                    color: '#070a13',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 0',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 0 15px rgba(0, 255, 170, 0.2)'
                  }}
                >
                  <ShoppingBag size={16} />
                  COMPRAR
                </button>
                
                <button
                  onClick={() => triggerManualOrder(activeAsset.symbol, 'SELL', tradeAmount)}
                  style={{
                    flex: 1,
                    background: 'var(--color-sell)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 0',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 0 15px rgba(255, 70, 104, 0.2)'
                  }}
                >
                  VENDER
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
