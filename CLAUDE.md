# CLAUDE.md

## Project Description
Digital Twin berbasis IoT & Sensor Data dengan Visualisasi 3D, backend Azure & IoT Hub.
Monitor energi real-time ruangan: suhu, kelembaban, tegangan, arus, daya, jumlah orang.

## Tech Stack
- **Frontend**: TypeScript/JavaScript, Vue 3 + Vite, Babylon.js, Firebase Auth, Chart.js
- **IoT Edge**: C++ (ESP32/Arduino framework), Python (Raspberry Pi), PlatformIO
- **Backend**: Azure Functions (Node.js), Azure IoT Hub, Azure Table Storage
- **ML**: Python (scikit-learn, pandas), Flask API, RandomForest/GradientBoosting
- **CI/CD**: GitHub Actions, Azure Pipelines
- **Deployment**: Vercel (frontend), Azure Functions (backend)

## ATURAN WAJIB

### Aturan Umum
- **SELALU baca semua file di `MEMORY/` sebelum memberikan saran atau analisa apapun.**
- **JANGAN sarankan arsitektur atau library baru tanpa konfirmasi eksplisit dari user.**
- **SETIAP keputusan baru wajib dicatat di `MEMORY/decisions.md`.**
- **SETIAP akhir sesi update `MEMORY/progress.md`.**

### Fokus Analisa
- Review pengembangan dan deteksi bug
- Optimasi kode dan performa
- Dokumentasi teknis
- Bridging antar modul (IoT → Cloud → Frontend → ML)

### Cara Kerja dengan Repo Ini
1. Baca `CONTEXT.md` terlebih dahulu untuk memahami arsitektur menyeluruh.
2. Cek `MEMORY/` untuk context keputusan dan progress sebelumnya.
3. Baca source code file terkait sebelum memberikan saran.
4. Catat setiap keputusan baru di `MEMORY/decisions.md`.
5. Update progress di `MEMORY/progress.md` setiap akhir sesi.
