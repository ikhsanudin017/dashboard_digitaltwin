# MqttToIoTHub - DEPRECATED

⚠️ **Function ini TIDAK TERPAKAI lagi**

## Alasan:
- ESP32 sudah kirim data langsung ke Azure IoT Hub via MQTT native (port 8883)
- Data flow sekarang: `ESP32 → IoT Hub → EventHub → IoTHubToStorage`
- Function HTTP ini hanya untuk testing/fallback

## Status:
- ❌ Tidak digunakan dalam production
- ✅ Bisa dihapus atau disable
- ℹ️ Keep untuk reference/testing saja

## Alternative:
Gunakan `SaveSensorData/` function jika perlu HTTP endpoint untuk testing.
