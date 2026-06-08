import React, { useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import {
  calculateMultiTimeframeTrend,
  determineMarketState,
  determineMarketPhase,
  calculateLiquidityZones,
  calculateMomentumSensitivity,
  calculatePressure,
  calculatePriceTarget,
} from '../utils/indicators';

export const CTVisionPanel: React.FC = () => {
  const { assets, activeAssetId } = useTrading();

  const activeAsset = useMemo(() => {
    return assets.find(a => a.id === activeAssetId) || assets[0];
  }, [assets, activeAssetId]);

  const analysis = useMemo(() => {
    if (!activeAsset || !activeAsset.priceHistory || activeAsset.priceHistory.length < 3) {
      return null;
    }
    const prices = activeAsset.priceHistory;
    const trends = calculateMultiTimeframeTrend(prices);
    const marketState = determineMarketState(prices, activeAsset.tvRsi, activeAsset.tvSma20);
    const marketPhase = determineMarketPhase(prices, activeAsset.tvSma50);
    const liquidity = calculateLiquidityZones(prices);
    const momentum = calculateMomentumSensitivity(prices, activeAsset.tvRsi, activeAsset.tvMacdHist);
    const pressure = calculatePressure(prices);
    const priceTarget = calculatePriceTarget(prices);

    return { trends, marketState, marketPhase, liquidity, momentum, pressure, priceTarget };
  }, [activeAsset]);

  if (!activeAsset || !analysis) {
    return null;
  }

  // ─── Estilos base ────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    background: 'linear-gradient(180deg, rgba(8, 10, 18, 0.95) 0%, rgba(12, 16, 28, 0.98) 100%)',
    border: '1px solid rgba(95, 93, 236, 0.25)',
    borderRadius: '16px',
    padding: '0',
    overflow: 'hidden',
    boxShadow: '0 0 20px rgba(95, 93, 236, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
    fontFamily: "'JetBrains Mono', 'Outfit', monospace",
  };

  const headerStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, rgba(95, 93, 236, 0.12) 0%, rgba(0, 240, 255, 0.06) 100%)',
    borderBottom: '1px solid rgba(95, 93, 236, 0.2)',
    padding: '14px 18px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const sectionDivider = (label: string): React.ReactNode => (
    <div style={{
      padding: '6px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: 0.5,
    }}>
      <span style={{
        flex: 1,
        height: '1px',
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)',
      }} />
      <span style={{
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: 'rgba(255,255,255,0.5)',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        flex: 1,
        height: '1px',
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 8px)',
      }} />
    </div>
  );

  const bodyPadding: React.CSSProperties = { padding: '0 16px' };

  // ─── Colors helpers ──────────────────────────────────────────
  const trendColor = (dir: 'up' | 'down' | 'neutral') =>
    dir === 'up' ? 'var(--color-buy)' : dir === 'down' ? 'var(--color-sell)' : 'var(--text-muted)';

  const trendIcon = (dir: 'up' | 'down' | 'neutral') =>
    dir === 'up' ? '▲' : dir === 'down' ? '▼' : '●';

  const trendBg = (dir: 'up' | 'down' | 'neutral') =>
    dir === 'up'
      ? 'rgba(0, 255, 170, 0.12)'
      : dir === 'down'
      ? 'rgba(255, 70, 104, 0.12)'
      : 'rgba(148, 163, 184, 0.1)';

  const stateColor = (state: string) =>
    state === 'ALCISTA' ? 'var(--color-buy)' : state === 'BAJISTA' ? 'var(--color-sell)' : 'var(--color-warning)';

  const stateBg = (state: string) =>
    state === 'ALCISTA'
      ? 'rgba(0, 255, 170, 0.1)'
      : state === 'BAJISTA'
      ? 'rgba(255, 70, 104, 0.1)'
      : 'rgba(245, 158, 11, 0.1)';

  // Phase color
  const phaseColor = (phase: string) => {
    if (phase === 'ACUMULACIÓN') return '#00f0ff';
    if (phase === 'DISTRIBUCIÓN') return '#f59e0b';
    if (phase === 'MARKUP') return 'var(--color-buy)';
    if (phase === 'MARKDOWN') return 'var(--color-sell)';
    return 'var(--text-muted)';
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  return (
    <div className="ct-vision-panel" style={panelStyle}>

      {/* ═══════════ HEADER ═══════════ */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            boxShadow: '0 0 12px rgba(95, 93, 236, 0.5)',
          }}>
            ⚡
          </div>
          <div>
            <span style={{
              fontSize: '1rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--text-main)',
              textShadow: '0 0 10px rgba(95, 93, 236, 0.4)',
            }}>
              BABY VISION PRO
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ TENDENCIA ═══════════ */}
      {sectionDivider('TENDENCIA')}
      <div style={{ ...bodyPadding, display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '10px' }}>
        {analysis.trends.map((t) => (
          <div
            key={t.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '8px',
              background: trendBg(t.direction),
              border: `1px solid ${t.direction === 'up' ? 'rgba(0,255,170,0.15)' : t.direction === 'down' ? 'rgba(255,70,104,0.15)' : 'rgba(148,163,184,0.1)'}`,
            }}
          >
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-main)',
            }}>
              {t.label}:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '5px',
                background: trendBg(t.direction),
                color: trendColor(t.direction),
                fontSize: '0.7rem',
                fontWeight: 800,
                border: `1px solid ${trendColor(t.direction)}33`,
              }}>
                {trendIcon(t.direction)}
              </span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: trendColor(t.direction),
                minWidth: '70px',
                textAlign: 'right',
              }}>
                {t.changePercent > 0 ? '+' : ''}{t.changePercent}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════ ESTADO DEL MERCADO ═══════════ */}
      {sectionDivider('ESTADO DEL MERCADO')}
      <div style={{ ...bodyPadding, paddingBottom: '10px', display: 'flex', justifyContent: 'center' }}>
        <div
          className={analysis.marketState === 'ALCISTA' ? 'ct-state-pulse-buy' : analysis.marketState === 'BAJISTA' ? 'ct-state-pulse-sell' : ''}
          style={{
            background: stateBg(analysis.marketState),
            border: `1px solid ${stateColor(analysis.marketState)}44`,
            borderRadius: '10px',
            padding: '8px 28px',
            textAlign: 'center',
            boxShadow: `0 0 14px ${stateColor(analysis.marketState)}15`,
          }}
        >
          <span style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: stateColor(analysis.marketState),
            textShadow: `0 0 8px ${stateColor(analysis.marketState)}55`,
          }}>
            {analysis.marketState}
          </span>
        </div>
      </div>

      {/* ═══════════ FASE DEL MERCADO (WYCKOFF) ═══════════ */}
      {sectionDivider('FASE DEL MERCADO')}
      <div style={{ ...bodyPadding, paddingBottom: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: `${phaseColor(analysis.marketPhase.phase)}11`,
          border: `1px solid ${phaseColor(analysis.marketPhase.phase)}33`,
          borderRadius: '10px',
          padding: '8px 20px',
        }}>
          <span className={analysis.marketPhase.phase === 'DISTRIBUCIÓN' ? 'ct-blink' : ''} style={{ fontSize: '1.1rem' }}>
            {analysis.marketPhase.emoji}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: phaseColor(analysis.marketPhase.phase),
            }}>
              {analysis.marketPhase.phase === 'MARKUP' ? 'POTENCIAL MARKUP' :
               analysis.marketPhase.phase === 'MARKDOWN' ? 'POTENCIAL MARKDOWN' :
               analysis.marketPhase.phase === 'DISTRIBUCIÓN' ? 'POTENCIAL DISTRIBUCIÓN' :
               analysis.marketPhase.phase === 'ACUMULACIÓN' ? 'POTENCIAL ACUMULACIÓN' :
               'RANGING'}
            </span>
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}>
              Confianza: {analysis.marketPhase.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ BALANCE DE LIQUIDEZ ═══════════ */}
      {sectionDivider('BALANCE DE LIQUIDEZ')}
      <div style={{ ...bodyPadding, paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Mayor Liquidez */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.95rem',
            ...(analysis.liquidity.majorLiquidity === 'ARRIBA'
              ? { color: 'var(--color-buy)' }
              : analysis.liquidity.majorLiquidity === 'ABAJO'
              ? { color: 'var(--color-sell)' }
              : { color: 'var(--text-muted)' }),
          }}>
            {analysis.liquidity.majorLiquidity === 'ARRIBA' ? '⬆️' :
             analysis.liquidity.majorLiquidity === 'ABAJO' ? '⬇️' : '⚖️'}
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Mayor Liquidez:
          </span>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: analysis.liquidity.majorLiquidity === 'ARRIBA' ? 'var(--color-buy)' :
                   analysis.liquidity.majorLiquidity === 'ABAJO' ? 'var(--color-sell)' : 'var(--accent-secondary)',
          }}>
            {analysis.liquidity.majorLiquidity}
          </span>
        </div>

        {/* Zonas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
        }}>
          <div style={{
            background: 'rgba(0, 255, 170, 0.06)',
            border: '1px solid rgba(0, 255, 170, 0.12)',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
              Zona [Arriba]
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-buy)' }}>
              ${formatPrice(analysis.liquidity.zoneAbove)}
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 70, 104, 0.06)',
            border: '1px solid rgba(255, 70, 104, 0.12)',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
              Zona [Abajo]
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-sell)' }}>
              ${formatPrice(analysis.liquidity.zoneBelow)}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ DETECTOR DE MOMENTUM ═══════════ */}
      {sectionDivider('DETECTOR DE MOMENTUM')}
      <div style={{ ...bodyPadding, paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            ⚙️ Sensibilidad:
          </span>
          <span style={{
            fontSize: '0.9rem',
            fontWeight: 800,
            color: analysis.momentum > 70 ? 'var(--color-buy)' :
                   analysis.momentum > 40 ? 'var(--accent-secondary)' : 'var(--color-sell)',
          }}>
            {analysis.momentum}%
          </span>
        </div>
        {/* Gauge bar */}
        <div style={{
          width: '100%',
          height: '8px',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            width: `${analysis.momentum}%`,
            height: '100%',
            borderRadius: '4px',
            background: analysis.momentum > 70
              ? 'linear-gradient(90deg, var(--color-buy), #00f0ff)'
              : analysis.momentum > 40
              ? 'linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))'
              : 'linear-gradient(90deg, var(--color-sell), #f59e0b)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: analysis.momentum > 70
              ? '0 0 8px rgba(0, 255, 170, 0.4)'
              : analysis.momentum > 40
              ? '0 0 8px rgba(0, 240, 255, 0.3)'
              : '0 0 8px rgba(255, 70, 104, 0.3)',
          }} />
        </div>
      </div>

      {/* ═══════════ PRESIÓN ═══════════ */}
      {sectionDivider('PRESIÓN')}
      <div style={{ ...bodyPadding, paddingBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-buy)' }}>
            🟢 {analysis.pressure.buyPressure}%
          </span>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: analysis.pressure.dominance === 'COMPRADORES' ? 'var(--color-buy)' :
                   analysis.pressure.dominance === 'VENDEDORES' ? 'var(--color-sell)' : 'var(--text-muted)',
          }}>
            {analysis.pressure.dominance}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sell)' }}>
            {analysis.pressure.sellPressure}% 🔴
          </span>
        </div>
        {/* Pressure bar */}
        <div style={{
          width: '100%',
          height: '10px',
          borderRadius: '5px',
          background: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
          display: 'flex',
          position: 'relative',
        }}>
          <div style={{
            width: `${analysis.pressure.buyPressure}%`,
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,255,170,0.3) 0%, var(--color-buy) 100%)',
            transition: 'width 0.6s ease',
            borderRadius: '5px 0 0 5px',
            boxShadow: '0 0 6px rgba(0,255,170,0.3)',
          }} />
          <div style={{
            width: `${analysis.pressure.sellPressure}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-sell) 0%, rgba(255,70,104,0.3) 100%)',
            transition: 'width 0.6s ease',
            borderRadius: '0 5px 5px 0',
            boxShadow: '0 0 6px rgba(255,70,104,0.3)',
          }} />
        </div>
      </div>

      {/* ═══════════ POSIBLE OBJETIVO ═══════════ */}
      {sectionDivider('POSIBLE OBJETIVO')}
      <div style={{ ...bodyPadding, paddingBottom: '16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: analysis.priceTarget.direction === 'up'
            ? 'rgba(0, 255, 170, 0.07)'
            : 'rgba(255, 70, 104, 0.07)',
          border: `1px solid ${analysis.priceTarget.direction === 'up'
            ? 'rgba(0, 255, 170, 0.18)'
            : 'rgba(255, 70, 104, 0.18)'}`,
          borderRadius: '10px',
          padding: '10px 20px',
        }}>
          <span style={{
            fontSize: '1.3rem',
          }}>
            {analysis.priceTarget.direction === 'up' ? '🎯' : '🎯'}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: analysis.priceTarget.direction === 'up' ? 'var(--color-buy)' : 'var(--color-sell)',
            }}>
              ${formatPrice(analysis.priceTarget.target)}
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: analysis.priceTarget.direction === 'up' ? 'var(--color-buy)' : 'var(--color-sell)',
              opacity: 0.8,
            }}>
              {analysis.priceTarget.direction === 'up' ? '↑' : '↓'} {analysis.priceTarget.distancePercent > 0 ? '+' : ''}{analysis.priceTarget.distancePercent}%
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
