'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function QRTablePage() {
  const router = useRouter();
  const params = useParams();
  const qrToken = params?.qrToken as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrToken) {
      setError('Invalid QR code');
      setLoading(false);
      return;
    }

    const resolveTable = async () => {
      try {
        const response = await fetch('/api/table-from-qr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ qrToken }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to resolve table');
        }

        const data = await response.json();

        // Store table context in cookie
        const tableContext = {
          tenantKey: data.tenantKey,
          tenantId: data.tenantId,
          locationId: data.locationId,
          locationName: data.locationName,
          tableId: data.tableId,
          tableName: data.tableName,
        };

        // Set cookie with table context (expires in 24 hours)
        const expires = new Date();
        expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000);
        // Use SameSite=Lax to ensure cookie is sent with requests
        const cookieString = `tableContext=${encodeURIComponent(JSON.stringify(tableContext))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
        document.cookie = cookieString;
        console.log('[QR Table] Set table context cookie:', tableContext);

        // Also set tenant cookie for consistency
        document.cookie = `selected_tenant=${data.tenantKey}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;

        // Dispatch event to update navbar
        window.dispatchEvent(new Event('tableContextUpdated'));

        // Redirect to tenant-specific URL or menu with tenant in URL
        // Try to use tenant-specific route first, fallback to query param
        window.location.href = `/?tenant=${data.tenantKey}`;
      } catch (err: any) {
        console.error('Error resolving table:', err);
        setError(err.message || 'Failed to load table information');
        setLoading(false);
      }
    };

    resolveTable();
  }, [qrToken, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-brand-600 font-medium">Loading table information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-status-danger-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-brand-900 mb-2">Invalid QR Code</h1>
          <p className="text-brand-600 mb-4">{error}</p>
          <p className="text-sm text-brand-500">
            This QR code is invalid or the table is no longer available. Please contact staff for assistance.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

