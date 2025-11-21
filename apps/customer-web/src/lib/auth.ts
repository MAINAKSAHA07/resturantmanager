/**
 * Client-side authentication utilities
 */

export interface CustomerSession {
  customerId: string;
  email: string;
  name: string;
  phone?: string;
  exp: number;
}

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('customer_auth_token');
}

export function getCustomerSession(): CustomerSession | null {
  const token = getCustomerToken();
  if (!token) return null;

  try {
    // Decode base64 in browser-compatible way
    const decoded = JSON.parse(atob(token));
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now()) {
      localStorage.removeItem('customer_auth_token');
      localStorage.removeItem('customer_data');
      return null;
    }

    return decoded as CustomerSession;
  } catch (error) {
    return null;
  }
}

export function isCustomerAuthenticated(): boolean {
  return getCustomerSession() !== null;
}

export function clearCustomerAuth(): void {
  localStorage.removeItem('customer_auth_token');
  localStorage.removeItem('customer_data');
}

