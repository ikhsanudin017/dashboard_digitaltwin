# Azure Configuration

## Azure Resources in Use

### Azure IoT Hub
| Property | Value |
|----------|-------|
| Resource Name | `iothub-digitaltwin-2026` |
| SKU | F1 (Free tier) |
| Endpoint | `iothub-digitaltwin-2026.azure-devices.net` |
| MQTT Port | 8883 |
| HTTPS Port | 443 |
| Protocol | MQTT over TLS |

**Devices registered:**
- `ESP32_ENERGY_MONITOR_001` (ESP32 energy monitor)
- `RASPBERRY_PI_CAMERA_001` (Raspberry Pi people counter)

**Auth method:** Shared Access Signature (SAS) Token
- Algorithm: HMAC-SHA256
- Token format: `SharedAccessSignature sr={resourceUri}&sig={signature}&se={expiry}`
- Generated on ESP32 using mbedtls (base64 decode key, HMAC-SHA256, base64 encode)
- Expiry: 1 hour, refreshed 2 minutes before expiry

### Azure Storage Account
| Property | Value |
|----------|-------|
| Account Name | `stordigitaltwin2026` |
| Table Endpoint | `https://stordigitaltwin2026.table.core.windows.net` |

**Tables:**
- `SensorTelemetry` — stores ESP32 telemetry data
- `PeopleCount` — stores Raspberry Pi people count data

**Auth method:** Connection string (stored in Azure Function app settings)

### Azure Function App
| Property | Value |
|----------|-------|
| App Name | `func-digitaltwin-2026` |
| URL | `https://func-digitaltwin-2026.azurewebsites.net/api` |
| Runtime | Node.js 18 |
| Plan | Consumption |

**Functions:**
| Function | Trigger | Auth |
|----------|---------|------|
| `IoTHubToStorage` | Event Hub | system managed |
| `GetTelemetryData` | HTTP | anonymous |
| `GetACRecommendation` | HTTP | anonymous |
| `SaveSensorData` | HTTP | function key |
| `SavePeopleCount` | HTTP | function key |
| `MqttToIoTHub` | HTTP | function key |

### Azure DevOps Pipeline
- File: `azure-pipelines.yml` (root)
- Status: Legacy / belum fully sync dengan struktur repo saat ini
- Build dari root level, belum sepenuhnya merepresentasikan aplikasi utama

---

## Authentication & Security Patterns

### IoT Hub → Device Authentication
```
SAS Token generation (ESP32):
1. Create stringToSign: "{resourceUri}\n{expiry}"
   where resourceUri = "{mqtt_server}/devices/{deviceId}"
2. Decode device key from base64 (mbedtls_base64_decode)
3. Compute HMAC-SHA256 using decoded key
4. Encode result to base64 (mbedtls_base64_encode)
5. URL-encode the signature (+ -> %2B, = -> %3D, / -> %2F)
6. Construct SAS token string
```

### Azure Function → Storage Authentication
- Connection string stored in `local.settings.json` / Azure Function app settings
- Key: `STORAGE_CONNECTION_STRING`
- Table client: `@azure/data-tables` `TableClient.fromConnectionString()`

### Frontend → Azure Functions
| Endpoint | Auth | Catatan |
|----------|------|---------|
| GET /telemetry/* | Anonymous | Read-only |
| POST /ac-recommendation/* | Anonymous | Prediction only |
| POST /sensor/save | `x-functions-key` header | Write via function key |
| POST /people/save | `x-functions-key` header | Write via function key |

### Frontend Write Key
- Stored in: `VITE_AZURE_FUNCTION_WRITE_KEY` env var
- Risk: key exposed in browser bundle
- Current practice: acceptable for demo/internal use
- **Recommendation for production**: Move to backend-for-frontend or Azure API Management

### Firebase Authentication
| Env Variable | Fungsi |
|-------------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA measurement ID |

**Admin auth:**
| Env Variable | Fungsi |
|-------------|--------|
| `VITE_LOCAL_ADMIN_EMAIL` | Local admin email |
| `VITE_LOCAL_ADMIN_PASSWORD` | Local admin password |
| `VITE_LOCAL_ADMIN_NAME` | Display name (default: "TwinSpace Admin") |
| `VITE_ADMIN_EMAILS` | Comma-separated allowlist |
| `VITE_AUTH_DEFAULT_DOMAIN` | Default email domain |
| `VITE_ADMIN_SESSION_TTL_MINUTES` | Admin session TTL (default: 30 min) |

### ESP32 WiFi & Azure Credentials
Stored in `sensor iot/include/secrets.h` (gitignored):
```cpp
#define WIFI_SSID "..."
#define WIFI_PASSWORD "..."
#define IOT_HUB_NAME "iothub-digitaltwin-2026"
#define IOT_DEVICE_ID "ESP32_ENERGY_MONITOR_001"
#define IOT_DEVICE_KEY "..."  // Base64-encoded device primary key
```

### Raspberry Pi → Azure IoT Hub
Environment variables in `sensor iot/raspberry-pi/.env`:
```bash
IOT_HUB_NAME="iothub-digitaltwin-2026"
IOT_DEVICE_ID="RASPBERRY_PI_CAMERA_001"
IOT_DEVICE_KEY="..."
```

---

## TLS / Certificate Configuration

### Azure IoT Hub Root CA
ESP32 firmware contains hardcoded DigiCert Global Root G2 certificate:
```
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
...
1U=
-----END CERTIFICATE-----
```
Used via `espClient.setCACert(azure_root_ca)`.

---

## Environment Files

| File | Purpose |
|------|---------|
| `view_virtual/.env` | Frontend env vars |
| `view_virtual/.env.example` | Frontend env template |
| `sensor iot/include/secrets.h` | ESP32 credentials (not committed) |
| `sensor iot/include/secrets.example.h` | ESP32 env template |
| `sensor iot/azure-setup/.env.template` | Azure setup template |
| `sensor iot/azure-setup/azure-function/local.settings.json` | Azure Functions local config |
| `sensor iot/raspberry-pi/.env` | Raspberry Pi credentials |
| `ml_models/.env` | ML training env vars |
| `ml_models/.env.example` | ML env template |

---

## Deployment Configuration

### Vercel (Frontend)
- Config: `vercel.json` (root) + `view_virtual/vercel.json`
- Build command: `npm run vercel-build` (→ `vite build`)
- Output directory: `view_virtual/dist`
- Env vars: via Vercel dashboard

### Azure Functions Deployment
```bash
cd "sensor iot/azure-setup/azure-function"
func azure functionapp publish func-digitaltwin-2026
```

### GitHub Actions CI
File: `.github/workflows/ci.yml`
Steps:
1. Checkout code
2. Node.js setup
3. Frontend: install → lint → test → build
4. Azure Functions: npm install
5. npm audit (security)

---

## Known Security Posture Issues

1. **Write key in browser**: `VITE_AZURE_FUNCTION_WRITE_KEY` embedded in JS bundle. Acceptable for demo, needs hardening for production.

2. **Hardcoded connection strings**: Beberapa utility script masih mengandung connection string langsung di kode.

3. **ESP32 secrets**: `secrets.h` harus di-gitignore dan tidak di-commit. Sudah di-gitignore, tetapi perlu perhatian saat push.

4. **CORS wide open**: Semua Azure Function mengembalikan `Access-Control-Allow-Origin: *`. Sesuai untuk public read data, tapi write endpoint perlu restrict.

5. **Anonymous read endpoints**: `GetTelemetryData` tidak ada auth. Data sensor (suhu, kelembaban) relatif low-sensitivity, tapi perlu evaluasi apakah ini acceptable untuk production use case.
