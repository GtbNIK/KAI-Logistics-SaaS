import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const dashboardService = {
  getSummary: async () => {
    const response = await axios.get(`${API_URL}/dashboard/summary`);
    return response.data;
  },

  getMonthlyReport: async () => {
    const response = await axios.get(`${API_URL}/dashboard/monthly-report`);
    return response.data;
  }
};

export default dashboardService;
