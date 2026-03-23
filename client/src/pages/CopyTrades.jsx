import React, { useEffect, useState } from 'react';
import { copyApi, walletsApi } from '../services/api';

function CopyTrades({ user }) {
  const [configs, setConfigs] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState({});

  useEffect(() => {
    loadConfigs();
    loadWallets();
  }, [user]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await copyApi.getUserConfigs(user.id);
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Error loading copy configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWallets = async () => {
    try {
      const data = await walletsApi.getWallets();
      setWallets(data.wallets || []);
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };

  const handleToggleConfig = async (configId) => {
    try {
      const config = configs.find(c => c._id === configId);
      await copyApi.updateConfig(configId, { enabled: !config.enabled });
      await loadConfigs();
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (!window.confirm('确定要删除此跟单配置吗?')) return;
    
    try {
      await copyApi.deleteConfig(configId);
      await loadConfigs();
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  };

  const handleUpdateConfig = async (configId, updates) => {
    try {
      await copyApi.updateConfig(configId, updates);
      await loadConfigs();
      setEditingConfig(null);
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  };

  const toggleAdvanced = (configId) => {
    setShowAdvanced(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }));
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px' }}>我的跟单</h2>

      {configs.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
            暂无跟单配置
            <br />
            <a href="/traders" style={{ color: '#667eea', textDecoration: 'none' }}>
              去发现交易员开始跟单
            </a>
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {configs.map((config) => {
            const isEditing = editingConfig === config._id;
            const showAdv = showAdvanced[config._id];
            
            return (
              <div key={config._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <h3>{config.trader.username}</h3>
                      <span
                        className={`badge ${config.enabled ? 'badge-success' : 'badge-warning'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleConfig(config._id)}
                      >
                        {config.enabled ? '已启用' : '已暂停'}
                      </span>
                      {config.tradingWalletAddress && (
                        <span className="badge badge-info">
                          {config.tradingWalletAddress.substring(0, 6)}...
                        </span>
                      )}
                    </div>

                    {/* Basic Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>跟单比例</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config.copyRatio}x</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>最小交易</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config.minTradeAmount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>最大交易</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config.maxTradeAmount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>已跟单</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config.stats?.totalCopiedTrades || 0}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>总金额</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config.stats?.totalCopiedAmount || 0}</div>
                      </div>
                    </div>

                    {/* Daily Limits */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>今日次数</div>
                        <div style={{ fontSize: '16px' }}>
                          <span style={{ fontWeight: 'bold' }}>{config.stats?.dailyTradeCount || 0}</span>
                          <span style={{ color: '#999' }}> / {config.maxDailyTrades}</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666' }}>今日金额</div>
                        <div style={{ fontSize: '16px' }}>
                          <span style={{ fontWeight: 'bold' }}>{config.stats?.dailyAmount || 0}</span>
                          <span style={{ color: '#999' }}> / {config.maxDailyAmount}</span>
                        </div>
                      </div>
                      {config.stopLossPercentage && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>止损</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>
                            {config.stopLossPercentage}%
                          </div>
                        </div>
                      )}
                      {config.takeProfitPercentage && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#666' }}>止盈</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e' }}>
                            {config.takeProfitPercentage}%
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Advanced Filters Toggle */}
                    <div style={{ marginBottom: '16px' }}>
                      <button
                        onClick={() => toggleAdvanced(config._id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {showAdv ? '▼ 隐藏高级过滤' : '▶ 显示高级过滤'}
                      </button>

                      {showAdv && (
                        <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f0f4ff', borderRadius: '8px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>高级过滤设置</h4>
                          
                          {/* Price Drift Filter */}
                          {config.priceDriftFilter?.enabled && (
                            <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                              <span style={{ color: '#666' }}>价格漂移限制:</span>
                              <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                ≤ {config.priceDriftFilter.maxDriftPercentage}%
                              </span>
                            </div>
                          )}

                          {/* Market Expiry Filter */}
                          {config.marketExpiryFilter?.enabled && (
                            <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                              <span style={{ color: '#666' }}>市场到期时间:</span>
                              <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                {config.marketExpiryFilter.minHoursToExpiry}h - 
                                {config.marketExpiryFilter.maxHoursToExpiry ? `${config.marketExpiryFilter.maxHoursToExpiry}h` : '无限制'}
                              </span>
                            </div>
                          )}

                          {/* Market Price Range Filter */}
                          {config.marketPriceRangeFilter?.enabled && (
                            <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                              <span style={{ color: '#666' }}>市场价格区间:</span>
                              <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                {config.marketPriceRangeFilter.minPrice} - 
                                {config.marketPriceRangeFilter.maxPrice ? `${config.marketPriceRangeFilter.maxPrice}` : '无限制'}
                              </span>
                            </div>
                          )}

                          {/* Wallet Holdings Filter */}
                          {config.walletHoldingsFilter?.enabled && (
                            <div style={{ marginBottom: '8px', fontSize: '13px' }}>
                              <span style={{ color: '#666' }}>最小持仓要求:</span>
                              <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                {config.walletHoldingsFilter.minHoldingsAmount} USDC
                              </span>
                            </div>
                          )}

                          {/* Category Filters */}
                          {(config.excludedCategories?.length > 0 || config.onlyInCategories?.length > 0) && (
                            <div style={{ fontSize: '13px' }}>
                              {config.excludedCategories?.length > 0 && (
                                <div style={{ marginBottom: '4px' }}>
                                  <span style={{ color: '#666' }}>排除分类:</span>
                                  <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                    {config.excludedCategories.join(', ')}
                                  </span>
                                </div>
                              )}
                              {config.onlyInCategories?.length > 0 && (
                                <div>
                                  <span style={{ color: '#666' }}>仅跟单分类:</span>
                                  <span style={{ fontWeight: 'bold', marginLeft: '4px' }}>
                                    {config.onlyInCategories.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Skip Statistics */}
                          {config.stats?.skippedTrades > 0 && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '6px', fontSize: '13px' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                ⚠️ 已跳过 {config.stats.skippedTrades} 笔交易
                              </div>
                              {config.stats.skipReasons?.map((reason, idx) => (
                                <div key={idx} style={{ marginLeft: '8px', color: '#666' }}>
                                  • {reason.reason}: {reason.count} 次
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                    <button
                      onClick={() => setEditingConfig(config._id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config._id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '12px' }}>编辑配置</h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>跟单比例 (0.01-2.0)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="2.0"
                          defaultValue={config.copyRatio}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val >= 0.01 && val <= 2.0) {
                              handleUpdateConfig(config._id, { copyRatio: val });
                            }
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>最小交易金额</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.minTradeAmount}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val >= 1) {
                                handleUpdateConfig(config._id, { minTradeAmount: val });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>最大交易金额</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.maxTradeAmount}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val >= 1) {
                                handleUpdateConfig(config._id, { maxTradeAmount: val });
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Trading Wallet Selection */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>交易钱包</label>
                        <select
                          defaultValue={config.tradingWalletAddress || ''}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                          onChange={(e) => {
                            handleUpdateConfig(config._id, { tradingWalletAddress: e.target.value || null });
                          }}
                        >
                          <option value="">使用默认钱包</option>
                          {wallets.map(wallet => (
                            <option key={wallet.address} value={wallet.address}>
                              {wallet.label} ({wallet.address.substring(0, 6)}...) - {wallet.balance?.toFixed(2)} USDC
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>每日最大交易数</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.maxDailyTrades}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val >= 1) {
                                handleUpdateConfig(config._id, { maxDailyTrades: val });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>每日最大金额</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.maxDailyAmount}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val >= 1) {
                                handleUpdateConfig(config._id, { maxDailyAmount: val });
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>止损百分比 (可选)</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.stopLossPercentage || ''}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateConfig(config._id, { stopLossPercentage: val || null });
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>止盈百分比 (可选)</label>
                          <input
                            type="number"
                            min="1"
                            defaultValue={config.takeProfitPercentage || ''}
                            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleUpdateConfig(config._id, { takeProfitPercentage: val || null });
                            }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setEditingConfig(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#666',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        完成
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CopyTrades;
