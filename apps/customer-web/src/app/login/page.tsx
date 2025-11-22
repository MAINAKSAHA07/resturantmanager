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

    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      '259247630648-ojetlcndqe3o167clb7oshis7946hude.apps.googleusercontent.com';

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
          const buttonWidth = Math.min(window.innerWidth - 64, 320);
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button'),
            {
              theme: 'outline',
              size: 'large',
              width: buttonWidth,
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
    <div className="min-h-screen bg-gradient-to-br from-accent-blue via-accent-purple to-accent-green flex items-center justify-center p-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => {
          if (window.google && !localStorage.getItem('customer_auth_token')) {
            handleGoogleLogin();
          }
        }}
      />
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-accent-blue/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent mb-2">Login</h1>
          <p className="text-gray-600">
            Please login to continue with checkout
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-accent-pink/10 border-l-4 border-accent-pink rounded-lg">
            <p className="font-semibold text-accent-pink">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div id="google-signin-button" className="w-full min-h-[42px] flex items-center justify-center"></div>
          
          {error && (
            <div className="p-4 bg-accent-pink/10 border-l-4 border-accent-pink rounded-lg text-sm">
              <p className="font-semibold text-accent-pink">{error}</p>
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

