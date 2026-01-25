# Script untuk transfer file ke Raspberry Pi
# Jalankan di PowerShell Windows (bukan di SSH terminal)

$RASPI_USER = "digitaltwin"
$RASPI_HOST = "digitaltwin"
$RASPI = "${RASPI_USER}@${RASPI_HOST}"

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📤 Transfer Files ke Raspberry Pi" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Set lokasi file
Set-Location "d:\dashboard_digitaltwin\sensor iot\raspberry-pi"

# Daftar file yang akan ditransfer
$files = @(
    "yolov3-tiny.cfg",
    "yolov3-tiny.weights",
    "coco.names",
    "people_counter_yolo.py",
    "test_camera_connection.py",
    "requirements.txt",
    "download_yolo.py"
)

Write-Host "📁 File yang akan ditransfer:" -ForegroundColor Yellow
foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1MB
        Write-Host "   ✓ $file ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "   ✗ $file (tidak ditemukan)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🚀 Memulai transfer..." -ForegroundColor Cyan
Write-Host ""

$success = 0
$failed = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📤 Transferring $file..." -ForegroundColor Yellow
        scp $file "${RASPI}:~/"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ $file berhasil ditransfer" -ForegroundColor Green
            $success++
        } else {
            Write-Host "   ❌ $file gagal ditransfer" -ForegroundColor Red
            $failed++
        }
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 HASIL TRANSFER" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Berhasil: $success file" -ForegroundColor Green
Write-Host "❌ Gagal: $failed file" -ForegroundColor Red
Write-Host ""

if ($success -gt 0) {
    Write-Host "💡 Langkah selanjutnya di Raspberry Pi:" -ForegroundColor Yellow
    Write-Host "   1. Install dependencies:" -ForegroundColor White
    Write-Host "      pip3 install -r requirements.txt" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   2. Test kamera:" -ForegroundColor White
    Write-Host "      python3 test_camera_connection.py" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   3. Jalankan people counter:" -ForegroundColor White
    Write-Host "      python3 people_counter_yolo.py" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
