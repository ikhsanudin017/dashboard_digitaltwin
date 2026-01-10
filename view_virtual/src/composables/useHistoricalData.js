import { ref } from 'vue'
import axios from 'axios'

const STORAGE_KEY = 'digitaltwin_historical_data'
const MAX_DATA_POINTS = 10000
const AZURE_FUNCTION_URL = import.meta.env.VITE_AZURE_FUNCTION_URL || ''

export function useHistoricalData() {
  const historicalData = ref([])
  const isLoading = ref(false)
  
  const loadHistoricalData = async () => {
    isLoading.value = true
    
    // PRIORITAS 1: Coba ambil dari Azure Storage terlebih dahulu
    if (AZURE_FUNCTION_URL) {
      try {
        console.log('🔵 Loading data from Azure Storage...')
        const response = await axios.get(`${AZURE_FUNCTION_URL}/telemetry/history?hours=720&limit=5000`, {
          timeout: 15000
        })
        
        if (response.data.success && response.data.data?.length > 0) {
          const azureData = response.data.data.map(item => ({
            timestamp: item.timestamp,
            temperature: item.suhu || null,
            humidity: item.kelembaban || null,
            voltage: item.tegangan || null,
            current: item.arus || null,
            power: item.daya || null,
            peopleCount: null // Will be loaded separately if available
          }))
          
          historicalData.value = azureData
          console.log('✅ Azure Storage data loaded:', historicalData.value.length, 'records')
          
          // Simpan ke localStorage sebagai cache
          saveHistoricalData()
          isLoading.value = false
          return
        }
      } catch (azureError) {
        console.warn('⚠️ Azure Storage error:', azureError.message)
      }
    }
    
    // PRIORITAS 2: Fallback ke localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        historicalData.value = JSON.parse(stored)
        console.log('📂 Historical data loaded from cache:', historicalData.value.length, 'records')
      } else {
        console.log('ℹ️ No historical data available')
        historicalData.value = []
      }
    } catch (error) {
      console.error('Error loading historical data:', error)
      historicalData.value = []
    }
    
    isLoading.value = false
  }
  
  const saveHistoricalData = () => {
    try {
      if (historicalData.value.length > MAX_DATA_POINTS) {
        historicalData.value = historicalData.value.slice(-MAX_DATA_POINTS)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historicalData.value))
    } catch (error) {
      console.error('Error saving historical data:', error)
    }
  }
  
  const addDataPoint = (sensorData) => {
    const dataPoint = {
      timestamp: new Date().toISOString(),
      temperature: sensorData.temperature || null,
      humidity: sensorData.humidity || null,
      voltage: sensorData.voltage || null,
      current: sensorData.current || null,
      power: sensorData.power || null,
      peopleCount: sensorData.peopleCount || null
    }
    
    historicalData.value.push(dataPoint)
    saveHistoricalData()
  }
  
  const getDataByDateRange = (startDate, endDate) => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    
    return historicalData.value.filter(item => {
      const timestamp = new Date(item.timestamp).getTime()
      return timestamp >= start && timestamp <= end
    })
  }
  
  const getAggregatedData = (startDate, endDate, interval = 'hourly') => {
    const data = getDataByDateRange(startDate, endDate)
    const aggregated = {}
    
    data.forEach(item => {
      const timestamp = new Date(item.timestamp)
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
    
    const result = Object.keys(aggregated).map(key => ({
      timestamp: key,
      temperature: average(aggregated[key].temperature),
      humidity: average(aggregated[key].humidity),
      voltage: average(aggregated[key].voltage),
      current: average(aggregated[key].current),
      power: average(aggregated[key].power),
      peopleCount: Math.round(average(aggregated[key].peopleCount))
    }))
    
    return result.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  }
  
  const average = (arr) => {
    if (arr.length === 0) return null
    return arr.reduce((sum, val) => sum + val, 0) / arr.length
  }
  
  const exportToCSV = (startDate, endDate) => {
    const data = getDataByDateRange(startDate, endDate)
    
    if (data.length === 0) {
      alert('Tidak ada data untuk di-export')
      return
    }
    
    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Voltage (V)', 'Current (A)', 'Power (W)', 'People Count']
    const rows = data.map(item => [
      new Date(item.timestamp).toLocaleString('id-ID'),
      item.temperature?.toFixed(2) || '',
      item.humidity?.toFixed(2) || '',
      item.voltage?.toFixed(2) || '',
      item.current?.toFixed(2) || '',
      item.power?.toFixed(2) || '',
      item.peopleCount || ''
    ])
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `sensor-data-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('✅ Data exported:', data.length, 'records')
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
    
    // Calculate total energy (Wh)
    const powerData = data.filter(d => d.power !== null && d.power >= 0)
    
    // Sort by timestamp to ensure correct order
    powerData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    
    if (powerData.length > 1) {
      let totalEnergy = 0
      for (let i = 1; i < powerData.length; i++) {
        const timeDiff = (new Date(powerData[i].timestamp) - new Date(powerData[i - 1].timestamp)) / 3600000
        
        // Skip if time difference is negative or too large (>24 hours)
        if (timeDiff <= 0 || timeDiff > 24) continue
        
        const avgPower = (powerData[i].power + powerData[i - 1].power) / 2
        totalEnergy += avgPower * timeDiff
      }
      stats.totalEnergy = Math.max(0, totalEnergy) // Ensure non-negative
    } else {
      stats.totalEnergy = 0
    }
    
    return stats
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
  
  return {
    historicalData,
    isLoading,
    loadHistoricalData,
    addDataPoint,
    getDataByDateRange,
    getAggregatedData,
    exportToCSV,
    getStatistics
  }
}
