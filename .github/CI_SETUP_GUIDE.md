# GitHub Actions CI/CD Setup

## 🚀 Setup Instructions

### 1. **Commit dan Push ke Fork**
```bash
cd /Users/macbookpro/Desktop/dashboard_digitaltwin

# Add workflow file
git add .github/workflows/ci.yml

# Commit
git commit -m "ci: add GitHub Actions workflow"

# Push HANYA ke fork (bukan origin)
git push myfork main
```

### 2. **Aktifkan GitHub Actions di Fork**
1. Buka: `https://github.com/rehanalfarizu/dashboard_digitaltwin`
2. Klik tab **Actions**
3. Klik **"I understand my workflows, go ahead and enable them"**

### 3. **Test CI Pipeline**
Setiap kali push ke fork, CI akan otomatis berjalan:
```bash
# Buat perubahan
git add .
git commit -m "test: testing CI pipeline"
git push myfork main

# Lihat hasilnya di:
# https://github.com/rehanalfarizu/dashboard_digitaltwin/actions
```

---

## 📋 Apa yang Dilakukan CI Ini?

### ✅ **Frontend Build Job**
- Install dependencies Vue.js
- Lint code (jika ada script lint)
- Build production
- Run tests (jika ada)
- Upload artifacts (hasil build)
- **Test di Node.js 18 dan 20** (matrix testing)

### 🔐 **Security Audit Job**
- Scan vulnerabilities di frontend dependencies
- Scan vulnerabilities di Azure Functions dependencies
- Alert jika ada security issues (moderate+)

### ⚡ **Azure Functions Build Job**
- Install dependencies Azure Functions
- Build functions
- Upload artifacts

### 📊 **Build Summary Job**
- Ringkasan hasil semua jobs
- Status pass/fail untuk setiap step

---

## 🎯 Workflow CI/CD Harian

### **Untuk Code Biasa (Push ke Both)**
```bash
# 1. Buat perubahan
git add src/components/

# 2. Commit
git commit -m "feat: tambah fitur baru"

# 3. Push ke origin (repository asli)
git push origin main

# 4. Push ke fork (untuk trigger CI)
git push myfork main

# 5. Lihat hasil CI di GitHub Actions
```

### **Untuk Update CI Config (Push Hanya ke Fork)**
```bash
# 1. Update workflow
git add .github/workflows/

# 2. Commit
git commit -m "ci: update workflow"

# 3. Push HANYA ke fork (SKIP origin)
git push myfork main
```

---

## 🔧 Kustomisasi CI

### **Menambahkan Environment Variables**
Di GitHub fork Anda:
1. Settings → Secrets and variables → Actions
2. Klik **New repository secret**
3. Tambahkan secrets (misal: AZURE_CREDENTIALS)

### **Menambahkan Deploy Job**
Edit `.github/workflows/ci.yml`, tambahkan:
```yaml
deploy-vercel:
  name: Deploy to Vercel
  runs-on: ubuntu-latest
  needs: frontend-build
  if: github.ref == 'refs/heads/main'
  
  steps:
  - uses: actions/checkout@v4
  - run: npm install -g vercel
  - run: vercel --token=${{ secrets.VERCEL_TOKEN }} --prod
```

---

## 📊 Melihat Hasil CI

### **Di GitHub Actions Tab**
```
https://github.com/rehanalfarizu/dashboard_digitaltwin/actions
```

Anda akan melihat:
- ✅ Green checkmark = Build success
- ❌ Red X = Build failed
- 🟡 Yellow dot = In progress

### **Badge Status (Optional)**
Tambahkan badge di README.md:
```markdown
![CI/CD](https://github.com/rehanalfarizu/dashboard_digitaltwin/workflows/CI%2FCD%20Pipeline/badge.svg)
```

---

## ⚠️ Troubleshooting

### **Problem: "npm ci" Failed**
```bash
# Solusi: Update package-lock.json
cd view_virtual
npm install
git add package-lock.json
git commit -m "fix: update package-lock.json"
git push myfork main
```

### **Problem: "Lint Failed"**
```bash
# Solusi: Fix lint errors atau disable lint
cd view_virtual
npm run lint -- --fix
```

### **Problem: "Build Failed"**
```bash
# Solusi: Test build locally dulu
cd view_virtual
npm run build
# Fix errors, lalu push
```

---

## 🎓 Next Steps

1. ✅ **Push workflow ke fork**
2. ✅ **Enable Actions di GitHub**
3. ✅ **Test dengan dummy commit**
4. 📈 **Add code coverage** (optional)
5. 🚀 **Add auto-deployment** (optional)

---

## 📞 Support

Jika CI gagal, check:
1. **Actions tab** untuk error details
2. **Logs** untuk setiap step yang failed
3. **Dependencies** apakah semua terinstall
4. **Node version** compatibility

Good luck! 🚀
