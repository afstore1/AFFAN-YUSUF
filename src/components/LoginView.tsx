import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { UserRole } from '../types';
import { 
  ShieldCheck, 
  UserCheck, 
  Eye, 
  EyeOff, 
  LogIn, 
  Store, 
  Lock, 
  User, 
  AlertCircle
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, settings } = usePos();

  // Active login tab: 'super_admin' or 'anggota'
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  
  // Credentials (Empty by default for security)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // State for status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Switch role tab and clear inputs
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('Mohon masukkan Username Anda.');
      return;
    }
    if (!password) {
      setErrorMsg('Mohon masukkan Password Anda.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = login(username.trim(), password, selectedRole);
      if (!res.success) {
        setErrorMsg(res.message);
      }
      setIsLoading(false);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-bold text-xl overflow-hidden">
            {settings.storeLogoUrl ? (
              <img
                src={settings.storeLogoUrl}
                alt={settings.storeName}
                className="w-full h-full object-contain p-1 bg-white"
              />
            ) : (
              <Store className="w-6 h-6 text-slate-950" />
            )}
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              AFSTORE <span className="text-emerald-400">POS</span>
            </h1>
            <p className="text-xs text-slate-400">Sistem Kasir & Manajemen Toko Terpadu</p>
          </div>
        </div>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Silakan masukkan username dan password untuk mengakses sistem kasir
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/70 border border-slate-800 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => handleSelectRole('super_admin')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              selectedRole === 'super_admin'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Super Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole('anggota')}
            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
              selectedRole === 'anggota'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Anggota (Kasir)</span>
          </button>
        </div>

        {/* Role Privileges Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm mb-6 flex items-start gap-3 transition-colors ${
            selectedRole === 'super_admin'
              ? 'bg-purple-950/30 border-purple-800/40 text-purple-200'
              : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
          }`}
        >
          {selectedRole === 'super_admin' ? (
            <>
              <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-purple-300">Hak Akses Super Admin:</p>
                <p className="text-purple-200/80 text-xs mt-0.5 leading-relaxed">
                  Memasukkan barang baru, ubah harga & stok, kelola daftar akun anggota, lihat laporan keuangan/omset, dan transaksi kasir.
                </p>
              </div>
            </>
          ) : (
            <>
              <UserCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-300">Hak Akses Anggota (Kasir):</p>
                <p className="text-emerald-200/80 text-xs mt-0.5 leading-relaxed">
                  Dikhususkan untuk proses transaksi penjualan kasir, cek stok barang, dan cetak struk pembayaran pelanggan.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-center gap-3 text-rose-300 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username {selectedRole === 'super_admin' ? 'Super Admin' : 'Anggota Kasir'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={selectedRole === 'super_admin' ? 'Masukkan username Super Admin' : 'Masukkan username Anggota'}
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition"
              />
              {/* Eye Toggle to Show / Hide Password */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              {showPassword ? (
                <span className="text-emerald-400 font-medium">Password ditampilkan (klik icon mata untuk menyembunyikan)</span>
              ) : (
                <span>Klik icon mata untuk melihat password saat mengetik</span>
              )}
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all ${
              selectedRole === 'super_admin'
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk Sebagai {selectedRole === 'super_admin' ? 'Super Admin' : 'Anggota'}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        AFSTORE Point of Sales • Aman, Cepat, dan Akurat
      </div>
    </div>
  );
};
