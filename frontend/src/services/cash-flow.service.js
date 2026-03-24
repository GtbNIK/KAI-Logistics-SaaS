import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const cashFlowService = {
    getCashFlow: async ({ startDate, endDate } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate)   params.append('endDate',   endDate);
        const res = await axios.get(`${API_URL}/cash-flow?${params}`);
        return res.data;
    }
};

export default cashFlowService;
