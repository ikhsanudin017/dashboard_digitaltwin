# GitHub CI/CD Pipeline

## Overview

Pipeline CI/CD untuk project Digital Twin Dashboard menggunakan GitHub Actions.

## Workflow

Pipeline berjalan otomatis setiap kali ada push ke branch main atau pull request.

### Jobs yang Dijalankan

1. Frontend Build
   - Install dependencies Vue.js
   - Lint code
   - Build production
   - Run unit tests
   - Upload build artifacts
   - Test di Node.js 18 dan 20

2. Security Audit
   - Scan vulnerabilities di frontend dependencies
   - Scan vulnerabilities di Azure Functions dependencies
   - Alert jika ada security issues level moderate ke atas

3. Azure Functions Build
   - Install dependencies
   - Build functions
   - Upload artifacts

4. Build Summary
   - Ringkasan hasil semua jobs

## Setup

### 1. Push Workflow ke Repository

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow"
git push origin main
```

### 2. Aktifkan GitHub Actions

Buka tab Actions di repository GitHub dan klik enable jika diminta.

### 3. Tambah Environment Variables (Opsional)

Di Settings > Secrets and variables > Actions, tambahkan:
- AZURE_CREDENTIALS (untuk deployment)
- VERCEL_TOKEN (untuk auto deploy ke Vercel)

## Testing

### Test CI Pipeline

```bash
git add .
git commit -m "test: testing CI pipeline"
git push origin main
```

Lihat hasil di tab Actions repository GitHub.

### Verifikasi Build Lokal

Sebelum push, pastikan build berhasil lokal:

```bash
# Frontend
cd view_virtual
npm install
npm run build
npm test

# Azure Functions
cd "sensor iot/azure-setup/azure-function"
npm install
```

## Troubleshooting

### npm ci Failed

Update package-lock.json:

```bash
cd view_virtual
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push origin main
```

### Lint Failed

Fix lint errors:

```bash
cd view_virtual
npm run lint -- --fix
git add .
git commit -m "fix: lint errors"
git push origin main
```

### Build Failed

Test build lokal terlebih dahulu:

```bash
cd view_virtual
npm run build
```

Fix error yang muncul, commit, dan push.

## Badge Status

Tambahkan badge di README utama:

```markdown
![CI/CD](https://github.com/[USERNAME]/dashboard_digitaltwin/workflows/CI%2FCD%20Pipeline/badge.svg)
```

Ganti [USERNAME] dengan username GitHub.
