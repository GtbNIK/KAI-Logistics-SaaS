import api from '../lib/api';

const dashboardService = {
	getSummary: async ({ startDate, endDate, chartRange, donutRange } = {}) => {
		const params = {};
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;
		if (chartRange) params.chartRange = chartRange;
		if (donutRange) params.donutRange = donutRange;

		const response = await api.get('/dashboard/summary', { params });
		return response.data;
	},

	getMonthlyReport: async ({ startDate, endDate } = {}) => {
		const params = {};
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;

		const response = await api.get('/dashboard/monthly-report', { params });
		return response.data;
	}
};

export default dashboardService;
