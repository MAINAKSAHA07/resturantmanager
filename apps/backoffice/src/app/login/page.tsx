'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth token
        if (data.token) {
          localStorage.setItem('pb_auth_token', data.token);
          // Cookie is already set by the server response
        }
        // Redirect master users directly to dashboard (they'll select tenant from navbar)
        // Non-master users go to tenant selection
        if (data.isMaster || data.type === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/select-tenant');
        }
      } else {
        // Show more specific error message
        const errorMessage = data.error || data.message || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        console.error('Login failed:', { status: response.status, data });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to connect to server. Please check if PocketBase is running.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent-blue via-accent-purple to-accent-green flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-accent-blue/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent mb-2">Back Office Login</h1>
          <p className="text-gray-600">Welcome back! Please sign in to continue.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-accent-pink/10 border-l-4 border-accent-pink rounded-lg">
            <p className="font-semibold text-accent-pink">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-2 text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all duration-200 outline-none"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block font-medium mb-2 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all duration-200 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

