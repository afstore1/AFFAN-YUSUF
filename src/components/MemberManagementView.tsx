import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { UserAccount } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/format';
import { 
  Users, 
  UserPlus, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  Mail, 
  Lock, 
  X, 
  AlertCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';

export const MemberManagementView: React.FC = () => {
  const { currentUser, users, transactions, addUser, updateUser, deleteUser } = usePos();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Password visibility map for table rows
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // If unauthorized access
  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Akses Terbatas: Khusus Super Admin</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Hanya akun Super Admin yang diizinkan untuk melihat dan mengelola akun anggota kasir yang terdaftar pada sistem ini.
        </p>
      </div>
    );
  }

  // Filter only member/cashier accounts
  const memberAccounts = users.filter(u => u.role === 'anggota');
  const superAdminAccounts = users.filter(u => u.role === 'super_admin');

  // Calculate cashier metrics
  const getCashierMetrics = (userId: string) => {
    const cashierTx = transactions.filter(t => t.cashierId === userId);
    const txCount = cashierTx.length;
    const totalSales = cashierTx.reduce((sum, t) => sum + t.total, 0);
    return { txCount, totalSales };
  };

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setPassword('kasir123');
    setPhone('');
    setEmail('');
    setFormShowPassword(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserAccount) => {
    setEditingUser(user);
    setFullName(user.fullName);
    setUsername(user.username);
    setPassword(user.password);
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setFormShowPassword(false);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim()) {
      setFormError('Nama lengkap anggota wajib diisi.');
      return;
    }
    if (!username.trim()) {
      setFormError('Username anggota wajib diisi.');
      return;
    }
    if (!password) {
      setFormError('Password anggota wajib diisi.');
      return;
    }

    if (editingUser) {
      const res = updateUser(editingUser.id, {
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        phone: phone.trim(),
        email: email.trim(),
      });
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addUser({
        fullName: fullName.trim(),
        username: username.trim(),
        password,
        phone: phone.trim() || '08xxxxxxxx',
        email: email.trim(),
        role: 'anggota',
        status: 'active',
        avatarColor: 'bg-emerald-600',
      });
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Toggle user active status
  const handleToggleStatus = (user: UserAccount) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    updateUser(user.id, { status: nextStatus });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Daftar Akun Anggota (Kasir) Terdaftar
              <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold">
                Panel Super Admin
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Super Admin dapat melihat semua akun kasir, kata sandi, status keaktifan, dan menambah anggota baru
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Daftarkan Anggota Baru</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Total Anggota Kasir</span>
          <p className="text-2xl font-extrabold text-white mt-1">{memberAccounts.length}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Akun terdaftar dalam sistem</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Anggota Aktif</span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            {memberAccounts.filter(m => m.status === 'active').length}
          </p>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Siap melayani transaksi POS</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Total Transaksi Kasir</span>
          <p className="text-2xl font-extrabold text-sky-400 mt-1">
            {transactions.filter(t => t.cashierRole === 'anggota').length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Struk dicetak oleh anggota</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Omset dari Anggota</span>
          <p className="text-2xl font-extrabold text-purple-400 mt-1">
            {formatRupiah(
              transactions
                .filter(t => t.cashierRole === 'anggota')
                .reduce((sum, t) => sum + t.total, 0)
            )}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Total penjualan kasir</span>
        </div>
      </div>

      {/* Members List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Akun Anggota Kasir ({memberAccounts.length} Orang)</span>
          </h3>
          <span className="text-xs text-slate-400">
            Gunakan icon mata <Eye className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" /> untuk melihat password anggota
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama & Akun</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Password (Kata Sandi)</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Kinerja Kasir</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {memberAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Belum ada akun anggota kasir yang terdaftar. Klik "Daftarkan Anggota Baru" untuk menambahkan.
                  </td>
                </tr>
              ) : (
                memberAccounts.map(member => {
                  const isPassVisible = visiblePasswords[member.id] || false;
                  const { txCount, totalSales } = getCashierMetrics(member.id);

                  return (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Name & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
                            {member.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs sm:text-sm">{member.fullName}</p>
                            <span className="text-[10px] font-semibold text-emerald-400">
                              Anggota Kasir
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-slate-300 text-xs">
                          {member.username}
                        </span>
                      </td>

                      {/* Password with Eye Visibility Toggle */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          <span className="font-mono text-xs font-semibold text-purple-300">
                            {isPassVisible ? member.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(member.id)}
                            title={isPassVisible ? 'Sembunyikan password' : 'Lihat password'}
                            className="text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            {isPassVisible ? (
                              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-300 text-xs flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{member.phone || '-'}</span>
                        </p>
                        {member.email && (
                          <p className="text-slate-500 text-[11px] flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-600" />
                            <span>{member.email}</span>
                          </p>
                        )}
                      </td>

                      {/* Performance */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-xs text-white">
                          {txCount} Transaksi
                        </p>
                        <p className="text-[11px] text-emerald-400 font-medium">
                          {formatRupiah(totalSales)}
                        </p>
                      </td>

                      {/* Status Active / Inactive */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(member)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                            member.status === 'active'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-rose-950/70 text-rose-300 border-rose-800 hover:bg-rose-900'
                          }`}
                          title="Klik untuk mengubah status aktif/nonaktif"
                        >
                          {member.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(member)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/60 hover:text-purple-300 text-slate-300 transition cursor-pointer"
                            title="Edit Akun Anggota"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Apakah Anda yakin ingin menghapus akun anggota "${member.fullName}"?`
                                )
                              ) {
                                deleteUser(member.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Super Admin Accounts Reference Card */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Akun Super Admin Terdaftar ({superAdminAccounts.length})</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {superAdminAccounts.map(admin => {
            const isPassVisible = visiblePasswords[admin.id] || false;
            return (
              <div
                key={admin.id}
                className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{admin.fullName}</p>
                  <p className="text-slate-400 text-[11px]">
                    User: <strong className="text-purple-300">{admin.username}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-purple-900/60">
                  <span className="font-mono text-[11px] text-purple-300">
                    {isPassVisible ? admin.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(admin.id)}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    {isPassVisible ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Tambah / Edit Anggota */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">
                  {editingUser ? 'Edit Akun Anggota' : 'Daftarkan Anggota Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Lengkap Anggota <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Contoh: Dimas Anggara"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username Login <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Contoh: dimas_kasir"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Password with Eye icon toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password Login <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password anggota"
                    className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    title={formShowPassword ? 'Sembunyikan password' : 'Lihat password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {formShowPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formShowPassword ? 'Password sedang ditampilkan' : 'Klik icon mata untuk melihat password'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomor HP / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@kasirpro.id"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Daftarkan Akun'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
