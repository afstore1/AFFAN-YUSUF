import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function afstoreApiPlugin(): Plugin {
  const DATA_DIR = path.resolve(__dirname, 'data');
  const DB_FILE = path.resolve(DATA_DIR, 'store_database.json');

  const getDb = () => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      }
    } catch (e) {
      console.error('[AFSTORE API] Gagal membaca database:', e);
    }
    return null;
  };

  const saveDb = (data: any) => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
      return true;
    } catch (e) {
      console.error('[AFSTORE API] Gagal menyimpan database:', e);
      return false;
    }
  };

  const handleApiRequest = (req: any, res: any, next: any) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = req.url ? req.url.split('?')[0] : '';

    if (url === '/api/health' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        status: 'ok', 
        serverTime: new Date().toISOString(), 
        storeName: 'AFSTORE POS' 
      }));
      return;
    }

    if (url === '/api/data' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      const data = getDb();
      if (data) {
        res.end(JSON.stringify({ success: true, data }));
      } else {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, message: 'Database toko belum tersedia.' }));
      }
      return;
    }

    if (url === '/api/sync' && req.method === 'POST') {
      let bodyData = '';
      req.on('data', (chunk: any) => {
        bodyData += chunk;
      });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        try {
          const body = JSON.parse(bodyData || '{}');
          const existing = getDb() || {};
          const updated = {
            ...existing,
            ...(body.products !== undefined ? { products: body.products } : {}),
            ...(body.transactions !== undefined ? { transactions: body.transactions } : {}),
            ...(body.stockPurchases !== undefined ? { stockPurchases: body.stockPurchases } : {}),
            ...(body.users !== undefined ? { users: body.users } : {}),
            ...(body.settings !== undefined ? { settings: body.settings } : {}),
            updatedAt: new Date().toISOString(),
          };
          const success = saveDb(updated);
          if (success) {
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Data berhasil disinkronkan ke server AFSTORE.', 
              updatedAt: updated.updatedAt 
            }));
          } else {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, message: 'Gagal menulis database file.' }));
          }
        } catch (err: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: err?.message || 'Payload JSON tidak valid.' }));
        }
      });
      return;
    }

    if (url === '/api/reset' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      try {
        if (fs.existsSync(DB_FILE)) {
          fs.unlinkSync(DB_FILE);
        }
        res.end(JSON.stringify({ success: true, message: 'Database toko berhasil direset.' }));
      } catch (err: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, message: err?.message }));
      }
      return;
    }

    next();
  };

  return {
    name: 'afstore-api-plugin',
    configureServer(server) {
      server.middlewares.use(handleApiRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleApiRequest);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), afstoreApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

