<template>
  <div class="admin" :class="{ dark: isDarkMode }">

    <!-- ═══ SIDEBAR ═══ -->
    <aside class="sidebar" :class="{ 'mobile-open': isMobileMenuOpen }">

      <!-- Brand -->
      <div class="sidebar-brand">
        <div class="brand-logo-wrap">
          <img src="/logo.png" alt="TwinUvo" class="brand-logo" />
        </div>
        <div class="brand-text">
          <strong class="brand-title">TwinUvo</strong>
          <span class="brand-role">Admin Panel</span>
        </div>
        <button class="menu-close-btn" type="button" aria-label="Tutup menu" @click="isMobileMenuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="nav" role="navigation" aria-label="Menu utama">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          type="button"
          :aria-current="activeSection === item.id ? 'page' : undefined"
          :title="item.label"
          @click="selectSection(item.id)"
        >
          <span class="nav-icon" aria-hidden="true" v-html="item.icon"></span>
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="activeSection === item.id" class="nav-active-dot" aria-hidden="true"></span>
        </button>
      </nav>

      <!-- Footer -->
      <div class="sidebar-footer">
        <div class="admin-chip">
          <div class="admin-avatar-wrap">
            <img v-if="user?.photoURL" :src="user.photoURL" class="admin-avatar" referrerpolicy="no-referrer" alt="Avatar" />
            <div v-else class="admin-avatar admin-avatar-fallback" aria-hidden="true">{{ userInitials }}</div>
          </div>
          <div class="admin-info">
            <span class="admin-name">{{ displayName }}</span>
            <span class="admin-email">{{ user?.email || '' }}</span>
          </div>
        </div>
        <button class="action-btn logout-btn" type="button" @click="$emit('logout')">
          <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Mobile overlay -->
    <div v-if="isMobileMenuOpen" class="mobile-overlay" role="presentation" @click="isMobileMenuOpen = false"></div>

    <!-- ═══ MAIN CONTENT ═══ -->
    <main class="main-content">
      <!-- Top bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="burger-btn" type="button" aria-label="Buka menu navigasi" @click="isMobileMenuOpen = true">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="topbar-info">
            <h1 class="page-title">{{ currentPageTitle }}</h1>
            <p class="page-subtitle">{{ currentPageSubtitle }}</p>
          </div>
        </div>
        <div class="topbar-right">
          <div class="status-pill" :class="isConnected ? 'online' : 'offline'">
            <span class="status-dot"></span>
            {{ isConnected ? 'Azure Connected' : 'Offline Mode' }}
          </div>
          <button class="theme-btn" type="button" :aria-label="isDarkMode ? 'Mode terang' : 'Mode gelap'" @click="$emit('toggle-theme')">
            <svg v-if="isDarkMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="theme-icon" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.2M12 19.4v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="theme-icon" aria-hidden="true">
              <path d="M21.4 14.7A9.2 9.2 0 1 1 9.3 2.6a7.6 7.6 0 1 0 12.1 12.1z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- ═══ SECTION: OVERVIEW ═══ -->
      <section v-if="activeSection === 'overview'" class="section">
        <!-- Hero banner -->
        <div class="hero-banner">
          <div class="hero-left">
            <span class="hero-kicker">System Overview</span>
            <h2 class="hero-title">Monitoring & Kontrol Ruang Digital Twin</h2>
            <p class="hero-desc">Pusat kendali utama untuk memantau kondisi sensor, energi, dan aktivitas sistem secara real-time.</p>
          </div>
          <div class="hero-badges">
            <div class="hero-badge" :class="isConnected ? 'online' : 'offline'">
              <span class="badge-dot"></span>
              {{ isConnected ? 'Azure Live' : 'Offline' }}
            </div>
            <div class="hero-badge neutral">
              <span class="badge-dot neutral-dot"></span>
              {{ onlineDeviceCount }} perangkat aktif
            </div>
          </div>
        </div>

        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card" style="--card-accent: #06b6d4">
            <div class="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
              </svg>
            </div>
            <div class="stat-body">
              <span class="stat-label">Suhu Ruangan</span>
              <span class="stat-value">{{ sensorData.temperature.toFixed(1) }}<small>°C</small></span>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #3b82f6">
            <div class="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
            </div>
            <div class="stat-body">
              <span class="stat-label">Kelembaban</span>
              <span class="stat-value">{{ sensorData.humidity.toFixed(1) }}<small>%</small></span>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #8b5cf6">
            <div class="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <div class="stat-body">
              <span class="stat-label">Daya Listrik</span>
              <span class="stat-value">{{ (sensorData.power || 0).toFixed(0) }}<small>W</small></span>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #10b981">
            <div class="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="stat-body">
              <span class="stat-label">Jumlah Orang</span>
              <span class="stat-value">{{ sensorData.peopleCount || 0 }}<small>orang</small></span>
            </div>
          </div>

          <div class="stat-card" style="--card-accent: #f59e0b">
            <div class="stat-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            <div class="stat-body">
              <span class="stat-label">Tegangan</span>
              <span class="stat-value">{{ sensorData.voltage.toFixed(0) }}<small>V</small></span>
            </div>
          </div>
        </div>

        <!-- Quick actions + Activity Log -->
        <div class="two-col">
          <!-- Quick Actions -->
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Quick Actions</h3>
            </div>
            <div class="quick-grid">
              <button class="quick-btn" type="button" @click="activeSection = 'energy'">
                <span class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </span>
                <span class="quick-label">Energy</span>
                <span class="quick-sub">Manajemen & biaya</span>
              </button>
              <button class="quick-btn" type="button" @click="activeSection = 'analytics'">
                <span class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </span>
                <span class="quick-label">Analytics</span>
                <span class="quick-sub">Data historis</span>
              </button>
              <button class="quick-btn" type="button" @click="activeSection = 'devices'">
                <span class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                </span>
                <span class="quick-label">Devices</span>
                <span class="quick-sub">Status IoT</span>
              </button>
              <button class="quick-btn" type="button" @click="activeSection = 'settings'">
                <span class="quick-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                  </svg>
                </span>
                <span class="quick-label">Settings</span>
                <span class="quick-sub">Konfigurasi</span>
              </button>
            </div>
          </div>

          <!-- Activity Log -->
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">Aktivitas Terbaru</h3>
              <span class="log-count">{{ activityLog.length }} event</span>
            </div>
            <div class="log-list">
              <div v-for="(log, i) in activityLog.slice(0, 8)" :key="i" class="log-item" :style="{ animationDelay: `${i * 60}ms` }">
                <span class="log-icon-wrap" v-html="log.icon"></span>
                <div class="log-body">
                  <span class="log-msg">{{ log.message }}</span>
                  <span class="log-time">{{ log.time }}</span>
                </div>
              </div>
              <div v-if="activityLog.length === 0" class="log-empty">Belum ada aktivitas.</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ SECTION: ENERGY ═══ -->
      <section v-if="activeSection === 'energy'" class="section">
        <EnergyManagement :is-dark-mode="isDarkMode" :current-power="sensorData.power" />
      </section>

      <!-- ═══ SECTION: ANALYTICS ═══ -->
      <section v-if="activeSection === 'analytics'" class="section">
        <HistoricalAnalytics :is-dark-mode="isDarkMode" :current-people-count="sensorData.peopleCount || 0" />
      </section>

      <!-- ═══ SECTION: DEVICES ═══ -->
      <section v-if="activeSection === 'devices'" class="section">
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Manajemen Perangkat IoT</h3>
            <div class="device-summary">
              <span class="summary-item online">{{ onlineDeviceCount }} Online</span>
              <span class="summary-divider">/</span>
              <span class="summary-item">{{ devices.length }} Total</span>
            </div>
          </div>
          <div class="device-grid">
            <div
              v-for="device in devices"
              :key="device.id"
              class="device-card"
              :class="device.statusClass"
            >
              <div class="device-card-top">
                <div class="device-icon-wrap">
                  <span v-html="device.icon"></span>
                </div>
                <div class="device-status-badge" :class="device.statusClass">
                  <span class="badge-pulse"></span>
                  {{ device.status }}
                </div>
              </div>
              <div class="device-card-body">
                <strong class="device-name">{{ device.name }}</strong>
                <code class="device-id">{{ device.id }}</code>
                <span class="device-type">{{ device.type }}</span>
              </div>
              <div class="device-card-footer">
                <span class="device-last-label">Update terakhir</span>
                <span class="device-last" :class="{ 'time-ok': device.statusClass === 'online' }">{{ device.lastSeen }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ SECTION: ALERTS ═══ -->
      <section v-if="activeSection === 'alerts'" class="section">

        <!-- Alert Summary -->
        <div class="alert-head">
          <div class="alert-head-left">
            <div class="alert-head-icon" :class="activeAlertCount > 0 ? 'danger' : 'ok'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <h2 class="alert-head-title">Pengaturan Threshold</h2>
              <p class="alert-head-desc">Atur batas minimum dan maksimum untuk setiap parameter monitoring.</p>
            </div>
          </div>
          <div class="alert-head-chip" :class="activeAlertCount > 0 ? 'chip-danger' : 'chip-ok'">
            <span class="chip-dot-sm"></span>
            {{ activeAlertCount > 0 ? `${activeAlertCount} alert aktif` : 'Semua normal' }}
          </div>
        </div>

        <!-- Alert Cards -->
        <div class="alert-row">
          <div
            v-for="(alert, i) in alertSettings"
            :key="alert.key"
            class="alert-card"
            :class="getAlertStatus(alert)"
          >
            <!-- Card header -->
            <div class="alert-c-top">
              <div class="alert-c-icon" :class="getAlertStatus(alert)">
                <span v-html="alert.icon"></span>
              </div>
              <div class="alert-c-meta">
                <strong class="alert-c-name">{{ alert.label }}</strong>
                <span class="alert-c-val">Sekarang: {{ formatAlertValue(alert) }}</span>
              </div>
            </div>

            <!-- Inputs -->
            <div class="alert-c-range">
              <div class="range-field">
                <label class="range-lbl">Min</label>
                <input type="number" v-model.number="alert.min" :step="alert.step" min="0" class="range-input" />
              </div>
              <span class="range-sep">—</span>
              <div class="range-field">
                <label class="range-lbl">Max</label>
                <input type="number" v-model.number="alert.max" :step="alert.step" min="0" class="range-input" />
              </div>
            </div>

            <!-- Status -->
            <div class="alert-c-status" :class="getAlertStatus(alert)">
              <svg v-if="getAlertStatus(alert) === 'alert-ok'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {{ getAlertBadgeText(alert) }}
            </div>
          </div>
        </div>

        <!-- Save Bar -->
        <div class="save-bar">
          <p class="save-bar-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Threshold tersimpan otomatis. Klik simpan untuk konfirmasi.
          </p>
          <button class="btn-primary" type="button" @click="saveAlertSettings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            Simpan
          </button>
        </div>
      </section>

      <!-- ═══ SECTION: SETTINGS ═══ -->
      <section v-if="activeSection === 'settings'" class="section">
        <!-- System Settings -->
        <div class="panel">
          <div class="panel-header">
            <h3 class="panel-title">Pengaturan Sistem</h3>
          </div>
          <div class="settings-list">
            <div class="setting-row">
              <div class="setting-info">
                <strong>Polling Interval</strong>
                <span>Interval pengambilan data dari Azure (detik)</span>
              </div>
              <div class="setting-control">
                <input type="number" v-model.number="systemSettings.pollingInterval" min="1" max="60" class="setting-input" />
                <span class="setting-unit">detik</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Tarif Listrik</strong>
                <span>Tarif PLN per kWh (Rp)</span>
              </div>
              <div class="setting-control">
                <span class="setting-unit">Rp</span>
                <input type="number" v-model.number="systemSettings.tariff" min="0" step="0.01" class="setting-input" />
                <span class="setting-unit">/kWh</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Target Bulanan</strong>
                <span>Target konsumsi energi bulanan</span>
              </div>
              <div class="setting-control">
                <input type="number" v-model.number="systemSettings.monthlyTarget" min="0" class="setting-input" />
                <span class="setting-unit">kWh</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Kapasitas Ruangan</strong>
                <span>Jumlah maksimum orang</span>
              </div>
              <div class="setting-control">
                <input type="number" v-model.number="systemSettings.roomCapacity" min="1" class="setting-input" />
                <span class="setting-unit">orang</span>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Azure Endpoint</strong>
                <span>URL Azure Functions API</span>
              </div>
              <div class="setting-control wide">
                <code class="setting-code">{{ azureFunctionUrl }}</code>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info">
                <strong>Demo Mode</strong>
                <span>Gunakan data simulasi jika backend tidak tersedia</span>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" v-model="systemSettings.demoMode" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div class="panel-footer no-gap">
            <button class="btn-outline" type="button" @click="clearLocalCache">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
              Clear Cache
            </button>
            <button class="btn-primary" type="button" @click="saveSystemSettings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Simpan Sistem
            </button>
          </div>
        </div>

        <!-- System Info -->
        <div class="panel system-info-panel">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Informasi Stack Teknologi</h3>
              <p class="panel-desc">Komponen inti yang menopang Digital Twin Dashboard.</p>
            </div>
            <div class="stack-pill">
              <span class="stack-dot"></span>
              {{ systemInfoItems.length }} komponen
            </div>
          </div>
          <div class="info-grid">
            <div
              v-for="item in systemInfoItems"
              :key="item.label"
              class="info-item"
              :class="item.tone"
            >
              <div class="info-item-head">
                <div class="info-icon-wrap">
                  <span v-html="item.icon"></span>
                </div>
                <span class="info-label">{{ item.label }}</span>
              </div>
              <strong class="info-value">{{ item.value }}</strong>
              <span class="info-note">{{ item.note }}</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import EnergyManagement from './EnergyManagement.vue'
import HistoricalAnalytics from './HistoricalAnalytics.vue'
import { useAzureTelemetry } from '../composables/useAzureTelemetry'
import { AZURE_FUNCTION_URL } from '../lib/appConfig'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  user: { type: Object, default: null }
})

const emit = defineEmits(['toggle-theme', 'logout'])

const { isConnected, sensorData, startPolling, stopPolling } = useAzureTelemetry()

const activeSection = ref('overview')
const isMobileMenuOpen = ref(false)
const azureFunctionUrl = AZURE_FUNCTION_URL

const selectSection = (id) => {
  activeSection.value = id
  isMobileMenuOpen.value = false
}

const navItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>'
  }
]

const currentPageTitle = computed(() => {
  const map = {
    overview: 'Dashboard Overview',
    energy: 'Energy Management',
    analytics: 'Historical Analytics',
    devices: 'Device Management',
    alerts: 'Alert Settings',
    settings: 'System Settings'
  }
  return map[activeSection.value] || 'Admin'
})

const currentPageSubtitle = computed(() => {
  const map = {
    overview: 'Ringkasan sistem dan status sensor real-time',
    energy: 'Analisis konsumsi energi dan rekomendasi AI',
    analytics: 'Grafik historis dan tren data sensor',
    devices: 'Status dan manajemen perangkat IoT',
    alerts: 'Konfigurasi threshold dan notifikasi parameter',
    settings: 'Pengaturan sistem dan konfigurasi dashboard'
  }
  return map[activeSection.value] || ''
})

const displayName = computed(() => props.user?.displayName || props.user?.email || 'Admin')
const userInitials = computed(() => {
  const name = displayName.value.trim()
  if (!name) return 'AD'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})

// Devices
const devices = computed(() => [
  {
    id: 'ESP32-001',
    name: 'ESP32 Sensor Node',
    type: 'Suhu, Kelembaban, Tegangan, Arus, Daya',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/></svg>',
    status: isConnected.value ? 'Online' : 'Offline',
    statusClass: isConnected.value ? 'online' : 'offline',
    lastSeen: isConnected.value ? 'Baru saja' : 'N/A'
  },
  {
    id: 'RPi-CAM-001',
    name: 'Raspberry Pi Camera',
    type: 'People Counter via YOLOv3-tiny',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    status: 'Online',
    statusClass: 'online',
    lastSeen: 'Baru saja'
  },
  {
    id: 'AC-UNIT-001',
    name: 'AC Smart Controller',
    type: 'Kontrol suhu via IR + Azure IoT Hub',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20M12 2a10 10 0 0 1 0 20M12 2a10 10 0 0 0 0 20"/></svg>',
    status: 'Standby',
    statusClass: 'warning',
    lastSeen: '5 menit lalu'
  },
  {
    id: 'GW-MQTT-001',
    name: 'MQTT Gateway',
    type: 'Azure IoT Hub Cloud Sync',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>',
    status: isConnected.value ? 'Connected' : 'Disconnected',
    statusClass: isConnected.value ? 'online' : 'offline',
    lastSeen: isConnected.value ? 'Live' : 'N/A'
  }
])

const onlineDeviceCount = computed(() =>
  devices.value.filter(d => d.statusClass === 'online').length
)

// System info
const systemInfoItems = [
  { label: 'Frontend', value: 'Vue 3 + Vite', note: 'UI utama dan PWA bundler aplikasi', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>', tone: 'cyan' },
  { label: '3D Engine', value: 'Babylon.js', note: 'Digital twin interaktif dan rendering 3D', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', tone: 'blue' },
  { label: 'Chart', value: 'Chart.js', note: 'Visualisasi data real-time dan historis', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', tone: 'violet' },
  { label: 'Auth', value: 'Firebase Auth', note: 'Google Sign-In dan email auth untuk operator', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', tone: 'amber' },
  { label: 'Backend', value: 'Azure Functions', note: 'API telemetry, AC recommendation, dan ingest', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>', tone: 'cyan' },
  { label: 'Storage', value: 'Azure Table', note: 'Penyimpanan histori telemetry dan people count', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>', tone: 'slate' },
  { label: 'ML', value: 'Azure Machine Learning', note: 'XGBoost power estimator & forecast 30m · Candidate v1 · human-in-the-loop', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 12 12 6"/><path d="M12 12 16 14"/><circle cx="12" cy="12" r="2"/></svg>', tone: 'rose' },
  { label: 'IoT', value: 'ESP32 + RPi', note: 'Edge device: sensor, IR control, YOLO camera', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>', tone: 'emerald' }
]

// Alert settings
const alertSettings = ref([
  { key: 'temperature', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>', label: 'Suhu Ruangan', min: 15, max: 30, step: 0.5, currentValue: () => sensorData.value.temperature },
  { key: 'humidity', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>', label: 'Kelembaban', min: 30, max: 80, step: 1, currentValue: () => sensorData.value.humidity },
  { key: 'voltage', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>', label: 'Tegangan AC', min: 180, max: 250, step: 1, currentValue: () => sensorData.value.voltage },
  { key: 'power', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', label: 'Daya Listrik', min: 0, max: 4000, step: 10, currentValue: () => sensorData.value.power || 0 },
  { key: 'people', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label: 'Jumlah Orang', min: 0, max: 20, step: 1, currentValue: () => sensorData.value.peopleCount || 0 }
])

const activeAlertCount = computed(() =>
  alertSettings.value.filter(alert => getAlertStatus(alert) === 'alert-danger').length
)

const getAlertCurrentValue = (alert) => {
  const value = typeof alert.currentValue === 'function' ? alert.currentValue() : 0
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0
}

const formatAlertValue = (alert) => {
  const value = getAlertCurrentValue(alert)
  return alert.step < 1 ? value.toFixed(1) : value.toFixed(0)
}

const getAlertStatus = (alert) => {
  const val = getAlertCurrentValue(alert)
  if (val < alert.min || val > alert.max) return 'alert-danger'
  return 'alert-ok'
}

const getAlertBadgeText = (alert) =>
  getAlertStatus(alert) === 'alert-danger' ? 'Perlu perhatian' : 'Stabil'

const getAlertStatusText = (alert) => {
  const val = getAlertCurrentValue(alert)
  if (val < alert.min) return `Di bawah minimum (${val})`
  if (val > alert.max) return `Di atas maksimum (${val})`
  return `Dalam range normal (${typeof val === 'number' ? val.toFixed(1) : val})`
}

const saveAlertSettings = () => {
  localStorage.setItem('admin_alert_settings', JSON.stringify(alertSettings.value))
  addLog('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', 'Alert settings disimpan')
  showToast('Pengaturan alert berhasil disimpan!')
}

// System settings
const systemSettings = ref({
  pollingInterval: 5,
  tariff: 1444.70,
  monthlyTarget: 100,
  roomCapacity: 20,
  demoMode: false
})

const saveSystemSettings = () => {
  localStorage.setItem('admin_system_settings', JSON.stringify(systemSettings.value))
  addLog('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>', 'System settings disimpan')
  showToast('Pengaturan sistem berhasil disimpan!')
}

const clearLocalCache = () => {
  if (confirm('Yakin ingin menghapus semua cache lokal?')) {
    localStorage.removeItem('sensor_last_data')
    localStorage.removeItem('digitaltwin_historical_data')
    localStorage.removeItem('digitaltwin_energy_management')
    addLog('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>', 'Cache lokal dibersihkan')
    showToast('Cache lokal berhasil dihapus!')
  }
}

// Activity log
const activityLog = ref([])

const addLog = (icon, message) => {
  activityLog.value.unshift({
    icon,
    message,
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  })
  if (activityLog.value.length > 50) activityLog.value.pop()
}

const showToast = (message) => {
  const toast = document.createElement('div')
  toast.className = `toast ${isDarkMode ? 'dark' : 'light'} ${isDarkMode ? '' : ''}`
  toast.setAttribute('role', 'status')
  toast.setAttribute('aria-live', 'polite')
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  setTimeout(() => {
    toast.classList.remove('show')
    setTimeout(() => toast.remove(), 400)
  }, 3000)
}

// Lifecycle
onMounted(() => {
  startPolling()
  addLog('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', 'Admin panel opened')
  addLog('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><line x1="1" y1="1" x2="23" y2="23"/></svg>', isConnected.value ? 'Azure polling aktif' : 'Mode offline — data simulasi')

  try {
    const savedSystem = localStorage.getItem('admin_system_settings')
    if (savedSystem) systemSettings.value = { ...systemSettings.value, ...JSON.parse(savedSystem) }

    const savedAlerts = localStorage.getItem('admin_alert_settings')
    if (savedAlerts) alertSettings.value = JSON.parse(savedAlerts)
  } catch (e) { /* ignore */ }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

/* ═══════════════════════════════════
   CSS VARIABLE SYSTEM
═══════════════════════════════════ */
.admin {
  --admin-bg: #f1f5f9;
  --admin-surface: #ffffff;
  --admin-surface-2: rgba(255, 255, 255, 0.96);
  --admin-line: rgba(15, 23, 42, 0.08);
  --admin-line-strong: rgba(15, 23, 42, 0.14);
  --admin-accent: #06b6d4;
  --admin-accent-soft: rgba(6, 182, 212, 0.1);
  --admin-accent-deep: #0284c7;
  --admin-text: #0f172a;
  --admin-text-soft: #475569;
  --admin-text-muted: #94a3b8;
  --admin-success: #059669;
  --admin-success-soft: rgba(16, 185, 129, 0.1);
  --admin-warn: #d97706;
  --admin-warn-soft: rgba(245, 158, 11, 0.1);
  --admin-error: #dc2626;
  --admin-error-soft: rgba(239, 68, 68, 0.1);
  --admin-radius: 20px;
  --admin-radius-sm: 12px;
  --admin-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
  --admin-shadow-lg: 0 16px 48px rgba(15, 23, 42, 0.1);

  display: flex;
  min-height: 100vh;
  background: var(--admin-bg);
  color: var(--admin-text);
  font-family: 'IBM Plex Sans', sans-serif;
  transition: background 0.3s ease, color 0.3s ease;
}

.admin.dark {
  --admin-bg: #060d18;
  --admin-surface: #0e1929;
  --admin-surface-2: rgba(14, 25, 41, 0.96);
  --admin-line: rgba(255, 255, 255, 0.07);
  --admin-line-strong: rgba(255, 255, 255, 0.14);
  --admin-accent: #22d3ee;
  --admin-accent-soft: rgba(34, 211, 238, 0.1);
  --admin-accent-deep: #67e8f9;
  --admin-text: #e2e8f0;
  --admin-text-soft: #94a3b8;
  --admin-text-muted: #64748b;
  --admin-success: #34d399;
  --admin-success-soft: rgba(52, 211, 153, 0.1);
  --admin-warn: #fbbf24;
  --admin-warn-soft: rgba(251, 191, 36, 0.1);
  --admin-error: #f87171;
  --admin-error-soft: rgba(248, 113, 113, 0.1);
  --admin-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  --admin-shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.35);
}

/* ═══════════════════════════════════
   SIDEBAR
═══════════════════════════════════ */
.sidebar {
  width: 268px;
  flex-shrink: 0;
  background: var(--admin-surface);
  border-right: 1px solid var(--admin-line);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  transition: background 0.3s, border-color 0.3s;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 16px 12px;
  padding: 16px 16px;
  border-radius: var(--admin-radius);
  background: var(--admin-accent-soft);
  border: 1px solid rgba(6, 182, 212, 0.18);
  position: relative;
}
.dark .sidebar-brand {
  background: rgba(34, 211, 238, 0.06);
  border-color: rgba(34, 211, 238, 0.12);
}

.brand-logo-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--admin-surface);
  border: 2px solid rgba(6, 182, 212, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.12);
}
.dark .brand-logo-wrap {
  background: #0a1628;
  border-color: rgba(34, 211, 238, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.brand-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.brand-title {
  font-family: 'Sora', sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: -0.02em;
  color: var(--admin-text);
  line-height: 1.1;
}

.brand-role {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--admin-accent);
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.18);
  width: fit-content;
}
.dark .brand-role {
  color: var(--admin-accent-deep);
  background: rgba(34, 211, 238, 0.08);
  border-color: rgba(34, 211, 238, 0.15);
}

.menu-close-btn {
  display: none;
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid var(--admin-line-strong);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: var(--admin-shadow);
}
.menu-close-btn svg { width: 16px; height: 16px; }
.menu-close-btn:hover { background: var(--admin-error-soft); color: var(--admin-error); border-color: var(--admin-error); }

/* Navigation */
.nav {
  flex: 1;
  padding: 8px 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-sm);
  background: transparent;
  color: var(--admin-text-soft);
  cursor: pointer;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  position: relative;
  transition: all 0.2s ease;
  width: 100%;
}
.nav-item:hover {
  background: var(--admin-accent-soft);
  border-color: rgba(6, 182, 212, 0.15);
  color: var(--admin-text);
}
.dark .nav-item:hover {
  background: rgba(34, 211, 238, 0.07);
  color: var(--admin-accent-deep);
}
.nav-item.active {
  background: var(--admin-accent-soft);
  border-color: rgba(6, 182, 212, 0.2);
  color: var(--admin-accent);
}
.dark .nav-item.active {
  background: rgba(34, 211, 238, 0.1);
  border-color: rgba(34, 211, 238, 0.2);
  color: var(--admin-accent-deep);
}

.nav-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--admin-line);
  color: var(--admin-text-muted);
  transition: background 0.2s, color 0.2s;
}
.dark .nav-icon {
  background: rgba(255, 255, 255, 0.05);
}
.nav-item.active .nav-icon {
  background: rgba(6, 182, 212, 0.15);
  color: var(--admin-accent);
}
.dark .nav-item.active .nav-icon {
  background: rgba(34, 211, 238, 0.15);
  color: var(--admin-accent-deep);
}
.nav-icon :deep(svg) { width: 18px; height: 18px; }

.nav-label { flex: 1; }

.nav-active-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--admin-accent);
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.1);
  flex-shrink: 0;
}
.dark .nav-active-dot {
  background: var(--admin-accent-deep);
  box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.1);
}

/* Sidebar footer */
.sidebar-footer {
  padding: 14px 14px 16px;
  border-top: 1px solid var(--admin-line);
  background: var(--admin-bg);
}
.dark .sidebar-footer {
  background: var(--admin-bg);
}

.admin-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
}
.dark .admin-chip {
  background: var(--admin-surface-2);
}

.admin-avatar-wrap {
  flex-shrink: 0;
}
.admin-avatar {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid rgba(6, 182, 212, 0.2);
}
.admin-avatar-fallback {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-accent-soft);
  border: 2px solid rgba(6, 182, 212, 0.2);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--admin-accent);
}

.admin-info { display: flex; flex-direction: column; min-width: 0; }
.admin-name {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--admin-text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.admin-email {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  border: 1px solid var(--admin-line-strong);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-surface);
  color: var(--admin-text-soft);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--admin-shadow);
}
.action-btn:hover {
  background: var(--admin-error-soft);
  border-color: var(--admin-error);
  color: var(--admin-error);
}
.dark .action-btn:hover {
  background: rgba(248, 113, 113, 0.1);
  border-color: var(--admin-error);
  color: var(--admin-error);
}
.action-icon { width: 16px; height: 16px; flex-shrink: 0; }

/* Mobile overlay */
.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 100;
}

/* ═══════════════════════════════════
   MAIN CONTENT
═══════════════════════════════════ */
.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 32px;
  background: var(--admin-surface);
  border-bottom: 1px solid var(--admin-line);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 16px;
  flex-wrap: wrap;
}
.dark .topbar { border-bottom-color: var(--admin-line); }

.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.burger-btn {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 40px;
  height: 40px;
  padding: 10px;
  border: 1px solid var(--admin-line-strong);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}
.burger-btn span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--admin-text-soft);
  border-radius: 3px;
}
.dark .burger-btn span { background: var(--admin-text-soft); }
.burger-btn:hover { background: var(--admin-accent-soft); border-color: var(--admin-accent); }

.topbar-info { display: flex; flex-direction: column; gap: 2px; }
.page-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0;
  letter-spacing: -0.01em;
}
.page-subtitle {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  margin: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}
.status-pill.online {
  background: var(--admin-success-soft);
  color: var(--admin-success);
}
.status-pill.offline {
  background: var(--admin-error-soft);
  color: var(--admin-error);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
  50% { opacity: 0.7; box-shadow: 0 0 0 4px transparent; }
}

.theme-btn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--admin-line-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--admin-text-soft);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}
.theme-btn:hover { background: var(--admin-accent-soft); border-color: var(--admin-accent); }
.theme-icon { width: 17px; height: 17px; }

/* ═══════════════════════════════════
   SECTION & LAYOUT
═══════════════════════════════════ */
.section {
  padding: 28px 32px 48px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  animation: fadeUp 0.35s ease both;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hero Banner */
.hero-banner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 30px;
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
  animation: fadeUp 0.4s ease both;
}
.dark .hero-banner {
  background: var(--admin-surface-2);
  box-shadow: var(--admin-shadow-lg);
}

.hero-left { display: flex; flex-direction: column; gap: 8px; max-width: 560px; }
.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  width: fit-content;
}
.dark .hero-kicker { color: var(--admin-accent-deep); }
.hero-title {
  font-family: 'Sora', sans-serif;
  font-size: clamp(1.3rem, 2vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--admin-text);
  margin: 0;
  line-height: 1.2;
}
.hero-desc {
  margin: 0;
  font-size: 0.88rem;
  color: var(--admin-text-muted);
  line-height: 1.6;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--admin-line-strong);
  background: var(--admin-surface);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--admin-text);
  box-shadow: var(--admin-shadow);
}
.hero-badge.online { color: var(--admin-success); border-color: rgba(16, 185, 129, 0.25); }
.hero-badge.offline { color: var(--admin-error); border-color: rgba(239, 68, 68, 0.25); }
.hero-badge.neutral { color: var(--admin-accent-deep); border-color: rgba(6, 182, 212, 0.2); }
.dark .hero-badge.online { color: var(--admin-success); }
.dark .hero-badge.offline { color: var(--admin-error); }
.dark .hero-badge.neutral { color: var(--admin-accent-deep); }

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}
.badge-dot.neutral-dot { box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.12); }

/* ═══════════════════════════════════
   STAT GRID
═══════════════════════════════════ */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: fadeUp 0.45s ease both;
}
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--card-accent, var(--admin-accent));
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--admin-shadow-lg);
}
.dark .stat-card {
  background: var(--admin-surface-2);
  box-shadow: var(--admin-shadow-lg);
}

.stat-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--card-accent, var(--admin-accent)) 12%, transparent);
  color: var(--card-accent, var(--admin-accent));
}
.stat-icon-wrap svg { width: 22px; height: 22px; }
.dark .stat-icon-wrap { background: color-mix(in srgb, var(--card-accent, var(--admin-accent)) 18%, transparent); }

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--admin-text-muted);
  white-space: nowrap;
}
.stat-value {
  font-family: 'Sora', sans-serif;
  font-size: clamp(1.4rem, 1.5vw, 1.75rem);
  font-weight: 700;
  color: var(--admin-text);
  line-height: 1;
}
.stat-value small {
  font-size: 0.65em;
  font-weight: 600;
  color: var(--admin-text-muted);
  margin-left: 2px;
}

/* ═══════════════════════════════════
   PANEL & CARDS
═══════════════════════════════════ */
.panel {
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius);
  padding: 24px;
  box-shadow: var(--admin-shadow);
  animation: fadeUp 0.5s ease both;
}
.dark .panel {
  background: var(--admin-surface-2);
  box-shadow: var(--admin-shadow-lg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.panel-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0;
}
.panel-desc {
  margin: 4px 0 0;
  font-size: 0.82rem;
  color: var(--admin-text-muted);
  line-height: 1.5;
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.panel-footer.no-gap { justify-content: flex-end; gap: 10px; }
.footer-note {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  flex: 1;
}

.log-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--admin-text-muted);
  background: var(--admin-line);
  padding: 3px 10px;
  border-radius: 999px;
}

/* Two column layout */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

/* Quick Actions */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-bg);
  color: var(--admin-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.22s ease;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}
.quick-btn:hover {
  background: var(--admin-accent-soft);
  border-color: var(--admin-accent);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(6, 182, 212, 0.1);
}
.dark .quick-btn:hover {
  background: rgba(34, 211, 238, 0.07);
  border-color: var(--admin-accent-deep);
}

.quick-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-line);
  color: var(--admin-accent);
  flex-shrink: 0;
}
.quick-icon :deep(svg) { width: 18px; height: 18px; }

.quick-label {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--admin-text);
}
.quick-sub {
  font-size: 0.76rem;
  color: var(--admin-text-muted);
}

/* Activity Log */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.log-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--admin-line);
  border-radius: var(--admin-radius-sm);
  background: var(--admin-bg);
  animation: fadeUp 0.3s ease both;
}
.dark .log-item { background: rgba(0,0,0,0.2); }

.log-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  flex-shrink: 0;
}
.log-icon-wrap :deep(svg) { width: 18px; height: 18px; }
.dark .log-icon-wrap { background: rgba(34, 211, 238, 0.08); color: var(--admin-accent-deep); }

.log-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.log-msg {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--admin-text-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.log-time {
  font-size: 0.75rem;
  color: var(--admin-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.log-empty {
  text-align: center;
  padding: 24px;
  color: var(--admin-text-muted);
  font-size: 0.86rem;
}

/* ═══════════════════════════════════
   DEVICE GRID
═══════════════════════════════════ */
.device-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
}
.summary-item.online { color: var(--admin-success); }
.summary-divider { color: var(--admin-text-muted); }

.device-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.device-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border-radius: var(--admin-radius);
  border: 1px solid var(--admin-line);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: fadeUp 0.45s ease both;
}
.device-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.device-card.online::before { background: linear-gradient(90deg, #10b981, #34d399); }
.device-card.warning::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.device-card.offline::before { background: linear-gradient(90deg, #ef4444, #f87171); }
.dark .device-card { background: var(--admin-surface-2); box-shadow: var(--admin-shadow-lg); }
.device-card:hover { transform: translateY(-3px); box-shadow: var(--admin-shadow-lg); }

.device-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.device-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 1.3rem;
  flex-shrink: 0;
}
.device-icon-wrap :deep(svg) { width: 22px; height: 22px; }
.dark .device-icon-wrap { background: rgba(34, 211, 238, 0.1); color: var(--admin-accent-deep); }

.device-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--admin-line-strong);
  background: var(--admin-bg);
}
.device-status-badge.online { color: var(--admin-success); border-color: rgba(16, 185, 129, 0.3); background: var(--admin-success-soft); }
.device-status-badge.warning { color: var(--admin-warn); border-color: rgba(245, 158, 11, 0.3); background: var(--admin-warn-soft); }
.device-status-badge.offline { color: var(--admin-error); border-color: rgba(239, 68, 68, 0.3); background: var(--admin-error-soft); }
.dark .device-status-badge.online { color: var(--admin-success); }
.dark .device-status-badge.warning { color: var(--admin-warn); }
.dark .device-status-badge.offline { color: var(--admin-error); }

.badge-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

.device-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.device-name {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--admin-text);
  line-height: 1.25;
}
.device-id {
  font-size: 0.72rem;
  color: var(--admin-text-muted);
  font-family: 'Courier New', monospace;
  display: block;
}
.device-type {
  font-size: 0.82rem;
  color: var(--admin-text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

.device-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--admin-line);
  margin-top: auto;
}
.device-last-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--admin-text-muted);
}
.device-last {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--admin-text-soft);
}
.device-last.time-ok { color: var(--admin-success); }

/* ═══════════════════════════════════
   ALERT SECTION — TIDY
═══════════════════════════════════ */
.alert-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
  flex-wrap: wrap;
  animation: fadeUp 0.3s ease both;
}
.dark .alert-head { background: var(--admin-surface-2); box-shadow: var(--admin-shadow-lg); }

.alert-head-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.alert-head-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.alert-head-icon svg { width: 22px; height: 22px; }
.alert-head-icon.ok { background: var(--admin-success-soft); color: var(--admin-success); }
.alert-head-icon.danger { background: var(--admin-error-soft); color: var(--admin-error); }
.dark .alert-head-icon.ok { color: var(--admin-success); }
.dark .alert-head-icon.danger { color: var(--admin-error); }

.alert-head-title {
  font-family: 'Sora', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--admin-text);
  margin: 0 0 3px;
  letter-spacing: -0.01em;
}
.alert-head-desc {
  font-size: 0.82rem;
  color: var(--admin-text-muted);
  margin: 0;
  line-height: 1.5;
}

.alert-head-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid var(--admin-line-strong);
  background: var(--admin-bg);
  box-shadow: var(--admin-shadow);
  flex-shrink: 0;
}
.alert-head-chip.chip-ok { color: var(--admin-success); border-color: rgba(16, 185, 129, 0.3); background: var(--admin-success-soft); }
.alert-head-chip.chip-danger { color: var(--admin-error); border-color: rgba(239, 68, 68, 0.3); background: var(--admin-error-soft); }
.dark .alert-head-chip.chip-ok { color: var(--admin-success); }
.dark .alert-head-chip.chip-danger { color: var(--admin-error); }
.chip-dot-sm {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
  flex-shrink: 0;
}

/* Alert cards row */
.alert-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.alert-card {
  flex: 1 1 calc(20% - 12px);
  min-width: 180px;
  display: flex;
  flex-direction: column;
  border-radius: var(--admin-radius-sm);
  border: 1px solid var(--admin-line);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: fadeUp 0.4s ease both;
}
.alert-card:hover { transform: translateY(-3px); box-shadow: var(--admin-shadow-lg); }
.dark .alert-card { background: var(--admin-surface-2); box-shadow: var(--admin-shadow-lg); }
.alert-card::before {
  content: '';
  display: block;
  height: 3px;
  width: 100%;
}
.alert-card.alert-ok::before { background: linear-gradient(90deg, #10b981, #34d399); }
.alert-card.alert-danger::before { background: linear-gradient(90deg, #ef4444, #f87171); }

/* Card top */
.alert-c-top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 14px 10px;
}
.alert-c-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.alert-c-icon :deep(svg) { width: 18px; height: 18px; }
.alert-c-icon.alert-ok { background: var(--admin-success-soft); color: var(--admin-success); }
.alert-c-icon.alert-danger { background: var(--admin-error-soft); color: var(--admin-error); }
.dark .alert-c-icon.alert-ok { color: var(--admin-success); }
.dark .alert-c-icon.alert-danger { color: var(--admin-error); }

.alert-c-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.alert-c-name {
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--admin-text);
  line-height: 1.2;
}
.alert-c-val {
  font-size: 0.72rem;
  color: var(--admin-text-muted);
}
.alert-c-val strong {
  font-size: 0.85rem;
  color: var(--admin-text-soft);
}

/* Range inputs */
.alert-c-range {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 10px;
}
.range-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.range-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--admin-text-muted);
}
.range-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--admin-line-strong);
  border-radius: 9px;
  background: var(--admin-bg);
  color: var(--admin-text);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  text-align: center;
  -moz-appearance: textfield;
  transition: border-color 0.18s;
}
.range-input::-webkit-outer-spin-button,
.range-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.range-input:focus { outline: none; border-color: var(--admin-accent); box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1); }
.dark .range-input { background: var(--admin-surface-2); }

.range-sep {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--admin-text-muted);
  flex-shrink: 0;
  align-self: flex-end;
  padding-bottom: 10px;
}

/* Card status */
.alert-c-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 12px;
  font-size: 0.72rem;
  font-weight: 700;
  border-top: 1px solid var(--admin-line);
}
.alert-c-status svg { width: 13px; height: 13px; flex-shrink: 0; }
.alert-c-status.alert-ok { color: var(--admin-success); background: var(--admin-success-soft); }
.alert-c-status.alert-danger { color: var(--admin-error); background: var(--admin-error-soft); }
.dark .alert-c-status.alert-ok { color: var(--admin-success); }
.dark .alert-c-status.alert-danger { color: var(--admin-error); }

/* Save bar */
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  border: 1px solid var(--admin-line);
  box-shadow: var(--admin-shadow);
  flex-wrap: wrap;
  animation: fadeUp 0.5s ease both;
}
.dark .save-bar { background: var(--admin-surface-2); box-shadow: var(--admin-shadow-lg); }

.save-bar-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--admin-text-muted);
  margin: 0;
  flex: 1;
}
.save-bar-hint svg { width: 15px; height: 15px; flex-shrink: 0; color: var(--admin-accent); }

/* ═══════════════════════════════════
   SETTINGS SECTION
═══════════════════════════════════ */
.settings-list {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--admin-line);
  flex-wrap: wrap;
}
.setting-row:last-child { border-bottom: none; }

.setting-info { flex: 1; min-width: 180px; }
.setting-info strong { display: block; font-size: 0.9rem; font-weight: 700; color: var(--admin-text); }
.setting-info span { font-size: 0.8rem; color: var(--admin-text-muted); }

.setting-control {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.setting-control.wide { flex: 1; }
.setting-unit {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--admin-text-muted);
  white-space: nowrap;
}

.setting-input {
  width: 130px;
  padding: 9px 12px;
  border: 1px solid var(--admin-line-strong);
  border-radius: 10px;
  background: var(--admin-surface);
  color: var(--admin-text);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: right;
  transition: border-color 0.18s;
  -moz-appearance: textfield;
}
.setting-input::-webkit-outer-spin-button,
.setting-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.setting-input:focus {
  outline: none;
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.12);
}
.dark .setting-input { background: var(--admin-surface-2); }
.dark .setting-input:focus { border-color: var(--admin-accent-deep); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1); }

.setting-code {
  font-size: 0.78rem;
  color: var(--admin-text-soft);
  background: var(--admin-bg);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--admin-line);
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--admin-line-strong);
  border-radius: 28px;
  transition: 0.3s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background: var(--admin-text-muted);
  border-radius: 50%;
  transition: 0.3s;
}
.toggle-switch input:checked + .toggle-slider { background: var(--admin-accent); }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(22px); background: white; }

/* System info */
.stack-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(6, 182, 212, 0.2);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 0.8rem;
  font-weight: 700;
}
.dark .stack-pill { color: var(--admin-accent-deep); }
.stack-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border-radius: var(--admin-radius-sm);
  border: 1px solid var(--admin-line);
  background: var(--admin-bg);
  position: relative;
  overflow: hidden;
  transition: transform 0.22s ease, box-shadow 0.22s ease;
  animation: fadeUp 0.5s ease both;
}
.info-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.info-item.cyan::before { background: linear-gradient(90deg, #06b6d4, #22d3ee); }
.info-item.blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.info-item.violet::before { background: linear-gradient(90deg, #8b5cf6, #a78bfa); }
.info-item.amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.info-item.slate::before { background: linear-gradient(90deg, #64748b, #94a3b8); }
.info-item.rose::before { background: linear-gradient(90deg, #f43f5e, #fb7185); }
.info-item.emerald::before { background: linear-gradient(90deg, #10b981, #34d399); }
.info-item:hover { transform: translateY(-3px); box-shadow: var(--admin-shadow-lg); }

.info-item-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.info-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  flex-shrink: 0;
}
.info-icon-wrap :deep(svg) { width: 18px; height: 18px; }
.dark .info-icon-wrap { background: rgba(34, 211, 238, 0.08); color: var(--admin-accent-deep); }

.info-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--admin-text-muted);
}
.info-value {
  font-family: 'Sora', sans-serif;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--admin-text);
}
.info-note {
  font-size: 0.78rem;
  color: var(--admin-text-muted);
  line-height: 1.5;
  margin-top: auto;
}

/* ═══════════════════════════════════
   BUTTONS
═══════════════════════════════════ */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: none;
  border-radius: var(--admin-radius-sm);
  background: linear-gradient(135deg, var(--admin-accent), var(--admin-accent-deep));
  color: white;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.22);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(6, 182, 212, 0.3);
}
.dark .btn-primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px rgba(34, 211, 238, 0.3);
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary svg { width: 16px; height: 16px; flex-shrink: 0; }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border: 1px solid var(--admin-line-strong);
  border-radius: var(--admin-radius-sm);
  background: transparent;
  color: var(--admin-text-soft);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
}
.btn-outline:hover {
  border-color: var(--admin-error);
  color: var(--admin-error);
  background: var(--admin-error-soft);
}
.dark .btn-outline:hover { color: var(--admin-error); border-color: var(--admin-error); background: rgba(248, 113, 113, 0.07); }
.btn-outline svg { width: 16px; height: 16px; flex-shrink: 0; }

/* ═══════════════════════════════════
   TOAST NOTIFICATION
═══════════════════════════════════ */
:global(.toast) {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  padding: 14px 22px;
  border-radius: 14px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 340px;
}
:global(.toast.light) {
  background: #0f172a;
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
:global(.toast.dark) {
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
:global(.toast.show) {
  transform: translateY(0);
  opacity: 1;
}

/* ═══════════════════════════════════
   RESPONSIVE
═══════════════════════════════════ */
@media (max-width: 1400px) {
  .stat-grid { grid-template-columns: repeat(3, 1fr); }
  .info-grid { grid-template-columns: repeat(3, 1fr); }
  .device-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 1100px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .two-col { grid-template-columns: 1fr; }
}

@media (max-width: 900px) {
  .admin { flex-direction: column; }

  .sidebar {
    position: fixed;
    left: -280px;
    top: 0;
    width: 280px;
    height: 100vh;
    z-index: 200;
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: none;
  }
  .sidebar.mobile-open {
    transform: translateX(280px);
    box-shadow: 8px 0 30px rgba(0, 0, 0, 0.15);
  }
  .dark .sidebar.mobile-open { box-shadow: 8px 0 30px rgba(0, 0, 0, 0.4); }

  .menu-close-btn { display: flex; }

  .mobile-overlay { display: block; }

  .topbar {
    padding: 14px 20px;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .burger-btn { display: flex; }

  .section { padding: 20px 16px 40px; }

  .hero-banner {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }
  .hero-badges { justify-content: flex-start; }

  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .device-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .info-grid { grid-template-columns: 1fr; }
  .device-grid { grid-template-columns: 1fr; }
  .quick-grid { grid-template-columns: 1fr; }
  .stat-card { padding: 14px 16px; }
  .panel { padding: 18px; }
  .setting-row { flex-direction: column; align-items: flex-start; }
  .setting-control { width: 100%; }
  .setting-input { width: 100% !important; }
  .panel-footer { flex-direction: column; }
  .btn-primary, .btn-outline { width: 100%; justify-content: center; }
  .alert-row .alert-card { animation-delay: 0ms !important; }
  .alert-head { flex-direction: column; align-items: flex-start; }
  .save-bar { flex-direction: column; }
  .save-bar-hint { font-size: 0.78rem; }
  .alert-c-range { flex-direction: column; gap: 6px; }
  .range-sep { display: none; }
  .range-field { width: 100%; }
  .alert-card { min-width: 100%; }
}

@media (max-width: 480px) {
  .stat-grid { grid-template-columns: 1fr; }
  .page-title { font-size: 1rem; }
  .alert-head { padding: 16px; }
  .alert-c-top { padding: 12px 12px 8px; }
}
</style>
