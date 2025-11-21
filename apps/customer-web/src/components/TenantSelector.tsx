'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function TenantSelector() {
  const searchParams = useSearchParams();
  const tenantParam = searchParams.get('tenant');

  useEffect(() => {
    // Set tenant in cookie when selected via query param
    if (tenantParam) {
      document.cookie = `selected_tenant=${tenantParam}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    }
  }, [tenantParam]);

  return null; // This component doesn't render anything
}

