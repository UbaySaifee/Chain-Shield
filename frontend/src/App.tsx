import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import type { PageRoute } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { InvestigationPage } from './pages/InvestigationPage';
import { WalletAnalyzerPage } from './pages/WalletAnalyzerPage';
import { ContractAnalyzerPage } from './pages/ContractAnalyzerPage';
import { TransactionAnalyzerPage } from './pages/TransactionAnalyzerPage';
import { SimulationPage } from './pages/SimulationPage';
import { TransactionGraphPage } from './pages/TransactionGraphPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageRoute>('dashboard');
  const [navParams, setNavParams] = useState<Record<string, any>>({});

  const navigateTo = (page: PageRoute, params?: Record<string, any>) => {
    setCurrentPage(page);
    setNavParams(params || {});
  };

  const pageTitles: Record<PageRoute, string> = {
    'dashboard': 'Security Command Dashboard',
    'investigation': 'Unified Address Investigation',
    'wallet-analyzer': 'Wallet Risk & Counterparty Analyzer',
    'contract-analyzer': 'Smart Contract Bytecode Analyzer',
    'transaction-analyzer': 'Transaction Calldata Analyzer',
    'simulation': 'Pre-Execution Safe Transaction Simulator',
    'transaction-graph': 'Forensic Transaction Relationship Graph',
    'reports': 'Audit Trail & Assessment History',
    'settings': 'System Settings & Network Nodes',
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} />;
      case 'investigation':
        return (
          <InvestigationPage
            initialAddress={navParams?.address}
            onNavigate={navigateTo}
          />
        );
      case 'wallet-analyzer':
        return (
          <WalletAnalyzerPage
            initialAddress={navParams?.address}
            onNavigate={navigateTo}
          />
        );
      case 'contract-analyzer':
        return (
          <ContractAnalyzerPage
            initialAddress={navParams?.address || navParams?.contractAddress}
            onNavigate={navigateTo}
          />
        );
      case 'transaction-analyzer':
        return (
          <TransactionAnalyzerPage
            initialTo={navParams?.to}
            initialFrom={navParams?.from}
            onNavigate={navigateTo}
          />
        );
      case 'simulation':
        return <SimulationPage />;
      case 'transaction-graph':
        return (
          <TransactionGraphPage
            initialCenterAddress={navParams?.centerAddress || navParams?.address}
            onNavigate={navigateTo}
          />
        );
      case 'reports':
        return (
          <ReportsPage
            onNavigate={navigateTo}
            initialTab={navParams?.initialTab}
          />
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-shield-950 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onNavigate={navigateTo} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activePageTitle={pageTitles[currentPage]} onNavigate={navigateTo} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
