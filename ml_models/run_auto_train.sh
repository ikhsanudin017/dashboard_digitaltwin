#!/bin/bash
# ==========================================================
#  AUTO-TRAINING SCHEDULER SCRIPT
#  Menjalankan training ML secara otomatis dengan cron
# ==========================================================

# Directory path
ML_DIR="/Users/macbookpro/Desktop/dashboard_digitaltwin/ml_models"
VENV_PYTHON="/Users/macbookpro/Desktop/dashboard_digitaltwin/.venv/bin/python"
LOG_FILE="$ML_DIR/training.log"

# Function untuk logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Jalankan training
log "========== AUTO-TRAINING STARTED =========="

cd "$ML_DIR"

# Cek apakah virtual environment ada
if [ ! -f "$VENV_PYTHON" ]; then
    log "[ERROR] Python venv not found at $VENV_PYTHON"
    exit 1
fi

# Jalankan auto_train.py
$VENV_PYTHON auto_train.py 2>&1 | tee -a "$LOG_FILE"

# Cek exit status
if [ $? -eq 0 ]; then
    log "[OK] Training completed successfully"
    
    # Reload ML API jika running
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        log "[INFO] Reloading ML API..."
        curl -X POST http://localhost:5000/api/reload 2>&1 | tee -a "$LOG_FILE"
    fi
else
    log "[ERROR] Training failed"
fi

log "========== AUTO-TRAINING FINISHED =========="
