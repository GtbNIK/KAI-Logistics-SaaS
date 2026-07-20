import api from '../lib/api';

const cashFlowService = {
    getCashFlow: async ({ startDate, endDate } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate)   params.append('endDate',   endDate);
        const res = await api.get(`/cash-flow?${params}`);
        return res.data;
    }
};

export default cashFlowService;
