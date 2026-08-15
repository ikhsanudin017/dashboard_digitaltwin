/**
 * @fileoverview useMLPrediction — ML prediction & AC recommendation
 *
 * Fallback chain (stops at first success):
 *   1. POST /ac-recommendation/recommend         (Azure Function — cloud)
 *   2. POST /api/predict/all                    (ML Flask API — local)
 *   3. Local rule-based calculation              (client-side fallback)
 *
 * Endpoints consumed:
 *   POST /ac-recommendation/recommend           → fetchFromAzureFunction()
 *   POST /api/predict/all                        → fetchFromMLAPI()
 *   GET  /api/model/info                        → getModelInfo()
 *   POST /api/reload                            → reloadModels()
 *
 * Base URLs: AZURE_FUNCTION_URL, ML_API_URL (from appConfig.js)
 */
import { ref, computed } from 'vue'
import axios from 'axios'
import { AZURE_FUNCTION_URL, ML_API_URL, DEMO_MODE } from '../lib/appConfig'

const PREDICTION_SCHEMA_VERSION = '1.0.0'

const FALLBACK_LEVEL_BY_SOURCE = Object.freeze({
  azure_ml: 0,
  azure_function: 0,
  ml_api: 1,
  local_calculation: 2
})

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round = (value, digits = 2) => {
  const factor = 10 ** digits
  return Math.round(toNumber(value, 0) * factor) / factor
}

const normalizeConfidencePercent = (value, fallback = 0) => {
  const numeric = toNumber(value, fallback)
  if (numeric <= 1) {
    return round(numeric * 100, 1)
  }
  return round(numeric, 1)
}

const createTraceId = () => `pred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeSensorInput = (sensorData = {}) => {
  const now = new Date()

  return {
    suhu: toNumber(sensorData.suhu ?? sensorData.temperature, 25),
    kelembaban: toNumber(sensorData.kelembaban ?? sensorData.humidity, 60),
    tegangan: toNumber(sensorData.tegangan ?? sensorData.voltage, 220),
    arus: toNumber(sensorData.arus ?? sensorData.current, 0.5),
    daya: toNumber(sensorData.daya ?? sensorData.power, 100),
    jumlahOrang: Math.max(0, Math.trunc(toNumber(sensorData.jumlahOrang ?? sensorData.people ?? sensorData.peopleCount, 0))),
    hour: Math.trunc(toNumber(sensorData.hour, now.getHours())),
    month: Math.trunc(toNumber(sensorData.month, now.getMonth() + 1)),
    timestamp_utc: sensorData.timestamp_utc || sensorData.timestamp || now.toISOString()
  }
}

const inferMode = (recommendedTemp, ambientTemp) => {
  if (recommendedTemp < ambientTemp - 1) return 'cooling'
  if (recommendedTemp > ambientTemp + 1) return 'eco'
  return 'maintain'
}

const inferAction = (mode) => {
  if (mode === 'cooling') return 'Turunkan suhu AC'
  if (mode === 'eco') return 'Naikkan suhu AC untuk hemat energi'
  return 'Pertahankan suhu AC'
}

const createUnifiedPrediction = ({
  source,
  traceId,
  sensorData,
  energy = {},
  ac = {},
  comfort = {},
  forecast = {},
  recommendation = {},
  modelVersion = 'unknown',
  timestampUtc
}) => {
  const predictedWatt = toNumber(energy.predicted_watt ?? energy.predictedWatt, sensorData.daya)
  const dailyKwh = toNumber(energy.daily_kwh ?? energy.dailyKwh, (predictedWatt * 24) / 1000)
  const monthlyKwh = toNumber(energy.monthly_kwh ?? energy.monthlyKwh, dailyKwh * 30)
  const monthlyCostIDR = toNumber(
    energy.monthly_cost_idr ?? energy.monthlyCostIDR,
    monthlyKwh * 1444.70
  )

  const recommendedTemp = toNumber(ac.recommended_temp ?? ac.recommendedTemp, 24)
  const mode = ac.mode || inferMode(recommendedTemp, sensorData.suhu)

  return {
    schema_version: PREDICTION_SCHEMA_VERSION,
    timestamp_utc: timestampUtc || sensorData.timestamp_utc || new Date().toISOString(),
    trace_id: traceId,
    source,
    source_tag: `${source}:prediction`,
    model_version: modelVersion,
    energy: {
      predicted_watt: round(predictedWatt, 2),
      daily_kwh: round(dailyKwh, 2),
      monthly_kwh: round(monthlyKwh, 2),
      monthly_cost_idr: round(monthlyCostIDR, 0),
      confidence_percent: energy.confidence_percent == null && energy.confidence == null
        ? null
        : normalizeConfidencePercent(energy.confidence_percent ?? energy.confidence, 0)
    },
    ac: {
      recommended_temp: round(recommendedTemp, 1),
      action: ac.action || ac.reason || inferAction(mode),
      mode,
      confidence_percent: ac.confidence_percent == null && ac.confidence == null
        ? null
        : normalizeConfidencePercent(ac.confidence_percent ?? ac.confidence, 0),
      requires_user_approval: ac.requires_user_approval ?? recommendation.requires_user_approval ?? true
    },
    comfort: {
      score: comfort.comfort_score == null ? null : round(comfort.comfort_score, 1),
      level: comfort.comfort_level || 'unknown',
      method: comfort.method || 'unavailable',
      is_estimate: comfort.is_estimate ?? true
    },
    forecast: {
      horizon_minutes: forecast.horizon_minutes ?? energy.forecast_horizon_minutes ?? 30,
      target_time: forecast.target_time || null,
      status: forecast.status || energy.status || 'unknown',
      method: forecast.method || 'unknown'
    },
    scenarios: recommendation.scenarios || [],
    limitations: recommendation.limitations || []
  }
}

export function useMLPrediction() {
  const isLoading = ref(false)
  const error = ref(null)
  const lastPrediction = ref(null)
  const modelInfo = ref(null)
  const predictionMeta = ref(null)
  
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

  const comfortCalculation = ref({ score: null, level: 'unknown', method: 'unavailable', isEstimate: true })
  const forecastMeta = ref({ horizonMinutes: 30, targetTime: null, status: 'unknown', method: 'unknown' })
  const recommendationScenarios = ref([])
  
  // Computed
  const hasValidPrediction = computed(() => {
    return lastPrediction.value !== null && Number.isFinite(energyPrediction.value.predictedWatt)
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
    if (!ML_API_URL) {
      return { success: false, error: 'ML API URL not configured' }
    }

    try {
      const response = await axios.post(`${ML_API_URL}/predict/all`, sensorData, {
        timeout: 5000
      })

      if (response.data?.ac && response.data?.energy) {
        const unified = createUnifiedPrediction({
          source: 'ml_api',
          traceId: sensorData.trace_id,
          sensorData,
          energy: response.data.energy,
          ac: response.data.ac,
          comfort: response.data.comfort,
          forecast: response.data.forecast_30m,
          recommendation: response.data.ac_recommendation,
          modelVersion: response.data.model_version ?? response.data.forecast_30m?.model_version ?? 'persistence-30m:1',
          timestampUtc: response.data.timestamp_utc ?? response.data.timestamp
        })

        return {
          success: true,
          data: unified,
          source: 'ml_api'
        }
      }

      return { success: false, error: 'Invalid ML API response contract' }
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
      // Azure Function expects canonical payload: suhu, kelembaban, jumlahOrang, daya, timestamp
      console.log('[ML] Calling Azure Function with:', JSON.stringify({
        suhu: sensorData.suhu,
        kelembaban: sensorData.kelembaban,
        jumlahOrang: sensorData.jumlahOrang || 0,
        daya: sensorData.daya
      }))

      const response = await axios.post(`${AZURE_FUNCTION_URL}/ac-recommendation/recommend`, {
        suhu: sensorData.suhu,
        kelembaban: sensorData.kelembaban,
        jumlahOrang: sensorData.jumlahOrang || 0,
        daya: sensorData.daya,
        timestamp: sensorData.timestamp_utc,
        trace_id: sensorData.trace_id
      }, {
        timeout: 5000
      })

      console.log('[ML] Azure Function response:', JSON.stringify(response.data))

      const payload = response.data || {}
      const systemResult = payload.data

      if (payload.success !== false && systemResult?.forecast_30m && systemResult?.ac_recommendation) {
        return {
          success: true,
          source: 'azure_ml',
          data: createUnifiedPrediction({
            source: 'azure_ml',
            traceId: sensorData.trace_id,
            sensorData,
            energy: {
              predicted_watt: systemResult.forecast_30m.predicted_power_watt,
              confidence_percent: systemResult.forecast_30m.confidence_percent,
              status: systemResult.forecast_30m.status
            },
            ac: systemResult.ac_recommendation,
            comfort: systemResult.comfort,
            forecast: systemResult.forecast_30m,
            recommendation: systemResult.ac_recommendation,
            modelVersion: systemResult.forecast_30m.model_version || 'candidate-v1',
            timestampUtc: systemResult.timestamp_utc
          })
        }
      }

      const recommendation = payload.data || payload.recommendation || payload

      console.log('[ML] Parsed recommendation:', JSON.stringify(recommendation))

      if (payload.success === false || !recommendation || (!recommendation.recommendedTemp && !recommendation.recommended_temp)) {
        console.warn('[ML] Invalid Azure Function response')
        return { success: false, error: payload.error || 'Invalid Azure Function response contract' }
      }

      const unified = createUnifiedPrediction({
        source: 'azure_function',
        traceId: sensorData.trace_id,
        sensorData,
        energy: {
          predicted_watt: sensorData.daya,
          daily_kwh: (sensorData.daya * 24) / 1000,
          monthly_kwh: ((sensorData.daya * 24) / 1000) * 30,
          monthly_cost_idr: (((sensorData.daya * 24) / 1000) * 30) * 1444.70,
          confidence: recommendation.confidence
        },
        ac: {
          recommended_temp: recommendation.recommendedTemp ?? recommendation.recommended_temp,
          action: recommendation.reason ?? recommendation.action,
          mode: recommendation.mode,
          confidence: recommendation.confidence
        },
        modelVersion: recommendation.model_info?.training_date || 'azure_function',
        timestampUtc: recommendation.timestamp
      })

      console.log('[ML] Unified prediction:', JSON.stringify(unified.ac))

      if (unified.ac && unified.ac.recommended_temp !== undefined) {
        return {
          success: true,
          data: unified,
          source: 'azure_function'
        }
      }

      console.warn('[ML] Missing recommended_temp in unified prediction')
      return { success: false, error: 'Missing recommended temperature from Azure Function' }
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
    // Suhu dasar optimal: 24-26°C
    let baseTemp = 25
    
    // Faktor suhu ruangan (paling penting)
    if (suhu > 28) {
      baseTemp = 22  // Ruangan panas → AC dingin
    } else if (suhu > 26) {
      baseTemp = 23  // Ruangan hangat → AC sejuk
    } else if (suhu < 22) {
      baseTemp = 26  // Ruangan dingin → AC hangat/hemat energi
    }
    
    // Penyesuaian berdasarkan jumlah orang
    if (jumlahOrang >= 5) {
      baseTemp -= 1  // Banyak orang → butuh lebih dingin
    } else if (jumlahOrang >= 3) {
      baseTemp -= 0.5
    }
    
    // Penyesuaian kelembaban
    if (kelembaban > 70) {
      baseTemp -= 1  // Lembab → lebih dingin
    } else if (kelembaban < 40) {
      baseTemp += 1  // Kering → bisa lebih hangat
    }
    
    // Penyesuaian waktu (jam kerja lebih dingin)
    if (hour >= 10 && hour <= 15) {
      baseTemp -= 0.5  // Jam panas siang hari
    }
    
    // Round to nearest whole number and ensure reasonable range
    const recommendedTemp = Math.round(Math.max(20, Math.min(27, baseTemp)))
    
    // Tentukan action berdasarkan perbandingan dengan suhu ruangan
    let action, mode
    if (suhu > 27) {
      action = 'Ruangan panas, turunkan suhu AC untuk pendinginan'
      mode = 'cooling'
    } else if (suhu < 23) {
      action = 'Ruangan sudah sejuk, naikkan suhu AC untuk hemat energi'
      mode = 'eco'
    } else {
      action = 'Suhu ruangan nyaman, pertahankan setting AC'
      mode = 'maintain'
    }
    
    return {
      success: true,
      data: createUnifiedPrediction({
        source: 'local_calculation',
        traceId: sensorData.trace_id,
        sensorData,
        energy: {
          predicted_watt: predictedWatt,
          daily_kwh: dailyKwh,
          monthly_kwh: monthlyKwh,
          monthly_cost_idr: monthlyCostIDR,
          confidence: 60
        },
        ac: {
          recommended_temp: recommendedTemp,
          action,
          mode,
          confidence: 60
        },
        comfort: {
          comfort_score: Math.max(0, 100 - Math.abs(suhu - 24) * 12),
          comfort_level: suhu > 26 ? 'warm' : suhu < 22 ? 'cool' : 'comfortable',
          method: 'local_heuristic_v1',
          is_estimate: true
        },
        forecast: {
          horizon_minutes: 30,
          status: 'baseline',
          method: 'naive_persistence'
        },
        modelVersion: 'local_rule_v1'
      }),
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
      const normalizedInput = normalizeSensorInput(sensorData)
      const traceId = sensorData?.trace_id || createTraceId()
      normalizedInput.trace_id = traceId

      const fallbackChain = []

      // Demo runs locally and deterministically; normal operation remains cloud-first.
      let result
      if (DEMO_MODE) {
        result = await fetchFromMLAPI(normalizedInput)
        fallbackChain.push('ml_api')
      } else {
        result = await fetchFromAzureFunction(normalizedInput)
        fallbackChain.push('azure_function')

        if (!result.success) {
          result = await fetchFromMLAPI(normalizedInput)
          fallbackChain.push('ml_api')
        }
      }
      
      // Priority 3: Local calculation
      if (!result.success) {
        result = calculateLocalPrediction(normalizedInput)
        fallbackChain.push('local_calculation')
      }
      
      // Update state
      if (result.success) {
        const data = result.data
        const fallbackLevel = FALLBACK_LEVEL_BY_SOURCE[result.source] ?? 2

        predictionMeta.value = {
          schema_version: data.schema_version,
          timestamp_utc: data.timestamp_utc,
          trace_id: data.trace_id,
          source: data.source,
          source_tag: data.source_tag,
          model_version: data.model_version,
          fallback_level: fallbackLevel,
          fallback_chain: fallbackChain,
          demo_mode: DEMO_MODE,
          input: normalizedInput
        }
        
        energyPrediction.value = {
          predictedWatt: data.energy.predicted_watt || 0,
          dailyKwh: data.energy.daily_kwh || 0,
          monthlyKwh: data.energy.monthly_kwh || 0,
          monthlyCostIDR: data.energy.monthly_cost_idr || 0,
          confidence: data.energy.confidence_percent
        }
        
        acRecommendation.value = {
          recommendedTemp: data.ac.recommended_temp || 24,
          action: data.ac.action || 'Pertahankan suhu',
          mode: data.ac.mode || 'maintain',
          confidence: data.ac.confidence_percent,
          requiresUserApproval: data.ac.requires_user_approval !== false,
          sourceTag: data.source_tag,
          fallbackLevel,
          traceId: data.trace_id
        }

        comfortCalculation.value = {
          score: data.comfort.score,
          level: data.comfort.level,
          method: data.comfort.method,
          isEstimate: data.comfort.is_estimate
        }

        forecastMeta.value = {
          horizonMinutes: data.forecast.horizon_minutes,
          targetTime: data.forecast.target_time,
          status: data.forecast.status,
          method: data.forecast.method
        }
        recommendationScenarios.value = data.scenarios
        
        lastPrediction.value = predictionMeta.value
        
        console.log(`[ML] Prediction from ${result.source}:`, {
          meta: predictionMeta.value,
          energy: energyPrediction.value,
          ac: acRecommendation.value
        })
        
        return { success: true, source: result.source, meta: predictionMeta.value }
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
    predictionMeta,
    energyPrediction,
    acRecommendation,
    comfortCalculation,
    forecastMeta,
    recommendationScenarios,
    
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
