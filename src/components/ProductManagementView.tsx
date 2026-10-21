import React, { useState, useMemo, useRef } from 'react';
import { usePos } from '../context/PosContext';
import { Product } from '../types';
import { formatRupiah, generateSKU } from '../utils/format';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  RotateCcw,
  Upload,
  Image as ImageIcon,
  X,
  AlertTriangle,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

export const ProductManagementView: React.FC = () => {
  const { currentUser, products, addProduct, updateProduct, deleteProduct, adjustStock } = usePos();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal Add / Edit Product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Sembako');
  const [formPrice, setFormPrice] = useState<number>(10000);
  const [formCostPrice, setFormCostPrice] = useState<number>(8000);
  const [formStock, setFormStock] = useState<number>(20);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formMinAlert, setFormMinAlert] = useState<number>(5);
  const [formError, setFormError] = useState('');
  const [isUrlInputMode, setIsUrlInputMode] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract all existing unique categories
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    // Add default common suggestions if list is small
    const defaults = ['Sembako', 'Makanan', 'Minuman', 'Snack', 'Perawatan', 'Kebutuhan Rumah', 'Elektronik', 'Alat Tulis'];
    defaults.forEach(d => set.add(d));
    return Array.from(set);
  }, [products]);

  // Categories list for filter tabs (only from actual products)
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Handle Image File Upload & compress
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Mohon pilih file gambar yang valid (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        // Compress image to reasonable resolution for local storage
        const canvas = document.createElement('canvas');
        const maxDim = 400;
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
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormImageUrl(compressedDataUrl);
          setFormError('');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Open Add Product Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormCode(generateSKU('BRG'));
    setFormName('');
    setFormCategory('Sembako');
    setFormPrice(15000);
    setFormCostPrice(12000);
    setFormStock(25);
    setFormUnit('pcs');
    setFormImageUrl('');
    setFormMinAlert(5);
    setFormError('');
    setIsUrlInputMode(false);
    setIsModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormCode(product.code);
    setFormName(product.name);
    setFormCategory(product.category);
    setFormPrice(product.price);
    setFormCostPrice(product.costPrice || Math.round(product.price * 0.8));
    setFormStock(product.stock);
    setFormUnit(product.unit || 'pcs');
    setFormImageUrl(product.imageUrl || '');
    setFormMinAlert(product.minStockAlert || 5);
    setFormError('');
    setIsUrlInputMode(Boolean(product.imageUrl && product.imageUrl.startsWith('http')));
    setIsModalOpen(true);
  };

  // Save product (Add or Edit)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Nama barang wajib diisi.');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Kode/Barcode barang wajib diisi.');
      return;
    }
    if (!formCategory.trim()) {
      setFormError('Kategori barang wajib diisi.');
      return;
    }
    if (formPrice <= 0) {
      setFormError('Harga jual barang harus lebih besar dari 0.');
      return;
    }

    if (editingProduct) {
      const res = updateProduct(editingProduct.id, {
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory.trim(),
        price: formPrice,
        costPrice: formCostPrice,
        stock: formStock,
        unit: formUnit,
        imageUrl: formImageUrl.trim() || undefined,
        minStockAlert: formMinAlert,
      });
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.message);
      }
    } else {
      const res = addProduct({
        code: formCode.trim(),
        name: formName.trim(),
        category: formCategory.trim(),
        price: formPrice,
        costPrice: formCostPrice,
        stock: formStock,
        unit: formUnit,
        imageUrl: formImageUrl.trim() || undefined,
        minStockAlert: formMinAlert,
      });
      if (res.success) {
        setIsModalOpen(false);
      } else {
        setFormError(res.message);
      }
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === 'Semua' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.stock > 0 && p.stock <= p.minStockAlert;
      } else if (stockFilter === 'out') {
        matchesStock = p.stock <= 0;
      }

      return matchesSearch && matchesCat && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Header & Role Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Katalog & Manajemen Stok Barang
              {isSuperAdmin && (
                <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Hak Penuh Super Admin
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Kelola daftar barang, kategori bebas, foto produk sendiri, stok, dan harga jual
            </p>
          </div>
        </div>

        {/* Action Button: Tambah Barang Baru (Super Admin only) */}
        <div>
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Barang Baru</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Hanya Super Admin yang dapat menambah/mengubah barang</span>
            </div>
          )}
        </div>
      </div>

      {/* Role Notice for Anggota */}
      {!isSuperAdmin && (
        <div className="p-3.5 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-300">Mode Anggota (Kasir) - Katalog Informasi:</p>
            <p className="text-blue-200/80 mt-0.5">
              Anda dapat mencari barang, mengecek ketersediaan jumlah stok, dan melihat harga resmi untuk pelanggan. Untuk memasukkan barang baru, foto baru, atau mengubah kategori, silakan minta Super Admin.
            </p>
          </div>
        </div>
      )}

      {/* Search & Dynamic Category Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang atau kode barcode..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="md:col-span-4 flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Kategori:</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          >
            {productCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Status Stok:</label>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="all">Semua Stok ({products.length})</option>
            <option value="low">Stok Menipis (≤5)</option>
            <option value="out">Stok Habis (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table with Real Photos (No emojis) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Foto & Barang</th>
                <th className="py-3 px-4">Kategori & Kode</th>
                {isSuperAdmin && <th className="py-3 px-4">Harga Modal</th>}
                <th className="py-3 px-4">Harga Jual</th>
                <th className="py-3 px-4">Jumlah Stok</th>
                {isSuperAdmin && <th className="py-3 px-4 text-right">Aksi Super Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 4} className="py-12 text-center text-slate-500">
                    Tidak ada barang yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;
                  const profitMargin = product.price - (product.costPrice || 0);

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/40 transition">
                      
                      {/* Photo Thumbnail & Name (NO EMOJIS) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-inner relative">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                                {product.name.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs sm:text-sm">{product.name}</p>
                            {product.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-1">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kategori & SKU */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 text-purple-300 border border-purple-800/60 text-[11px] font-semibold">
                          {product.category}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono mt-1">{product.code}</p>
                      </td>

                      {/* Harga Modal (Super Admin only) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4">
                          <p className="text-slate-400 font-medium">{formatRupiah(product.costPrice || 0)}</p>
                          <p className="text-[10px] text-emerald-400 font-medium">
                            Laba: +{formatRupiah(profitMargin)}
                          </p>
                        </td>
                      )}

                      {/* Harga Jual */}
                      <td className="py-3 px-4">
                        <p className="font-extrabold text-white text-xs sm:text-sm">
                          {formatRupiah(product.price)}
                        </p>
                        <p className="text-[10px] text-slate-400">per {product.unit || 'pcs'}</p>
                      </td>

                      {/* Jumlah Stok Barang */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs sm:text-sm ${
                              isOutOfStock
                                ? 'text-rose-400'
                                : isLowStock
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {product.stock} {product.unit}
                          </span>
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                              Habis
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              Menipis
                            </span>
                          ) : null}
                        </div>

                        {/* Quick stock adjustments for Super Admin */}
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <button
                              type="button"
                              onClick={() => adjustStock(product.id, 5)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                              title="Tambah stok +5"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustStock(product.id, 10)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                              title="Tambah stok +10"
                            >
                              +10
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustStock(product.id, 50)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 border border-slate-700 transition cursor-pointer"
                              title="Tambah stok +50"
                            >
                              +50
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Action buttons (Super Admin) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/60 hover:text-purple-300 text-slate-300 transition cursor-pointer"
                              title="Edit Barang & Foto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus barang "${product.name}"?`)) {
                                  deleteProduct(product.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition cursor-pointer"
                              title="Hapus Barang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tambah Barang / Edit Barang (Custom Category & Own Photo Input) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl my-6 text-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingProduct ? 'Edit Data Barang' : 'Tambah Barang Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Atur nama, kategori kustom, harga, stok, dan foto produk</p>
                </div>
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
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              
              {/* Photo Input Section (Upload File or URL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Foto Produk (Input Foto Sendiri)
                </label>
                <div className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                  {/* Photo Preview Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {formImageUrl ? (
                      <>
                        <img
                          src={formImageUrl}
                          alt="Preview Foto"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFormImageUrl('')}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/80 text-rose-400 hover:text-white transition"
                          title="Hapus Foto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <ImageIcon className="w-6 h-6 mb-1 text-slate-600" />
                        <span className="text-[9px]">Belum Ada</span>
                      </div>
                    )}
                  </div>

                  {/* Upload and URL Controls */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih Foto dari Perangkat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsUrlInputMode(!isUrlInputMode)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                        title="Input via URL web"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isUrlInputMode ? (
                      <input
                        type="url"
                        value={formImageUrl}
                        onChange={e => setFormImageUrl(e.target.value)}
                        placeholder="Tempel link URL foto (https://...)"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Bisa pilih file foto langsung dari galeri HP atau komputer Anda.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Barang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Contoh: Beras Rojo Lele 5kg"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Kategori Bebas Diisi & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kode Barcode / SKU */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Kode / Barcode <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormCode(generateSKU('BRG'))}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Auto SKU
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="Contoh: 89912345"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Kategori Bebas Diisi sesuai keinginan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kategori Barang (Bebas Diisi) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      list="category-suggestions"
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      placeholder="Ketik kategori bebas..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <datalist id="category-suggestions">
                      {existingCategories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Quick tags for existing categories */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500">Pilihan cepat:</span>
                {existingCategories.slice(0, 7).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormCategory(cat)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      formCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-purple-900/60 text-purple-200 border-purple-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Harga Modal & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Beli / Modal (Rp) <span className="text-slate-500 font-normal">(Nominal Bulat)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formCostPrice || ''}
                    onChange={e => setFormCostPrice(Number(e.target.value) || 0)}
                    placeholder="8000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Harga Jual Pelanggan (Rp) <span className="text-rose-400">*</span> <span className="text-slate-500 font-normal">(Nominal Bulat)</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={formPrice || ''}
                    onChange={e => setFormPrice(Number(e.target.value) || 0)}
                    placeholder="10000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Jumlah Stok & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jumlah Barang (Stok Awal) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={e => setFormStock(Number(e.target.value) || 0)}
                    placeholder="20"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Satuan Barang
                  </label>
                  <input
                    type="text"
                    list="unit-suggestions"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="pcs, kg, btl, karung"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <datalist id="unit-suggestions">
                    <option value="pcs" />
                    <option value="karung" />
                    <option value="bks" />
                    <option value="btl" />
                    <option value="kg" />
                    <option value="dus" />
                    <option value="ktk" />
                    <option value="pouch" />
                    <option value="tube" />
                    <option value="renceng" />
                  </datalist>
                </div>
              </div>

              {/* Submit Buttons */}
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
                  {editingProduct ? 'Simpan Perubahan' : 'Tambahkan Barang'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
