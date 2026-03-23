import axios from 'axios';
import { logger } from '../utils/logger.js';

const POLYMARKET_API_BASE = process.env.POLYMARKET_API || 'https://api.polymarket.com';

class PolymarketAPI {
  constructor() {
    this.baseURL = POLYMARKET_API_BASE;
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        logger.error('API Response Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async getMarkets(params = {}) {
    try {
      const {
        limit = 100,
        offset = 0,
        order = 'volume_desc',
        closed = false,
        tag_slug,
      } = params;

      const response = await this.client.get('/markets', {
        params: {
          limit,
          offset,
          order,
          closed,
          ...(tag_slug && { tag_slug }),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching markets:', error.message);
      throw error;
    }
  }

  async getMarketById(marketId) {
    try {
      const response = await this.client.get(`/markets/${marketId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching market ${marketId}:`, error.message);
      throw error;
    }
  }

  async getMarketOrders(marketId, orderSide = 'buy', limit = 50) {
    try {
      const response = await this.client.get(`/markets/${marketId}/orders`, {
        params: {
          order_side: orderSide,
          limit,
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching orders for market ${marketId}:`, error.message);
      throw error;
    }
  }

  async getMarketOrderBook(marketId, outcomeId) {
    try {
      const response = await this.client.get(`/markets/${marketId}/orderbook`, {
        params: { outcome_id: outcomeId },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching orderbook for market ${marketId}:`, error.message);
      throw error;
    }
  }

  async searchMarkets(query, limit = 20) {
    try {
      const response = await this.client.get('/markets/search', {
        params: { q: query, limit },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error searching markets for "${query}":`, error.message);
      throw error;
    }
  }

  async getTags() {
    try {
      const response = await this.client.get('/tags');
      return response.data;
    } catch (error) {
      logger.error('Error fetching tags:', error.message);
      throw error;
    }
  }

  async getMarketsByTag(tagSlug, limit = 50) {
    try {
      const response = await this.client.get('/markets', {
        params: { tag_slug: tagSlug, limit },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching markets for tag ${tagSlug}:`, error.message);
      throw error;
    }
  }

  async getActiveMarkets(limit = 100) {
    return this.getMarkets({ limit, closed: false });
  }

  async getMarketsByCategory(category, limit = 50) {
    try {
      const response = await this.client.get('/markets', {
        params: {
          limit,
          closed: false,
          tag_slug: category,
        },
      });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching markets for category ${category}:`, error.message);
      throw error;
    }
  }
}

export default new PolymarketAPI();
