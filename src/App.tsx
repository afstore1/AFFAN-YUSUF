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
  const { currentUser, activeTab, isAuthReady } = usePos();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // While Firebase Auth is determining session state on page load
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium tracking-wide">Menghubungkan ke Google Cloud Realtime...</span>
        </div>
      </div>
    );
  }

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
