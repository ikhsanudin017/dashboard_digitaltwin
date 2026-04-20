import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'

const readEnv = key => String(import.meta.env[key] || '').trim()

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
  measurementId: readEnv('VITE_FIREBASE_MEASUREMENT_ID')
}

const isFirebaseConfigured = ['apiKey', 'authDomain', 'projectId', 'appId'].every(
  key => Boolean(firebaseConfig[key])
)

let app = null
let auth = null
let googleProvider = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  auth.useDeviceLanguage()
  googleProvider = new GoogleAuthProvider()
  googleProvider.addScope('email')
  googleProvider.addScope('profile')
  googleProvider.setCustomParameters({ prompt: 'select_account' })

  setPersistence(auth, browserLocalPersistence).catch(error => {
    console.warn('[Firebase] Failed to apply local persistence:', error.message)
  })
}

export { app, auth, googleProvider, isFirebaseConfigured }
