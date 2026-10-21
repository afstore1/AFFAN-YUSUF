import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { Transaction, Product, StockPurchase } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/format';
import { ReceiptModal } from './ReceiptModal';
import { 
  BarChart3, 
  Receipt, 
  Calendar, 
  Printer, 
  Download, 
  Trash2,
  Package, 
  TrendingUp, 
  Search, 
  Sparkles,
  Save,
  CheckCircle2,
  X,
  Plus,
  ArrowUpDown,
  Wallet,
  ShoppingBag,
  Edit3,
  ArrowDownRight,
  Info
} from 'lucide-react';

export const ReportView: React.FC = () => {
  const { 
    currentUser, 
    transactions, 
    products, 
    users, 
    stockPurchases,
    deleteTransaction, 
    updateProductStock, 
    adjustStock,
    addStockPurchase,
    updateStockPurchase,
    deleteStockPurchase
  } = usePos();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Sub-tab view: 'receipts', 'purchases' (Update Stok Barang / Belanja Stok), or 'catalog'
  const [activeSubTab, setActiveSubTab] = useState<'receipts' | 'purchases' | 'catalog'>('receipts');

  // Filters for Receipts & Purchases
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected transaction to view & reprint receipt
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Modal Delete Transaction
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string>('');

  // Stock Catalog Tab State
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('Semua');
  const [editingStockProduct, setEditingStockProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);

  // Stock Purchase (Belanja Stok) Modal State - ONLY 3 FIELDS: Nominal Belanja, Tanggal, Keterangan
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<StockPurchase | null>(null);
  const [purchaseForm, setPurchaseForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [purchaseToDelete, setPurchaseToDelete] = useState<StockPurchase | null>(null);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date().getTime();

    return transactions.filter(t => {
      // Date filter
      const txTime = new Date(t.date).getTime();
      let matchDate = true;
      if (dateFilter === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        matchDate = t.date.startsWith(todayStr);
      } else if (dateFilter === '7days') {
        matchDate = now - txTime <= 7 * 24 * 3600 * 1000;
      } else if (dateFilter === '30days') {
        matchDate = now - txTime <= 30 * 24 * 3600 * 1000;
      }

      // Cashier filter
      let matchCashier = true;
      if (selectedCashier !== 'all') {
        matchCashier = t.cashierId === selectedCashier;
      }

      const matchSearch =
        t.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.cashierName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchDate && matchCashier && matchSearch;
    });
  }, [transactions, dateFilter, selectedCashier, searchQuery]);

  // Filtered Stock Purchases (Update Stok Barang)
  const filteredStockPurchases = useMemo(() => {
    const now = new Date().getTime();
    const todayStr = new Date().toISOString().split('T')[0];

    return stockPurchases.filter(sp => {
      let matchDate = true;
      const spTime = new Date(sp.date).getTime();

      if (dateFilter === 'today') {
        matchDate = sp.date === todayStr;
      } else if (dateFilter === '7days') {
        matchDate = now - spTime <= 7 * 24 * 3600 * 1000;
      } else if (dateFilter === '30days') {
        matchDate = now - spTime <= 30 * 24 * 3600 * 1000;
      }

      const matchSearch =
        !searchQuery ||
        sp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.date.includes(searchQuery) ||
        sp.amount.toString().includes(searchQuery);

      return matchDate && matchSearch;
    });
  }, [stockPurchases, dateFilter, searchQuery]);

  // Aggregated metrics
  const totalOmset = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalGrossProfit = filteredTransactions.reduce((sum, t) => sum + (t.totalProfit || 0), 0);
  
  // Total nominal belanja dari kolom Update Stok Barang
  const totalBelanjaStok = filteredStockPurchases.reduce((sum, sp) => sum + sp.amount, 0);

  // OTOMATIS DIKURANG: Total Keuntungan Bersih (Laba) = Laba Penjualan - Total Belanja Stok
  const totalNetProfit = totalGrossProfit - totalBelanjaStok;

  const totalCount = filteredTransactions.length;
  const avgOrderValue = totalCount > 0 ? Math.round(totalOmset / totalCount) : 0;
  const netMarginPercent = totalOmset > 0 ? ((totalNetProfit / totalOmset) * 100).toFixed(1) : '0';

  // Best selling products ranking
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredTransactions.forEach(t => {
      t.items.forEach(item => {
        const existing = map.get(item.productId) || { name: item.name, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.subtotal;
        map.set(item.productId, existing);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Handle Delete Transaction Execution
  const handleConfirmDeleteTx = () => {
    if (!txToDelete) return;
    const res = deleteTransaction(txToDelete.id, restoreStockOnDelete);
    setTxToDelete(null);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  // Stock Tab: Extract unique categories
  const stockCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Stock Tab: Filtered products
  const filteredStockProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(stockSearch.toLowerCase());
      const matchCat =
        stockCategoryFilter === 'Semua' || p.category.toLowerCase() === stockCategoryFilter.toLowerCase();
      return matchSearch && matchCat;
    });
  }, [products, stockSearch, stockCategoryFilter]);

  // Handle Save Stock Catalog Quantity
  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockProduct) return;
    const res = updateProductStock(editingStockProduct.id, newStockValue);
    setEditingStockProduct(null);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  // Stock Purchase Form Open
  const handleOpenAddPurchase = () => {
    setEditingPurchase(null);
    setPurchaseForm({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
    setIsPurchaseModalOpen(true);
  };

  const handleOpenEditPurchase = (purchase: StockPurchase) => {
    setEditingPurchase(purchase);
    setPurchaseForm({
      amount: purchase.amount.toString(),
      date: purchase.date,
      description: purchase.description,
    });
    setIsPurchaseModalOpen(true);
  };

  // Handle Submit Stock Purchase (ONLY: Nominal Belanja, Tanggal, Keterangan)
  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(purchaseForm.amount) || 0;
    if (amountNum <= 0) {
      alert('Nominal belanja harus lebih dari Rp 0.');
      return;
    }

    if (editingPurchase) {
      const res = updateStockPurchase(editingPurchase.id, {
        amount: amountNum,
        date: purchaseForm.date,
        description: purchaseForm.description,
      });
      setActionFeedback(res.message);
    } else {
      const res = addStockPurchase({
        amount: amountNum,
        date: purchaseForm.date,
        description: purchaseForm.description,
      });
      setActionFeedback(res.message);
    }

    setIsPurchaseModalOpen(false);
    setEditingPurchase(null);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  // Handle Delete Stock Purchase
  const handleConfirmDeletePurchase = () => {
    if (!purchaseToDelete) return;
    const res = deleteStockPurchase(purchaseToDelete.id);
    setPurchaseToDelete(null);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(''), 3500);
  };

  // Download CSV export
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      alert('Tidak ada transaksi untuk diekspor.');
      return;
    }

    const headers = ['No. Nota', 'Tanggal', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Total Belanja', 'Keuntungan/Laba'];
    const rows = filteredTransactions.map(t => [
      t.receiptNumber,
      `"${formatDateIndo(t.date)}"`,
      `"${t.cashierName}"`,
      `"${t.customerName || 'Umum'}"`,
      t.paymentMethod.toUpperCase(),
      t.total,
      t.totalProfit,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `laporan-transaksi-afstore-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Laporan Penjualan & Riwayat Struk
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {isSuperAdmin ? 'AFSTORE Super Admin' : 'Kasir AFSTORE'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Pantau laba penjualan, riwayat struk, dan update belanja stok barang yang otomatis memotong laba bersih
            </p>
          </div>
        </div>

        {/* Tab Navigation & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('receipts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'receipts'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Riwayat Struk & Laba ({filteredTransactions.length})</span>
            </button>

            {/* TAB KHUSUS: UPDATE STOK BARANG (HANYA NOMINAL BELANJA, TANGGAL, KETERANGAN) */}
            <button
              type="button"
              onClick={() => setActiveSubTab('purchases')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'purchases'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-300" />
              <span>Update Belanja Stok ({filteredStockPurchases.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('catalog')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'catalog'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Persediaan Stok ({products.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* METRICS ROW (KARTU STATISTIK DENGAN PENGURANGAN OTOMATIS LABA BERSIH) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Total Omset */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Total Omset Penjualan</span>
          <p className="text-xl sm:text-2xl font-extrabold text-white mt-1">
            {formatRupiah(totalOmset)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Dari {totalCount} transaksi struk kasir</span>
        </div>

        {/* Metric 2: TOTAL KEUNTUNGAN BERSIH (LABA) - OTOMATIS DIKURANG NOMINAL BELANJA STOK */}
        <div className="bg-slate-900 border border-emerald-800/40 p-4 rounded-2xl relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-bold block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Total Keuntungan Bersih (Laba)
            </span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              totalNetProfit >= 0 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}>
              {netMarginPercent}% Laba
            </span>
          </div>

          <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${
            totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {formatRupiah(totalNetProfit)}
          </p>

          {/* Keterangan Rumus Pengurangan Otomatis */}
          <div className="text-[11px] text-slate-300 mt-1.5 pt-1.5 border-t border-slate-800/80 flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-slate-400 text-[10px]">
              <span>Laba Penjualan Struk:</span>
              <span className="text-slate-200 font-medium">+{formatRupiah(totalGrossProfit)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-400 text-[10px]">
              <span>Dikurangi Belanja Stok:</span>
              <span className="font-bold">-{formatRupiah(totalBelanjaStok)}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: TOTAL NOMINAL BELANJA STOK BARANG */}
        <div className="bg-slate-900 border border-amber-800/40 p-4 rounded-2xl relative">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 text-xs font-bold flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5" /> Total Belanja Stok Barang
            </span>
            <button
              type="button"
              onClick={handleOpenAddPurchase}
              className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-800 rounded-md transition cursor-pointer flex items-center gap-1"
              title="Input nominal belanja stok baru"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Input</span>
            </button>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-1">
            {formatRupiah(totalBelanjaStok)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {filteredStockPurchases.length} kali belanja (memotong laba bersih)
          </span>
        </div>

        {/* Metric 4: Jumlah Struk Aktif */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Jumlah Struk Penjualan</span>
          <p className="text-xl sm:text-2xl font-extrabold text-sky-400 mt-1">{totalCount} Struk</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Rata-rata: {formatRupiah(avgOrderValue)}
          </span>
        </div>

      </div>

      {/* FILTER ROW (BERLAKU UNTUK STRUK & BELANJA STOK) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'purchases'
                ? "Cari keterangan belanja stok atau nominal..."
                : "Cari no nota, kasir, atau nama pelanggan..."
            }
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
          </select>
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Kasir:</label>
          <select
            value={selectedCashier}
            onChange={e => setSelectedCashier(e.target.value)}
            disabled={activeSubTab === 'purchases'}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          >
            <option value="all">Semua Kasir ({users.length})</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role === 'super_admin' ? 'Super Admin' : 'Kasir'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: RIWAYAT STRUK & LAPORAN KEUNTUNGAN             */}
      {/* ========================================================= */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-6">
          
          {/* Quick Bar Belanja Stok Notice */}
          <div className="bg-amber-950/20 border border-amber-800/40 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-amber-300">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>Pengingat Belanja Stok:</strong> Total belanja stok saat ini ({formatRupiah(totalBelanjaStok)}) otomatis mengurangi Total Keuntungan Bersih menjadi <strong className="text-emerald-300">{formatRupiah(totalNetProfit)}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenAddPurchase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Catat Belanja Stok Baru</span>
            </button>
          </div>

          {/* Top Products Quick View */}
          {topProducts.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Barang Paling Laris Berdasarkan Struk Penjualan</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <span className="text-[10px] font-bold text-amber-400">#{idx + 1} Terlaris</span>
                    <p className="font-bold text-white mt-0.5 truncate">{p.name}</p>
                    <div className="flex justify-between items-baseline mt-1.5 pt-1.5 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400">{p.qty} Terjual</span>
                      <span className="font-bold text-emerald-400">{formatRupiah(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Table with DEDICATED KEUNTUNGAN COLUMN & DELETE BUTTON */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Riwayat Struk Pembayaran ({filteredTransactions.length} Transaksi)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setiap transaksi memiliki keterangan laba yang jelas serta tombol cetak dan tombol hapus
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Nota</th>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">Kasir Bertugas</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Total Belanja</th>
                    {/* DEDICATED KEUNTUNGAN COLUMN */}
                    <th className="py-3 px-4 bg-emerald-950/30 border-x border-emerald-800/30 text-emerald-300">
                      Keterangan Keuntungan (Laba)
                    </th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4 text-right">Aksi Struk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Belum ada riwayat transaksi yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => {
                      const profitMargin = tx.total > 0 ? ((tx.totalProfit / tx.total) * 100).toFixed(0) : '0';
                      const totalModal = tx.total - tx.totalProfit;

                      return (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                          
                          {/* No Nota */}
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {tx.receiptNumber}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-slate-300 text-xs">
                            {formatDateIndo(tx.date)}
                          </td>

                          {/* Cashier */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white">{tx.cashierName}</span>
                            <span className="block text-[10px] text-slate-400">
                              {tx.cashierRole === 'super_admin' ? 'Super Admin' : 'Anggota Kasir'}
                            </span>
                          </td>

                          {/* Pelanggan */}
                          <td className="py-3.5 px-4 text-slate-300">
                            {tx.customerName || 'Pelanggan Umum'}
                          </td>

                          {/* Total Belanja */}
                          <td className="py-3.5 px-4 font-extrabold text-white text-xs sm:text-sm">
                            {formatRupiah(tx.total)}
                          </td>

                          {/* DEDICATED KEUNTUNGAN COLUMN */}
                          <td className="py-3.5 px-4 bg-emerald-950/15 border-x border-emerald-800/20">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">
                                +{formatRupiah(tx.totalProfit)}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {profitMargin}% Laba
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Modal: {formatRupiah(totalModal)}
                            </span>
                          </td>

                          {/* Metode Bayar */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-950 border border-slate-800 text-slate-300">
                              {tx.paymentMethod}
                            </span>
                          </td>

                          {/* Action Buttons: Print & DELETE */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Print Receipt */}
                              <button
                                type="button"
                                onClick={() => setSelectedTx(tx)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Lihat & Cetak Struk Ulang"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Struk</span>
                              </button>

                              {/* HAPUS STRUK */}
                              <button
                                type="button"
                                onClick={() => {
                                  setTxToDelete(tx);
                                  setRestoreStockOnDelete(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                                title="Hapus Struk Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: UPDATE STOK BARANG (HANYA NOMINAL BELANJA, TANGGAL, KETERANGAN) */}
      {/* ========================================================================= */}
      {activeSubTab === 'purchases' && (
        <div className="space-y-6">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Header with Add Button */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>Kolom Update Stok Barang (Belanja Stok)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kolom ini <strong>hanya memuat Nominal Belanja, Tanggal, dan Keterangan</strong>. Nominal belanja otomatis mengurangi Total Keuntungan Bersih (Laba).
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPurchase}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Belanja Stok</span>
              </button>
            </div>

            {/* Dedicated Table with ONLY 3 Fields: Tanggal, Nominal Belanja, Keterangan */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/90 text-slate-300 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 w-40">Tanggal</th>
                    <th className="py-3.5 px-4 w-52 bg-amber-950/20 text-amber-300 border-x border-amber-800/30">
                      Nominal Belanja
                    </th>
                    <th className="py-3.5 px-4">Keterangan</th>
                    <th className="py-3.5 px-4 text-right w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredStockPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        Belum ada catatan belanja stok barang. Klik tombol <strong>+ Tambah Belanja Stok</strong> di atas untuk mencatat pengeluaran belanja stok baru.
                      </td>
                    </tr>
                  ) : (
                    filteredStockPurchases.map(purchase => (
                      <tr key={purchase.id} className="hover:bg-slate-800/40 transition">
                        
                        {/* 1. TANGGAL */}
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {formatDateIndo(purchase.date)}
                        </td>

                        {/* 2. NOMINAL BELANJA */}
                        <td className="py-3.5 px-4 bg-amber-950/15 border-x border-amber-800/20 font-extrabold text-amber-300 text-sm">
                          <div className="flex items-center gap-1.5">
                            <ArrowDownRight className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>{formatRupiah(purchase.amount)}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                            Memotong laba bersih
                          </span>
                        </td>

                        {/* 3. KETERANGAN */}
                        <td className="py-3.5 px-4 text-slate-200">
                          <p className="font-semibold text-white">{purchase.description}</p>
                          <span className="text-[10px] text-slate-400">
                            Dicatat: {formatDateIndo(purchase.createdAt)}
                          </span>
                        </td>

                        {/* AKSI: EDIT & HAPUS */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPurchase(purchase)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
                              title="Edit Nominal, Tanggal, atau Keterangan"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPurchaseToDelete(purchase)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                              title="Hapus Catatan Belanja Stok"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>

                {/* Table Footer: Total Nominal Belanja */}
                {filteredStockPurchases.length > 0 && (
                  <tfoot className="bg-slate-950 border-t-2 border-slate-800 font-bold text-xs sm:text-sm">
                    <tr>
                      <td className="py-3.5 px-4 text-slate-400 uppercase tracking-wider">
                        Total Nominal Belanja:
                      </td>
                      <td className="py-3.5 px-4 bg-amber-950/30 text-amber-300 font-extrabold border-x border-amber-800/40 text-base">
                        {formatRupiah(totalBelanjaStok)}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-slate-400 text-xs font-normal">
                        Nominal belanja sebesar <strong>{formatRupiah(totalBelanjaStok)}</strong> ini telah otomatis memotong Total Keuntungan Bersih (Laba) toko AFSTORE.
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: PERSEDIAAN STOK FISIK DARI KATALOG PRODUK      */}
      {/* ========================================================= */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6">
          
          {/* Stock Search & Category Filter */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="md:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                placeholder="Cari nama barang atau barcode untuk update stok..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2">
              <label className="text-xs text-slate-400 whitespace-nowrap">Filter Kategori:</label>
              <select
                value={stockCategoryFilter}
                onChange={e => setStockCategoryFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {stockCategories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stock Table with Direct Stock Input and Current Quantities */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  <span>Daftar Persediaan Stok Barang ({filteredStockProducts.length} Produk)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tertera jumlah stok barang saat ini dan Anda dapat langsung mengedit atau menambah jumlah fisik barang yang masuk
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Foto & Nama Barang</th>
                    <th className="py-3 px-4">Kategori & SKU</th>
                    <th className="py-3 px-4">Harga Jual</th>
                    <th className="py-3 px-4 bg-purple-950/20 text-purple-300">JUMLAH STOK SAAT INI</th>
                    <th className="py-3 px-4">Status Persediaan</th>
                    <th className="py-3 px-4 text-right">Aksi Update Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        Tidak ada barang yang cocok dengan pencarian stok.
                      </td>
                    </tr>
                  ) : (
                    filteredStockProducts.map(product => {
                      const isOutOfStock = product.stock <= 0;
                      const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

                      return (
                        <tr key={product.id} className="hover:bg-slate-800/40 transition">
                          
                          {/* Photo & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                                {product.imageUrl ? (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-slate-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs sm:text-sm">{product.name}</p>
                                <span className="text-[11px] text-slate-400">Satuan: {product.unit}</span>
                              </div>
                            </div>
                          </td>

                          {/* Kategori & Code */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px] font-semibold">
                              {product.category}
                            </span>
                            <p className="text-[11px] text-slate-500 font-mono mt-1">{product.code}</p>
                          </td>

                          {/* Harga Jual */}
                          <td className="py-3 px-4 font-bold text-white">
                            {formatRupiah(product.price)}
                          </td>

                          {/* JUMLAH STOK SAAT INI */}
                          <td className="py-3 px-4 bg-purple-950/10">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-base font-extrabold ${
                                  isOutOfStock
                                    ? 'text-rose-400'
                                    : isLowStock
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {product.stock}
                              </span>
                              <span className="text-xs text-slate-300 font-medium">{product.unit}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            {isOutOfStock ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                                Stok Habis
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                                Menipis (≤{product.minStockAlert})
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                                Aman
                              </span>
                            )}
                          </td>

                          {/* Quick Restock & Edit Stock */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick + Buttons */}
                              <button
                                type="button"
                                onClick={() => adjustStock(product.id, 10)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-300 text-[11px] font-bold border border-slate-700 transition cursor-pointer"
                                title="Tambah 10 stok masuk"
                              >
                                +10
                              </button>

                              <button
                                type="button"
                                onClick={() => adjustStock(product.id, 50)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-300 text-[11px] font-bold border border-slate-700 transition cursor-pointer"
                                title="Tambah 50 stok masuk"
                              >
                                +50
                              </button>

                              {/* Edit Exact Stock Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStockProduct(product);
                                  setNewStockValue(product.stock);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition cursor-pointer"
                                title="Input Jumlah Stok Manual"
                              >
                                <ArrowUpDown className="w-3 h-3" />
                                <span>Edit Stok</span>
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

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT / UPDATE BELANJA STOK (NOMINAL BELANJA, TANGGAL, KETERANGAN)   */}
      {/* ========================================================================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Wallet className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">
                  {editingPurchase ? 'Edit Belanja Stok Barang' : 'Input Update Belanja Stok Barang'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="py-4 space-y-4">
              
              {/* Info box: Menjelaskan hanya 3 isian & otomatis mengurangi laba */}
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  Isian Update Belanja Stok Barang:
                </p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Isikan <strong>Nominal Belanja</strong>, <strong>Tanggal</strong>, dan <strong>Keterangan</strong>. Nominal belanja ini akan otomatis dikurangkan dari Total Keuntungan Bersih (Laba).
                </p>
              </div>

              {/* 1. NOMINAL BELANJA */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Nominal Belanja (Rp) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">Rp</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={purchaseForm.amount}
                    onChange={e => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                    placeholder="Contoh: 150000"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-base font-extrabold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                {Number(purchaseForm.amount) > 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Terbaca: <strong>{formatRupiah(Number(purchaseForm.amount))}</strong>
                  </p>
                )}
              </div>

              {/* 2. TANGGAL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  2. Tanggal Belanja *
                </label>
                <input
                  type="date"
                  required
                  value={purchaseForm.date}
                  onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* 3. KETERANGAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  3. Keterangan Belanja Stok *
                </label>
                <textarea
                  required
                  rows={3}
                  value={purchaseForm.description}
                  onChange={e => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                  placeholder="Contoh: Belanja beras 5 sak dan minyak goreng di agen sembako pasar"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingPurchase ? 'Simpan Perubahan' : 'Catat Belanja Stok'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: HAPUS CATATAN BELANJA STOK                         */}
      {/* ========================================================= */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Hapus Catatan Belanja Stok</h3>
              </div>
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-300">
                Apakah Anda yakin ingin menghapus catatan belanja stok ini?
              </p>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nominal Belanja:</span>
                  <span className="font-extrabold text-amber-300">{formatRupiah(purchaseToDelete.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tanggal:</span>
                  <span className="text-slate-200">{formatDateIndo(purchaseToDelete.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Keterangan:</span>
                  <span className="text-slate-200 truncate max-w-[200px]">{purchaseToDelete.description}</span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-400">
                Setelah dihapus, pemotongan nominal {formatRupiah(purchaseToDelete.amount)} akan dibatalkan sehingga Total Keuntungan Bersih (Laba) akan bertambah kembali.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePurchase}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Catatan Ini</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KONFIRMASI HAPUS STRUK                             */}
      {/* ========================================================= */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Hapus Riwayat Struk</h3>
              </div>
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">No. Nota:</span>
                  <span className="font-mono font-bold text-emerald-400">{txToDelete.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Belanja:</span>
                  <span className="font-bold text-white">{formatRupiah(txToDelete.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Keuntungan (Laba):</span>
                  <span className="font-bold text-emerald-400">+{formatRupiah(txToDelete.totalProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kasir:</span>
                  <span className="text-slate-300">{txToDelete.cashierName}</span>
                </div>
              </div>

              {/* Checkbox to restore stock */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={e => setRestoreStockOnDelete(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded mt-0.5 cursor-pointer"
                />
                <span className="text-slate-300 leading-snug">
                  <strong>Kembalikan stok barang yang dibeli</strong> ke persediaan katalog (Otomatis restock sejumlah barang dalam nota ini).
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTx}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Struk Ini</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INPUT / EDIT STOK KATALOG BARANG                   */}
      {/* ========================================================= */}
      {editingStockProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Package className="w-5 h-5" />
                <h3 className="font-extrabold text-base text-white">Update Jumlah Stok Barang</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingStockProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="py-4 space-y-4">
              
              {/* Product Info Preview */}
              <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {editingStockProduct.imageUrl ? (
                    <img
                      src={editingStockProduct.imageUrl}
                      alt={editingStockProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-white text-xs sm:text-sm">{editingStockProduct.name}</p>
                  <p className="text-[11px] text-slate-400">
                    Stok Sekarang: <strong className="text-purple-300">{editingStockProduct.stock} {editingStockProduct.unit}</strong>
                  </p>
                </div>
              </div>

              {/* Input Jumlah Stok Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Input Jumlah Stok Baru ({editingStockProduct.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockValue}
                  onChange={e => setNewStockValue(Number(e.target.value) || 0)}
                  placeholder="Masukkan jumlah stok baru"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Quick Restock Buttons */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">
                  Tambah Cepat dari Stok Sekarang (+ Barang Masuk):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 20, 50, 100].map(addQty => (
                    <button
                      key={addQty}
                      type="button"
                      onClick={() => setNewStockValue(editingStockProduct.stock + addQty)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/60 hover:text-purple-200 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      +{addQty}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNewStockValue(editingStockProduct.stock)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStockProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Jumlah Stok</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Thermal Receipt Modal for Reprinting */}
      <ReceiptModal
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />

    </div>
  );
};
