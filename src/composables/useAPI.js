import { ref } from 'vue'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export function useAPI() {
  const temperatureData = ref({
    labels: [],
    values: []
  })
  
  const electricityData = ref({
    labels: [],
    values: []
  })
  
  const peopleData = ref({
    labels: [],
    values: []
  })

  const fetchHistoricalData = async () => {
    try {
      // Fetch data suhu 24 jam
      try {
        const tempResponse = await axios.get(`${API_BASE_URL}/data/suhu/24jam`)
        const tempData = Array.isArray(tempResponse.data) 
          ? tempResponse.data 
          : (tempResponse.data?.data || [])
        
        if (Array.isArray(tempData) && tempData.length > 0) {
          temperatureData.value = {
            labels: tempData.map(d => {
              const timestamp = d.timestamp || d.time || d.date
              return timestamp ? new Date(timestamp).toLocaleTimeString('id-ID') : ''
            }).filter(Boolean),
            values: tempData.map(d => d.temperature || d.temp || d.suhu || 0)
          }
        } else {
          throw new Error('No temperature data available')
        }
      } catch (tempError) {
        // Hanya log jika bukan network error (API belum tersedia adalah normal)
        if (!tempError.message.includes('Network Error') && !tempError.message.includes('No temperature')) {
          console.warn('⚠️ Failed to fetch temperature data:', tempError.message)
        }
        // Will use dummy data
      }

      // Fetch data listrik 7 hari
      try {
        const elecResponse = await axios.get(`${API_BASE_URL}/data/listrik/7hari`)
        const elecData = Array.isArray(elecResponse.data) 
          ? elecResponse.data 
          : (elecResponse.data?.data || [])
        
        if (Array.isArray(elecData) && elecData.length > 0) {
          electricityData.value = {
            labels: elecData.map(d => {
              const timestamp = d.timestamp || d.time || d.date
              return timestamp ? new Date(timestamp).toLocaleDateString('id-ID') : ''
            }).filter(Boolean),
            values: elecData.map(d => d.power || d.daya || 0)
          }
        } else {
          throw new Error('No electricity data available')
        }
      } catch (elecError) {
        // Hanya log jika bukan network error (API belum tersedia adalah normal)
        if (!elecError.message.includes('Network Error') && !elecError.message.includes('No electricity')) {
          console.warn('⚠️ Failed to fetch electricity data:', elecError.message)
        }
        // Will use dummy data
      }

      // Fetch data orang real-time
      try {
        const peopleResponse = await axios.get(`${API_BASE_URL}/data/orang/realtime`)
        const peopleDataArray = Array.isArray(peopleResponse.data) 
          ? peopleResponse.data 
          : (peopleResponse.data?.data || [])
        
        if (Array.isArray(peopleDataArray) && peopleDataArray.length > 0) {
          peopleData.value = {
            labels: peopleDataArray.map(d => {
              const timestamp = d.timestamp || d.time || d.date
              return timestamp ? new Date(timestamp).toLocaleTimeString('id-ID') : ''
            }).filter(Boolean),
            values: peopleDataArray.map(d => d.count || d.people || d.orang || 0)
          }
        } else {
          throw new Error('No people data available')
        }
      } catch (peopleError) {
        // Hanya log jika bukan network error (API belum tersedia adalah normal)
        if (!peopleError.message.includes('Network Error') && !peopleError.message.includes('No people')) {
          console.warn('⚠️ Failed to fetch people data:', peopleError.message)
        }
        // Will use dummy data
      }
      
      // Jika semua fetch gagal, gunakan dummy data (normal jika API belum tersedia)
      if (temperatureData.value.labels.length === 0 && 
          electricityData.value.labels.length === 0 && 
          peopleData.value.labels.length === 0) {
        console.log('📊 Using demo data for charts (API backend not available)')
        generateDummyData()
      } else {
        console.log('✅ Historical data loaded successfully')
      }
    } catch (error) {
      console.error('❌ Error fetching historical data:', error)
      // Generate dummy data untuk demo jika API belum tersedia
      generateDummyData()
    }
  }

  const generateDummyData = () => {
    // Dummy data suhu (24 jam terakhir, setiap jam)
    const now = new Date()
    temperatureData.value = {
      labels: Array.from({ length: 24 }, (_, i) => {
        const date = new Date(now)
        date.setHours(date.getHours() - (23 - i))
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }),
      values: Array.from({ length: 24 }, () => 20 + Math.random() * 10)
    }

    // Dummy data listrik (7 hari terakhir)
    electricityData.value = {
      labels: Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (6 - i))
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      }),
      values: Array.from({ length: 7 }, () => 1000 + Math.random() * 500)
    }

    // Dummy data orang (10 data terakhir)
    peopleData.value = {
      labels: Array.from({ length: 10 }, (_, i) => {
        const date = new Date(now)
        date.setMinutes(date.getMinutes() - (9 - i) * 5)
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }),
      values: Array.from({ length: 10 }, () => Math.floor(Math.random() * 20))
    }
  }

  return {
    temperatureData,
    electricityData,
    peopleData,
    fetchHistoricalData
  }
}





