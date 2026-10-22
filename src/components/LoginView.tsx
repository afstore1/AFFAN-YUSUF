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
  AlertCircle,
  CloudCheck,
  Sparkles
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, signInWithGoogle, settings, syncStatus, firebaseUser } = usePos();

  // Active login tab: 'super_admin' or 'anggota'
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');
  
  // Credentials (Empty by default for security)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // State for status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Switch role tab and clear inputs
  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg('');
    setSuccessMsg('');
    setUsername('');
    setPassword('');
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsGoogleLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        setErrorMsg(res.message);
      } else {
        setSuccessMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk dengan Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Brand */}
      <div className="text-center mb-6 relative z-10">
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

        {/* Cloud Firebase Sync Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <CloudCheck className="w-3.5 h-3.5" />
          <span>Terkait dengan Firebase Cloud Firestore</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Google One-Click Login Button */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 active:scale-[0.99]"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Masuk Cepat dengan Akun Google</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Data otomatis tersinkronisasi antar perangkat & akun Google Anda secara realtime.
          </p>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-wider shrink-0 font-medium">
            Atau Masuk dengan Akun Kasir
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/70 border border-slate-800 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => handleSelectRole('super_admin')}
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
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
            className={`flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              selectedRole === 'anggota'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Anggota (Kasir)</span>
          </button>
        </div>

        {/* Error / Success Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
            <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
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
      <div className="mt-6 text-center text-xs text-slate-500 relative z-10 flex flex-col items-center gap-1">
        <span>AFSTORE Point of Sales • Aman, Cepat, dan Akurat</span>
        <span className="text-[11px] text-slate-600">Database: Firebase Firestore (Online & Terpusat)</span>
      </div>
    </div>
  );
};
