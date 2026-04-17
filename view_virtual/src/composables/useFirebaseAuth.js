import { computed, ref } from 'vue'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase'

const user = ref(null)
const isAuthReady = ref(false)
const isSigningIn = ref(false)
const authError = ref('')

let authObserverInitialized = false

const mapAuthError = error => {
  if (!error?.code) return 'Login Google gagal. Silakan coba lagi.'

  if (error.code === 'auth/popup-closed-by-user') return ''
  if (error.code === 'auth/popup-blocked') return 'Popup login diblokir browser. Izinkan popup lalu coba lagi.'
  if (error.code === 'auth/cancelled-popup-request') return 'Permintaan popup sebelumnya dibatalkan. Coba login sekali lagi.'
  if (error.code === 'auth/unauthorized-domain') return 'Domain ini belum diizinkan di Firebase Authentication.'
  if (error.code === 'auth/operation-not-allowed') return 'Provider Google belum diaktifkan di Firebase Console.'
  if (error.code === 'auth/configuration-not-found') return 'Konfigurasi Google Sign-In di Firebase belum lengkap.'
  if (error.code === 'auth/auth-domain-config-required') return 'Auth domain Firebase belum benar atau belum dikonfigurasi.'
  if (error.code === 'auth/invalid-api-key') return 'Firebase API key tidak valid.'
  if (error.code === 'auth/app-not-authorized') return 'Aplikasi ini belum diotorisasi untuk Firebase Authentication.'
  if (error.code === 'auth/network-request-failed') return 'Koneksi jaringan bermasalah saat menghubungi Firebase.'
  if (error.code === 'auth/web-storage-unsupported') return 'Browser ini memblokir storage yang dibutuhkan Firebase login.'

  return `Login Google gagal (${error.code}). Periksa provider Google dan Authorized Domains di Firebase.`
}

const initializeAuthObserver = () => {
  if (authObserverInitialized) return

  if (!isFirebaseConfigured || !auth) {
    isAuthReady.value = true
    authObserverInitialized = true
    return
  }

  getRedirectResult(auth).catch(error => {
    authError.value = mapAuthError(error)
  })

  onAuthStateChanged(
    auth,
    currentUser => {
      user.value = currentUser
      isAuthReady.value = true
    },
    error => {
      authError.value = mapAuthError(error)
      isAuthReady.value = true
    }
  )

  authObserverInitialized = true
}

export function useFirebaseAuth() {
  initializeAuthObserver()

  const signInWithGoogleRedirect = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      authError.value = 'Firebase belum dikonfigurasi. Isi variabel environment terlebih dahulu.'
      return { success: false }
    }

    await signInWithRedirect(auth, googleProvider)
    return { success: true }
  }

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      authError.value = 'Firebase belum dikonfigurasi. Isi variabel environment terlebih dahulu.'
      return { success: false }
    }

    isSigningIn.value = true
    authError.value = ''

    try {
      await signInWithPopup(auth, googleProvider)
      return { success: true }
    } catch (error) {
      const recoverablePopupErrorCodes = new Set([
        'auth/popup-blocked',
        'auth/web-storage-unsupported',
        'auth/operation-not-supported-in-this-environment'
      ])

      if (recoverablePopupErrorCodes.has(error?.code)) {
        authError.value = 'Popup tidak bisa digunakan. Mengalihkan ke login Google halaman penuh...'
        await signInWithGoogleRedirect()
        return { success: true, redirected: true }
      }

      authError.value = mapAuthError(error)
      return { success: false, error }
    } finally {
      isSigningIn.value = false
    }
  }

  const signOutUser = async () => {
    if (!auth) return { success: true }

    try {
      await signOut(auth)
      return { success: true }
    } catch (error) {
      authError.value = 'Gagal keluar dari sesi login.'
      return { success: false, error }
    }
  }

  return {
    user,
    isAuthReady,
    isSigningIn,
    authError,
    isAuthenticated: computed(() => Boolean(user.value)),
    isFirebaseConfigured,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signOutUser
  }
}
