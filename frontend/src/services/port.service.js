import api from '../lib/api';

const portService = {
	getPorts: async (params = {}) => {
		const response = await api.get('/ports', { params });
		return response.data;
	},

	getPort: async (id) => {
		const response = await api.get(`/ports/${id}`);
		return response.data;
	},

	createPort: async (data) => {
		const response = await api.post('/ports', data);
		return response.data;
	},

	updatePort: async (id, data) => {
		const response = await api.put(`/ports/${id}`, data);
		return response.data;
	},

	deletePort: async (id) => {
		const response = await api.delete(`/ports/${id}`);
		return response.data;
	},

	toggleStatus: async (id) => {
		const response = await api.patch(`/ports/${id}/toggle`);
		return response.data;
	}
};

export default portService;
