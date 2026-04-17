<template>
  <div class="app-shell">
    <!-- Login Page -->
    <LoginPage
      v-if="!isAuthenticated && !isAdminAuthenticated"
      :is-dark-mode="isDarkMode"
      :is-auth-ready="isAuthReady"
      :is-signing-in="isSigningIn"
      :auth-error="authError"
      :is-firebase-configured="isFirebaseConfigured"
      @login-google="signInWithGoogle"
      @login-admin="handleAdminAuth"
      @toggle-theme="toggleTheme"
    />

    <!-- Admin Dashboard -->
    <AdminDashboard
      v-else-if="isAdminAuthenticated"
      :user="{ displayName: 'Super Admin', email: 'admin@twinspace', photoURL: null }"
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
import { onMounted, ref } from 'vue'
import AdminDashboard from './components/AdminDashboard.vue'
import DashboardHome from './components/DashboardHome.vue'
import LoginPage from './components/LoginPage.vue'
import { useFirebaseAuth } from './composables/useFirebaseAuth'

const isDarkMode = ref(false)
const isAdminAuthenticated = ref(false)

const handleAdminAuth = () => {
  isAdminAuthenticated.value = true
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
  isAuthenticated,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutUser
} = useFirebaseAuth()

const handleLogout = async () => {
  isAdminAuthenticated.value = false
  await signOutUser()
}

onMounted(() => {
  loadTheme()
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
