import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Markets from './pages/Markets.jsx';
import Traders from './pages/Traders.jsx';
import CopyTrades from './pages/CopyTrades.jsx';
import TradeHistory from './pages/TradeHistory.jsx';
import Login from './pages/Login.jsx';
import EncryptionSetup from './pages/EncryptionSetup.jsx';
import WalletManagement from './pages/WalletManagement.jsx';
import DryRun from './pages/DryRun.jsx';
import { authApi } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await authApi.verify();
          setUser(data.user);
        } catch (error) {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="app">
      {user && (
        <nav style={{ 
          background: 'white', 
          padding: '16px 24px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <h1 style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                fontSize: '24px'
              }}>
                Polymarket 跟单
              </h1>
              <div style={{ display: 'flex', gap: '16px' }}>
                <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>
                  首页
                </Link>
                <Link to="/markets" style={{ textDecoration: 'none', color: '#333' }}>
                  市场
                </Link>
                <Link to="/traders" style={{ textDecoration: 'none', color: '#333' }}>
                  交易员
                </Link>
                <Link to="/copy" style={{ textDecoration: 'none', color: '#333' }}>
                  我的跟单
                </Link>
                <Link to="/history" style={{ textDecoration: 'none', color: '#333' }}>
                  交易记录
                </Link>
                <Link to="/wallets" style={{ textDecoration: 'none', color: '#333' }}>
                  钱包管理
                </Link>
                <Link to="/dryrun" style={{ textDecoration: 'none', color: '#333' }}>
                  模拟运行
                </Link>
                <Link to="/encryption" style={{ textDecoration: 'none', color: '#333' }}>
                  加密设置
                </Link>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>
                {user.username}
              </span>
              <button 
                onClick={handleLogout}
                style={{ 
                  padding: '8px 16px', 
                  background: '#f0f0f0', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                退出
              </button>
            </div>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Dashboard />} />
        <Route path="/" element={user ? <Dashboard user={user} /> : <Login onLogin={setUser} />} />
        <Route path="/markets" element={user ? <Markets /> : <Login onLogin={setUser} />} />
        <Route path="/traders" element={user ? <Traders /> : <Login onLogin={setUser} />} />
        <Route path="/copy" element={user ? <CopyTrades user={user} /> : <Login onLogin={setUser} />} />
        <Route path="/history" element={user ? <TradeHistory user={user} /> : <Login onLogin={setUser} />} />
        <Route path="/wallets" element={user ? <WalletManagement /> : <Login onLogin={setUser} />} />
        <Route path="/dryrun" element={user ? <DryRun user={user} /> : <Login onLogin={setUser} />} />
        <Route path="/encryption" element={user ? <EncryptionSetup /> : <Login onLogin={setUser} />} />
      </Routes>
    </div>
  );
}

export default App;
