import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { BotsControl } from './components/BotsControl';
import { PortfolioView } from './components/PortfolioView';
import { Recommendations } from './components/Recommendations';
import { Settings } from './components/Settings';
import { HistoryAnalysis } from './components/HistoryAnalysis';
import { FutureTrends } from './components/FutureTrends';

const AppContent: React.FC = () => {
  const { activeTab } = useTrading();

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'bots' && <BotsControl />}
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'recommendations' && <Recommendations />}
        {activeTab === 'history_analysis' && <HistoryAnalysis />}
        {activeTab === 'future_trends' && <FutureTrends />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
