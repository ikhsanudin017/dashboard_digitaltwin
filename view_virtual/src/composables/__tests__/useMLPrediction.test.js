import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { useMLPrediction } from '../useMLPrediction'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}))

vi.mock('../../lib/appConfig', () => ({
  AZURE_FUNCTION_URL: 'https://example-azure-function.azurewebsites.net/api',
  ML_API_URL: 'http://localhost:5000/api',
  DEMO_MODE: false
}))

describe('useMLPrediction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps the Azure ML forecast, comfort, scenarios, and provenance contract', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          timestamp_utc: '2026-08-06T03:00:00Z',
          forecast_30m: {
            status: 'predicted',
            method: 'xgboost',
            model_version: 'forecast-30m:1',
            horizon_minutes: 30,
            predicted_power_watt: 137.4,
            target_time: '2026-08-06T03:30:00Z',
            confidence_percent: null
          },
          comfort: {
            comfort_score: 72,
            comfort_level: 'warm',
            method: 'transparent_heuristic_v1',
            is_estimate: true
          },
          ac_recommendation: {
            recommended_temp: 24,
            action: 'Turunkan suhu AC',
            mode: 'cooling',
            requires_user_approval: true,
            confidence_percent: null,
            scenarios: [
              { setpoint_c: 24, comfort_score: 86, estimated_power_watt: 140 }
            ]
          }
        }
      }
    })

    const prediction = useMLPrediction()
    const result = await prediction.getPrediction({
      suhu: 29,
      kelembaban: 70,
      daya: 120,
      jumlahOrang: 5
    })

    expect(result).toMatchObject({ success: true, source: 'azure_ml' })
    expect(prediction.energyPrediction.value.predictedWatt).toBe(137.4)
    expect(prediction.energyPrediction.value.confidence).toBe(null)
    expect(prediction.forecastMeta.value).toMatchObject({
      horizonMinutes: 30,
      targetTime: '2026-08-06T03:30:00Z',
      status: 'predicted',
      method: 'xgboost'
    })
    expect(prediction.comfortCalculation.value).toMatchObject({
      score: 72,
      level: 'warm',
      isEstimate: true
    })
    expect(prediction.acRecommendation.value).toMatchObject({
      recommendedTemp: 24,
      requiresUserApproval: true,
      confidence: null
    })
    expect(prediction.recommendationScenarios.value).toHaveLength(1)
    expect(prediction.predictionMeta.value).toMatchObject({
      source: 'azure_ml',
      model_version: 'forecast-30m:1',
      fallback_level: 0
    })
  })

  it('uses canonical Azure Function request/response contract and metadata', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          recommendedTemp: 22.8,
          reason: 'Turunkan suhu AC',
          mode: 'cooling',
          confidence: 0.96,
          timestamp: '2026-04-20T10:00:00.000Z'
        }
      }
    })

    const prediction = useMLPrediction()
    const result = await prediction.getPrediction({
      temperature: 30,
      humidity: 75,
      power: 180,
      peopleCount: 4
    })

    expect(result.success).toBe(true)
    expect(result.source).toBe('azure_function')

    expect(axios.post).toHaveBeenCalledTimes(1)
    const [url, requestBody] = axios.post.mock.calls[0]
    expect(url).toContain('/ac-recommendation/recommend')
    expect(requestBody).toMatchObject({
      suhu: 30,
      kelembaban: 75,
      jumlahOrang: 4,
      daya: 180
    })
    expect(requestBody.temperature).toBeUndefined()
    expect(requestBody.humidity).toBeUndefined()

    expect(prediction.acRecommendation.value.recommendedTemp).toBe(22.8)
    expect(prediction.acRecommendation.value.confidence).toBe(96)
    expect(prediction.predictionMeta.value.source_tag).toBe('azure_function:prediction')
    expect(prediction.predictionMeta.value.fallback_level).toBe(0)
    expect(prediction.predictionMeta.value.fallback_chain).toEqual(['azure_function'])
  })

  it('falls back to ML API with clear source tagging when Azure Function fails', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Azure Function unavailable'))
      .mockResolvedValueOnce({
        data: {
          timestamp: '2026-04-20T10:02:00.000Z',
          model_version: 3,
          energy: {
            predicted_watt: 150,
            daily_kwh: 3.6,
            monthly_kwh: 108,
            monthly_cost_idr: 155000,
            confidence: 87
          },
          ac: {
            recommended_temp: 24.2,
            action: 'Pertahankan suhu AC',
            mode: 'maintain',
            confidence: 92
          }
        }
      })

    const prediction = useMLPrediction()
    const result = await prediction.getPrediction({
      suhu: 28,
      kelembaban: 65,
      daya: 150,
      jumlahOrang: 2
    })

    expect(result.success).toBe(true)
    expect(result.source).toBe('ml_api')
    expect(prediction.predictionMeta.value.source_tag).toBe('ml_api:prediction')
    expect(prediction.predictionMeta.value.fallback_level).toBe(1)
    expect(prediction.predictionMeta.value.fallback_chain).toEqual(['azure_function', 'ml_api'])

    expect(prediction.energyPrediction.value.predictedWatt).toBe(150)
    expect(prediction.acRecommendation.value.recommendedTemp).toBe(24.2)
    expect(prediction.acRecommendation.value.confidence).toBe(92)
  })

  it('uses local calculation as the final fallback when all APIs fail', async () => {
    axios.post
      .mockRejectedValueOnce(new Error('Azure Function unavailable'))
      .mockRejectedValueOnce(new Error('ML API unavailable'))

    const prediction = useMLPrediction()
    const result = await prediction.getPrediction({
      suhu: 29,
      kelembaban: 70,
      daya: 120,
      jumlahOrang: 5,
      hour: 13
    })

    expect(result.success).toBe(true)
    expect(result.source).toBe('local_calculation')
    expect(prediction.predictionMeta.value.source_tag).toBe('local_calculation:prediction')
    expect(prediction.predictionMeta.value.fallback_level).toBe(2)
    expect(prediction.predictionMeta.value.fallback_chain).toEqual([
      'azure_function',
      'ml_api',
      'local_calculation'
    ])

    expect(prediction.acRecommendation.value.recommendedTemp).toBeGreaterThanOrEqual(20)
    expect(prediction.acRecommendation.value.recommendedTemp).toBeLessThanOrEqual(27)
    expect(prediction.acRecommendation.value.confidence).toBe(60)
    expect(prediction.error.value).toBe(null)
  })
})
