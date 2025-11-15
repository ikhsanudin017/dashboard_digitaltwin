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
      const tempResponse = await axios.get(`${API_BASE_URL}/data/suhu/24jam`)
      if (tempResponse.data) {
        temperatureData.value = {
          labels: tempResponse.data.map(d => new Date(d.timestamp).toLocaleTimeString('id-ID')),
          values: tempResponse.data.map(d => d.temperature)
        }
      }

      // Fetch data listrik 7 hari
      const elecResponse = await axios.get(`${API_BASE_URL}/data/listrik/7hari`)
      if (elecResponse.data) {
        electricityData.value = {
          labels: elecResponse.data.map(d => new Date(d.timestamp).toLocaleDateString('id-ID')),
          values: elecResponse.data.map(d => d.power)
        }
      }

      // Fetch data orang real-time
      const peopleResponse = await axios.get(`${API_BASE_URL}/data/orang/realtime`)
      if (peopleResponse.data) {
        peopleData.value = {
          labels: peopleResponse.data.map(d => new Date(d.timestamp).toLocaleTimeString('id-ID')),
          values: peopleResponse.data.map(d => d.count)
        }
      }
    } catch (error) {
      console.error('Error fetching historical data:', error)
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


