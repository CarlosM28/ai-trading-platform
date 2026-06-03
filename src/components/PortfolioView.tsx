import React, { useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { 
  Layers,
  History,
  TrendingUp
} from 'lucide-react';

export const PortfolioView: React.FC = () => {
  const { assets, balance, holdings, transactions } = useTrading();

  // Calcular valor de tenencias y valor total de cartera
  const { totalValue, holdingsValue, holdingsBreakdown } = useMemo(() => {
    let valueOfHoldings = 0;
    const breakdown = assets.map(asset => {
      const amount = holdings[asset.symbol] || 0;
      const value = amount * asset.price;
      valueOfHoldings += value;
      return {
        ...asset,
        amount,
        value
      };
    });

    const total = balance + valueOfHoldings;

    // Calcular porcentajes
    const breakdownWithPct = breakdown.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0
    })).filter(item => item.amount > 0); // Solo activos con tenencia activa

    return {
      totalValue: total,
      holdingsValue: valueOfHoldings,
      holdingsBreakdown: breakdownWithPct
    };
  }, [assets, balance, holdings]);

  // Calcular operaciones realizadas (ganancia/pérdida realizada)
  const realizedTrades = useMemo(() => {
    const positionCost: Record<string, { qty: number; totalCost: number }> = {};
    const trades: Array<{
      id: string;
      timestamp: string;
      assetSymbol: string;
      botName: string;
      amount: number;
      avgBuyPrice: number;
      sellPrice: number;
      totalCost: number;
      totalReturn: number;
      realizedPnl: number;
      pnlPercent: number;
    }> = [];

    // Las transacciones se procesan cronológicamente (al revés del orden del array)
    const chronologicalTx = [...transactions].reverse();

    chronologicalTx.forEach(tx => {
      const sym = tx.assetSymbol;
      if (!positionCost[sym]) {
        positionCost[sym] = { qty: 0, totalCost: 0 };
      }

      const pos = positionCost[sym];

      if (tx.type === 'BUY') {
        pos.qty += tx.amount;
        pos.totalCost += tx.totalUsd;
      } else {
        // SELL
        if (pos.qty > 0) {
          const avgBuy = pos.totalCost / pos.qty;
          const soldCost = tx.amount * avgBuy;
          const pnl = tx.totalUsd - soldCost;
          const pnlPct = avgBuy > 0 ? ((tx.price - avgBuy) / avgBuy) * 100 : 0;

          trades.push({
            id: tx.id,
            timestamp: tx.timestamp,
            assetSymbol: sym,
            botName: tx.botName,
            amount: tx.amount,
            avgBuyPrice: avgBuy,
            sellPrice: tx.price,
            totalCost: soldCost,
            totalReturn: tx.totalUsd,
            realizedPnl: pnl,
            pnlPercent: pnlPct
          });

          pos.qty = Math.max(0, pos.qty - tx.amount);
          pos.totalCost = Math.max(0, pos.totalCost - soldCost);
        }
      }
    });

    return trades.reverse(); // Mostrar la más reciente primero
  }, [transactions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Análisis de <span className="text-gradient-purple">Cartera y Órdenes</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
          Verifica la asignación de capital actual y audita las últimas transacciones en cadena.
        </p>
      </div>

      {/* Main Grid: Breakdown & History */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.5fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Col: Asset Allocation Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Allocation Overview Card */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Layers size={18} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Distribución de Activos</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Cash allocation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text-main)' }}>Efectivo (USD)</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({(totalValue > 0 ? (balance / totalValue) * 100 : 0).toFixed(1)}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${totalValue > 0 ? (balance / totalValue) * 100 : 0}%`,
                    height: '100%',
                    background: 'var(--accent-primary)',
                    boxShadow: '0 0 8px rgba(95, 93, 236, 0.4)'
                  }} />
                </div>
              </div>

              {holdingsBreakdown.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                  Sin posiciones abiertas en este momento. Los bots autónomos comenzarán a comprar cuando detecten señales.
                </div>
              ) : (
                holdingsBreakdown.map((item) => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-main)' }}>{item.name} ({item.symbol})</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {item.amount.toFixed(4)} {item.symbol} = ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.percentage}%`,
                        height: '100%',
                        background: item.type === 'crypto' ? 'var(--accent-secondary)' : 'var(--color-buy)',
                        boxShadow: item.type === 'crypto' 
                          ? '0 0 8px rgba(0, 240, 255, 0.4)' 
                          : '0 0 8px rgba(0, 255, 170, 0.4)'
                      }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Metrics Portfolio Summary Card */}
          <div className="glass-card" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(95,93,236,0.05) 0%, rgba(15,22,36,0.65) 100%)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-secondary)', marginBottom: '12px' }}>Datos de Capital</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Valor Total Cartera:</span>
                <b style={{ color: 'var(--text-main)' }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Saldo en Efectivo:</span>
                <b style={{ color: 'var(--text-main)' }}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Valor Activos en Tenencia:</span>
                <b style={{ color: 'var(--text-main)' }}>${holdingsValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Transaction History Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <History size={18} color="var(--accent-secondary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Historial de Transacciones de Bots</h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              textAlign: 'left'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Hora</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Bot Ejecutor</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Activo</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Precio Unitario</th>
                  <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Total (USD)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Ninguna transacción registrada todavía.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{tx.timestamp}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{tx.botName}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-secondary)', fontWeight: 600 }}>{tx.assetSymbol}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span 
                          className={tx.type === 'BUY' ? 'badge-buy' : 'badge-sell'} 
                          style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px' }}>${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 700, color: 'var(--text-main)' }}>
                        ${tx.totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Registro de Ganancias y Pérdidas Realizadas */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <TrendingUp size={18} color="var(--color-buy)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Registro de Ganancias y Pérdidas Realizadas</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
            textAlign: 'left'
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Hora</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Activo</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Bot Ejecutor</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Cant. Vendida</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Precio Compra Prom.</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Precio Venta</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Costo de Compra</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Valor de Venta</th>
                <th style={{ padding: '12px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Ganancia / Pérdida</th>
              </tr>
            </thead>
            <tbody>
              {realizedTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay ganancias o pérdidas realizadas todavía. Realiza ventas o espera que los bots cierren posiciones.
                  </td>
                </tr>
              ) : (
                realizedTrades.map((trade) => {
                  const isProfit = trade.realizedPnl >= 0;
                  return (
                    <tr 
                      key={trade.id} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{trade.timestamp}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--accent-secondary)', fontWeight: 600 }}>{trade.assetSymbol}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 600 }}>{trade.botName}</td>
                      <td style={{ padding: '12px 8px' }}>{trade.amount.toFixed(4)}</td>
                      <td style={{ padding: '12px 8px' }}>${trade.avgBuyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 8px' }}>${trade.sellPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>
                        ${trade.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>
                        ${trade.totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ 
                        padding: '12px 8px', 
                        fontWeight: 700, 
                        color: isProfit ? 'var(--color-buy)' : 'var(--color-sell)' 
                      }}>
                        {isProfit ? '+' : ''}${trade.realizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isProfit ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
