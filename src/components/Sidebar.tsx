import React from 'react';
import { usePos } from '../context/PosContext';
import { NavTab } from '../types';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  BookOpen, 
  Landmark, 
  Settings, 
  LogOut, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  UserCheck,
  Store,
  Clock,
  RefreshCw,
  X,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const { 
    currentUser, 
    logout, 
    activeTab, 
    setActiveTab, 
    settings, 
    updateSettings, 
    users,
    products,
    transactions,
    syncStatus,
    lastSyncTime,
    syncWithServer 
  } = usePos();

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'super_admin';
  const memberCount = users.filter(u => u.role === 'anggota').length;

  const menuItems: {
    id: NavTab;
    label: string;
    sublabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
    superAdminOnly?: boolean;
  }[] = [
    {
      id: 'pos',
      label: 'Kasir (POS)',
      sublabel: 'Transaksi penjualan & nota',
      icon: ShoppingCart,
      badge: 'Kasir',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800'
    },
    {
      id: 'products',
      label: 'Katalog Barang',
      sublabel: 'Kelola stok, harga & barcode',
      icon: Package,
      badge: products.length,
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700'
    },
    {
      id: 'reports',
      label: 'Laporan & Struk',
      sublabel: 'Omset, laba & history barang',
      icon: BarChart3,
      badge: transactions.length,
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800'
    },
    {
      id: 'bku',
      label: 'Buku Kas Umum',
      sublabel: 'Arus kas harian debet & kredit',
      icon: BookOpen,
      badge: 'BKU',
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-800'
    },
    {
      id: 'bkb',
      label: 'Buku Kas Besar',
      sublabel: 'Buku besar kas & rekap bulanan',
      icon: Landmark,
      badge: 'BKB',
      badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800'
    },
    {
      id: 'members',
      label: 'Kelola Anggota',
      sublabel: 'Manajemen akun kasir',
      icon: Users,
      badge: memberCount,
      badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
      superAdminOnly: true
    }
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center gap-3 overflow-hidden">
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
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">AFSTORE</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  POS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                {settings.storeName}
              </p>
            </div>
          </div>

          {/* Close button for Mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Menu Utama Navigasi
          </div>

          {menuItems.map(item => {
            if (item.superAdminOnly && !isSuperAdmin) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`p-2 rounded-lg transition shrink-0 ${
                    isActive 
                      ? 'bg-emerald-700/60 text-white' 
                      : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs sm:text-sm block leading-tight">{item.label}</span>
                    <span className={`text-[10px] block truncate leading-tight mt-0.5 ${
                      isActive ? 'text-emerald-100' : 'text-slate-400'
                    }`}>
                      {item.sublabel}
                    </span>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ml-1.5 ${
                    isActive
                      ? 'bg-emerald-800/80 text-white border-emerald-500'
                      : item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Settings Item */}
          {onOpenSettings && (
            <div className="pt-2 mt-2 border-t border-slate-800/80">
              <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Pengaturan Sistem
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-slate-300 hover:text-white hover:bg-slate-800/70 transition cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-800 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-700 transition">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-medium block leading-tight">Pengaturan Toko & Struk</span>
                    <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">Nama, logo, alamat & pajak</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Area: User Card, Sync, Sound, Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2.5 shrink-0">
          
          {/* Cloud Sync Status */}
          <button
            type="button"
            onClick={() => syncWithServer(false)}
            title={`Status Google Cloud Realtime. Terakhir sinkron: ${lastSyncTime || 'Baru saja'}. Klik untuk sinkronisasi ulang.`}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
              syncStatus === 'syncing'
                ? 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                : 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncStatus === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              )}
              <span className="font-bold text-[11px]">
                {syncStatus === 'syncing' ? 'Sinkron Cloud...' : 'Cloud Realtime Aktif'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {lastSyncTime || 'Aktif'}
            </span>
          </button>

          {/* User Account Card */}
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                isSuperAdmin ? 'bg-purple-600' : 'bg-emerald-600'
              }`}>
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-white block truncate leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-0.5">
                  {isSuperAdmin ? (
                    <span className="text-purple-300 bg-purple-950/80 px-1 py-0.2 rounded border border-purple-800">
                      SUPER ADMIN
                    </span>
                  ) : (
                    <span className="text-emerald-300 bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-800">
                      KASIR
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => updateSettings({ enableSound: !settings.enableSound })}
                title={settings.enableSound ? 'Suara Kasir: Aktif' : 'Suara Kasir: Dimatikan'}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                {settings.enableSound ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Keluar dari Akun"
                className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
};
