import { ref, computed } from 'vue'
import axios from 'axios'

// ML Prediction API URLs
const ML_API_URL = import.meta.env.VITE_ML_API_URL || 'http://localhost:5000/api'
const AZURE_FUNCTION_URL = import.meta.env.VITE_AZURE_FUNCTION_URL || ''

export function useMLPrediction() {
  const isLoading = ref(false)
  const error = ref(null)
  const lastPrediction = ref(null)
  const modelInfo = ref(null)
  
  // Prediction results
  const energyPrediction = ref({
    predictedWatt: 0,
    dailyKwh: 0,
    monthlyKwh: 0,
    monthlyCostIDR: 0,
    confidence: 0
  })
  
  const acRecommendation = ref({
    recommendedTemp: 24,
    action: 'Pertahankan suhu',
    mode: 'maintain',
    confidence: 0
  })
  
  // Computed
  const hasValidPrediction = computed(() => {
    return lastPrediction.value !== null && energyPrediction.value.confidence > 0
  })
  
  const energyEfficiencyLevel = computed(() => {
    const watt = energyPrediction.value.predictedWatt
    if (watt < 100) return { level: 'excellent', label: 'Sangat Hemat', color: 'green' }
    if (watt < 200) return { level: 'good', label: 'Hemat', color: 'blue' }
    if (watt < 400) return { level: 'moderate', label: 'Normal', color: 'yellow' }
    return { level: 'high', label: 'Tinggi', color: 'red' }
  })
  
  const acModeIcon = computed(() => {
    const mode = acRecommendation.value.mode
    if (mode === 'cooling') return { icon: 'snowflake', color: 'blue' }
    if (mode === 'eco') return { icon: 'leaf', color: 'green' }
    return { icon: 'check', color: 'gray' }
  })

  /**
   * Fetch prediction dari ML API lokal (Python Flask)
   */
  const fetchFromMLAPI = async (sensorData) => {
    try {
      const response = await axios.post(`${ML_API_URL}/predict/all`, sensorData, {
        timeout: 5000
      })
      
      if (response.data) {
        return {
          success: true,
          data: response.data,
          source: 'ml_api'
        }
      }
      return { success: false }
    } catch (err) {
      console.warn('[ML API] Not available:', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetch prediction dari Azure Function (fallback)
   */
  const fetchFromAzureFunction = async (sensorData) => {
    if (!AZURE_FUNCTION_URL) {
      return { success: false, error: 'Azure Function URL not configured' }
    }
    
    try {
      const response = await axios.post(`${AZURE_FUNCTION_URL}/ac-recommendation`, {
        temperature: sensorData.suhu,
        humidity: sensorData.kelembaban,
        people: sensorData.jumlahOrang || 0,
        timeOfDay: sensorData.hour || new Date().getHours(),
        power: sensorData.daya
      }, {
        timeout: 5000
      })
      
      if (response.data) {
        return {
          success: true,
          data: {
            energy: {
              predicted_watt: sensorData.daya || 100,
              daily_kwh: ((sensorData.daya || 100) * 24) / 1000,
              monthly_kwh: ((sensorData.daya || 100) * 24 * 30) / 1000,
              monthly_cost_idr: ((sensorData.daya || 100) * 24 * 30 / 1000) * 1444.70,
              confidence: 80
            },
            ac: {
              recommended_temp: response.data.recommendedTemperature || response.data.recommended_temp,
              action: response.data.reason || response.data.action,
              mode: response.data.mode || 'maintain',
              confidence: response.data.confidence || 85
            }
          },
          source: 'azure_function'
        }
      }
      return { success: false }
    } catch (err) {
      console.warn('[Azure Function] Not available:', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Calculate prediction locally (fallback jika semua API tidak tersedia)
   */
  const calculateLocalPrediction = (sensorData) => {
    const { suhu, kelembaban, daya, jumlahOrang = 0, hour = new Date().getHours() } = sensorData
    
    // Energy prediction based on current power usage
    const predictedWatt = daya || 100
    const dailyKwh = (predictedWatt * 24) / 1000
    const monthlyKwh = dailyKwh * 30
    const monthlyCostIDR = monthlyKwh * 1444.70
    
    // AC recommendation using simple logic
    let baseTemp = 24
    if (jumlahOrang > 0) baseTemp -= jumlahOrang / 20
    if (suhu > 25) baseTemp -= (suhu - 25) * 0.3
    if (kelembaban > 60) baseTemp -= 0.5
    if (hour >= 8 && hour <= 17) baseTemp -= 0.3
    
    const recommendedTemp = Math.max(18, Math.min(28, baseTemp))
    
    let action, mode
    if (recommendedTemp < suhu - 2) {
      action = 'Turunkan suhu AC'
      mode = 'cooling'
    } else if (recommendedTemp > suhu + 2) {
      action = 'Naikkan suhu AC untuk hemat energi'
      mode = 'eco'
    } else {
      action = 'Pertahankan suhu AC'
      mode = 'maintain'
    }
    
    return {
      success: true,
      data: {
        energy: {
          predicted_watt: predictedWatt,
          daily_kwh: dailyKwh,
          monthly_kwh: monthlyKwh,
          monthly_cost_idr: monthlyCostIDR,
          confidence: 60 // Lower confidence for local calculation
        },
        ac: {
          recommended_temp: recommendedTemp,
          action: action,
          mode: mode,
          confidence: 60
        }
      },
      source: 'local_calculation'
    }
  }

  /**
   * Main function: Get ML prediction dengan fallback chain
   */
  const getPrediction = async (sensorData) => {
    isLoading.value = true
    error.value = null
    
    try {
      // Priority 1: ML API (Python Flask)
      let result = await fetchFromMLAPI(sensorData)
      
      // Priority 2: Azure Function
      if (!result.success) {
        result = await fetchFromAzureFunction(sensorData)
      }
      
      // Priority 3: Local calculation
      if (!result.success) {
        result = calculateLocalPrediction(sensorData)
      }
      
      // Update state
      if (result.success) {
        const data = result.data
        
        energyPrediction.value = {
          predictedWatt: data.energy.predicted_watt || 0,
          dailyKwh: data.energy.daily_kwh || 0,
          monthlyKwh: data.energy.monthly_kwh || 0,
          monthlyCostIDR: data.energy.monthly_cost_idr || 0,
          confidence: data.energy.confidence || 0
        }
        
        acRecommendation.value = {
          recommendedTemp: data.ac.recommended_temp || 24,
          action: data.ac.action || 'Pertahankan suhu',
          mode: data.ac.mode || 'maintain',
          confidence: data.ac.confidence || 0
        }
        
        lastPrediction.value = {
          timestamp: new Date().toISOString(),
          source: result.source,
          input: sensorData
        }
        
        console.log(`[ML] Prediction from ${result.source}:`, {
          energy: energyPrediction.value,
          ac: acRecommendation.value
        })
        
        return { success: true, source: result.source }
      }
      
      throw new Error('All prediction methods failed')
      
    } catch (err) {
      error.value = err.message
      console.error('[ML] Prediction error:', err)
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get model info from ML API
   */
  const getModelInfo = async () => {
    try {
      const response = await axios.get(`${ML_API_URL}/model/info`, {
        timeout: 5000
      })
      modelInfo.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      console.warn('[ML] Cannot fetch model info:', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Trigger model reload (setelah training baru)
   */
  const reloadModels = async () => {
    try {
      const response = await axios.post(`${ML_API_URL}/reload`, {}, {
        timeout: 5000
      })
      return { success: response.data.success }
    } catch (err) {
      console.warn('[ML] Cannot reload models:', err.message)
      return { success: false, error: err.message }
    }
  }

  /**
   * Format currency IDR
   */
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value)
  }

  return {
    // State
    isLoading,
    error,
    lastPrediction,
    modelInfo,
    energyPrediction,
    acRecommendation,
    
    // Computed
    hasValidPrediction,
    energyEfficiencyLevel,
    acModeIcon,
    
    // Methods
    getPrediction,
    getModelInfo,
    reloadModels,
    formatCurrency
  }
}
