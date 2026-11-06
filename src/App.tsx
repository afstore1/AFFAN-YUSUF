import React, { useState } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PosView } from './components/PosView';
import { ProductManagementView } from './components/ProductManagementView';
import { MemberManagementView } from './components/MemberManagementView';
import { ReportView } from './components/ReportView';
import { BukuKasUmumView } from './components/BukuKasUmumView';
import { BukuKasBesarView } from './components/BukuKasBesarView';
import { SettingsModal } from './components/SettingsModal';

const MainApp: React.FC = () => {
  const { currentUser, activeTab, isAuthReady } = usePos();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Side Bar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        {/* Top Navigation */}
        <Navbar 
          onOpenSettings={() => setIsSettingsOpen(true)} 
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        />

        {/* Main Content View */}
        <main className="flex-1 pb-12">
          {activeTab === 'pos' && <PosView />}
          {activeTab === 'products' && <ProductManagementView />}
          {activeTab === 'members' && <MemberManagementView />}
          {activeTab === 'reports' && <ReportView />}
          {activeTab === 'bku' && <BukuKasUmumView />}
          {activeTab === 'bkb' && <BukuKasBesarView />}
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
