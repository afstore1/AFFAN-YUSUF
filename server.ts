import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  INITIAL_USERS, 
  INITIAL_PRODUCTS, 
  INITIAL_SETTINGS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_STOCK_PURCHASES 
} from './src/data/initialData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Support JSON payloads up to 50MB for store logo/item image uploads
app.use(express.json({ limit: '50mb' }));

// Database path in data/store_database.json
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'store_database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure database file is initialized with initial data if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  const initialDb = {
    users: INITIAL_USERS,
    products: INITIAL_PRODUCTS,
    transactions: INITIAL_TRANSACTIONS,
    stockPurchases: INITIAL_STOCK_PURCHASES,
    settings: INITIAL_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    console.log('[AFSTORE Server] Database initialized with default store data.');
  } catch (err) {
    console.error('[AFSTORE Server] Error creating initial db:', err);
  }
}

// Helper to read DB safely
function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[AFSTORE Server] Error reading db:', err);
  }
  return null;
}

// Helper to write DB safely with atomic temp file
function writeDb(data: any): boolean {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[AFSTORE Server] Error writing db:', err);
    return false;
  }
}

// --- API ROUTES ---

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: new Date().toISOString(),
    storeName: 'AFSTORE POS' 
  });
});

// GET all store data (Products, Transactions, Stock Purchases, Users, Settings)
app.get('/api/data', (req, res) => {
  const dbData = readDb();
  if (dbData) {
    return res.json({ 
      success: true, 
      data: dbData 
    });
  }
  return res.status(500).json({ 
    success: false, 
    message: 'Gagal memuat database toko.' 
  });
});

// POST sync data from client to server (persisted for all Google accounts and devices)
app.post('/api/sync', (req, res) => {
  try {
    const { products, transactions, stockPurchases, users, settings } = req.body;

    const existing = readDb() || {};
    const updatedDb = {
      ...existing,
      ...(products !== undefined ? { products } : {}),
      ...(transactions !== undefined ? { transactions } : {}),
      ...(stockPurchases !== undefined ? { stockPurchases } : {}),
      ...(users !== undefined ? { users } : {}),
      ...(settings !== undefined ? { settings } : {}),
      updatedAt: new Date().toISOString(),
    };

    const saved = writeDb(updatedDb);
    if (saved) {
      return res.json({ 
        success: true, 
        message: 'Data berhasil disinkronkan ke server.',
        updatedAt: updatedDb.updatedAt 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        message: 'Gagal menyimpan data ke database server.' 
      });
    }
  } catch (error: any) {
    console.error('[AFSTORE Server] Error in /api/sync:', error);
    return res.status(500).json({ 
      success: false, 
      message: error?.message || 'Internal server error saat sinkronisasi.' 
    });
  }
});

// Reset database endpoint
app.post('/api/reset', (req, res) => {
  const resetDb = {
    users: INITIAL_USERS,
    products: INITIAL_PRODUCTS,
    transactions: INITIAL_TRANSACTIONS,
    stockPurchases: INITIAL_STOCK_PURCHASES,
    settings: INITIAL_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  const saved = writeDb(resetDb);
  if (saved) {
    return res.json({ success: true, message: 'Database server berhasil direset ke bawaan.' });
  }
  return res.status(500).json({ success: false, message: 'Gagal mereset database server.' });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true, 
        host: '0.0.0.0', 
        port: Number(PORT) 
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AFSTORE Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
