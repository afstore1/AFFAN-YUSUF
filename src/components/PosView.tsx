import React, { useState, useMemo } from 'react';
import { usePos } from '../context/PosContext';
import { Product, Transaction } from '../types';
import { formatRupiah } from '../utils/format';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ScanLine, 
  Package, 
  ArrowRight, 
  Sparkles,
  ShoppingBag,
  Info
} from 'lucide-react';

export const PosView: React.FC = () => {
  const { 
    currentUser, 
    products, 
    cart, 
    addToCart, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart,
    setActiveTab
  } = usePos();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [barcodeInput, setBarcodeInput] = useState('');

  // Modals
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === 'Semua' || p.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase();
      return matchSearch && matchCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Quick Barcode Scan Simulation on Enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const found = products.find(
      p => p.code.toLowerCase() === barcodeInput.trim().toLowerCase()
    );
    if (found) {
      if (found.stock > 0) {
        addToCart(found, 1);
        setBarcodeInput('');
      } else {
        alert(`Stok barang "${found.name}" sedang habis!`);
      }
    } else {
      alert(`Barang dengan kode barcode "${barcodeInput}" tidak ditemukan.`);
    }
  };

  // Cart summary calculations
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Kasir Penjualan POS
              {currentUser?.role === 'super_admin' ? (
                <span className="text-[10px] bg-purple-900/50 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full font-semibold">
                  Akses Super Admin
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-semibold">
                  Akses Anggota Kasir
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Pilih barang untuk dimasukkan ke keranjang dan cetak struk pembayaran resmi
            </p>
          </div>
        </div>

        {/* Quick action for Super Admin to add new items */}
        {currentUser?.role === 'super_admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-purple-600/20 transition cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        )}
      </div>

      {/* Main Grid: Catalog (Left) + Cart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT SECTION: Search, Categories, Products Catalog (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          
          {/* Search Bar & Barcode Scanner */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang atau kode..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Barcode Scan input */}
            <form onSubmit={handleBarcodeSubmit} className="sm:col-span-5 relative">
              <ScanLine className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                placeholder="Scan / Ketik Barcode [Enter]"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </form>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-bold text-sm">Barang Tidak Ditemukan</p>
              <p className="text-slate-500 text-xs mt-1">
                Tidak ada barang yang cocok dengan kata kunci "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(product => {
                const inCart = cart.find(ci => ci.product.id === product.id);
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= product.minStockAlert;

                return (
                  <div
                    key={product.id}
                    className={`group relative bg-slate-900 border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 shadow-md ${
                      isOutOfStock
                        ? 'border-slate-800/60 opacity-60'
                        : 'border-slate-800 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      {/* Product Photo & Stock Badge Overlay */}
                      <div className="w-full h-28 sm:h-32 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden mb-2 relative group-hover:scale-[1.02] transition-transform">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800/80 flex flex-col items-center justify-center text-slate-500">
                            <Package className="w-8 h-8 mb-1 text-slate-600" />
                            <span className="text-[10px] uppercase font-bold text-slate-400">{product.name.slice(0, 3)}</span>
                          </div>
                        )}

                        {/* Stok Status Badge */}
                        <div className="absolute top-1.5 right-1.5">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-800/80 shadow-md">
                              Habis
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-800/80 shadow-md">
                              Sisa {product.stock} {product.unit}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-950/80 text-emerald-300 border border-emerald-800/60 backdrop-blur-sm shadow-md">
                              Stok: {product.stock}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Product Name & SKU */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-500 font-mono tracking-tight">
                          {product.code}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 font-medium truncate max-w-[90px]">
                          {product.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-100 text-xs sm:text-sm line-clamp-2 mt-0.5 leading-snug group-hover:text-emerald-300 transition-colors">
                        {product.name}
                      </h3>
                    </div>

                    {/* Price and Add button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Harga</span>
                        <span className="text-xs sm:text-sm font-extrabold text-white">
                          {formatRupiah(product.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => addToCart(product, 1)}
                        className={`p-2 rounded-xl flex items-center justify-center transition cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : inCart
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40'
                            : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
                        }`}
                        title={isOutOfStock ? 'Stok Habis' : 'Tambah ke Keranjang'}
                      >
                        <Plus className="w-4 h-4" />
                        {inCart && (
                          <span className="ml-1 text-xs font-bold">{inCart.quantity}</span>
                        )}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* RIGHT SECTION: Cart & POS Checkout Panel (4-5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl sticky top-20 flex flex-col justify-between min-h-[550px]">
          
          <div>
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm sm:text-base text-white">Keranjang Kasir</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  {totalItemCount} item
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition cursor-pointer"
                  title="Hapus semua item dari keranjang"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <ShoppingCart className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-300 font-bold text-sm">Keranjang Masih Kosong</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                  Pilih barang dari katalog di sebelah kiri untuk memulai transaksi belanja.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 max-h-[350px] overflow-y-auto pr-1 my-2">
                {cart.map(item => (
                  <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                    
                    {/* Item info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {formatRupiah(item.product.price)} / {item.product.unit}
                        </p>
                      </div>
                    </div>

                    {/* Qty controller */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      <span className="w-7 text-center font-bold text-xs text-white">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        disabled={item.quantity >= item.product.stock}
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition cursor-pointer ${
                          item.quantity >= item.product.stock
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                        title={item.quantity >= item.product.stock ? 'Mencapai batas stok' : 'Tambah Qty'}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right shrink-0 min-w-[70px]">
                      <p className="text-xs font-bold text-emerald-400">
                        {formatRupiah(item.product.price * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[10px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* Cart Bottom Summary & Checkout Button */}
          <div className="pt-4 border-t border-slate-800 mt-auto space-y-3">
            
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemCount} barang)</span>
                <span className="font-medium text-slate-200">{formatRupiah(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/80">
                <span className="text-sm font-bold text-white">Total Tagihan:</span>
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-400">
                  {formatRupiah(cartSubtotal)}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsPaymentOpen(true)}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-[0.99]'
              }`}
            >
              <span>Bayar & Cetak Struk</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>

        </div>

      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onSuccess={tx => setLastTransaction(tx)}
      />

      {/* Thermal Receipt Modal */}
      <ReceiptModal
        transaction={lastTransaction}
        onClose={() => setLastTransaction(null)}
        onNewTransaction={() => {
          setLastTransaction(null);
        }}
      />

    </div>
  );
};
