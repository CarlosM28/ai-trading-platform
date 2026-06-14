import React from 'react';
import { useTrading } from '../context/TradingContext';
import { 
  LayoutDashboard, 
  Bot, 
  Wallet, 
  TrendingUp, 
  Settings as SettingsIcon,
  Activity,
  Clock,
  Sparkles,
  LineChart
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, simSpeed } = useTrading();

  const menuItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'bots', label: 'Bots y Consola', icon: Bot },
    { id: 'portfolio', label: 'Cartera e Historial', icon: Wallet },
    { id: 'recommendations', label: 'Alertas y Recomendaciones', icon: TrendingUp },
    { id: 'backtesting', label: 'Backtesting', icon: LineChart },
    { id: 'history_analysis', label: 'Análisis 8 Años', icon: Clock },
    { id: 'future_trends', label: 'Proyecciones de Futuro', icon: Sparkles },
    { id: 'settings', label: 'Configuración', icon: SettingsIcon },
  ];

  return (
    <aside style={{
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      padding: '24px 16px',
      zIndex: 10
    }}>
      {/* Header Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '40px',
        padding: '0 8px'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(95, 93, 236, 0.4)'
        }}>
          <Activity size={20} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            BABY
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', fontWeight: 600, letterSpacing: '0.1em' }}>
            BOT
          </span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: isActive ? 'rgba(95, 93, 236, 0.08)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Simulator Footer Badge */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.04)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="live-dot" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Motor de Simulación
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Tick: <b style={{ color: 'var(--accent-secondary)' }}>{(simSpeed / 1000).toFixed(1)}s</b> | 1 FPS
        </span>
      </div>
    </aside>
  );
};
