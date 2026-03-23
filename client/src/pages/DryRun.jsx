import { useState, useEffect } from 'react';
import { dryRunApi, copyApi } from '../services/api';

export default function DryRun({ user }) {
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, [user]);

  const loadConfigs = async () => {
    try {
      const data = await copyApi.getUserConfigs(user.id);
      setConfigs(data.configs || []);
    } catch (err) {
      setError('Failed to load configs');
    }
  };

  const handleStartDryRun = async (configId) => {
    setSelectedConfigId(configId);
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await dryRunApi.startDryRun(configId);
      setResults(response.results);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start dry run');
    } finally {
      setLoading(false);
    }
  };

  const handleResetStats = async (configId) => {
    if (!window.confirm('Are you sure you want to reset dry run statistics?')) {
      return;
    }

    setLoading(true);
    try {
      await dryRunApi.resetStats(configId);
      await loadConfigs();
      if (selectedConfigId === configId) {
        setResults(null);
      }
    } catch (err) {
      setError('Failed to reset statistics');
    } finally {
      setLoading(false);
    }
  };

  const toggleDryRun = async (configId, enabled) => {
    setLoading(true);
    try {
      await copyApi.updateConfig(configId, {
        dryRun: { enabled }
      });
      await loadConfigs();
    } catch (err) {
      setError('Failed to update config');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return 'N/A';
    return `${amount.toFixed(2)} USDC`;
  };

  const getROIColor = (roi) => {
    if (roi > 0) return 'green';
    if (roi < 0) return 'red';
    return 'gray';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Dry Run Simulation</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Config List */}
      <div className="grid gap-4 mb-8">
        {configs.map((config) => (
          <div key={config._id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-semibold">{config.trader.username}</h3>
                  <span className={`badge ${config.dryRun?.enabled ? 'badge-success' : 'badge-secondary'}`}>
                    {config.dryRun?.enabled ? 'Dry Run Enabled' : 'Dry Run Disabled'}
                  </span>
                  <span className={`badge ${config.enabled ? 'badge-success' : 'badge-warning'}`}>
                    {config.enabled ? 'Active' : 'Paused'}
                  </span>
                  <span className="badge badge-info">
                    {config.monitoringMode === 'websocket' ? 'WebSocket' : 'Polling'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <div className="text-gray-500">Copy Ratio</div>
                    <div className="font-semibold">{config.copyRatio}x</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Min Trade</div>
                    <div className="font-semibold">{config.minTradeAmount} USDC</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Max Trade</div>
                    <div className="font-semibold">{config.maxTradeAmount} USDC</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Period</div>
                    <div className="font-semibold">{config.dryRun?.period || 7} days</div>
                  </div>
                </div>

                {config.dryRun?.enabled && config.stats.dryRunStats && (
                  <div className="bg-blue-50 p-3 rounded mb-3">
                    <h4 className="font-semibold mb-2">Last Simulation Results</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-500">Simulated Trades</div>
                        <div className="font-semibold">{config.stats.dryRunStats.simulatedTrades}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Win Rate</div>
                        <div className="font-semibold">{config.stats.dryRunStats.simulatedWinRate?.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Final Balance</div>
                        <div className="font-semibold">{formatCurrency(config.stats.dryRunStats.simulatedBalance)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">ROI</div>
                        <div className={`font-semibold text-${getROIColor(config.stats.dryRunStats.roi)}-600`}>
                          {config.stats.dryRunStats.roi?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <button
                  onClick={() => toggleDryRun(config._id, !config.dryRun?.enabled)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-white ${
                    config.dryRun?.enabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'
                  } disabled:bg-gray-400`}
                >
                  {config.dryRun?.enabled ? 'Disable Dry Run' : 'Enable Dry Run'}
                </button>
                
                {config.dryRun?.enabled && (
                  <>
                    <button
                      onClick={() => handleStartDryRun(config._id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {loading && selectedConfigId === config._id ? 'Running...' : 'Run Simulation'}
                    </button>
                    
                    {config.stats.dryRunStats && (
                      <button
                        onClick={() => handleResetStats(config._id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
                      >
                        Reset Stats
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results Display */}
      {results && (
        <div className="bg-white border rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Simulation Results</h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Simulated Trades</div>
              <div className="text-2xl font-bold">{results.simulatedTrades}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Total Amount</div>
              <div className="text-2xl font-bold">{formatCurrency(results.simulatedAmount)}</div>
            </div>
            <div className={`bg-${getROIColor(results.roi)}-50 p-4 rounded-lg`}>
              <div className="text-gray-500 text-sm mb-1">Final Balance</div>
              <div className={`text-2xl font-bold text-${getROIColor(results.roi)}-600`}>
                {formatCurrency(results.finalBalance)}
              </div>
            </div>
            <div className={`bg-${getROIColor(results.roi)}-50 p-4 rounded-lg`}>
              <div className="text-gray-500 text-sm mb-1">ROI</div>
              <div className={`text-2xl font-bold text-${getROIColor(results.roi)}-600`}>
                {results.roi.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Initial Balance</div>
              <div className="text-xl font-semibold">{formatCurrency(results.initialBalance)}</div>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Total Profit</div>
              <div className="text-xl font-semibold text-green-600">
                {formatCurrency(results.simulatedProfit)}
              </div>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Total Loss</div>
              <div className="text-xl font-semibold text-red-600">
                {formatCurrency(results.simulatedLoss)}
              </div>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Win Rate</div>
              <div className="text-xl font-semibold">{results.winRate.toFixed(2)}%</div>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Avg Trade Size</div>
              <div className="text-xl font-semibold">{formatCurrency(results.avgTradeSize)}</div>
            </div>
            <div className="border p-4 rounded-lg">
              <div className="text-gray-500 text-sm mb-1">Profit Factor</div>
              <div className={`text-xl font-semibold ${results.profitFactor > 1 ? 'text-green-600' : 'text-red-600'}`}>
                {results.profitFactor.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Trade Details */}
          {showDetails && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Trade Details</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.tradeDetails?.map((trade, idx) => (
                      <tr key={idx} className={trade.skipped ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 text-sm">{formatDate(trade.timestamp)}</td>
                        <td className="px-4 py-3 text-sm">{trade.marketTitle || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{trade.outcomeName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{trade.skipped ? '-' : formatCurrency(trade.amount)}</td>
                        <td className="px-4 py-3 text-sm">{trade.skipped ? '-' : trade.price?.toFixed(4)}</td>
                        <td className="px-4 py-3 text-sm">
                          {trade.skipped ? (
                            <span className="text-yellow-600">{trade.reason}</span>
                          ) : (
                            <span className={trade.outcome === 'won' ? 'text-green-600' : 'text-red-600'}>
                              {trade.outcome?.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {trade.skipped ? '-' : (
                            <span className={trade.profit > 0 ? 'text-green-600' : trade.profit < 0 ? 'text-red-600' : 'text-gray-600'}>
                              {trade.profit !== null ? formatCurrency(trade.profit) : 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {trade.skipped ? '-' : formatCurrency(trade.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>About Dry Run Mode:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Simulates trades without executing them on the blockchain</li>
              <li>• Uses historical data to predict performance</li>
              <li>• Helps you test strategies before real trading</li>
              <li>• Can run in real-time or historical simulation mode</li>
              <li>• Shows detailed statistics and ROI analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
