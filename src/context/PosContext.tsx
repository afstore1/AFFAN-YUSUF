import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserAccount, Product, CartItem, Transaction, StoreSettings, UserRole, StockPurchase } from '../types';
import { INITIAL_USERS, INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_TRANSACTIONS, INITIAL_STOCK_PURCHASES } from '../data/initialData';
import { sound } from '../utils/sound';
import { generateReceiptNumber } from '../utils/format';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';

export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface PosContextType {
  currentUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  isAuthReady: boolean;
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
  signInWithGoogle: () => Promise<{ success: boolean; message: string }>;
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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Firebase auth state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Local state initialized with cached or default values
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) return JSON.parse(saved);
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) return JSON.parse(saved);
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
      if (saved) return JSON.parse(saved);
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pos' | 'products' | 'members' | 'reports' | 'settings'>('pos');
  const isSeedingRef = useRef(false);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);

      if (user) {
        // Multi-Account Google Login sync
        const isSuperAdminEmail = user.email?.toLowerCase() === 'affan.yusuf192@guru.smp.belajar.id';
        if (isSuperAdminEmail) {
          const adminAccount: UserAccount = {
            id: user.uid,
            username: 'affan.yusuf',
            password: '',
            fullName: user.displayName || 'AFFAN YUSUF (Super Admin)',
            role: 'super_admin',
            phone: '081234567890',
            email: user.email || 'affan.yusuf192@guru.smp.belajar.id',
            avatarColor: 'bg-indigo-600',
            createdAt: new Date().toISOString(),
            status: 'active'
          };
          setCurrentUser(adminAccount);
        } else if (user.email) {
          setCurrentUser(prev => {
            if (prev && prev.email?.toLowerCase() === user.email?.toLowerCase()) return prev;
            return {
              id: user.uid,
              username: (user.email?.split('@')[0] || 'kasir').toLowerCase(),
              password: '',
              fullName: user.displayName || 'Anggota Kasir',
              role: 'anggota',
              phone: '-',
              email: user.email || undefined,
              avatarColor: 'bg-emerald-600',
              createdAt: new Date().toISOString(),
              status: 'active'
            };
          });
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore sync when authenticated
  useEffect(() => {
    if (!firebaseUser) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');

    // Subscribe to products collection
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        if (!snapshot.empty) {
          const prods: Product[] = [];
          snapshot.forEach((docSnap) => {
            prods.push(docSnap.data() as Product);
          });
          setProducts(prods);
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
        } else if (!isSeedingRef.current) {
          seedInitialData();
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      },
      (error) => {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'products');
      }
    );

    // Subscribe to transactions collection
    const unsubTransactions = onSnapshot(
      collection(db, 'transactions'),
      (snapshot) => {
        const txs: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          txs.push(docSnap.data() as Transaction);
        });
        txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(txs);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      },
      (error) => {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'transactions');
      }
    );

    // Subscribe to stockPurchases collection
    const unsubStockPurchases = onSnapshot(
      collection(db, 'stockPurchases'),
      (snapshot) => {
        const sps: StockPurchase[] = [];
        snapshot.forEach((docSnap) => {
          sps.push(docSnap.data() as StockPurchase);
        });
        sps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setStockPurchases(sps);
        localStorage.setItem(STORAGE_KEYS.STOCK_PURCHASES, JSON.stringify(sps));
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      },
      (error) => {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'stockPurchases');
      }
    );

    // Subscribe to settings document
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'store'),
      (docSnap) => {
        if (docSnap.exists()) {
          const storeData = docSnap.data() as StoreSettings;
          setSettings(storeData);
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(storeData));
        } else {
          setDoc(doc(db, 'settings', 'store'), INITIAL_SETTINGS).catch(() => {});
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      },
      (error) => {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'settings/store');
      }
    );

    // Subscribe to userAccounts collection
    const unsubUsers = onSnapshot(
      collection(db, 'userAccounts'),
      (snapshot) => {
        if (!snapshot.empty) {
          const us: UserAccount[] = [];
          snapshot.forEach((docSnap) => {
            us.push(docSnap.data() as UserAccount);
          });
          setUsers(us);
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(us));
        }
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      },
      (error) => {
        setSyncStatus('error');
        handleFirestoreError(error, OperationType.GET, 'userAccounts');
      }
    );

    return () => {
      unsubProducts();
      unsubTransactions();
      unsubStockPurchases();
      unsubSettings();
      unsubUsers();
    };
  }, [firebaseUser]);

  // Seed initial data to Firestore if remote is blank
  const seedInitialData = async () => {
    if (isSeedingRef.current) return;
    isSeedingRef.current = true;
    try {
      for (const prod of INITIAL_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
      await setDoc(doc(db, 'settings', 'store'), INITIAL_SETTINGS);
      for (const user of INITIAL_USERS) {
        await setDoc(doc(db, 'userAccounts', user.id), user);
      }
      for (const tx of INITIAL_TRANSACTIONS) {
        await setDoc(doc(db, 'transactions', tx.id), tx);
      }
      for (const sp of INITIAL_STOCK_PURCHASES) {
        await setDoc(doc(db, 'stockPurchases', sp.id), sp);
      }
    } catch (e) {
      console.warn('Seeding initial data:', e);
    } finally {
      isSeedingRef.current = false;
    }
  };

  // Keep local storage synced for offline fallback
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch {}
  }, [currentUser]);

  // Google Sign In
  const signInWithGoogle = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isSuper = user.email?.toLowerCase() === 'affan.yusuf192@guru.smp.belajar.id';

      const account: UserAccount = {
        id: user.uid,
        username: (user.email?.split('@')[0] || 'google_user').toLowerCase(),
        password: '',
        fullName: user.displayName || (isSuper ? 'AFFAN YUSUF (Super Admin)' : 'Anggota Kasir'),
        role: isSuper ? 'super_admin' : 'anggota',
        phone: '-',
        email: user.email || undefined,
        avatarColor: isSuper ? 'bg-indigo-600' : 'bg-emerald-600',
        createdAt: new Date().toISOString(),
        status: 'active'
      };

      setCurrentUser(account);
      sound.playSuccess(settings.enableSound);
      return { 
        success: true, 
        message: `Berhasil terhubung ke Firebase dengan akun Google: ${user.email} (${account.role === 'super_admin' ? 'Super Admin' : 'Anggota Kasir'})` 
      };
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      return { success: false, message: error.message || 'Gagal masuk dengan akun Google.' };
    }
  };

  // Standard username & password login
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

  const logout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setCurrentUser(null);
    setCart([]);
    sound.playClick(settings.enableSound);
  };

  // Sync manually with Firestore
  const syncWithServer = async (silent: boolean = false): Promise<{ success: boolean; message: string }> => {
    if (!firebaseUser) {
      if (!silent) setSyncStatus('offline');
      return { success: false, message: 'Masuk dengan Akun Google terlebih dahulu untuk menghubungkan Firebase.' };
    }

    try {
      if (!silent) setSyncStatus('syncing');
      const prodSnap = await getDocs(collection(db, 'products'));
      const prods: Product[] = [];
      prodSnap.forEach(d => prods.push(d.data() as Product));
      if (prods.length > 0) setProducts(prods);

      const txSnap = await getDocs(collection(db, 'transactions'));
      const txs: Transaction[] = [];
      txSnap.forEach(d => txs.push(d.data() as Transaction));
      txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txs);

      const spSnap = await getDocs(collection(db, 'stockPurchases'));
      const sps: StockPurchase[] = [];
      spSnap.forEach(d => sps.push(d.data() as StockPurchase));
      sps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setStockPurchases(sps);

      const setSnap = await getDoc(doc(db, 'settings', 'store'));
      if (setSnap.exists()) setSettings(setSnap.data() as StoreSettings);

      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString('id-ID'));
      return { success: true, message: 'Semua data toko berhasil disinkronkan langsung dari Firebase Firestore!' };
    } catch (err: any) {
      setSyncStatus('error');
      handleFirestoreError(err, OperationType.GET, 'sync');
      return { success: false, message: 'Gagal menyinkronkan: ' + err.message };
    }
  };

  // JSON Export / Backup
  const exportBackupData = () => {
    const backupObj = {
      appName: 'AFSTORE POS',
      version: '2.0',
      firebaseSynced: !!firebaseUser,
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
    a.download = `AFSTORE_FIREBASE_BACKUP_${new Date().toISOString().split('T')[0]}_${Date.now().toString().slice(-4)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playSuccess(settings.enableSound);
  };

  // JSON Import
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

      if (firebaseUser) {
        for (const p of newProducts) {
          setDoc(doc(db, 'products', p.id), p).catch(e => handleFirestoreError(e, OperationType.WRITE, `products/${p.id}`));
        }
        for (const t of newTransactions) {
          setDoc(doc(db, 'transactions', t.id), t).catch(e => handleFirestoreError(e, OperationType.WRITE, `transactions/${t.id}`));
        }
        for (const sp of newStockPurchases) {
          setDoc(doc(db, 'stockPurchases', sp.id), sp).catch(e => handleFirestoreError(e, OperationType.WRITE, `stockPurchases/${sp.id}`));
        }
        setDoc(doc(db, 'settings', 'store'), newSettings).catch(e => handleFirestoreError(e, OperationType.WRITE, 'settings/store'));
      }

      sound.playSuccess(settings.enableSound);
      return { success: true, message: 'Data cadangan berhasil dipulihkan dan disinkronkan ke Firebase!' };
    } catch (err: any) {
      return { success: false, message: 'Gagal memulihkan cadangan: ' + err.message };
    }
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

    setUsers(prev => [...prev, newUser]);
    if (firebaseUser) {
      setDoc(doc(db, 'userAccounts', newUser.id), newUser).catch(e => 
        handleFirestoreError(e, OperationType.CREATE, `userAccounts/${newUser.id}`)
      );
    }
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

    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    if (currentUser?.id === id) {
      setCurrentUser(prev => (prev ? { ...prev, ...updates } : null));
    }

    if (firebaseUser) {
      updateDoc(doc(db, 'userAccounts', id), updates).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, `userAccounts/${id}`)
      );
    }
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Data akun berhasil diperbarui.' };
  };

  const deleteUser = (id: string): { success: boolean; message: string } => {
    const target = users.find(u => u.id === id);
    if (!target) return { success: false, message: 'Akun tidak ditemukan.' };
    if (target.role === 'super_admin') return { success: false, message: 'Akun Super Admin tidak dapat dihapus.' };

    setUsers(prev => prev.filter(u => u.id !== id));
    if (firebaseUser) {
      deleteDoc(doc(db, 'userAccounts', id)).catch(e => 
        handleFirestoreError(e, OperationType.DELETE, `userAccounts/${id}`)
      );
    }
    sound.playClick(settings.enableSound);
    return { success: true, message: `Akun "${target.fullName}" berhasil dihapus.` };
  };

  // Product Management
  const addProduct = (productData: Omit<Product, 'id'>): { success: boolean; message: string } => {
    const codeClean = productData.code.trim();
    if (codeClean && products.some(p => p.code.toLowerCase() === codeClean.toLowerCase())) {
      return { success: false, message: `Kode / Barcode "${codeClean}" sudah digunakan barang lain.` };
    }

    const roundedPrice = Math.max(0, Math.round(productData.price));
    const roundedCost = Math.max(0, Math.round(productData.costPrice || 0));

    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      price: roundedPrice,
      costPrice: roundedCost,
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);
    if (firebaseUser) {
      setDoc(doc(db, 'products', newProduct.id), newProduct).catch(e => 
        handleFirestoreError(e, OperationType.CREATE, `products/${newProduct.id}`)
      );
    }
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

    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (cleanUpdates.price !== undefined) cleanUpdates.price = Math.max(0, Math.round(cleanUpdates.price));
    if (cleanUpdates.costPrice !== undefined) cleanUpdates.costPrice = Math.max(0, Math.round(cleanUpdates.costPrice));

    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...cleanUpdates } : p)));

    if (firebaseUser) {
      updateDoc(doc(db, 'products', id), cleanUpdates).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, `products/${id}`)
      );
    }
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Data barang berhasil diperbarui.' };
  };

  const deleteProduct = (id: string): { success: boolean; message: string } => {
    const target = products.find(p => p.id === id);
    if (!target) return { success: false, message: 'Barang tidak ditemukan.' };

    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(c => c.product.id !== id));

    if (firebaseUser) {
      deleteDoc(doc(db, 'products', id)).catch(e => 
        handleFirestoreError(e, OperationType.DELETE, `products/${id}`)
      );
    }
    sound.playClick(settings.enableSound);
    return { success: true, message: `Barang "${target.name}" berhasil dihapus.` };
  };

  const adjustStock = (id: string, deltaAmount: number) => {
    const target = products.find(p => p.id === id);
    if (!target) return;
    const newStock = Math.max(0, target.stock + deltaAmount);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock, updatedAt: new Date().toISOString() } : p));

    if (firebaseUser) {
      updateDoc(doc(db, 'products', id), { stock: newStock, updatedAt: new Date().toISOString() }).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, `products/${id}`)
      );
    }
    sound.playClick(settings.enableSound);
  };

  const updateProductStock = (id: string, newStock: number): { success: boolean; message: string } => {
    const target = products.find(p => p.id === id);
    if (!target) return { success: false, message: 'Barang tidak ditemukan.' };

    const validStock = Math.max(0, Math.round(newStock));
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: validStock, updatedAt: new Date().toISOString() } : p));

    if (firebaseUser) {
      updateDoc(doc(db, 'products', id), { stock: validStock, updatedAt: new Date().toISOString() }).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, `products/${id}`)
      );
    }
    sound.playSuccess(settings.enableSound);
    return { success: true, message: `Stok "${target.name}" berhasil diubah menjadi ${validStock} ${target.unit}.` };
  };

  // Cart Management
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: newQty } : item);
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
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
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

  // Checkout & Transactions
  const completeTransaction = (data: {
    paymentMethod: 'cash' | 'qris' | 'debit' | 'transfer';
    cashGiven: number;
    discountAmount?: number;
    customerName?: string;
    note?: string;
  }): { success: boolean; transaction?: Transaction; error?: string } => {
    if (cart.length === 0) return { success: false, error: 'Keranjang belanja masih kosong.' };
    if (!currentUser) return { success: false, error: 'Sesi login kasir tidak aktif.' };

    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const discount = data.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = settings.enableTax ? Math.round((taxableAmount * settings.taxRatePercent) / 100) : 0;
    const total = taxableAmount + tax;

    if (data.paymentMethod === 'cash' && data.cashGiven < total) {
      return { success: false, error: `Uang pembayaran kurang! Total belanja: Rp ${total.toLocaleString('id-ID')}` };
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

    // Calculate deducted stocks
    const updatedProducts = products.map(p => {
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

    setProducts(updatedProducts);
    setTransactions(prev => [newTransaction, ...prev]);
    const cartCopy = [...cart];
    setCart([]);

    if (firebaseUser) {
      setDoc(doc(db, 'transactions', newTransaction.id), newTransaction).catch(e => 
        handleFirestoreError(e, OperationType.CREATE, `transactions/${newTransaction.id}`)
      );
      for (const ci of cartCopy) {
        const matched = updatedProducts.find(p => p.id === ci.product.id);
        if (matched) {
          updateDoc(doc(db, 'products', matched.id), { 
            stock: matched.stock, 
            updatedAt: new Date().toISOString() 
          }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${matched.id}`));
        }
      }
    }

    sound.playSuccess(settings.enableSound);
    return { success: true, transaction: newTransaction };
  };

  const deleteTransaction = (id: string, restoreStock: boolean = false): { success: boolean; message: string } => {
    const target = transactions.find(t => t.id === id);
    if (!target) return { success: false, message: 'Transaksi tidak ditemukan.' };

    let updatedProducts = products;
    if (restoreStock && target.items) {
      updatedProducts = products.map(p => {
        const item = target.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: p.stock + item.quantity, updatedAt: new Date().toISOString() };
        }
        return p;
      });
      setProducts(updatedProducts);
    }

    setTransactions(prev => prev.filter(t => t.id !== id));

    if (firebaseUser) {
      deleteDoc(doc(db, 'transactions', id)).catch(e => 
        handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`)
      );
      if (restoreStock && target.items) {
        for (const item of target.items) {
          const matched = updatedProducts.find(p => p.id === item.productId);
          if (matched) {
            updateDoc(doc(db, 'products', matched.id), { 
              stock: matched.stock, 
              updatedAt: new Date().toISOString() 
            }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `products/${matched.id}`));
          }
        }
      }
    }

    sound.playClick(settings.enableSound);
    return { success: true, message: `Struk "${target.receiptNumber}" berhasil dihapus dari riwayat transaksi.` };
  };

  // Stock Purchase methods
  const addStockPurchase = (data: { date: string; amount: number; description: string }): { success: boolean; message: string } => {
    if (data.amount <= 0) return { success: false, message: 'Nominal belanja harus lebih dari Rp 0.' };
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

    setStockPurchases(prev => [newPurchase, ...prev]);

    if (firebaseUser) {
      setDoc(doc(db, 'stockPurchases', newPurchase.id), newPurchase).catch(e => 
        handleFirestoreError(e, OperationType.CREATE, `stockPurchases/${newPurchase.id}`)
      );
    }
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil ditambahkan.' };
  };

  const updateStockPurchase = (id: string, data: { date: string; amount: number; description: string }): { success: boolean; message: string } => {
    const target = stockPurchases.find(sp => sp.id === id);
    if (!target) return { success: false, message: 'Data belanja stok tidak ditemukan.' };
    if (data.amount <= 0) return { success: false, message: 'Nominal belanja harus lebih dari Rp 0.' };

    const roundedAmount = Math.max(0, Math.round(data.amount));
    const updates = {
      date: data.date.trim() || target.date,
      amount: roundedAmount,
      description: data.description.trim() || target.description,
    };

    setStockPurchases(prev => prev.map(sp => sp.id === id ? { ...sp, ...updates } : sp));

    if (firebaseUser) {
      updateDoc(doc(db, 'stockPurchases', id), updates).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, `stockPurchases/${id}`)
      );
    }
    sound.playSuccess(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil diperbarui.' };
  };

  const deleteStockPurchase = (id: string): { success: boolean; message: string } => {
    const target = stockPurchases.find(sp => sp.id === id);
    if (!target) return { success: false, message: 'Data belanja stok tidak ditemukan.' };

    setStockPurchases(prev => prev.filter(sp => sp.id !== id));

    if (firebaseUser) {
      deleteDoc(doc(db, 'stockPurchases', id)).catch(e => 
        handleFirestoreError(e, OperationType.DELETE, `stockPurchases/${id}`)
      );
    }
    sound.playClick(settings.enableSound);
    return { success: true, message: 'Catatan belanja stok barang berhasil dihapus.' };
  };

  // Settings
  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    const nextSettings = { ...settings, ...newSettings };
    setSettings(nextSettings);

    if (firebaseUser) {
      setDoc(doc(db, 'settings', 'store'), nextSettings, { merge: true }).catch(e => 
        handleFirestoreError(e, OperationType.UPDATE, 'settings/store')
      );
    }
    sound.playClick(settings.enableSound);
  };

  // Reset
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

    if (firebaseUser) {
      seedInitialData().catch(e => console.error('Reset initial data error:', e));
    }
    sound.playSuccess(settings.enableSound);
  };

  return (
    <PosContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthReady,
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
        signInWithGoogle,
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
