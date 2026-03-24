import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const dashboardService = {
	getSummary: async ({ startDate, endDate, chartRange, donutRange } = {}) => {
		const params = {};
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;
		if (chartRange) params.chartRange = chartRange;
		if (donutRange) params.donutRange = donutRange;

		const response = await axios.get(`${API_URL}/dashboard/summary`, { params });
		return response.data;
	},

	getMonthlyReport: async ({ startDate, endDate } = {}) => {
		const params = {};
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;

		const response = await axios.get(`${API_URL}/dashboard/monthly-report`, { params });
		return response.data;
	}
};

export default dashboardService;
