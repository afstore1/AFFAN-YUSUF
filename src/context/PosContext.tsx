import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserAccount, Product, CartItem, Transaction, StoreSettings, UserRole, StockPurchase } from '../types';
import { INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_TRANSACTIONS, INITIAL_STOCK_PURCHASES } from '../data/initialData';
import { sound } from '../utils/sound';
import { generateReceiptNumber } from '../utils/format';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface PosContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  products: Product[];
  cart: CartItem[];
  transactions: Transaction[];
  stockPurchases: StockPurchase[];
  settings: StoreSettings;
  activeTab: 'pos' | 'products' | 'members' | 'reports' | 'settings';
  setActiveTab: (tab: 'pos' | 'products' | 'members' | 'reports' | 'settings') => void;
  // Cloud & Multi-account Sync
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  syncWithServer: (silent?: boolean) => Promise<{ success: boolean; message: string }>;
  exportBackupData: () => void;
  importBackupData: (data: any) => Promise<{ success: boolean; message: string }>;
  // Auth methods
  login: (username: string, password: string, requiredRole: UserRole) => { success: boolean; message: string };
  logout: () => void;
  // Member methods (Super Admin only)
  addUser: (userData: Omit<UserAccount, 'id' | 'createdAt'>) => { success: boolean; message: string };
  updateUser: (id: string, updates: Partial<UserAccount>) => { success: boolean; message: string };
  deleteUser: (id: string) => { success: boolean; message: string };
  // Product methods (Super Admin for mutating)
  addProduct: (productData: Omit<Product, 'id'>) => { success: boolean; message: string };
  updateProduct: (id: string, updates: Partial<Product>) => { success: boolean; message: string };
  deleteProduct: (id: string) => { success: boolean; message: string };
  adjustStock: (id: string, deltaAmount: number) => void;
  updateProductStock: (id: string, newStock: number) => { success: boolean; message: string };
  // Cart methods
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  // Transactions & Checkout
  completeTransaction: (data: {
    paymentMethod: 'cash' | 'qris' | 'debit' | 'transfer';
    cashGiven: number;
    discountAmount?: number;
    customerName?: string;
    note?: string;
  }) => { success: boolean; transaction?: Transaction; error?: string };
  deleteTransaction: (id: string, restoreStock?: boolean) => { success: boolean; message: string };
  // Stock Purchase (Update Stok Barang: Nominal Belanja, Tanggal, Keterangan)
  addStockPurchase: (data: { date: string; amount: number; description: string }) => { success: boolean; message: string };
  updateStockPurchase: (id: string, data: { date: string; amount: number; description: string }) => { success: boolean; message: string };
  deleteStockPurchase: (id: string) => { success: boolean; message: string };
  // Settings & Reset
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetAllData: () => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USERS: 'kasirpro_users_v1',
  PRODUCTS: 'kasirpro_products_v1',
  TRANSACTIONS: 'kasirpro_transactions_v1',
  STOCK_PURCHASES: 'kasirpro_stock_purchases_v1',
  SETTINGS: 'kasirpro_settings_v1',
  CURRENT_USER: 'kasirpro_current_user_v1',
};

export const PosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Sync status across devices and accounts
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const initialServerLoadedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Load initial states from localStorage for instant display
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed: UserAccount[] = JSON.parse(saved);
        return parsed.map(u => {
          if (u.role === 'super_admin' && (u.fullName.includes('Ahmad Fauzi') || u.username === 'admin')) {
            return { ...u, fullName: 'AFFAN YUSUF (Super Admin)', email: 'affan.yusuf192@guru.smp.belajar.id' };
          }
          return u;
        });
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed: Product[] = JSON.parse(saved);
        return parsed.map(p => {
          let updated = { ...p };
          if (!updated.imageUrl) {
            const initialMatch = INITIAL_PRODUCTS.find(ip => ip.id === p.id || ip.code === p.code);
            if (initialMatch?.imageUrl) {
              updated.imageUrl = initialMatch.imageUrl;
            }
          }
          // Bulatkan harga dan modal setiap barang ke kelipatan ribuan bulat
          if (updated.price && updated.price % 1000 !== 0) {
            updated.price = Math.round(updated.price / 1000) * 1000;
          }
          if (updated.costPrice && updated.costPrice % 1000 !== 0) {
            updated.costPrice = Math.round(updated.costPrice / 1000) * 1000;
          }
          return updated;
        });
      }
      return INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [stockPurchases, setStockPurchases] = useState<StockPurchase[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STOCK_PURCHASES);
      return saved ? JSON.parse(saved) : INITIAL_STOCK_PURCHASES;
    } catch {
      return INITIAL_STOCK_PURCHASES;
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const parsed: StoreSettings = JSON.parse(saved);
        if (parsed.storeName === 'TOKO BERKAH REZEKI POS' || parsed.storeName === 'TOKO BERKAH REZEKI' || !parsed.storeName) {
          return { ...parsed, storeName: 'AFSTORE' };
        }
        return parsed;
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) {
        const parsed: UserAccount = JSON.parse(saved);
        if (parsed.role === 'super_admin' && (parsed.fullName.includes('Ahmad Fauzi') || parsed.username === 'admin')) {
          return { ...parsed, fullName: 'AFFAN YUSUF (Super Admin)', email: 'affan.yusuf192@guru.smp.belajar.id' };
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'members' | 'reports' | 'settings'>('pos');

  // Cross-tab broadcast channel
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('afstore_sync_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_REQUEST') {
            syncWithServer(true);
          }
        };
        channelRef.current = channel;
        return () => {
          channel.close();
        };
      } catch {}
    }
  }, []);

  // Push changes to server storage
  const pushToServer = async (overrideData?: {
    users?: UserAccount[];
    products?: Product[];
    transactions?: Transaction[];
    stockPurchases?: StockPurchase[];
    settings?: StoreSettings;
  }) => {
    try {
      setSyncStatus('syncing');
      const body = {
        users: overrideData?.users ?? users,
        products: overrideData?.products ?? products,
        transactions: overrideData?.transactions ?? transactions,
        stockPurchases: overrideData?.stockPurchases ?? stockPurchases,
        settings: overrideData?.settings ?? settings,
      };

      // Notify other local tabs immediately
      channelRef.current?.postMessage({ type: 'SYNC_REQUEST' });

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('offline');
    }
  };

  // Pull latest data from server storage
  const syncWithServer = async (silent: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (isSyncingRef.current) return { success: true, message: 'Sinkronisasi sedang berjalan...' };
    isSyncingRef.current = true;
    if (!silent) setSyncStatus('syncing');

    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        if (!silent) setSyncStatus('offline');
        isSyncingRef.current = false;
        return { success: false, message: 'Server penyimpanan belum aktif atau offline.' };
      }

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (Array.isArray(d.users) && d.users.length > 0) {
          setUsers(d.users);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(d.users));
        }
        if (Array.isArray(d.products)) {
          setProducts(d.products);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(d.products));
        }
        if (Array.isArray(d.transactions)) {
          setTransactions(d.transactions);
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(d.transactions));
        }
        if (Array.isArray(d.stockPurchases)) {
          setStockPurchases(d.stockPurchases);
          localStorage.setItem(STORAGE_KEYS.STOCK_PURCHASES, JSON.stringify(d.stockPurchases));
        }
        if (d.settings && d.settings.storeName) {
          setSettings(d.settings);
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(d.settings));
        }

        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
        initialServerLoadedRef.current = true;
        isSyncingRef.current = false;
        return { success: true, message: 'Data toko berhasil disinkronkan dari server AFSTORE!' };
      }
    } catch {
      if (!silent) setSyncStatus('offline');
    }

    isSyncingRef.current = false;
    return { success: false, message: 'Gagal menyinkronkan data dari server.' };
  };

  // Initial pull on mount, window focus, visibility change, and periodic sync (every 8s)
  useEffect(() => {
    syncWithServer(true);

    const handleFocus = () => {
      syncWithServer(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(() => {
      syncWithServer(true);
    }, 8000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  // Save to localStorage whenever local states change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STOCK_PURCHASES, JSON.stringify(stockPurchases));
    } catch {}
  }, [stockPurchases]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch {}
  }, [currentUser]);

  // Export complete JSON backup for manual multi-device / Vercel transfer
  const exportBackupData = () => {
    const backupObj = {
      appName: 'AFSTORE POS',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      storeName: settings.storeName,
      users,
      products,
      transactions,
      stockPurchases,
      settings,
    };
    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AFSTORE_BACKUP_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playSuccess(settings.enableSound);
  };

  // Import JSON backup
  const importBackupData = async (data: any): Promise<{ success: boolean; message: string }> => {
    try {
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Format file cadangan tidak valid.' };
      }

      const newUsers = Array.isArray(data.users) && data.users.length > 0 ? data.users : users;
      const newProducts = Array.isArray(data.products) ? data.products : products;
      const newTransactions = Array.isArray(data.transactions) ? data.transactions : transactions;
      const newStockPurchases = Array.isArray(data.stockPurchases) ? data.stockPurchases : stockPurchases;
      const newSettings = data.settings && typeof data.settings === 'object' ? data.settings : settings;

      setUsers(newUsers);
      setProducts(newProducts);
      setTransactions(newTransactions);
      setStockPurchases(newStockPurchases);
      setSettings(newSettings);

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(newTransactions));
      localStorage.setItem(STORAGE_KEYS.STOCK_PURCHASES, JSON.stringify(newStockPurchases));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));

      await pushToServer({
        users: newUsers,
        products: newProducts,
        transactions: newTransactions,
        stockPurchases: newStockPurchases,
        settings: newSettings,
      });

      sound.playSuccess(settings.enableSound);
      return { success: true, message: 'Data cadangan berhasil dipulihkan dan disinkronkan ke server!' };
    } catch (err: any) {
      return { success: false, message: 'Gagal memulihkan cadangan: ' + err.message };
    }
  };

  // Login handler
  const login = (username: string, pass: string, requiredRole: UserRole): { success: boolean; message: string } => {
    const trimmedUsername = username.trim().toLowerCase();
    const found = users.find(u => u.username.toLowerCase() === trimmedUsername);

    if (!found) {
      return { success: false, message: 'Username tidak ditemukan. Periksa kembali nama akun Anda.' };
    }

    if (found.status === 'inactive') {
      return { success: false, message: 'Akun ini sedang dinonaktifkan oleh Super Admin.' };
    }

    if (found.password !== pass) {
      return { success: false, message: 'Password salah. Silakan coba lagi.' };
    }

    if (found.role !== requiredRole) {
      const correctRoleLabel = found.role === 'super_admin' ? 'Super Admin' : 'Anggota Kasir';
      return {
        success: false,
        message: `Akun ini terdaftar sebagai ${correctRoleLabel}. Silakan klik tab "${correctRoleLabel}" di atas sebelum masuk.`,
      };
    }

    setCurrentUser(found);
    sound.playSuccess(settings.enableSound);
    return { success: true, message: `Selamat datang kembali, ${found.fullName}!` };
  };

  const logout = () => {
    setCurrentUser(null);
    setCart([]);
    sound.playClick(settings.enableSound);
  };

  // Member Management
  const addUser = (userData: Omit<UserAccount, 'id' | 'createdAt'>): { success: boolean; message: string } => {
    const exists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (exists) {
      return { success: false, message: `Username "${userData.username}" sudah digunakan akun lain.` };
    }

    const newUser: UserAccount = {
      ...userData,
      id: `usr-kasir-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    pushToServer({ users: nextUsers });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: `Akun anggota "${newUser.fullName}" berhasil ditambahkan.` };
  };

  const updateUser = (id: string, updates: Partial<UserAccount>): { success: boolean; message: string } => {
    if (updates.username) {
      const exists = users.some(u => u.id !== id && u.username.toLowerCase() === updates.username?.toLowerCase());
      if (exists) {
        return { success: false, message: `Username "${updates.username}" sudah digunakan.` };
      }
    }

    const nextUsers = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    setUsers(nextUsers);
    pushToServer({ users: nextUsers });

    if (currentUser?.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...updates } : null));
    }

    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Data akun berhasil diperbarui.' };
  };

  const deleteUser = (id: string): { success: boolean; message: string } => {
    const target = users.find(u => u.id === id);
    if (!target) {
      return { success: false, message: 'Akun tidak ditemukan.' };
    }

    if (target.role === 'super_admin') {
      return { success: false, message: 'Akun Super Admin utama tidak dapat dihapus.' };
    }

    const nextUsers = users.filter(u => u.id !== id);
    setUsers(nextUsers);
    pushToServer({ users: nextUsers });
    sound.playClick(settings.enableSound);
    return { success: true, message: `Akun "${target.fullName}" berhasil dihapus.` };
  };

  // Product Management
  const addProduct = (productData: Omit<Product, 'id'>): { success: boolean; message: string } => {
    const codeClean = productData.code.trim();
    if (codeClean && products.some(p => p.code.toLowerCase() === codeClean.toLowerCase())) {
      return { success: false, message: `Kode / Barcode "${codeClean}" sudah digunakan barang lain.` };
    }

    // Bulatkan harga jual dan modal ke kelipatan bulat
    const roundedPrice = Math.max(0, Math.round(productData.price));
    const roundedCost = Math.max(0, Math.round(productData.costPrice || 0));

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      price: roundedPrice,
      costPrice: roundedCost,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = [newProduct, ...products];
    setProducts(nextProducts);
    pushToServer({ products: nextProducts });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: `Barang "${newProduct.name}" berhasil ditambahkan.` };
  };

  const updateProduct = (id: string, updates: Partial<Product>): { success: boolean; message: string } => {
    if (updates.code) {
      const codeClean = updates.code.trim();
      const exists = products.some(p => p.id !== id && p.code.toLowerCase() === codeClean.toLowerCase());
      if (exists) {
        return { success: false, message: `Kode / Barcode "${codeClean}" sudah digunakan barang lain.` };
      }
    }

    const nextProducts = products.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
        if (updated.price !== undefined) {
          updated.price = Math.max(0, Math.round(updated.price));
        }
        if (updated.costPrice !== undefined) {
          updated.costPrice = Math.max(0, Math.round(updated.costPrice));
        }
        return updated;
      }
      return p;
    });

    setProducts(nextProducts);
    pushToServer({ products: nextProducts });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Data barang berhasil diperbarui.' };
  };

  const deleteProduct = (id: string): { success: boolean; message: string } => {
    const target = products.find(p => p.id === id);
    if (!target) {
      return { success: false, message: 'Barang tidak ditemukan.' };
    }

    const nextProducts = products.filter(p => p.id !== id);
    setProducts(nextProducts);
    pushToServer({ products: nextProducts });
    setCart(prev => prev.filter(c => c.product.id !== id));
    sound.playClick(settings.enableSound);
    return { success: true, message: `Barang "${target.name}" berhasil dihapus.` };
  };

  const adjustStock = (id: string, deltaAmount: number) => {
    const nextProducts = products.map(p => {
      if (p.id === id) {
        const newStock = Math.max(0, p.stock + deltaAmount);
        return { ...p, stock: newStock, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    setProducts(nextProducts);
    pushToServer({ products: nextProducts });
    sound.playClick(settings.enableSound);
  };

  const updateProductStock = (id: string, newStock: number): { success: boolean; message: string } => {
    const target = products.find(p => p.id === id);
    if (!target) {
      return { success: false, message: 'Barang tidak ditemukan.' };
    }

    const validStock = Math.max(0, Math.round(newStock));
    const nextProducts = products.map(p =>
      p.id === id ? { ...p, stock: validStock, updatedAt: new Date().toISOString() } : p
    );
    setProducts(nextProducts);
    pushToServer({ products: nextProducts });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: `Stok "${target.name}" berhasil diubah menjadi ${validStock} ${target.unit}.` };
  };

  // Cart Management
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      } else {
        return [...prev, { product, quantity }];
      }
    });
    sound.playBeep(settings.enableSound);
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
    sound.playClick(settings.enableSound);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    sound.playClick(settings.enableSound);
  };

  const clearCart = () => {
    setCart([]);
    sound.playClick(settings.enableSound);
  };

  // Checkout
  const completeTransaction = (data: {
    paymentMethod: 'cash' | 'qris' | 'debit' | 'transfer';
    cashGiven: number;
    discountAmount?: number;
    customerName?: string;
    note?: string;
  }): { success: boolean; transaction?: Transaction; error?: string } => {
    if (cart.length === 0) {
      return { success: false, error: 'Keranjang belanja masih kosong.' };
    }

    if (!currentUser) {
      return { success: false, error: 'Sesi login tidak aktif. Silakan login kembali.' };
    }

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discount = data.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = settings.enableTax ? Math.round((taxableAmount * settings.taxRatePercent) / 100) : 0;
    const total = taxableAmount + tax;

    if (data.paymentMethod === 'cash' && data.cashGiven < total) {
      return {
        success: false,
        error: `Uang pembayaran kurang! Total belanja: Rp ${total.toLocaleString('id-ID')}`,
      };
    }

    const change = data.paymentMethod === 'cash' ? Math.max(0, data.cashGiven - total) : 0;
    const totalProfit = cart.reduce((sum, item) => {
      const profitPerUnit = item.product.price - (item.product.costPrice || 0);
      return sum + profitPerUnit * item.quantity;
    }, 0) - discount;

    const receiptNumber = generateReceiptNumber();

    const transactionItems = cart.map(item => ({
      productId: item.product.id,
      code: item.product.code,
      name: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice || 0,
      quantity: item.quantity,
      unit: item.product.unit,
      subtotal: item.product.price * item.quantity,
    }));

    const newTransaction: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNumber,
      date: new Date().toISOString(),
      cashierId: currentUser.id,
      cashierName: currentUser.fullName,
      cashierRole: currentUser.role,
      items: transactionItems,
      subtotal,
      discount,
      tax,
      total,
      totalProfit,
      paymentMethod: data.paymentMethod,
      cashGiven: data.paymentMethod === 'cash' ? data.cashGiven : total,
      change,
      customerName: data.customerName?.trim() || undefined,
      note: data.note?.trim() || undefined,
    };

    // Deduct stock for each product
    const nextProducts = products.map(p => {
      const boughtItem = cart.find(ci => ci.product.id === p.id);
      if (boughtItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - boughtItem.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    const nextTransactions = [newTransaction, ...transactions];
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setCart([]);

    pushToServer({ products: nextProducts, transactions: nextTransactions });
    sound.playSuccess(settings.enableSound);

    return {
      success: true,
      transaction: newTransaction,
    };
  };

  const deleteTransaction = (id: string, restoreStock: boolean = false): { success: boolean; message: string } => {
    const target = transactions.find(t => t.id === id);
    if (!target) {
      return { success: false, message: 'Transaksi tidak ditemukan.' };
    }

    let nextProducts = products;
    if (restoreStock && target.items) {
      nextProducts = products.map(p => {
        const item = target.items.find(i => i.productId === p.id);
        if (item) {
          return {
            ...p,
            stock: p.stock + item.quantity,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      setProducts(nextProducts);
    }

    const nextTransactions = transactions.filter(t => t.id !== id);
    setTransactions(nextTransactions);
    pushToServer({ products: nextProducts, transactions: nextTransactions });

    sound.playClick(settings.enableSound);
    return { success: true, message: `Struk "${target.receiptNumber}" berhasil dihapus dari riwayat transaksi.` };
  };

  // Stock Purchase methods (Update Stok Barang: Nominal Belanja, Tanggal, Keterangan)
  const addStockPurchase = (data: { date: string; amount: number; description: string }): { success: boolean; message: string } => {
    if (data.amount <= 0) {
      return { success: false, message: 'Nominal belanja harus lebih dari Rp 0.' };
    }
    const cleanDesc = data.description?.trim() || 'Belanja stok barang';
    const cleanDate = data.date?.trim() || new Date().toISOString().split('T')[0];
    const roundedAmount = Math.max(0, Math.round(data.amount));

    const newPurchase: StockPurchase = {
      id: `sp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: cleanDate,
      amount: roundedAmount,
      description: cleanDesc,
      createdAt: new Date().toISOString(),
    };

    const nextPurchases = [newPurchase, ...stockPurchases];
    setStockPurchases(nextPurchases);
    pushToServer({ stockPurchases: nextPurchases });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil ditambahkan.' };
  };

  const updateStockPurchase = (id: string, data: { date: string; amount: number; description: string }): { success: boolean; message: string } => {
    const target = stockPurchases.find(sp => sp.id === id);
    if (!target) {
      return { success: false, message: 'Data belanja stok tidak ditemukan.' };
    }
    if (data.amount <= 0) {
      return { success: false, message: 'Nominal belanja harus lebih dari Rp 0.' };
    }

    const roundedAmount = Math.max(0, Math.round(data.amount));
    const nextPurchases = stockPurchases.map(sp =>
      sp.id === id
        ? {
            ...sp,
            date: data.date.trim() || sp.date,
            amount: roundedAmount,
            description: data.description.trim() || sp.description,
          }
        : sp
    );

    setStockPurchases(nextPurchases);
    pushToServer({ stockPurchases: nextPurchases });
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil diperbarui.' };
  };

  const deleteStockPurchase = (id: string): { success: boolean; message: string } => {
    const target = stockPurchases.find(sp => sp.id === id);
    if (!target) {
      return { success: false, message: 'Data belanja stok tidak ditemukan.' };
    }

    const nextPurchases = stockPurchases.filter(sp => sp.id !== id);
    setStockPurchases(nextPurchases);
    pushToServer({ stockPurchases: nextPurchases });
    sound.playClick(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil dihapus.' };
  };

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);
    pushToServer({ settings: nextSettings });
    sound.playClick(settings.enableSound);
  };

  const resetAllData = () => {
    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setStockPurchases(INITIAL_STOCK_PURCHASES);
    setSettings(INITIAL_SETTINGS);
    setCart([]);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.STOCK_PURCHASES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);

    fetch('/api/reset', { method: 'POST' }).catch(() => {});
    sound.playSuccess(settings.enableSound);
  };

  return (
    <PosContext.Provider
      value={{
        currentUser,
        users,
        products,
        cart,
        transactions,
        stockPurchases,
        settings,
        activeTab,
        setActiveTab,
        syncStatus,
        lastSyncTime,
        syncWithServer,
        exportBackupData,
        importBackupData,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        updateProductStock,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        completeTransaction,
        deleteTransaction,
        addStockPurchase,
        updateStockPurchase,
        deleteStockPurchase,
        updateSettings,
        resetAllData,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
