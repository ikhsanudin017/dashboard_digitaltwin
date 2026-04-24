const DEFAULT_AZURE_FUNCTION_URL = 'https://func-digitaltwin-2026.azurewebsites.net/api'
const readEnv = key => String(import.meta.env[key] || '').trim()

export const AZURE_FUNCTION_URL =
  readEnv('VITE_AZURE_FUNCTION_URL') || DEFAULT_AZURE_FUNCTION_URL

export const AZURE_FUNCTION_WRITE_KEY =
  readEnv('VITE_AZURE_FUNCTION_WRITE_KEY')

export const API_BASE_URL =
  readEnv('VITE_API_BASE_URL') || 'http://localhost:3000/api'

export const ML_API_URL =
  readEnv('VITE_ML_API_URL') || 'http://localhost:5000/api'
