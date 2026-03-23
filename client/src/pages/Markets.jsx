import React, { useEffect, useState } from 'react';
import { marketsApi } from '../services/api';

function Markets() {
  const [markets, setMarkets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ category: '', status: 'open', search: '' });

  useEffect(() => {
    loadMarkets();
    loadCategories();
  }, [filter]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const data = await marketsApi.getMarkets(filter);
      setMarkets(data.markets);
    } catch (error) {
      console.error('Error loading markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await marketsApi.getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSync = async () => {
    try {
      await marketsApi.syncMarkets(100);
      await loadMarkets();
      alert('市场同步成功!');
    } catch (error) {
      alert('同步失败: ' + error.message);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>市场</h2>
        <button className="btn btn-primary" onClick={handleSync}>
          同步市场
        </button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <input
            placeholder="搜索市场..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          />
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
          >
            <option value="">所有分类</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat._id} ({cat.count})
              </option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="open">进行中</option>
            <option value="closed">已关闭</option>
            <option value="">所有状态</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : markets.length > 0 ? (
        <div style={{ display: 'grid', gap: '16px' }}>
          {markets.map((market) => (
            <div key={market._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: '12px' }}>{market.title}</h3>
                  {market.question && (
                    <p style={{ color: '#666', marginBottom: '12px' }}>{market.question}</p>
                  )}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span className="badge badge-success">{market.category}</span>
                    <span className="badge badge-warning">{market.status}</span>
                    <span style={{ fontSize: '14px', color: '#666' }}>
                      成交量: {market.totalVolume.toFixed(2)}
                    </span>
                    {market.endDate && (
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        截止: {new Date(market.endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {market.outcomes && market.outcomes.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <strong>选项:</strong>
                      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {market.outcomes.map((outcome) => (
                          <span
                            key={outcome.id}
                            style={{
                              padding: '6px 12px',
                              background: '#f0f0f0',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            {outcome.name}: {(outcome.price * 100).toFixed(1)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            暂无市场数据,点击"同步市场"获取最新数据
          </p>
        </div>
      )}
    </div>
  );
}

export default Markets;
