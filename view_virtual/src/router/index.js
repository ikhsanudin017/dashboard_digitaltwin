import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useFirebaseAuth } from '../composables/useFirebaseAuth'
import { clearAdminSession, isAdminSessionActive } from '../lib/adminSession'

const RouteMarker = {
  name: 'RouteMarker',
  template: '<div aria-hidden="true" style="display:none"></div>'
}

const routes = [
  { path: '/', name: 'root', component: RouteMarker },
  { path: '/login', name: 'user-login', component: RouteMarker },
  { path: '/admin/login', name: 'admin-login', component: RouteMarker },
  {
    path: '/dashboard',
    name: 'user-dashboard',
    component: RouteMarker,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: RouteMarker,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const { isAuthReady, isAuthenticated, getAdminRoleStatus, signOutUser } = useFirebaseAuth()

const waitForAuthReady = async () => {
  if (isAuthReady.value) return

  await new Promise(resolve => {
    const stopWatch = watch(
      isAuthReady,
      ready => {
        if (!ready) return
        stopWatch()
        resolve()
      },
      { immediate: true }
    )
  })
}

router.beforeEach(async to => {
  await waitForAuthReady()

  const loggedIn = isAuthenticated.value
  const adminSessionActive = isAdminSessionActive()

  if (!adminSessionActive) {
    clearAdminSession()
  }

  if (to.name === 'root') {
    if (!loggedIn) return '/login'
    return adminSessionActive ? '/admin' : '/dashboard'
  }

  if (to.meta.requiresAdmin) {
    if (!loggedIn || !adminSessionActive) return '/admin/login'

    const adminRole = await getAdminRoleStatus({ forceRefresh: false })
    if (!adminRole.success) {
      clearAdminSession()
      await signOutUser()
      return '/admin/login'
    }
  }

  if (to.meta.requiresAuth && !loggedIn) {
    return to.meta.requiresAdmin ? '/admin/login' : '/login'
  }

  if (to.name === 'user-dashboard' && adminSessionActive) {
    return '/admin'
  }

  if ((to.name === 'user-login' || to.name === 'user-dashboard') && loggedIn) {
    const adminRole = await getAdminRoleStatus({ forceRefresh: false })
    if (adminRole.success && adminSessionActive) {
      return '/admin'
    }
    // Admin email logged in as user → let them proceed to dashboard
    // They can manually navigate to /admin/login if needed
    if (adminRole.success) {
      return '/dashboard'
    }
  }

  if (to.name === 'admin-login' && loggedIn) {
    const adminRole = await getAdminRoleStatus({ forceRefresh: false })

    if (adminRole.success) {
      if (adminSessionActive) return '/admin'
      return '/admin' // Show admin login page for admin to create session
    }

    return '/dashboard'
  }

  if (to.name === 'user-login' && loggedIn) {
    return '/dashboard'
  }

  return true
})

export default router
