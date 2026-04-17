<template>
  <div class="login-page" :class="{ dark: isDarkMode }">
    <!-- Animated background orbs -->
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>

    <!-- Floating particles -->
    <div class="particles">
      <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)"></span>
    </div>

    <!-- Top bar -->
    <header class="topbar">
      <div class="brand">
        <div class="brand-icon-wrap">
          <img src="/logo.png" alt="TwinSpace" class="brand-img" />
        </div>
        <span class="brand-name">TwinSpace</span>
      </div>
      <button class="theme-btn" type="button" @click="$emit('toggle-theme')">
        {{ isDarkMode ? '☀️' : '🌙' }}
      </button>
    </header>

    <!-- Center card -->
    <main class="login-center">
      <div class="login-card">
        <!-- Glow ring behind card -->
        <div class="card-glow"></div>

        <!-- Card content -->
        <div class="card-inner">
          <!-- Logo -->
          <div class="card-logo">
            <div class="logo-ring">
              <div class="logo-ring-inner">
                <img src="/logo.png" alt="TwinSpace" class="card-logo-img" />
              </div>
            </div>
          </div>

          <h1 class="card-title">Selamat Datang</h1>
          <p class="card-subtitle">Masuk ke <strong>Twin Space</strong> untuk memantau ruangan Anda secara real-time.</p>

          <!-- Login Mode Tabs -->
          <div class="login-tabs">
            <button class="tab-btn" :class="{ active: !isAdminMode }" @click="isAdminMode = false">
              👤 User
            </button>
            <button class="tab-btn" :class="{ active: isAdminMode }" @click="isAdminMode = true">
              🛠️ Admin
            </button>
          </div>

          <!-- User Google Login -->
          <div v-if="!isAdminMode" class="login-form-area">

          <!-- Google Sign In Button -->
          <button
            class="google-btn"
            type="button"
            :disabled="!isAuthReady || isSigningIn || !isFirebaseConfigured"
            @click="$emit('login-google')"
          >
            <span class="google-icon-wrap">
              <svg viewBox="0 0 24 24" class="google-svg">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 5.48c1.78 0 3.37.61 4.63 1.8l3.47-3.37C17.95 1.95 15.24.76 12 .76A11.24 11.24 0 0 0 1.24 7.47l4.03 2.29Z" />
                <path fill="#34A853" d="M16.04 18.01A6.72 6.72 0 0 1 12 19.28 7.08 7.08 0 0 0 5.27 15l-4.03 2.29A11.24 11.24 0 0 0 12 24a10.7 10.7 0 0 0 7.38-2.73l-3.34-3.26Z" />
                <path fill="#4285F4" d="M19.38 21.27C21.72 19.16 23.24 15.93 23.24 12c0-.67-.08-1.35-.22-2H12v4.26h6.32a5.6 5.6 0 0 1-2.28 3.48l3.34 3.26.01.27Z" />
                <path fill="#FBBC05" d="M5.27 15a7 7 0 0 1 0-5.24L1.24 7.47A11.18 11.18 0 0 0 .76 12c0 1.83.44 3.55 1.2 5.09l3.31-2.09Z" />
              </svg>
            </span>
            <span class="google-label">{{ buttonLabel }}</span>
            <span v-if="isSigningIn" class="btn-spinner"></span>
          </button>
          </div>

          <!-- Admin PIN Login -->
          <div v-else class="login-form-area">
            <form @submit.prevent="handleAdminLogin" class="admin-form">
              <input 
                type="password" 
                v-model="adminPin" 
                placeholder="Masukkan PIN Admin (123456)" 
                class="admin-input"
                required
              />
              <button type="submit" class="admin-btn-login">
                Masuk Dashboard Admin
              </button>
              <p v-if="adminError" class="pin-error">{{ adminError }}</p>
            </form>
          </div>

          <!-- Divider -->
          <div class="divider">
            <span>Info</span>
          </div>

          <!-- Features -->
          <div class="features">
            <div class="feature">
              <div class="feature-icon">🔒</div>
              <div class="feature-text">
                <strong>Autentikasi Aman</strong>
                <span>Google OAuth via Firebase</span>
              </div>
            </div>
            <div class="feature">
              <div class="feature-icon">📊</div>
              <div class="feature-text">
                <strong>Real-time Dashboard</strong>
                <span>3D Twin, sensor & analytics</span>
              </div>
            </div>
            <div class="feature">
              <div class="feature-icon">🤖</div>
              <div class="feature-text">
                <strong>AI Recommendation</strong>
                <span>Optimasi suhu & energi otomatis</span>
              </div>
            </div>
          </div>

          <!-- Error / Config notices -->
          <div v-if="!isFirebaseConfigured" class="notice warning">
            ⚠️ Konfigurasi VITE_FIREBASE_* di file <code>.env</code> belum lengkap.
          </div>
          <div v-else-if="authError" class="notice error">
            ❌ {{ authError }}
          </div>
        </div>
      </div>

      <!-- Footer text -->
      <p class="footer-text">Digital Twin Dashboard &copy; {{ new Date().getFullYear() }}</p>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  isAuthReady: { type: Boolean, default: false },
  isSigningIn: { type: Boolean, default: false },
  authError: { type: String, default: '' },
  isFirebaseConfigured: { type: Boolean, default: false }
})

const emit = defineEmits(['login-google', 'login-admin', 'toggle-theme'])

const isAdminMode = ref(false)
const adminPin = ref('')
const adminError = ref('')

const handleAdminLogin = () => {
  if (adminPin.value === '123456') { // Hardcoded simple pin for demo
    adminError.value = ''
    emit('login-admin')
  } else {
    adminError.value = 'PIN salah. Silakan coba lagi.'
  }
}

const buttonLabel = computed(() => {
  if (!props.isAuthReady) return 'Memuat…'
  if (!props.isFirebaseConfigured) return 'Firebase belum siap'
  if (props.isSigningIn) return 'Membuka Google…'
  return 'Masuk dengan Google'
})

const particleStyle = (i) => {
  const size = 2 + Math.random() * 4
  const x = Math.random() * 100
  const delay = Math.random() * 20
  const duration = 12 + Math.random() * 18
  return {
    width: size + 'px',
    height: size + 'px',
    left: x + '%',
    animationDelay: delay + 's',
    animationDuration: duration + 's'
  }
}
</script>

<style scoped>
/* ===== Page Shell ===== */
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8fbff;
  transition: background 0.5s ease;
}

.login-page.dark {
  background: #0a0e17;
}

/* ===== Animated Background Orbs ===== */
.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  opacity: 0.5;
  animation: orbFloat 20s ease-in-out infinite;
}

.orb-1 {
  width: 500px; height: 500px;
  top: -150px; left: -100px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.35), transparent 70%);
  animation-delay: 0s;
}

.orb-2 {
  width: 400px; height: 400px;
  bottom: -120px; right: -80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3), transparent 70%);
  animation-delay: -7s;
}

.orb-3 {
  width: 300px; height: 300px;
  top: 40%; left: 60%;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.2), transparent 70%);
  animation-delay: -14s;
}

.dark .orb-1 { opacity: 0.3; }
.dark .orb-2 { opacity: 0.25; }
.dark .orb-3 { opacity: 0.15; }

@keyframes orbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 15px) scale(0.95); }
}

/* ===== Floating Particles ===== */
.particles {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  border-radius: 50%;
  background: rgba(6, 182, 212, 0.35);
  animation: particleRise linear infinite;
}

.dark .particle {
  background: rgba(34, 211, 238, 0.2);
}

.particle:nth-child(odd) {
  background: rgba(99, 102, 241, 0.25);
}

.dark .particle:nth-child(odd) {
  background: rgba(129, 140, 248, 0.15);
}

@keyframes particleRise {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-100vh) scale(0.3); opacity: 0; }
}

/* ===== Top Bar ===== */
.topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon-wrap {
  width: 40px; height: 40px;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.15);
  padding: 4px;
}

.dark .brand-icon-wrap {
  background: rgba(255,255,255,0.1);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.brand-img {
  width: 100%; height: 100%;
  object-fit: contain;
}

.brand-name {
  font-weight: 800;
  font-size: 1.1rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.theme-btn {
  width: 44px; height: 44px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.dark .theme-btn {
  background: rgba(255,255,255,0.08);
}

.theme-btn:hover {
  transform: scale(1.08) rotate(15deg);
  box-shadow: 0 6px 20px rgba(6,182,212,0.2);
}

/* ===== Center Login Card ===== */
.login-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 24px 40px;
  position: relative;
  z-index: 5;
}

.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
}

/* Glow behind card */
.card-glow {
  position: absolute;
  inset: -2px;
  border-radius: 30px;
  background: linear-gradient(135deg, #06b6d4, #6366f1, #ec4899, #06b6d4);
  background-size: 400% 400%;
  animation: glowRotate 6s ease infinite;
  opacity: 0.6;
  filter: blur(15px);
  z-index: -1;
}

.dark .card-glow {
  opacity: 0.4;
}

@keyframes glowRotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.card-inner {
  position: relative;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 28px;
  padding: 40px 32px 32px;
  text-align: center;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.8);
}

.dark .card-inner {
  background: rgba(15, 20, 35, 0.85);
  border-color: rgba(255,255,255,0.08);
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255,255,255,0.04);
}

/* ===== Logo in Card ===== */
.card-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.logo-ring {
  width: 80px; height: 80px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, #06b6d4, #6366f1);
  animation: logoSpin 8s linear infinite;
}

@keyframes logoSpin {
  0% { background: linear-gradient(0deg, #06b6d4, #6366f1); }
  25% { background: linear-gradient(90deg, #06b6d4, #ec4899); }
  50% { background: linear-gradient(180deg, #6366f1, #06b6d4); }
  75% { background: linear-gradient(270deg, #ec4899, #06b6d4); }
  100% { background: linear-gradient(360deg, #06b6d4, #6366f1); }
}

.logo-ring-inner {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.dark .logo-ring-inner {
  background: #0f1423;
}

.card-logo-img {
  width: 100%; height: 100%;
  object-fit: contain;
}

/* ===== Card Typography ===== */
.card-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 8px;
  letter-spacing: -0.03em;
}

.card-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 28px;
  line-height: 1.6;
}

.card-subtitle strong {
  color: #06b6d4;
}

.dark .card-subtitle strong {
  color: #22d3ee;
}

/* ===== Login Tabs ===== */
.login-tabs {
  display: flex;
  gap: 8px;
  background: rgba(0, 0, 0, 0.04);
  padding: 6px;
  border-radius: 16px;
  margin-bottom: 24px;
}

.dark .login-tabs {
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background: #fff;
  color: #06b6d4;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark .tab-btn.active {
  background: #1f2937;
  color: #22d3ee;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* ===== Admin Form ===== */
.admin-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.admin-input {
  padding: 16px 20px;
  border-radius: 14px;
  border: 2px solid rgba(0,0,0,0.08);
  background: transparent;
  font-size: 1rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.1em;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.dark .admin-input {
  border-color: rgba(255,255,255,0.1);
}

.admin-input:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 0 4px rgba(6,182,212,0.15);
}

.admin-btn-login {
  padding: 16px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #06b6d4, #6366f1);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 20px rgba(6,182,212,0.2);
}

.admin-btn-login:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(6,182,212,0.3);
}

.pin-error {
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
}

.dark .pin-error {
  color: #fca5a5;
}

/* ===== Google Button ===== */
.google-btn {
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.dark .google-btn {
  background: linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%);
  color: #111827;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.google-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(6,182,212,0.3), rgba(99,102,241,0.3));
  opacity: 0;
  transition: opacity 0.3s;
}

.google-btn:hover:enabled::before {
  opacity: 1;
}

.google-btn:hover:enabled {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 16px 40px rgba(6,182,212,0.25);
}

.google-btn:active:enabled {
  transform: translateY(-1px) scale(1);
}

.google-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.google-icon-wrap {
  width: 22px; height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.google-svg {
  width: 100%; height: 100%;
}

.google-label {
  position: relative;
  z-index: 1;
}

.btn-spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.dark .btn-spinner {
  border-color: rgba(0,0,0,0.2);
  border-top-color: #111;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* ===== Divider ===== */
.divider {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0 20px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.divider span {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

/* ===== Features ===== */
.features {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(6, 182, 212, 0.04);
  border: 1px solid rgba(6, 182, 212, 0.08);
  transition: all 0.3s ease;
}

.dark .feature {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.06);
}

.feature:hover {
  background: rgba(6, 182, 212, 0.08);
  border-color: rgba(6, 182, 212, 0.2);
  transform: translateX(4px);
}

.dark .feature:hover {
  background: rgba(34, 211, 238, 0.06);
  border-color: rgba(34, 211, 238, 0.15);
}

.feature-icon {
  font-size: 1.5rem;
  width: 40px; height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.1);
  flex-shrink: 0;
}

.dark .feature-icon {
  background: rgba(34, 211, 238, 0.1);
}

.feature-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.feature-text strong {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-primary);
}

.feature-text span {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ===== Notices ===== */
.notice {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: left;
}

.notice code {
  background: rgba(0,0,0,0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.82rem;
}

.dark .notice code {
  background: rgba(255,255,255,0.1);
}

.notice.warning {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #92400e;
}

.dark .notice.warning {
  color: #fcd34d;
}

.notice.error {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: #b91c1c;
}

.dark .notice.error {
  color: #fca5a5;
}

/* ===== Footer ===== */
.footer-text {
  margin-top: 28px;
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* ===== Responsive ===== */
@media (max-width: 480px) {
  .topbar {
    padding: 16px 20px;
  }

  .card-inner {
    padding: 32px 24px 24px;
    border-radius: 24px;
  }

  .card-title {
    font-size: 1.5rem;
  }

  .logo-ring {
    width: 68px; height: 68px;
  }
}
</style>
