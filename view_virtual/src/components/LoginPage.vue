<template>
  <div class="login-page" :class="{ dark: isDarkMode }">
    <!-- Subtle backdrop grid -->
    <div class="backdrop-grid" aria-hidden="true" />

    <!-- Top navigation bar -->
    <header class="topbar">
      <div class="brand">
        <img src="/logo.png" alt="TwinSpace" class="brand-logo" />
        <div class="brand-text">
          <strong>TwinSpace</strong>
          <span>Digital Twin Operations</span>
        </div>
      </div>
      <button
        class="theme-btn"
        type="button"
        :aria-label="themeLabel"
        :title="themeLabel"
        @click="emit('toggle-theme')"
      >
        <svg v-if="isDarkMode" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.4v2.2M12 19.4v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.4 12h2.2M19.4 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
        </svg>
        <svg v-else class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21.4 14.7A9.2 9.2 0 1 1 9.3 2.6a7.6 7.6 0 1 0 12.1 12.1z" />
        </svg>
      </button>
    </header>

    <!-- Page content -->
    <main class="page-content">

      <!-- Simple intro strip -->
      <div class="intro-strip">
        <div class="status-dot" aria-label="Sistem aktif">
          <span class="dot" aria-hidden="true"></span>
          Sistem Aktif
        </div>
        <p class="intro-text">
          Monitoring energi real-time dengan visualisasi 3D dan insight prediktif.
        </p>
      </div>

      <!-- Auth card -->
      <div class="auth-card">
        <!-- Card header -->
        <div class="auth-header">
          <h2 class="auth-title">{{ loginTitle }}</h2>
          <p class="auth-subtitle">{{ loginSubtitle }}</p>
        </div>

        <!-- Mode switcher (only when mode=both) -->
        <div v-if="!isModeLocked" class="mode-switch" role="tablist" aria-label="Pilih mode login">
          <button
            class="mode-btn"
            :class="{ active: !activeIsAdminMode }"
            type="button"
            role="tab"
            :aria-selected="!activeIsAdminMode"
            title="Mode User"
            @click="setMode(false)"
          >
            <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.3" />
              <path d="M5.6 19.2c1.3-2.8 3.5-4.2 6.4-4.2s5.1 1.4 6.4 4.2" />
            </svg>
            User
          </button>
          <button
            class="mode-btn"
            :class="{ active: activeIsAdminMode }"
            type="button"
            role="tab"
            :aria-selected="activeIsAdminMode"
            title="Mode Admin"
            @click="setMode(true)"
          >
            <svg class="mode-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3.2l6.4 2.6v4.8c0 4.2-2.8 7.3-6.4 8.8-3.6-1.5-6.4-4.6-6.4-8.8V5.8L12 3.2z" />
              <path d="M9.4 12.2l1.7 1.7 3.5-3.5" />
            </svg>
            Admin
          </button>
        </div>

        <!-- User login form -->
        <div v-if="!activeIsAdminMode" class="auth-body">
          <form class="form" @submit.prevent="handleUserCredentialLogin">
            <div class="field">
              <label for="user-identifier" class="label">Username / Email</label>
              <div class="input-wrap">
                <input
                  id="user-identifier"
                  v-model="userIdentifier"
                  class="input"
                  type="text"
                  placeholder="operator@company.com"
                  autocomplete="username"
                  required
                />
              </div>
            </div>

            <div class="field">
              <label for="user-password" class="label">Password</label>
              <div class="input-wrap">
                <input
                  id="user-password"
                  v-model="userPassword"
                  class="input"
                  :type="showUserPassword ? 'text' : 'password'"
                  placeholder="Masukkan password"
                  autocomplete="current-password"
                  required
                />
                <button
                  class="toggle-vis"
                  type="button"
                  :aria-label="showUserPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="toggleUserPasswordVisibility"
                >
                  <svg v-if="showUserPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.3-5.6 9.5-5.6S21.5 12 21.5 12s-3.3 5.6-9.5 5.6S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.9" />
                    <path d="M4 20L20 4" />
                  </svg>
                  <svg v-else class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.3-5.6 9.5-5.6S21.5 12 21.5 12s-3.3 5.6-9.5 5.6S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.9" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="form-tools">
              <label class="remember-wrap">
                <input v-model="rememberMe" type="checkbox" />
                <span>Ingat saya</span>
              </label>
              <button class="link-btn" type="button" @click="handleForgotPassword">Lupa password?</button>
            </div>

            <button
              class="btn-primary"
              type="submit"
              :disabled="!isAuthReady || isSigningIn || !isFirebaseConfigured"
            >
              <span v-if="isSigningIn" class="spinner" aria-hidden="true" />
              {{ credentialButtonLabel }}
            </button>

            <p v-if="userFormError" class="msg msg-error" role="alert">{{ userFormError }}</p>
            <p v-if="passwordResetInfo" class="msg msg-success" role="alert">{{ passwordResetInfo }}</p>
          </form>

          <!-- Divider with Google option -->
          <div class="divider"><span>atau</span></div>

          <button
            class="btn-google"
            type="button"
            :disabled="!isAuthReady || isSigningIn || !isFirebaseConfigured"
            @click="emit('login-google')"
          >
            <span class="google-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="google-svg">
                <path fill="#EA4335" d="M5.27 9.76A7.08 7.08 0 0 1 12 5.48c1.78 0 3.37.61 4.63 1.8l3.47-3.37C17.95 1.95 15.24.76 12 .76A11.24 11.24 0 0 0 1.24 7.47l4.03 2.29Z" />
                <path fill="#34A853" d="M16.04 18.01A6.72 6.72 0 0 1 12 19.28 7.08 7.08 0 0 0 5.27 15l-4.03 2.29A11.24 11.24 0 0 0 12 24a10.7 10.7 0 0 0 7.38-2.73l-3.34-3.26Z" />
                <path fill="#4285F4" d="M19.38 21.27C21.72 19.16 23.24 15.93 23.24 12c0-.67-.08-1.35-.22-2H12v4.26h6.32a5.6 5.6 0 0 1-2.28 3.48l3.34 3.26.01.27Z" />
                <path fill="#FBBC05" d="M5.27 15a7 7 0 0 1 0-5.24L1.24 7.47A11.18 11.18 0 0 0 .76 12c0 1.83.44 3.55 1.2 5.09l3.31-2.09Z" />
              </svg>
            </span>
            {{ buttonLabel }}
          </button>

          <!-- Alt link for admin -->
          <p v-if="mode === 'user'" class="alt-link">
            Butuh akses admin?
            <RouterLink class="anchor" to="/admin/login">Buka login admin</RouterLink>
          </p>
        </div>

        <!-- Admin login form -->
        <div v-else class="auth-body">
          <!-- Admin badge -->
          <div class="admin-badge" aria-label="Mode admin">
            <svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3.2l6.4 2.6v4.8c0 4.2-2.8 7.3-6.4 8.8-3.6-1.5-6.4-4.6-6.4-8.8V5.8L12 3.2z" />
              <path d="M9.4 12.2l1.7 1.7 3.5-3.5" />
            </svg>
            Akses Administrator
          </div>

          <form class="form" @submit.prevent="handleAdminLogin">
            <div class="field">
              <label for="admin-identifier" class="label">Email Admin</label>
              <div class="input-wrap">
                <input
                  id="admin-identifier"
                  v-model="adminIdentifier"
                  class="input"
                  type="email"
                  placeholder="admin@company.com"
                  autocomplete="username"
                  required
                />
              </div>
            </div>

            <div class="field">
              <label for="admin-password" class="label">Password Admin</label>
              <div class="input-wrap">
                <input
                  id="admin-password"
                  v-model="adminPassword"
                  class="input"
                  :type="showAdminPassword ? 'text' : 'password'"
                  placeholder="Masukkan password admin"
                  autocomplete="current-password"
                  required
                />
                <button
                  class="toggle-vis"
                  type="button"
                  :aria-label="showAdminPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="toggleAdminPasswordVisibility"
                >
                  <svg v-if="showAdminPassword" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.3-5.6 9.5-5.6S21.5 12 21.5 12s-3.3 5.6-9.5 5.6S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.9" />
                    <path d="M4 20L20 4" />
                  </svg>
                  <svg v-else class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2.5 12s3.3-5.6 9.5-5.6S21.5 12 21.5 12s-3.3 5.6-9.5 5.6S2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.9" />
                  </svg>
                </button>
              </div>
            </div>

            <button class="btn-primary" type="submit" :disabled="isSigningIn">
              <span v-if="isSigningIn" class="spinner" aria-hidden="true" />
              Masuk sebagai Admin
            </button>

            <p v-if="adminError" class="msg msg-error" role="alert">{{ adminError }}</p>
            <p class="helper-text">Mode admin hanya untuk konfigurasi dan kontrol operasional internal.</p>

            <!-- Alt link for user -->
            <p v-if="mode === 'admin'" class="alt-link">
              Kembali ke akses operator:
              <RouterLink class="anchor" to="/login">Buka login user</RouterLink>
            </p>
          </form>
        </div>

        <!-- Error / warning notices -->
        <div v-if="!isFirebaseConfigured" class="notice notice-warn" role="alert">
          Konfigurasi <code>VITE_FIREBASE_*</code> di file <code>.env</code> belum lengkap.
        </div>
        <div v-else-if="authError" class="notice notice-error" role="alert">
          {{ authError }}
        </div>
      </div>

      <p class="footer-copy">&copy; {{ releaseYear }} TwinSpace Digital Twin Dashboard</p>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  isAuthReady: { type: Boolean, default: false },
  isSigningIn: { type: Boolean, default: false },
  authError: { type: String, default: '' },
  isFirebaseConfigured: { type: Boolean, default: false },
  mode: {
    type: String,
    default: 'both',
    validator: value => ['both', 'user', 'admin'].includes(value)
  }
})

const emit = defineEmits(['login-google', 'login-credentials', 'forgot-password', 'login-admin', 'toggle-theme'])

const isAdminMode = ref(false)
const userIdentifier = ref('')
const userPassword = ref('')
const rememberMe = ref(true)
const userFormError = ref('')
const passwordResetInfo = ref('')
const showUserPassword = ref(false)
const adminIdentifier = ref('')
const adminPassword = ref('')
const adminError = ref('')
const showAdminPassword = ref(false)
const releaseYear = new Date().getFullYear()

const isModeLocked = computed(() => props.mode === 'user' || props.mode === 'admin')

const activeIsAdminMode = computed(() => {
  if (props.mode === 'admin') return true
  if (props.mode === 'user') return false
  return isAdminMode.value
})

const loginTitle = computed(() => {
  if (props.mode === 'admin') return 'Login Admin'
  if (props.mode === 'user') return 'Login User'
  return 'Masuk ke Dashboard'
})

const loginSubtitle = computed(() => {
  if (props.mode === 'admin') return 'Halaman ini hanya untuk akun admin resmi.'
  if (props.mode === 'user') return 'Masuk sebagai operator atau user dashboard.'
  return 'Pilih mode akses sesuai peran Anda.'
})

const resetLoginForms = () => {
  userIdentifier.value = ''
  userPassword.value = ''
  rememberMe.value = true
  userFormError.value = ''
  passwordResetInfo.value = ''
  showUserPassword.value = false
  adminError.value = ''
  adminIdentifier.value = ''
  adminPassword.value = ''
  showAdminPassword.value = false
}

const setMode = (nextIsAdminMode) => {
  if (isModeLocked.value) return
  isAdminMode.value = nextIsAdminMode
  resetLoginForms()
}

watch(
  () => props.mode,
  nextMode => {
    isAdminMode.value = nextMode === 'admin'
    resetLoginForms()
  },
  { immediate: true }
)

const toggleUserPasswordVisibility = () => { showUserPassword.value = !showUserPassword.value }
const toggleAdminPasswordVisibility = () => { showAdminPassword.value = !showAdminPassword.value }

const handleUserCredentialLogin = () => {
  userFormError.value = ''
  passwordResetInfo.value = ''
  const identifier = userIdentifier.value.trim()
  const password = userPassword.value
  if (!identifier || !password) {
    userFormError.value = 'Isi username/email dan password terlebih dahulu.'
    return
  }
  emit('login-credentials', { identifier, password, rememberMe: rememberMe.value })
}

const handleForgotPassword = () => {
  userFormError.value = ''
  passwordResetInfo.value = ''
  const identifier = userIdentifier.value.trim()
  if (!identifier) {
    userFormError.value = 'Isi username/email terlebih dahulu untuk reset password.'
    return
  }
  emit('forgot-password', { identifier })
  passwordResetInfo.value = 'Jika akun terdaftar, tautan reset password akan dikirim ke email Anda.'
}

const handleAdminLogin = () => {
  adminError.value = ''
  const identifier = adminIdentifier.value.trim()
  const password = adminPassword.value
  if (!identifier || !password) {
    adminError.value = 'Isi email dan password admin terlebih dahulu.'
    return
  }
  emit('login-admin', { identifier, password })
}

const buttonLabel = computed(() => {
  if (!props.isAuthReady) return 'Menyiapkan autentikasi...'
  if (!props.isFirebaseConfigured) return 'Firebase belum siap'
  if (props.isSigningIn) return 'Memproses login...'
  return 'Lanjutkan dengan Google'
})

const credentialButtonLabel = computed(() => {
  if (!props.isAuthReady) return 'Menyiapkan autentikasi...'
  if (!props.isFirebaseConfigured) return 'Firebase belum siap'
  if (props.isSigningIn) return 'Memproses login...'
  return 'Masuk'
})

const themeLabel = computed(() => (props.isDarkMode ? 'Mode Terang' : 'Mode Gelap'))
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap');

/* ─── Root & Background ─── */
.login-page {
  --text: #1e293b;
  --text-soft: #475569;
  --text-muted: #94a3b8;
  --line: rgba(15, 23, 42, 0.12);
  --accent: #0ea5a4;
  --accent-deep: #0284c7;
  --accent-soft: rgba(14, 165, 164, 0.08);
  --surface: rgba(255, 255, 255, 0.9);
  --surface-chip: rgba(255, 255, 255, 0.94);
  --error-bg: rgba(239, 68, 68, 0.08);
  --error-text: #dc2626;
  --warn-bg: rgba(245, 158, 11, 0.09);
  --warn-text: #b45309;
  --success-bg: rgba(16, 185, 129, 0.08);
  --success-text: #047857;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text);
  background:
    radial-gradient(ellipse at 15% 12%, rgba(14, 165, 164, 0.16) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 10%, rgba(2, 132, 199, 0.16) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 95%, rgba(6, 182, 212, 0.09) 0%, transparent 45%),
    linear-gradient(135deg, #f8fcff 0%, #edf5ff 50%, #f0fdf8 100%);
}

.login-page.dark {
  --text: #e2e8f0;
  --text-soft: #94a3b8;
  --text-muted: #64748b;
  --line: rgba(148, 163, 184, 0.2);
  --accent: #14b8a6;
  --accent-deep: #0ea5e9;
  --accent-soft: rgba(20, 184, 166, 0.12);
  --surface: rgba(8, 16, 32, 0.9);
  --surface-chip: rgba(15, 23, 42, 0.94);
  --error-bg: rgba(248, 113, 113, 0.1);
  --error-text: #fca5a5;
  --warn-bg: rgba(251, 191, 36, 0.12);
  --warn-text: #fde68a;
  --success-bg: rgba(16, 185, 129, 0.1);
  --success-text: #6ee7b7;

  background:
    radial-gradient(ellipse at 15% 12%, rgba(20, 184, 166, 0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 10%, rgba(14, 165, 233, 0.16) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 95%, rgba(20, 184, 166, 0.09) 0%, transparent 45%),
    linear-gradient(135deg, #020817 0%, #061324 48%, #031c24 100%);
}

.backdrop-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.25;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.12) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse at center, black 25%, transparent 80%);
  z-index: 0;
}

/* ─── Top bar ─── */
.topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 480px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 0 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.14);
  padding: 5px;
  object-fit: contain;
}

.dark .brand-logo {
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.36);
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-text strong {
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.96rem;
  letter-spacing: -0.01em;
  color: var(--text);
}

.brand-text span {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.theme-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface-chip);
  color: var(--text-soft);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.theme-btn:hover {
  transform: translateY(-1px);
  border-color: var(--accent-deep);
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.15);
}

.icon { width: 17px; height: 17px; }

/* ─── Page content ─── */
.page-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px 40px;
  gap: 24px;
}

/* ─── Intro strip ─── */
.intro-strip {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  animation: fadeUp 0.5s ease both;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent-deep);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.15);
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.15); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0.08); }
}

.intro-text {
  margin: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 36ch;
}

/* ─── Auth card ─── */
.auth-card {
  width: 100%;
  max-width: 440px;
  background: var(--surface);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 30px 32px 28px;
  box-shadow:
    0 20px 50px rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: fadeUp 0.65s ease both;
}

.dark .auth-card {
  box-shadow:
    0 24px 56px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(148, 163, 184, 0.08);
}

/* ─── Auth header ─── */
.auth-header {
  text-align: center;
  margin-bottom: 20px;
}

.auth-title {
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text);
}

.auth-subtitle {
  margin: 6px 0 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.84rem;
  color: var(--text-soft);
  line-height: 1.5;
}

/* ─── Mode switch ─── */
.mode-switch {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--accent-soft);
  margin-bottom: 20px;
}

.mode-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-muted);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.mode-btn.active {
  background: var(--surface-chip);
  color: var(--accent-deep);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.14);
}

.mode-btn:hover:not(.active) {
  color: var(--text-soft);
}

.mode-icon { width: 16px; height: 16px; flex-shrink: 0; }

/* ─── Admin badge ─── */
.admin-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(2, 132, 199, 0.25);
  background: rgba(2, 132, 199, 0.06);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--accent-deep);
  margin-bottom: 18px;
}

.badge-icon { width: 18px; height: 18px; flex-shrink: 0; }

/* ─── Form ─── */
.auth-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.input-wrap {
  position: relative;
}

.input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.94rem;
  font-weight: 500;
  padding: 12px 14px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.dark .input {
  background: rgba(15, 23, 42, 0.95);
}

.input:focus {
  outline: none;
  border-color: rgba(2, 132, 199, 0.55);
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
}

.input::placeholder {
  color: var(--text-muted);
  font-weight: 400;
}

.toggle-vis {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-chip);
  color: var(--text-soft);
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.toggle-vis:hover {
  border-color: var(--accent-deep);
  color: var(--accent-deep);
}

.eye-icon { width: 17px; height: 17px; }

/* ─── Form tools ─── */
.form-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.remember-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.82rem;
  color: var(--text-soft);
  cursor: pointer;
}

.remember-wrap input {
  width: 15px;
  height: 15px;
  accent-color: var(--accent-deep);
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent-deep);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 0;
}

.link-btn:hover { text-decoration: underline; }

/* ─── Primary button ─── */
.btn-primary {
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 14px;
  color: #e6f8ff;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #0f766e 0%, #0369a1 100%);
  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.2);
  transition: transform 0.22s ease, box-shadow 0.22s ease, opacity 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(2, 132, 199, 0.28);
}

.btn-primary:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

/* ─── Spinner ─── */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

/* ─── Divider ─── */
.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line);
}

.divider span {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ─── Google button ─── */
.btn-google {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 12px;
  padding: 13px;
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.dark .btn-google {
  color: var(--text);
  background: linear-gradient(135deg, #0f1e33 0%, #1a2e47 100%);
  border-color: rgba(148, 163, 184, 0.34);
}

.btn-google:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: rgba(2, 132, 199, 0.48);
  box-shadow: 0 10px 22px rgba(2, 132, 199, 0.14);
}

.btn-google:disabled {
  opacity: 0.52;
  cursor: not-allowed;
}

.google-icon { width: 20px; height: 20px; flex-shrink: 0; }
.google-svg { width: 100%; height: 100%; }

/* ─── Alt link ─── */
.alt-link {
  margin: 12px 0 0;
  text-align: center;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.anchor {
  color: var(--accent-deep);
  font-weight: 700;
  text-decoration: none;
}

.anchor:hover { text-decoration: underline; }

/* ─── Messages ─── */
.msg {
  margin: 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
}

.msg-error { color: var(--error-text); }
.msg-success { color: var(--success-text); }

.helper-text {
  margin: 6px 0 0;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.79rem;
  color: var(--text-muted);
  line-height: 1.5;
  text-align: center;
}

/* ─── Notice ─── */
.notice {
  margin-top: 14px;
  border-radius: 11px;
  border: 1px solid transparent;
  padding: 10px 13px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.81rem;
  line-height: 1.5;
}

.notice code {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 5px;
  padding: 1px 4px;
  font-size: 0.79rem;
}

.notice-warn {
  background: var(--warn-bg);
  border-color: rgba(245, 158, 11, 0.28);
  color: var(--warn-text);
}

.notice-error {
  background: var(--error-bg);
  border-color: rgba(239, 68, 68, 0.28);
  color: var(--error-text);
}

/* ─── Footer ─── */
.footer-copy {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.74rem;
  color: var(--text-muted);
  animation: fadeUp 0.7s ease both;
}

/* ─── Animations ─── */
@keyframes spin { to { transform: rotate(360deg); } }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Responsive ─── */
@media (max-width: 520px) {
  .page-content { padding: 24px 16px 32px; gap: 20px; }
  .topbar { padding: 18px 0 0; }
  .auth-card { padding: 24px 20px 22px; border-radius: 20px; }
  .auth-title { font-size: 1.4rem; }
}
</style>