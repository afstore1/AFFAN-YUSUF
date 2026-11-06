import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { CashEntry } from '../types';
import { formatRupiah, formatMonthYearIndo } from '../utils/format';
import { 
  BookOpen, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  Filter, 
  CheckCircle2, 
  X, 
  CalendarRange
} from 'lucide-react';

interface CombinedCashRecord {
  id: string;
  sourceType: 'pos_transaction' | 'stock_purchase' | 'manual_entry';
  type: 'in' | 'out'; // in = penerimaan, out = pengeluaran
  date: string; // ISO date string
  namaBarangTerjual: string;
  penerimaan: number;
  pengeluaran: number;
  detailInfo?: string;
  monthKey: string;
  monthLabel: string;
  dayName: string;
  rawEntry?: CashEntry;
}

export const BukuKasUmumView: React.FC = () => {
  const { 
    currentUser, 
    transactions, 
    stockPurchases, 
    cashEntries, 
    addCashEntry, 
    deleteCashEntry,
  } = usePos();

  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for adding new cash entry
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [entryForm, setEntryForm] = useState({
    amount: '',
    category: 'Operasional Toko',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    paymentMethod: 'cash' as 'cash' | 'bank' | 'qris',
    referenceNo: '',
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // Combine POS transactions (decomposed per sold item), Stock Purchases, and Manual Cash Entries
  const allCashRecords = useMemo(() => {
    const list: CombinedCashRecord[] = [];

    // 1. Penerimaan dari Transaksi Penjualan Kasir (POS) - Dipecah per Nama Barang Terjual
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const isValid = !isNaN(d.getTime());
      const dayName = isValid ? new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d) : '-';
      const timeStr = isValid ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(tx.date) : 'Lainnya';

      if (tx.items && tx.items.length > 0) {
        tx.items.forEach((item, itemIdx) => {
          const qtyText = item.quantity > 1 ? ` (${item.quantity} ${item.unit || 'pcs'})` : '';
          list.push({
            id: `tx-${tx.id}-${item.productId || itemIdx}-${itemIdx}`,
            sourceType: 'pos_transaction',
            type: 'in',
            date: tx.date,
            namaBarangTerjual: `${item.name}${qtyText}`,
            penerimaan: item.subtotal || (item.price * item.quantity),
            pengeluaran: 0,
            detailInfo: `Nota #${tx.receiptNumber} • ${dayName}, ${timeStr}`,
            monthKey,
            monthLabel,
            dayName,
          });
        });
      } else {
        list.push({
          id: `tx-${tx.id}`,
          sourceType: 'pos_transaction',
          type: 'in',
          date: tx.date,
          namaBarangTerjual: `Penjualan Kasir (Nota #${tx.receiptNumber})`,
          penerimaan: tx.total,
          pengeluaran: 0,
          detailInfo: `Nota #${tx.receiptNumber} • ${dayName}, ${timeStr}`,
          monthKey,
          monthLabel,
          dayName,
        });
      }
    });

    // 2. Pengeluaran dari Update Belanja Stok Barang
    stockPurchases.forEach(sp => {
      const d = new Date(sp.date);
      const isValid = !isNaN(d.getTime());
      const dayName = isValid ? new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d) : '-';
      const timeStr = isValid ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '12:00';
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(sp.date) : 'Lainnya';

      list.push({
        id: `sp-${sp.id}`,
        sourceType: 'stock_purchase',
        type: 'out',
        date: sp.date,
        namaBarangTerjual: sp.description ? `Belanja Stok: ${sp.description}` : 'Belanja Stok Persediaan Barang',
        penerimaan: 0,
        pengeluaran: sp.amount,
        detailInfo: `Belanja Stok Toko • ${dayName}, ${timeStr}`,
        monthKey,
        monthLabel,
        dayName,
      });
    });

    // 3. Catatan Kas Manual Tambahan
    cashEntries.forEach(ce => {
      const d = new Date(ce.date);
      const isValid = !isNaN(d.getTime());
      const dayName = isValid ? new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d) : '-';
      const timeStr = isValid ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(ce.date) : 'Lainnya';

      list.push({
        id: ce.id,
        sourceType: 'manual_entry',
        type: ce.type,
        date: ce.date,
        namaBarangTerjual: ce.description || (ce.type === 'in' ? 'Penerimaan Kas' : 'Pengeluaran Kas'),
        penerimaan: ce.type === 'in' ? ce.amount : 0,
        pengeluaran: ce.type === 'out' ? ce.amount : 0,
        detailInfo: `${ce.category} • ${dayName}, ${timeStr}`,
        monthKey,
        monthLabel,
        dayName,
        rawEntry: ce,
      });
    });

    // Urutkan kronologis dari tanggal terlama ke terbaru untuk hitung saldo berjalan
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [transactions, stockPurchases, cashEntries]);

  // Hitung saldo berjalan secara kronologis (penerimaan menambah saldo, pengeluaran mengurangi saldo)
  const recordsWithBalance = useMemo(() => {
    let runningBalance = 0;
    return allCashRecords.map(item => {
      if (item.type === 'in') {
        runningBalance += item.penerimaan;
      } else {
        runningBalance -= item.pengeluaran;
      }
      return {
        ...item,
        balance: runningBalance,
      };
    });
  }, [allCashRecords]);

  // Filter records berdasarkan tanggal, bulan, tipe, dan search query
  const filteredRecords = useMemo(() => {
    const now = new Date().getTime();

    return recordsWithBalance.filter(item => {
      const itemTime = new Date(item.date).getTime();

      // Filter Range Waktu
      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!item.date.startsWith(todayStr)) return false;
      } else if (dateFilter === '7days') {
        if (now - itemTime > 7 * 24 * 3600 * 1000) return false;
      } else if (dateFilter === '30days') {
        if (now - itemTime > 30 * 24 * 3600 * 1000) return false;
      }

      // Filter Bulan
      if (selectedMonth !== 'all' && item.monthKey !== selectedMonth) {
        return false;
      }

      // Filter Tipe Kas
      if (typeFilter !== 'all' && item.type !== typeFilter) {
        return false;
      }

      // Search Query pada Nama Barang Terjual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          item.namaBarangTerjual.toLowerCase().includes(q) ||
          (item.detailInfo && item.detailInfo.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [recordsWithBalance, dateFilter, selectedMonth, typeFilter, searchQuery]);

  // Tampilan tabel dibalik: dari transaksi terbaru di atas
  const displayRecords = useMemo(() => {
    return [...filteredRecords].reverse();
  }, [filteredRecords]);

  // Ringkasan Total
  const totalPenerimaan = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.penerimaan, 0);
  }, [filteredRecords]);

  const totalPengeluaran = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + r.pengeluaran, 0);
  }, [filteredRecords]);

  const saldoKasAkhir = totalPenerimaan - totalPengeluaran;

  // Daftar opsi bulan yang tersedia
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    recordsWithBalance.forEach(r => {
      if (r.monthKey && r.monthKey !== 'Lainnya') {
        map.set(r.monthKey, r.monthLabel);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [recordsWithBalance]);

  // Open modal handler
  const handleOpenModal = (type: 'in' | 'out') => {
    setModalType(type);
    setEntryForm({
      amount: '',
      category: type === 'in' ? 'Modal Masuk' : 'Operasional Toko',
      description: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      paymentMethod: 'cash',
      referenceNo: type === 'in' ? `BKM-${Date.now().toString().slice(-4)}` : `BKK-${Date.now().toString().slice(-4)}`,
    });
    setIsModalOpen(true);
  };

  // Submit modal handler
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(entryForm.amount) || 0;
    if (amountNum <= 0) {
      alert('Nominal harus lebih dari Rp 0.');
      return;
    }

    const fullIsoDate = `${entryForm.date}T${entryForm.time || '12:00'}:00.000Z`;
    const res = addCashEntry({
      type: modalType,
      category: entryForm.category,
      amount: amountNum,
      date: fullIsoDate,
      description: entryForm.description.trim() || (modalType === 'in' ? 'Penerimaan Kas Tambahan' : 'Pengeluaran Kas Tambahan'),
      referenceNo: entryForm.referenceNo.trim(),
      paymentMethod: entryForm.paymentMethod,
      recordedBy: currentUser?.fullName || 'Admin',
    });

    setIsModalOpen(false);
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(''), 3500);
  };

  // Export to CSV with strictly the 5 requested columns
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('Tidak ada data buku kas umum untuk diekspor.');
      return;
    }

    const headers = [
      'Nomor',
      'Nama Barang Terjual',
      'Penerimaan',
      'Pengeluaran',
      'Saldo Berjalan'
    ];

    const rows = filteredRecords.map((r, idx) => [
      idx + 1,
      `"${r.namaBarangTerjual.replace(/"/g, '""')}"`,
      r.penerimaan,
      r.pengeluaran,
      r.balance
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `buku-kas-umum-afstore-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Buku Kas Umum
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full font-bold">
                Pembukuan Kas Realtime
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Pencatatan nomor, nama barang terjual, penerimaan, pengeluaran dan saldo berjalan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tambah Kas Masuk */}
          <button
            type="button"
            onClick={() => handleOpenModal('in')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-emerald-900/30"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>+ Kas Masuk</span>
          </button>

          {/* Tambah Kas Keluar */}
          <button
            type="button"
            onClick={() => handleOpenModal('out')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md shadow-rose-900/30"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+ Kas Keluar</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Ekspor CSV</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 transition cursor-pointer"
            title="Cetak Buku Kas Umum"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3.5 bg-teal-950/90 border border-teal-800 rounded-xl text-xs text-teal-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Card 1: Penerimaan */}
        <div className="bg-slate-900 border border-emerald-900/40 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <ArrowDownLeft className="w-4 h-4" /> Penerimaan
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Kas Masuk
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
            {formatRupiah(totalPenerimaan)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Total penerimaan barang terjual & setoran
          </span>
        </div>

        {/* Card 2: Pengeluaran */}
        <div className="bg-slate-900 border border-rose-900/40 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 text-xs font-bold flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" /> Pengeluaran
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
              Kas Keluar
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-rose-400 mt-2 font-mono">
            {formatRupiah(totalPengeluaran)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Belanja persediaan stok barang & operasional
          </span>
        </div>

        {/* Card 3: Saldo Berjalan (Sisa Saldo Kas) */}
        <div className="bg-slate-900 border border-teal-900/50 p-4 rounded-2xl relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-teal-400 text-xs font-bold flex items-center gap-1">
              <Wallet className="w-4 h-4" /> Saldo Berjalan
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              saldoKasAkhir >= 0 
                ? 'bg-teal-950 text-teal-300 border border-teal-800' 
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {saldoKasAkhir >= 0 ? 'Surplus' : 'Defisit'}
            </span>
          </div>
          <p className={`text-xl sm:text-2xl font-extrabold mt-2 font-mono ${
            saldoKasAkhir >= 0 ? 'text-teal-300' : 'text-rose-400'
          }`}>
            {formatRupiah(saldoKasAkhir)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Penerimaan dikurangi pengeluaran
          </span>
        </div>

      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        {/* Search Nama Barang Terjual */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang terjual..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Time Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
          </select>
        </div>

        {/* Month Filter */}
        <div className="md:col-span-3 flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Semua Bulan ({availableMonths.length} Bulan)</option>
            {availableMonths.map(m => (
              <option key={m.key} value={m.key}>
                Bulan {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cash Type Filter */}
        <div className="md:col-span-2 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Semua Arus Kas</option>
            <option value="in">Penerimaan Saja</option>
            <option value="out">Pengeluaran Saja</option>
          </select>
        </div>
      </div>

      {/* Table Buku Kas Umum - HANYA 5 KOLOM: Nomor, Nama Barang Terjual, Penerimaan, Pengeluaran, Saldo Berjalan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-400" />
              <span>Buku Kas Umum ({filteredRecords.length} Catatan)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Hanya menampilkan Nomor, Nama Barang Terjual, Penerimaan, Pengeluaran dan Saldo Berjalan
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Urutan: Transaksi terbaru di atas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-3 text-center w-14">Nomor</th>
                <th className="py-3.5 px-4 min-w-[240px]">Nama Barang Terjual</th>
                <th className="py-3.5 px-4 text-right min-w-[140px] text-emerald-400">Penerimaan</th>
                <th className="py-3.5 px-4 text-right min-w-[140px] text-rose-400">Pengeluaran</th>
                <th className="py-3.5 px-4 text-right min-w-[150px] text-teal-300">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {displayRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Belum ada catatan buku kas umum yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                displayRecords.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    
                    {/* Nomor */}
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs">
                      {index + 1}
                    </td>

                    {/* Nama Barang Terjual */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-xs sm:text-sm">
                          {item.namaBarangTerjual}
                        </span>
                        {item.detailInfo && (
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {item.detailInfo}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Penerimaan */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {item.penerimaan > 0 ? `+${formatRupiah(item.penerimaan)}` : '-'}
                    </td>

                    {/* Pengeluaran */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                      {item.pengeluaran > 0 ? `-${formatRupiah(item.pengeluaran)}` : '-'}
                    </td>

                    {/* Saldo Berjalan */}
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-teal-300 whitespace-nowrap bg-teal-950/10">
                      {formatRupiah(item.balance)}
                    </td>

                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer Totals */}
            {filteredRecords.length > 0 && (
              <tfoot className="bg-slate-950/95 border-t-2 border-slate-800 text-xs font-bold text-slate-200">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-right text-slate-400 uppercase tracking-wider">
                    Total:
                  </td>
                  <td className="py-3.5 px-4 text-right text-emerald-400 font-extrabold font-mono text-sm">
                    +{formatRupiah(totalPenerimaan)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-rose-400 font-extrabold font-mono text-sm">
                    -{formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-teal-300 font-extrabold font-mono text-sm bg-teal-950/30">
                    {formatRupiah(saldoKasAkhir)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Add Manual Cash Entry */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                {modalType === 'in' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                    <span>Catat Kas Masuk (Penerimaan)</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-rose-400" />
                    <span>Catat Kas Keluar (Pengeluaran)</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4 text-xs sm:text-sm">
              {/* Nominal */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nominal Transaksi (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={entryForm.amount}
                    onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-base focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Tanggal & Jam */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={entryForm.date}
                    onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jam</label>
                  <input
                    type="time"
                    required
                    value={entryForm.time}
                    onChange={e => setEntryForm({ ...entryForm, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Kategori & Metode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori</label>
                  <select
                    value={entryForm.category}
                    onChange={e => setEntryForm({ ...entryForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs"
                  >
                    {modalType === 'in' ? (
                      <>
                        <option value="Modal Masuk">Modal Masuk / Tambahan</option>
                        <option value="Setoran Kasir">Setoran Kasir</option>
                        <option value="Pendapatan Lain-lain">Pendapatan Lain-lain</option>
                        <option value="Pelunasan Piutang">Pelunasan Piutang</option>
                      </>
                    ) : (
                      <>
                        <option value="Operasional Toko">Operasional Toko</option>
                        <option value="Listrik & Air">Listrik, Air & Internet</option>
                        <option value="Sewa Tempat">Sewa Tempat / Ruko</option>
                        <option value="Plastik & Kemasan">Plastik & Perlengkapan Kasir</option>
                        <option value="Gaji & Konsumsi">Gaji & Konsumsi Kasir</option>
                        <option value="Transportasi">Bensin & Transportasi</option>
                        <option value="Lain-lain">Biaya Lain-lain</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jenis Kas / Pembayaran</label>
                  <select
                    value={entryForm.paymentMethod}
                    onChange={e => setEntryForm({ ...entryForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 text-xs"
                  >
                    <option value="cash">Kas Tunai Toko (Laci)</option>
                    <option value="bank">Kas Bank / Transfer</option>
                    <option value="qris">Kas QRIS Toko</option>
                  </select>
                </div>
              </div>

              {/* Uraian / Keterangan (Nama Barang / Uraian) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Nama Barang / Keterangan Transaksi <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={entryForm.description}
                  onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
                  placeholder={modalType === 'in' ? "Contoh: Setoran modal kasir" : "Contoh: Beli kantong kresek dan kertas thermal"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl transition cursor-pointer shadow-lg ${
                    modalType === 'in'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                      : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/30'
                  }`}
                >
                  Simpan ke Buku Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
