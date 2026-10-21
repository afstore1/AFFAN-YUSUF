import React, { useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { PosView } from './components/PosView';
import { ProductManagementView } from './components/ProductManagementView';
import { MemberManagementView } from './components/MemberManagementView';
import { ReportView } from './components/ReportView';
import { SettingsModal } from './components/SettingsModal';

const MainApp: React.FC = () => {
  const { currentUser, activeTab } = usePos();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // If not logged in, show the split login page
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Content View */}
      <main className="flex-1 pb-12">
        {activeTab === 'pos' && <PosView />}
        {activeTab === 'products' && <ProductManagementView />}
        {activeTab === 'members' && <MemberManagementView />}
        {activeTab === 'reports' && <ReportView />}
      </main>

      {/* Store Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Subtle Footer */}
      <footer className="py-4 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500">
        AFSTORE POS • Sistem Penjualan Kasir Modern & Terpercaya
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <MainApp />
    </PosProvider>
  );
}
