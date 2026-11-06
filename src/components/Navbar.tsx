import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { 
  Settings, 
  LogOut, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  UserCheck,
  Store,
  Clock,
  RefreshCw,
  Menu
} from 'lucide-react';

export const Navbar: React.FC<{ 
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
}> = ({ onOpenSettings, onToggleSidebar }) => {
  const { 
    currentUser, 
    logout, 
    activeTab, 
    settings, 
    updateSettings, 
    syncStatus, 
    lastSyncTime,
    syncWithServer
  } = usePos();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'pos':
        return 'Kasir (POS)';
      case 'products':
        return 'Katalog Barang';
      case 'reports':
        return 'Laporan & Struk Penjualan';
      case 'bku':
        return 'Buku Kas Umum (BKU)';
      case 'bkb':
        return 'Buku Kas Besar (BKB)';
      case 'members':
        return 'Kelola Anggota Kasir';
      default:
        return 'AFSTORE POS';
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Left: Sidebar Toggle Button & Brand / Page Indicator */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 border border-slate-700/80 shadow-sm"
                title="Buka / Tutup Menu Side Bar"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                <span className="hidden sm:inline text-xs font-bold text-slate-200">Side Bar</span>
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 overflow-hidden shrink-0">
              {settings.storeLogoUrl ? (
                <img
                  src={settings.storeLogoUrl}
                  alt={settings.storeName}
                  className="w-full h-full object-contain p-0.5 bg-white"
                />
              ) : (
                <Store className="w-5 h-5 text-slate-950" />
              )}
            </div>

            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">AFSTORE</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  POS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                {settings.storeName}
              </p>
            </div>
          </div>

          {/* Active View Title Indicator (Menu utama berada di Sidebar) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-bold text-slate-200 tracking-tight">
                {getTabTitle()}
              </span>
            </div>
          </div>

          {/* Right Section: Cloud Sync, Migration Tool, Clock, Sound, User info, Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Google Cloud Realtime Multi-Device Sync Indicator & Button */}
            <button
              type="button"
              onClick={() => syncWithServer(false)}
              title={`Google Cloud Realtime Aktif. Terakhir sinkron: ${lastSyncTime || 'Baru saja'}. Klik untuk menyegarkan data.`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
                syncStatus === 'syncing'
                  ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                  : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 shadow-sm shadow-emerald-950'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
              <span className="hidden md:inline font-bold text-[11px] tracking-tight">
                {syncStatus === 'syncing' ? 'Sinkron Cloud...' : 'Cloud Realtime Aktif'}
              </span>
            </button>

            {/* Live Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentTime}</span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => updateSettings({ enableSound: !settings.enableSound })}
              title={settings.enableSound ? 'Suara Kasir: Aktif' : 'Suara Kasir: Dimatikan'}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            >
              {settings.enableSound ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Store Settings Button */}
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                title="Pengaturan Toko & Struk"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-white leading-tight">
                    {currentUser.fullName}
                  </span>
                </div>
                <div className="flex items-center justify-end mt-0.5">
                  {isSuperAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800/80 text-purple-300">
                      <ShieldCheck className="w-2.5 h-2.5" /> SUPER ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800/80 text-emerald-300">
                      <UserCheck className="w-2.5 h-2.5" /> KASIR
                    </span>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Keluar / Ganti Akun"
                className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-rose-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
