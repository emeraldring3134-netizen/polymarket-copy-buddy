import React, { useEffect, useState } from 'react';
import { tradersApi, copyApi } from '../services/api';

function Traders() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('profitLoss');

  useEffect(() => {
    loadTraders();
  }, [sortBy, search]);

  const loadTraders = async () => {
    try {
      setLoading(true);
      let data;
      
      if (search) {
        data = await tradersApi.searchTraders(search, 50);
      } else {
        data = await tradersApi.getTopTraders({ limit: 50, sortBy });
      }
      
      setTraders(data.traders);
    } catch (error) {
      console.error('Error loading traders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (traderId) => {
    try {
      // In a real app, get user ID from auth context
      const followerId = localStorage.getItem('userId'); // Placeholder
      
      if (!followerId) {
        alert('请先登录');
        return;
      }

      const copyRatio = prompt('请输入跟单比例 (0.1 - 2.0):', '0.5');
      if (!copyRatio) return;

      await copyApi.createConfig({
        followerId,
        traderId,
        copyRatio: parseFloat(copyRatio),
        minTradeAmount: 1,
        maxTradeAmount: 1000,
        maxDailyTrades: 10,
        maxDailyAmount: 1000,
      });

      alert('跟单成功!');
      loadTraders();
    } catch (error) {
      alert('跟单失败: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px' }}>交易员</h2>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <input
            placeholder="搜索交易员..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="profitLoss">按盈亏排序</option>
            <option value="winRate">按胜率排序</option>
            <option value="totalTrades">按交易数排序</option>
            <option value="totalVolume">按成交量排序</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : traders.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {traders.map((trader) => (
            <div key={trader._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '8px' }}>{trader.username}</h3>
                  <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
                    {trader.walletAddress}
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="stat-card" style={{ minWidth: '120px' }}>
                      <div className="stat-label">交易数</div>
                      <div className="stat-value">{trader.totalTrades}</div>
                    </div>
                    <div className="stat-card" style={{ minWidth: '120px' }}>
                      <div className="stat-label">胜率</div>
                      <div className="stat-value">{trader.winRate.toFixed(1)}%</div>
                    </div>
                    <div className="stat-card" style={{ minWidth: '120px' }}>
                      <div className="stat-label">盈亏</div>
                      <div
                        className="stat-value"
                        style={{ color: trader.profitLoss >= 0 ? '#10b981' : '#ef4444' }}
                      >
                        {trader.profitLoss >= 0 ? '+' : ''}{trader.profitLoss.toFixed(2)}
                      </div>
                    </div>
                    <div className="stat-card" style={{ minWidth: '120px' }}>
                      <div className="stat-label">成交量</div>
                      <div className="stat-value">{trader.totalVolume.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleFollow(trader._id)}
                >
                  跟单
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            暂无交易员数据
          </p>
        </div>
      )}
    </div>
  );
}

export default Traders;
