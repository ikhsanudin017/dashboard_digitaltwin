import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAzureTelemetry } from '../useAzureTelemetry'

// --- Module-level mocks (hoisted by vi.mock) ---

vi.mock('../../lib/appConfig', () => ({
  AZURE_FUNCTION_URL: 'https://test-azure-function.azurewebsites.net/api',
  AZURE_FUNCTION_WRITE_KEY: 'test-write-key',
  API_BASE_URL: 'http://localhost:3000/api',
  ML_API_URL: 'http://localhost:5000/api',
  DEMO_MODE: false
}))

// Stub global fetch before any imports
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: vi.fn((key) => localStorageMock.store[key] || null),
  setItem: vi.fn((key, value) => { localStorageMock.store[key] = value }),
  removeItem: vi.fn((key) => { delete localStorageMock.store[key] }),
  clear: vi.fn(() => { localStorageMock.store = {} })
}
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_AZURE_FUNCTION_URL: 'https://test-azure-function.azurewebsites.net/api'
  }
})

describe('useAzureTelemetry (HTTP Polling Azure)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      const tel = useAzureTelemetry()
      expect(tel.isConnected.value).toBe(false)
    })

    it('should have default sensor data structure', () => {
      const tel = useAzureTelemetry()
      expect(tel.sensorData.value).toBeDefined()
      expect(tel.sensorData.value.temperature).toBe(0)
      expect(tel.sensorData.value.humidity).toBe(0)
      expect(tel.sensorData.value.power).toBe(0)
    })

    it('should initialize sensorData with all required fields', () => {
      const tel = useAzureTelemetry()

      expect(tel.sensorData.value).toHaveProperty('temperature')
      expect(tel.sensorData.value).toHaveProperty('humidity')
      expect(tel.sensorData.value).toHaveProperty('voltage')
      expect(tel.sensorData.value).toHaveProperty('current')
      expect(tel.sensorData.value).toHaveProperty('power')
      expect(tel.sensorData.value).toHaveProperty('voltageStatus')
      expect(tel.sensorData.value).toHaveProperty('currentStatus')
      expect(tel.sensorData.value).toHaveProperty('peopleCount')
      expect(tel.sensorData.value).toHaveProperty('lastPeopleUpdate')
    })

    it('should initialize with correct default values', () => {
      const tel = useAzureTelemetry()

      expect(tel.sensorData.value.temperature).toBe(0)
      expect(tel.sensorData.value.humidity).toBe(0)
      expect(tel.sensorData.value.voltage).toBe(0)
      expect(tel.sensorData.value.current).toBe(0)
      expect(tel.sensorData.value.power).toBe(0)
      expect(tel.sensorData.value.voltageStatus).toBe('unknown')
      expect(tel.sensorData.value.currentStatus).toBe('unknown')
      expect(tel.sensorData.value.peopleCount).toBe(0)
      expect(tel.sensorData.value.lastPeopleUpdate).toBeNull()
    })
  })

  describe('exported functions', () => {
    it('should have startPolling function', () => {
      const tel = useAzureTelemetry()
      expect(typeof tel.startPolling).toBe('function')
    })

    it('should have stopPolling function', () => {
      const tel = useAzureTelemetry()
      expect(typeof tel.stopPolling).toBe('function')
    })

    it('should have fetchLatestFromAzure function', () => {
      const tel = useAzureTelemetry()
      expect(typeof tel.fetchLatestFromAzure).toBe('function')
    })

    it('should have savePeopleCount function', () => {
      const tel = useAzureTelemetry()
      expect(typeof tel.savePeopleCount).toBe('function')
    })

    it('should have fetchPeopleCount function', () => {
      const tel = useAzureTelemetry()
      expect(typeof tel.fetchPeopleCount).toBe('function')
    })
  })

  describe('fetchLatestFromAzure (HTTP fetch)', () => {
    it('should update sensorData on successful fetch', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suhu: 28.5,
            kelembaban: 65,
            tegangan: 220,
            arus: 1.5,
            daya: 330,
            status_tegangan: 'normal',
            status_arus: 'normal',
            timestamp: '2026-04-26T10:00:00Z'
          }
        })
      })

      const tel = useAzureTelemetry()
      const result = await tel.fetchLatestFromAzure()

      expect(result).toBe(true)
      expect(tel.sensorData.value.temperature).toBe(28.5)
      expect(tel.sensorData.value.humidity).toBe(65)
      expect(tel.sensorData.value.voltage).toBe(220)
      expect(tel.sensorData.value.current).toBe(1.5)
      expect(tel.sensorData.value.power).toBe(330)
    })

    it('should handle non-ok response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const tel = useAzureTelemetry()
      const result = await tel.fetchLatestFromAzure()

      expect(result).toBe(false)
    })

    it('should handle network errors gracefully', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'))

      const tel = useAzureTelemetry()
      const result = await tel.fetchLatestFromAzure()

      expect(result).toBe(false)
    })

    it('should compute power from voltage and current if not provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tegangan: 220,
            arus: 2
          }
        })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      // Power = 220 * 2 = 440
      expect(tel.sensorData.value.power).toBeCloseTo(440, 0)
    })

    it('should use existing power value if provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tegangan: 220,
            arus: 2,
            daya: 350 // explicit power value, should take precedence
          }
        })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      expect(tel.sensorData.value.power).toBe(350)
    })
  })

  describe('startPolling (Azure HTTP Polling)', () => {
    it('should start polling when startPolling is called', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 25, kelembaban: 60 } })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Should call fetch (telemetry + people count on connect)
      expect(fetchMock).toHaveBeenCalled()
    })

    it('should poll Azure every 5 seconds', async () => {
      vi.useFakeTimers()

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 25 } })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Initial: telemetry (1 call) — people count also called but same mock
      await vi.advanceTimersByTimeAsync(100)
      const afterInit = fetchMock.mock.calls.length

      // After 5 seconds: one poll cycle
      vi.advanceTimersByTime(5000)
      await vi.advanceTimersByTimeAsync(500)

      expect(fetchMock.mock.calls.length).toBeGreaterThan(afterInit)

      tel.stopPolling()
    })

    it('should load cached data from localStorage on connect', async () => {
      localStorageMock.store['sensor_last_data'] = JSON.stringify({
        temperature: 22,
        humidity: 55,
        voltage: 210,
        current: 1.0,
        power: 210
      })

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 25 } })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Cached data should be loaded immediately
      expect(tel.sensorData.value.temperature).toBe(22)
      expect(tel.sensorData.value.humidity).toBe(55)

      tel.stopPolling()
    })

    it('should set isConnected to true after successful fetch', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 25, kelembaban: 60 } })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Allow microtasks to complete (resolves the .then() in startPolling)
      await new Promise(r => setTimeout(r, 10))

      expect(tel.isConnected.value).toBe(true)
      tel.stopPolling()
    })
  })

  describe('stopPolling', () => {
    it('should stop polling when stopPolling is called', async () => {
      vi.useFakeTimers()

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 25 } })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      const callCount = fetchMock.mock.calls.length

      tel.stopPolling()

      // After 10 seconds, should not call again
      vi.advanceTimersByTime(10000)
      await Promise.resolve()
      expect(fetchMock).toHaveBeenCalledTimes(callCount)
    })

    it('should set isConnected to false on stopPolling', () => {
      const tel = useAzureTelemetry()
      tel.startPolling()
      tel.stopPolling()

      expect(tel.isConnected.value).toBe(false)
    })

    it('should not reset sensor data on stopPolling', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { suhu: 30, kelembaban: 70 }
        })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Allow microtasks to complete
      await new Promise(r => setTimeout(r, 10))

      expect(tel.sensorData.value.temperature).toBe(30)

      tel.stopPolling()

      // Data should persist after disconnect
      expect(tel.sensorData.value.temperature).toBe(30)
    })
  })

  describe('people count integration', () => {
    it('should fetch people count on startPolling', async () => {
      let callCount = 0
      fetchMock.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { suhu: 25 } })
          })
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              latest: { count: 5, timestamp: '2026-04-26T10:00:00Z' }
            })
          })
        }
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Wait for async startPolling calls to settle
      await new Promise(r => setTimeout(r, 50))

      // First call is telemetry, second is people
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(tel.sensorData.value.peopleCount).toBe(5)

      tel.stopPolling()
    })

    it('should fetch people count every poll cycle', async () => {
      vi.useFakeTimers()

      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { suhu: 25 },
          latest: { count: 3, timestamp: '2026-04-26T10:00:00Z' }
        })
      })

      const tel = useAzureTelemetry()
      tel.startPolling()

      // Initial: telemetry + people (2 calls)
      await vi.advanceTimersByTimeAsync(200)
      const afterInit = fetchMock.mock.calls.length

      // After 5s: one poll cycle (telemetry + people)
      vi.advanceTimersByTime(5000)
      await vi.advanceTimersByTimeAsync(500)

      // Should have at least 1 more call
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(afterInit + 1)

      tel.stopPolling()
    })

    it('should handle people data from old format (data array)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ count: 4, timestamp: '2026-04-26T09:00:00Z' }]
        })
      })

      const tel = useAzureTelemetry()
      const result = await tel.fetchPeopleCount()

      expect(result).toBe(true)
      expect(tel.sensorData.value.peopleCount).toBe(4)
    })

    it('should handle people count network errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const tel = useAzureTelemetry()
      const result = await tel.fetchPeopleCount()

      expect(result).toBe(false)
    })
  })

  describe('savePeopleCount', () => {
    it('should POST people count to Azure with function key', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const tel = useAzureTelemetry()
      const result = await tel.savePeopleCount(3, 'Ruang Utama')

      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)

      const [url, options] = fetchMock.mock.calls[0]
      expect(url).toMatch(/\/people\/save$/)
      expect(options.method).toBe('POST')
      expect(options.headers['Content-Type']).toBe('application/json')
      expect('x-functions-key' in options.headers).toBe(true)
      expect(JSON.parse(options.body)).toEqual({
        count: 3,
        deviceId: 'WEB_CAMERA_001',
        location: 'Ruang Utama'
      })
    })

    it('should update local state on successful save', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      const tel = useAzureTelemetry()
      await tel.savePeopleCount(7)

      expect(tel.sensorData.value.peopleCount).toBe(7)
    })

    it('should return false when write key not configured', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      const tel = useAzureTelemetry()
      const result = await tel.savePeopleCount(5)

      expect(result).toBe(false)
    })
  })

  describe('localStorage integration', () => {
    it('should save data to localStorage on sensorData change', async () => {
      vi.useFakeTimers()
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { suhu: 30 }
        })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      // Wait for watch to trigger
      await vi.runAllTimersAsync()

      expect(localStorageMock.setItem).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'sensor_last_data',
        expect.any(String)
      )
    })

    it('should handle fetch network errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const tel = useAzureTelemetry()
      const result = await tel.fetchLatestFromAzure()

      expect(result).toBe(false)
      expect(tel.sensorData.value).toBeDefined()
    })
  })

  describe('reactive refs', () => {
    it('should export isConnected as reactive ref', () => {
      const tel = useAzureTelemetry()

      expect(tel.isConnected).toBeDefined()
      expect(tel.isConnected.value).toBeDefined()
    })

    it('should export sensorData as reactive ref', () => {
      const tel = useAzureTelemetry()

      expect(tel.sensorData).toBeDefined()
      expect(tel.sensorData.value).toBeDefined()
    })

    it('should allow updating sensorData', () => {
      const tel = useAzureTelemetry()

      tel.sensorData.value.temperature = 25.5
      tel.sensorData.value.humidity = 60

      expect(tel.sensorData.value.temperature).toBe(25.5)
      expect(tel.sensorData.value.humidity).toBe(60)
    })
  })

  describe('data persistence', () => {
    it('should not reset sensorData on connection error', async () => {
      // First successful fetch
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { suhu: 28 } })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      expect(tel.sensorData.value.temperature).toBe(28)

      // Second fetch fails
      fetchMock.mockRejectedValueOnce(new Error('Network error'))
      await tel.fetchLatestFromAzure()

      // Data should persist from previous state
      expect(tel.sensorData.value.temperature).toBe(28)
    })
  })

  describe('status field mapping', () => {
    it('should map status_tegangan to voltageStatus', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suhu: 25,
            status_tegangan: 'terhubung'
          }
        })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      expect(tel.sensorData.value.voltageStatus).toBe('terhubung')
    })

    it('should map status_arus to currentStatus', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            suhu: 25,
            status_arus: 'tidak_terhubung'
          }
        })
      })

      const tel = useAzureTelemetry()
      await tel.fetchLatestFromAzure()

      expect(tel.sensorData.value.currentStatus).toBe('tidak_terhubung')
    })
  })
})
