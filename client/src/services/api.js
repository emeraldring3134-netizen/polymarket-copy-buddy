import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  walletLogin: async (walletAddress, username, email) => {
    const response = await api.post('/auth/wallet', { walletAddress, username, email });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },
};

export const marketsApi = {
  getMarkets: async (params = {}) => {
    const response = await api.get('/markets', { params });
    return response.data;
  },

  getMarket: async (id) => {
    const response = await api.get(`/markets/${id}`);
    return response.data;
  },

  syncMarkets: async (limit = 100) => {
    const response = await api.post('/markets/sync', { limit });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/markets/categories/list');
    return response.data;
  },
};

export const tradersApi = {
  getTopTraders: async (params = {}) => {
    const response = await api.get('/traders/top', { params });
    return response.data;
  },

  getTrader: async (id) => {
    const response = await api.get(`/traders/${id}`);
    return response.data;
  },

  searchTraders: async (query, limit = 20) => {
    const response = await api.get(`/traders/search/${query}`, { params: { limit } });
    return response.data;
  },

  updateSettings: async (id, settings) => {
    const response = await api.put(`/traders/${id}/settings`, settings);
    return response.data;
  },
};

export const copyApi = {
  createConfig: async (config) => {
    const response = await api.post('/copy', config);
    return response.data;
  },

  getUserConfigs: async (userId) => {
    const response = await api.get(`/copy/user/${userId}`);
    return response.data;
  },

  getConfig: async (id) => {
    const response = await api.get(`/copy/${id}`);
    return response.data;
  },

  updateConfig: async (id, updates) => {
    const response = await api.put(`/copy/${id}`, updates);
    return response.data;
  },

  deleteConfig: async (id) => {
    const response = await api.delete(`/copy/${id}`);
    return response.data;
  },

  getStats: async (id) => {
    const response = await api.get(`/copy/${id}/stats`);
    return response.data;
  },
};

export const tradesApi = {
  createTrade: async (trade) => {
    const response = await api.post('/trades', trade);
    return response.data;
  },

  getTrades: async (params = {}) => {
    const response = await api.get('/trades', { params });
    return response.data;
  },

  getTrade: async (id) => {
    const response = await api.get(`/trades/${id}`);
    return response.data;
  },

  updateTradeStatus: async (id, status, profit, transactionHash) => {
    const response = await api.put(`/trades/${id}/status`, { status, profit, transactionHash });
    return response.data;
  },

  getStats: async (traderId, period = '7d') => {
    const response = await api.get('/trades/stats/summary', { params: { traderId, period } });
    return response.data;
  },
};

export const encryptionApi = {
  setup: async (privateKey, password) => {
    const response = await api.post('/encryption/setup', { privateKey, password });
    return response.data;
  },

  decrypt: async (password) => {
    const response = await api.post('/encryption/decrypt', { password });
    return response.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/encryption/change-password', { oldPassword, newPassword });
    return response.data;
  },

  lock: async () => {
    const response = await api.post('/encryption/lock');
    return response.data;
  },

  getStatus: async () => {
    const response = await api.get('/encryption/status');
    return response.data;
  },

  testPassword: async (password) => {
    const response = await api.post('/encryption/test-password', { password });
    return response.data;
  },
};

export const walletsApi = {
  getWallets: async () => {
    const response = await api.get('/wallets');
    return response.data;
  },

  addWallet: async (address, label, minHoldings) => {
    const response = await api.post('/wallets', { address, label, minHoldings });
    return response.data;
  },

  removeWallet: async (address) => {
    const response = await api.delete(`/wallets/${address}`);
    return response.data;
  },

  setDefaultWallet: async (address) => {
    const response = await api.put(`/wallets/${address}/default`);
    return response.data;
  },

  updateWallet: async (address, label, minHoldings) => {
    const response = await api.put(`/wallets/${address}`, { label, minHoldings });
    return response.data;
  },

  getWalletBalance: async (address) => {
    const response = await api.get(`/wallets/${address}/balance`);
    return response.data;
  },
};

export const dryRunApi = {
  startDryRun: async (configId) => {
    const response = await api.post('/dryrun/start', { configId });
    return response.data;
  },

  simulateTrade: async (configId, tradeData) => {
    const response = await api.post('/dryrun/simulate', { configId, tradeData });
    return response.data;
  },

  getResults: async (configId) => {
    const response = await api.get(`/dryrun/results/${configId}`);
    return response.data;
  },

  resetStats: async (configId) => {
    const response = await api.post(`/dryrun/reset/${configId}`);
    return response.data;
  },

  compareDryRuns: async (configIds) => {
    const response = await api.post('/dryrun/compare', { configIds });
    return response.data;
  },
};

export default api;
