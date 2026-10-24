import React, { useState, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { 
  Settings, 
  X, 
  Save, 
  RotateCcw, 
  Store, 
  Volume2, 
  CheckCircle2, 
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  RefreshCw,
  Download,
  Database,
  CloudCheck,
  AlertCircle
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    updateSettings, 
    resetAllData, 
    syncStatus, 
    lastSyncTime, 
    syncWithServer, 
    exportBackupData, 
    importBackupData 
  } = usePos();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [storeAddress, setStoreAddress] = useState(settings.storeAddress);
  const [storePhone, setStorePhone] = useState(settings.storePhone);
  const [storeLogoUrl, setStoreLogoUrl] = useState(settings.storeLogoUrl || '');
  const [footerMessage, setFooterMessage] = useState(settings.footerMessage);
  const [enableSound, setEnableSound] = useState(settings.enableSound);
  const [enableTax, setEnableTax] = useState(settings.enableTax);
  const [taxRatePercent, setTaxRatePercent] = useState(settings.taxRatePercent);
  const [isUrlMode, setIsUrlMode] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Logo Upload
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          setStoreLogoUrl(compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle JSON Backup Import
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const res = await importBackupData(parsed);
        setSyncFeedback(res.message);
        setTimeout(() => setSyncFeedback(null), 4000);
      } catch (err: any) {
        setSyncFeedback('File JSON tidak valid: ' + err.message);
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleManualSync = async () => {
    const res = await syncWithServer(false);
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName: storeName.trim() || 'AFSTORE',
      storeAddress: storeAddress.trim(),
      storePhone: storePhone.trim(),
      storeLogoUrl: storeLogoUrl.trim(),
      footerMessage: footerMessage.trim(),
      enableSound,
      enableTax,
      taxRatePercent: Number(taxRatePercent) || 11,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    if (
      confirm(
        'PERINGATAN: Apakah Anda yakin ingin mereset semua data produk, transaksi, dan akun ke data bawaan awal AFSTORE?'
      )
    ) {
      resetAllData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Pengaturan Toko & Sinkronisasi</h3>
              <p className="text-xs text-slate-400">Atur profil toko, upload logo, sinkronisasi antar akun Google & cadangan data</p>
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

        {savedSuccess && (
          <div className="mt-3 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Pengaturan berhasil disimpan dan disinkronkan ke server cloud!</span>
          </div>
        )}

        {syncFeedback && (
          <div className="mt-3 p-3 bg-indigo-950/60 border border-indigo-800 rounded-xl text-xs text-indigo-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Section: Multi-Account Cloud Sync & Backup Data */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-indigo-900/50 shadow-inner">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-indigo-200">Sinkronisasi Cloud & Multi-Akun Google</h4>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : syncStatus === 'syncing'
                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {syncStatus === 'synced' ? 'Cloud Realtime Aktif' : syncStatus === 'syncing' ? 'Menyinkronkan...' : 'Offline'}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Data transaksi, barang, dan stok otomatis tersimpan di Google Cloud Realtime Database (Cloud Firestore). Saat Anda membuka aplikasi dari akun Google lain, laptop, atau smartphone kasir, data langsung terupdate secara real-time.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Sekarang</span>
            </button>

            <button
              type="button"
              onClick={exportBackupData}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Cadangan (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Pulihkan Cadangan</span>
            </button>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleJsonFileChange}
              className="hidden"
            />
          </div>

          {lastSyncTime && (
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              Terakhir tersinkronisasi: {lastSyncTime} WIB
            </p>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          
          {/* Logo Upload Section */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Logo Toko / Ikon Aplikasi Kustom</span>
              </label>
              <button
                type="button"
                onClick={() => setIsUrlMode(!isUrlMode)}
                className="text-[11px] text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                {isUrlMode ? <ImageIcon className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                <span>{isUrlMode ? 'Upload dari File Foto' : 'Gunakan URL Foto'}</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Preview Box */}
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0 bg-white/5">
                {storeLogoUrl ? (
                  <img
                    src={storeLogoUrl}
                    alt="Logo Toko"
                    className="w-full h-full object-contain p-1 bg-white"
                  />
                ) : (
                  <Store className="w-8 h-8 text-slate-600" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                {!isUrlMode ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pilih Foto dari Komputer / HP</span>
                      </button>
                      {storeLogoUrl && (
                        <button
                          type="button"
                          onClick={() => setStoreLogoUrl('')}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs transition cursor-pointer border border-rose-800/40"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Mendukung format PNG, JPG, WebP. Logo otomatis dikompres dan disimpan.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={storeLogoUrl}
                      onChange={e => setStoreLogoUrl(e.target.value)}
                      placeholder="https://contoh.com/logo-toko.png"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Tempel tautan URL gambar logo yang dapat diakses publik.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Toko / Usaha
            </label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="AFSTORE"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Alamat Lengkap Toko
            </label>
            <textarea
              rows={2}
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
              placeholder="Jl. Raya Utama No. 88, Jakarta"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nomor Telepon Toko
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={e => setStorePhone(e.target.value)}
                placeholder="0812-9988-7711"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tarif PPN (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRatePercent}
                onChange={e => setTaxRatePercent(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Catatan / Pesan Kaki Pada Struk
            </label>
            <textarea
              rows={2}
              value={footerMessage}
              onChange={e => setFooterMessage(e.target.value)}
              placeholder="Terima kasih atas kunjungan Anda di AFSTORE!"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Sound & Tax toggles */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Efek Suara Kasir (Beep & Bunyi Sukses)</span>
              </span>
              <input
                type="checkbox"
                checked={enableSound}
                onChange={e => setEnableSound(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-300 block">
                  Aktifkan Pajak Pertambahan Nilai (PPN)
                </span>
                <span className="text-[11px] text-slate-500">
                  Secara otomatis dihitung pada struk belanja
                </span>
              </div>
              <input
                type="checkbox"
                checked={enableTax}
                onChange={e => setEnableTax(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Bawaan</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
