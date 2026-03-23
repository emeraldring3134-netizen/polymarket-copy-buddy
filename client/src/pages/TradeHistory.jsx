import React, { useEffect, useState } from 'react';
import { tradesApi } from '../services/api';

function TradeHistory({ user }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', page: 1 });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadTrades();
    loadStats();
  }, [filter, user]);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const data = await tradesApi.getTrades({
        traderId: user.id,
        status: filter.status,
        page: filter.page,
        limit: 20,
      });
      setTrades(data.trades);
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await tradesApi.getStats(user.id, '30d');
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      open: 'badge-warning',
      won: 'badge-success',
      lost: 'badge-danger',
      cancelled: 'badge-warning',
    };
    return <span className={`badge ${colors[status]}`}>{status}</span>;
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px' }}>交易记录</h2>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-label">30天交易数</div>
            <div className="stat-value">{stats.totalTrades}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">30天胜率</div>
            <div className="stat-value">{stats.winRate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">30天盈亏</div>
            <div
              className="stat-value"
              style={{ color: stats.netProfit >= 0 ? '#10b981' : '#ef4444' }}
            >
              {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">30天成交量</div>
            <div className="stat-value">{stats.totalVolume.toFixed(0)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })}
          >
            <option value="">所有状态</option>
            <option value="open">进行中</option>
            <option value="won">已盈利</option>
            <option value="lost">已亏损</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : trades.length > 0 ? (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>市场</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>方向</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>金额</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>价格</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>状态</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>盈亏</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    <div>{trade.market.title}</div>
                    {trade.outcomeName && (
                      <div style={{ fontSize: '12px', color: '#666' }}>{trade.outcomeName}</div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span
                      className={`badge ${trade.direction === 'yes' ? 'badge-success' : 'badge-danger'}`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{trade.amount.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{(trade.price * 100).toFixed(1)}%</td>
                  <td style={{ padding: '12px' }}>{getStatusBadge(trade.status)}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>
                    {trade.status === 'won' ? (
                      <span style={{ color: '#10b981' }}>+{trade.profit.toFixed(2)}</span>
                    ) : trade.status === 'lost' ? (
                      <span style={{ color: '#ef4444' }}>-{trade.amount.toFixed(2)}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                    {new Date(trade.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            暂无交易记录
          </p>
        </div>
      )}
    </div>
  );
}

export default TradeHistory;
