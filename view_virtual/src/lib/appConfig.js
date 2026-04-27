// API Security Configuration
// Sensitive keys loaded from environment variables

const readEnv = key => String(import.meta.env[key] || '').trim()

// Read-only URLs
export const AZURE_FUNCTION_URL =
  readEnv('VITE_AZURE_FUNCTION_URL') || 'https://func-digitaltwin-2026.azurewebsites.net/api'

// ML API
export const ML_API_URL =
  readEnv('VITE_ML_API_URL') || 'http://localhost:5000/api'

// Cesium & Google Maps API Keys
export const CESIUM_ION_TOKEN = readEnv('VITE_CESIUM_ION_TOKEN')
export const GOOGLE_MAPS_API_KEY = readEnv('VITE_GOOGLE_MAPS_API_KEY')

// Camera configuration
export const CAMERA_STREAM_URL =
  readEnv('VITE_CAMERA_STREAM_URL') || 'http://192.168.137.205:5000'

// Note: All sensitive operations should go through backend
// Frontend should only make read-only API calls
