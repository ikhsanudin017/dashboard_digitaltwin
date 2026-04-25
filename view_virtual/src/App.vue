<template>
  <div class="app-shell">
    <!-- User Login -->
    <LoginPage
      v-if="isUserLoginRoute"
      :is-dark-mode="isDarkMode"
      :is-auth-ready="isAuthReady"
      :is-signing-in="isSigningIn"
      :auth-error="authError"
      :is-firebase-configured="isFirebaseConfigured"
      mode="user"
      @login-google="handleUserGoogleLogin"
      @login-credentials="handleCredentialLogin"
      @forgot-password="handleForgotPassword"
      @toggle-theme="toggleTheme"
    />

    <!-- Admin Login -->
    <LoginPage
      v-else-if="isAdminLoginRoute"
      :is-dark-mode="isDarkMode"
      :is-auth-ready="isAuthReady"
      :is-signing-in="isSigningIn"
      :auth-error="authError"
      :is-firebase-configured="isFirebaseConfigured"
      mode="admin"
      @login-admin="handleAdminAuth"
      @toggle-theme="toggleTheme"
    />

    <!-- Admin Dashboard -->
    <AdminDashboard
      v-else-if="isAdminDashboardRoute"
      :user="user || { displayName: 'Admin', email: 'admin@twinspace', photoURL: null }"
      :is-dark-mode="isDarkMode"
      @toggle-theme="toggleTheme"
      @logout="handleLogout"
    />

    <!-- User Dashboard (default) -->
    <DashboardHome
      v-else
      :user="user"
      :is-dark-mode="isDarkMode"
      @toggle-theme="toggleTheme"
      @logout="handleLogout"
    />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminDashboard from './components/AdminDashboard.vue'
import DashboardHome from './components/DashboardHome.vue'
import LoginPage from './components/LoginPage.vue'
import { useFirebaseAuth } from './composables/useFirebaseAuth'
import {
  clearAdminSession,
  getAdminSessionRemainingMs,
  isAdminSessionActive,
  setAdminSession
} from './lib/adminSession'

const route = useRoute()
const router = useRouter()

const isDarkMode = ref(false)
const isAdminAuthenticated = ref(false)
let adminSessionTimer = null

const adminSessionTtlMinutes = Number(import.meta.env.VITE_ADMIN_SESSION_TTL_MINUTES || 30)
const ADMIN_SESSION_TTL_MS =
  Number.isFinite(adminSessionTtlMinutes) && adminSessionTtlMinutes > 0
    ? adminSessionTtlMinutes * 60 * 1000
    : 30 * 60 * 1000

const clearAdminSessionTimer = () => {
  if (adminSessionTimer) {
    clearTimeout(adminSessionTimer)
    adminSessionTimer = null
  }
}

const isUserLoginRoute = computed(() => route.name === 'user-login')
const isAdminLoginRoute = computed(() => route.name === 'admin-login')
const isAdminDashboardRoute = computed(() => route.name === 'admin-dashboard')

const syncAdminSessionState = () => {
  const remainingMs = getAdminSessionRemainingMs()
  clearAdminSessionTimer()

  if (remainingMs <= 0) {
    clearAdminSession()
    isAdminAuthenticated.value = false
    return
  }

  isAdminAuthenticated.value = true
  adminSessionTimer = setTimeout(async () => {
    clearAdminSession()
    isAdminAuthenticated.value = false
    await signOutUser()

    if (route.name === 'admin-dashboard') {
      await router.replace('/admin/login')
    }
  }, remainingMs)
}

const startAdminSession = () => {
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS)
  setAdminSession(expiresAt.toISOString())
  syncAdminSessionState()
}

const redirectAfterLogin = async () => {
  if (isAdminSessionActive()) {
    await router.replace('/admin')
    return
  }

  await router.replace('/dashboard')
}

const finalizeUserLogin = async () => {
  // Simple: redirect to dashboard after successful login
  await router.replace('/dashboard')
}

const handleAdminAuth = async credentials => {
  const result = await signInAsAdmin(credentials)
  if (result.success) {
    startAdminSession()
    await router.replace('/admin')
  } else {
    isAdminAuthenticated.value = false
    clearAdminSession()
    clearAdminSessionTimer()
  }
}

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
}

const loadTheme = () => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDarkMode.value = savedTheme === 'dark'
  } else {
    isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  applyTheme()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light')
  applyTheme()
}

const {
  user,
  isAuthReady,
  isSigningIn,
  authError,
  getAdminRoleStatus,
  isFirebaseConfigured,
  signInAsAdmin,
  signInWithEmailPassword,
  requestPasswordReset,
  signInWithGoogle,
  signOutUser
} = useFirebaseAuth()

const handleCredentialLogin = async credentials => {
  const signInResult = await signInWithEmailPassword(credentials)
  if (!signInResult.success) return
  await finalizeUserLogin()
}

const handleUserGoogleLogin = async () => {
  const signInResult = await signInWithGoogle()
  if (!signInResult.success || signInResult.redirected) return
  await finalizeUserLogin()
}

const handleForgotPassword = async payload => {
  await requestPasswordReset(payload)
}

const handleLogout = async () => {
  clearAdminSessionTimer()
  clearAdminSession()
  isAdminAuthenticated.value = false
  await signOutUser()

  if (isAdminDashboardRoute.value) {
    await router.replace('/admin/login')
    return
  }

  await router.replace('/login')
}

onMounted(() => {
  loadTheme()
  syncAdminSessionState()
})

watch(user, nextUser => {
  if (!nextUser) {
    clearAdminSessionTimer()
    clearAdminSession()
    isAdminAuthenticated.value = false
    return
  }

  syncAdminSessionState()
})

watch(
  () => route.name,
  async nextRouteName => {
    if (!user.value) return
    if (nextRouteName !== 'user-login' && nextRouteName !== 'admin-login') return
    await redirectAfterLogin()
  }
)

onBeforeUnmount(() => {
  clearAdminSessionTimer()
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
