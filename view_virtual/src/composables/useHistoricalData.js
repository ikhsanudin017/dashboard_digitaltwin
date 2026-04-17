import { ref } from 'vue'
import axios from 'axios'
import { AZURE_FUNCTION_URL } from '../lib/appConfig'

const STORAGE_KEY = 'digitaltwin_historical_data'
const MAX_DATA_POINTS = 10000

// Shared store so DashboardHome and HistoricalAnalytics see the same history.
const historicalData = ref([])
const isLoading = ref(false)

const toTimestamp = (value) => {
  if (!value) return 0

  if (value instanceof Date) return value.getTime()

  if (typeof value === 'number') return value

  const direct = new Date(value).getTime()
  if (!Number.isNaN(direct)) return direct

  if (typeof value === 'string') {
    const normalized = value
      .replace(' WIB', '+07:00')
      .replace(' WITA', '+08:00')
      .replace(' WIT', '+09:00')
      .replace(' ', 'T')
    const parsed = new Date(normalized).getTime()
    if (!Number.isNaN(parsed)) return parsed
  }

  return 0
}

const formatDateInput = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const sortByTimestampAsc = data => {
  return [...data].sort((a, b) => toTimestamp(a.timestamp) - toTimestamp(b.timestamp))
}

const normalizeDataPoint = sensorData => ({
  timestamp: sensorData.timestamp || new Date().toISOString(),
  temperature: sensorData.temperature ?? sensorData.suhu ?? null,
  humidity: sensorData.humidity ?? sensorData.kelembaban ?? null,
  voltage: sensorData.voltage ?? sensorData.tegangan ?? null,
  current: sensorData.current ?? sensorData.arus ?? null,
  power: sensorData.power ?? sensorData.daya ?? null,
  peopleCount: sensorData.peopleCount ?? sensorData.jumlahOrang ?? 0
})

const saveHistoricalData = () => {
  try {
    if (historicalData.value.length > MAX_DATA_POINTS) {
      historicalData.value = historicalData.value.slice(-MAX_DATA_POINTS)
    }

    historicalData.value = sortByTimestampAsc(historicalData.value)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historicalData.value))
  } catch (error) {
    console.error('Error saving historical data:', error)
  }
}

const loadCachedHistoricalData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading cached historical data:', error)
    return []
  }
}

const mergeAzureWithPendingLocal = (azureData, cachedData) => {
  if (!azureData.length) return sortByTimestampAsc(cachedData)

  const latestAzureTimestamp = Math.max(...azureData.map(item => toTimestamp(item.timestamp)))
  const pendingLocalData = cachedData.filter(item => toTimestamp(item.timestamp) > latestAzureTimestamp)

  return sortByTimestampAsc([...azureData, ...pendingLocalData])
}

export function useHistoricalData() {
  const loadHistoricalData = async ({ background = false } = {}) => {
    if (!background) {
      isLoading.value = true
    }

    const cachedData = loadCachedHistoricalData()

    if (AZURE_FUNCTION_URL) {
      try {
        console.log('🔵 Loading data from Azure Storage...')
        const response = await axios.get(`${AZURE_FUNCTION_URL}/telemetry/history?hours=720&limit=5000`, {
          timeout: 15000
        })

        if (response.data.success && response.data.data?.length > 0) {
          const azureData = response.data.data.map(item => normalizeDataPoint({
            timestamp: item.timestamp,
            suhu: item.suhu,
            kelembaban: item.kelembaban,
            tegangan: item.tegangan,
            arus: item.arus,
            daya: item.daya,
            jumlahOrang: item.jumlahOrang
          }))

          historicalData.value = mergeAzureWithPendingLocal(azureData, cachedData)
          saveHistoricalData()

          console.log('✅ Azure Storage data loaded:', historicalData.value.length, 'records')

          if (!background) {
            isLoading.value = false
          }

          return
        }
      } catch (azureError) {
        console.warn('⚠️ Azure Storage error:', azureError.message)
      }
    }

    historicalData.value = sortByTimestampAsc(cachedData)

    if (historicalData.value.length > 0) {
      console.log('📂 Historical data loaded from cache:', historicalData.value.length, 'records')
    } else {
      console.log('ℹ️ No historical data available')
    }

    if (!background) {
      isLoading.value = false
    }
  }

  const addDataPoint = (sensorData) => {
    const dataPoint = normalizeDataPoint(sensorData)
    historicalData.value = sortByTimestampAsc([...historicalData.value, dataPoint])
    saveHistoricalData()
  }

  const getDataByDateRange = (startDate, endDate) => {
    const start = toTimestamp(startDate)
    const end = toTimestamp(endDate)

    return historicalData.value.filter(item => {
      const timestamp = toTimestamp(item.timestamp)
      return timestamp >= start && timestamp <= end
    })
  }

  const average = (arr) => {
    if (arr.length === 0) return null
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }

  const getAggregatedData = (startDate, endDate, interval = 'hourly') => {
    const data = getDataByDateRange(startDate, endDate)
    const aggregated = {}

    data.forEach(item => {
      const rawTime = toTimestamp(item.timestamp)
      if (!rawTime) return

      const timestamp = new Date(rawTime)
      let key

      if (interval === 'hourly') {
        key = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`
      } else if (interval === 'daily') {
        key = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`
      } else if (interval === 'weekly') {
        const weekStart = new Date(timestamp)
        weekStart.setDate(timestamp.getDate() - timestamp.getDay())
        key = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          temperature: [], humidity: [], voltage: [],
          current: [], power: [], peopleCount: []
        }
      }

      if (item.temperature !== null) aggregated[key].temperature.push(item.temperature)
      if (item.humidity !== null) aggregated[key].humidity.push(item.humidity)
      if (item.voltage !== null) aggregated[key].voltage.push(item.voltage)
      if (item.current !== null) aggregated[key].current.push(item.current)
      if (item.power !== null) aggregated[key].power.push(item.power)
      if (item.peopleCount !== null) aggregated[key].peopleCount.push(item.peopleCount)
    })

    return Object.keys(aggregated).map(key => ({
      timestamp: key,
      temperature: average(aggregated[key].temperature),
      humidity: average(aggregated[key].humidity),
      voltage: average(aggregated[key].voltage),
      current: average(aggregated[key].current),
      power: average(aggregated[key].power),
      peopleCount: Math.round(average(aggregated[key].peopleCount))
    })).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }

  const getAvailableDateRange = () => {
    const timestamps = historicalData.value
      .map(item => toTimestamp(item.timestamp))
      .filter(value => value > 0)

    if (timestamps.length === 0) return null

    return {
      startDate: formatDateInput(new Date(Math.min(...timestamps))),
      endDate: formatDateInput(new Date(Math.max(...timestamps)))
    }
  }

  const exportToCSV = (startDate, endDate) => {
    const data = getDataByDateRange(startDate, endDate)

    if (data.length === 0) {
      alert('Tidak ada data untuk di-export')
      return
    }

    const sortedData = [...data].reverse()
    const headers = ['Timestamp', 'Temperature (C)', 'Humidity (%)', 'Voltage (V)', 'Current (A)', 'Power (W)', 'People Count']

    const rows = sortedData.map(item => {
      const ts = new Date(toTimestamp(item.timestamp))
      const timestampStr = `${ts.toLocaleDateString('id-ID')} ${ts.toLocaleTimeString('id-ID')}`

      return [
        timestampStr,
        item.temperature?.toFixed(2) || '',
        item.humidity?.toFixed(2) || '',
        item.voltage?.toFixed(2) || '',
        item.current?.toFixed(2) || '',
        item.power?.toFixed(2) || '',
        item.peopleCount ?? ''
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `sensor-data-${formatDateInput(new Date())}.csv`)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    console.log('✅ Data exported:', sortedData.length, 'records (newest first)')
  }

  const calculateStats = (values) => {
    if (values.length === 0) return { min: null, max: null, avg: null }
    const sorted = [...values].sort((a, b) => a - b)
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length
    }
  }

  const getStatistics = (startDate, endDate) => {
    const data = getDataByDateRange(startDate, endDate)

    if (data.length === 0) return null

    const stats = {
      temperature: calculateStats(data.map(d => d.temperature).filter(v => v !== null)),
      humidity: calculateStats(data.map(d => d.humidity).filter(v => v !== null)),
      voltage: calculateStats(data.map(d => d.voltage).filter(v => v !== null)),
      current: calculateStats(data.map(d => d.current).filter(v => v !== null)),
      power: calculateStats(data.map(d => d.power).filter(v => v !== null)),
      peopleCount: calculateStats(data.map(d => d.peopleCount).filter(v => v !== null)),
      totalRecords: data.length
    }

    const powerData = data
      .filter(d => d.power !== null && d.power >= 0)
      .sort((a, b) => toTimestamp(a.timestamp) - toTimestamp(b.timestamp))

    if (powerData.length > 1) {
      let totalEnergy = 0

      for (let i = 1; i < powerData.length; i++) {
        const timeDiff = (toTimestamp(powerData[i].timestamp) - toTimestamp(powerData[i - 1].timestamp)) / 3600000

        if (timeDiff <= 0 || timeDiff > 24) continue

        const avgPower = (powerData[i].power + powerData[i - 1].power) / 2
        totalEnergy += avgPower * timeDiff
      }

      stats.totalEnergy = Math.max(0, totalEnergy)
    } else {
      stats.totalEnergy = 0
    }

    return stats
  }

  return {
    historicalData,
    isLoading,
    loadHistoricalData,
    addDataPoint,
    getDataByDateRange,
    getAggregatedData,
    getAvailableDateRange,
    exportToCSV,
    getStatistics
  }
}
