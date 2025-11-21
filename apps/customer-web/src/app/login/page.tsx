'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const redirectTo = searchParams.get('redirect') || '/checkout';

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('customer_auth_token');
    if (token) {
      router.push(redirectTo);
      return;
    }

    // Initialize Google Sign-In when script loads
    if (window.google) {
      handleGoogleLogin();
    }
  }, [router, redirectTo]);

  const handleGoogleLogin = async () => {
    if (!window.google) {
      setError('Google Sign-In is loading. Please wait...');
      return;
    }

    setLoading(true);
    setError('');

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Sign-In is not configured. Please contact support.');
      setLoading(false);
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            // Send the credential to your backend
            const loginResponse = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential: response.credential }),
            });

            const data = await loginResponse.json();

            if (loginResponse.ok && data.token) {
              localStorage.setItem('customer_auth_token', data.token);
              localStorage.setItem('customer_data', JSON.stringify(data.customer));
              
              // Check if profile is complete
              if (!data.profileComplete) {
                // Redirect to profile completion
                router.push(`/profile/complete?redirect=${encodeURIComponent(redirectTo)}`);
              } else {
                router.push(redirectTo);
              }
            } else {
              setError(data.error || 'Login failed');
              setLoading(false);
            }
          } catch (err: any) {
            setError(err.message || 'Login failed');
            setLoading(false);
          }
        },
      });

      // Render the button
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
        }
      );

      // Also try one-tap sign-in
      window.google.accounts.id.prompt();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => {
          if (window.google && !localStorage.getItem('customer_auth_token')) {
            handleGoogleLogin();
          }
        }}
      />
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Login</h1>
        <p className="text-gray-600 text-center mb-6">
          Please login to continue with checkout
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div id="google-signin-button" className="w-full min-h-[42px] flex items-center justify-center"></div>
          
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="text-center text-sm text-gray-600">
            <p>By continuing, you agree to our Terms of Service</p>
          </div>
        </div>
      </div>
    </div>
  );
}

