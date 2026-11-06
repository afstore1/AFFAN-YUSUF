import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { formatRupiah, formatDateIndo, formatFullDateWithDay, formatMonthYearIndo } from '../utils/format';
import { 
  Landmark, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers, 
  Calendar, 
  Download, 
  Printer, 
  Search, 
  TrendingUp, 
  Receipt, 
  ShoppingBag, 
  PieChart, 
  CreditCard, 
  Banknote, 
  QrCode,
  CalendarRange,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const BukuKasBesarView: React.FC = () => {
  const { 
    currentUser, 
    transactions, 
    stockPurchases, 
    cashEntries, 
    settings 
  } = usePos();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Sub-tabs in Buku Kas Besar: 'monthly' (Rekapitulasi Bulanan) | 'accounts' (Buku Besar per Akun) | 'flow' (Arus Kas)
  const [activeTab, setActiveTab] = useState<'monthly' | 'accounts' | 'flow'>('monthly');
  const [selectedAccount, setSelectedAccount] = useState<'all' | 'cash' | 'bank_qris' | 'stock' | 'operational'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Consolidated Ledger Entries
  const ledgerEntries = useMemo(() => {
    const list: {
      id: string;
      date: string;
      monthKey: string;
      monthLabel: string;
      accountCode: string;
      accountName: string;
      accountCategory: 'kas_tunai' | 'kas_bank' | 'penjualan' | 'belanja_stok' | 'operasional';
      type: 'debet' | 'kredit'; // debet = masuk, kredit = keluar
      amount: number;
      refNo: string;
      description: string;
      paymentMethod: string;
    }[] = [];

    // Dari Transaksi Penjualan Struk Kasir
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const isValid = !isNaN(d.getTime());
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(tx.date) : 'Lainnya';
      const isCash = tx.paymentMethod === 'cash';

      list.push({
        id: `tx-${tx.id}`,
        date: tx.date,
        monthKey,
        monthLabel,
        accountCode: isCash ? '101' : '102',
        accountName: isCash ? 'Kas Tunai Toko' : 'Kas Bank / QRIS',
        accountCategory: isCash ? 'kas_tunai' : 'kas_bank',
        type: 'debet',
        amount: tx.total,
        refNo: tx.receiptNumber,
        description: `Penjualan Kasir (${tx.items?.length || 0} barang) - ${tx.customerName || 'Umum'}`,
        paymentMethod: tx.paymentMethod?.toUpperCase() || 'CASH',
      });
    });

    // Dari Update Belanja Stok Barang
    stockPurchases.forEach(sp => {
      const d = new Date(sp.date);
      const isValid = !isNaN(d.getTime());
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(sp.date) : 'Lainnya';

      list.push({
        id: `sp-${sp.id}`,
        date: sp.date,
        monthKey,
        monthLabel,
        accountCode: '501',
        accountName: 'Belanja Stok Barang',
        accountCategory: 'belanja_stok',
        type: 'kredit',
        amount: sp.amount,
        refNo: `BLJ-${sp.id.slice(-6).toUpperCase()}`,
        description: sp.description || 'Pengadaan stok persediaan barang toko',
        paymentMethod: 'KAS TOKO',
      });
    });

    // Dari Catatan Kas Tambahan
    cashEntries.forEach(ce => {
      const d = new Date(ce.date);
      const isValid = !isNaN(d.getTime());
      const monthKey = isValid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'Lainnya';
      const monthLabel = isValid ? formatMonthYearIndo(ce.date) : 'Lainnya';
      const isBankOrQris = ce.paymentMethod === 'bank' || ce.paymentMethod === 'qris';

      let accountCode = '101';
      let accountName = 'Kas Tunai Toko';
      let accountCategory: 'kas_tunai' | 'kas_bank' | 'penjualan' | 'belanja_stok' | 'operasional' = 'kas_tunai';

      if (isBankOrQris) {
        accountCode = '102';
        accountName = 'Kas Bank / QRIS';
        accountCategory = 'kas_bank';
      } else if (ce.type === 'out') {
        accountCode = '502';
        accountName = 'Beban Operasional Toko';
        accountCategory = 'operasional';
      }

      list.push({
        id: ce.id,
        date: ce.date,
        monthKey,
        monthLabel,
        accountCode,
        accountName,
        accountCategory,
        type: ce.type === 'in' ? 'debet' : 'kredit',
        amount: ce.amount,
        refNo: ce.referenceNo || 'BKM',
        description: ce.description,
        paymentMethod: ce.paymentMethod?.toUpperCase() || 'CASH',
      });
    });

    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, stockPurchases, cashEntries]);

  // Total Kas Masuk Tunai vs Bank/QRIS
  const kasTunaiMasuk = useMemo(() => {
    return ledgerEntries
      .filter(e => e.type === 'debet' && e.accountCategory === 'kas_tunai')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [ledgerEntries]);

  const kasBankMasuk = useMemo(() => {
    return ledgerEntries
      .filter(e => e.type === 'debet' && e.accountCategory === 'kas_bank')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [ledgerEntries]);

  const totalPengeluaranStok = useMemo(() => {
    return stockPurchases.reduce((sum, sp) => sum + sp.amount, 0);
  }, [stockPurchases]);

  const totalPengeluaranOperasional = useMemo(() => {
    return cashEntries
      .filter(ce => ce.type === 'out')
      .reduce((sum, ce) => sum + ce.amount, 0);
  }, [cashEntries]);

  const totalSemuaPenerimaan = kasTunaiMasuk + kasBankMasuk;
  const totalSemuaPengeluaran = totalPengeluaranStok + totalPengeluaranOperasional;
  const saldoKasBesarAkhir = totalSemuaPenerimaan - totalSemuaPengeluaran;

  // 2. Rekapitulasi Kas Besar per Bulan (Monthly Summary)
  const monthlySummaries = useMemo(() => {
    const map = new Map<string, {
      monthKey: string;
      monthLabel: string;
      totalDebet: number; // Kas Masuk
      totalKredit: number; // Kas Keluar
      netSurplus: number; // Surplus/Defisit
      trxCount: number;
    }>();

    ledgerEntries.forEach(e => {
      const key = e.monthKey || 'Lainnya';
      const label = e.monthLabel || 'Lainnya';

      if (!map.has(key)) {
        map.set(key, {
          monthKey: key,
          monthLabel: label,
          totalDebet: 0,
          totalKredit: 0,
          netSurplus: 0,
          trxCount: 0,
        });
      }

      const item = map.get(key)!;
      item.trxCount += 1;
      if (e.type === 'debet') {
        item.totalDebet += e.amount;
      } else {
        item.totalKredit += e.amount;
      }
      item.netSurplus = item.totalDebet - item.totalKredit;
    });

    // Urutkan dari bulan terlama untuk hitung saldo akumulatif
    const sortedChronological = Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    let cumulative = 0;
    const withCumulative = sortedChronological.map(item => {
      cumulative += item.netSurplus;
      return {
        ...item,
        cumulativeBalance: cumulative,
      };
    });

    // Tampilkan urut dari bulan terbaru
    return withCumulative.reverse();
  }, [ledgerEntries]);

  // Export CSV Buku Kas Besar
  const handleExportCSV = () => {
    if (activeTab === 'monthly') {
      const headers = ['Bulan & Tahun', 'Jumlah Transaksi', 'Penerimaan Kas (Debet)', 'Pengeluaran Kas (Kredit)', 'Surplus / Defisit Bulan', 'Saldo Kumulatif Kas Besar'];
      const rows = monthlySummaries.map(m => [
        `"${m.monthLabel}"`,
        m.trxCount,
        m.totalDebet,
        m.totalKredit,
        m.netSurplus,
        m.cumulativeBalance,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekap-buku-kas-besar-afstore-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = ['Kode Akun', 'Nama Akun', 'Tanggal', 'No. Referensi', 'Uraian Keterangan', 'Jenis Mutasi', 'Nominal', 'Metode Pembayaran'];
      const rows = ledgerEntries.map(e => [
        `"${e.accountCode}"`,
        `"${e.accountName}"`,
        `"${formatDateIndo(e.date)}"`,
        `"${e.refNo}"`,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.type === 'debet' ? 'Debet (Masuk)' : 'Kredit (Keluar)'}"`,
        e.amount,
        `"${e.paymentMethod}"`,
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `buku-kas-besar-akun-afstore-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Buku Kas Besar (BKB)
              <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full font-bold">
                Buku Besar Induk Keuangan
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Rekapitulasi induk mutasi kas, ikhtisar bulanan, dan klasifikasi akun penerimaan & belanja toko
            </p>
          </div>
        </div>

        {/* Tab switcher & export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Rekapitulasi Bulanan ({monthlySummaries.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'accounts'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Buku Besar per Akun</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('flow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'flow'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Analisis Arus Kas</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs border border-slate-700 transition cursor-pointer"
            title="Cetak Buku Kas Besar"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Financial Position Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Saldo Kas Besar Induk */}
        <div className="bg-slate-900 border border-indigo-900/40 p-4 rounded-2xl relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-indigo-400 text-xs font-bold flex items-center gap-1">
              <Landmark className="w-4 h-4" /> Total Saldo Kas Besar
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              saldoKasBesarAkhir >= 0 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {saldoKasBesarAkhir >= 0 ? 'Posisi Sehat' : 'Defisit Kas'}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-white mt-2 font-mono">
            {formatRupiah(saldoKasBesarAkhir)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Penerimaan: {formatRupiah(totalSemuaPenerimaan)}
          </span>
        </div>

        {/* Card 2: Saldo Kas Tunai Fisik */}
        <div className="bg-slate-900 border border-emerald-900/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
              <Banknote className="w-4 h-4" /> Kas Tunai Kasir [101]
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Laci Kasir
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-2 font-mono">
            {formatRupiah(kasTunaiMasuk - totalSemuaPengeluaran)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Masuk Tunai: {formatRupiah(kasTunaiMasuk)}
          </span>
        </div>

        {/* Card 3: Saldo Kas Bank / QRIS */}
        <div className="bg-slate-900 border border-blue-900/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-blue-400 text-xs font-bold flex items-center gap-1">
              <QrCode className="w-4 h-4" /> Kas Bank & QRIS [102]
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Non-Tunai
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-blue-400 mt-2 font-mono">
            {formatRupiah(kasBankMasuk)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Transfer, QRIS & Kartu Debit
          </span>
        </div>

        {/* Card 4: Total Belanja Stok & Beban Usaha */}
        <div className="bg-slate-900 border border-amber-900/30 p-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" /> Total Belanja Stok [501]
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Pengadaan
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-400 mt-2 font-mono">
            {formatRupiah(totalPengeluaranStok)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Operasional lain: {formatRupiah(totalPengeluaranOperasional)}
          </span>
        </div>

      </div>

      {/* SUB-TAB 1: REKAPITULASI BULANAN BUKU KAS BESAR */}
      {activeTab === 'monthly' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-indigo-400" />
                <span>Rekapitulasi Bulanan Buku Kas Besar ({monthlySummaries.length} Periode)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ikhtisar total penerimaan, belanja stok, surplus/defisit bersih, dan saldo kas kumulatif setiap bulannya
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Bulan & Tahun</th>
                  <th className="py-3 px-4 text-center">Aktivitas Transaksi</th>
                  <th className="py-3 px-4 text-right text-emerald-400">Total Kas Masuk (Debet)</th>
                  <th className="py-3 px-4 text-right text-rose-400">Total Belanja & Kas Keluar (Kredit)</th>
                  <th className="py-3 px-4 text-right">Surplus / (Defisit) Bersih</th>
                  <th className="py-3 px-4 text-right text-indigo-300 font-bold">Saldo Kumulatif Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {monthlySummaries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Belum ada data transaksi yang dapat direkapitulasi.
                    </td>
                  </tr>
                ) : (
                  monthlySummaries.map((m, idx) => (
                    <tr key={m.monthKey} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        <span>Bulan: {m.monthLabel}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
                          {m.trxCount} mutasi
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        +{formatRupiah(m.totalDebet)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                        -{formatRupiah(m.totalKredit)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold">
                        <span className={m.netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {m.netSurplus >= 0 ? `+${formatRupiah(m.netSurplus)}` : formatRupiah(m.netSurplus)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-indigo-300 bg-indigo-950/15">
                        {formatRupiah(m.cumulativeBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlySummaries.length > 0 && (
                <tfoot className="bg-slate-950/90 border-t-2 border-slate-800 text-xs font-bold text-slate-200">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right text-slate-400">
                      Total Akumulasi Semua Bulan:
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-400 font-extrabold font-mono">
                      +{formatRupiah(totalSemuaPenerimaan)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-400 font-extrabold font-mono">
                      -{formatRupiah(totalSemuaPengeluaran)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold font-mono">
                      <span className={saldoKasBesarAkhir >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {formatRupiah(saldoKasBesarAkhir)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-indigo-300 font-extrabold font-mono text-sm bg-indigo-950/30">
                      {formatRupiah(saldoKasBesarAkhir)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BUKU BESAR PER AKUN / REKENING */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          
          {/* Account Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <span className="text-xs font-bold text-slate-400 mr-2">Pilih Akun Buku Besar:</span>
            <button
              type="button"
              onClick={() => setSelectedAccount('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedAccount === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Semua Akun ({ledgerEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedAccount('cash')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedAccount === 'cash'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              [101] Kas Tunai Toko
            </button>
            <button
              type="button"
              onClick={() => setSelectedAccount('bank_qris')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedAccount === 'bank_qris'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              [102] Kas Bank & QRIS
            </button>
            <button
              type="button"
              onClick={() => setSelectedAccount('stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedAccount === 'stock'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              [501] Belanja Stok Barang
            </button>
            <button
              type="button"
              onClick={() => setSelectedAccount('operational')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedAccount === 'operational'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              [502] Beban Operasional
            </button>
          </div>

          {/* Table for Selected Account */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-4">Tanggal Transaksi</th>
                    <th className="py-3 px-4">Kode & Nama Akun</th>
                    <th className="py-3 px-4">No. Bukti / Ref</th>
                    <th className="py-3 px-4">Uraian Keterangan</th>
                    <th className="py-3 px-4 text-center">Jenis Mutasi</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {ledgerEntries
                    .filter(e => {
                      if (selectedAccount === 'all') return true;
                      if (selectedAccount === 'cash') return e.accountCategory === 'kas_tunai';
                      if (selectedAccount === 'bank_qris') return e.accountCategory === 'kas_bank';
                      if (selectedAccount === 'stock') return e.accountCategory === 'belanja_stok';
                      if (selectedAccount === 'operational') return e.accountCategory === 'operasional';
                      return true;
                    })
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-xs">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {formatFullDateWithDay(item.date)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-indigo-400 font-bold mr-1">[{item.accountCode}]</span>
                          <span className="font-medium text-white">{item.accountName}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                          {item.refNo}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-white block">{item.description}</span>
                          <span className="text-[10px] text-slate-400">Metode: {item.paymentMethod}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            item.type === 'debet'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}>
                            {item.type === 'debet' ? 'Debet (+)' : 'Kredit (-)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold whitespace-nowrap">
                          <span className={item.type === 'debet' ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.type === 'debet' ? `+${formatRupiah(item.amount)}` : `-${formatRupiah(item.amount)}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 3: ANALISIS ARUS KAS (CASH FLOW ANALYSIS) */}
      {activeTab === 'flow' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card Arus Kas Masuk */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              <span>Komposisi Arus Kas Masuk (Penerimaan)</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Kas Tunai Kasir</span>
                  <span className="text-[11px] text-slate-400">Uang tunai fisik diterima di laci</span>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatRupiah(kasTunaiMasuk)}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Kas Bank & QRIS</span>
                  <span className="text-[11px] text-slate-400">Pembayaran digital via QRIS / Bank</span>
                </div>
                <span className="font-mono font-bold text-blue-400 text-sm">
                  {formatRupiah(kasBankMasuk)}
                </span>
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between font-bold">
                <span className="text-emerald-300 text-xs">Total Penerimaan Kas:</span>
                <span className="font-mono text-emerald-400 text-base">
                  {formatRupiah(totalSemuaPenerimaan)}
                </span>
              </div>
            </div>
          </div>

          {/* Card Arus Kas Keluar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 pb-2 border-b border-slate-800">
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
              <span>Komposisi Arus Kas Keluar (Pengeluaran)</span>
            </h3>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Belanja Stok Barang</span>
                  <span className="text-[11px] text-slate-400">Pengadaan persediaan barang dagangan</span>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {formatRupiah(totalPengeluaranStok)}
                </span>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-xs block">Beban Operasional Toko</span>
                  <span className="text-[11px] text-slate-400">Biaya sewa, listrik, kresek, dll</span>
                </div>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  {formatRupiah(totalPengeluaranOperasional)}
                </span>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-xl flex items-center justify-between font-bold">
                <span className="text-rose-300 text-xs">Total Pengeluaran Kas:</span>
                <span className="font-mono text-rose-400 text-base">
                  {formatRupiah(totalSemuaPengeluaran)}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
