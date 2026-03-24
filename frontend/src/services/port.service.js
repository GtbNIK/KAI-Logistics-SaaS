import axios from 'axios';

const API_URL = '/api/ports';

const portService = {
	getPorts: async (params = {}) => {
		const response = await axios.get(API_URL, { params });
		return response.data;
	},

	getPort: async (id) => {
		const response = await axios.get(`${API_URL}/${id}`);
		return response.data;
	},

	createPort: async (data) => {
		const response = await axios.post(API_URL, data);
		return response.data;
	},

	updatePort: async (id, data) => {
		const response = await axios.put(`${API_URL}/${id}`, data);
		return response.data;
	},

	deletePort: async (id) => {
		const response = await axios.delete(`${API_URL}/${id}`);
		return response.data;
	},

	toggleStatus: async (id) => {
		const response = await axios.patch(`${API_URL}/${id}/toggle`);
		return response.data;
	}
};

export default portService;
