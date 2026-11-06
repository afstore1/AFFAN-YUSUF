export type UserRole = 'super_admin' | 'anggota';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone: string;
  email?: string;
  avatarColor: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  code: string; // SKU or Barcode
  name: string;
  category: string;
  price: number; // Harga Jual
  costPrice: number; // Harga Modal / Beli
  stock: number; // Jumlah Barang saat ini
  unit: string; // pcs, botol, bks, kg, dll
  imageUrl?: string; // Foto produk yang diinput sendiri
  iconEmoji?: string; // Optional legacy
  description?: string;
  minStockAlert: number;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent?: number;
  notes?: string;
}

export interface TransactionItem {
  productId: string;
  code: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface Transaction {
  id: string;
  receiptNumber: string;
  date: string;
  cashierId: string;
  cashierName: string;
  cashierRole: UserRole;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'qris' | 'debit' | 'transfer';
  cashGiven: number;
  change: number;
  customerName?: string;
  note?: string;
}

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogoUrl?: string; // Logo kustom toko / aplikasi
  footerMessage: string;
  enableSound: boolean;
  enableTax: boolean;
  taxRatePercent: number;
}

export interface StockPurchase {
  id: string;
  date: string; // Tanggal belanja stok barang
  amount: number; // Nominal belanja (Rp)
  description: string; // Keterangan
  createdAt: string;
}

export type NavTab = 'pos' | 'products' | 'members' | 'reports' | 'bku' | 'bkb' | 'settings';

export interface CashEntry {
  id: string;
  type: 'in' | 'out'; // in = Penerimaan / Masuk (Debet), out = Pengeluaran / Keluar (Kredit)
  category: string; // e.g. 'Penjualan Kasir', 'Belanja Stok Barang', 'Operasional Toko', 'Modal Masuk', 'Lain-lain'
  amount: number;
  date: string;
  description: string;
  referenceNo?: string;
  paymentMethod: 'cash' | 'bank' | 'qris';
  recordedBy: string;
  createdAt: string;
}
