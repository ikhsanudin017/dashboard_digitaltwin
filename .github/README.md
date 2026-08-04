# GitHub Repository Automation

## Status

PARTIALLY_IMPLEMENTED

## Ringkasan

Folder `.github/` berisi workflow CI dan konfigurasi kolaborasi repository. README ini hanya mendokumentasikan automation GitHub dan tidak menduplikasi README produk.

## Tanggung Jawab

- Menjalankan build/test frontend yang dikonfigurasi.
- Menjalankan pemeriksaan dependency yang tersedia.
- Menyimpan issue, pull-request, ownership, dan dependency-update configuration bila ditambahkan.

## Bukan Tanggung Jawab

- Menyimpan credential deployment.
- Menjadi dokumentasi setup dashboard, firmware, edge, atau cloud.
- Menyatakan deployment berhasil tanpa job deployment dan evidence.

## Struktur Folder

```text
.github/
├── README.md
└── workflows/
    └── ci.yml
```

## Input

Push atau pull request ke branch yang dikonfigurasi serta source repository.

## Output

Status job, log CI, dan build artifact yang ditentukan workflow.

## Dependensi

GitHub Actions, Node.js, npm, dan manifest tiap modul.

## Konfigurasi

Secret workflow harus disediakan melalui GitHub Actions Secrets/Environments. Jangan menulis nilainya pada YAML atau README.

## Cara Menjalankan

Workflow dipicu melalui event pada `.github/workflows/ci.yml`. Reproduksi check frontend secara lokal dari `view_virtual/`:

```powershell
npm ci
npm run test:run -- --pool=forks --maxWorkers=1
npm run build
```

## Cara Menguji

Status: BELUM TERSEDIA untuk test workflow khusus. Validasi YAML dan job aktual dilakukan pada GitHub setelah perubahan di-push; tidak ada push/deployment pada cleanup ini.

## Troubleshooting

- Workflow saat ini memiliki check yang dapat di-skip atau dibuat non-blocking.
- Frontend build akan gagal selama `AdminDashboard.vue` masih kosong.
- Azure Functions belum memiliki lockfile dan automated test yang memadai.

## Batasan

CI belum mencakup firmware build, Python behavioral test, schema validation, secret scan blocking, E2E, atau release workflow lengkap.

## Dokumentasi Terkait

- [Testing audit](../docs/audit/TESTING_AUDIT.md)
- [Dependency audit](../docs/audit/DEPENDENCY_AUDIT.md)
- [Security audit](../docs/audit/SECURITY_AUDIT.md)

## Pemilik atau Area Keahlian

- DevOps
- QA
- Security Engineering

## Terakhir Diverifikasi

2026-08-03 pada commit baseline `ed4a22292b45423946a70f4472a1a989f31571eb`.
