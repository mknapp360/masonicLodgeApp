// src/pages/InvitationCode.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithInvitation, signInWithEmailPassword } from '../services/auth';
import { Users, Eye, EyeOff, Mail, } from 'lucide-react';

const Login = () => {
  const [mode, setMode] = useState<'invitation' | 'login'>('invitation');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInvitationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signInWithInvitation(code);
      
      if (result.needsAccountSetup) {
        // First time user - redirect to account setup
        navigate('/account-setup', { 
          state: { member: result.member } 
        });
      } else {
        // Should not happen in new flow, but just in case
        navigate('/events');
      }
    } catch (err: any) {
      if (err.message === 'ACCOUNT_EXISTS') {
        setError('You already have an account. Please sign in with your email and password below.');
        setMode('login');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailPassword(email, password);
      navigate('/events');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-60 h-60 items-center justify-center mb-4">
            <img src="PGL2.png" alt="" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">The Sussex Masonic App</h1>
          <p className="text-gray-600">
            {mode === 'invitation' 
              ? '' 
              : ''
            }
          </p>
        </div>

        {/* Toggle buttons */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          {/*<button
            onClick={() => {
              setMode('invitation');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'invitation'
                ? 'bg-white text-masonic-blue shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            First Time
          </button>*/}
          <button
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white text-masonic-blue shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Returning User
          </button>
        </div>

        {mode === 'invitation' ? (
          <form onSubmit={handleInvitationSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masonic-blue"
                placeholder="Enter your code"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Check your email for the invitation code
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-masonic-blue text-white py-2 px-4 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Validating...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masonic-blue"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-masonic-blue"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-masonic-blue text-white py-2 px-4 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <div className="bg-masonic-blue/10 rounded-lg p-4">
            <Users className="w-6 h-6 text-masonic-blue mx-auto mb-2" />
            <p className="text-sm text-gray-700">
              This app is exclusive to verified Freemasons.
            </p>
            {mode === 'login' && (
              <p className="text-xs text-gray-500 mt-2">
                Don't have an account? You need to speak with your Lodge Secretary.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;