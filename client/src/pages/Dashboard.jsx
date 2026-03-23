import React, { useEffect, useState } from 'react';
import { marketsApi, tradersApi, copyApi } from '../services/api';

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [activeCopyConfigs, setActiveCopyConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const [tradersRes, marketsRes, configsRes] = await Promise.all([
        tradersApi.getTopTraders({ limit: 10 }),
        marketsApi.getMarkets({ limit: 5, status: 'open' }),
        user ? copyApi.getUserConfigs(user.id) : Promise.resolve({ configs: [] }),
      ]);

      setStats({
        totalTraders: tradersRes.traders.length,
        activeMarkets: marketsRes.markets.length,
        activeConfigs: configsRes.configs.length,
      });

      setRecentTrades(marketsRes.markets.slice(0, 5));
      setActiveCopyConfigs(configsRes.configs);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ marginBottom: '16px' }}>欢迎, {user.username}!</h2>
        <p style={{ color: '#666' }}>
          钱包: {user.walletAddress}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-label">总交易数</div>
          <div className="stat-value">{user.totalTrades}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">胜率</div>
          <div className="stat-value">{user.winRate.toFixed(1)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">盈亏</div>
          <div className="stat-value" style={{ color: user.profitLoss >= 0 ? '#10b981' : '#ef4444' }}>
            {user.profitLoss >= 0 ? '+' : ''}{user.profitLoss.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">跟单数量</div>
          <div className="stat-value">{stats?.activeConfigs || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>热门市场</h3>
          {recentTrades.length > 0 ? (
            recentTrades.map((market) => (
              <div
                key={market._id}
                style={{
                  padding: '16px',
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer'
                }}
              >
                <h4 style={{ marginBottom: '8px' }}>{market.title}</h4>
                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666' }}>
                  <span>成交量: {market.totalVolume.toFixed(2)}</span>
                  <span className="badge badge-success">{market.category}</span>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              暂无市场数据
            </p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '16px' }}>我的跟单</h3>
          {activeCopyConfigs.length > 0 ? (
            activeCopyConfigs.map((config) => (
              <div key={config._id} style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
                <h4 style={{ marginBottom: '8px' }}>{config.trader.username}</h4>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <div>跟单比例: {config.copyRatio}x</div>
                  <div>已跟单: {config.stats.totalCopiedTrades}</div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              暂无跟单配置
              <br />
              <a href="/traders" style={{ color: '#667eea', textDecoration: 'none' }}>
                去发现交易员
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
