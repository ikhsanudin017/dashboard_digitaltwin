# 📦 3D Models Hosting Solution

## 🎯 Masalah
File 3D models terlalu besar untuk di-commit ke GitHub:
- `3d digital twin.glb` - 27 MB
- `floor_plan.glb` - 420 MB
- `floor_plan.blend` - 561 MB

**Total: ~1 GB** (melebihi limit GitHub per file: 100 MB)

## ✅ Solusi: Azure Blob Storage

### Setup Manual via Azure Portal

1. **Buka Azure Portal**: https://portal.azure.com
2. **Navigate ke Storage Account**: `stenergy750b783c`
3. **Buat Container Baru**:
   - Nama: `3dmodels`
   - Public access level: **Blob (anonymous read access for blobs only)**
4. **Upload Files**:
   - Click "Upload" button
   - Select files: `3d digital twin.glb`, `floor_plan.glb`, `floor_plan.blend`
   - Upload

### Public URLs Setelah Upload

Files akan accessible via URL:
```
https://stenergy750b783c.blob.core.windows.net/3dmodels/3d-digital-twin.glb
https://stenergy750b783c.blob.core.windows.net/3dmodels/floor-plan.glb
https://stenergy750b783c.blob.core.windows.net/3dmodels/floor-plan.blend
```

### Update Aplikasi

Setelah upload, update file Vue untuk load dari Azure Storage:

**File**: `view_virtual/src/components/DigitalTwin3D.vue`

Ganti:
```javascript
// BEFORE (local file)
const modelPath = '/models/3d digital twin.glb';

// AFTER (Azure Storage)
const modelPath = 'https://stenergy750b783c.blob.core.windows.net/3dmodels/3d-digital-twin.glb';
```

Atau tambahkan environment variable di `.env`:
```env
VITE_3D_MODEL_BASE_URL=https://stenergy750b783c.blob.core.windows.net/3dmodels
```

Lalu di code:
```javascript
const baseUrl = import.meta.env.VITE_3D_MODEL_BASE_URL || '/models';
const modelPath = `${baseUrl}/3d-digital-twin.glb`;
```

## 🚀 Alternative: azcopy (Command Line)

Jika Azure CLI tidak bekerja, gunakan azcopy:

### 1. Install azcopy
```bash
brew install azcopy
```

### 2. Get SAS Token via Portal
- Storage Account → Shared access signature
- Allowed services: Blob
- Allowed permissions: Read, Write, Create
- Generate SAS and connection string

### 3. Upload dengan azcopy
```bash
azcopy copy \
  "view_virtual/public/models/*" \
  "https://stenergy750b783c.blob.core.windows.net/3dmodels?[SAS_TOKEN]" \
  --recursive
```

## ⚡ Quick Setup via Azure Portal (Recommended)

**Langkah cepat:**
1. Portal → stenergy750b783c → Containers → + Container
2. Name: `3dmodels`, Public access: Blob → Create
3. Click container → Upload → Select files → Upload
4. Copy blob URL untuk setiap file
5. Update code dengan URL tersebut

**Estimated time: 5-10 menit** (tergantung kecepatan upload)

## 📝 Notes

- File akan didownload oleh browser saat pertama kali load
- Browser akan cache file, jadi loading berikutnya lebih cepat
- Pastikan CORS enabled di Storage Account jika perlu
- File bisa di-set immutable untuk optimisasi CDN

## 🔧 CORS Configuration (Optional)

Jika ada CORS error, set di Storage Account:
```json
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET"],
  "MaxAgeInSeconds": 3600,
  "ExposedHeaders": ["*"],
  "AllowedHeaders": ["*"]
}
```
