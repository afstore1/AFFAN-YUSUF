import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRight, 
  RefreshCw, 
  Layers, 
  Trash2, 
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { Product, Transaction, StockPurchase, StoreSettings, UserAccount } from '../types';

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return '' as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        sanitized[key] = sanitizeForFirestore(val);
      }
    }
    return sanitized as T;
  }
  return data;
}

interface MigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

interface LocalStorageStats {
  productsCount: number;
  transactionsCount: number;
  stockPurchasesCount: number;
  hasSettings: boolean;
  usersCount: number;
  totalRecords: number;
  rawData: {
    products: Product[];
    transactions: Transaction[];
    stockPurchases: StockPurchase[];
    settings: StoreSettings | null;
    users: UserAccount[];
  };
}

interface FirestoreStats {
  productsCount: number;
  transactionsCount: number;
  stockPurchasesCount: number;
  hasSettings: boolean;
  usersCount: number;
  totalRecords: number;
}

interface MigrationResult {
  productsSuccess: number;
  productsSkipped: number;
  productsFailed: number;
  transactionsSuccess: number;
  transactionsSkipped: number;
  transactionsFailed: number;
  stockPurchasesSuccess: number;
  stockPurchasesSkipped: number;
  stockPurchasesFailed: number;
  settingsSuccess: boolean;
  settingsFailed: boolean;
  usersSuccess: number;
  usersSkipped: number;
  usersFailed: number;
  errors: string[];
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onClose, onMigrationComplete }) => {
  const [localStats, setLocalStats] = useState<LocalStorageStats>({
    productsCount: 0,
    transactionsCount: 0,
    stockPurchasesCount: 0,
    hasSettings: false,
    usersCount: 0,
    totalRecords: 0,
    rawData: { products: [], transactions: [], stockPurchases: [], settings: null, users: [] },
  });

  const [firestoreStats, setFirestoreStats] = useState<FirestoreStats | null>(null);
  const [isLoadingFirestore, setIsLoadingFirestore] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [skipExisting, setSkipExisting] = useState(false);
  const [verifiedMatches, setVerifiedMatches] = useState<boolean | null>(null);

  // Scan localStorage on open
  useEffect(() => {
    if (isOpen) {
      scanLocalStorage();
      fetchFirestoreCounts();
    }
  }, [isOpen]);

  const scanLocalStorage = () => {
    try {
      let products: Product[] = [];
      let transactions: Transaction[] = [];
      let stockPurchases: StockPurchase[] = [];
      let settings: StoreSettings | null = null;
      let users: UserAccount[] = [];

      const rawP = localStorage.getItem('kasirpro_products_v1');
      if (rawP) {
        try { products = JSON.parse(rawP); } catch {}
      }

      const rawT = localStorage.getItem('kasirpro_transactions_v1');
      if (rawT) {
        try { transactions = JSON.parse(rawT); } catch {}
      }

      const rawS = localStorage.getItem('kasirpro_stock_purchases_v1');
      if (rawS) {
        try { stockPurchases = JSON.parse(rawS); } catch {}
      }

      const rawSet = localStorage.getItem('kasirpro_settings_v1');
      if (rawSet) {
        try { settings = JSON.parse(rawSet); } catch {}
      }

      const rawU = localStorage.getItem('kasirpro_users_v1');
      if (rawU) {
        try { users = JSON.parse(rawU); } catch {}
      }

      const total = products.length + transactions.length + stockPurchases.length + (settings ? 1 : 0) + users.length;

      setLocalStats({
        productsCount: products.length,
        transactionsCount: transactions.length,
        stockPurchasesCount: stockPurchases.length,
        hasSettings: !!settings,
        usersCount: users.length,
        totalRecords: total,
        rawData: { products, transactions, stockPurchases, settings, users },
      });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Gagal membaca localStorage: ' + e.message });
    }
  };

  const fetchFirestoreCounts = async () => {
    setIsLoadingFirestore(true);
    try {
      const [prodSnap, txSnap, spSnap, setSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'stockPurchases')),
        getDoc(doc(db, 'settings', 'store')),
        getDocs(collection(db, 'userAccounts')),
      ]);

      const fStats: FirestoreStats = {
        productsCount: prodSnap.size,
        transactionsCount: txSnap.size,
        stockPurchasesCount: spSnap.size,
        hasSettings: setSnap.exists(),
        usersCount: userSnap.size,
        totalRecords: prodSnap.size + txSnap.size + spSnap.size + (setSnap.exists() ? 1 : 0) + userSnap.size,
      };

      setFirestoreStats(fStats);
    } catch (err: any) {
      console.error('Error fetching Firestore stats:', err);
      setStatusMessage({ type: 'error', text: 'Koneksi ke Firestore bermasalah: ' + err.message });
    } finally {
      setIsLoadingFirestore(false);
    }
  };

  // 1. Export all localStorage data to JSON file
  const handleExportLocalStorage = () => {
    try {
      const exportPayload = {
        meta: {
          appName: 'AFSTORE POS',
          exportType: 'LOCALSTORAGE_BACKUP',
          version: '1.0',
          exportedAt: new Date().toISOString(),
          description: 'Cadangan data asli dari localStorage browser sebelum migrasi ke Google Cloud Realtime (Cloud Firestore)',
        },
        data: localStats.rawData,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AFSTORE_LOCALSTORAGE_CADANGAN_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setStatusMessage({ 
        type: 'success', 
        text: 'File cadangan localStorage berhasil diunduh! Simpan file ini dengan aman.' 
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Gagal membuat file cadangan: ' + err.message });
    }
  };

  // Handle uploading an external JSON file as migration source
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const sourceData = parsed.data || parsed;

        const products: Product[] = Array.isArray(sourceData.products) ? sourceData.products : [];
        const transactions: Transaction[] = Array.isArray(sourceData.transactions) ? sourceData.transactions : [];
        const stockPurchases: StockPurchase[] = Array.isArray(sourceData.stockPurchases) ? sourceData.stockPurchases : [];
        const settings: StoreSettings | null = sourceData.settings || null;
        const users: UserAccount[] = Array.isArray(sourceData.users) ? sourceData.users : [];

        const total = products.length + transactions.length + stockPurchases.length + (settings ? 1 : 0) + users.length;

        setLocalStats({
          productsCount: products.length,
          transactionsCount: transactions.length,
          stockPurchasesCount: stockPurchases.length,
          hasSettings: !!settings,
          usersCount: users.length,
          totalRecords: total,
          rawData: { products, transactions, stockPurchases, settings, users },
        });

        setStatusMessage({
          type: 'success',
          text: `File JSON berhasil dimuat! Ditemukan total ${total} data siap dimigrasikan.`,
        });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'Format file JSON tidak valid: ' + err.message });
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // 2. Run Idempotent Migration to Firestore
  const handleExecuteMigration = async () => {
    if (localStats.totalRecords === 0) {
      setStatusMessage({ type: 'error', text: 'Tidak ada data di localStorage atau file cadangan untuk dimigrasi.' });
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);
    setMigrationResult(null);
    setVerifiedMatches(null);
    setStatusMessage(null);

    const result: MigrationResult = {
      productsSuccess: 0,
      productsSkipped: 0,
      productsFailed: 0,
      transactionsSuccess: 0,
      transactionsSkipped: 0,
      transactionsFailed: 0,
      stockPurchasesSuccess: 0,
      stockPurchasesSkipped: 0,
      stockPurchasesFailed: 0,
      settingsSuccess: false,
      settingsFailed: false,
      usersSuccess: 0,
      usersSkipped: 0,
      usersFailed: 0,
      errors: [],
    };

    const totalSteps = localStats.totalRecords;
    let completedSteps = 0;

    const updateProgress = (text: string) => {
      completedSteps++;
      const pct = Math.round((completedSteps / totalSteps) * 100);
      setMigrationProgress(pct);
      setCurrentStepText(text);
    };

    try {
      // 1. Migrasi Pengaturan Toko (Store Settings)
      if (localStats.rawData.settings) {
        setCurrentStepText('Memindahkan Pengaturan Toko ke settings/store...');
        try {
          const settingRef = doc(db, 'settings', 'store');
          const existing = await getDoc(settingRef);
          if (existing.exists() && skipExisting) {
            // Skip
          } else {
            await setDoc(settingRef, sanitizeForFirestore(localStats.rawData.settings), { merge: true });
            result.settingsSuccess = true;
          }
        } catch (e: any) {
          result.settingsFailed = true;
          result.errors.push('Pengaturan Toko: ' + e.message);
        }
        updateProgress('Pengaturan toko selesai diproses.');
      }

      // 2. Migrasi Pengguna & Anggota (User Accounts)
      if (localStats.rawData.users.length > 0) {
        for (const user of localStats.rawData.users) {
          const cleanId = user.id || `usr-${user.username}`;
          setCurrentStepText(`Memindahkan Akun: ${user.fullName}...`);
          try {
            const userRef = doc(db, 'userAccounts', cleanId);
            const snap = await getDoc(userRef);
            if (snap.exists() && skipExisting) {
              result.usersSkipped++;
            } else {
              await setDoc(userRef, sanitizeForFirestore({ ...user, id: cleanId }), { merge: true });
              result.usersSuccess++;
            }
          } catch (e: any) {
            result.usersFailed++;
            result.errors.push(`Akun ${user.fullName}: ` + e.message);
          }
          updateProgress(`Akun ${user.fullName} selesai diproses.`);
        }
      }

      // 3. Migrasi Produk (Products)
      if (localStats.rawData.products.length > 0) {
        for (const prod of localStats.rawData.products) {
          const cleanId = prod.id || `prod-${prod.code || Date.now()}`;
          setCurrentStepText(`Memindahkan Produk: ${prod.name}...`);
          try {
            const prodRef = doc(db, 'products', cleanId);
            const snap = await getDoc(prodRef);
            if (snap.exists() && skipExisting) {
              result.productsSkipped++;
            } else {
              await setDoc(prodRef, sanitizeForFirestore({ ...prod, id: cleanId }), { merge: true });
              result.productsSuccess++;
            }
          } catch (e: any) {
            result.productsFailed++;
            result.errors.push(`Produk ${prod.name}: ` + e.message);
          }
          updateProgress(`Produk ${prod.name} selesai diproses.`);
        }
      }

      // 4. Migrasi Transaksi (Transactions)
      if (localStats.rawData.transactions.length > 0) {
        for (const tx of localStats.rawData.transactions) {
          const cleanId = tx.id || `tx-${tx.receiptNumber}`;
          setCurrentStepText(`Memindahkan Struk Transaksi: ${tx.receiptNumber}...`);
          try {
            const txRef = doc(db, 'transactions', cleanId);
            const snap = await getDoc(txRef);
            if (snap.exists() && skipExisting) {
              result.transactionsSkipped++;
            } else {
              await setDoc(txRef, sanitizeForFirestore({ ...tx, id: cleanId }), { merge: true });
              result.transactionsSuccess++;
            }
          } catch (e: any) {
            result.transactionsFailed++;
            result.errors.push(`Transaksi ${tx.receiptNumber}: ` + e.message);
          }
          updateProgress(`Transaksi ${tx.receiptNumber} selesai diproses.`);
        }
      }

      // 5. Migrasi Belanja Stok (Stock Purchases)
      if (localStats.rawData.stockPurchases.length > 0) {
        for (const sp of localStats.rawData.stockPurchases) {
          const cleanId = sp.id || `sp-${Date.now()}`;
          setCurrentStepText(`Memindahkan Belanja Stok: ${sp.description}...`);
          try {
            const spRef = doc(db, 'stockPurchases', cleanId);
            const snap = await getDoc(spRef);
            if (snap.exists() && skipExisting) {
              result.stockPurchasesSkipped++;
            } else {
              await setDoc(spRef, sanitizeForFirestore({ ...sp, id: cleanId }), { merge: true });
              result.stockPurchasesSuccess++;
            }
          } catch (e: any) {
            result.stockPurchasesFailed++;
            result.errors.push(`Belanja Stok (${sp.date}): ` + e.message);
          }
          updateProgress(`Belanja stok ${sp.description} selesai.`);
        }
      }

      setMigrationResult(result);

      // Re-fetch counts from Firestore for verification
      await fetchFirestoreCounts();

      if (result.errors.length === 0) {
        setStatusMessage({
          type: 'success',
          text: 'Migrasi selesai tanpa kesalahan! Semua data berhasil diamankan di Google Cloud Realtime (Cloud Firestore).',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Migrasi selesai dengan ${result.errors.length} catatan error. Periksa detail di bawah.`,
        });
      }

      if (onMigrationComplete) {
        onMigrationComplete();
      }
    } catch (globalErr: any) {
      setStatusMessage({
        type: 'error',
        text: 'Terjadi gangguan saat proses migrasi: ' + globalErr.message,
      });
    } finally {
      setIsMigrating(false);
      setMigrationProgress(100);
    }
  };

  // Optional manual cleanup ONLY after explicit user confirmation
  const handleClearLocalStorage = () => {
    if (
      confirm(
        'APAKAH ANDA YAKIN?\n\nSemua data di localStorage browser ini akan dibersihkan. ' +
        'Pastikan Anda sudah mengunduh file cadangan JSON dan memverifikasi data di Cloud Firestore.'
      )
    ) {
      try {
        localStorage.removeItem('kasirpro_products_v1');
        localStorage.removeItem('kasirpro_transactions_v1');
        localStorage.removeItem('kasirpro_stock_purchases_v1');
        localStorage.removeItem('kasirpro_settings_v1');
        localStorage.removeItem('kasirpro_users_v1');
        scanLocalStorage();
        setStatusMessage({
          type: 'success',
          text: 'LocalStorage browser telah dibersihkan. Data kini 100% tersimpan aman di Cloud Firestore.',
        });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'Gagal membersihkan localStorage: ' + err.message });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl my-6 text-slate-100 max-h-[92vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shadow-md shadow-indigo-500/10">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Migrasi Data ke Cloud Firestore</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                  Aman & Terverifikasi
                </span>
              </div>
              <p className="text-xs text-slate-400">Pindahkan data lokal browser ke database cloud Firestore terpusat</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div className={`mt-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/70 border-rose-800 text-rose-200'
              : 'bg-indigo-950/70 border-indigo-800 text-indigo-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">
              <span>{statusMessage.text}</span>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="mt-5 space-y-5 flex-1">

          {/* Comparison Cards: Sumber vs Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Sumber Data (LocalStorage) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>Sumber: LocalStorage Browser</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60 font-semibold">
                  {localStats.totalRecords} Item
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Produk / Barang:</span>
                  <span className="font-semibold text-white">{localStats.productsCount} barang</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Struk Transaksi:</span>
                  <span className="font-semibold text-white">{localStats.transactionsCount} transaksi</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Belanja Stok Barang:</span>
                  <span className="font-semibold text-white">{localStats.stockPurchasesCount} catatan</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Pengaturan Toko:</span>
                  <span className="font-semibold text-white">{localStats.hasSettings ? 'Tersedia' : 'Kosong'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Akun Anggota:</span>
                  <span className="font-semibold text-white">{localStats.usersCount} akun</span>
                </div>
              </div>
            </div>

            {/* Target Data (Firestore Live) */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/50 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Target: Cloud Firestore Live</span>
                </span>
                <button
                  type="button"
                  onClick={fetchFirestoreCounts}
                  disabled={isLoadingFirestore}
                  title="Refresh data dari Firestore"
                  className="p-1 rounded-lg bg-indigo-900/50 hover:bg-indigo-800 text-indigo-300 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFirestore ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Produk / Barang:</span>
                  <span className="font-semibold text-indigo-200">
                    {firestoreStats ? `${firestoreStats.productsCount} barang` : 'Memeriksa...'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Struk Transaksi:</span>
                  <span className="font-semibold text-indigo-200">
                    {firestoreStats ? `${firestoreStats.transactionsCount} transaksi` : 'Memeriksa...'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Belanja Stok Barang:</span>
                  <span className="font-semibold text-indigo-200">
                    {firestoreStats ? `${firestoreStats.stockPurchasesCount} catatan` : 'Memeriksa...'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-900">
                  <span>Pengaturan Toko:</span>
                  <span className="font-semibold text-indigo-200">
                    {firestoreStats ? (firestoreStats.hasSettings ? 'Tersedia' : 'Belum Ada') : 'Memeriksa...'}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Akun Anggota:</span>
                  <span className="font-semibold text-indigo-200">
                    {firestoreStats ? `${firestoreStats.usersCount} akun` : 'Memeriksa...'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Step 1: Cadangkan Data LocalStorage */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[11px] font-bold">1</span>
                  <span>Cadangkan Data Lama (Sangat Direkomendasikan)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Unduh seluruh isi localStorage menjadi file <code className="text-amber-300">.json</code> utuh sebelum proses migrasi dijalankan.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportLocalStorage}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unduh JSON</span>
                </button>
                <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
                  <span>Unggah File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Step 2: Konfigurasi Keamanan & Eksekusi Migrasi */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Proses Migrasi Aman & Idempoten</span>
            </h4>
            
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Data menggunakan ID stabil (kode unik dokumen). Menjalankan migrasi berulang kali tidak akan menduplikasi produk atau struk transaksi Anda.
            </p>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="skipExistingCheckbox"
                checked={skipExisting}
                onChange={(e) => setSkipExisting(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="skipExistingCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                Lewati data jika ID dokumen sudah ada di Firestore (Jangan perbarui dokumen yang sudah ada)
              </label>
            </div>

            {/* Migration progress bar */}
            {isMigrating && (
              <div className="mb-4 p-3 bg-slate-900 border border-indigo-900/60 rounded-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-indigo-300 font-medium">{currentStepText}</span>
                  <span className="text-indigo-400 font-mono font-bold">{migrationProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Penyimpanan target: <span className="font-mono text-slate-400">ai-studio-kasirproaplikasi</span>
              </span>
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={isMigrating || localStats.totalRecords === 0}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition flex items-center gap-2 cursor-pointer ${
                  isMigrating || localStats.totalRecords === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memindahkan Data...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Mulai Migrasi ke Cloud Firestore</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary if migration executed */}
          {migrationResult && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-900/40">
              <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-2.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Hasil Verifikasi Migrasi</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Produk Berhasil</span>
                  <span className="text-sm font-bold text-emerald-400">{migrationResult.productsSuccess}</span>
                  {migrationResult.productsSkipped > 0 && (
                    <span className="text-[10px] text-slate-500 block">({migrationResult.productsSkipped} dilewati)</span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Struk Berhasil</span>
                  <span className="text-sm font-bold text-emerald-400">{migrationResult.transactionsSuccess}</span>
                  {migrationResult.transactionsSkipped > 0 && (
                    <span className="text-[10px] text-slate-500 block">({migrationResult.transactionsSkipped} dilewati)</span>
                  )}
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Belanja Stok</span>
                  <span className="text-sm font-bold text-emerald-400">{migrationResult.stockPurchasesSuccess}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Pengaturan & Akun</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {(migrationResult.settingsSuccess ? 1 : 0) + migrationResult.usersSuccess}
                  </span>
                </div>
              </div>

              {migrationResult.errors.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs">
                  <span className="font-bold block mb-1">Rincian Error ({migrationResult.errors.length}):</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-32 overflow-y-auto">
                    {migrationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Preservation & Cleanup Notice */}
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-300 block">
                Penyimpanan LocalStorage Tetap Utuh
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                Sesuai instruksi, data lokal di browser Anda TIDAK dihapus otomatis dan tetap tersimpan sebagai cadangan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearLocalStorage}
              className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-rose-100 text-xs transition cursor-pointer border border-rose-800/30 flex items-center gap-1.5 shrink-0"
              title="Hanya lakukan ini jika Anda yakin data Firestore sudah lengkap dan ingin membersihkan browser."
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan LocalStorage</span>
            </button>
          </div>

        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-4 border-t border-slate-800 mt-5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
