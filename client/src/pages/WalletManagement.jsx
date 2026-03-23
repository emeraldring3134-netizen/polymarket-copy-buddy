import { useState, useEffect } from 'react';
import { walletsApi } from '../services/api';

export default function WalletManagement() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWallet, setEditingWallet] = useState(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    address: '',
    label: '',
    minHoldings: 0
  });

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const response = await walletsApi.getWallets();
      setWallets(response.wallets || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.address) {
      setError('Wallet address is required');
      return;
    }

    setLoading(true);
    try {
      await walletsApi.addWallet(formData.address, formData.label, formData.minHoldings);
      setShowAddForm(false);
      setFormData({ address: '', label: '', minHoldings: 0 });
      await loadWallets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWallet = async (address) => {
    if (!window.confirm('Are you sure you want to remove this wallet?')) {
      return;
    }

    setLoading(true);
    try {
      await walletsApi.removeWallet(address);
      await loadWallets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (address) => {
    setLoading(true);
    try {
      await walletsApi.setDefaultWallet(address);
      await loadWallets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set default wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWallet = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    try {
      await walletsApi.updateWallet(
        editingWallet.address,
        formData.label,
        formData.minHoldings
      );
      setEditingWallet(null);
      setFormData({ address: '', label: '', minHoldings: 0 });
      await loadWallets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBalance = async (address) => {
    try {
      await walletsApi.getWalletBalance(address);
      await loadWallets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh balance');
    }
  };

  const startEdit = (wallet) => {
    setEditingWallet(wallet);
    setFormData({
      address: wallet.address,
      label: wallet.label,
      minHoldings: wallet.minHoldings || 0
    });
  };

  const cancelEdit = () => {
    setEditingWallet(null);
    setFormData({ address: '', label: '', minHoldings: 0 });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Wallet Management</h1>
        {!showAddForm && !editingWallet && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Wallet
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add Wallet Form */}
      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New Wallet</h2>
          <form onSubmit={handleAddWallet} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="0x..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Label (Optional)</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="e.g., Main Trading Wallet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Holdings (USDC)</label>
              <input
                type="number"
                value={formData.minHoldings}
                onChange={(e) => setFormData({ ...formData, minHoldings: parseFloat(e.target.value) || 0 })}
                className="w-full p-3 border rounded-lg"
                placeholder="0"
                min="0"
                step="0.01"
              />
              <p className="text-sm text-gray-600 mt-1">
                Minimum balance required in wallet for copy trading
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Adding...' : 'Add Wallet'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ address: '', label: '', minHoldings: 0 });
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Wallet Form */}
      {editingWallet && (
        <div className="bg-yellow-50 p-6 rounded-lg mb-6 border border-yellow-200">
          <h2 className="text-xl font-semibold mb-4">Edit Wallet</h2>
          <form onSubmit={handleUpdateWallet} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Address</label>
              <input
                type="text"
                value={formData.address}
                disabled
                className="w-full p-3 border rounded-lg bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Label</label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Minimum Holdings (USDC)</label>
              <input
                type="number"
                value={formData.minHoldings}
                onChange={(e) => setFormData({ ...formData, minHoldings: parseFloat(e.target.value) || 0 })}
                className="w-full p-3 border rounded-lg"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Updating...' : 'Update Wallet'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Wallet List */}
      {loading && !showAddForm && !editingWallet && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && wallets.length === 0 && !showAddForm && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No wallets added yet. Click "Add Wallet" to get started.</p>
        </div>
      )}

      <div className="grid gap-4">
        {wallets.map((wallet) => (
          <div key={wallet.address} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {wallet.isDefault && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Default
                    </span>
                  )}
                  <h3 className="font-semibold text-lg">{wallet.label}</h3>
                </div>
                
                <p className="text-gray-600 text-sm mb-2 font-mono">
                  {wallet.address}
                </p>

                <div className="flex items-center space-x-4 text-sm">
                  <div>
                    <span className="text-gray-500">Balance:</span>
                    <span className="font-semibold ml-1">
                      {wallet.balance !== undefined ? `${wallet.balance.toFixed(2)} USDC` : 'Loading...'}
                    </span>
                  </div>
                  {wallet.minHoldings > 0 && (
                    <div>
                      <span className="text-gray-500">Min Holdings:</span>
                      <span className="font-semibold ml-1">{wallet.minHoldings} USDC</span>
                    </div>
                  )}
                  {wallet.lastUsed && (
                    <div>
                      <span className="text-gray-500">Last Used:</span>
                      <span className="ml-1">
                        {new Date(wallet.lastUsed).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-2 ml-4">
                <button
                  onClick={() => handleRefreshBalance(wallet.address)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  disabled={loading}
                >
                  Refresh
                </button>
                
                {!wallet.isDefault && (
                  <button
                    onClick={() => handleSetDefault(wallet.address)}
                    className="text-green-600 hover:text-green-800 text-sm"
                    disabled={loading}
                  >
                    Set Default
                  </button>
                )}

                <button
                  onClick={() => startEdit(wallet)}
                  className="text-gray-600 hover:text-gray-800 text-sm"
                  disabled={loading}
                >
                  Edit
                </button>

                <button
                  onClick={() => handleRemoveWallet(wallet.address)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Tips:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Set a default wallet for automatic copy trading</li>
              <li>• Use minimum holdings to ensure sufficient balance for trades</li>
              <li>• Refresh balances to see the latest USDC amounts</li>
              <li>• Each wallet can be used for specific copy trading configurations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
