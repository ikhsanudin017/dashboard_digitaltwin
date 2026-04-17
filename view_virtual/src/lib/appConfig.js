const DEFAULT_AZURE_FUNCTION_URL = 'https://func-digitaltwin-2026.azurewebsites.net/api'

export const AZURE_FUNCTION_URL =
  import.meta.env.VITE_AZURE_FUNCTION_URL || DEFAULT_AZURE_FUNCTION_URL

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const ML_API_URL =
  import.meta.env.VITE_ML_API_URL || 'http://localhost:5000/api'
