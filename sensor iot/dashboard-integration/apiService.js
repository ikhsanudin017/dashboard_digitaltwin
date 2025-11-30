// ============================================
// 📡 API Service for Dashboard Integration
// ============================================
// File: src/services/apiService.js

const API_BASE_URL = 'https://func-energymonitor-c9001a7e.azurewebsites.net/api';

export const apiService = {
  /**
   * Get latest sensor data
   * @returns {Promise<Object>} Latest sensor reading
   */
  async getLatest() {
    try {
      const response = await fetch(`${API_BASE_URL}/telemetry/latest`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      }
      throw new Error('Failed to get latest data');
    } catch (error) {
      console.error('Error fetching latest data:', error);
      throw error;
    }
  },

  /**
   * Get historical sensor data
   * @param {number} hours - Number of hours to fetch (default: 24)
   * @param {number} limit - Max number of records (default: 500)
   * @returns {Promise<Array>} Array of sensor readings
   */
  async getHistory(hours = 24, limit = 500) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/telemetry/history?hours=${hours}&limit=${limit}`
      );
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      }
      throw new Error('Failed to get history');
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  },

  /**
   * Get statistical data
   * @param {number} hours - Time range in hours (default: 24)
   * @returns {Promise<Object>} Statistics object
   */
  async getStats(hours = 24) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/telemetry/stats?hours=${hours}`
      );
      const result = await response.json();
      
      if (result.success) {
        return {
          count: result.count,
          averages: result.averages,
          ranges: result.ranges
        };
      }
      throw new Error('Failed to get stats');
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
};

export default apiService;
