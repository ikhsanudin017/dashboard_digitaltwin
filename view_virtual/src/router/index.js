import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useFirebaseAuth } from '../composables/useFirebaseAuth'
import { clearAdminSession, isAdminSessionActive } from '../lib/adminSession'

const RouteMarker = {
  name: 'RouteMarker',
  template: '<div aria-hidden="true" style="display:none"></div>'
}

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', redirect: '/dashboard' },
  { path: '/admin/login', name: 'admin-login', component: RouteMarker },
  {
    path: '/dashboard',
    name: 'user-dashboard',
    component: RouteMarker
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

  // Admin routes: require auth + admin role
  if (to.meta.requiresAdmin) {
    if (!loggedIn || !adminSessionActive) return '/admin/login'

    const adminRole = await getAdminRoleStatus({ forceRefresh: false })
    if (!adminRole.success) {
      clearAdminSession()
      await signOutUser()
      return '/admin/login'
    }
    return true
  }

  // Admin login route: if already logged in → go to admin dashboard
  if (to.name === 'admin-login' && loggedIn) {
    if (adminSessionActive) return '/admin'
    // Check if user has admin role, if not → go to user dashboard
    try {
      const adminRole = await getAdminRoleStatus({ forceRefresh: false })
      if (!adminRole.success) {
        return '/dashboard'
      }
    } catch {
      // On error, stay on admin login page
    }
  }

  return true
})

export default router
