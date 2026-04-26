# Jobdesk: Software / Website (Frontend)

**Penanggung Jawab:** Frontend Developer
**Jobdesk Code:** SW-01

---

## 1. Overview

Tim Software/Website bertanggung jawab untuk semua komponen frontend — Vue 3 dashboard, Firebase authentication, 3D visualization (Babylon.js), composables, dan semua interaksi user-facing. Frontend adalah "wajah" dari Digital Twin system.

### Tools & Stack

| Tool | Fungsi |
|------|--------|
| Vue 3 | UI framework (Composition API) |
| Vite | Build tool |
| Babylon.js 8.43 | 3D rendering engine |
| Chart.js + vue-chartjs | Charting |
| Firebase 12 | Authentication |
| axios | HTTP client |
| @vueuse/core | Composition utilities |
| vitest | Testing |
| Vercel | Deployment |

---

## 2. Yang Sudah Ada (Fungsional)

### 2.1 Vue Components

| Component | File | Status | Fungsi |
|-----------|------|--------|--------|
| Dashboard Home | `DashboardHome.vue` | ✅ | Main dashboard dengan semua widget |
| Digital Twin 3D | `DigitalTwin3D_Babylon.vue` | ✅ | Babylon.js 3D viewer |
| AC Recommendation | `ACRecommendation.vue` | ✅ | ML-driven AC control |
| Energy Management | `EnergyManagement.vue` | ✅ | Energy cost analytics |
| Historical Analytics | `HistoricalAnalytics.vue` | ✅ | Historical data charts |
| Temperature Chart | `TemperatureChart.vue` | ✅ | Chart.js line chart |
| Electricity Chart | `ElectricityChart.vue` | ✅ | Chart.js line chart |
| People Chart | `PeopleChart.vue` | ✅ | Chart.js line chart |
| Data Table | `DataTable.vue` | ✅ | Sensor detail table |
| Camera Stream | `CameraStream.vue` | ✅ | Live webcam feed |
| Sensor Status | `SensorStatus.vue` | ✅ | Sensor health display |
| Admin Dashboard | `AdminDashboard.vue` | ✅ | Admin panel |
| Login Page | `LoginPage.vue` | ✅ | Firebase auth UI |

### 2.2 Composables

| Composable | File | Fungsi |
|------------|------|--------|
| `useAzureTelemetry` | `useAzureTelemetry.js` | HTTP polling Azure Function 5s |
| `useMLPrediction` | `useMLPrediction.js` | ML prediction fallback chain |
| `useAPI` | `useAPI.js` | Historical data fetch |
| `useHistoricalData` | `useHistoricalData.js` | Local historical management |
| `useFirebaseAuth` | `useFirebaseAuth.js` | Firebase auth integration |
| `useAlerts` | `useAlerts.js` | Alert management |
| `useEnergyManagement` | `useEnergyManagement.js` | Energy analytics |

### 2.3 Authentication

| Method | Status | Notes |
|--------|--------|-------|
| Google Sign-In | ✅ | Popup + redirect |
| Email/Password | ✅ | Firebase email auth |
| Admin Local | ✅ | Via env vars `VITE_LOCAL_ADMIN_EMAIL/PASSWORD` |
| Admin Firebase Claims | ✅ | Custom claims role check |
| Session TTL | ✅ | 30 min default, configurable |

### 2.4 3D Visualization (Babylon.js)

- glTF apartment scene (`public/models/3d twin/scene.gltf`)
- AC unit mesh dengan cold-air particle system
- Sensor overlay icons
- Glow layer, dark/light theme
- Mesh click interaction (partially disabled)
- Camera orbit controls

### 2.5 Current Test Suite

- **113 test PASS** (8 test files)
- `useAzureTelemetry.test.js` — fetch-based polling test
- `useMLPrediction.test.js` — ML fallback chain test
- `useAPI.test.js` — API test

---

## 3. Yang Perlu Ditambahkan (Gap Analysis)

### 3.1 Reactive 3D Material Sync — PRIORITY TINGGI

**Masalah:** Babylon.js 3D scene tidak visually react ke sensor data. Mesh warna/material tidak berubah berdasarkan suhu atau status AC.

**Kondisi saat ini:** Scene hanya display static model. AC unit mesh tidak update warna/status dari data real-time.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Temperature Color Mapping** | Mesh walls/floor berubah warna: dingin = biru, panas = merah |
| **AC Status Visual** | AC unit mesh animasi sesuai status (cooling = cold air particles active, off = no particles) |
| **People Count Heatmap** | Visual heatmap overlay berdasarkan jumlah orang |
| **Power Usage Glow** | Appliance meshes glow sesuai power consumption |
| **Alert State Visual** | Mesh highlight merah/kuning saat threshold exceeded |

**File baru:**

```
view_virtual/src/components/
├── DigitalTwin3D_Babylon.vue   # UPDATE — reactive materials
├── SCADAOverlay.vue            # NEW — SCADA-style alarm overlay
└── TwinStateIndicator.vue      # NEW — real-time state badge
```

**Modifikasi `DigitalTwin3D_Babylon.vue`:**

```javascript
// Contoh: reactive temperature color
const temperatureColor = computed(() => {
  const t = sensorData.value.temperature
  if (t < 22) return Color3.FromHexString('#00BFFF') // cold blue
  if (t < 26) return Color3.FromHexString('#00FF7F') // normal green
  if (t < 30) return Color3.FromHexString('#FFA500') // warm orange
  return Color3.FromHexString('#FF4500') // hot red
})
```

### 3.2 Real-Time WebSocket / SignalR — PRIORITY TINGGI

**Masalah:** Frontend relies on HTTP polling setiap 5 detik. Tidak ada real-time push dari server.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Azure SignalR Service** | Real-time push dari Azure Functions ke frontend |
| **WebSocket Connection** | Persistent connection, auto-reconnect |
| **Live Data Updates** | Instant update saat sensor data berubah (tanpa 5s delay) |
| **Presence Indicator** | Show "live" vs "polling" connection status |

**File baru:**

```
view_virtual/src/
├── composables/
│   └── useRealtimeConnection.js  # SignalR hub connection
└── components/
    └── ConnectionStatusBadge.vue  # Live/offline indicator
```

**Modifikasi:**

| File | Perubahan |
|------|-----------|
| `useAzureTelemetry.js` | Optional: upgrade dari polling ke SignalR |
| `App.vue` | Initialize SignalR hub on mount |
| `DashboardHome.vue` | Update status badge untuk realtime |

### 3.3 Command-to-Device UI — PRIORITY TINGGI

**Masalah:** "Apply Recommendation" button di `ACRecommendation.vue` hanya menampilkan `alert()`, tidak ada actual command ke ESP32.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Send Command Button** | POST ke `/command/send` endpoint |
| **Command Status Feedback** | Show sent/pending/confirmed/timeout |
| **Confirmation Dialog** | "Apply AC setpoint 24°C?" sebelum kirim |
| **History Log** | Command history di AdminDashboard |

**Modifikasi:**

```javascript
// ACRecommendation.vue — applyRecommendation()
const applyRecommendation = async () => {
  const confirmed = confirm(`Set AC ke ${recommendation.value.target_temp}°C?`)
  if (!confirmed) return

  const result = await fetch(`${AZURE_FUNCTION_URL}/command/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: 'ESP32_ENERGY_MONITOR_001',
      command: {
        target_temp: recommendation.value.target_temp,
        power: true,
        mode: 'cool'
      },
      trace_id: generateTraceId()
    })
  })

  if (result.ok) {
    showNotification('Command sent!', 'success')
  } else {
    showNotification('Failed to send command', 'error')
  }
}
```

### 3.4 Alerting Dashboard — PRIORITY SEDANG

**Masalah:** Alert settings ada di `AdminDashboard.vue` tapi tidak ada backend rule processing. Threshold di localStorage tapi tidak ada push notification.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Alert Rules Engine** | Backend check threshold di Azure Function |
| **Push Notification** | Browser push notification saat alert triggered |
| **Alert History** | Log semua alert dengan timestamp |
| **Snooze/Dismiss** | User bisa snooze alert sementara |

**File baru:**

```
view_virtual/src/
├── composables/
│   └── useAlerts.js              # UPDATE — real alert engine
└── components/
    └── AlertNotification.vue    # NEW — toast notification
```

### 3.5 Schema Validation — PRIORITY SEDANG

**Masalah:** Tidak ada validation untuk kontrak data end-to-end. Jika ESP32 payload berubah, Azure Function dan frontend bisa break tanpa warning.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **JSON Schema Validation** | Zod atau AJV untuk validate API responses |
| **SDK Typed Client** | Typed client untuk Azure Function calls |
| **Migration Path** | Version handling untuk API schema changes |

**File baru:**

```javascript
// view_virtual/src/lib/schemas.js
import { z } from 'zod'

export const SensorDataSchema = z.object({
  suhu: z.number().min(-10).max(60),
  kelembaban: z.number().min(0).max(100),
  tegangan: z.number().min(0).max(300),
  arus: z.number().min(0).max(100),
  daya: z.number().min(0).max(10000),
  status_tegangan: z.enum(['terhubung', 'tidak_terhubung', 'unknown']),
  status_arus: z.enum(['terhubung', 'tidak_terhubung', 'unknown']),
  timestamp: z.string().datetime()
})
```

### 3.6 Multi-Room / Multi-Floor Support — PRIORITY SEDANG

**Masalah:** Dashboard hanya untuk 1 ruangan. Tidak support multi-room atau multi-floor.

**Fitur yang dibutuhkan:**

| Fitur | Deskripsi |
|-------|-----------|
| **Room Selector** | Dropdown untuk pilih ruangan |
| **Multi-Floor Navigation** | Tab/button untuk floor |
| **Room-Level Analytics** | Per-room energy, cost, comfort score |

---

## 4. Technical Details

### 4.1 File yang Perlu Dibuat (New Files)

```
view_virtual/src/
├── components/
│   ├── SCADAOverlay.vue           # SCADA-style alarm overlay
│   ├── TwinStateIndicator.vue     # Real-time state badge
│   └── AlertNotification.vue      # Toast notification
├── composables/
│   ├── useRealtimeConnection.js   # SignalR hub connection
│   ├── useAlertEngine.js           # Alert rules + notification
│   └── useCommandSender.js         # Command to device logic
└── lib/
    ├── schemas.js                  # Zod schemas
    └── signalrClient.js           # SignalR hub setup
```

### 4.2 File yang Perlu Dimodifikasi

| File | Perubahan |
|------|-----------|
| `DigitalTwin3D_Babylon.vue` | Reactive materials, sensor data binding |
| `ACRecommendation.vue` | Send command to device on apply |
| `AdminDashboard.vue` | Alert history log, command history |
| `useAzureTelemetry.js` | Optional SignalR upgrade |
| `useAlerts.js` | Real alert engine |
| `DashboardHome.vue` | Room selector, multi-floor nav |
| `App.vue` | Initialize SignalR |
| `router/index.js` | Add routes untuk multi-room |

### 4.3 Dependencies dengan Jobdesk Lain

| Jobdesk | Dependency | Notes |
|---------|-----------|-------|
| **Cloud Engine** | `/command/send` endpoint | Backend perlu dibuat duluan |
| **Cloud Engine** | SignalR hub dari Azure | Azure SignalR Service |
| **ML Engine** | Prediction API | useMLPrediction.js |
| **3D Design** | glTF model dengan material names | Naming convention untuk mesh binding |
| **IoT Hardware** | Device state feedback | ESP32 perlu confirm command |

---

## 5. Frontend Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         VUE 3 APP                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐ ┌────────────┐  │
│  │Firebase │ │ SignalR  │ │ Azure Func  │ │ Babylon.js │  │
│  │ Auth    │ │ Hub      │ │ HTTP API    │ │ 3D Engine │  │
│  └────┬────┘ └────┬─────┘ └──────┬──────┘ └─────┬──────┘  │
│       │          │              │             │          │
│       ▼          ▼              ▼             ▼          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                    COMPOSABLES                       │  │
│  │  useFirebaseAuth │ useRealtime │ useAzureTelemetry  │  │
│  │  useMLPrediction │ useAlerts    │ useCommandSender   │  │
│  └─────────────────────────────────────────────────────┘  │
│                           │                                 │
│       ┌───────────────────┼───────────────────┐           │
│       ▼                   ▼                   ▼           │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Dashboard│ │ Admin   │ │DigitalTwin│ │ACRecommendation│   │
│  │ Home   │ │Dashboard│ │ 3D View  │ │              │   │
│  └─────────┘ └─────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
    ┌─────────┐                         ┌─────────┐
    │ Vercel  │                         │ Firebase│
    │ CDN     │                         │ Hosting │
    └─────────┘                         └─────────┘
```

---

## 6. Component State Management

| Component | State Source | Update Mechanism |
|-----------|-------------|------------------|
| `DashboardHome` | `useAzureTelemetry` | Polling 5s |
| `DigitalTwin3D` | `useAzureTelemetry` | Polling 5s → reactive materials |
| `ACRecommendation` | `useMLPrediction` | Fallback chain |
| `EnergyManagement` | `useEnergyManagement` | Polling 5s |
| `HistoricalAnalytics` | `useHistoricalData` | On-demand fetch |
| `AdminDashboard` | `useAzureTelemetry` | Polling 5s |
| `AlertNotification` | `useAlerts` | Event-driven |

---

## 7. Timeline Suggestion

| Fase | Durasi | Fitur |
|------|--------|-------|
| **Phase 1** | 1-2 minggu | Reactive 3D materials (`DigitalTwin3D_Babylon.vue` update) |
| **Phase 2** | 1 minggu | Command-to-device UI (`ACRecommendation.vue` apply button) |
| **Phase 3** | 1-2 minggu | SignalR real-time connection |
| **Phase 4** | 1 minggu | Alerting dashboard + notification |
| **Phase 5** | 1 minggu | Schema validation (Zod) |
| **Phase 6** | 1-2 minggu | Multi-room support |

---

## 8. Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| **Babylon.js bundle size** | Lazy load 3D component, code split |
| **3D render performance** | LOD (Level of Detail) untuk complex meshes |
| **Chart.js re-render** | Use `shallowRef` untuk large data arrays |
| **Bundle size** | Vite tree-shaking, route-based code splitting |
| **PWA offline** | Service worker sudah ada, perlu verify |

---

## 9. Verification Checklist

- [ ] `DigitalTwin3D_Babylon.vue` mesh colors berubah sesuai sensor data (temperature color mapping)
- [ ] ACRecommendation apply button kirim command ke ESP32 (verified via serial monitor)
- [ ] Command status badge show sent/confirmed/timeout
- [ ] Alert notification muncul saat threshold exceeded
- [ ] Schema validation throw error saat invalid data (test dengan mock data)
- [ ] Multi-room selector berfungsi
- [ ] PWA bisa offline dan cache data
- [ ] Build: `npm run build` tidak error, bundle < 10MB gzip
- [ ] Tests: `npm test` tetap 113+ PASS

---

## 10. Accessibility & UX

| Item | Status |
|------|--------|
| Dark/Light mode toggle | ✅ Ada |
| Responsive (mobile) | ⚠️ Partial — perlu test di mobile |
| Keyboard navigation | ❌ Belum ada |
| Screen reader | ❌ Belum ada |
| Error state UI | ⚠️ Basic — perlu improve |
| Loading states | ⚠️ Partial — perlu standardize |
| Toast notifications | ❌ Belum ada (planned) |

---

## 11. Notes

- Babylon.js bundle sangat besar (~6MB uncompressed) — perlu lazy loading strategy
- Vue PWA plugin sudah configured — verify service worker registration
- Firebase Auth sudah production-ready — tidak perlu ubah
- `useAzureTelemetry` namanya sudah akurat setelah rename dari `useMQTT`

**Next Action:** Mulai dari Phase 1 — update `DigitalTwin3D_Babylon.vue` dengan reactive temperature color mapping.