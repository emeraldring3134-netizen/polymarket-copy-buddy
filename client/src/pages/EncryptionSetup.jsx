import { useState, useEffect } from 'react';
import { encryptionApi } from '../services/api';

export default function EncryptionSetup() {
  const [step, setStep] = useState('setup'); // setup, decrypt, locked
  const [privateKey, setPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await encryptionApi.getStatus();
      setStatus(response);
      
      if (response.isSetup) {
        if (response.isDecrypted) {
          setStep('unlocked');
        } else {
          setStep('decrypt');
        }
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  };

  const testPasswordStrength = async (pwd) => {
    if (!pwd) {
      setPasswordStrength(null);
      return;
    }
    try {
      const response = await encryptionApi.testPassword(pwd);
      setPasswordStrength(response.strength);
    } catch (err) {
      console.error('Error testing password:', err);
    }
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    testPasswordStrength(pwd);
  };

  const handleNewPasswordChange = (e) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    testPasswordStrength(pwd);
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!privateKey || !password) {
      setError('Private key and password are required');
      return;
    }

    if (passwordStrength && passwordStrength.score < 50) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      await encryptionApi.setup(privateKey, password);
      await checkStatus();
      setPrivateKey('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to setup encryption');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    try {
      await encryptionApi.decrypt(password);
      await checkStatus();
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decrypt. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword || !confirmPassword) {
      setError('New password and confirmation are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength && passwordStrength.score < 50) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      await encryptionApi.changePassword(password, newPassword);
      await checkStatus();
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setLoading(true);
    try {
      await encryptionApi.lock();
      await checkStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to lock encryption');
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 50) return 'orange';
    return 'red';
  };

  const getStrengthLabel = (score) => {
    if (score >= 80) return 'Strong';
    if (score >= 50) return 'Medium';
    return 'Weak';
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Encryption Setup</h1>

      {status && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-2">Encryption Status</h3>
          <div className="space-y-1 text-sm">
            <p>Setup: {status.isSetup ? '✓' : '✗'}</p>
            <p>Decrypted: {status.isDecrypted ? '✓' : '✗'}</p>
            <p>Algorithm: {status.algorithm}</p>
            <p>Key Length: {status.keyLength} bits</p>
            {status.lastEncryptedAt && (
              <p>Last Encrypted: {new Date(status.lastEncryptedAt).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {step === 'setup' && (
        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Private Key</label>
            <input
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Enter your private key"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              className="w-full p-3 border rounded-lg"
              placeholder="Create a strong password"
              required
            />
            
            {passwordStrength && (
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Password Strength: {getStrengthLabel(passwordStrength.score)}</span>
                  <span className={`text-${getStrengthColor(passwordStrength.score)}-600 font-semibold`}>
                    {passwordStrength.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`bg-${getStrengthColor(passwordStrength.score)}-500 h-2 rounded-full transition-all`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                {passwordStrength.warnings.length > 0 && (
                  <ul className="text-xs text-gray-600 mt-2">
                    {passwordStrength.warnings.map((warning, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">⚠️</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (passwordStrength && passwordStrength.score < 50)}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Setup Encryption'}
          </button>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Important:</strong> Your private key will be encrypted and stored securely.
                  You'll need your password to decrypt it each time you start the application.
                  Make sure to remember your password - it cannot be recovered!
                </p>
              </div>
            </div>
          </div>
        </form>
      )}

      {step === 'decrypt' && (
        <form onSubmit={handleDecrypt} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border rounded-lg"
              placeholder="Enter your password to decrypt"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Decrypting...' : 'Decrypt'}
          </button>
        </form>
      )}

      {step === 'unlocked' && (
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            ✓ Encryption is active and your private key is decrypted in memory
          </div>

          <button
            onClick={handleLock}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {loading ? 'Locking...' : 'Lock Encryption'}
          </button>

          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Current Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Enter current password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Enter new password"
                  required
                />
                
                {passwordStrength && newPassword && (
                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Password Strength: {getStrengthLabel(passwordStrength.score)}</span>
                      <span className={`text-${getStrengthColor(passwordStrength.score)}-600 font-semibold`}>
                        {passwordStrength.score}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-${getStrengthColor(passwordStrength.score)}-500 h-2 rounded-full transition-all`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || (passwordStrength && passwordStrength.score < 50)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
