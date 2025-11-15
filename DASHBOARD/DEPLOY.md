# 🚀 Panduan Deploy ke Vercel

## ✅ Persiapan

1. **Build sudah berhasil** ✅
   - Build test: `npm run build` - SUCCESS
   - Tidak ada error

2. **File konfigurasi sudah ada** ✅
   - `vercel.json` - sudah dibuat
   - `package.json` - sudah ada script `vercel-build`

3. **Code sudah di-push ke GitHub** ✅
   - Repository: `https://github.com/ikhsanudin017/dashboard_digitaltwin.git`
   - Branch: `main`

## 📋 Cara Deploy ke Vercel

### Opsi 1: Via Vercel Dashboard (Recommended)

1. **Buka Vercel Dashboard**
   - Kunjungi: https://vercel.com
   - Login dengan GitHub account

2. **Import Project**
   - Klik "Add New Project"
   - Pilih repository: `ikhsanudin017/dashboard_digitaltwin`
   - Pilih root directory: `DASHBOARD`

3. **Konfigurasi Build**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detect)
   - Output Directory: `dist` (auto-detect)
   - Install Command: `npm install` (auto-detect)

4. **Environment Variables**
   Tambahkan environment variables berikut:
   ```
   VITE_MQTT_BROKER_URL=wss://02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud:8884/mqtt
   VITE_MQTT_USERNAME=digitaltwin
   VITE_MQTT_PASSWORD=Twindigital1
   VITE_API_BASE_URL=https://your-api-url.com/api
   VITE_DEMO_MODE=false
   ```

5. **Deploy**
   - Klik "Deploy"
   - Tunggu proses build selesai
   - URL deployment akan muncul setelah selesai

### Opsi 2: Via Vercel CLI

1. **Login ke Vercel**
   ```bash
   vercel login
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add VITE_MQTT_BROKER_URL
   vercel env add VITE_MQTT_USERNAME
   vercel env add VITE_MQTT_PASSWORD
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_DEMO_MODE
   ```

## 🔧 Konfigurasi Vercel

File `vercel.json` sudah dikonfigurasi dengan:
- Build command: `npm run build`
- Output directory: `dist`
- Framework: Vite
- SPA routing: Semua route redirect ke `index.html`
- Cache headers untuk assets

## ✅ Checklist Deployment

- [x] Build berhasil tanpa error
- [x] `vercel.json` sudah dibuat
- [x] `package.json` sudah ada script `vercel-build`
- [x] Code sudah di-push ke GitHub
- [ ] Environment variables sudah di-set di Vercel
- [ ] Deployment berhasil
- [ ] Website bisa diakses
- [ ] MQTT connection berfungsi

## 🐛 Troubleshooting

### Build Error
- Pastikan Node.js version >= 18
- Pastikan semua dependencies terinstall: `npm install`
- Cek build lokal: `npm run build`

### MQTT Connection Error
- Pastikan environment variables sudah di-set di Vercel
- Cek console browser untuk error MQTT
- Pastikan MQTT broker URL benar

### Routing Error (404)
- Pastikan `vercel.json` sudah ada dengan konfigurasi SPA routing
- Pastikan semua route redirect ke `index.html`

## 📝 Catatan

- Vercel akan otomatis deploy setiap kali ada push ke branch `main`
- Environment variables harus di-set di Vercel dashboard
- Pastikan `.env` file tidak di-commit (sudah ada di `.gitignore`)

