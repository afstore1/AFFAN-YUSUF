# AFSTORE POS - Panduan Deploy ke Vercel

Aplikasi Kasir POS modern AFSTORE berbasis React, Vite, dan Tailwind CSS.

## 🚀 Langkah Deploy ke Vercel

### Cara 1: Menggunakan GitHub & Vercel Dashboard (Paling Mudah)
1. **Push source code aplikasi ini ke GitHub repository Anda**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit AFSTORE POS"
   git branch -M main
   git remote add origin https://github.com/USERNAME/afstore-pos.git
   git push -u origin main
   ```
2. Buka [https://vercel.com](https://vercel.com) dan login (bisa menggunakan akun GitHub).
3. Klik tombol **"Add New..."** lalu pilih **"Project"**.
4. Pilih repository `afstore-pos` yang baru saja Anda push.
5. Konfigurasi Vercel akan otomatis mendeteksi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Klik **"Deploy"**.
7. Dalam waktu ~1 menit, aplikasi Anda akan online di domain gratis `https://afstore-pos.vercel.app`! 🎉

---

### Cara 2: Menggunakan Vercel CLI Langsung dari Terminal
Jika Anda ingin langsung deploy tanpa GitHub:
```bash
npx vercel
```
Ikuti petunjuk di terminal:
- Set up and deploy? **Y**
- Which scope? (Pilih akun Anda)
- Link to existing project? **N**
- Project name: **afstore-pos**
- In which directory is your code located? **./**
- Want to modify settings? **N**

Untuk deploy ke production:
```bash
npx vercel --prod
```

---

## 🔑 Akun Bawaan untuk Login (Demo)

### 1. Akun Super Admin (Akses Penuh)
- **Nama**: `AFFAN YUSUF (Super Admin)`
- **Role**: Super Admin
- **Username**: `admin`
- **Password**: `admin123`
- *Fungsi*: Memasukkan barang baru, ubah harga & stok, kelola daftar akun anggota kasir, melihat omset & laba, serta transaksi kasir.

### 2. Akun Anggota (Kasir)
- **Role**: Anggota
- **Username**: `budi_kasir` / `siti_kasir` / `rizky_kasir`
- **Password**: `kasir123`
- *Fungsi*: Dikhususkan untuk proses jual beli barang kasir, scan barcode, keranjang belanja, dan cetak struk pembayaran resmi.

---

## ⚙️ File Konfigurasi Vercel (`vercel.json`)
File `vercel.json` sudah dibuat di root project dengan konfigurasi SPA routing rewrite ke `/index.html` dan asset caching:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
